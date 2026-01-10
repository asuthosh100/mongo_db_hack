# x402 AI Agent

A demand-side AI agent with persistent MongoDB memory and automatic x402 micropayments for paid APIs.

```
 ██╗  ██╗██╗  ██╗ ██████╗ ██████╗
 ╚██╗██╔╝██║  ██║██╔═████╗╚════██╗
  ╚███╔╝ ███████║██║██╔██║ █████╔╝
  ██╔██╗ ╚════██║████╔╝██║██╔═══╝
 ██╔╝ ██╗     ██║╚██████╔╝███████╗
 ╚═╝  ╚═╝     ╚═╝ ╚═════╝ ╚══════╝
```

## Overview

This project implements a **demand-side AI agent** that can:

- **Discover and call paid APIs** using the x402 payment protocol
- **Persist memory** across sessions using MongoDB Atlas
- **Manage budgets** with configurable spending limits
- **Execute tool calls** through natural language via Fireworks LLM

Built for the MongoDB Hackathon demonstrating AI agents with persistent state and blockchain micropayments.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                           FRONTEND                                  │
│  ┌─────────────────┐    ┌─────────────────┐                        │
│  │   Landing Page  │    │   Chat Interface │                        │
│  │   (page.tsx)    │───▶│   (/chat)        │                        │
│  └─────────────────┘    └────────┬─────────┘                        │
│                                  │                                  │
├──────────────────────────────────┼──────────────────────────────────┤
│                           API LAYER                                 │
│                                  ▼                                  │
│                         ┌─────────────────┐                         │
│                         │  POST /api/chat │                         │
│                         └────────┬────────┘                         │
│                                  │                                  │
├──────────────────────────────────┼──────────────────────────────────┤
│                           AGENT CORE                                │
│                                  ▼                                  │
│                         ┌─────────────────┐                         │
│                         │   ChatAgent     │                         │
│                         │                 │                         │
│                         │ • LLM (Fireworks)                         │
│                         │ • Tool Executor │                         │
│                         │ • x402 Client   │                         │
│                         │ • CDP Wallet    │                         │
│                         └────────┬────────┘                         │
│                                  │                                  │
│         ┌────────────────────────┼────────────────────────┐         │
│         ▼                        ▼                        ▼         │
│  ┌─────────────┐         ┌─────────────┐         ┌─────────────┐   │
│  │  MongoDB    │         │  Fireworks  │         │    x402     │   │
│  │  Services   │         │  LLM API    │         │  Payments   │   │
│  │             │         │             │         │             │   │
│  │ • Memory    │         │ Llama 3.3   │         │ • Proxy     │   │
│  │ • Tools     │         │ 70B Instruct│         │ • CDP Wallet│   │
│  │ • Payments  │         │             │         │ • USDC      │   │
│  │ • Budget    │         └─────────────┘         └─────────────┘   │
│  │ • Workflows │                                                    │
│  └─────────────┘                                                    │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Tech Stack

| Component | Technology |
|-----------|------------|
| Frontend | Next.js 16 (App Router) |
| Styling | CSS-in-JS (styled-jsx) |
| Database | MongoDB Atlas |
| LLM | Fireworks AI (Llama 3.3 70B) |
| Payments | x402 Protocol |
| Wallet | Coinbase Developer Platform (CDP) |
| Network | Base Sepolia (Testnet) |
| Currency | USDC |

---

## Prerequisites

- **Node.js** 18.0 or higher
- **npm** or **yarn**
- **MongoDB Atlas** account (free tier works)
- **Fireworks AI** API key
- **Coinbase CDP** credentials

---

## Environment Variables

Create a `.env` file in the project root:

```env
# x402 Seller Configuration (for protected API)
PAY_TO_ADDRESS=0xYourWalletAddress
FACILITATOR_URL=https://x402.org/facilitator

# CDP Wallet (Coinbase Developer Platform)
CDP_API_KEY_ID=your-cdp-api-key-id
CDP_API_KEY_SECRET=your-cdp-api-key-secret
CDP_WALLET_SECRET=your-cdp-wallet-secret

# MongoDB Atlas
MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/?appName=YourApp
MONGODB_DB_NAME=x402_agent

# Fireworks AI
FIREWORKS_API_KEY=fw_your_api_key
```

### Getting Credentials

