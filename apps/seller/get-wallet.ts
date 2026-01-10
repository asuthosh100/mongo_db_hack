import { CdpClient } from "@coinbase/cdp-sdk";
import "dotenv/config";

async function main() {
  const cdp = new CdpClient();
  const account = await cdp.evm.getOrCreateAccount({ name: "x402-buyer" });
  console.log("Buyer wallet address:", account.address);
  console.log("\nFund this address with USDC on Base Sepolia:");
  console.log("https://faucet.circle.com/");
}

main().catch(console.error);
