require('dotenv').config({ path: './.env' });
const express = require('express');
const app = express();

const PORT = process.env.PORT || 3000;
const X402_VERSION = '1.0';

// Middleware to parse JSON bodies
app.use(express.json());

// Middleware to add x402 version header
app.use((req, res, next) => {
  res.setHeader('X-X402-Version', X402_VERSION);
  res.setHeader('Content-Type', 'application/json');
  next();
});

/**
 * Generate x402 message ID
 */
function generateMessageId() {
  return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Generate x402 transaction ID (if needed)
 */
function generateTransactionId() {
  return `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Create x402 response message
 */
function createX402Response(senderId, receiverId, action, payload, transactionId = null) {
  return {
    x402_version: X402_VERSION,
    message_type: 'response',
    timestamp: new Date().toISOString(),
    sender_id: senderId,
    receiver_id: receiverId,
    transaction_id: transactionId,
    message_id: generateMessageId(),
    payload: {
      action: action,
      ...payload
    },
    signature: 'placeholder_signature' // TODO: Implement digital signature
  };
}

/**
 * Validate sender_id matches test accounts
 */
function validateSenderId(senderId) {
  const validAccounts = ['buyer_123', 'seller_456', 'exchange_agent'];
  return validAccounts.includes(senderId);
}

/**
 * Hello API endpoint - demonstrates x402 protocol over HTTP
 * POST /api/v1/hello
 */
app.post('/api/v1/hello', (req, res) => {
  try {
    // Extract x402 message from HTTP request body
    const x402Message = req.body;

    // Validate x402 message structure
    if (!x402Message.x402_version || !x402Message.message_type || !x402Message.sender_id) {
      return res.status(400).json({
        error: 'Invalid x402 message format',
        message: 'Missing required fields: x402_version, message_type, or sender_id'
      });
    }

    // Validate sender_id matches test accounts
    if (!validateSenderId(x402Message.sender_id)) {
      return res.status(401).json(
        createX402Response(
          'exchange_agent',
          x402Message.sender_id || 'unknown',
          'ERROR',
          {
            error: 'Unauthorized',
            message: 'Invalid sender_id. Must be one of: buyer_123, seller_456, exchange_agent'
          },
          x402Message.transaction_id || null
        )
      );
    }

    // Extract receiver_id (should be exchange_agent for this endpoint)
    const receiverId = x402Message.receiver_id || 'exchange_agent';
    const senderId = x402Message.sender_id;

    // Create x402 response message
    const response = createX402Response(
      'exchange_agent',
      senderId,
      'HELLO_RESPONSE',
      {
        greeting: `Hello ${senderId}!`,
        message: 'Welcome to the Exchange Agent Platform',
        server_time: new Date().toISOString(),
        x402_version: x402Message.x402_version,
        original_message_id: x402Message.message_id || null
      },
      x402Message.transaction_id || generateTransactionId()
    );

    // Send HTTP 200 response with x402 message in body
    res.status(200).json(response);

  } catch (error) {
    // Error handling
    res.status(500).json(
      createX402Response(
        'exchange_agent',
        req.body?.sender_id || 'unknown',
        'ERROR',
        {
          error: 'Internal Server Error',
          message: error.message
        },
        req.body?.transaction_id || null
      )
    );
  }
});

/**
 * Health check endpoint
 * GET /health
 */
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    service: 'Exchange Agent Platform',
    x402_version: X402_VERSION,
    timestamp: new Date().toISOString()
  });
});

/**
 * Root endpoint - API information
 * GET /
 */
app.get('/', (req, res) => {
  res.status(200).json({
    service: 'Exchange Agent Platform',
    protocol: 'x402 over HTTP/HTTPS',
    version: X402_VERSION,
    endpoints: {
      hello: 'POST /api/v1/hello',
      health: 'GET /health'
    },
    documentation: 'See PRD.md for x402 protocol specification'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Exchange Agent Platform Server running on port ${PORT}`);
  console.log(`📡 x402 Protocol Version: ${X402_VERSION}`);
  console.log(`\nAvailable endpoints:`);
  console.log(`  POST /api/v1/hello - Hello API with x402 protocol`);
  console.log(`  GET  /health      - Health check`);
  console.log(`  GET  /            - API information`);
  console.log(`\nExample request:`);
  console.log(`  curl -X POST http://localhost:${PORT}/api/v1/hello \\`);
  console.log(`    -H "Content-Type: application/json" \\`);
  console.log(`    -d '{"x402_version":"1.0","message_type":"request","sender_id":"buyer_123","receiver_id":"exchange_agent","message_id":"msg_001","payload":{"action":"HELLO"}}'`);
});

module.exports = app;

