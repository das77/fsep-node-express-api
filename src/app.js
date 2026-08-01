const express = require('express');
const booksRouter = require('./routes/books.routes');
const requestLogger = require('./middleware/requestLogger');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');

const app = express();

app.use(express.json());
app.use(requestLogger);

app.get('/', (req, res) => {
  res.json({
    name: 'fsep-node-express-api',
    endpoints: ['/health', '/api/books'],
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/books', booksRouter);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
