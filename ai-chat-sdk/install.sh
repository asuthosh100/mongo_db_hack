#!/bin/bash
# Install packages for ai-chat-sdk

echo "=========================================="
echo "Installing packages for ai-chatbot"
echo "=========================================="
echo ""

cd "$(dirname "$0")/ai-chatbot" || exit 1

# Try using corepack first (built into Node.js 16+)
if command -v corepack &> /dev/null; then
  echo "Enabling corepack..."
  corepack enable 2>/dev/null || true
  echo "Preparing pnpm 9.12.3..."
  corepack prepare pnpm@9.12.3 --activate 2>/dev/null || true
fi

# Check for pnpm (preferred per package.json)
if command -v pnpm &> /dev/null; then
  echo "✓ Using pnpm (preferred)..."
  pnpm install
elif command -v npm &> /dev/null; then
  echo "⚠ pnpm not found, using npm with --legacy-peer-deps..."
  echo "Note: Using --legacy-peer-deps to resolve next-auth/Next.js 16 compatibility"
  echo "For better dependency resolution, install pnpm: npm install -g pnpm"
  npm install --legacy-peer-deps
elif command -v yarn &> /dev/null; then
  echo "⚠ pnpm and npm not found, using yarn..."
  echo "Note: This project uses pnpm. Install with: npm install -g pnpm"
  yarn install
else
  echo "❌ Error: No package manager found (pnpm, npm, or yarn)"
  echo ""
  echo "Please install one of:"
  echo "  1. pnpm (recommended): npm install -g pnpm"
  echo "  2. npm: comes with Node.js (install from nodejs.org)"
  echo "  3. yarn: npm install -g yarn"
  exit 1
fi

echo ""
echo "✓ Package installation complete!"
echo ""
echo "Next steps:"
echo "  1. Setup database: cd ai-chatbot && pnpm db:migrate"
echo "  2. Run dev server: cd ai-chatbot && pnpm dev"
echo ""
echo "Your app will be available at http://localhost:3000"

