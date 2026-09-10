const fs = require('fs/promises');
const path = require('path');
const { ObjectId } = require('mongodb');
const { getDb } = require('../db');

const COLLECTION = 'books';
const SEED_FILE = path.join(__dirname, '..', 'data', 'books.json');

function collection() {
  return getDb().collection(COLLECTION);
}

// MongoDB documents carry `_id` (ObjectId); the API contract exposes it as a
// string `id`. All reads go through this mapper so callers never see `_id`.
// Callers guarantee `doc` is non-null (they throw 404 first otherwise).
function toBook(doc) {
  const { _id, ...rest } = doc;
  return { id: _id.toString(), ...rest };
}

function notFound(id) {
  const err = new Error(`Book with id ${id} not found`);
  err.status = 404;
  return err;
}

// validateId middleware guarantees a well-formed 24-hex id before this runs,
// but getById is also called internally, so parse defensively.
function toObjectId(id) {
  if (!ObjectId.isValid(id)) throw notFound(id);
  return new ObjectId(id);
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Insert the seed books the first time the collection is empty. Called once
// on server start; safe to call repeatedly.
async function seed() {
  const col = collection();
  if ((await col.countDocuments()) > 0) return;

  const raw = await fs.readFile(SEED_FILE, 'utf8');
  const books = JSON.parse(raw);
  await col.insertMany(books);
}

async function getAll({ genre, author } = {}) {
  const filter = {};
  if (genre) filter.genre = genre;
  if (author) filter.author = { $regex: escapeRegex(author), $options: 'i' };

  // Sort by _id so results follow insertion order deterministically.
  const docs = await collection().find(filter).sort({ _id: 1 }).toArray();
  return docs.map(toBook);
}

async function getById(id) {
  const doc = await collection().findOne({ _id: toObjectId(id) });
  if (!doc) throw notFound(id);
  return toBook(doc);
}

async function create({ title, author, genre, year }) {
  const { insertedId } = await collection().insertOne({ title, author, genre, year });
  return toBook({ _id: insertedId, title, author, genre, year });
}

async function update(id, { title, author, genre, year }) {
  const doc = await collection().findOneAndUpdate(
    { _id: toObjectId(id) },
    { $set: { title, author, genre, year } },
    { returnDocument: 'after' },
  );
  if (!doc) throw notFound(id);
  return toBook(doc);
}

async function remove(id) {
  const { deletedCount } = await collection().deleteOne({ _id: toObjectId(id) });
  if (deletedCount === 0) throw notFound(id);
}

module.exports = { seed, getAll, getById, create, update, remove };
