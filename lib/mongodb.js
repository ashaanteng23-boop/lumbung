const { MongoClient } = require('mongodb');

let cached = globalThis.__lumbungMongo;

if (!cached) {
  cached = globalThis.__lumbungMongo = { client: null, promise: null };
}

async function getDb() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI belum dikonfigurasi.');
  }

  if (!cached.promise) {
    const client = new MongoClient(uri);
    cached.promise = client.connect().then((connectedClient) => {
      cached.client = connectedClient;
      return connectedClient.db(process.env.MONGODB_DB || 'lumbung_edukatif');
    });
  }

  return cached.promise;
}

module.exports = { getDb };
