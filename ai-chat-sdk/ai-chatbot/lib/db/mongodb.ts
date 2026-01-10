import "server-only";
import { MongoClient, Db, Collection } from "mongodb";

// MongoDB connection singleton
let client: MongoClient | null = null;
let db: Db | null = null;

// MongoDB collection references
export let collections: {
  users: Collection<User>;
  chats: Collection<Chat>;
  messages: Collection<DBMessage>;
  votes: Collection<Vote>;
  documents: Collection<Document>;
  suggestions: Collection<Suggestion>;
  streams: Collection<Stream>;
} | null = null;

// Types (matching the original schema)
export interface User {
  _id?: string;
  id: string;
  email: string;
  password?: string;
  createdAt?: Date;
}

export interface Chat {
  _id?: string;
  id: string;
  createdAt: Date;
  title: string;
  userId: string;
  visibility: "public" | "private";
}

export interface DBMessage {
  _id?: string;
  id: string;
  chatId: string;
  role: string;
  parts: any;
  attachments: any;
  createdAt: Date;
}

export interface Vote {
  _id?: string;
  chatId: string;
  messageId: string;
  isUpvoted: boolean;
}

export interface Document {
  _id?: string;
  id: string;
  createdAt: Date;
  title: string;
  content?: string;
  kind: "text" | "code" | "image" | "sheet";
  userId: string;
}

export interface Suggestion {
  _id?: string;
  id: string;
  documentId: string;
  documentCreatedAt: Date;
  originalText: string;
  suggestedText: string;
  description?: string;
  isResolved: boolean;
  userId: string;
  createdAt: Date;
}

export interface Stream {
  _id?: string;
  id: string;
  chatId: string;
  createdAt: Date;
}

export async function connectToMongoDB(): Promise<Db> {
  if (db) {
    return db;
  }

  // Try multiple environment variable names for MongoDB connection
  // Priority: MONGODB_URL > mongodb (from .env.local) > MONGODB_CONNECTION_STRING
  const connectionString = 
    process.env.MONGODB_URL || 
    process.env.mongodb ||  // Matches the variable name in .env.local
    process.env.MONGODB_CONNECTION_STRING;

  if (!connectionString) {
    throw new Error(
      "Database not configured. Please set MONGODB_URL, mongodb, or MONGODB_CONNECTION_STRING environment variable."
    );
  }

  // Check if it's a MongoDB connection string
  if (!connectionString.startsWith("mongodb://") && !connectionString.startsWith("mongodb+srv://")) {
    throw new Error(
      `Invalid MongoDB connection string. Expected mongodb:// or mongodb+srv://, got: ${connectionString.substring(0, 20)}...`
    );
  }

  try {
    client = new MongoClient(connectionString);
    await client.connect();
    
    // Extract database name from connection string, or default to 'ai_chatbot'
    // MongoDB connection string format: mongodb+srv://user:pass@host/dbname?options
    // Example from .env.local: mongodb+srv://user:pass@cluster0.qiidal.mongodb.net/?appName=Cluster0
    // If no database name in path (just /?options), use default 'ai_chatbot'
    let dbName = "ai_chatbot";
    try {
      // Pattern: mongodb+srv://user:pass@cluster/dbname?options or mongodb+srv://user:pass@cluster/?options
      // Extract text between last / and first ? (if exists)
      const urlParts = connectionString.split('?')[0]; // Remove query params
      const parts = urlParts.split('/');
      // Check if there's a database name after the last slash (before query params)
      if (parts.length > 3 && parts[parts.length - 1] && parts[parts.length - 1].trim() !== '') {
        // Has database name in path
        dbName = parts[parts.length - 1];
      }
      // Otherwise, use default 'ai_chatbot'
    } catch {
      // If parsing fails, use default
      dbName = "ai_chatbot";
    }
    db = client.db(dbName);

    // Initialize collections
    collections = {
      users: db.collection<User>("users"),
      chats: db.collection<Chat>("chats"),
      messages: db.collection<DBMessage>("messages"),
      votes: db.collection<Vote>("votes"),
      documents: db.collection<Document>("documents"),
      suggestions: db.collection<Suggestion>("suggestions"),
      streams: db.collection<Stream>("streams"),
    };

    // Create indexes for better performance
    await collections.users.createIndex({ email: 1 }, { unique: true });
    await collections.users.createIndex({ id: 1 }, { unique: true });
    await collections.chats.createIndex({ id: 1 }, { unique: true });
    await collections.chats.createIndex({ userId: 1 });
    await collections.messages.createIndex({ id: 1 }, { unique: true });
    await collections.messages.createIndex({ chatId: 1 });
    await collections.votes.createIndex({ chatId: 1, messageId: 1 }, { unique: true });
    await collections.documents.createIndex({ id: 1, createdAt: 1 }, { unique: true });
    await collections.documents.createIndex({ userId: 1 });
    await collections.suggestions.createIndex({ id: 1 }, { unique: true });
    await collections.suggestions.createIndex({ documentId: 1, documentCreatedAt: 1 });
    await collections.streams.createIndex({ id: 1 }, { unique: true });
    await collections.streams.createIndex({ chatId: 1 });

    console.log("✅ Connected to MongoDB successfully");
    return db;
  } catch (error: any) {
    console.error("❌ Failed to connect to MongoDB:", error.message);
    throw new Error(
      `Database connection failed: ${error.message}. Please check your MONGODB_URL connection string.`
    );
  }
}

export async function getDb(): Promise<Db> {
  if (!db) {
    return await connectToMongoDB();
  }
  return db;
}

export function getCollections() {
  if (!collections) {
    throw new Error(
      "Collections not initialized. Call connectToMongoDB() first."
    );
  }
  return collections;
}

// Close connection (useful for cleanup)
export async function closeConnection() {
  if (client) {
    await client.close();
    client = null;
    db = null;
    collections = null;
  }
}

