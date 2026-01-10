/**
 * Example: How to call the Hello API with x402 protocol over HTTP
 * 
 * This demonstrates how clients (buyers/sellers) communicate with the
 * Exchange Agent using the x402 protocol built on top of HTTP.
 */

const http = require('http');

const API_BASE_URL = process.env.API_URL || 'http://localhost:3000';

/**
 * Create an x402 message
 */
function createX402Message(senderId, receiverId, action, payload = {}) {
  return {
    x402_version: '1.0',
    message_type: 'request',
    timestamp: new Date().toISOString(),
    sender_id: senderId,
    receiver_id: receiverId,
    transaction_id: null,
    message_id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    payload: {
      action: action,
      ...payload
    },
    signature: 'placeholder_signature' // TODO: Implement digital signature
  };
}

/**
 * Send x402 message over HTTP POST
 */
function sendX402Message(endpoint, x402Message, callback) {
  const url = new URL(endpoint, API_BASE_URL);
  const data = JSON.stringify(x402Message);

  const options = {
    hostname: url.hostname,
    port: url.port || (url.protocol === 'https:' ? 443 : 80),
    path: url.pathname,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-X402-Version': '1.0',
      'Content-Length': Buffer.byteLength(data)
    }
  };

  const req = http.request(options, (res) => {
    let responseData = '';

    res.on('data', (chunk) => {
      responseData += chunk;
    });

    res.on('end', () => {
      try {
        const x402Response = JSON.parse(responseData);
        callback(null, res.statusCode, x402Response);
      } catch (error) {
        callback(error, res.statusCode, responseData);
      }
    });
  });

  req.on('error', (error) => {
    callback(error, null, null);
  });

  req.write(data);
  req.end();
}

/**
 * Example 1: Buyer sending HELLO request
 */
function exampleBuyerHello() {
  console.log('\n=== Example 1: Buyer (buyer_123) sending HELLO request ===\n');

  const x402Message = createX402Message(
    'buyer_123',
    'exchange_agent',
    'HELLO',
    {
      greeting: 'Hello from buyer!'
    }
  );

  console.log('Sending x402 message:');
  console.log(JSON.stringify(x402Message, null, 2));

  sendX402Message('/api/v1/hello', x402Message, (error, statusCode, response) => {
    if (error) {
      console.error('Error:', error.message);
      return;
    }

    console.log(`\nHTTP Status Code: ${statusCode}`);
    console.log('\nReceived x402 response:');
    console.log(JSON.stringify(response, null, 2));

    if (response && response.payload && response.payload.action === 'HELLO_RESPONSE') {
      console.log(`\n✅ Success! ${response.payload.greeting}`);
      console.log(`   Message: ${response.payload.message}`);
    }
  });
}

/**
 * Example 2: Seller sending HELLO request
 */
function exampleSellerHello() {
  console.log('\n=== Example 2: Seller (seller_456) sending HELLO request ===\n');

  const x402Message = createX402Message(
    'seller_456',
    'exchange_agent',
    'HELLO',
    {
      greeting: 'Hello from seller!'
    }
  );

  console.log('Sending x402 message:');
  console.log(JSON.stringify(x402Message, null, 2));

  sendX402Message('/api/v1/hello', x402Message, (error, statusCode, response) => {
    if (error) {
      console.error('Error:', error.message);
      return;
    }

    console.log(`\nHTTP Status Code: ${statusCode}`);
    console.log('\nReceived x402 response:');
    console.log(JSON.stringify(response, null, 2));

    if (response && response.payload && response.payload.action === 'HELLO_RESPONSE') {
      console.log(`\n✅ Success! ${response.payload.greeting}`);
      console.log(`   Message: ${response.payload.message}`);
    }
  });
}

/**
 * Example 3: Invalid sender_id (should be rejected)
 */
function exampleInvalidSender() {
  console.log('\n=== Example 3: Invalid sender_id (should be rejected) ===\n');

  const x402Message = createX402Message(
    'invalid_user',
    'exchange_agent',
    'HELLO',
    {}
  );

  console.log('Sending x402 message with invalid sender_id:');
  console.log(JSON.stringify(x402Message, null, 2));

  sendX402Message('/api/v1/hello', x402Message, (error, statusCode, response) => {
    if (error) {
      console.error('Error:', error.message);
      return;
    }

    console.log(`\nHTTP Status Code: ${statusCode}`);
    console.log('\nReceived x402 response:');
    console.log(JSON.stringify(response, null, 2));

    if (statusCode === 401 && response.payload.action === 'ERROR') {
      console.log(`\n✅ Expected rejection: ${response.payload.message}`);
    }
  });
}

// Run examples
if (require.main === module) {
  console.log('🚀 x402 Protocol Hello API Examples');
  console.log('====================================');
  console.log(`API Base URL: ${API_BASE_URL}`);
  console.log('\nMake sure the server is running: npm start\n');

  // Run examples with delays to see output clearly
  exampleBuyerHello();
  
  setTimeout(() => {
    exampleSellerHello();
  }, 2000);

  setTimeout(() => {
    exampleInvalidSender();
  }, 4000);
}

module.exports = {
  createX402Message,
  sendX402Message
};

