// ─── Auth Guard ────────────────────────────────────────────
const token = localStorage.getItem('expense_token')
if (!token) window.location.replace('index.html')

// ─── Constants ────────────────────────────────────────────
const API = ''  // same origin
const HEADERS = () => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${token}`,
})

// Palette for pie chart slices
const COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#f59e0b',
  '#22c55e', '#3b82f6', '#ef4444', '#14b8a6',
  '#f97316', '#a855f7', '#06b6d4', '#84cc16',
]

let pieChart = null  // Chart.js instance

// ─── Helpers ──────────────────────────────────────────────
function formatUSD(value) {
  return Number(value).toLocaleString('en-US', { style: 'currency', currency: 'USD' })
}

function currentMonth() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

// ─── Month Selects (English, locale-independent) ──────────
const MONTHS_EN = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December'
]

function buildMonthSelects() {
  const mSel = document.getElementById('month-select')
  const ySel = document.getElementById('year-select')
  const now  = new Date()

  MONTHS_EN.forEach((name, i) => {
    const opt = document.createElement('option')
    opt.value = String(i + 1).padStart(2, '0')
    opt.textContent = name
    mSel.appendChild(opt)
  })

  for (let y = now.getFullYear() + 1; y >= 2020; y--) {
    const opt = document.createElement('option')
    opt.value = y
    opt.textContent = y
    ySel.appendChild(opt)
  }

  // Default: current month / year
  mSel.value = String(now.getMonth() + 1).padStart(2, '0')
  ySel.value = now.getFullYear()
}

function getSelectedMonth() {
  const m = document.getElementById('month-select').value
  const y = document.getElementById('year-select').value
  return `${y}-${m}`
}

function logout() {
  localStorage.removeItem('expense_token')
  window.location.replace('index.html')
}

// ─── Decode JWT (payload only, no validation) ──────────────
function decodeToken(jwt) {
  try {
    const payload = jwt.split('.')[1]
    return JSON.parse(atob(payload))
  } catch {
    return null
  }
}

// ─── Populate navbar user info ─────────────────────────────
function initUserInfo() {
  const data = decodeToken(token)
  if (!data) return

  const name = data.name || data.email || 'User'
  document.getElementById('user-name').textContent = name
  document.getElementById('user-avatar').textContent = name.charAt(0).toUpperCase()
}

// ─── Fetch Summary Cards ───────────────────────────────────
async function fetchSummary(mes) {
  const qs  = mes ? `?mes=${mes}` : ''
  const res = await fetch(`/reports/summary${qs}`, { headers: HEADERS() })

  if (res.status === 401) { logout(); return }
  if (!res.ok) throw new Error('Failed to fetch summary')

  return res.json()
}

function renderSummary({ total_receitas, total_despesas, saldo }) {
  document.getElementById('val-income').textContent  = formatUSD(total_receitas)
  document.getElementById('val-expense').textContent = formatUSD(total_despesas)
  document.getElementById('val-balance').textContent = formatUSD(saldo)

  const balanceCard = document.getElementById('card-balance')
  balanceCard.classList.toggle('negative', Number(saldo) < 0)
}

// ─── Fetch By Category ─────────────────────────────────────
async function fetchByCategory(mes) {
  const qs  = mes ? `?mes=${mes}` : ''
  const res = await fetch(`/reports/by-category${qs}`, { headers: HEADERS() })

  if (res.status === 401) { logout(); return }
  if (!res.ok) throw new Error('Failed to fetch categories')

  return res.json()
}

// ─── Render Pie Chart ──────────────────────────────────────
function renderPie(rows) {
  const expenses = rows.filter(r => r.tipo === 'despesa')
  const empty    = document.getElementById('pie-empty')
  const canvas   = document.getElementById('chart-pie')
  const legend   = document.getElementById('pie-legend')

  if (!expenses.length) {
    canvas.style.display = 'none'
    empty.style.display  = 'flex'
    legend.innerHTML = ''
    if (pieChart) { pieChart.destroy(); pieChart = null }
    return
  }

  canvas.style.display = 'block'
  empty.style.display  = 'none'

  const labels = expenses.map(r => r.categoria || 'No category')
  const values = expenses.map(r => Number(r.total))
  const total  = values.reduce((a, b) => a + b, 0)
  const colors = expenses.map((_, i) => COLORS[i % COLORS.length])

  // Destroy previous instance to avoid canvas reuse errors
  if (pieChart) pieChart.destroy()

  pieChart = new Chart(canvas, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        data:            values,
        backgroundColor: colors,
        borderColor:     'rgba(13,17,23,0.8)',
        borderWidth:     3,
        hoverOffset:     6,
      }]
    },
    options: {
      responsive:  true,
      maintainAspectRatio: false,
      cutout:      '68%',
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: ctx => {
              const pct = ((ctx.parsed / total) * 100).toFixed(1)
              return ` ${formatUSD(ctx.parsed)} (${pct}%)`
            }
          },
          backgroundColor: 'rgba(22,27,34,0.95)',
          titleColor:      '#f0f6fc',
          bodyColor:       '#8b949e',
          borderColor:     'rgba(255,255,255,0.08)',
          borderWidth:     1,
          padding:         12,
          cornerRadius:    10,
        }
      }
    }
  })

  // Custom legend
  legend.innerHTML = expenses.map((r, i) => {
    const pct = ((Number(r.total) / total) * 100).toFixed(1)
    return `
      <div class="legend-item">
        <span class="legend-dot" style="background:${colors[i]}"></span>
        <span class="legend-name">${r.categoria || 'No category'}</span>
        <span class="legend-pct">${pct}%</span>
      </div>`
  }).join('')
}

// ─── Render Category List ──────────────────────────────────
function renderCategoryList(rows) {
  const container = document.getElementById('category-list')

  if (!rows.length) {
    container.innerHTML = `
      <div style="text-align:center;padding:32px 0;color:var(--text-muted);font-size:.85rem">
        No transactions in this period.
      </div>`
    return
  }

  container.innerHTML = rows.map((r, i) => {
    const color      = COLORS[i % COLORS.length]
    const isIncome   = r.tipo === 'receita'
    const typeClass  = isIncome ? 'receita' : 'despesa'  // keep CSS class
    const typeLabel  = isIncome ? 'Income' : 'Expense'
    const cat        = r.categoria || 'No category'
    return `
      <div class="category-row">
        <span class="cat-dot" style="background:${color}"></span>
        <span class="cat-name">${cat}</span>
        <span class="cat-type ${typeClass}">${typeLabel}</span>
        <span class="cat-total ${typeClass}">${formatUSD(r.total)}</span>
      </div>`
  }).join('')
}

// ─── Main Load ─────────────────────────────────────────────
async function loadDashboard(mes) {
  // Update badge
  const badge = document.getElementById('pie-badge')
  badge.textContent = mes
    ? new Date(`${mes}-01`).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : 'All months'

  // Skeleton on cards
  ;['val-income', 'val-expense', 'val-balance'].forEach(id => {
    const el = document.getElementById(id)
    el.textContent = '...'
    el.style.opacity = '0.4'
  })

  try {
    const [summary, categories] = await Promise.all([
      fetchSummary(mes),
      fetchByCategory(mes),
    ])

    renderSummary(summary)
    renderPie(categories)
    renderCategoryList(categories)

    ;['val-income', 'val-expense', 'val-balance'].forEach(id => {
      document.getElementById(id).style.opacity = '1'
    })

  } catch (err) {
    console.error('[Dashboard Error]', err)
  }
}

// ─── Month Picker ──────────────────────────────────────────
buildMonthSelects()

document.getElementById('month-select').addEventListener('change', () => {
  loadDashboard(getSelectedMonth())
})
document.getElementById('year-select').addEventListener('change', () => {
  loadDashboard(getSelectedMonth())
})

// ─── Init ──────────────────────────────────────────────────
initUserInfo()
loadDashboard(getSelectedMonth())
feather.replace()
