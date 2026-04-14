// ─── Auth Guard ────────────────────────────────────────────
const token = localStorage.getItem('expense_token')
if (!token) window.location.replace('index.html')

// ─── Constants ────────────────────────────────────────────
const HEADERS = () => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${token}`,
})

// ─── State ────────────────────────────────────────────────
let allTransactions = []   // raw API data
let categories      = []   // [{id, name}]
let editingId       = null // null = create mode
let deleteTargetId  = null
let typeFilter      = 'all'
let selectedType    = 'expense'

// ─── Helpers ──────────────────────────────────────────────
function formatUSD(value) {
  return Number(value).toLocaleString('en-US', { style: 'currency', currency: 'USD' })
}

function formatDate(dateStr) {
  // dateStr comes as ISO "2026-04-12T00:00:00.000Z" or "2026-04-12"
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', { timeZone: 'UTC' })
}

function toInputDate(dateStr) {
  // Returns "YYYY-MM-DD" for input[type=date]
  return dateStr ? dateStr.slice(0, 10) : ''
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

function decodeToken(jwt) {
  try { return JSON.parse(atob(jwt.split('.')[1])) } catch { return null }
}

// ─── User info ────────────────────────────────────────────
function initUserInfo() {
  const data = decodeToken(token)
  if (!data) return
  const name = data.name || data.email || 'User'
  document.getElementById('user-name').textContent  = name
  document.getElementById('user-avatar').textContent = name.charAt(0).toUpperCase()
}

// ─── Alerts ───────────────────────────────────────────────
function showPageAlert(msg) {
  const el = document.getElementById('page-alert')
  document.getElementById('page-alert-msg').textContent = msg
  el.classList.add('visible')
  setTimeout(() => el.classList.remove('visible'), 5000)
}

function showModalAlert(msg) {
  const el = document.getElementById('modal-alert')
  document.getElementById('modal-alert-msg').textContent = msg
  el.classList.add('visible')
}

function hideModalAlert() {
  document.getElementById('modal-alert').classList.remove('visible')
}

function showFieldError(id) {
  document.getElementById(id)?.classList.add('visible')
}

function clearFormErrors() {
  document.querySelectorAll('#modal-form .form-error').forEach(el => el.classList.remove('visible'))
}

// ─── Categories ────────────────────────────────────────────
async function fetchCategories() {
  try {
    const res  = await fetch('/categories', { headers: HEADERS() })
    if (res.status === 401) { logout(); return }
    categories = await res.json()

    const select = document.getElementById('tx-category')
    const currentVal = select.value
    select.innerHTML = '<option value="">No category</option>'
    categories.forEach(c => {
      const opt = document.createElement('option')
      opt.value = c.id
      opt.textContent = c.name
      select.appendChild(opt)
    })
    select.value = currentVal
  } catch (err) {
    console.error('[Categories Error]', err)
  }
}

function categoryName(id) {
  const cat = categories.find(c => String(c.id) === String(id))
  return cat ? cat.name : '—'
}

// ─── Fetch Transactions ────────────────────────────────────
async function fetchTransactions(mes) {
  const qs  = mes ? `?mes=${mes}` : ''
  const res = await fetch(`/transactions${qs}`, { headers: HEADERS() })
  if (res.status === 401) { logout(); return [] }
  if (!res.ok) throw new Error('Failed to fetch transactions')
  return res.json()
}

// ─── Render Table ──────────────────────────────────────────
function renderTable(rows) {
  const tbody      = document.getElementById('tx-tbody')
  const emptyState = document.getElementById('empty-state')
  const countEl    = document.getElementById('tx-count')

  if (!rows.length) {
    tbody.innerHTML  = ''
    emptyState.style.display = 'flex'
    countEl.textContent      = 'No transactions found'
    return
  }

  emptyState.style.display = 'none'
  countEl.textContent = `${rows.length} transaction${rows.length === 1 ? '' : 's'}`

  tbody.innerHTML = rows.map(tx => {
    const catName   = categoryName(tx.category_id)
    const isIncome  = tx.type === 'receita'
    const typeIcon  = isIncome ? 'trending-up' : 'trending-down'
    const sign      = isIncome ? '+' : '-'
    const typeLabel = isIncome ? 'Income' : 'Expense'
    const typeClass = isIncome ? 'receita' : 'despesa'  // keep CSS class as-is
    return `
      <tr data-id="${tx.id}" data-type="${tx.type}" data-desc="${tx.description.toLowerCase()}">
        <td class="td-description" title="${tx.description}">${tx.description}</td>
        <td class="td-category">${catName}</td>
        <td class="td-date">${formatDate(tx.date)}</td>
        <td>
          <span class="type-badge ${typeClass}">
            <i data-feather="${typeIcon}"></i>
            ${typeLabel}
          </span>
        </td>
        <td class="td-amount ${typeClass}">${sign} ${formatUSD(tx.amount)}</td>
        <td class="td-actions">
          <button class="action-btn edit"   title="Edit"   onclick="openEditModal(${tx.id})"><i data-feather="edit-2"></i></button>
          <button class="action-btn delete" title="Delete" onclick="openConfirm(${tx.id}, '${tx.description.replace(/'/g, "\\'")}')" ><i data-feather="trash-2"></i></button>
        </td>
      </tr>`
  }).join('')

  feather.replace()
  applyFilters()
}

// ─── Client-side filter (search + type) ───────────────────
function applyFilters() {
  const query = document.getElementById('search-input').value.toLowerCase()
  const rows  = document.querySelectorAll('#tx-tbody tr[data-id]')

  rows.forEach(row => {
    const matchType = typeFilter === 'all' || row.dataset.type === typeFilter
    const matchSearch = !query || row.dataset.desc.includes(query)
    row.classList.toggle('hidden-row', !(matchType && matchSearch))
  })
}

function filterTable() { applyFilters() }

function setTypeFilter(type, btn) {
  typeFilter = type
  document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'))
  btn.classList.add('active')
  applyFilters()
}

// ─── Load ──────────────────────────────────────────────────
async function load(mes) {
  // Show skeleton
  document.getElementById('tx-tbody').innerHTML = `
    <tr class="skeleton-tr"><td colspan="6"><div class="skeleton-row"></div></td></tr>
    <tr class="skeleton-tr"><td colspan="6"><div class="skeleton-row"></div></td></tr>
    <tr class="skeleton-tr"><td colspan="6"><div class="skeleton-row"></div></td></tr>`

  try {
    const [txs] = await Promise.all([fetchTransactions(mes), fetchCategories()])
    allTransactions = txs
    renderTable(txs)
  } catch (err) {
    console.error('[Load Error]', err)
    showPageAlert('Failed to load transactions.')
  }
}

// ─── Type toggle ───────────────────────────────────────────
function setType(type) {
  selectedType = type
  document.getElementById('type-income').classList.toggle('active',  type === 'income')
  document.getElementById('type-expense').classList.toggle('active', type === 'expense')
}

// ─── Modal open/close ──────────────────────────────────────
function openModal() {
  editingId = null
  selectedType = 'expense'
  document.getElementById('modal-title').textContent = 'New Transaction'
  document.getElementById('btn-submit-label').textContent = 'Save'
  document.getElementById('modal-form').reset()
  document.getElementById('tx-id').value = ''
  clearFormErrors()
  hideModalAlert()
  setType('expense')
  // Default date = today
  document.getElementById('tx-date').value = new Date().toISOString().slice(0, 10)
  fetchCategories()
  toggleInlineCat(false)
  document.getElementById('modal-overlay').classList.add('open')
}

function openEditModal(id) {
  const tx = allTransactions.find(t => t.id === id)
  if (!tx) return

  editingId = id
  document.getElementById('modal-title').textContent      = 'Edit Transaction'
  document.getElementById('btn-submit-label').textContent = 'Update'
  document.getElementById('tx-id').value                  = tx.id
  document.getElementById('tx-description').value         = tx.description
  document.getElementById('tx-amount').value              = tx.amount
  document.getElementById('tx-date').value                = toInputDate(tx.date)
  clearFormErrors()
  hideModalAlert()
  // Map stored DB value (receita/despesa) back to UI type (income/expense)
  const uiType = tx.type === 'receita' ? 'income' : 'expense'
  setType(uiType)
  fetchCategories().then(() => {
    document.getElementById('tx-category').value = tx.category_id || ''
  })
  toggleInlineCat(false)
  document.getElementById('modal-overlay').classList.add('open')
}

function closeModal() {
  document.getElementById('modal-overlay').classList.remove('open')
  toggleInlineCat(false)
}

function handleOverlayClick(e) {
  if (e.target === document.getElementById('modal-overlay')) closeModal()
}

// ─── Delete Confirm ────────────────────────────────────────
function openConfirm(id, name) {
  deleteTargetId = id
  document.getElementById('confirm-tx-name').textContent = name
  document.getElementById('confirm-overlay').classList.add('open')
}

function closeConfirm() {
  document.getElementById('confirm-overlay').classList.remove('open')
  deleteTargetId = null
}

function handleConfirmOverlay(e) {
  if (e.target === document.getElementById('confirm-overlay')) closeConfirm()
}

// ─── Validate form ─────────────────────────────────────────
function validateForm() {
  clearFormErrors()
  let ok = true
  const desc   = document.getElementById('tx-description').value.trim()
  const amount = document.getElementById('tx-amount').value
  const date   = document.getElementById('tx-date').value

  if (!desc)                    { showFieldError('err-description'); ok = false }
  if (!amount || Number(amount) <= 0) { showFieldError('err-amount'); ok = false }
  if (!date)                    { showFieldError('err-date'); ok = false }
  return ok
}

// ─── Inline Category Creator ───────────────────────────────
function toggleInlineCat(show) {
  const wrap  = document.getElementById('inline-cat-wrap')
  const input = document.getElementById('inline-cat-input')
  const isVisible = wrap.classList.contains('visible')
  const shouldShow = (show === undefined) ? !isVisible : show

  wrap.classList.toggle('visible', shouldShow)
  feather.replace()

  if (shouldShow) {
    input.value = ''
    setTimeout(() => input.focus(), 80)
  }
}

async function saveInlineCat() {
  const input = document.getElementById('inline-cat-input')
  const name  = input.value.trim()
  if (!name) { input.focus(); return }

  try {
    const res = await fetch('/categories', {
      method:  'POST',
      headers: HEADERS(),
      body:    JSON.stringify({ name }),
    })
    if (res.status === 401) { logout(); return }
    if (!res.ok) { showModalAlert('Failed to create category.'); return }

    const cat = await res.json()
    // Reload dropdown and select new category
    await fetchCategories()
    document.getElementById('tx-category').value = cat.id
    toggleInlineCat(false)
  } catch {
    showModalAlert('Connection error. Please try again.')
  }
}

// Allow Enter to save inline cat
document.getElementById('inline-cat-input')?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') { e.preventDefault(); saveInlineCat() }
  if (e.key === 'Escape') toggleInlineCat(false)
})

// ─── Submit form ───────────────────────────────────────────
function setSubmitLoading(on) {
  const btn = document.getElementById('btn-submit')
  btn.disabled = on
  btn.classList.toggle('loading', on)
}

document.getElementById('modal-form').addEventListener('submit', async (e) => {
  e.preventDefault()
  if (!validateForm()) return
  hideModalAlert()

  const body = {
    description: document.getElementById('tx-description').value.trim(),
    amount:      parseFloat(document.getElementById('tx-amount').value),
    // Map UI type values to the API values stored in the DB
    type:        selectedType === 'income' ? 'receita' : 'despesa',
    date:        document.getElementById('tx-date').value,
    category_id: document.getElementById('tx-category').value || null,
  }

  setSubmitLoading(true)

  try {
    let res
    if (editingId) {
      res = await fetch(`/transactions/${editingId}`, {
        method:  'PUT',
        headers: HEADERS(),
        body:    JSON.stringify(body),
      })
    } else {
      res = await fetch('/transactions', {
        method:  'POST',
        headers: HEADERS(),
        body:    JSON.stringify(body),
      })
    }

    if (res.status === 401) { logout(); return }
    if (!res.ok) {
      const data = await res.json()
      showModalAlert(data.error || 'Failed to save transaction.')
      return
    }

    closeModal()
    await load(getSelectedMonth())

  } catch (err) {
    console.error('[Submit Error]', err)
    showModalAlert('Connection error. Please try again.')
  } finally {
    setSubmitLoading(false)
  }
})

// ─── Delete ────────────────────────────────────────────────
document.getElementById('btn-confirm-delete').addEventListener('click', async () => {
  if (!deleteTargetId) return

  const btn = document.getElementById('btn-confirm-delete')
  btn.disabled = true
  btn.classList.add('loading')

  try {
    const res = await fetch(`/transactions/${deleteTargetId}`, {
      method:  'DELETE',
      headers: HEADERS(),
    })

    if (res.status === 401) { logout(); return }

    closeConfirm()
    await load(getSelectedMonth())

  } catch (err) {
    console.error('[Delete Error]', err)
    showPageAlert('Failed to delete transaction.')
    closeConfirm()
  } finally {
    btn.disabled = false
    btn.classList.remove('loading')
  }
})

// ─── Month Picker ──────────────────────────────────────────
buildMonthSelects()

document.getElementById('month-select').addEventListener('change', () => load(getSelectedMonth()))
document.getElementById('year-select').addEventListener('change',  () => load(getSelectedMonth()))

// ─── Init ──────────────────────────────────────────────────
initUserInfo()
load(getSelectedMonth())
feather.replace()
