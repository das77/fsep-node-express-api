const { MongoClient } = require('mongodb');

// Connection settings are read at connect() time (not module load) so tests
// can point MONGODB_URI at an in-memory server before the first connect.
let client = null;
let db = null;

async function connect() {
  if (db) return db;

  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
  const dbName = process.env.MONGODB_DB || 'books';

  client = new MongoClient(uri);
  await client.connect();
  db = client.db(dbName);
  return db;
}

// Throws if called before connect() — callers should never see this in
// normal operation because server.js connects before app.listen().
function getDb() {
  if (!db) throw new Error('Database not connected; call connect() first');
  return db;
}

async function close() {
  if (client) {
    await client.close();
    client = null;
    db = null;
  }
}

module.exports = { connect, getDb, close };
