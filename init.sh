#!/bin/bash

set -e

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "=== x402 Seller Setup ==="
echo ""

# Check Node.js version
echo "Checking Node.js..."
if ! command -v node &> /dev/null; then
  echo "Error: Node.js is not installed"
  exit 1
fi
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
  echo "Error: Node.js 18+ required (found: $(node -v))"
  exit 1
fi
echo "Node.js $(node -v) OK"

# Install root dependencies
echo ""
echo "Installing root dependencies..."
cd "$ROOT_DIR"
npm install

# Setup seller app
echo ""
echo "Setting up apps/seller..."
cd "$ROOT_DIR/apps/seller"

# Copy .env.example to .env if it doesn't exist
if [ ! -f .env ]; then
  echo "Creating .env from .env.example..."
  cp .env.example .env
  echo "!! Update .env with your wallet address !!"
else
  echo ".env already exists"
fi

# Install seller app dependencies
echo ""
echo "Installing seller dependencies..."
npm install

echo ""
echo "=== Setup Complete ==="
echo ""
echo "Next steps:"
echo "  1. Update apps/seller/.env with your wallet address"
echo "  2. Run: ./start.sh"
echo ""
echo "Test with: curl http://localhost:3000/api/protected"
