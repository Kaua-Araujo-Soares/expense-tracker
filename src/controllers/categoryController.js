const pool = require('../models/db')

// Returns all categories belonging to the logged-in user, sorted alphabetically
const getCategories = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM categories WHERE user_id = $1 ORDER BY name',
      [req.userId]
    )
    res.json(result.rows)
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar categorias' })
  }
}

// Creates a new category tied to the logged-in user
const createCategory = async (req, res) => {
  const { name } = req.body
  try {
    const result = await pool.query(
      'INSERT INTO categories (name, user_id) VALUES ($1, $2) RETURNING *',
      [name, req.userId]
    )
    res.status(201).json(result.rows[0])
  } catch (err) {
    res.status(500).json({ error: 'Erro ao criar categoria' })
  }
}

// Deletes a category — only allows deleting the user's own categories
const deleteCategory = async (req, res) => {
  const { id } = req.params
  try {
    await pool.query(
      'DELETE FROM categories WHERE id = $1 AND user_id = $2',
      [id, req.userId]
    )
    res.json({ message: 'Categoria deletada' })
  } catch (err) {
    res.status(500).json({ error: 'Erro ao deletar categoria' })
  }
}

module.exports = { getCategories, createCategory, deleteCategory }
