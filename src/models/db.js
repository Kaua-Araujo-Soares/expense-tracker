const { Pool } = require('pg')

// Hardcoded credentials for local testing — move to .env before going to production
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
})

// Test the database connection as soon as this module is loaded
pool.connect()
  .then(() => console.log('Conectado ao PostgreSQL!'))
  .catch(err => console.error('Erro ao conectar:', err))

module.exports = pool