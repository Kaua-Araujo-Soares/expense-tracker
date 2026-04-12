const express = require('express')
const router = express.Router()
const authMiddleware = require('../middlewares/authMiddleware')
const { getSummary, getByCategory } = require('../controllers/summaryController')

router.use(authMiddleware)

router.get('/summary', getSummary)
router.get('/by-category', getByCategory)

module.exports = router
