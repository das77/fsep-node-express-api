const { ObjectId } = require('mongodb');

// Rejects malformed :id params (anything that is not a canonical 24-hex
// MongoDB ObjectId) with a 400 before they reach the controllers.
function validateId(req, res, next) {
  const { id } = req.params;
  // ObjectId.isValid accepts 12-byte strings and 12-char strings too, so
  // round-trip to confirm the input is the canonical 24-hex form.
  if (!ObjectId.isValid(id) || new ObjectId(id).toString() !== id) {
    return res.status(400).json({ error: `Invalid book id: ${id}` });
  }
  next();
}

module.exports = validateId;
