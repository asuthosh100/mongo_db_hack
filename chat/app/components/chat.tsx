'use client';

import { useChat } from '@ai-sdk/react';
import { useState, useEffect } from 'react';

export function Chat() {
  const [input, setInput] = useState('');
  
  // useChat without options - will need to handle API endpoint in sendMessage
  const { messages, sendMessage, status } = useChat();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (input.trim() && status === 'ready') {
      try {
        // Use sendMessage from the hook
        await sendMessage({
          role: 'user',
          parts: [{ type: 'text', text: input }],
        });
        setInput('');
      } catch (error) {
        console.error('Error sending message:', error);
      }
    }
  };

  const isLoading = status === 'streaming' || status === 'submitted';

  return (
    <div className="flex flex-col h-screen max-w-4xl mx-auto bg-white dark:bg-black">
      {/* Chat Header */}
      <div className="border-b border-gray-200 dark:border-gray-800 p-4">
        <h1 className="text-2xl font-semibold text-black dark:text-zinc-50">
          Chat
        </h1>
      </div>

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex items-center justify-center h-full text-center">
            <div className="max-w-md">
              <h2 className="text-xl font-semibold text-black dark:text-zinc-50 mb-2">
                Start a conversation
              </h2>
              <p className="text-zinc-600 dark:text-zinc-400">
                Type a message below to begin chatting with the AI.
              </p>
            </div>
          </div>
        )}

        {messages.map((message) => {
          const content = message.parts
            ?.filter((part: any) => part.type === 'text')
            .map((part: any) => part.text)
            .join('') || '';
          
          return (
            <div
              key={message.id}
              className={`flex ${
                message.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              <div
                className={`max-w-[80%] rounded-lg px-4 py-2 ${
                  message.role === 'user'
                    ? 'bg-black text-white dark:bg-white dark:text-black'
                    : 'bg-gray-100 text-black dark:bg-gray-800 dark:text-zinc-50'
                }`}
              >
                <div className="text-sm font-medium mb-1 opacity-70">
                  {message.role === 'user' ? 'You' : 'Assistant'}
                </div>
                <div className="whitespace-pre-wrap">{content}</div>
              </div>
            </div>
          );
        })}

        {isLoading && (
          <div className="flex justify-start">
            <div className="max-w-[80%] rounded-lg px-4 py-2 bg-gray-100 text-black dark:bg-gray-800 dark:text-zinc-50">
              <div className="flex items-center space-x-2">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div 
                    className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" 
                    style={{ animationDelay: '0.1s' }}
                  ></div>
                  <div 
                    className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" 
                    style={{ animationDelay: '0.2s' }}
                  ></div>
                </div>
                <span className="text-sm text-gray-500">Thinking...</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input Form */}
      <div className="border-t border-gray-200 dark:border-gray-800 p-4">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message..."
            disabled={isLoading}
            className="flex-1 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-black px-4 py-2 text-black dark:text-zinc-50 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white"
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="px-6 py-2 rounded-lg bg-black text-white dark:bg-white dark:text-black font-medium transition-colors hover:bg-gray-800 dark:hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
}

