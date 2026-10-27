// Development-only MongoDB launcher; data survives process restarts.
const { MongoMemoryServer } = require('mongodb-memory-server');
const { mkdir } = require('node:fs/promises');
const path = require('node:path');
async function main() {
  const dbPath = path.resolve(__dirname, '../.local-data/mongodb');
  await mkdir(dbPath, { recursive: true });
  const mongo = new MongoMemoryServer({ instance: {
    ip: '127.0.0.1', port: 27017, portGeneration: false,
    dbPath, dbName: 'progtrack_mern', storageEngine: 'wiredTiger'
  } });
  await mongo.start();
  console.log('Local development MongoDB ready at mongodb://127.0.0.1:27017/progtrack_mern');
  console.log(`Persistent data: ${dbPath}`);
  let stopping = false;
  const stop = async () => {
    if (stopping) return;
    stopping = true;
    await mongo.stop({ doCleanup: false });
    process.exit(0);
  };
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);
}
main().catch(error => { console.error(error.message); process.exit(1); });
