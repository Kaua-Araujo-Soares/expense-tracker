const express = require('express')
const dotenv = require('dotenv')
const authRoutes = require('./routes/authRoutes')
const categoryRoutes = require('./routes/categoryRoutes')
const transactionRoutes = require('./routes/transactionRoutes')
const summaryRoutes = require('./routes/summaryRoutes')

dotenv.config()

const app = express()
app.use(express.json()) // enables JSON body parsing on all requests

const PORT = process.env.PORT || 3000

// Public routes (no authentication required)
app.use('/auth', authRoutes)

// Protected routes — all require a valid JWT token
app.use('/categories', categoryRoutes)
app.use('/transactions', transactionRoutes)
app.use('/reports', summaryRoutes)

// Root route just to confirm the API is up and running
app.get('/', (req, res) => {
  res.json({ message: 'Expense Tracker API funcionando!' })
})

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`)
})
