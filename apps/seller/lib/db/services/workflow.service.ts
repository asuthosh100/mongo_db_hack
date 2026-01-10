import { getWorkflowsCollection } from "../collections";
import { Workflow, WorkflowStep, ExecutedStep } from "../types";
import { randomUUID } from "crypto";

export class WorkflowService {
  // Create a new workflow
  static async createWorkflow(
    agentId: string,
    sessionId: string,
    intent: string,
    plannedSteps: WorkflowStep[]
  ): Promise<Workflow> {
    const collection = await getWorkflowsCollection();
    const now = new Date();

    // Calculate estimated total cost
    const estimatedTotalCost = plannedSteps
      .reduce((sum, step) => sum + BigInt(step.estimatedCost), BigInt(0))
      .toString();

    const workflow: Workflow = {
      workflowId: randomUUID(),
      agentId,
      sessionId,
      originalIntent: intent,
      plannedSteps,
      currentStepIndex: 0,
      status: "planned",
      executedSteps: [],
      estimatedTotalCost,
      actualTotalCost: "0",
      startedAt: now,
      retryCount: 0,
      createdAt: now,
      updatedAt: now,
    };

    const result = await collection.insertOne(workflow);
    return { ...workflow, _id: result.insertedId };
  }

  // Get workflow by ID
  static async getWorkflow(workflowId: string): Promise<Workflow | null> {
    const collection = await getWorkflowsCollection();
    return collection.findOne({ workflowId });
  }

  // Get active workflow for a session
  static async getActiveWorkflow(
    agentId: string,
    sessionId: string
  ): Promise<Workflow | null> {
    const collection = await getWorkflowsCollection();
    return collection.findOne({
      agentId,
      sessionId,
      status: { $in: ["planned", "executing", "paused"] },
    });
  }

  // Start workflow execution
  static async startWorkflow(workflowId: string): Promise<void> {
    const collection = await getWorkflowsCollection();
    await collection.updateOne(
      { workflowId },
      {
        $set: {
          status: "executing",
          startedAt: new Date(),
          updatedAt: new Date(),
        },
      }
    );
  }

  // Get current step to execute
  static async getCurrentStep(workflowId: string): Promise<WorkflowStep | null> {
    const workflow = await this.getWorkflow(workflowId);
    if (!workflow || workflow.currentStepIndex >= workflow.plannedSteps.length) {
      return null;
    }
    return workflow.plannedSteps[workflow.currentStepIndex];
  }

  // Record step execution start
  static async startStep(
    workflowId: string,
    stepId: string,
    input: Record<string, unknown>
  ): Promise<void> {
    const collection = await getWorkflowsCollection();
    const workflow = await this.getWorkflow(workflowId);
    if (!workflow) return;

    const step = workflow.plannedSteps.find((s) => s.stepId === stepId);
    if (!step) return;

    const executedStep: ExecutedStep = {
      stepId,
      toolId: step.toolId,
      input,
      actualCost: "0",
      startedAt: new Date(),
      latencyMs: 0,
      status: "executing",
    };

    await collection.updateOne(
      { workflowId },
      {
        $push: { executedSteps: executedStep },
        $set: { updatedAt: new Date() },
      }
    );
  }

  // Complete a step
  static async completeStep(
    workflowId: string,
    stepId: string,
    output: unknown,
    actualCost: string,
    paymentId?: string
  ): Promise<void> {
    const collection = await getWorkflowsCollection();
    const workflow = await this.getWorkflow(workflowId);
    if (!workflow) return;

    const stepIndex = workflow.executedSteps.findIndex(
      (s) => s.stepId === stepId
    );
    if (stepIndex === -1) return;

    const startedAt = workflow.executedSteps[stepIndex].startedAt;
    const latencyMs = Date.now() - startedAt.getTime();

    const newActualTotal = (
      BigInt(workflow.actualTotalCost) + BigInt(actualCost)
    ).toString();

    await collection.updateOne(
      { workflowId },
      {
        $set: {
          [`executedSteps.${stepIndex}.output`]: output,
          [`executedSteps.${stepIndex}.actualCost`]: actualCost,
          [`executedSteps.${stepIndex}.paymentId`]: paymentId,
          [`executedSteps.${stepIndex}.completedAt`]: new Date(),
          [`executedSteps.${stepIndex}.latencyMs`]: latencyMs,
          [`executedSteps.${stepIndex}.status`]: "completed",
          currentStepIndex: workflow.currentStepIndex + 1,
          actualTotalCost: newActualTotal,
          updatedAt: new Date(),
        },
      }
    );
  }

