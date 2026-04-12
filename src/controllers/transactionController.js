const pool = require('../models/db')

// Lists transactions for the logged-in user, with optional filters by month and category
const getTransactions = async (req, res) => {
  const { mes, category_id } = req.query
  try {
    // Start with the base query and append filters dynamically
    let query = 'SELECT * FROM transactions WHERE user_id = $1'
    const params = [req.userId]

    if (mes) {
      params.push(mes)
      query += ` AND TO_CHAR(date, 'YYYY-MM') = $${params.length}` // e.g. "2026-04"
    }

    if (category_id) {
      params.push(category_id)
      query += ` AND category_id = $${params.length}`
    }

    query += ' ORDER BY date DESC' // most recent first

    const result = await pool.query(query, params)
    res.json(result.rows)
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar transações' })
  }
}

// Creates a new transaction (income or expense) for the logged-in user
const createTransaction = async (req, res) => {
  const { description, amount, type, date, category_id } = req.body
  try {
    const result = await pool.query(
      'INSERT INTO transactions (description, amount, type, date, user_id, category_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [description, amount, type, date, req.userId, category_id]
    )
    res.status(201).json(result.rows[0])
  } catch (err) {
    res.status(500).json({ error: 'Erro ao criar transação' })
  }
}

// Updates an existing transaction — only allows editing the user's own records
const updateTransaction = async (req, res) => {
  const { id } = req.params
  const { description, amount, type, date, category_id } = req.body
  try {
    const result = await pool.query(
      'UPDATE transactions SET description=$1, amount=$2, type=$3, date=$4, category_id=$5 WHERE id=$6 AND user_id=$7 RETURNING *',
      [description, amount, type, date, category_id, id, req.userId]
    )
    res.json(result.rows[0])
  } catch (err) {
    res.status(500).json({ error: 'Erro ao atualizar transação' })
  }
}

// Deletes a transaction — the user_id condition ensures no one can delete another user's data
const deleteTransaction = async (req, res) => {
  const { id } = req.params
  try {
    await pool.query(
      'DELETE FROM transactions WHERE id = $1 AND user_id = $2',
      [id, req.userId]
    )
    res.json({ message: 'Transação deletada' })
  } catch (err) {
    res.status(500).json({ error: 'Erro ao deletar transação' })
  }
}

module.exports = { getTransactions, createTransaction, updateTransaction, deleteTransaction }
