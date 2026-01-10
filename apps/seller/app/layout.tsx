import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "[x402] agent",
  description:
    "AI agent with MongoDB memory and x402 payments. Discover and call paid APIs with natural language.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet" />
        <style>{`
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body {
            min-height: 100vh;
            background: #0d0d0d;
            font-family: 'JetBrains Mono', 'Fira Code', 'SF Mono', 'Consolas', monospace;
          }
          ::selection {
            background: #00ff9f33;
            color: #00ff9f;
          }
        `}</style>
      </head>
      <body>{children}</body>
    </html>
  );
}
