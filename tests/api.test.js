const { test, before, beforeEach, after } = require('node:test');
const assert = require('node:assert/strict');
const { MongoMemoryServer } = require('mongodb-memory-server');

// Spin up an in-process MongoDB and point the app at it BEFORE the app
// (and therefore db.js / the service) reads the connection settings.
let mongod;
let db;
let service;
let request;
let app;

before(async () => {
  mongod = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongod.getUri();
  process.env.MONGODB_DB = 'books_test';

  db = require('../api/db');
  service = require('../api/services/books.service');
  request = require('supertest');
  app = require('../api/app');

  await db.connect();
  // connect() is idempotent: a second call returns the same handle.
  assert.equal(await db.connect(), db.getDb());
});

beforeEach(async () => {
  await db.getDb().collection('books').deleteMany({});
  await service.seed();
});

after(async () => {
  await db.close();
  await db.close(); // safe to call when already closed
  await mongod.stop();
});

test('GET / returns the API index', async () => {
  const res = await request(app).get('/');
  assert.equal(res.status, 200);
  assert.equal(res.body.name, 'fsep-node-express-api');
  assert.deepEqual(res.body.endpoints, ['/health', '/api/books', '/api-docs']);
});

test('GET /api-docs serves the Swagger UI page', async () => {
  const res = await request(app).get('/api-docs/');
  assert.equal(res.status, 200);
  assert.match(res.headers['content-type'], /text\/html/);
  assert.match(res.text, /swagger-ui/i);
});

test('GET /api-docs.json serves the OpenAPI spec', async () => {
  const res = await request(app).get('/api-docs.json');
  assert.equal(res.status, 200);
  assert.equal(res.body.openapi, '3.0.3');
  assert.ok(res.body.paths['/api/books']);
  assert.ok(res.body.paths['/api/books/{id}']);
});

test('responses carry CORS headers for cross-origin callers', async () => {
  const res = await request(app).get('/api/books').set('Origin', 'https://das77.github.io');
  assert.equal(res.headers['access-control-allow-origin'], '*');
});

test('GET /health returns ok when the database is reachable', async () => {
  const res = await request(app).get('/health');
  assert.equal(res.status, 200);
  assert.deepEqual(res.body, { status: 'ok' });
});

test('GET /api/books returns the six seeded books', async () => {
  const res = await request(app).get('/api/books');
  assert.equal(res.status, 200);
  assert.equal(res.body.length, 6);
  assert.equal(res.body[0].title, 'Dune');
  assert.match(res.body[0].id, /^[a-f0-9]{24}$/);
});

test('GET /api/books?genre= filters by exact genre', async () => {
  const res = await request(app).get('/api/books?genre=fantasy');
  assert.equal(res.status, 200);
  assert.equal(res.body.length, 3);
  assert.ok(res.body.every((b) => b.genre === 'fantasy'));
});

test('GET /api/books?author= matches case-insensitive substrings', async () => {
  const res = await request(app).get('/api/books?author=le%20guin');
  assert.equal(res.status, 200);
  assert.deepEqual(
    res.body.map((b) => b.title).sort(),
    ['A Wizard of Earthsea', 'The Left Hand of Darkness'],
  );
});

test('genre and author filters compose', async () => {
  const res = await request(app).get('/api/books?author=Herbert&genre=fantasy');
  assert.equal(res.status, 200);
  assert.deepEqual(res.body, []);
});

test('GET /api/books/:id returns one book', async () => {
  const { body: list } = await request(app).get('/api/books');
  const dune = list.find((b) => b.title === 'Dune');
  const res = await request(app).get(`/api/books/${dune.id}`);
  assert.equal(res.status, 200);
  assert.equal(res.body.title, 'Dune');
  assert.equal(res.body.id, dune.id);
});

test('GET /api/books/:id → 404 for a well-formed but unknown id', async () => {
  const res = await request(app).get('/api/books/000000000000000000000000');
  assert.equal(res.status, 404);
  assert.match(res.body.error, /not found/);
});

test('malformed ids → 400 on GET, PUT, and DELETE', async () => {
  for (const id of ['abc', '1.5', '-2', '0', '123', 'zzzzzzzzzzzzzzzzzzzzzzzz']) {
    const res = await request(app).get(`/api/books/${id}`);
    assert.equal(res.status, 400, `GET id=${id}`);
    assert.match(res.body.error, /Invalid book id/);
  }
  assert.equal((await request(app).put('/api/books/abc').send({})).status, 400);
  assert.equal((await request(app).delete('/api/books/abc')).status, 400);
});