  // Fail a step
  static async failStep(
    workflowId: string,
    stepId: string,
    error: string
  ): Promise<void> {
    const collection = await getWorkflowsCollection();
    const workflow = await this.getWorkflow(workflowId);
    if (!workflow) return;

    const stepIndex = workflow.executedSteps.findIndex(
      (s) => s.stepId === stepId
    );
    if (stepIndex === -1) return;

    const startedAt = workflow.executedSteps[stepIndex].startedAt;
    const latencyMs = Date.now() - startedAt.getTime();

    await collection.updateOne(
      { workflowId },
      {
        $set: {
          [`executedSteps.${stepIndex}.error`]: error,
          [`executedSteps.${stepIndex}.completedAt`]: new Date(),
          [`executedSteps.${stepIndex}.latencyMs`]: latencyMs,
          [`executedSteps.${stepIndex}.status`]: "failed",
          lastError: error,
          updatedAt: new Date(),
        },
        $inc: { retryCount: 1 },
      }
    );
  }

  // Skip a step
  static async skipStep(workflowId: string, stepId: string): Promise<void> {
    const collection = await getWorkflowsCollection();
    const workflow = await this.getWorkflow(workflowId);
    if (!workflow) return;

    const stepIndex = workflow.executedSteps.findIndex(
      (s) => s.stepId === stepId
    );

    if (stepIndex === -1) {
      // Step not started yet, add it as skipped
      const step = workflow.plannedSteps.find((s) => s.stepId === stepId);
      if (!step) return;

      const skippedStep: ExecutedStep = {
        stepId,
        toolId: step.toolId,
        input: {},
        actualCost: "0",
        startedAt: new Date(),
        completedAt: new Date(),
        latencyMs: 0,
        status: "skipped",
      };

      await collection.updateOne(
        { workflowId },
        {
          $push: { executedSteps: skippedStep },
          $set: {
            currentStepIndex: workflow.currentStepIndex + 1,
            updatedAt: new Date(),
          },
        }
      );
    } else {
      await collection.updateOne(
        { workflowId },
        {
          $set: {
            [`executedSteps.${stepIndex}.status`]: "skipped",
            currentStepIndex: workflow.currentStepIndex + 1,
            updatedAt: new Date(),
          },
        }
      );
    }
  }

  // Complete workflow
  static async completeWorkflow(
    workflowId: string,
    finalResult?: unknown
  ): Promise<void> {
    const collection = await getWorkflowsCollection();
    await collection.updateOne(
      { workflowId },
      {
        $set: {
          status: "completed",
          finalResult,
          completedAt: new Date(),
          updatedAt: new Date(),
        },
      }
    );
  }

  // Fail workflow
  static async failWorkflow(workflowId: string, error: string): Promise<void> {
    const collection = await getWorkflowsCollection();
    await collection.updateOne(
      { workflowId },
      {
        $set: {
          status: "failed",
          lastError: error,
          completedAt: new Date(),
          updatedAt: new Date(),
        },
      }
    );
  }

  // Pause workflow
  static async pauseWorkflow(workflowId: string): Promise<void> {
    const collection = await getWorkflowsCollection();
    await collection.updateOne(
      { workflowId },
      { $set: { status: "paused", updatedAt: new Date() } }
    );
  }

  // Resume workflow
  static async resumeWorkflow(workflowId: string): Promise<void> {
    const collection = await getWorkflowsCollection();
    await collection.updateOne(
      { workflowId },
      { $set: { status: "executing", updatedAt: new Date() } }
    );
  }

  // Get step output by ID (for resolving references)
  static async getStepOutput(
    workflowId: string,
    stepId: string
  ): Promise<unknown | null> {
    const workflow = await this.getWorkflow(workflowId);
    if (!workflow) return null;

    const step = workflow.executedSteps.find(
      (s) => s.stepId === stepId && s.status === "completed"
    );
    return step?.output || null;
  }

  // Get all workflows for an agent
  static async getAgentWorkflows(
    agentId: string,
    limit: number = 20
  ): Promise<Workflow[]> {
    const collection = await getWorkflowsCollection();
    return collection
      .find({ agentId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();
  }

  // Get workflow analytics
  static async getWorkflowAnalytics(agentId: string): Promise<{
    totalWorkflows: number;
    completed: number;
    failed: number;
    totalSpent: string;
    averageCost: string;
  }> {
    const collection = await getWorkflowsCollection();
    const result = await collection
      .aggregate([
        { $match: { agentId } },
        {
          $group: {
            _id: null,
            totalWorkflows: { $sum: 1 },
            completed: {
              $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] },
            },
            failed: {
              $sum: { $cond: [{ $eq: ["$status", "failed"] }, 1, 0] },
            },
            totalSpent: { $sum: { $toLong: "$actualTotalCost" } },
          },
        },
      ])
      .toArray();

    const stats = result[0] || {
      totalWorkflows: 0,
      completed: 0,
      failed: 0,
      totalSpent: 0,
    };

    return {
      totalWorkflows: stats.totalWorkflows,
      completed: stats.completed,
      failed: stats.failed,
      totalSpent: stats.totalSpent.toString(),
      averageCost:
        stats.totalWorkflows > 0
          ? Math.floor(stats.totalSpent / stats.totalWorkflows).toString()
          : "0",
    };
  }
}
