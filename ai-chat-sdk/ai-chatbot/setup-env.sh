#!/bin/bash
# Setup environment variables for ai-chatbot

echo "=========================================="
echo "Setting up environment variables"
echo "=========================================="
echo ""

# Generate a secure AUTH_SECRET if it doesn't exist
if [ ! -f .env.local ]; then
  echo "Creating .env.local file..."
  
  # Try to generate a secure secret using openssl
  if command -v openssl &> /dev/null; then
    AUTH_SECRET=$(openssl rand -base64 32)
    echo "✓ Generated secure AUTH_SECRET"
  else
    # Fallback to a random string (less secure)
    AUTH_SECRET="development-secret-$(date +%s | sha256sum | base64 | head -c 32)"
    echo "⚠ Generated AUTH_SECRET (less secure, consider using openssl)"
  fi

  cat > .env.local << EOF
# Auth.js (NextAuth) Configuration
# This secret was auto-generated. For production, use: openssl rand -base64 32
AUTH_SECRET=${AUTH_SECRET}

# Database Configuration (if using Neon Postgres)
# POSTGRES_URL=your-postgres-connection-string

# Vercel Blob Storage (if using file uploads)
# BLOB_READ_WRITE_TOKEN=your-blob-token

# Redis Configuration (if using Redis)
# REDIS_URL=your-redis-url

# AI Gateway API Key (for non-Vercel deployments)
# AI_GATEWAY_API_KEY=your-ai-gateway-api-key
EOF

  echo "✓ Created .env.local with AUTH_SECRET"
  echo ""
  echo "Your AUTH_SECRET has been generated and saved to .env.local"
else
  echo "⚠ .env.local already exists. Skipping creation."
  echo ""
  echo "If you're getting AUTH_SECRET errors, make sure it's set in .env.local"
  echo "You can generate a new one with: openssl rand -base64 32"
fi

echo ""
echo "To generate a new secure secret manually:"
echo "  openssl rand -base64 32"
echo ""
echo "Then add it to .env.local as:"
echo "  AUTH_SECRET=your-generated-secret"

