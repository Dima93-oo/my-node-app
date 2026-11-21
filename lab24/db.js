const { MongoClient } = require('mongodb');

const client = new MongoClient(process.env.MONGO_URI, { serverSelectionTimeoutMS: 5000 });

async function connect() {
  await client.connect();
  return client;
}

module.exports = { connect, client };