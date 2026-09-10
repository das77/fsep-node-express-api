const ALLOWED_GENRES = ['science-fiction', 'fantasy'];

// Validates the request body for POST/PUT /api/books.
function validateBook(req, res, next) {
  const { title, author, genre, year } = req.body ?? {};
  const errors = [];

  if (typeof title !== 'string' || title.trim() === '') {
    errors.push('title is required and must be a non-empty string');
  }
  if (typeof author !== 'string' || author.trim() === '') {
    errors.push('author is required and must be a non-empty string');
  }
  if (!ALLOWED_GENRES.includes(genre)) {
    errors.push(`genre must be one of: ${ALLOWED_GENRES.join(', ')}`);
  }
  if (!Number.isInteger(year) || year < 0 || year > new Date().getFullYear() + 1) {
    errors.push('year must be a valid publication year');
  }

  if (errors.length > 0) {
    return res.status(400).json({ error: 'Validation failed', details: errors });
  }
  next();
}

module.exports = validateBook;
