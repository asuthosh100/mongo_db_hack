# Product Requirements Document: Exchange Agent Platform

## 1. Overview
- **Product Name:** Exchange Agent Platform
- **Version:** 1.0.0
- **Date:** January 10, 2025
- **Status:** Draft

## 2. Executive Summary
The Exchange Agent Platform is a digital marketplace that facilitates buy and sell transactions between buyers and sellers. The platform acts as an intermediary (exchange agent) that manages all transactions, ensuring secure and reliable communication using the x402 protocol, with all transaction details recorded in MongoDB.

## 3. Problem Statement
There is a need for a centralized exchange platform that:
- Connects buyers and sellers in a secure, standardized way
- Maintains a complete audit trail of all transactions
- Provides a consistent communication protocol for all participants
- Ensures transaction integrity and data persistence

## 4. Goals and Objectives

### Primary Goal
Enable seamless buy/sell transactions between buyers and sellers through a secure, standardized exchange platform.

### Secondary Goals
- Provide real-time transaction processing
- Maintain complete transaction history and audit trail
- Support multiple concurrent transactions
- Ensure data integrity and consistency

### Success Metrics
- Transaction success rate > 99%
- Average transaction processing time < 2 seconds
- Zero data loss in transactions
- System uptime > 99.9%

## 5. User Roles and Personas

**Note:** For this implementation, we will use pre-configured test accounts instead of a full user management system.

### 5.1 Buyer
- **Description:** Users who want to purchase goods/services
- **Test Account:** `buyer_123` (user_id: "buyer_123", user_type: "buyer")
- **Key Actions:**
  - Browse available listings
  - Submit buy orders
  - Receive order confirmations
  - Complete transactions

### 5.2 Seller
- **Description:** Users who want to sell goods/services
- **Test Account:** `seller_456` (user_id: "seller_456", user_type: "seller")
- **Key Actions:**
  - Create listings
  - Submit sell orders
  - Receive order confirmations
  - Complete transactions

### 5.3 Exchange Agent (Platform)
- **Description:** The intermediary platform managing all transactions
- **Key Actions:**
  - Process buy/sell orders
  - Match orders
  - Record transactions
  - Manage communication between parties

## 6. Features and Functionality

### 6.1 Core Features

#### 6.1.1 User Management ⏭️ SKIPPED
**Note:** User Management system is skipped for this implementation. Instead, we will use two pre-configured test accounts:
- **buyer_123** - Test buyer account
- **seller_456** - Test seller account

These accounts will be hardcoded for development and testing purposes. Full user management features (registration, authentication, profile management) will be deferred to a future phase.

#### 6.1.2 Listing Management
- Create product/service listings (Sellers)
- Browse available listings (Buyers)
- Search and filter listings
- View listing details

#### 6.1.3 Order Processing
- Submit buy orders (Buyers)
- Submit sell orders (Sellers)
- Order matching engine
- Order status tracking

#### 6.1.4 Transaction Management
- Transaction execution
- Transaction confirmation
- Transaction history
- Transaction details retrieval

#### 6.1.5 Information Enquiry
- Transaction status queries
- User account information
- Listing information
- Platform statistics

### 6.2 Nice-to-Have Features
- Real-time notifications
- Rating and review system
- Dispute resolution
- Advanced analytics dashboard
- Multi-currency support

## 7. Technical Requirements

### 7.1 Technology Stack
- **Database:** MongoDB (Atlas)
- **Backend:** Node.js
- **Communication Protocol:** x402 Protocol
- **API Style:** RESTful API

### 7.2 X402 Protocol Specification

The x402 protocol is an application-layer protocol built on top of HTTP/HTTPS. It defines the communication standard for all interactions between the Exchange Agent and participants (buyers and sellers).

#### 7.2.1 Protocol Overview
- **Purpose:** Standardized communication between Exchange Agent and participants
- **Base Protocol:** HTTP/HTTPS (x402 is built on top of HTTP as an application-layer protocol)
- **Transport Layer:** HTTP/HTTPS
- **Data Format:** JSON (x402 messages are sent in HTTP request/response body)
- **Authentication:** ⏭️ SIMPLIFIED - Validate sender_id matches test accounts (buyer_123, seller_456). Full authentication deferred.

#### 7.2.2 Message Format
```json
{
  "x402_version": "1.0",
  "message_type": "request|response|notification",
  "timestamp": "2025-01-10T12:00:00Z",
  "sender_id": "buyer_123|seller_456|exchange_agent", // buyer_123 and seller_456 are pre-configured test accounts
  "receiver_id": "buyer_123|seller_456|exchange_agent",
  "transaction_id": "txn_789",
  "message_id": "msg_001",
  "payload": {},
  "signature": "digital_signature_hash"
}
```

