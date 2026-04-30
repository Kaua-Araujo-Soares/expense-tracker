const pool = require('../models/db')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')

// Registers a new user in the system
const register = async (req, res) => {
  const { name, email, password } = req.body

  try {
    // Check if someone already signed up with this email
    const userExists = await pool.query(
      'SELECT id FROM users WHERE email = $1', [email]
    )

    if (userExists.rows.length > 0) {
      return res.status(400).json({ error: 'Email já cadastrado' })
    }

    // Never store plain text passwords — bcrypt hashes it with 10 salt rounds
    const hashedPassword = await bcrypt.hash(password, 10)

    const result = await pool.query(
      'INSERT INTO users (name, email, password) VALUES ($1, $2, $3) RETURNING id, name, email',
      [name, email, hashedPassword]
    )

    res.status(201).json({ user: result.rows[0] })
  } catch (err) {
    res.status(500).json({ error: 'Erro ao cadastrar usuário' })
  }
}

// Logs in a user and returns a JWT token valid for 7 days
const login = async (req, res) => {
  const { email, password } = req.body

  try {
    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1', [email]
    )

    // Same error message for both wrong email and wrong password
    // this prevents attackers from figuring out which emails are registered
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Email ou senha inválidos' })
    }

    const user = result.rows[0]
    const validPassword = await bcrypt.compare(password, user.password)

    if (!validPassword) {
      return res.status(401).json({ error: 'Email ou senha inválidos' })
    }

    // Sign the token with the user's id and email — no sensitive data inside
    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    )

    res.json({ token, user: { id: user.id, name: user.name, email: user.email } })
  } catch (err) {
    res.status(500).json({ error: 'Erro ao fazer login' })
  }
}

module.exports = { register, login }
