import { x402Client, wrapFetchWithPayment, x402HTTPClient } from "@x402/fetch";
import { registerExactEvmScheme } from "@x402/evm/exact/client";
import { CdpClient } from "@coinbase/cdp-sdk";
import { toAccount } from "viem/accounts";
import "dotenv/config";

async function main() {
  // CDP client reads creds from env (see env section below)
  const cdp = new CdpClient();

  // IMPORTANT: reuse the same account (don’t create a new one every run)
  const cdpAccount = await cdp.evm.getOrCreateAccount({ name: "x402-buyer" });

  // Wrap CDP account into a viem-compatible account/signer
  const signer = toAccount(cdpAccount);

  // x402 client + scheme registration
  const client = new x402Client();
  registerExactEvmScheme(client, { signer });

  // auto handles: 402 -> pay -> retry
  const fetchWithPayment = wrapFetchWithPayment(fetch, client);

  const response = await fetchWithPayment("http://localhost:3000/api/protected", { method: "GET" });
  const body = await response.json();
  console.log("Response:", body);

  if (response.ok) {
    const httpClient = new x402HTTPClient(client);
    const paymentResponse = httpClient.getPaymentSettleResponse((name: string) =>
      response.headers.get(name)
    );
    console.log("Payment settled:", paymentResponse);
  } else {
    console.log("HTTP status:", response.status);
  }
}

main().catch(console.error);
