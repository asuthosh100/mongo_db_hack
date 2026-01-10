import { HTTPFacilitatorClient } from "@x402/core/http";
import { withBazaar } from "@x402/extensions/bazaar";
import { x402Client, wrapFetchWithPayment, x402HTTPClient } from "@x402/fetch";
import { registerExactEvmScheme } from "@x402/evm/exact/client";
import { CdpClient } from "@coinbase/cdp-sdk";
import { toAccount } from "viem/accounts";

import { AgentMemoryService } from "../db/services/agent-memory.service";
import { ToolRegistryService } from "../db/services/tool-registry.service";
import { PaymentService } from "../db/services/payment.service";
import { BudgetService } from "../db/services/budget.service";
import { WorkflowService } from "../db/services/workflow.service";
import { Tool, PaymentRecord, BudgetState } from "../db/types";

export interface AgentConfig {
  agentId: string;
  walletName?: string;
  budgetLimits?: BudgetState["limits"];
  facilitatorUrl?: string;
  knownEndpoints?: DiscoveredService[];
}

export interface DiscoveredService {
  url: string;
  name?: string;
  description?: string;
  pricing?: {
    amount: string;
    currency: string;
    network: string;
    payTo: string;
  };
  metadata?: Record<string, unknown>;
}

export interface CallResult {
  success: boolean;
  status: number;
  data: unknown;
  paymentId?: string;
  txHash?: string;
  error?: string;
}

export class DemandAgent {
  private agentId: string;
  private sessionId: string | null = null;
  private cdp: CdpClient | null = null;
  private cdpAccount: Awaited<ReturnType<CdpClient["evm"]["getOrCreateAccount"]>> | null = null;
  private x402Client: x402Client | null = null;
  private fetchWithPayment: typeof fetch | null = null;
  private config: AgentConfig;
  private initialized = false;

  constructor(config: AgentConfig) {
    this.agentId = config.agentId;
    this.config = {
      walletName: "x402-demand-agent",
      facilitatorUrl: "https://x402.org/facilitator",
      budgetLimits: {
        maxPerTransaction: "100000",    // $0.10 max per call
        maxPerSession: "1000000",       // $1.00 max per session
        maxDaily: "10000000",           // $10 max per day
        maxTotal: "100000000",          // $100 lifetime max
      },
      knownEndpoints: [],
      ...config,
    };
  }

  /**
   * Initialize the agent - sets up wallet, budget, and starts a session
   */
  async initialize(intent: string): Promise<void> {
    console.log(`\n[Agent] Initializing agent: ${this.agentId}`);

    // 1. Initialize CDP wallet
    console.log("[Agent] Setting up CDP wallet...");
    this.cdp = new CdpClient();
    this.cdpAccount = await this.cdp.evm.getOrCreateAccount({
      name: this.config.walletName!,
    });
    console.log(`[Agent] Wallet address: ${this.cdpAccount.address}`);

    // 2. Setup x402 client
    const signer = toAccount(this.cdpAccount);
    this.x402Client = new x402Client();
    registerExactEvmScheme(this.x402Client, { signer });
    this.fetchWithPayment = wrapFetchWithPayment(fetch, this.x402Client);

    // 3. Initialize budget in MongoDB
    console.log("[Agent] Initializing budget...");
    await BudgetService.initializeBudget(
      this.agentId,
      this.cdpAccount.address,
      this.config.budgetLimits!
    );

    // Set a high available balance (x402 handles actual wallet payment)
    // This is for limit tracking, not actual balance
    await BudgetService.updateBalance(this.agentId, "1000000000"); // $1000 tracking limit

    // 4. Create agent session
    console.log("[Agent] Creating session...");
    const session = await AgentMemoryService.createSession(this.agentId, intent);
    this.sessionId = session.sessionId;
    console.log(`[Agent] Session ID: ${this.sessionId}`);

    // 5. Log initialization
    await this.logReasoning("Agent initialized", "setup_complete", {
      wallet: this.cdpAccount.address,
      intent,
    });

    this.initialized = true;
    console.log("[Agent] Initialization complete\n");
  }