#### 7.2.3 HTTP Transport Details

Since x402 is built on top of HTTP/HTTPS, x402 messages are sent as HTTP requests and responses:

- **HTTP Methods:**
  - `POST` - Used for sending x402 request messages (BUY_ORDER, SELL_ORDER, etc.)
  - `GET` - Used for sending x402 query messages (QUERY_TRANSACTION, QUERY_LISTING, etc.)
  
- **HTTP Headers:**
  - `Content-Type: application/json` - Required for x402 message bodies
  - `X-X402-Version: 1.0` - Optional protocol version header
  
- **HTTP Status Codes:**
  - Standard HTTP status codes are used (200 OK, 400 Bad Request, 401 Unauthorized, 404 Not Found, 500 Internal Server Error, etc.)
  
- **Message Delivery:**
  - Request messages: x402 message JSON is sent in the HTTP request body
  - Response messages: x402 message JSON is sent in the HTTP response body
  - Notifications: Can be sent via webhooks or polling (POST requests)

#### 7.2.4 Message Types

##### Request Messages (Buyer/Seller → Exchange)
- `BUY_ORDER`: Submit a buy order
- `SELL_ORDER`: Submit a sell order
- `QUERY_TRANSACTION`: Query transaction status
- `QUERY_LISTING`: Query listing information
- `QUERY_USER`: Query user information
- `CANCEL_ORDER`: Cancel an active order

##### Response Messages (Exchange → Buyer/Seller)
- `ORDER_CONFIRMED`: Order received and confirmed
- `ORDER_MATCHED`: Order successfully matched
- `ORDER_REJECTED`: Order rejected with reason
- `TRANSACTION_COMPLETE`: Transaction completed
- `TRANSACTION_FAILED`: Transaction failed
- `QUERY_RESULT`: Result of information query

##### Notification Messages (Exchange → Buyer/Seller)
- `ORDER_STATUS_UPDATE`: Order status changed
- `MATCH_FOUND`: Matching order found
- `TRANSACTION_PENDING`: Transaction pending completion

### 7.3 System Architecture

```
┌─────────────┐         ┌─────────────┐
│   Buyer     │◄───────►│   Exchange  │
│             │  x402   │    Agent    │
└─────────────┘ Protocol└─────────────┘
                          │  x402   │
┌─────────────┐           │ Protocol│
│   Seller    │◄──────────┘         │
│             │                     │
└─────────────┘           ┌─────────▼────┐
                          │   MongoDB    │
                          │  Database    │
                          └──────────────┘
```

### 7.4 API Endpoints

#### 7.4.1 Buyer Endpoints
- `POST /api/v1/buyers/orders` - Submit buy order
- `GET /api/v1/buyers/orders/:orderId` - Get order status
- `GET /api/v1/buyers/transactions` - Get transaction history
- `GET /api/v1/buyers/listings` - Browse listings

#### 7.4.2 Seller Endpoints
- `POST /api/v1/sellers/listings` - Create listing
- `POST /api/v1/sellers/orders` - Submit sell order
- `GET /api/v1/sellers/orders/:orderId` - Get order status
- `GET /api/v1/sellers/transactions` - Get transaction history

#### 7.4.3 Exchange Agent Endpoints
- `POST /api/v1/exchange/match` - Match orders (internal)
- `POST /api/v1/exchange/transactions` - Execute transaction (internal)
- `GET /api/v1/exchange/stats` - Platform statistics

### 7.5 Database Schema

#### 7.5.1 Users Collection
```javascript
{
  _id: ObjectId,
  user_id: String, // Unique identifier for client
  user_type: String, // "buyer" | "seller"
  username: String,
  email: String,
  created_at: Date,
  updated_at: Date,
  status: String // "active" | "suspended" | "inactive"
}
```

**Pre-configured Test Accounts:**
- `buyer_123` - Test buyer (user_type: "buyer")
- `seller_456` - Test seller (user_type: "seller")

These accounts will be seeded into the Users collection during database initialization.

#### 7.5.2 Listings Collection
```javascript
{
  _id: ObjectId,
  listing_id: String,
  seller_id: String,
  title: String,
  description: String,
  price: Number,
  quantity: Number,
  category: String,
  created_at: Date,
  updated_at: Date,
  status: String // "active" | "sold" | "cancelled"
}
```

