const fs = require('fs/promises');
const path = require('path');

// BOOKS_DATA_FILE lets tests point the store at a throwaway copy of the
// seed data instead of mutating the real file.
const DATA_FILE = process.env.BOOKS_DATA_FILE
  ? path.resolve(process.env.BOOKS_DATA_FILE)
  : path.join(__dirname, '..', 'data', 'books.json');

// In-memory cache of the JSON file; loaded once, persisted on every mutation.
let books = null;

async function load() {
  if (books === null) {
    const raw = await fs.readFile(DATA_FILE, 'utf8');
    books = JSON.parse(raw);
  }
  return books;
}

async function persist() {
  await fs.writeFile(DATA_FILE, JSON.stringify(books, null, 2) + '\n', 'utf8');
}

function notFound(id) {
  const err = new Error(`Book with id ${id} not found`);
  err.status = 404;
  return err;
}

async function getAll({ genre, author } = {}) {
  let result = await load();
  if (genre) {
    result = result.filter((b) => b.genre === genre);
  }
  if (author) {
    const needle = author.toLowerCase();
    result = result.filter((b) => b.author.toLowerCase().includes(needle));
  }
  return result;
}

async function getById(id) {
  const all = await load();
  const book = all.find((b) => b.id === id);
  if (!book) throw notFound(id);
  return book;
}

async function create({ title, author, genre, year }) {
  const all = await load();
  const nextId = all.reduce((max, b) => Math.max(max, b.id), 0) + 1;
  const book = { id: nextId, title, author, genre, year };
  all.push(book);
  await persist();
  return book;
}

async function update(id, { title, author, genre, year }) {
  const book = await getById(id);
  Object.assign(book, { title, author, genre, year });
  await persist();
  return book;
}

async function remove(id) {
  const all = await load();
  const index = all.findIndex((b) => b.id === id);
  if (index === -1) throw notFound(id);
  all.splice(index, 1);
  await persist();
}

module.exports = { getAll, getById, create, update, remove };
