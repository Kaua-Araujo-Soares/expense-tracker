const pool = require('../models/db')

// Returns a financial summary: total income, total expenses and balance for the period
const getSummary = async (req, res) => {
  const { mes } = req.query
  try {
    let filter = ''
    const params = [req.userId]

    // Filter by month if the ?mes=YYYY-MM query param is provided
    if (mes) {
      params.push(mes)
      filter = `AND TO_CHAR(date, 'YYYY-MM') = $${params.length}`
    }

    const result = await pool.query(
      `SELECT
        COALESCE(SUM(CASE WHEN type = 'receita' THEN amount ELSE 0 END), 0) AS total_receitas,
        COALESCE(SUM(CASE WHEN type = 'despesa' THEN amount ELSE 0 END), 0) AS total_despesas,
        COALESCE(SUM(CASE WHEN type = 'receita' THEN amount ELSE -amount END), 0) AS saldo
      FROM transactions
      WHERE user_id = $1 ${filter}`,
      params
    )

    res.json(result.rows[0])
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar resumo' })
  }
}

// Groups spending by category — handy for charts and visual breakdowns
const getByCategory = async (req, res) => {
  const { mes } = req.query
  try {
    let filter = ''
    const params = [req.userId]

    if (mes) {
      params.push(mes)
      filter = `AND TO_CHAR(t.date, 'YYYY-MM') = $${params.length}`
    }

    const result = await pool.query(
      `SELECT
        c.name AS categoria,
        t.type AS tipo,
        COALESCE(SUM(t.amount), 0) AS total
      FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.id
      WHERE t.user_id = $1 ${filter}
      GROUP BY c.name, t.type
      ORDER BY total DESC`,
      params
    )

    res.json(result.rows)
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar por categoria' })
  }
}

module.exports = { getSummary, getByCategory }
