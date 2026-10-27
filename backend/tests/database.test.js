const { test } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const { once } = require('node:events');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

test('direct app export connects on cold requests and reports missing configuration with CORS', async () => {
  const mongo = await MongoMemoryServer.create();
  const originalUri = process.env.MONGO_URI;
  process.env.MONGO_URI = mongo.getUri('direct_app_test');
  const app = require('../app');
  const server = http.createServer(app);
  try {
    assert.equal(mongoose.connection.readyState, 0);
    server.listen(0, '127.0.0.1');
    await once(server, 'listening');
    const base = `http://127.0.0.1:${server.address().port}`;
    const origin = 'https://project-trace-ny2qt670x-nisarg2102s-projects.vercel.app';
    const login = () => fetch(base + '/api/auth/login', {
      method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'missing@example.invalid', password: 'not-an-account' })
    });
    const results = await Promise.all([login(), login(), login()]);
    for (const response of results) {
      assert.equal(response.status, 401);
      assert.equal(response.headers.get('access-control-allow-origin'), origin);
      assert.equal((await response.json()).message, 'Invalid email or password');
    }
    assert.equal(mongoose.connection.readyState, 1);
    await mongoose.disconnect();
    delete process.env.MONGO_URI;
    const unavailable = await login();
    assert.equal(unavailable.status, 503);
    assert.equal(unavailable.headers.get('access-control-allow-origin'), origin);
    assert.match((await unavailable.json()).message, /MONGO_URI/);
    process.env.MONGO_URI = mongo.getUri('direct_app_test');
    assert.equal((await login()).status, 401);
  } finally {
    await new Promise(resolve => server.close(resolve));
    await mongoose.disconnect();
    await mongo.stop();
    if (originalUri === undefined) delete process.env.MONGO_URI;
    else process.env.MONGO_URI = originalUri;
  }
});
