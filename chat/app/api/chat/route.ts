import { streamText } from 'ai';

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return new Response('Invalid request: messages array required', {
        status: 400,
      });
    }

    // Mock implementation for testing without API keys
    // To use real AI responses, install a provider and uncomment:
    // import { openai } from '@ai-sdk/openai';
    // const result = await streamText({
    //   model: openai('gpt-4'),
    //   messages: messages,
    // });
    // return result.toDataStreamResponse();

    // Mock streaming response
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const mockResponse = `Hello! This is a mock response from the chat API using Vercel AI SDK. 

To use real AI responses:
1. Install a provider: npm install @ai-sdk/openai or @ai-sdk/anthropic
2. Set environment variable: OPENAI_API_KEY=your_key or ANTHROPIC_API_KEY=your_key
3. Uncomment the AI SDK provider code above

Your last message: "${messages[messages.length - 1]?.content || 'No message'}"`;

        const chunks = mockResponse.split(' ');
        for (const chunk of chunks) {
          controller.enqueue(encoder.encode(`0:"${chunk} "\n`));
          await new Promise(resolve => setTimeout(resolve, 50));
        }
        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
      },
    });

  } catch (error) {
    console.error('Chat API error:', error);
    return new Response('Internal server error', {
      status: 500,
    });
  }
}

