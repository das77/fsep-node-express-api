const { test, mock } = require('node:test');
const assert = require('node:assert/strict');

const { errorHandler, notFoundHandler } = require('../src/middleware/errorHandler');

// Minimal res double capturing what the middleware sends.
function mockRes() {
  return {
    code: null,
    body: null,
    status(c) {
      this.code = c;
      return this;
    },
    json(b) {
      this.body = b;
    },
  };
}

test('errorHandler translates err.status into the response', () => {
  const res = mockRes();
  const err = new Error('Book with id 9 not found');
  err.status = 404;
  errorHandler(err, {}, res, () => {});
  assert.equal(res.code, 404);
  assert.deepEqual(res.body, { error: 'Book with id 9 not found' });
});

test('errorHandler defaults to 500 and logs unexpected errors', () => {
  const logged = mock.method(console, 'error', () => {});
  try {
    const res = mockRes();
    errorHandler(new Error('boom'), {}, res, () => {});
    assert.equal(res.code, 500);
    assert.deepEqual(res.body, { error: 'boom' });
    assert.equal(logged.mock.callCount(), 1);
  } finally {
    logged.mock.restore();
  }
});

test('errorHandler falls back to a generic message when the error has none', () => {
  const logged = mock.method(console, 'error', () => {});
  try {
    const res = mockRes();
    errorHandler({}, {}, res, () => {});
    assert.equal(res.code, 500);
    assert.deepEqual(res.body, { error: 'Internal Server Error' });
  } finally {
    logged.mock.restore();
  }
});

test('notFoundHandler always answers 404 JSON', () => {
  const res = mockRes();
  notFoundHandler({}, res);
  assert.equal(res.code, 404);
  assert.deepEqual(res.body, { error: 'Not Found' });
});
