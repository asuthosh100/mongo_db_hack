"use client";

import { useState, useRef, useEffect } from "react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId] = useState(() => crypto.randomUUID());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    setMessages([
      {
        id: "welcome",
        role: "assistant",
        content:
          "Hello! I'm your x402 AI Agent. I can help you discover and call paid APIs, manage your budget, and remember important information.\n\nTry asking:\n  > What tools do I have?\n  > What's my budget?\n  > Call the protected API\n  > Show my payment history",
        timestamp: new Date(),
      },
    ]);
  }, []);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMessage.content,
          sessionId,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        const assistantMessage: Message = {
          id: crypto.randomUUID(),
          role: "assistant",
          content: data.response,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, assistantMessage]);
      } else {
        const errorMessage: Message = {
          id: crypto.randomUUID(),
          role: "assistant",
          content: `[ERROR] ${data.error}`,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, errorMessage]);
      }
    } catch (error) {
      const errorMessage: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: `[CONNECTION ERROR] ${error instanceof Error ? error.message : "Unknown error"}`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      textareaRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="chat-container">
      {/* Header */}
      <header className="chat-header">
        <div className="header-content">
          <div className="logo">
            <span className="logo-symbol">[</span>
            <span className="logo-text">x402</span>
            <span className="logo-symbol">]</span>
            <span className="logo-label">agent</span>
          </div>
          <div className="header-meta">
            <span className="meta-item">
              <span className="meta-dot active"></span>
              online
            </span>
            <span className="meta-divider">|</span>
            <span className="meta-item mono">{sessionId.slice(0, 8)}</span>
          </div>
        </div>
      </header>

      {/* Messages */}
      <main className="messages-container">
        <div className="messages">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`message ${message.role === "user" ? "user-message" : "assistant-message"}`}
            >
              <div className="message-header">
                <span className="message-role">
                  {message.role === "user" ? "you" : "x402"}
                </span>
                <span className="message-time">
                  {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <div className="message-body">
                {message.content}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="message assistant-message">
              <div className="message-header">
                <span className="message-role">x402</span>
              </div>
              <div className="message-body">
                <span className="thinking">
                  <span className="cursor">_</span> thinking
                  <span className="dots">
                    <span>.</span><span>.</span><span>.</span>
                  </span>
                </span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </main>

      {/* Input */}
      <footer className="input-container">
        <div className="input-wrapper">
          <span className="input-prompt">&gt;</span>
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Enter message..."
            disabled={isLoading}
            className="chat-input"
            rows={1}
          />
          <button
            onClick={sendMessage}
            disabled={isLoading || !input.trim()}
            className="send-button"
          >
            {isLoading ? "..." : "run"}
          </button>
        </div>
        <div className="input-hint">
          enter to send | shift+enter for newline | base sepolia usdc
        </div>
      </footer>

      <style jsx>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&display=swap');

        .chat-container {
          display: flex;
          flex-direction: column;
          height: 100vh;
          background: #0d0d0d;
          color: #e0e0e0;
          font-family: 'JetBrains Mono', 'Fira Code', 'SF Mono', 'Consolas', monospace;
          font-size: 14px;
          line-height: 1.6;
        }

        .chat-header {
          background: #0d0d0d;
          border-bottom: 1px solid #1a1a1a;
          padding: 16px 24px;
        }

        .header-content {
          display: flex;
          justify-content: space-between;
          align-items: center;
          max-width: 800px;
          margin: 0 auto;
        }

        .logo {
          display: flex;
          align-items: center;
          gap: 2px;
        }

        .logo-symbol {
          color: #00ff9f;
          font-weight: 600;
        }

        .logo-text {
          color: #00ff9f;
          font-weight: 700;
          font-size: 16px;
        }

        .logo-label {
          color: #666;
          margin-left: 8px;
          font-size: 14px;
        }

        .header-meta {
          display: flex;
          align-items: center;
          gap: 12px;
          color: #666;
          font-size: 12px;
        }

        .meta-item {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .meta-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #333;
        }

        .meta-dot.active {
          background: #00ff9f;
          box-shadow: 0 0 8px #00ff9f;
        }

        .meta-divider {
          color: #333;
        }

        .mono {
          font-family: inherit;
          color: #555;
        }

        .messages-container {
          flex: 1;
          overflow-y: auto;
          padding: 24px;
        }

        .messages-container::-webkit-scrollbar {
          width: 6px;
        }

        .messages-container::-webkit-scrollbar-track {
          background: #0d0d0d;
        }

        .messages-container::-webkit-scrollbar-thumb {
          background: #222;
          border-radius: 3px;
        }

        .messages {
          max-width: 800px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .message {
          animation: fadeIn 0.2s ease;
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .message-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 8px;
        }

        .message-role {
          font-weight: 600;
          font-size: 13px;
          text-transform: lowercase;
        }

        .user-message .message-role {
          color: #888;
        }

        .assistant-message .message-role {
          color: #00ff9f;
        }

        .message-time {
          font-size: 11px;
          color: #444;
        }

        .message-body {
          color: #ccc;
          white-space: pre-wrap;
          word-break: break-word;
          padding-left: 0;
          border-left: 2px solid transparent;
          padding-left: 12px;
        }

        .user-message .message-body {
          border-left-color: #333;
          color: #999;
        }

        .assistant-message .message-body {
          border-left-color: #00ff9f33;
          color: #e0e0e0;
        }

        .thinking {
          color: #666;
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .cursor {
          color: #00ff9f;
          animation: blink 1s step-end infinite;
        }

        @keyframes blink {
          50% { opacity: 0; }
        }

        .dots span {
          animation: dotFade 1.4s ease-in-out infinite;
        }

        .dots span:nth-child(2) {
          animation-delay: 0.2s;
        }

        .dots span:nth-child(3) {
          animation-delay: 0.4s;
        }

        @keyframes dotFade {
          0%, 60%, 100% { opacity: 0.3; }
          30% { opacity: 1; }
        }

        .input-container {
          background: #0d0d0d;
          border-top: 1px solid #1a1a1a;
          padding: 16px 24px;
        }

        .input-wrapper {
          max-width: 800px;
          margin: 0 auto;
          display: flex;
          align-items: flex-start;
          gap: 12px;
          background: #111;
          border: 1px solid #222;
          border-radius: 8px;
          padding: 12px 16px;
          transition: border-color 0.2s;
        }

        .input-wrapper:focus-within {
          border-color: #00ff9f44;
        }

        .input-prompt {
          color: #00ff9f;
          font-weight: 600;
          line-height: 24px;
          user-select: none;
        }

        .chat-input {
          flex: 1;
          background: transparent;
          border: none;
          color: #e0e0e0;
          font-family: inherit;
          font-size: 14px;
          line-height: 24px;
          outline: none;
          resize: none;
          min-height: 24px;
          max-height: 120px;
        }

        .chat-input::placeholder {
          color: #444;
        }

        .chat-input:disabled {
          opacity: 0.5;
        }

        .send-button {
          background: #1a1a1a;
          color: #00ff9f;
          border: 1px solid #00ff9f33;
          border-radius: 4px;
          padding: 4px 12px;
          font-family: inherit;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          text-transform: lowercase;
        }

        .send-button:hover:not(:disabled) {
          background: #00ff9f11;
          border-color: #00ff9f66;
        }

        .send-button:disabled {
          opacity: 0.3;
          cursor: not-allowed;
        }

        .input-hint {
          max-width: 800px;
          margin: 8px auto 0;
          font-size: 11px;
          color: #333;
          text-align: center;
          text-transform: lowercase;
        }
      `}</style>
    </div>
  );
}
