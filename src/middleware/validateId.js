// Rejects malformed :id params (e.g. /api/books/abc) with a 400
// before they reach the controllers, where they would 404 as "id NaN".
function validateId(req, res, next) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) {
    return res.status(400).json({ error: `Invalid book id: ${req.params.id}` });
  }
  next();
}

module.exports = validateId;
