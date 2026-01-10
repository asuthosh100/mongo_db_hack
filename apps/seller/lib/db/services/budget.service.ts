import { getBudgetsCollection } from "../collections";
import { BudgetState } from "../types";

export class BudgetService {
  // Initialize budget for an agent
  static async initializeBudget(
    agentId: string,
    walletAddress: string,
    limits: BudgetState["limits"]
  ): Promise<BudgetState> {
    const collection = await getBudgetsCollection();
    const now = new Date();

    const existing = await collection.findOne({ agentId });
    if (existing) {
      return existing;
    }

    const budget: BudgetState = {
      agentId,
      walletAddress,
      limits,
      spent: {
        currentSession: "0",
        today: "0",
        total: "0",
      },
      balance: {
        available: "0",
        reserved: "0",
        lastChecked: now,
      },
      dailyResetAt: this.getNextMidnight(),
      sessionStartedAt: now,
      createdAt: now,
      updatedAt: now,
    };

    const result = await collection.insertOne(budget);
    return { ...budget, _id: result.insertedId };
  }

  // Get budget state
  static async getBudget(agentId: string): Promise<BudgetState | null> {
    const collection = await getBudgetsCollection();
    return collection.findOne({ agentId });
  }

  // Check if a payment is within budget
  static async canSpend(agentId: string, amount: string): Promise<{
    allowed: boolean;
    reason?: string;
  }> {
    const budget = await this.getBudget(agentId);
    if (!budget) {
      return { allowed: false, reason: "Budget not initialized" };
    }

    const amountBigInt = BigInt(amount);

    // Check per-transaction limit
    if (amountBigInt > BigInt(budget.limits.maxPerTransaction)) {
      return {
        allowed: false,
        reason: `Amount exceeds per-transaction limit of ${budget.limits.maxPerTransaction}`,
      };
    }

    // Check session limit
    const newSessionSpend = BigInt(budget.spent.currentSession) + amountBigInt;
    if (newSessionSpend > BigInt(budget.limits.maxPerSession)) {
      return {
        allowed: false,
        reason: `Would exceed session limit of ${budget.limits.maxPerSession}`,
      };
    }

    // Check daily limit (reset if needed)
    let dailySpent = BigInt(budget.spent.today);
    if (new Date() > budget.dailyResetAt) {
      dailySpent = BigInt(0);
    }
    if (dailySpent + amountBigInt > BigInt(budget.limits.maxDaily)) {
      return {
        allowed: false,
        reason: `Would exceed daily limit of ${budget.limits.maxDaily}`,
      };
    }

    // Check total limit
    const newTotalSpend = BigInt(budget.spent.total) + amountBigInt;
    if (newTotalSpend > BigInt(budget.limits.maxTotal)) {
      return {
        allowed: false,
        reason: `Would exceed total limit of ${budget.limits.maxTotal}`,
      };
    }

    // Check available balance
    if (amountBigInt > BigInt(budget.balance.available)) {
      return {
        allowed: false,
        reason: `Insufficient balance. Available: ${budget.balance.available}`,
      };
    }

    return { allowed: true };
  }

  // Reserve funds for a pending payment
  static async reserveFunds(agentId: string, amount: string): Promise<boolean> {
    const canSpendResult = await this.canSpend(agentId, amount);
    if (!canSpendResult.allowed) {
      return false;
    }

    const collection = await getBudgetsCollection();
    const amountBigInt = BigInt(amount);

    const budget = await this.getBudget(agentId);
    if (!budget) return false;

    const newAvailable = (BigInt(budget.balance.available) - amountBigInt).toString();
    const newReserved = (BigInt(budget.balance.reserved) + amountBigInt).toString();

    await collection.updateOne(
      { agentId },
      {
        $set: {
          "balance.available": newAvailable,
          "balance.reserved": newReserved,
          updatedAt: new Date(),
        },
      }
    );

    return true;
  }