  /**
   * Discover available x402 services
   */
  async discoverServices(): Promise<DiscoveredService[]> {
    this.ensureInitialized();
    await this.updateState("planning");
    await this.logReasoning("Starting service discovery", "discover_services");

    const services: DiscoveredService[] = [];

    // Try Bazaar discovery
    try {
      const facilitatorClient = withBazaar(
        new HTTPFacilitatorClient({ url: this.config.facilitatorUrl! })
      );

      const discovery = await facilitatorClient.extensions.discovery.listResources({
        type: "http",
        limit: 20,
        offset: 0,
      });

      if (discovery.resources.length > 0) {
        console.log(`[Agent] Bazaar: Found ${discovery.resources.length} services`);
        for (const resource of discovery.resources) {
          services.push({
            url: resource.url,
            metadata: resource.metadata,
          });
        }
      }
    } catch {
      console.log("[Agent] Bazaar not available, using known endpoints");
    }

    // Add known endpoints
    if (this.config.knownEndpoints) {
      services.push(...this.config.knownEndpoints);
    }

    // Register discovered tools in MongoDB
    for (const service of services) {
      await this.registerTool(service);
    }

    await this.logReasoning(
      `Discovered ${services.length} services`,
      "discovery_complete",
      { count: services.length }
    );

    await this.addMemory("tool_result", `Discovered ${services.length} x402 services`);

    return services;
  }

  /**
   * Call an x402 endpoint with automatic payment handling
   */
  async callEndpoint(
    url: string,
    options: RequestInit = { method: "GET" }
  ): Promise<CallResult> {
    this.ensureInitialized();
    await this.updateState("executing");

    const tool = await ToolRegistryService.getToolByEndpoint(url);
    const toolId = tool?.toolId || url;

    console.log(`[Agent] Calling: ${url}`);
    await this.logReasoning(`Calling endpoint: ${url}`, "call_endpoint", { url });

    // Check budget before calling
    const estimatedCost = tool?.pricing?.amount || "10000"; // Default $0.01
    const budgetCheck = await BudgetService.canSpend(this.agentId, estimatedCost);

    if (!budgetCheck.allowed) {
      console.log(`[Agent] Budget exceeded: ${budgetCheck.reason}`);
      await this.addMemory("error", `Budget check failed: ${budgetCheck.reason}`);
      return {
        success: false,
        status: 0,
        data: null,
        error: `Budget exceeded: ${budgetCheck.reason}`,
      };
    }

    // Reserve funds
    await BudgetService.reserveFunds(this.agentId, estimatedCost);
    await this.updateState("waiting_payment");

    // Create payment record (pending)
    const paymentRecord = await PaymentService.createPayment({
      agentId: this.agentId,
      sessionId: this.sessionId!,
      toolId,
      toolEndpoint: url,
      amount: estimatedCost,
      currency: "USDC",
      network: "base-sepolia",
      fromAddress: this.cdpAccount!.address,
      toAddress: tool?.pricing?.payTo || "unknown",
    });

    const startTime = Date.now();

    try {
      // Make the x402 call
      const response = await this.fetchWithPayment!(url, options);
      const latencyMs = Date.now() - startTime;

      const text = await response.text();
      let data: unknown;
      try {
        data = JSON.parse(text);
      } catch {
        data = text;
      }

      console.log(`[Agent] Response: ${response.status}`);

      if (response.ok) {
        // Extract payment receipt
        const httpClient = new x402HTTPClient(this.x402Client!);
        const receipt = httpClient.getPaymentSettleResponse((name: string) =>
          response.headers.get(name)
        );

        const txHash = receipt?.transaction;

        // Complete payment record
        await PaymentService.completePayment(
          paymentRecord.paymentId,
          {
            paymentPayload: "",
            paymentSignature: "",
          },
          txHash
        );

        // Record spend in budget
        await BudgetService.recordSpend(this.agentId, estimatedCost);

        // Update tool stats
        await ToolRegistryService.updateToolStats(
          toolId,
          true,
          latencyMs,
          estimatedCost
        );

        await this.addMemory("payment", `Paid ${estimatedCost} for ${url}`, {
          txHash,
          amount: estimatedCost,
        });

        await this.addMemory("tool_result", `Response from ${url}`, {
          status: response.status,
          data,
        });

        await this.updateState("executing");

        return {
          success: true,
          status: response.status,
          data,
          paymentId: paymentRecord.paymentId,
          txHash,
        };
      } else {
        // Request failed
        await PaymentService.updatePaymentStatus(
          paymentRecord.paymentId,
          "failed",
          undefined,
          `HTTP ${response.status}`
        );

        // Release reserved funds
        await BudgetService.releaseFunds(this.agentId, estimatedCost);

        await ToolRegistryService.updateToolStats(
          toolId,
          false,
          latencyMs,
          "0"
        );

        await this.addMemory("error", `Call failed: ${response.status}`, { data });

        return {
          success: false,
          status: response.status,
          data,
          paymentId: paymentRecord.paymentId,
          error: `HTTP ${response.status}`,
        };
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);

      await PaymentService.updatePaymentStatus(
        paymentRecord.paymentId,
        "failed",
        undefined,
        errorMsg
      );

      await BudgetService.releaseFunds(this.agentId, estimatedCost);

      await this.addMemory("error", `Call error: ${errorMsg}`);

      return {
        success: false,
        status: 0,
        data: null,
        paymentId: paymentRecord.paymentId,
        error: errorMsg,
      };
    }
  }

