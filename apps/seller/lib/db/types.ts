import { ObjectId } from "mongodb";

// ============ AGENT MEMORY ============
export interface AgentMemory {
  _id?: ObjectId;
  agentId: string;
  sessionId: string;

  // Reasoning context
  currentIntent: string;
  reasoningHistory: ReasoningStep[];

  // State
  state: "idle" | "planning" | "executing" | "waiting_payment" | "completed" | "failed";

  // Context window for the agent
  shortTermMemory: MemoryEntry[];

  createdAt: Date;
  updatedAt: Date;
}

export interface ReasoningStep {
  timestamp: Date;
  thought: string;
  action?: string;
  observation?: string;
}

export interface MemoryEntry {
  type: "tool_result" | "user_input" | "agent_decision" | "payment" | "error";
  content: string;
  metadata?: Record<string, unknown>;
  timestamp: Date;
}

// ============ TOOL REGISTRY ============
export interface Tool {
  _id?: ObjectId;

  // Tool identification
  toolId: string;
  name: string;
  description: string;
  endpoint: string;

  // x402 Bazaar metadata
  bazaarListing?: {
    discoveredAt: Date;
    category: string;
    tags: string[];
  };

  // Pricing from 402 response
  pricing: {
    amount: string;           // In base units (e.g., "1000000" for $1 USDC)
    currency: string;         // e.g., "USDC"
    network: string;          // e.g., "base-sepolia", "base"
    payTo: string;            // Payment address
  };

  // Usage stats for optimization
  stats: {
    totalCalls: number;
    successfulCalls: number;
    averageLatencyMs: number;
    totalSpent: string;
  };

  // Tool schema
  inputSchema?: Record<string, unknown>;
  outputSchema?: Record<string, unknown>;

  isActive: boolean;
  lastUsed?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// ============ PAYMENT HISTORY ============
export interface PaymentRecord {
  _id?: ObjectId;

  // Payment identification
  paymentId: string;
  agentId: string;
  sessionId: string;
  workflowId?: string;

  // Tool context
  toolId: string;
  toolEndpoint: string;

  // Payment details
  amount: string;
  currency: string;
  network: string;

  // Addresses
  fromAddress: string;
  toAddress: string;

  // x402 specific
  x402Headers?: {
    paymentPayload: string;
    paymentSignature: string;
  };

  // Transaction result
  status: "pending" | "completed" | "failed" | "refunded";
  txHash?: string;

  // Timing
  initiatedAt: Date;
  completedAt?: Date;

  // Error tracking
  error?: string;
  retryCount: number;
}

// ============ BUDGET STATE ============
export interface BudgetState {
  _id?: ObjectId;

  agentId: string;

  // Wallet info
  walletAddress: string;

  // Budget limits
  limits: {
    maxPerTransaction: string;    // Max spend per single tool call
    maxPerSession: string;        // Max spend per session
    maxDaily: string;             // Daily spend limit
    maxTotal: string;             // Total lifetime limit
  };

  // Current spend tracking
  spent: {
    currentSession: string;
    today: string;
    total: string;
  };

  // Balance tracking
  balance: {
    available: string;
    reserved: string;             // Reserved for pending payments
    lastChecked: Date;
  };

  // Reset tracking
  dailyResetAt: Date;
  sessionStartedAt: Date;

  createdAt: Date;
  updatedAt: Date;
}

// ============ WORKFLOW/TASK ============
export interface Workflow {
  _id?: ObjectId;

  workflowId: string;
  agentId: string;
  sessionId: string;

  // User intent
  originalIntent: string;

  // Planned tool chain
  plannedSteps: WorkflowStep[];

  // Execution state
  currentStepIndex: number;
  status: "planned" | "executing" | "paused" | "completed" | "failed" | "cancelled";

  // Results
  executedSteps: ExecutedStep[];
  finalResult?: unknown;

  // Cost tracking
  estimatedTotalCost: string;
  actualTotalCost: string;

  // Timing
  startedAt: Date;
  completedAt?: Date;

  // Error recovery
  lastError?: string;
  retryCount: number;

  createdAt: Date;
  updatedAt: Date;
}

export interface WorkflowStep {
  stepId: string;
  toolId: string;
  toolName: string;

  // Input can reference previous step outputs: "$step1.output.imageUrl"
  inputTemplate: Record<string, unknown>;

  // Estimated cost
  estimatedCost: string;

  // Conditions
  dependsOn?: string[];           // Step IDs this depends on
  condition?: string;             // Optional condition to execute

  // Priority for optimization
  priority: number;
}

export interface ExecutedStep {
  stepId: string;
  toolId: string;

  // Actual execution
  input: Record<string, unknown>;
  output?: unknown;

  // Payment made
  paymentId?: string;
  actualCost: string;

  // Timing
  startedAt: Date;
  completedAt?: Date;
  latencyMs: number;

  // Status
  status: "pending" | "executing" | "completed" | "failed" | "skipped";
  error?: string;
}

// ============ TOOL RESPONSE CACHE ============
export interface ToolResponseCache {
  _id?: ObjectId;

  // Cache key
  toolId: string;
  inputHash: string;              // Hash of the input for deduplication

  // Cached response
  response: unknown;

  // Metadata
  cachedAt: Date;
  expiresAt: Date;
  hitCount: number;
}
