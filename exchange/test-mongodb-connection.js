require('dotenv').config({ path: './.env' });
const { MongoClient } = require('mongodb');

async function testConnection() {
  const connectionString = process.env.mongodb;
  
  if (!connectionString) {
    console.error('❌ Error: MongoDB connection string not found in .env file');
    console.error('   Expected: mongodb=<connection_string>');
    process.exit(1);
  }

  console.log('🔌 Testing MongoDB connection...');
  console.log('   Connection string:', connectionString.replace(/:[^:@]+@/, ':****@')); // Hide password
  
  const client = new MongoClient(connectionString);

  try {
    // Attempt to connect
    console.log('\n⏳ Connecting to MongoDB...');
    await client.connect();
    
    // Test the connection by running a ping
    console.log('✅ Connection established!');
    console.log('\n📊 Testing connection with ping...');
    const result = await client.db('admin').command({ ping: 1 });
    
    if (result.ok === 1) {
      console.log('✅ Ping successful! MongoDB connection is working.');
    }
    
    // Get server information
    console.log('\n📋 Server Information:');
    const adminDb = client.db('admin');
    const serverStatus = await adminDb.command({ serverStatus: 1 });
    console.log('   MongoDB Version:', serverStatus.version);
    console.log('   Uptime:', Math.floor(serverStatus.uptime / 3600), 'hours');
    
    // List databases
    console.log('\n📁 Available Databases:');
    const adminClient = client.db().admin();
    const dbList = await adminClient.listDatabases();
    dbList.databases.forEach(db => {
      console.log(`   - ${db.name} (${(db.sizeOnDisk / 1024 / 1024).toFixed(2)} MB)`);
    });
    
    console.log('\n✅ MongoDB connection test completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Connection test failed!');
    console.error('   Error:', error.message);
    
    if (error.message.includes('authentication failed')) {
      console.error('\n   💡 Tip: Check your username and password in the connection string');
    } else if (error.message.includes('ENOTFOUND') || error.message.includes('getaddrinfo')) {
      console.error('\n   💡 Tip: Check your network connection and MongoDB cluster hostname');
    } else if (error.message.includes('SSL')) {
      console.error('\n   💡 Tip: SSL/TLS connection issue. Check your MongoDB Atlas whitelist settings');
    }
    
    process.exit(1);
  } finally {
    // Close the connection
    await client.close();
    console.log('\n🔌 Connection closed.');
  }
}

// Run the test
testConnection().catch(console.error);

