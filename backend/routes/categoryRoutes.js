const router = require('express').Router();
const categoryController = require('../controllers/categoryController');
const { authMiddleware, adminOnly } = require('../middleware/authMiddleware');

router.get('/', categoryController.getCategories);
router.post('/', authMiddleware, adminOnly, categoryController.addCategory);
router.delete('/:id', authMiddleware, adminOnly, categoryController.deleteCategory);

module.exports = router;