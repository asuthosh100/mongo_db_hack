// import { x402Client, wrapFetchWithPayment, x402HTTPClient } from "@x402/fetch";
// import { registerExactEvmScheme } from "@x402/evm/exact/client";
// import { CdpClient } from "@coinbase/cdp-sdk";
// import { toAccount } from "viem/accounts";
// import "dotenv/config";

// async function main() {
//   // CDP client reads creds from env (see env section below)
//   const cdp = new CdpClient();

//   // IMPORTANT: reuse the same account (don’t create a new one every run)
//   const cdpAccount = await cdp.evm.getOrCreateAccount({ name: "x402-buyer" });

//   // Wrap CDP account into a viem-compatible account/signer
//   const signer = toAccount(cdpAccount);

//   // x402 client + scheme registration
//   const client = new x402Client();
//   registerExactEvmScheme(client, { signer });

//   // auto handles: 402 -> pay -> retry
//   const fetchWithPayment = wrapFetchWithPayment(fetch, client);

//   const response = await fetchWithPayment("http://localhost:3000/api/protected", { method: "GET" });
//   const body = await response.json();
//   console.log("Response:", body);

//   if (response.ok) {
//     const httpClient = new x402HTTPClient(client);
//     const paymentResponse = httpClient.getPaymentSettleResponse((name: string) =>
//       response.headers.get(name)
//     );
//     console.log("Payment settled:", paymentResponse);
//   } else {
//     console.log("HTTP status:", response.status);
//   }
// }

// main().catch(console.error);


import "dotenv/config";

import { HTTPFacilitatorClient } from "@x402/core/http";
import { withBazaar } from "@x402/extensions/bazaar";
import { x402Client, wrapFetchWithPayment, x402HTTPClient } from "@x402/fetch";
import { registerExactEvmScheme } from "@x402/evm/exact/client";

import { CdpClient } from "@coinbase/cdp-sdk";
import { toAccount } from "viem/accounts";

// Known x402 endpoints (our own registry until Bazaar is live)
const KNOWN_ENDPOINTS = [
  {
    url: "http://localhost:3000/api/protected",
    name: "Local Protected API",
    description: "Local x402 test endpoint",
  },
];

interface DiscoveredService {
  url: string;
  name?: string;
  description?: string;
  metadata?: Record<string, unknown>;
}

async function discoverServices(): Promise<DiscoveredService[]> {
  // Try Bazaar discovery first
  try {
    const facilitatorClient = withBazaar(
      new HTTPFacilitatorClient({ url: "https://x402.org/facilitator" })
    );

    const discovery = await facilitatorClient.extensions.discovery.listResources({
      type: "http",
      limit: 20,
      offset: 0,
    });

    if (discovery.resources.length > 0) {
      console.log(`✓ Bazaar: Found ${discovery.resources.length} services`);
      return discovery.resources.map((r) => ({
        url: r.url,
        metadata: r.metadata,
      }));
    }
  } catch (error) {
    console.log("⚠ Bazaar not available, using known endpoints");
  }

  // Fall back to known endpoints
  return KNOWN_ENDPOINTS;
}

async function main() {
  console.log("=== x402 Demand-Side Agent ===\n");

  // 1) Discover available services
  console.log("1. Discovering services...");
  const services = await discoverServices();

  console.log(`\n   Found ${services.length} service(s):`);
  for (const svc of services) {
    console.log(`   - ${svc.name || svc.url}`);
    if (svc.description) console.log(`     ${svc.description}`);
  }

  // 2) Select a service
  const selectedService = services[0];
  if (!selectedService?.url) {
    throw new Error("No service URL found");
  }
  console.log(`\n2. Selected: ${selectedService.url}`);

  // 3) Initialize CDP wallet
  console.log("\n3. Initializing CDP wallet...");
  const cdp = new CdpClient();
  const cdpAccount = await cdp.evm.getOrCreateAccount({ name: "x402-buyer" });
  const signer = toAccount(cdpAccount);
  console.log(`   Wallet: ${cdpAccount.address}`);

  // 4) Setup x402 payment client
  console.log("\n4. Setting up x402 payment client...");
  const client = new x402Client();
  registerExactEvmScheme(client, { signer });
  const fetchWithPayment = wrapFetchWithPayment(fetch, client);

  // 5) Call the service (x402 handles 402 -> pay -> retry)
  console.log("\n5. Calling protected endpoint...");
  console.log("   (x402 will handle payment if 402 is returned)\n");

  const response = await fetchWithPayment(selectedService.url, { method: "GET" });

  const text = await response.text();
  console.log(`   HTTP Status: ${response.status}`);
  console.log(`   Response:`, tryJson(text));

  // 6) Check for payment receipt
  if (response.ok) {
    const httpClient = new x402HTTPClient(client);
    const receipt = httpClient.getPaymentSettleResponse((name: string) =>
      response.headers.get(name)
    );
    if (receipt) {
      console.log("\n6. Payment Receipt:");
      console.log(`   ${JSON.stringify(receipt, null, 2)}`);
    }
  } else {
    console.log(`\n⚠ Request failed with status ${response.status}`);
  }

  console.log("\n=== Done ===");
}

function tryJson(s: string) {
  try {
    return JSON.parse(s);
  } catch {
    return s;
  }
}

main().catch(console.error);
