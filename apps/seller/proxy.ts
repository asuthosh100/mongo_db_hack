// proxy.ts
import { paymentProxy } from "@x402/next";
import { registerExactEvmScheme } from "@x402/evm/exact/server";
import { x402ResourceServer, HTTPFacilitatorClient } from "@x402/core/server";

const payTo = process.env.PAY_TO_ADDRESS!;

const facilitatorClient = new HTTPFacilitatorClient({
  url: process.env.FACILITATOR_URL || "https://x402.org/facilitator"
});

const server = new x402ResourceServer(facilitatorClient);
registerExactEvmScheme(server, { networks: ["eip155:84532"] });

const handler = paymentProxy(
  {
    "/api/protected": {
      accepts: [
        {
          scheme: "exact",
          price: "$0.01",
          network: "eip155:84532",
          payTo,
        },
      ],
      description: "Access to protected content",
      mimeType: "application/json",
    },
  },
  server,
);

export default async function proxy(req: import("next/server").NextRequest) {
  return handler(req);
}

export const config = {
  matcher: ["/api/protected/:path*"],
};