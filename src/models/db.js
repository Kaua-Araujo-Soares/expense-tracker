const { Pool } = require('pg')

// Hardcoded credentials for local testing — move to .env before going to production
const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'expense_tracker',
  user: 'postgres',
  password: '123456',
})

// Test the database connection as soon as this module is loaded
pool.connect()
  .then(() => console.log('Conectado ao PostgreSQL!'))
  .catch(err => console.error('Erro ao conectar:', err))

module.exports = pool