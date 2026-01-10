import { NextRequest, NextResponse } from "next/server";
import { ChatAgent } from "@/lib/agent/chat-agent";
import { initializeIndexes } from "@/lib/db";

// Store agent instances per session
const agents = new Map<string, ChatAgent>();

// Initialize database on first request
let dbInitialized = false;

async function ensureDbInitialized() {
  if (!dbInitialized) {
    await initializeIndexes();
    dbInitialized = true;
  }
}

async function getOrCreateAgent(sessionId: string): Promise<ChatAgent> {
  if (!agents.has(sessionId)) {
    const agent = new ChatAgent({
      agentId: `web-agent-${sessionId}`,
      walletName: "x402-buyer",
    });
    await agent.initialize();
    agents.set(sessionId, agent);
  }
  return agents.get(sessionId)!;
}

export async function POST(request: NextRequest) {
  try {
    await ensureDbInitialized();

    const body = await request.json();
    const { message, sessionId } = body;

    if (!message || !sessionId) {
      return NextResponse.json(
        { error: "Message and sessionId are required" },
        { status: 400 }
      );
    }

    const agent = await getOrCreateAgent(sessionId);
    const response = await agent.chat(message);

    // Get latest payment if any
    const history = await agent.getHistory();

    return NextResponse.json({
      response,
      messageCount: history.length,
    });
  } catch (error) {
    console.error("Chat error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Chat failed" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get("sessionId");

    if (sessionId && agents.has(sessionId)) {
      const agent = agents.get(sessionId)!;
      await agent.endSession();
      agents.delete(sessionId);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to end session" },
      { status: 500 }
    );
  }
}
