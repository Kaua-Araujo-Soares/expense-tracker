const express = require('express')
const router = express.Router()
const authMiddleware = require('../middlewares/authMiddleware')
const { getTransactions, createTransaction, updateTransaction, deleteTransaction } = require('../controllers/transactionController')

router.use(authMiddleware)

router.get('/', getTransactions)
router.post('/', createTransaction)
router.put('/:id', updateTransaction)
router.delete('/:id', deleteTransaction)

module.exports = router