#### 7.5.3 Orders Collection
```javascript
{
  _id: ObjectId,
  order_id: String,
  user_id: String,
  user_type: String, // "buyer" | "seller"
  listing_id: String, // For buy orders
  order_type: String, // "buy" | "sell"
  price: Number,
  quantity: Number,
  status: String, // "pending" | "matched" | "completed" | "cancelled" | "rejected"
  created_at: Date,
  matched_at: Date,
  matched_with_order_id: String
}
```

#### 7.5.4 Transactions Collection
```javascript
{
  _id: ObjectId,
  transaction_id: String,
  buy_order_id: String,
  sell_order_id: String,
  buyer_id: String,
  seller_id: String,
  listing_id: String,
  price: Number,
  quantity: Number,
  total_amount: Number,
  status: String, // "pending" | "completed" | "failed" | "cancelled"
  created_at: Date,
  completed_at: Date,
  x402_messages: [{
    message_type: String,
    sender_id: String,
    receiver_id: String,
    timestamp: Date,
    payload: Object
  }]
}
```

#### 7.5.5 X402 Messages Collection (Audit Log)
```javascript
{
  _id: ObjectId,
  message_id: String,
  x402_version: String,
  message_type: String,
  sender_id: String,
  receiver_id: String,
  transaction_id: String,
  timestamp: Date,
  payload: Object,
  signature: String,
  status: String // "sent" | "received" | "processed" | "failed"
}
```

## 8. User Flows

### 8.1 Buyer Purchase Flow
1. Buyer queries available listings
2. Buyer selects a listing and submits buy order (x402: BUY_ORDER)
3. Exchange Agent confirms order receipt (x402: ORDER_CONFIRMED)
4. Exchange Agent attempts to match with sell orders
5. If matched, Exchange Agent sends notification (x402: MATCH_FOUND)
6. Exchange Agent executes transaction
7. Exchange Agent sends completion notification (x402: TRANSACTION_COMPLETE)
8. Transaction recorded in MongoDB

### 8.2 Seller Listing Flow
1. Seller creates listing
2. Listing stored in MongoDB
3. Listing made available to buyers
4. Seller can submit sell order (x402: SELL_ORDER)
5. Exchange Agent confirms order (x402: ORDER_CONFIRMED)
6. Order matched with buyer orders
7. Transaction executed and recorded

### 8.3 Information Enquiry Flow
1. User submits query (x402: QUERY_TRANSACTION/QUERY_LISTING/QUERY_USER)
2. Exchange Agent retrieves information from MongoDB
3. Exchange Agent responds with query result (x402: QUERY_RESULT)

## 9. Non-Functional Requirements

### 9.1 Performance
- API response time < 200ms (p95)
- Transaction processing time < 2 seconds
- Support at least 1000 concurrent users
- Database queries optimized with proper indexes

### 9.2 Security
- All communications encrypted (HTTPS)
- ~~User authentication required for all operations~~ ⏭️ SIMPLIFIED - Validate user_id matches test accounts (buyer_123, seller_456)
- X402 message signatures verified
- MongoDB connection secured (TLS)
- Input validation and sanitization
- Rate limiting on API endpoints

### 9.3 Scalability
- Horizontal scaling capability
- Database connection pooling
- Caching layer for frequently accessed data
- Async message processing

### 9.4 Availability
- System uptime > 99.9%
- Automatic failover mechanisms
- Database replication
- Health check endpoints

### 9.5 Data Integrity
- All transactions use MongoDB transactions for atomicity
- Complete audit trail of all x402 messages
- Data backup and recovery procedures
- Idempotent operations where applicable

## 10. Dependencies
- MongoDB Atlas cluster (already configured)
- Node.js runtime environment
- dotenv for environment configuration
- Express.js or similar web framework (for API)
- ~~JSON Web Tokens (JWT) for authentication~~ ⏭️ DEFERRED - User management skipped
- Test accounts: buyer_123, seller_456 (pre-configured)

## 11. Risks and Mitigations

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| MongoDB connection failure | High | Medium | Connection pooling, retry logic, health checks |
| Order matching failures | High | Low | Transaction rollback, error logging, alerting |
| X402 protocol implementation errors | Medium | Medium | Comprehensive testing, protocol validation |
| High traffic overload | Medium | Low | Load balancing, auto-scaling, rate limiting |
| Data inconsistency | High | Low | MongoDB transactions, proper error handling |

## 12. Implementation Phases

### Phase 1: Foundation (Week 1-2)
- MongoDB connection setup ✓
- Database schema creation
- Seed test accounts (buyer_123, seller_456) ✓
- ~~Basic user management~~ ⏭️ SKIPPED
- X402 protocol implementation

### Phase 2: Core Features (Week 3-4)
- Listing management
- Order submission
- Basic order matching
- Transaction recording

