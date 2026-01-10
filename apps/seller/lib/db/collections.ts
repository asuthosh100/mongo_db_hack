import { Collection } from "mongodb";
import { getDatabase } from "../mongodb";
import {
  AgentMemory,
  Tool,
  PaymentRecord,
  BudgetState,
  Workflow,
  ToolResponseCache,
} from "./types";

// Collection names
export const COLLECTIONS = {
  AGENT_MEMORY: "agent_memory",
  TOOLS: "tools",
  PAYMENTS: "payments",
  BUDGETS: "budgets",
  WORKFLOWS: "workflows",
  TOOL_CACHE: "tool_cache",
} as const;

// Typed collection getters
export async function getAgentMemoryCollection(): Promise<Collection<AgentMemory>> {
  const db = await getDatabase();
  return db.collection<AgentMemory>(COLLECTIONS.AGENT_MEMORY);
}

export async function getToolsCollection(): Promise<Collection<Tool>> {
  const db = await getDatabase();
  return db.collection<Tool>(COLLECTIONS.TOOLS);
}

export async function getPaymentsCollection(): Promise<Collection<PaymentRecord>> {
  const db = await getDatabase();
  return db.collection<PaymentRecord>(COLLECTIONS.PAYMENTS);
}

export async function getBudgetsCollection(): Promise<Collection<BudgetState>> {
  const db = await getDatabase();
  return db.collection<BudgetState>(COLLECTIONS.BUDGETS);
}

export async function getWorkflowsCollection(): Promise<Collection<Workflow>> {
  const db = await getDatabase();
  return db.collection<Workflow>(COLLECTIONS.WORKFLOWS);
}

export async function getToolCacheCollection(): Promise<Collection<ToolResponseCache>> {
  const db = await getDatabase();
  return db.collection<ToolResponseCache>(COLLECTIONS.TOOL_CACHE);
}

// Initialize indexes for optimal query performance
export async function initializeIndexes(): Promise<void> {
  const db = await getDatabase();

  // Agent Memory indexes
  const agentMemory = db.collection(COLLECTIONS.AGENT_MEMORY);
  await agentMemory.createIndex({ agentId: 1, sessionId: 1 });
  await agentMemory.createIndex({ state: 1 });
  await agentMemory.createIndex({ updatedAt: -1 });

  // Tools indexes
  const tools = db.collection(COLLECTIONS.TOOLS);
  await tools.createIndex({ toolId: 1 }, { unique: true });
  await tools.createIndex({ endpoint: 1 });
  await tools.createIndex({ "bazaarListing.category": 1 });
  await tools.createIndex({ isActive: 1 });

  // Payments indexes
  const payments = db.collection(COLLECTIONS.PAYMENTS);
  await payments.createIndex({ paymentId: 1 }, { unique: true });
  await payments.createIndex({ agentId: 1, sessionId: 1 });
  await payments.createIndex({ workflowId: 1 });
  await payments.createIndex({ status: 1 });
  await payments.createIndex({ initiatedAt: -1 });

  // Budgets indexes
  const budgets = db.collection(COLLECTIONS.BUDGETS);
  await budgets.createIndex({ agentId: 1 }, { unique: true });
  await budgets.createIndex({ walletAddress: 1 });

  // Workflows indexes
  const workflows = db.collection(COLLECTIONS.WORKFLOWS);
  await workflows.createIndex({ workflowId: 1 }, { unique: true });
  await workflows.createIndex({ agentId: 1, sessionId: 1 });
  await workflows.createIndex({ status: 1 });
  await workflows.createIndex({ createdAt: -1 });

  // Tool cache indexes
  const toolCache = db.collection(COLLECTIONS.TOOL_CACHE);
  await toolCache.createIndex({ toolId: 1, inputHash: 1 }, { unique: true });
  await toolCache.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index

  console.log("Database indexes initialized");
}
