# Database Setup Guide

The AI Chatbot uses **MongoDB** as its database. This guide will help you set up the database.

## Quick Setup Options

### Option 1: MongoDB Atlas (Recommended - Free & Easy)

1. **Sign up for MongoDB Atlas** (free tier available):
   - Go to https://www.mongodb.com/cloud/atlas
   - Sign up for a free account
   - Create a new cluster (free M0 tier)

2. **Get your connection string**:
   - In your Atlas dashboard, click "Connect" on your cluster
   - Choose "Connect your application"
   - Copy the connection string (it looks like: `mongodb+srv://user:password@cluster.mongodb.net/database?options`)
   - **Important**: Replace `<password>` with your database password
   - Replace `<database>` with your database name (or use default)

3. **Add to `.env.local`**:
   ```bash
   mongodb=mongodb+srv://user:password@cluster.mongodb.net/ai_chatbot?retryWrites=true&w=majority
   # OR use:
   MONGODB_URL=mongodb+srv://user:password@cluster.mongodb.net/ai_chatbot
   ```

4. **Configure Network Access**:
   - In Atlas dashboard, go to Network Access
   - Add your IP address (or 0.0.0.0/0 for development - **not recommended for production**)

5. **No migrations needed!** MongoDB collections are created automatically.

6. **Start the dev server**:
   ```bash
   pnpm dev
   ```

### Option 2: Local MongoDB

1. **Install MongoDB** (if not already installed):
   ```bash
   # macOS
   brew tap mongodb/brew
   brew install mongodb-community
   brew services start mongodb-community
   
   # Or download from: https://www.mongodb.com/try/download/community
   ```

2. **MongoDB will use default database**:
   - Default connection: `mongodb://localhost:27017/ai_chatbot`

3. **Add to `.env.local`**:
   ```bash
   mongodb=mongodb://localhost:27017/ai_chatbot
   # OR use:
   MONGODB_URL=mongodb://localhost:27017/ai_chatbot
   ```

4. **No migrations needed!** MongoDB collections are created automatically.

5. **Start the dev server**:
   ```bash
   pnpm dev
   ```

## Using Vercel CLI (If Deployed)

If you're using Vercel for deployment, you can pull environment variables:

```bash
# Install Vercel CLI
npm i -g vercel

# Link your project
vercel link

# Pull environment variables (includes MONGODB_URL if set in Vercel)
vercel env pull .env.local
```

## Troubleshooting

### Error: "Database not configured"
- Make sure `mongodb` or `MONGODB_URL` is set in `.env.local`
- Verify the connection string is correct
- Check that your MongoDB server is running (for local MongoDB)

### Error: "Invalid MongoDB connection string"
- Verify your connection string starts with `mongodb://` or `mongodb+srv://`
- Check for typos in the connection string
- Ensure password is properly URL-encoded if it contains special characters

### Error: "Failed to create guest user"
- Check that the MongoDB connection string is correct
- Verify network connectivity to MongoDB
- For MongoDB Atlas: Check IP whitelist in Atlas dashboard
- Collections are created automatically, no migrations needed

### Connection refused errors
- **MongoDB Atlas**: Check IP whitelist in Atlas dashboard (allow your IP or 0.0.0.0/0 for development)
- **Local MongoDB**: Check that MongoDB service is running: `brew services list` or `mongod --version`
- Check firewall settings
- Verify credentials are correct

### Authentication failed
- Verify username and password in connection string
- Check MongoDB user has proper permissions
- For MongoDB Atlas: Ensure database user is created and has read/write permissions

## Environment Variables Checklist

Make sure your `.env.local` file has:

```bash
# Required
AUTH_SECRET=your-generated-secret-here
mongodb=mongodb+srv://user:password@cluster.mongodb.net/ai_chatbot
# OR use: MONGODB_URL=mongodb+srv://...

# Optional (for full functionality)
BLOB_READ_WRITE_TOKEN=your-blob-token
REDIS_URL=your-redis-url
AI_GATEWAY_API_KEY=your-ai-gateway-api-key
```

## Next Steps

Once your database is set up:

1. ✅ Set `mongodb` or `MONGODB_URL` in `.env.local`
2. ✅ **No migrations needed!** MongoDB collections are created automatically
3. ✅ Start the dev server with `pnpm dev`
4. ✅ Visit http://localhost:3000

The app should now work without database errors!

## Collections Created Automatically

The following MongoDB collections will be created automatically on first use:
- `users` - User accounts
- `chats` - Chat conversations
- `messages` - Chat messages
- `votes` - Message votes
- `documents` - Artifact documents
- `suggestions` - Document suggestions
- `streams` - Stream tracking

Indexes are also created automatically for better performance.