### Phase 3: Advanced Features (Week 5-6)
- Complete x402 protocol implementation
- Information enquiry system
- Transaction history
- Error handling and validation

### Phase 4: Testing & Optimization (Week 7-8)
- Unit testing
- Integration testing
- Performance optimization
- Security audit

## 13. Open Questions
1. What is the specific specification for x402 protocol? (Custom protocol or standard?)
2. ~~What are the authentication requirements? (OAuth, JWT, API keys?)~~ ⏭️ DEFERRED - User management skipped for this phase
3. What is the expected transaction volume?
4. Are there any regulatory compliance requirements?
5. What are the payment settlement mechanisms?

### 13.1 Test Accounts Initialization
For development and testing, the following accounts will be automatically created in the Users collection:
- **buyer_123**: { user_id: "buyer_123", user_type: "buyer", username: "buyer_123", email: "buyer@test.com", status: "active" }
- **seller_456**: { user_id: "seller_456", user_type: "seller", username: "seller_456", email: "seller@test.com", status: "active" }

## 14. Appendix

### A. X402 Protocol Message Examples

The x402 protocol is built on top of HTTP/HTTPS. Below are examples showing how x402 messages are transported over HTTP.

#### Example 1: BUY_ORDER Request over HTTP

**HTTP Request:**
```
POST /api/v1/buyers/orders HTTP/1.1
Host: exchange.example.com
Content-Type: application/json
X-X402-Version: 1.0

{
  "x402_version": "1.0",
  "message_type": "request",
  "timestamp": "2025-01-10T12:00:00Z",
  "sender_id": "buyer_123",
  "receiver_id": "exchange_agent",
  "transaction_id": null,
  "message_id": "msg_001",
  "payload": {
    "action": "BUY_ORDER",
    "listing_id": "listing_456",
    "quantity": 2,
    "max_price": 100.00
  },
  "signature": "abc123..."
}
```

**HTTP Response:**
```
HTTP/1.1 200 OK
Content-Type: application/json
X-X402-Version: 1.0

{
  "x402_version": "1.0",
  "message_type": "response",
  "timestamp": "2025-01-10T12:00:01Z",
  "sender_id": "exchange_agent",
  "receiver_id": "buyer_123",
  "transaction_id": "txn_789",
  "message_id": "msg_002",
  "payload": {
    "action": "ORDER_CONFIRMED",
    "order_id": "order_001",
    "status": "pending",
    "estimated_match_time": "2025-01-10T12:05:00Z"
  },
  "signature": "def456..."
}
```

#### Example 2: QUERY_TRANSACTION Request over HTTP

**HTTP Request:**
```
GET /api/v1/buyers/transactions?transaction_id=txn_789 HTTP/1.1
Host: exchange.example.com
X-X402-Version: 1.0
```

**x402 Message in Response Body:**
```json
{
  "x402_version": "1.0",
  "message_type": "response",
  "timestamp": "2025-01-10T12:01:00Z",
  "sender_id": "exchange_agent",
  "receiver_id": "buyer_123",
  "transaction_id": "txn_789",
  "message_id": "msg_003",
  "payload": {
    "action": "QUERY_RESULT",
    "transaction": {
      "transaction_id": "txn_789",
      "status": "completed",
      "price": 100.00,
      "quantity": 2
    }
  },
  "signature": "ghi789..."
}
```

### B. MongoDB Indexes

```javascript
// Users collection
db.users.createIndex({ user_id: 1 }, { unique: true });
db.users.createIndex({ email: 1 }, { unique: true });

// Listings collection
db.listings.createIndex({ listing_id: 1 }, { unique: true });
db.listings.createIndex({ seller_id: 1 });
db.listings.createIndex({ status: 1, created_at: -1 });

// Orders collection
db.orders.createIndex({ order_id: 1 }, { unique: true });
db.orders.createIndex({ user_id: 1, status: 1 });
db.orders.createIndex({ order_type: 1, status: 1, price: 1 });

// Transactions collection
db.transactions.createIndex({ transaction_id: 1 }, { unique: true });
db.transactions.createIndex({ buyer_id: 1, created_at: -1 });
db.transactions.createIndex({ seller_id: 1, created_at: -1 });
db.transactions.createIndex({ status: 1 });

// X402 Messages collection
db.x402_messages.createIndex({ message_id: 1 }, { unique: true });
db.x402_messages.createIndex({ transaction_id: 1 });
db.x402_messages.createIndex({ sender_id: 1, timestamp: -1 });
db.x402_messages.createIndex({ timestamp: -1 });
```

