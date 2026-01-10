import "dotenv/config";
import * as readline from "readline";
import { ChatAgent } from "./lib/agent/chat-agent";
import { initializeIndexes } from "./lib/db";

async function main() {
  console.log("╔═══════════════════════════════════════════════════════════════╗");
  console.log("║         x402 CHAT AGENT WITH MONGODB MEMORY                  ║");
  console.log("╚═══════════════════════════════════════════════════════════════╝\n");

  // Initialize database
  console.log("[Setup] Initializing MongoDB...");
  await initializeIndexes();

  // Create and initialize chat agent
  const agent = new ChatAgent({
    agentId: "chat-agent-001",
    walletName: "x402-buyer", // Use the funded wallet
  });

  await agent.initialize();

  console.log("═══════════════════════════════════════════════════════════════");
  console.log(" CHAT STARTED - Type 'exit' to quit, 'clear' to clear history");
  console.log("═══════════════════════════════════════════════════════════════\n");

  // Setup readline interface
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const prompt = () => {
    rl.question("\n\x1b[36mYou:\x1b[0m ", async (input) => {
      const trimmedInput = input.trim();

      if (!trimmedInput) {
        prompt();
        return;
      }

      if (trimmedInput.toLowerCase() === "exit") {
        console.log("\n[ChatAgent] Ending session...");
        await agent.endSession();
        console.log("Goodbye!\n");
        rl.close();
        process.exit(0);
      }

      if (trimmedInput.toLowerCase() === "clear") {
        agent.clearHistory();
        console.log("[ChatAgent] Conversation history cleared");
        prompt();
        return;
      }

      try {
        console.log("\n\x1b[33m[Thinking...]\x1b[0m");
        const response = await agent.chat(trimmedInput);
        console.log(`\n\x1b[32mAgent:\x1b[0m ${response}`);
      } catch (error) {
        console.error(
          "\x1b[31mError:\x1b[0m",
          error instanceof Error ? error.message : error
        );
      }

      prompt();
    });
  };

  // Handle Ctrl+C gracefully
  rl.on("close", async () => {
    await agent.endSession();
    process.exit(0);
  });

  prompt();
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
