const { Router } = require('express');
const controller = require('../controllers/books.controller');
const validateBook = require('../middleware/validateBook');
const validateId = require('../middleware/validateId');

const router = Router();

router.get('/', controller.listBooks);
router.get('/:id', validateId, controller.getBook);
router.post('/', validateBook, controller.createBook);
router.put('/:id', validateId, validateBook, controller.updateBook);
router.delete('/:id', validateId, controller.deleteBook);

module.exports = router;
