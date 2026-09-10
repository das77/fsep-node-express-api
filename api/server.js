require('dotenv').config();
const app = require('./app');
const db = require('./db');
const { seed } = require('./services/books.service');

const PORT = process.env.PORT ?? 3000;

async function start() {
  await db.connect();
  await seed();
  app.listen(PORT, () => {
    console.log(`Server listening on http://localhost:${PORT}`);
  });
}

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
