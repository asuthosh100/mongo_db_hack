import { getToolsCollection } from "../collections";
import { Tool } from "../types";

export class ToolRegistryService {
  // Register or update a tool from x402 Bazaar
  static async registerTool(tool: Omit<Tool, "_id" | "createdAt" | "updatedAt" | "stats">): Promise<Tool> {
    const collection = await getToolsCollection();
    const now = new Date();

    const existingTool = await collection.findOne({ toolId: tool.toolId });

    if (existingTool) {
      // Update existing tool
      await collection.updateOne(
        { toolId: tool.toolId },
        {
          $set: {
            ...tool,
            updatedAt: now,
          },
        }
      );
      return { ...existingTool, ...tool, updatedAt: now };
    }

    // Create new tool
    const newTool: Tool = {
      ...tool,
      stats: {
        totalCalls: 0,
        successfulCalls: 0,
        averageLatencyMs: 0,
        totalSpent: "0",
      },
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };

    const result = await collection.insertOne(newTool);
    return { ...newTool, _id: result.insertedId };
  }

  // Get tool by ID
  static async getTool(toolId: string): Promise<Tool | null> {
    const collection = await getToolsCollection();
    return collection.findOne({ toolId });
  }

  // Get tool by endpoint
  static async getToolByEndpoint(endpoint: string): Promise<Tool | null> {
    const collection = await getToolsCollection();
    return collection.findOne({ endpoint });
  }

  // Search tools by category or tags
  static async searchTools(query: {
    category?: string;
    tags?: string[];
    searchText?: string;
  }): Promise<Tool[]> {
    const collection = await getToolsCollection();
    const filter: Record<string, unknown> = { isActive: true };

    if (query.category) {
      filter["bazaarListing.category"] = query.category;
    }

    if (query.tags && query.tags.length > 0) {
      filter["bazaarListing.tags"] = { $in: query.tags };
    }

    if (query.searchText) {
      filter.$or = [
        { name: { $regex: query.searchText, $options: "i" } },
        { description: { $regex: query.searchText, $options: "i" } },
      ];
    }

    return collection.find(filter).toArray();
  }

  // Get all active tools
  static async getAllActiveTools(): Promise<Tool[]> {
    const collection = await getToolsCollection();
    return collection.find({ isActive: true }).toArray();
  }

  // Update tool stats after a call
  static async updateToolStats(
    toolId: string,
    success: boolean,
    latencyMs: number,
    amountSpent: string
  ): Promise<void> {
    const collection = await getToolsCollection();
    const tool = await this.getTool(toolId);

    if (!tool) return;

    const newTotalCalls = tool.stats.totalCalls + 1;
    const newSuccessfulCalls = tool.stats.successfulCalls + (success ? 1 : 0);
    const newAverageLatency =
      (tool.stats.averageLatencyMs * tool.stats.totalCalls + latencyMs) / newTotalCalls;
    const newTotalSpent = (
      BigInt(tool.stats.totalSpent) + BigInt(amountSpent)
    ).toString();

    await collection.updateOne(
      { toolId },
      {
        $set: {
          "stats.totalCalls": newTotalCalls,
          "stats.successfulCalls": newSuccessfulCalls,
          "stats.averageLatencyMs": Math.round(newAverageLatency),
          "stats.totalSpent": newTotalSpent,
          lastUsed: new Date(),
          updatedAt: new Date(),
        },
      }
    );
  }

  // Deactivate a tool
  static async deactivateTool(toolId: string): Promise<void> {
    const collection = await getToolsCollection();
    await collection.updateOne(
      { toolId },
      { $set: { isActive: false, updatedAt: new Date() } }
    );
  }

  // Get tools sorted by success rate (for optimization)
  static async getToolsByReliability(): Promise<Tool[]> {
    const collection = await getToolsCollection();
    return collection
      .aggregate<Tool>([
        { $match: { isActive: true, "stats.totalCalls": { $gt: 0 } } },
        {
          $addFields: {
            successRate: {
              $divide: ["$stats.successfulCalls", "$stats.totalCalls"],
            },
          },
        },
        { $sort: { successRate: -1 } },
        { $project: { successRate: 0 } },
      ])
      .toArray();
  }
}
