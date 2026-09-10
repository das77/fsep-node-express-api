const express = require('express');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');
const openapiSpec = require('./docs/openapi.json');
const db = require('./db');
const booksRouter = require('./routes/books.routes');
const requestLogger = require('./middleware/requestLogger');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');

const app = express();

// Open CORS: this is a public demo API with no credentials, and the
// GitHub Pages Swagger UI calls it cross-origin.
app.use(cors());
app.use(express.json());
app.use(requestLogger);

app.get('/', (req, res) => {
  res.json({
    name: 'fsep-node-express-api',
    endpoints: ['/health', '/api/books', '/api-docs'],
  });
});

// Reports unhealthy if the MongoDB connection can't be reached, so the
// container HEALTHCHECK fails when the database is down.
app.get('/health', async (req, res) => {
  try {
    await db.getDb().command({ ping: 1 });
    res.json({ status: 'ok' });
  } catch {
    res.status(503).json({ status: 'unavailable' });
  }
});

app.use('/api/books', booksRouter);

// Interactive API docs; the raw spec is also exposed for tooling.
app.get('/api-docs.json', (req, res) => res.json(openapiSpec));
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(openapiSpec));

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
