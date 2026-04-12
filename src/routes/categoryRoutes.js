const express = require('express')
const router = express.Router()
const authMiddleware = require('../middlewares/authMiddleware')
const { getCategories, createCategory, deleteCategory } = require('../controllers/categoryController')

router.use(authMiddleware)

router.get('/', getCategories)
router.post('/', createCategory)
router.delete('/:id', deleteCategory)

module.exports = router
