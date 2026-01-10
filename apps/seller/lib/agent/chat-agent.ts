import OpenAI from "openai";
import { x402Client, wrapFetchWithPayment, x402HTTPClient } from "@x402/fetch";
import { registerExactEvmScheme } from "@x402/evm/exact/client";
import { CdpClient } from "@coinbase/cdp-sdk";
import { toAccount } from "viem/accounts";

import { AgentMemoryService } from "../db/services/agent-memory.service";
import { ToolRegistryService } from "../db/services/tool-registry.service";
import { BudgetService } from "../db/services/budget.service";
import { PaymentService } from "../db/services/payment.service";
import { BudgetState } from "../db/types";
import { ToolExecutor } from "./llm-tools";

export interface ChatAgentConfig {
  agentId: string;
  walletName?: string;
  budgetLimits?: BudgetState["limits"];
  model?: string;
  systemPrompt?: string;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

// Fireworks-compatible tool definitions (OpenAI format)
const FIREWORKS_TOOLS: OpenAI.ChatCompletionTool[] = [
  // === MEMORY TOOLS ===
  {
    type: "function",
    function: {
      name: "get_recent_memory",
      description: "Get recent memory entries from the current session. Use this to recall what happened recently.",
      parameters: {
        type: "object",
        properties: {
          limit: {
            type: "number",
            description: "Number of recent entries to retrieve (default 10)",
          },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_reasoning_history",
      description: "Get the full reasoning history for the current session.",
      parameters: {
        type: "object",
        properties: {},
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "add_memory",
      description: "Add a new memory entry to persist important information.",
      parameters: {
        type: "object",
        properties: {
          type: {
            type: "string",
            enum: ["user_input", "agent_decision", "tool_result", "error"],
            description: "Type of memory entry",
          },
          content: {
            type: "string",
            description: "The content to remember",
          },
        },
        required: ["type", "content"],
      },
    },
  },

  // === TOOL REGISTRY ===
  {
    type: "function",
    function: {
      name: "search_tools",
      description: "Search for available x402 paid tools/APIs.",
      parameters: {
        type: "object",
        properties: {
          category: {
            type: "string",
            description: "Filter by category",
          },
          searchText: {
            type: "string",
            description: "Search in tool names and descriptions",
          },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_all_tools",
      description: "Get all registered x402 tools/APIs available for use.",
      parameters: {
        type: "object",
        properties: {},
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_tool_stats",
      description: "Get usage statistics for a specific tool.",
      parameters: {
        type: "object",
        properties: {
          toolId: {
            type: "string",
            description: "The tool ID or endpoint URL",
          },
        },
        required: ["toolId"],
      },
    },
  },

  // === PAYMENT TOOLS ===
  {
    type: "function",
    function: {
      name: "get_payment_history",
      description: "Get recent payment history.",
      parameters: {
        type: "object",
        properties: {
          limit: {
            type: "number",
            description: "Number of payments to retrieve (default 20)",
          },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_session_payments",
      description: "Get all payments made in the current session.",
      parameters: {
        type: "object",
        properties: {},
        required: [],
      },
    },
  },

  // === BUDGET TOOLS ===
  {
    type: "function",
    function: {
      name: "get_budget",
      description: "Get current budget state including limits and spending.",
      parameters: {
        type: "object",
        properties: {},
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "check_can_spend",
      description: "Check if a specific amount can be spent within budget.",
      parameters: {
        type: "object",
        properties: {
          amount: {
            type: "string",
            description: "Amount in base units (e.g., '10000' for $0.01)",
          },
        },
        required: ["amount"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_remaining_budget",
      description: "Get remaining budget for session, daily, and total limits.",
      parameters: {
        type: "object",
        properties: {},
        required: [],
      },
    },
  },

  // === WORKFLOW TOOLS ===
  {
    type: "function",
    function: {
      name: "get_workflow_history",
      description: "Get history of all workflows executed.",
      parameters: {
        type: "object",
        properties: {
          limit: {
            type: "number",
            description: "Number of workflows to retrieve",
          },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_workflow_analytics",
      description: "Get analytics on workflow execution.",
      parameters: {
        type: "object",
        properties: {},
        required: [],
      },
    },
  },

  // === X402 EXECUTION ===
  {
    type: "function",
    function: {
      name: "call_paid_api",
      description: "Call an x402 paid API endpoint. This handles payment automatically.",
      parameters: {
        type: "object",
        properties: {
          url: {
            type: "string",
            description: "The API endpoint URL to call",
          },
          method: {
            type: "string",
            enum: ["GET", "POST", "PUT", "DELETE"],
            description: "HTTP method (default GET)",
          },
          body: {
            type: "object",
            description: "Request body for POST/PUT requests",
          },
        },
        required: ["url"],
      },
    },
  },
];

const DEFAULT_SYSTEM_PROMPT = `You are an AI agent with access to MongoDB for persistent memory and x402 for making paid API calls.

You can:
1. **Remember things** - Use memory tools to store and recall information across conversations
2. **Search for tools** - Find available paid APIs that can help accomplish tasks
3. **Check budget** - View spending limits and remaining budget before making calls
4. **Call paid APIs** - Execute x402 payments to access paid services
5. **View payment history** - See all payments you've made

AVAILABLE PAID APIs:
- **Local Protected API**: http://localhost:3000/api/protected (costs $0.01 USDC on Base Sepolia)
  - This is a test endpoint that returns sample data after successful payment

When a user asks you to "call the protected API" or "access the protected endpoint":
1. Use get_budget to check you have funds
2. Call call_paid_api with url="http://localhost:3000/api/protected"
3. Report the result including any payment transaction hash

IMPORTANT: When using call_paid_api, you MUST provide the full URL as a parameter. For example:
- call_paid_api(url="http://localhost:3000/api/protected")

Always be transparent about costs. Format monetary amounts clearly (e.g., "$0.01" not "10000 base units").
You have persistent memory in MongoDB - use it to remember user preferences and important context.`;

export class ChatAgent {
  private openai: OpenAI;
  private config: ChatAgentConfig;
  private sessionId: string | null = null;
  private conversationHistory: OpenAI.ChatCompletionMessageParam[] = [];
  private toolExecutor: ToolExecutor | null = null;
  private fetchWithPayment: typeof fetch | null = null;
  private x402Client: x402Client | null = null;
  private cdpAccount: Awaited<ReturnType<CdpClient["evm"]["getOrCreateAccount"]>> | null = null;
  private initialized = false;

  constructor(config: ChatAgentConfig) {
    // Initialize Fireworks client (OpenAI-compatible)
    this.openai = new OpenAI({
      apiKey: process.env.FIREWORKS_API_KEY,
      baseURL: "https://api.fireworks.ai/inference/v1",
    });

    this.config = {
      model: "accounts/fireworks/models/llama-v3p3-70b-instruct", // Fireworks Llama 3.3 70B
      systemPrompt: DEFAULT_SYSTEM_PROMPT,
      walletName: "x402-chat-agent",
      budgetLimits: {
        maxPerTransaction: "100000",
        maxPerSession: "1000000",
        maxDaily: "10000000",
        maxTotal: "100000000",
      },
      ...config,
    };
  }

  /**
   * Initialize the chat agent
   */
  async initialize(): Promise<void> {
    console.log("[ChatAgent] Initializing...");

    // 1. Setup CDP wallet
    const cdp = new CdpClient();
    this.cdpAccount = await cdp.evm.getOrCreateAccount({
      name: this.config.walletName!,
    });
    console.log(`[ChatAgent] Wallet: ${this.cdpAccount.address}`);

    // 2. Setup x402 client
    const signer = toAccount(this.cdpAccount);
    this.x402Client = new x402Client();
    registerExactEvmScheme(this.x402Client, { signer });
    this.fetchWithPayment = wrapFetchWithPayment(fetch, this.x402Client);

    // 3. Initialize budget
    await BudgetService.initializeBudget(
      this.config.agentId,
      this.cdpAccount.address,
      this.config.budgetLimits!
    );
    await BudgetService.updateBalance(this.config.agentId, "1000000000");

    // 4. Create session
    const session = await AgentMemoryService.createSession(
      this.config.agentId,
      "Chat session"
    );
    this.sessionId = session.sessionId;
    console.log(`[ChatAgent] Session: ${this.sessionId}`);

    // 5. Setup tool executor
    this.toolExecutor = new ToolExecutor(
      this.config.agentId,
      this.sessionId,
      this.callEndpoint.bind(this)
    );

    // 6. Register known tools
    await this.registerKnownTools();

    // 7. Initialize conversation with system prompt
    this.conversationHistory = [
      { role: "system", content: this.config.systemPrompt! },
    ];

    this.initialized = true;
    console.log("[ChatAgent] Ready!\n");
  }

  /**
   * Send a message and get a response
   */
  async chat(userMessage: string): Promise<string> {
    if (!this.initialized) {
      throw new Error("ChatAgent not initialized. Call initialize() first.");
    }

    // Store user message in memory
    await AgentMemoryService.addMemoryEntry(this.sessionId!, {
      type: "user_input",
      content: userMessage,
    });

    // Add to conversation history
    this.conversationHistory.push({
      role: "user",
      content: userMessage,
    });

    // Call Fireworks LLM with tools
    let response = await this.openai.chat.completions.create({
      model: this.config.model!,
      messages: this.conversationHistory,
      tools: FIREWORKS_TOOLS,
      tool_choice: "auto",
    });

    let assistantMessage = response.choices[0].message;
    let iterations = 0;
    const maxIterations = 10;

    // Handle tool calls loop
    while (iterations < maxIterations) {
      iterations++;

      // Check for proper tool_calls first
      if (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
        this.conversationHistory.push(assistantMessage);

        for (const toolCall of assistantMessage.tool_calls) {
          if (toolCall.type !== "function") continue;

          const functionName = toolCall.function.name;
          let functionArgs: Record<string, unknown> = {};
          try {
            functionArgs = JSON.parse(toolCall.function.arguments || "{}");
          } catch {
            functionArgs = {};
          }

          console.log(`[Tool] ${functionName}`);
          const result = await this.toolExecutor!.execute(functionName, functionArgs);

          this.conversationHistory.push({
            role: "tool",
            tool_call_id: toolCall.id,
            content: result,
          });
        }
      }
      // Check for text-based function calls (fallback for some models)
      else if (assistantMessage.content) {
        const textToolCall = this.parseTextToolCall(assistantMessage.content);

        if (textToolCall) {
          console.log(`[Tool] ${textToolCall.name} (from text)`);
          const result = await this.toolExecutor!.execute(
            textToolCall.name,
            textToolCall.parameters
          );

          // Add the assistant's message and tool result
          this.conversationHistory.push({
            role: "assistant",
            content: assistantMessage.content,
          });
          this.conversationHistory.push({
            role: "user",
            content: `Tool result for ${textToolCall.name}:\n${result}\n\nNow provide a natural language response to the user based on this result.`,
          });
        } else {
          // No tool call, we have the final response
          break;
        }
      } else {
        break;
      }

      // Continue the conversation
      response = await this.openai.chat.completions.create({
        model: this.config.model!,
        messages: this.conversationHistory,
        tools: FIREWORKS_TOOLS,
        tool_choice: "auto",
      });

      assistantMessage = response.choices[0].message;
    }

    // Extract final text response
    let finalResponse = assistantMessage.content || "";

    // If the response still looks like a function call, try to execute it and get a real response
    if (this.parseTextToolCall(finalResponse)) {
      finalResponse = "I executed the requested action. Check the tool output above for details.";
    }

    // Add to conversation history
    this.conversationHistory.push({
      role: "assistant",
      content: finalResponse,
    });

    // Store in memory
    await AgentMemoryService.addMemoryEntry(this.sessionId!, {
      type: "agent_decision",
      content: finalResponse,
    });

    return finalResponse;
  }

  /**
   * Parse text-based tool calls (when model outputs JSON instead of using tool_calls)
   */
  private parseTextToolCall(
    text: string
  ): { name: string; parameters: Record<string, unknown> } | null {
    try {
      // Try to parse as JSON
      const trimmed = text.trim();
      if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
        const parsed = JSON.parse(trimmed);
        if (parsed.type === "function" && parsed.name) {
          return {
            name: parsed.name,
            parameters: parsed.parameters || {},
          };
        }
        if (parsed.name && typeof parsed.name === "string") {
          return {
            name: parsed.name,
            parameters: parsed.parameters || parsed.arguments || {},
          };
        }
      }
    } catch {
      // Not valid JSON, that's fine
    }
    return null;
  }

  /**
   * Get conversation history
   */
  getHistory(): ChatMessage[] {
    return this.conversationHistory
      .filter((msg) => msg.role === "user" || msg.role === "assistant")
      .filter((msg) => typeof msg.content === "string")
      .map((msg) => ({
        role: msg.role as "user" | "assistant",
        content: msg.content as string,
      }));
  }

  /**
   * Clear conversation history (but keep MongoDB memory)
   */
  clearHistory(): void {
    this.conversationHistory = [
      { role: "system", content: this.config.systemPrompt! },
    ];
  }

  /**
   * End the session
   */
  async endSession(): Promise<void> {
    if (this.sessionId) {
      await AgentMemoryService.completeSession(this.sessionId);
    }
  }

  // === Private methods ===

  private async callEndpoint(
    url: string,
    options: RequestInit = { method: "GET" }
  ): Promise<{
    success: boolean;
    status: number;
    data: unknown;
    paymentId?: string;
    txHash?: string;
    error?: string;
  }> {
    const tool = await ToolRegistryService.getToolByEndpoint(url);
    const toolId = tool?.toolId || url;
    const estimatedCost = tool?.pricing?.amount || "10000";

    // Check budget
    const budgetCheck = await BudgetService.canSpend(
      this.config.agentId,
      estimatedCost
    );
    if (!budgetCheck.allowed) {
      return {
        success: false,
        status: 0,
        data: null,
        error: `Budget exceeded: ${budgetCheck.reason}`,
      };
    }

    // Reserve funds
    await BudgetService.reserveFunds(this.config.agentId, estimatedCost);

    // Create payment record
    const paymentRecord = await PaymentService.createPayment({
      agentId: this.config.agentId,
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
      const response = await this.fetchWithPayment!(url, options);
      const latencyMs = Date.now() - startTime;

      const text = await response.text();
      let data: unknown;
      try {
        data = JSON.parse(text);
      } catch {
        data = text;
      }

      if (response.ok) {
        const httpClient = new x402HTTPClient(this.x402Client!);
        const receipt = httpClient.getPaymentSettleResponse((name: string) =>
          response.headers.get(name)
        );

        await PaymentService.completePayment(
          paymentRecord.paymentId,
          { paymentPayload: "", paymentSignature: "" },
          receipt?.transaction
        );

        await BudgetService.recordSpend(this.config.agentId, estimatedCost);
        await ToolRegistryService.updateToolStats(toolId, true, latencyMs, estimatedCost);

        return {
          success: true,
          status: response.status,
          data,
          paymentId: paymentRecord.paymentId,
          txHash: receipt?.transaction,
        };
      } else {
        await PaymentService.updatePaymentStatus(
          paymentRecord.paymentId,
          "failed",
          undefined,
          `HTTP ${response.status}`
        );
        await BudgetService.releaseFunds(this.config.agentId, estimatedCost);
        await ToolRegistryService.updateToolStats(toolId, false, latencyMs, "0");

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
      await BudgetService.releaseFunds(this.config.agentId, estimatedCost);

      return {
        success: false,
        status: 0,
        data: null,
        paymentId: paymentRecord.paymentId,
        error: errorMsg,
      };
    }
  }

  private async registerKnownTools(): Promise<void> {
    // Register local protected endpoint
    await ToolRegistryService.registerTool({
      toolId: "local-protected-api",
      name: "Local Protected API",
      description: "Local x402 test endpoint that returns sample paid data",
      endpoint: "http://localhost:3000/api/protected",
      pricing: {
        amount: "10000",
        currency: "USDC",
        network: "base-sepolia",
        payTo: "0x1F5bf14f574bAED7E6C0dec947295f9fF3f9bA12",
      },
      bazaarListing: {
        discoveredAt: new Date(),
        category: "api",
        tags: ["test", "local"],
      },
      isActive: true,
    });
  }
}
