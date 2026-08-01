const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

// Point the service at a throwaway copy of the seed data BEFORE the app
// (and therefore the service) is loaded, so tests never touch the real file.
const SEED_FILE = path.join(__dirname, '..', 'src', 'data', 'books.json');
const TMP_FILE = path.join(os.tmpdir(), `books-test-${process.pid}.json`);
process.env.BOOKS_DATA_FILE = TMP_FILE;

const request = require('supertest');
const app = require('../src/app');

before(async () => {
  await fs.copyFile(SEED_FILE, TMP_FILE);
});

after(async () => {
  await fs.rm(TMP_FILE, { force: true });
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

test('GET /health returns ok', async () => {
  const res = await request(app).get('/health');
  assert.equal(res.status, 200);
  assert.deepEqual(res.body, { status: 'ok' });
});

test('GET /api/books returns the six seeded books', async () => {
  const res = await request(app).get('/api/books');
  assert.equal(res.status, 200);
  assert.equal(res.body.length, 6);
  assert.equal(res.body[0].title, 'Dune');
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
  const res = await request(app).get('/api/books/1');
  assert.equal(res.status, 200);
  assert.equal(res.body.title, 'Dune');
});

test('GET /api/books/:id → 404 for an unknown id', async () => {
  const res = await request(app).get('/api/books/99');
  assert.equal(res.status, 404);
  assert.match(res.body.error, /not found/);
});

test('malformed ids → 400 on GET, PUT, and DELETE', async () => {
  for (const id of ['abc', '1.5', '-2', '0']) {
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
  assert.equal(res.headers.location, '/api/books/7');
  assert.equal(res.body.id, 7);

  // Mutation is persisted to the data file, not just held in memory.
  const onDisk = JSON.parse(await fs.readFile(TMP_FILE, 'utf8'));
  assert.equal(onDisk.length, 7);
  assert.equal(onDisk[6].title, 'Hyperion');
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
  const res = await request(app).put('/api/books/7').send({
    title: 'Hyperion',
    author: 'Dan Simmons',
    genre: 'science-fiction',
    year: 1990,
  });
  assert.equal(res.status, 200);
  assert.equal(res.body.year, 1990);
  assert.equal(res.body.id, 7);
});

test('PUT with an invalid body → 400', async () => {
  const res = await request(app).put('/api/books/1').send({ title: 'Only a title' });
  assert.equal(res.status, 400);
});

test('PUT to an unknown id → 404', async () => {
  const res = await request(app).put('/api/books/99').send({
    title: 'Ghost',
    author: 'Nobody',
    genre: 'fantasy',
    year: 2000,
  });
  assert.equal(res.status, 404);
});

test('DELETE /api/books/:id → 204, then the book is gone', async () => {
  assert.equal((await request(app).delete('/api/books/7')).status, 204);
  assert.equal((await request(app).get('/api/books/7')).status, 404);
  assert.equal((await request(app).delete('/api/books/7')).status, 404);
});

test('unmatched routes → 404 JSON', async () => {
  const res = await request(app).get('/api/nope');
  assert.equal(res.status, 404);
  assert.deepEqual(res.body, { error: 'Not Found' });
});
