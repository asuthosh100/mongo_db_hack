# MongoDB Migration Guide

The AI Chatbot has been migrated from PostgreSQL (Drizzle ORM) to MongoDB.

## Changes Made

### 1. Database Driver
- **Before**: PostgreSQL with Drizzle ORM (`drizzle-orm`, `postgres`)
- **After**: MongoDB with native driver (`mongodb`)

### 2. Connection
- **Before**: `POSTGRES_URL` environment variable
- **After**: `MONGODB_URL`, `mongodb`, or `MONGODB_CONNECTION_STRING` environment variable

### 3. Schema
- **Before**: Drizzle schema definitions in `lib/db/schema.ts`
- **After**: MongoDB collections defined in `lib/db/mongodb.ts`
- Schema types are now exported from `mongodb.ts` for backward compatibility

### 4. Queries
- **Before**: Drizzle ORM query syntax (SQL-like)
- **After**: MongoDB native driver queries
- All query functions maintain the same signatures for backward compatibility

## Environment Variables

Add to your `.env.local` file:

```bash
# MongoDB connection string
mongodb=mongodb+srv://user:password@cluster.mongodb.net/database?options

# OR use one of these variable names:
# MONGODB_URL=mongodb+srv://...
# MONGODB_CONNECTION_STRING=mongodb+srv://...

# AUTH_SECRET (still required)
AUTH_SECRET=your-auth-secret-here
```

## Database Setup

MongoDB collections are automatically created when first accessed. The following collections are used:

- `users` - User accounts (regular and guest)
- `chats` - Chat conversations
- `messages` - Chat messages (v2 format with parts)
- `votes` - Message votes (up/down)
- `documents` - Artifact documents (text, code, image, sheet)
- `suggestions` - Document suggestions
- `streams` - Stream tracking

### Indexes

Indexes are automatically created on first connection for better performance:
- `users`: email (unique), id (unique)
- `chats`: id (unique), userId
- `messages`: id (unique), chatId
- `votes`: chatId + messageId (unique)
- `documents`: id + createdAt (unique), userId
- `suggestions`: id (unique), documentId + documentCreatedAt
- `streams`: id (unique), chatId

## Migration Notes

### No Migration Script Needed
MongoDB doesn't require migrations like PostgreSQL. Collections and indexes are created automatically.

### Data Migration (if needed)
If you had existing PostgreSQL data, you'll need to export and import it manually:
1. Export data from PostgreSQL
2. Transform to MongoDB document format
3. Import into MongoDB

### Connection String Format
MongoDB connection strings can be in these formats:
- `mongodb+srv://user:password@cluster.mongodb.net/database?options`
- `mongodb://user:password@host:port/database?options`

If no database name is specified in the connection string, it defaults to `ai_chatbot`.

## Testing

To test the MongoDB connection:

```bash
cd ai-chat-sdk/ai-chatbot

# Set your MongoDB connection string in .env.local
# mongodb=mongodb+srv://user:pass@cluster.mongodb.net/

# Run the dev server
pnpm dev
```

The application will:
1. Connect to MongoDB on startup
2. Create collections if they don't exist
3. Create indexes automatically
4. Start working immediately

## Troubleshooting

### Error: "Database not configured"
- Make sure `mongodb` or `MONGODB_URL` is set in `.env.local`
- Check that your connection string is valid

### Error: "Invalid MongoDB connection string"
- Verify your connection string starts with `mongodb://` or `mongodb+srv://`
- Check for typos in the connection string

### Error: "Failed to create guest user"
- Verify MongoDB connection string is correct
- Check network connectivity to MongoDB
- Ensure MongoDB Atlas IP whitelist includes your IP (for Atlas)

### Connection Issues
- For MongoDB Atlas: Check IP whitelist in Atlas dashboard
- For local MongoDB: Ensure MongoDB service is running
- Check firewall settings
- Verify credentials are correct

## Package Changes

Added:
- `mongodb@^6.3.0` - MongoDB native driver

Still present (but not used):
- `drizzle-orm` - Can be removed if no longer needed
- `postgres` - Can be removed if no longer needed
- `drizzle-kit` - Can be removed if no longer needed

To remove unused packages:
```bash
cd ai-chat-sdk/ai-chatbot
pnpm remove drizzle-orm postgres drizzle-kit
```

## Next Steps

1. ✅ MongoDB connection utility created
2. ✅ All queries converted to MongoDB
3. ✅ Schema types updated
4. ✅ Environment variable handling updated
5. ⏭️ Install MongoDB package: `pnpm install` or `npm install --legacy-peer-deps`
6. ⏭️ Test the application with MongoDB connection string