test('POST /api/books creates a book with 201 and Location header', async () => {
  const res = await request(app).post('/api/books').send({
    title: 'Hyperion',
    author: 'Dan Simmons',
    genre: 'science-fiction',
    year: 1989,
  });
  assert.equal(res.status, 201);
  assert.match(res.body.id, /^[a-f0-9]{24}$/);
  assert.equal(res.headers.location, `/api/books/${res.body.id}`);

  // Mutation is persisted: it comes back on a fresh read.
  const list = await request(app).get('/api/books');
  assert.equal(list.body.length, 7);
  assert.ok(list.body.some((b) => b.title === 'Hyperion'));
});

test('POST with an invalid body → 400 listing every failing field', async () => {
  const res = await request(app)
    .post('/api/books')
    .send({ title: '   ', author: 42, genre: 'horror', year: 'old' });
  assert.equal(res.status, 400);
  assert.equal(res.body.error, 'Validation failed');
  assert.equal(res.body.details.length, 4);
});

test('POST with no body at all → 400', async () => {
  const res = await request(app).post('/api/books');
  assert.equal(res.status, 400);
  assert.equal(res.body.details.length, 4);
});

test('POST rejects out-of-range years', async () => {
  const base = { title: 'X', author: 'Y', genre: 'fantasy' };
  const tooEarly = await request(app).post('/api/books').send({ ...base, year: -1 });
  const tooLate = await request(app)
    .post('/api/books')
    .send({ ...base, year: new Date().getFullYear() + 2 });
  assert.equal(tooEarly.status, 400);
  assert.equal(tooLate.status, 400);
});

test('PUT /api/books/:id replaces a book', async () => {
  const { body: created } = await request(app).post('/api/books').send({
    title: 'Hyperion',
    author: 'Dan Simmons',
    genre: 'science-fiction',
    year: 1989,
  });
  const res = await request(app).put(`/api/books/${created.id}`).send({
    title: 'Hyperion',
    author: 'Dan Simmons',
    genre: 'science-fiction',
    year: 1990,
  });
  assert.equal(res.status, 200);
  assert.equal(res.body.year, 1990);
  assert.equal(res.body.id, created.id);
});

test('PUT with an invalid body → 400', async () => {
  const { body: list } = await request(app).get('/api/books');
  const res = await request(app)
    .put(`/api/books/${list[0].id}`)
    .send({ title: 'Only a title' });
  assert.equal(res.status, 400);
});

test('PUT to a well-formed but unknown id → 404', async () => {
  const res = await request(app).put('/api/books/000000000000000000000000').send({
    title: 'Ghost',
    author: 'Nobody',
    genre: 'fantasy',
    year: 2000,
  });
  assert.equal(res.status, 404);
});

test('DELETE /api/books/:id → 204, then the book is gone', async () => {
  const { body: created } = await request(app).post('/api/books').send({
    title: 'Hyperion',
    author: 'Dan Simmons',
    genre: 'science-fiction',
    year: 1989,
  });
  assert.equal((await request(app).delete(`/api/books/${created.id}`)).status, 204);
  assert.equal((await request(app).get(`/api/books/${created.id}`)).status, 404);
  assert.equal((await request(app).delete(`/api/books/${created.id}`)).status, 404);
});

test('unmatched routes → 404 JSON', async () => {
  const res = await request(app).get('/api/nope');
  assert.equal(res.status, 404);
  assert.deepEqual(res.body, { error: 'Not Found' });
});

// --- service-level checks for paths not reachable through the routes ---

test('service.getById rejects a non-ObjectId string with a 404 error', async () => {
  await assert.rejects(() => service.getById('not-an-object-id'), (err) => {
    assert.equal(err.status, 404);
    return true;
  });
});

test('service.seed is a no-op when the collection already has documents', async () => {
  const before = await db.getDb().collection('books').countDocuments();
  await service.seed();
  const after = await db.getDb().collection('books').countDocuments();
  assert.equal(before, after);
});

// Must run last: it tears the connection down to exercise the failure paths.
test('GET /health → 503 and db.getDb() throws once the connection is closed', async () => {
  await db.close();
  const res = await request(app).get('/health');
  assert.equal(res.status, 503);
  assert.deepEqual(res.body, { status: 'unavailable' });
  assert.throws(() => db.getDb(), /not connected/);
});