  /**
   * Execute a simple workflow: discover -> select -> call
   */
  async executeSimpleWorkflow(): Promise<CallResult> {
    this.ensureInitialized();

    // 1. Discover services
    const services = await this.discoverServices();

    if (services.length === 0) {
      return {
        success: false,
        status: 0,
        data: null,
        error: "No services discovered",
      };
    }

    // 2. Select best service (for now, just first one)
    const selected = services[0];
    console.log(`[Agent] Selected: ${selected.name || selected.url}`);
    await this.logReasoning(
      `Selected service: ${selected.name || selected.url}`,
      "select_service",
      { url: selected.url }
    );

    // 3. Call the service
    const result = await this.callEndpoint(selected.url);

    // 4. Complete session if successful
    if (result.success) {
      await this.complete(result.data);
    }

    return result;
  }

  /**
   * Complete the agent session
   */
  async complete(result?: unknown): Promise<void> {
    this.ensureInitialized();

    await this.logReasoning("Workflow completed", "complete", { result });
    await AgentMemoryService.completeSession(this.sessionId!);
    await this.updateState("completed");

    // Get summary stats
    const budget = await BudgetService.getBudget(this.agentId);
    const payments = await PaymentService.getSessionPayments(
      this.agentId,
      this.sessionId!
    );

    console.log("\n[Agent] Session Summary:");
    console.log(`  - Payments made: ${payments.length}`);
    console.log(`  - Session spend: ${budget?.spent.currentSession || 0}`);
    console.log(`  - Total spend: ${budget?.spent.total || 0}`);
  }

  /**
   * Get session history
   */
  async getHistory(): Promise<{
    reasoning: Awaited<ReturnType<typeof AgentMemoryService.getReasoningHistory>>;
    payments: PaymentRecord[];
    budget: BudgetState | null;
  }> {
    this.ensureInitialized();

    return {
      reasoning: await AgentMemoryService.getReasoningHistory(this.sessionId!),
      payments: await PaymentService.getSessionPayments(
        this.agentId,
        this.sessionId!
      ),
      budget: await BudgetService.getBudget(this.agentId),
    };
  }

  // === Private helpers ===

  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error("Agent not initialized. Call initialize() first.");
    }
  }

  private async registerTool(service: DiscoveredService): Promise<Tool> {
    return ToolRegistryService.registerTool({
      toolId: service.url,
      name: service.name || new URL(service.url).pathname,
      description: service.description || "",
      endpoint: service.url,
      pricing: service.pricing || {
        amount: "10000",
        currency: "USDC",
        network: "base-sepolia",
        payTo: "unknown",
      },
      bazaarListing: {
        discoveredAt: new Date(),
        category: "api",
        tags: [],
      },
      isActive: true,
    });
  }

  private async updateState(
    state: "idle" | "planning" | "executing" | "waiting_payment" | "completed" | "failed"
  ): Promise<void> {
    await AgentMemoryService.updateState(this.sessionId!, state);
  }

  private async logReasoning(
    thought: string,
    action?: string,
    observation?: Record<string, unknown>
  ): Promise<void> {
    await AgentMemoryService.addReasoningStep(this.sessionId!, {
      thought,
      action,
      observation: observation ? JSON.stringify(observation) : undefined,
    });
  }

  private async addMemory(
    type: "tool_result" | "user_input" | "agent_decision" | "payment" | "error",
    content: string,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    await AgentMemoryService.addMemoryEntry(this.sessionId!, {
      type,
      content,
      metadata,
    });
  }
}
