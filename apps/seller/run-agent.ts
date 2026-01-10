import "dotenv/config";
import { DemandAgent } from "./lib/agent";
import { initializeIndexes } from "./lib/db";

async function main() {
  console.log("╔═══════════════════════════════════════════════════════════════╗");
  console.log("║           x402 DEMAND-SIDE AGENT WITH MONGODB                ║");
  console.log("╚═══════════════════════════════════════════════════════════════╝\n");

  // Initialize database indexes
  console.log("[Setup] Initializing MongoDB indexes...");
  await initializeIndexes();
  console.log("[Setup] Database ready\n");

  // Create agent
  const agent = new DemandAgent({
    agentId: "demand-agent-001",
    walletName: "x402-buyer",  // Use the funded wallet
    budgetLimits: {
      maxPerTransaction: "100000",    // $0.10 max per call
      maxPerSession: "1000000",       // $1.00 max per session
      maxDaily: "10000000",           // $10 max per day
      maxTotal: "100000000",          // $100 lifetime max
    },
    knownEndpoints: [
      {
        url: "http://localhost:3000/api/protected",
        name: "Local Protected API",
        description: "Local x402 test endpoint - returns sample paid data",
        pricing: {
          amount: "10000",            // $0.01
          currency: "USDC",
          network: "base-sepolia",
          payTo: "0x1F5bf14f574bAED7E6C0dec947295f9fF3f9bA12",
        },
      },
    ],
  });

  // Initialize with intent
  await agent.initialize("Call a protected x402 API and persist results to MongoDB");

  // Execute workflow: discover -> select -> call -> persist
  console.log("═══════════════════════════════════════════════════════════════");
  console.log(" EXECUTING WORKFLOW");
  console.log("═══════════════════════════════════════════════════════════════\n");

  const result = await agent.executeSimpleWorkflow();

  // Display results
  console.log("\n═══════════════════════════════════════════════════════════════");
  console.log(" RESULTS");
  console.log("═══════════════════════════════════════════════════════════════\n");

  if (result.success) {
    console.log("✓ Workflow completed successfully!\n");
    console.log("Response Data:");
    console.log(JSON.stringify(result.data, null, 2));

    if (result.txHash) {
      console.log(`\nPayment Transaction: ${result.txHash}`);
      console.log(`View on BaseScan: https://sepolia.basescan.org/tx/${result.txHash}`);
    }
  } else {
    console.log("✗ Workflow failed\n");
    console.log(`Error: ${result.error}`);
  }

  // Get history from MongoDB
  console.log("\n═══════════════════════════════════════════════════════════════");
  console.log(" MONGODB RECORDS");
  console.log("═══════════════════════════════════════════════════════════════\n");

  const history = await agent.getHistory();

  console.log("Reasoning History:");
  for (const step of history.reasoning) {
    console.log(`  [${step.timestamp.toISOString()}]`);
    console.log(`    Thought: ${step.thought}`);
    if (step.action) console.log(`    Action: ${step.action}`);
    if (step.observation) console.log(`    Observation: ${step.observation}`);
  }

  console.log("\nPayment Records:");
  for (const payment of history.payments) {
    console.log(`  - Payment ID: ${payment.paymentId}`);
    console.log(`    Amount: ${payment.amount} ${payment.currency}`);
    console.log(`    Status: ${payment.status}`);
    console.log(`    Tool: ${payment.toolEndpoint}`);
    if (payment.txHash) console.log(`    TxHash: ${payment.txHash}`);
  }

  console.log("\nBudget State:");
  if (history.budget) {
    console.log(`  Wallet: ${history.budget.walletAddress}`);
    console.log(`  Session Spend: ${history.budget.spent.currentSession}`);
    console.log(`  Daily Spend: ${history.budget.spent.today}`);
    console.log(`  Total Spend: ${history.budget.spent.total}`);
    console.log(`  Limits:`);
    console.log(`    Per Transaction: ${history.budget.limits.maxPerTransaction}`);
    console.log(`    Per Session: ${history.budget.limits.maxPerSession}`);
    console.log(`    Daily: ${history.budget.limits.maxDaily}`);
  }

  console.log("\n═══════════════════════════════════════════════════════════════");
  console.log(" DONE");
  console.log("═══════════════════════════════════════════════════════════════\n");

  process.exit(0);
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
