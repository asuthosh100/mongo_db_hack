// middleware.ts
import { paymentProxy } from "@x402/next";
import { registerExactEvmScheme } from "@x402/evm/exact/server";
import { x402ResourceServer, HTTPFacilitatorClient } from "@x402/core/server";

const payTo = "0xYourAddress";

const facilitatorClient = new HTTPFacilitatorClient({
  url: "https://x402.org/facilitator"
});

const server = new x402ResourceServer(facilitatorClient);
registerExactEvmScheme(server, { networks: ["eip155:84532"] });

export const middleware = paymentProxy(
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

export const config = {
  matcher: ["/api/protected/:path*"],
};