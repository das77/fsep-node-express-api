const { Router } = require('express');
const controller = require('../controllers/books.controller');
const validateBook = require('../middleware/validateBook');

const router = Router();

router.get('/', controller.listBooks);
router.get('/:id', controller.getBook);
router.post('/', validateBook, controller.createBook);
router.put('/:id', validateBook, controller.updateBook);
router.delete('/:id', controller.deleteBook);

module.exports = router;
