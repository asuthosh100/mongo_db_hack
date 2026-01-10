import { getAgentMemoryCollection } from "../collections";
import { AgentMemory, ReasoningStep, MemoryEntry } from "../types";
import { randomUUID } from "crypto";

export class AgentMemoryService {
  // Create a new agent session
  static async createSession(
    agentId: string,
    intent: string
  ): Promise<AgentMemory> {
    const collection = await getAgentMemoryCollection();
    const now = new Date();

    const memory: AgentMemory = {
      agentId,
      sessionId: randomUUID(),
      currentIntent: intent,
      reasoningHistory: [],
      state: "idle",
      shortTermMemory: [],
      createdAt: now,
      updatedAt: now,
    };

    const result = await collection.insertOne(memory);
    return { ...memory, _id: result.insertedId };
  }

  // Get current session for an agent
  static async getCurrentSession(agentId: string): Promise<AgentMemory | null> {
    const collection = await getAgentMemoryCollection();
    return collection.findOne(
      { agentId, state: { $ne: "completed" } },
      { sort: { updatedAt: -1 } }
    );
  }

  // Get session by ID
  static async getSession(sessionId: string): Promise<AgentMemory | null> {
    const collection = await getAgentMemoryCollection();
    return collection.findOne({ sessionId });
  }

  // Update agent state
  static async updateState(
    sessionId: string,
    state: AgentMemory["state"]
  ): Promise<void> {
    const collection = await getAgentMemoryCollection();
    await collection.updateOne(
      { sessionId },
      { $set: { state, updatedAt: new Date() } }
    );
  }

  // Add a reasoning step
  static async addReasoningStep(
    sessionId: string,
    step: Omit<ReasoningStep, "timestamp">
  ): Promise<void> {
    const collection = await getAgentMemoryCollection();
    await collection.updateOne(
      { sessionId },
      {
        $push: {
          reasoningHistory: { ...step, timestamp: new Date() },
        },
        $set: { updatedAt: new Date() },
      }
    );
  }

  // Add to short-term memory
  static async addMemoryEntry(
    sessionId: string,
    entry: Omit<MemoryEntry, "timestamp">
  ): Promise<void> {
    const collection = await getAgentMemoryCollection();
    await collection.updateOne(
      { sessionId },
      {
        $push: {
          shortTermMemory: {
            $each: [{ ...entry, timestamp: new Date() }],
            $slice: -50, // Keep last 50 entries
          },
        },
        $set: { updatedAt: new Date() },
      }
    );
  }

  // Get recent memory for context
  static async getRecentMemory(
    sessionId: string,
    limit: number = 10
  ): Promise<MemoryEntry[]> {
    const session = await this.getSession(sessionId);
    if (!session) return [];
    return session.shortTermMemory.slice(-limit);
  }

  // Get full reasoning history
  static async getReasoningHistory(sessionId: string): Promise<ReasoningStep[]> {
    const session = await this.getSession(sessionId);
    return session?.reasoningHistory || [];
  }

  // Complete a session
  static async completeSession(sessionId: string): Promise<void> {
    await this.updateState(sessionId, "completed");
  }

  // Get all sessions for an agent
  static async getAgentSessions(
    agentId: string,
    limit: number = 10
  ): Promise<AgentMemory[]> {
    const collection = await getAgentMemoryCollection();
    return collection
      .find({ agentId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();
  }
}