1. **MongoDB Atlas**: Sign up at [mongodb.com/atlas](https://mongodb.com/atlas), create a cluster, and get the connection string.

2. **Fireworks AI**: Sign up at [fireworks.ai](https://fireworks.ai), go to API Keys, and create a new key.

3. **CDP Wallet**: Sign up at [portal.cdp.coinbase.com](https://portal.cdp.coinbase.com), create a project, and generate API credentials.

---

## Installation

```bash
# Navigate to the project
cd apps/seller

# Install dependencies
npm install

# Start development server
npm run dev
```

The app will be available at:
- **Home**: http://localhost:3000
- **Chat**: http://localhost:3000/chat

---

## Project Structure

```
apps/seller/
├── app/                          # Next.js App Router
│   ├── layout.tsx                # Root layout with fonts
│   ├── page.tsx                  # Landing page (terminal UI)
│   ├── chat/
│   │   └── page.tsx              # Chat interface
│   └── api/
│       ├── chat/
│       │   └── route.ts          # Chat API endpoint
│       ├── protected/
│       │   └── route.ts          # x402 protected endpoint
│       └── db/
│           └── init/
│               └── route.ts      # Database initialization
│
├── lib/                          # Core libraries
│   ├── mongodb.ts                # MongoDB connection
│   ├── agent/
│   │   ├── chat-agent.ts         # Main ChatAgent class
│   │   ├── llm-tools.ts          # Tool definitions & executor
│   │   └── demand-agent.ts       # Base demand agent
│   └── db/
│       ├── types.ts              # TypeScript interfaces
│       ├── collections.ts        # Collection getters
│       └── services/
│           ├── agent-memory.service.ts
│           ├── tool-registry.service.ts
│           ├── payment.service.ts
│           ├── budget.service.ts
│           └── workflow.service.ts
│
├── proxy.ts                      # x402 payment middleware
├── chat.ts                       # CLI chat interface
├── .env                          # Environment variables
└── package.json
```

---

## MongoDB Schema

### Collections

#### `agent_memory`
Stores agent reasoning history and session state.

```typescript
{
  agentId: string;
  sessionId: string;
  sessionStartedAt: Date;
  sessionEndedAt?: Date;
  isActive: boolean;
  reasoningHistory: {
    timestamp: Date;
    type: "user_input" | "agent_decision" | "tool_result" | "error";
    content: string;
    metadata?: Record<string, unknown>;
  }[];
  state: {
    currentGoal?: string;
    lastAction?: string;
    context: Record<string, unknown>;
  };
  shortTermMemory: {
    key: string;
    value: unknown;
    expiresAt?: Date;
  }[];
}
```

#### `tool_registry`
Catalog of available x402 paid APIs.

```typescript
{
  toolId: string;
  name: string;
  description: string;
  endpoint: string;
  method: "GET" | "POST" | "PUT" | "DELETE";
  pricing: {
    amount: string;      // Base units (e.g., "10000" = $0.01)
    currency: string;    // "USDC"
    network: string;     // "base-sepolia"
    payTo: string;       // Recipient wallet address
  };
  stats: {
    totalCalls: number;
    successfulCalls: number;
    failedCalls: number;
    totalSpent: string;
    averageLatencyMs: number;
  };
  isActive: boolean;
}
```

#### `payment_history`
Record of all x402 payments made.

```typescript
{
  paymentId: string;
  agentId: string;
  sessionId: string;
  toolId: string;
  toolEndpoint: string;
  amount: string;
  currency: string;
  network: string;
  status: "pending" | "completed" | "failed";
  fromAddress: string;
  toAddress: string;
  txHash?: string;
  initiatedAt: Date;
  completedAt?: Date;
  error?: string;
}
```

#### `budget_state`
Agent spending limits and tracking.

```typescript
{
  agentId: string;
  walletAddress: string;
  limits: {
    maxPerTransaction: string;
    maxPerSession: string;
    maxDaily: string;
    maxTotal: string;
  };
  spent: {
    session: string;
    daily: string;
    total: string;
  };
  balance: string;
  reserved: string;
  lastResetDaily: Date;
}
```

---

## x402 Payment Flow

```
User Request: "Call the protected API"
                    │
                    ▼
┌──────────────────────────────────────┐
│  1. ChatAgent receives message       │
│     - Parses intent                  │
│     - Identifies tool: call_paid_api │
└──────────────────────────────────────┘
                    │
                    ▼
┌──────────────────────────────────────┐
│  2. Budget Check                     │
│     - BudgetService.canSpend()       │
│     - Reserve funds if approved      │
└──────────────────────────────────────┘
                    │
                    ▼
┌──────────────────────────────────────┐
│  3. Make x402 Request                │
│     - fetchWithPayment(url)          │
│     - Receives 402 Payment Required  │
└──────────────────────────────────────┘
                    │
                    ▼
┌──────────────────────────────────────┐
│  4. x402 Client Handles Payment      │
│     - Parses payment requirements    │
│     - Signs with CDP wallet          │
│     - Sends USDC on Base Sepolia     │
└──────────────────────────────────────┘
                    │
                    ▼
┌──────────────────────────────────────┐
│  5. Retry with Payment Header        │
│     - X-PAYMENT header attached      │
│     - Server validates payment       │
│     - Returns protected content      │
└──────────────────────────────────────┘
                    │
                    ▼
┌──────────────────────────────────────┐
│  6. Record & Respond                 │
│     - PaymentService.completePayment │
│     - BudgetService.recordSpend      │
│     - Store in MongoDB               │
│     - Return response to user        │
└──────────────────────────────────────┘
```

---

## Available Tools

The agent has access to these tools via natural language:

### Memory Tools
| Tool | Description |
|------|-------------|
| `get_recent_memory` | Retrieve recent memory entries |
| `get_reasoning_history` | Get full reasoning history |
| `add_memory` | Store new information |

### Tool Registry
| Tool | Description |
|------|-------------|
| `search_tools` | Search available paid APIs |
| `get_all_tools` | List all registered tools |
| `get_tool_stats` | Get usage statistics |

### Payment Tools
| Tool | Description |
|------|-------------|
| `get_payment_history` | View recent payments |
| `get_session_payments` | Payments in current session |

### Budget Tools
| Tool | Description |
|------|-------------|
| `get_budget` | View current budget state |
| `check_can_spend` | Check if amount is within budget |
| `get_remaining_budget` | See remaining limits |

### Execution
| Tool | Description |
|------|-------------|
| `call_paid_api` | Execute x402 payment and call API |

---

## Usage Examples

### In the Chat Interface

```
> What tools do I have?
# Lists all registered x402 APIs

> What's my budget?
# Shows spending limits and current balance

> Call the protected API
# Makes x402 payment and returns API response

> Show my payment history
# Displays all payments with transaction hashes
```

### CLI Mode

```bash
# Run the CLI chat
npx ts-node chat.ts
```

---

## API Endpoints

### POST /api/chat

Send a message to the agent.

**Request:**
```json
{
  "message": "What tools do I have?",
  "sessionId": "uuid-v4-session-id"
}
```

**Response:**
```json
{
  "response": "You have access to the following tools:\n\n1. Local Protected API..."
}
```

### GET /api/protected

x402-protected endpoint (requires payment).

**Without Payment:**
```
HTTP 402 Payment Required
X-PAYMENT: {"accepts":[{"scheme":"exact","price":"$0.01",...}]}
```

**With Valid Payment:**
```json
{
  "data": "Your paid API response."
}
```

---

## Development

### Adding New Tools

1. Register the tool in `lib/agent/chat-agent.ts` under `registerKnownTools()`:

```typescript
await ToolRegistryService.registerTool({
  toolId: "my-new-api",
  name: "My New API",
  description: "Description of what it does",
  endpoint: "https://api.example.com/endpoint",
  pricing: {
    amount: "10000",  // $0.01 in base units
    currency: "USDC",
    network: "base-sepolia",
    payTo: "0x...",
  },
  isActive: true,
});
```

2. Update the system prompt to inform the LLM about the new tool.

### Adding New Database Collections

1. Define types in `lib/db/types.ts`
2. Add collection getter in `lib/db/collections.ts`
3. Create service in `lib/db/services/`
4. Initialize indexes in `lib/db/index.ts`

---

## Troubleshooting

### "Budget exceeded" Error
- Check `BudgetService.updateBalance()` is called during initialization
- Verify wallet has sufficient USDC on Base Sepolia

### "Tool not found" Error
- Ensure tools are registered via `ToolRegistryService.registerTool()`
- Check the tool is active (`isActive: true`)

### x402 Payment Fails
- Verify CDP credentials in `.env`
- Check wallet has USDC: https://sepolia.basescan.org/address/YOUR_WALLET
- Get testnet USDC from faucets

### MongoDB Connection Issues
- Verify `MONGODB_URI` is correct
- Check IP whitelist in MongoDB Atlas
- Ensure network connectivity

---

## Faucets & Resources

- **Base Sepolia ETH**: https://www.coinbase.com/faucets/base-ethereum-sepolia-faucet
- **Base Sepolia USDC**: Bridge from Sepolia or use CDP funding
- **x402 Documentation**: https://x402.org/docs
- **CDP Documentation**: https://docs.cdp.coinbase.com

---

## License

MIT

---

## Acknowledgments

Built for the MongoDB Hackathon demonstrating:
- AI agents with persistent memory
- x402 payment protocol integration
- Coinbase Developer Platform wallets
- Fireworks AI for LLM inference
