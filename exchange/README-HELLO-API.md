# Hello API - x402 Protocol over HTTP

This document explains how to use the Hello API endpoint, which demonstrates the x402 protocol built on top of HTTP/HTTPS.

## Overview

The Hello API is a simple endpoint that demonstrates how the x402 protocol works. Clients (buyers and sellers) communicate with the Exchange Agent by sending x402 messages in HTTP request bodies and receiving x402 messages in HTTP response bodies.

## Endpoint

```
POST /api/v1/hello
```

## Protocol Details

- **Base Protocol:** HTTP/HTTPS
- **Transport Layer:** HTTP
- **Data Format:** JSON (x402 messages in HTTP body)
- **Content-Type:** `application/json`
- **Header:** `X-X402-Version: 1.0` (optional)

## x402 Message Format

### Request Message (Client → Exchange Agent)

```json
{
  "x402_version": "1.0",
  "message_type": "request",
  "timestamp": "2025-01-10T12:00:00Z",
  "sender_id": "buyer_123|seller_456|exchange_agent",
  "receiver_id": "exchange_agent",
  "transaction_id": null,
  "message_id": "msg_001",
  "payload": {
    "action": "HELLO",
    "greeting": "Hello from client!"
  },
  "signature": "placeholder_signature"
}
```

### Response Message (Exchange Agent → Client)

```json
{
  "x402_version": "1.0",
  "message_type": "response",
  "timestamp": "2025-01-10T12:00:01Z",
  "sender_id": "exchange_agent",
  "receiver_id": "buyer_123",
  "transaction_id": "txn_789",
  "message_id": "msg_002",
  "payload": {
    "action": "HELLO_RESPONSE",
    "greeting": "Hello buyer_123!",
    "message": "Welcome to the Exchange Agent Platform",
    "server_time": "2025-01-10T12:00:01Z",
    "x402_version": "1.0",
    "original_message_id": "msg_001"
  },
  "signature": "placeholder_signature"
}
```

## Authentication

Currently, authentication is simplified. The `sender_id` must be one of the pre-configured test accounts:
- `buyer_123` - Test buyer account
- `seller_456` - Test seller account
- `exchange_agent` - Exchange agent itself

Requests with invalid `sender_id` will receive an HTTP 401 response with an x402 ERROR message.

## Usage Examples

### Example 1: Using cURL

#### Buyer sending HELLO request:

```bash
curl -X POST http://localhost:3000/api/v1/hello \
  -H "Content-Type: application/json" \
  -H "X-X402-Version: 1.0" \
  -d '{
    "x402_version": "1.0",
    "message_type": "request",
    "timestamp": "2025-01-10T12:00:00Z",
    "sender_id": "buyer_123",
    "receiver_id": "exchange_agent",
    "message_id": "msg_001",
    "payload": {
      "action": "HELLO",
      "greeting": "Hello from buyer!"
    },
    "signature": "test_signature"
  }'
```

#### Seller sending HELLO request:

```bash
curl -X POST http://localhost:3000/api/v1/hello \
  -H "Content-Type: application/json" \
  -d '{
    "x402_version": "1.0",
    "message_type": "request",
    "sender_id": "seller_456",
    "receiver_id": "exchange_agent",
    "message_id": "msg_002",
    "payload": {
      "action": "HELLO"
    }
  }'
```

### Example 2: Using Node.js

See `example-hello-request.js` for a complete Node.js example.

```javascript
const { createX402Message, sendX402Message } = require('./example-hello-request');

// Create x402 message
const x402Message = createX402Message(
  'buyer_123',
  'exchange_agent',
  'HELLO',
  { greeting: 'Hello from buyer!' }
);

// Send over HTTP
sendX402Message('/api/v1/hello', x402Message, (error, statusCode, response) => {
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  console.log('Status:', statusCode);
  console.log('Response:', response);
  
  if (response.payload.action === 'HELLO_RESPONSE') {
    console.log(response.payload.greeting);
  }
});
```

### Example 3: Using JavaScript (Browser/Fetch API)

```javascript
async function sendHello() {
  const x402Message = {
    x402_version: "1.0",
    message_type: "request",
    timestamp: new Date().toISOString(),
    sender_id: "buyer_123",
    receiver_id: "exchange_agent",
    message_id: `msg_${Date.now()}`,
    payload: {
      action: "HELLO",
      greeting: "Hello from browser!"
    },
    signature: "placeholder_signature"
  };

  try {
    const response = await fetch('http://localhost:3000/api/v1/hello', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-X402-Version': '1.0'
      },
      body: JSON.stringify(x402Message)
    });

    const x402Response = await response.json();
    console.log('Response:', x402Response);
    
    if (x402Response.payload.action === 'HELLO_RESPONSE') {
      alert(x402Response.payload.greeting);
    }
  } catch (error) {
    console.error('Error:', error);
  }
}
```

## Response Codes

### Success (200 OK)
The request was successfully processed. The response body contains an x402 message with `action: "HELLO_RESPONSE"`.

### Bad Request (400 Bad Request)
The x402 message format is invalid (missing required fields).

### Unauthorized (401 Unauthorized)
The `sender_id` is not one of the allowed test accounts (buyer_123, seller_456, exchange_agent).

### Internal Server Error (500 Internal Server Error)
An unexpected server error occurred. The response body contains an x402 message with `action: "ERROR"`.

## Running the Server

```bash
# Start the server
npm start

# Or directly
node server.js
```

The server will start on port 3000 (or the port specified in the PORT environment variable).

## Additional Endpoints

### Health Check
```
GET /health
```
Returns server health status.

### API Information
```
GET /
```
Returns API information and available endpoints.

## Testing

Run the example script to test the API:

```bash
node example-hello-request.js
```

Make sure the server is running first (`npm start`).

## Next Steps

This Hello API demonstrates the basic x402 protocol implementation. For production use:

1. **Implement Digital Signatures:** Replace `placeholder_signature` with actual cryptographic signatures
2. **Add Authentication:** Implement proper authentication (JWT, OAuth, API keys, etc.)
3. **Add Message Validation:** Validate message signatures and integrity
4. **Add Rate Limiting:** Prevent abuse
5. **Add Logging:** Log all x402 messages for audit trail
6. **Add Error Handling:** More detailed error messages and error codes

See `PRD.md` for the complete specification of the x402 protocol and Exchange Agent Platform.

