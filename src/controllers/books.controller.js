const booksService = require('../services/books.service');

// Express 5 forwards rejected promises from async handlers to the
// error-handling middleware, so no try/catch wrappers are needed here.

async function listBooks(req, res) {
  const books = await booksService.getAll({
    genre: req.query.genre,
    author: req.query.author,
  });
  res.status(200).json(books);
}

async function getBook(req, res) {
  const book = await booksService.getById(Number(req.params.id));
  res.status(200).json(book);
}

async function createBook(req, res) {
  const book = await booksService.create(req.body);
  res.status(201).location(`/api/books/${book.id}`).json(book);
}

async function updateBook(req, res) {
  const book = await booksService.update(Number(req.params.id), req.body);
  res.status(200).json(book);
}

async function deleteBook(req, res) {
  await booksService.remove(Number(req.params.id));
  res.status(204).end();
}

module.exports = { listBooks, getBook, createBook, updateBook, deleteBook };
