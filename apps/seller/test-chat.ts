import "dotenv/config";
import { ChatAgent } from "./lib/agent/chat-agent";
import { initializeIndexes } from "./lib/db";

async function main() {
  console.log("╔═══════════════════════════════════════════════════════════════╗");
  console.log("║      TESTING CHAT AGENT - CALL API & SHOW PAYMENT            ║");
  console.log("╚═══════════════════════════════════════════════════════════════╝\n");

  // Initialize
  await initializeIndexes();

  const agent = new ChatAgent({
    agentId: "chat-agent-test",
    walletName: "x402-buyer",
  });

  await agent.initialize();

  // Test prompts
  const prompts = [
    "What tools do I have available?",
    "Call the protected API at http://localhost:3000/api/protected",
    "Show me my payment history for this session",
  ];

  for (const prompt of prompts) {
    console.log("═══════════════════════════════════════════════════════════════");
    console.log(`\x1b[36mUser:\x1b[0m ${prompt}\n`);

    const response = await agent.chat(prompt);

    console.log(`\x1b[32mAgent:\x1b[0m ${response}\n`);
  }

  await agent.endSession();
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("Test complete!");
  process.exit(0);
}

main().catch(console.error);
