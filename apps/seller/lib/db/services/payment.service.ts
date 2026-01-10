import { getPaymentsCollection } from "../collections";
import { PaymentRecord } from "../types";
import { randomUUID } from "crypto";

export class PaymentService {
  // Create a new payment record (when 402 is received)
  static async createPayment(
    payment: Omit<PaymentRecord, "_id" | "paymentId" | "initiatedAt" | "status" | "retryCount">
  ): Promise<PaymentRecord> {
    const collection = await getPaymentsCollection();

    const record: PaymentRecord = {
      ...payment,
      paymentId: randomUUID(),
      status: "pending",
      initiatedAt: new Date(),
      retryCount: 0,
    };

    const result = await collection.insertOne(record);
    return { ...record, _id: result.insertedId };
  }

  // Get payment by ID
  static async getPayment(paymentId: string): Promise<PaymentRecord | null> {
    const collection = await getPaymentsCollection();
    return collection.findOne({ paymentId });
  }

  // Update payment status
  static async updatePaymentStatus(
    paymentId: string,
    status: PaymentRecord["status"],
    txHash?: string,
    error?: string
  ): Promise<void> {
    const collection = await getPaymentsCollection();
    const update: Record<string, unknown> = { status };

    if (status === "completed") {
      update.completedAt = new Date();
    }
    if (txHash) {
      update.txHash = txHash;
    }
    if (error) {
      update.error = error;
    }

    await collection.updateOne({ paymentId }, { $set: update });
  }

  // Mark payment as completed with x402 headers
  static async completePayment(
    paymentId: string,
    x402Headers: PaymentRecord["x402Headers"],
    txHash?: string
  ): Promise<void> {
    const collection = await getPaymentsCollection();
    await collection.updateOne(
      { paymentId },
      {
        $set: {
          status: "completed",
          x402Headers,
          txHash,
          completedAt: new Date(),
        },
      }
    );
  }

  // Increment retry count
  static async incrementRetry(paymentId: string): Promise<number> {
    const collection = await getPaymentsCollection();
    const result = await collection.findOneAndUpdate(
      { paymentId },
      { $inc: { retryCount: 1 } },
      { returnDocument: "after" }
    );
    return result?.retryCount || 0;
  }

  // Get payments for a session
  static async getSessionPayments(
    agentId: string,
    sessionId: string
  ): Promise<PaymentRecord[]> {
    const collection = await getPaymentsCollection();
    return collection
      .find({ agentId, sessionId })
      .sort({ initiatedAt: -1 })
      .toArray();
  }

  // Get payments for a workflow
  static async getWorkflowPayments(workflowId: string): Promise<PaymentRecord[]> {
    const collection = await getPaymentsCollection();
    return collection
      .find({ workflowId })
      .sort({ initiatedAt: 1 })
      .toArray();
  }

  // Calculate total spent in a session
  static async getSessionTotalSpent(
    agentId: string,
    sessionId: string
  ): Promise<string> {
    const collection = await getPaymentsCollection();
    const result = await collection
      .aggregate([
        {
          $match: {
            agentId,
            sessionId,
            status: "completed",
          },
        },
        {
          $group: {
            _id: null,
            total: {
              $sum: { $toLong: "$amount" },
            },
          },
        },
      ])
      .toArray();

    return result[0]?.total?.toString() || "0";
  }

  // Get recent payments for analytics
  static async getRecentPayments(
    agentId: string,
    limit: number = 20
  ): Promise<PaymentRecord[]> {
    const collection = await getPaymentsCollection();
    return collection
      .find({ agentId })
      .sort({ initiatedAt: -1 })
      .limit(limit)
      .toArray();
  }

  // Get failed payments for retry
  static async getFailedPayments(agentId: string): Promise<PaymentRecord[]> {
    const collection = await getPaymentsCollection();
    return collection
      .find({
        agentId,
        status: "failed",
        retryCount: { $lt: 3 }, // Max 3 retries
      })
      .toArray();
  }

  // Get payment stats for a tool
  static async getToolPaymentStats(toolId: string): Promise<{
    totalPayments: number;
    totalSpent: string;
    averageAmount: string;
  }> {
    const collection = await getPaymentsCollection();
    const result = await collection
      .aggregate([
        { $match: { toolId, status: "completed" } },
        {
          $group: {
            _id: null,
            totalPayments: { $sum: 1 },
            totalSpent: { $sum: { $toLong: "$amount" } },
          },
        },
      ])
      .toArray();

    const stats = result[0] || { totalPayments: 0, totalSpent: 0 };
    return {
      totalPayments: stats.totalPayments,
      totalSpent: stats.totalSpent.toString(),
      averageAmount:
        stats.totalPayments > 0
          ? Math.floor(stats.totalSpent / stats.totalPayments).toString()
          : "0",
    };
  }
}
