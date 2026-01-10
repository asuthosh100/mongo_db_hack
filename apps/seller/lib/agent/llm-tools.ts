import Anthropic from "@anthropic-ai/sdk";
import { AgentMemoryService } from "../db/services/agent-memory.service";
import { ToolRegistryService } from "../db/services/tool-registry.service";
import { PaymentService } from "../db/services/payment.service";
import { BudgetService } from "../db/services/budget.service";
import { WorkflowService } from "../db/services/workflow.service";

/**
 * Tool definitions for Claude to interact with MongoDB and x402
 */
export const AGENT_TOOLS: Anthropic.Tool[] = [
  // === MEMORY TOOLS ===
  {
    name: "get_recent_memory",
    description:
      "Get recent memory entries from the current session. Use this to recall what happened recently.",
    input_schema: {
      type: "object" as const,
      properties: {
        limit: {
          type: "number",
          description: "Number of recent entries to retrieve (default 10)",
        },
      },
      required: [],
    },
  },
  {
    name: "get_reasoning_history",
    description:
      "Get the full reasoning history for the current session. Shows all thoughts, actions, and observations.",
    input_schema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
  {
    name: "add_memory",
    description:
      "Add a new memory entry to persist important information or decisions.",
    input_schema: {
      type: "object" as const,
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

  // === TOOL REGISTRY ===
  {
    name: "search_tools",
    description:
      "Search for available x402 paid tools/APIs. Use this to find services that can help accomplish a task.",
    input_schema: {
      type: "object" as const,
      properties: {
        category: {
          type: "string",
          description: "Filter by category (e.g., 'api', 'ai', 'data')",
        },
        searchText: {
          type: "string",
          description: "Search in tool names and descriptions",
        },
      },
      required: [],
    },
  },
  {
    name: "get_all_tools",
    description: "Get all registered x402 tools/APIs available for use.",
    input_schema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
  {
    name: "get_tool_stats",
    description:
      "Get usage statistics for a specific tool (success rate, latency, total spent).",
    input_schema: {
      type: "object" as const,
      properties: {
        toolId: {
          type: "string",
          description: "The tool ID or endpoint URL",
        },
      },
      required: ["toolId"],
    },
  },

  // === PAYMENT TOOLS ===
  {
    name: "get_payment_history",
    description:
      "Get recent payment history. Shows all x402 payments made by the agent.",
    input_schema: {
      type: "object" as const,
      properties: {
        limit: {
          type: "number",
          description: "Number of payments to retrieve (default 20)",
        },
      },
      required: [],
    },
  },
  {
    name: "get_session_payments",
    description: "Get all payments made in the current session.",
    input_schema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },

  // === BUDGET TOOLS ===
  {
    name: "get_budget",
    description:
      "Get current budget state including limits, spend tracking, and remaining budget.",
    input_schema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
  {
    name: "check_can_spend",
    description:
      "Check if a specific amount can be spent within budget limits.",
    input_schema: {
      type: "object" as const,
      properties: {
        amount: {
          type: "string",
          description: "Amount to check in base units (e.g., '10000' for $0.01)",
        },
      },
      required: ["amount"],
    },
  },
  {
    name: "get_remaining_budget",
    description: "Get remaining budget for session, daily, and total limits.",
    input_schema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },

  // === WORKFLOW TOOLS ===
  {
    name: "get_workflow_history",
    description: "Get history of all workflows executed by the agent.",
    input_schema: {
      type: "object" as const,
      properties: {
        limit: {
          type: "number",
          description: "Number of workflows to retrieve (default 10)",
        },
      },
      required: [],
    },
  },
  {
    name: "get_workflow_analytics",
    description:
      "Get analytics on workflow execution (total, completed, failed, costs).",
    input_schema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },

  // === X402 EXECUTION ===
  {
    name: "call_paid_api",
    description:
      "Call an x402 paid API endpoint. This will automatically handle payment if required. Use this to execute paid tool calls.",
    input_schema: {
      type: "object" as const,
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
];

/**
 * Tool executor - handles tool calls from Claude
 */
export class ToolExecutor {
  private agentId: string;
  private sessionId: string;
  private callEndpoint: (url: string, options?: RequestInit) => Promise<{
    success: boolean;
    status: number;
    data: unknown;
    paymentId?: string;
    txHash?: string;
    error?: string;
  }>;

  constructor(
    agentId: string,
    sessionId: string,
    callEndpoint: (url: string, options?: RequestInit) => Promise<{
      success: boolean;
      status: number;
      data: unknown;
      paymentId?: string;
      txHash?: string;
      error?: string;
    }>
  ) {
    this.agentId = agentId;
    this.sessionId = sessionId;
    this.callEndpoint = callEndpoint;
  }

  async execute(
    toolName: string,
    toolInput: Record<string, unknown>
  ): Promise<string> {
    try {
      switch (toolName) {
        // Memory tools
        case "get_recent_memory": {
          const limit = (toolInput.limit as number) || 10;
          const entries = await AgentMemoryService.getRecentMemory(
            this.sessionId,
            limit
          );
          return JSON.stringify(entries, null, 2);
        }

        case "get_reasoning_history": {
          const history = await AgentMemoryService.getReasoningHistory(
            this.sessionId
          );
          return JSON.stringify(history, null, 2);
        }

        case "add_memory": {
          await AgentMemoryService.addMemoryEntry(this.sessionId, {
            type: toolInput.type as "user_input" | "agent_decision" | "tool_result" | "error",
            content: toolInput.content as string,
          });
          return "Memory entry added successfully";
        }

        // Tool registry
        case "search_tools": {
          const tools = await ToolRegistryService.searchTools({
            category: toolInput.category as string | undefined,
            searchText: toolInput.searchText as string | undefined,
          });
          return JSON.stringify(
            tools.map((t) => ({
              id: t.toolId,
              name: t.name,
              description: t.description,
              endpoint: t.endpoint,
              pricing: t.pricing,
              stats: t.stats,
            })),
            null,
            2
          );
        }

        case "get_all_tools": {
          const tools = await ToolRegistryService.getAllActiveTools();
          return JSON.stringify(
            tools.map((t) => ({
              id: t.toolId,
              name: t.name,
              description: t.description,
              endpoint: t.endpoint,
              pricing: t.pricing,
            })),
            null,
            2
          );
        }

        case "get_tool_stats": {
          const tool = await ToolRegistryService.getTool(
            toolInput.toolId as string
          );
          if (!tool) {
            return JSON.stringify({ error: "Tool not found" });
          }
          return JSON.stringify(
            {
              name: tool.name,
              endpoint: tool.endpoint,
              stats: tool.stats,
              lastUsed: tool.lastUsed,
            },
            null,
            2
          );
        }

        // Payment tools
        case "get_payment_history": {
          const limit = (toolInput.limit as number) || 20;
          const payments = await PaymentService.getRecentPayments(
            this.agentId,
            limit
          );
          return JSON.stringify(
            payments.map((p) => ({
              id: p.paymentId,
              amount: p.amount,
              currency: p.currency,
              status: p.status,
              tool: p.toolEndpoint,
              txHash: p.txHash,
              timestamp: p.initiatedAt,
            })),
            null,
            2
          );
        }

        case "get_session_payments": {
          const payments = await PaymentService.getSessionPayments(
            this.agentId,
            this.sessionId
          );
          return JSON.stringify(
            payments.map((p) => ({
              id: p.paymentId,
              amount: p.amount,
              currency: p.currency,
              status: p.status,
              tool: p.toolEndpoint,
              txHash: p.txHash,
            })),
            null,
            2
          );
        }

        // Budget tools
        case "get_budget": {
          const budget = await BudgetService.getBudget(this.agentId);
          if (!budget) {
            return JSON.stringify({ error: "Budget not initialized" });
          }
          return JSON.stringify(
            {
              wallet: budget.walletAddress,
              limits: budget.limits,
              spent: budget.spent,
              balance: budget.balance,
            },
            null,
            2
          );
        }

        case "check_can_spend": {
          const result = await BudgetService.canSpend(
            this.agentId,
            toolInput.amount as string
          );
          return JSON.stringify(result);
        }

        case "get_remaining_budget": {
          const remaining = await BudgetService.getRemainingBudget(this.agentId);
          if (!remaining) {
            return JSON.stringify({ error: "Budget not initialized" });
          }
          return JSON.stringify(remaining, null, 2);
        }

        // Workflow tools
        case "get_workflow_history": {
          const limit = (toolInput.limit as number) || 10;
          const workflows = await WorkflowService.getAgentWorkflows(
            this.agentId,
            limit
          );
          return JSON.stringify(
            workflows.map((w) => ({
              id: w.workflowId,
              intent: w.originalIntent,
              status: w.status,
              steps: w.plannedSteps.length,
              cost: w.actualTotalCost,
              createdAt: w.createdAt,
            })),
            null,
            2
          );
        }

        case "get_workflow_analytics": {
          const analytics = await WorkflowService.getWorkflowAnalytics(
            this.agentId
          );
          return JSON.stringify(analytics, null, 2);
        }

        // X402 execution
        case "call_paid_api": {
          const url = toolInput.url as string;
          if (!url) {
            return JSON.stringify({ error: "URL is required for call_paid_api" });
          }
          console.log(`[call_paid_api] URL: ${url}`);

          const method = (toolInput.method as string) || "GET";
          const body = toolInput.body as Record<string, unknown> | undefined;

          const options: RequestInit = { method };
          if (body && (method === "POST" || method === "PUT")) {
            options.headers = { "Content-Type": "application/json" };
            options.body = JSON.stringify(body);
          }

          console.log(`[call_paid_api] Making ${method} request to ${url}`);
          const result = await this.callEndpoint(url, options);
          console.log(`[call_paid_api] Result:`, JSON.stringify(result, null, 2));

          // Log to memory
          await AgentMemoryService.addMemoryEntry(this.sessionId, {
            type: result.success ? "tool_result" : "error",
            content: result.success
              ? `Called ${url}: ${JSON.stringify(result.data)}`
              : `Failed to call ${url}: ${result.error}`,
            metadata: {
              url,
              method,
              status: result.status,
              paymentId: result.paymentId,
              txHash: result.txHash,
            },
          });

          return JSON.stringify(result, null, 2);
        }

        default:
          return JSON.stringify({ error: `Unknown tool: ${toolName}` });
      }
    } catch (error) {
      return JSON.stringify({
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}