  // Record a completed spend (move from reserved to spent)
  static async recordSpend(agentId: string, amount: string): Promise<void> {
    const collection = await getBudgetsCollection();
    const budget = await this.getBudget(agentId);
    if (!budget) return;

    const amountBigInt = BigInt(amount);

    // Reset daily if needed
    let dailySpent = BigInt(budget.spent.today);
    let dailyResetAt = budget.dailyResetAt;
    if (new Date() > budget.dailyResetAt) {
      dailySpent = BigInt(0);
      dailyResetAt = this.getNextMidnight();
    }

    await collection.updateOne(
      { agentId },
      {
        $set: {
          "spent.currentSession": (BigInt(budget.spent.currentSession) + amountBigInt).toString(),
          "spent.today": (dailySpent + amountBigInt).toString(),
          "spent.total": (BigInt(budget.spent.total) + amountBigInt).toString(),
          "balance.reserved": (BigInt(budget.balance.reserved) - amountBigInt).toString(),
          dailyResetAt,
          updatedAt: new Date(),
        },
      }
    );
  }

  // Release reserved funds (if payment fails)
  static async releaseFunds(agentId: string, amount: string): Promise<void> {
    const collection = await getBudgetsCollection();
    const budget = await this.getBudget(agentId);
    if (!budget) return;

    const amountBigInt = BigInt(amount);

    await collection.updateOne(
      { agentId },
      {
        $set: {
          "balance.available": (BigInt(budget.balance.available) + amountBigInt).toString(),
          "balance.reserved": (BigInt(budget.balance.reserved) - amountBigInt).toString(),
          updatedAt: new Date(),
        },
      }
    );
  }

  // Update balance from wallet
  static async updateBalance(agentId: string, available: string): Promise<void> {
    const collection = await getBudgetsCollection();
    await collection.updateOne(
      { agentId },
      {
        $set: {
          "balance.available": available,
          "balance.lastChecked": new Date(),
          updatedAt: new Date(),
        },
      }
    );
  }

  // Start new session (reset session spend)
  static async startNewSession(agentId: string): Promise<void> {
    const collection = await getBudgetsCollection();
    await collection.updateOne(
      { agentId },
      {
        $set: {
          "spent.currentSession": "0",
          sessionStartedAt: new Date(),
          updatedAt: new Date(),
        },
      }
    );
  }

  // Update limits
  static async updateLimits(
    agentId: string,
    limits: Partial<BudgetState["limits"]>
  ): Promise<void> {
    const collection = await getBudgetsCollection();
    const updateFields: Record<string, string> = {};

    if (limits.maxPerTransaction) {
      updateFields["limits.maxPerTransaction"] = limits.maxPerTransaction;
    }
    if (limits.maxPerSession) {
      updateFields["limits.maxPerSession"] = limits.maxPerSession;
    }
    if (limits.maxDaily) {
      updateFields["limits.maxDaily"] = limits.maxDaily;
    }
    if (limits.maxTotal) {
      updateFields["limits.maxTotal"] = limits.maxTotal;
    }

    await collection.updateOne(
      { agentId },
      { $set: { ...updateFields, updatedAt: new Date() } }
    );
  }

  // Get remaining budget
  static async getRemainingBudget(agentId: string): Promise<{
    session: string;
    daily: string;
    total: string;
  } | null> {
    const budget = await this.getBudget(agentId);
    if (!budget) return null;

    let dailySpent = BigInt(budget.spent.today);
    if (new Date() > budget.dailyResetAt) {
      dailySpent = BigInt(0);
    }

    return {
      session: (BigInt(budget.limits.maxPerSession) - BigInt(budget.spent.currentSession)).toString(),
      daily: (BigInt(budget.limits.maxDaily) - dailySpent).toString(),
      total: (BigInt(budget.limits.maxTotal) - BigInt(budget.spent.total)).toString(),
    };
  }

  // Helper: get next midnight
  private static getNextMidnight(): Date {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    return tomorrow;
  }
}
