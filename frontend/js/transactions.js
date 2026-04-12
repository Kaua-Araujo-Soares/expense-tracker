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
let selectedType    = 'despesa'

// ─── Helpers ──────────────────────────────────────────────
function formatBRL(value) {
  return Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function formatDate(dateStr) {
  // dateStr comes as ISO "2026-04-12T00:00:00.000Z" or "2026-04-12"
  const d = new Date(dateStr)
  return d.toLocaleDateString('pt-BR', { timeZone: 'UTC' })
}

function toInputDate(dateStr) {
  // Returns "YYYY-MM-DD" for input[type=date]
  return dateStr ? dateStr.slice(0, 10) : ''
}

function currentMonth() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
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
  const name = data.name || data.email || 'Usuário'
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
    select.innerHTML = '<option value="">Sem categoria</option>'
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
  if (!res.ok) throw new Error('Erro ao buscar transações')
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
    countEl.textContent      = 'Nenhuma transação encontrada'
    return
  }

  emptyState.style.display = 'none'
  countEl.textContent = `${rows.length} transaç${rows.length === 1 ? 'ão' : 'ões'}`

  tbody.innerHTML = rows.map(tx => {
    const catName  = categoryName(tx.category_id)
    const typeIcon = tx.type === 'receita' ? 'trending-up' : 'trending-down'
    const sign     = tx.type === 'receita' ? '+' : '-'
    return `
      <tr data-id="${tx.id}" data-type="${tx.type}" data-desc="${tx.description.toLowerCase()}">
        <td class="td-description" title="${tx.description}">${tx.description}</td>
        <td class="td-category">${catName}</td>
        <td class="td-date">${formatDate(tx.date)}</td>
        <td>
          <span class="type-badge ${tx.type}">
            <i data-feather="${typeIcon}"></i>
            ${tx.type}
          </span>
        </td>
        <td class="td-amount ${tx.type}">${sign} ${formatBRL(tx.amount)}</td>
        <td class="td-actions">
          <button class="action-btn edit"   title="Editar"  onclick="openEditModal(${tx.id})"><i data-feather="edit-2"></i></button>
          <button class="action-btn delete" title="Excluir" onclick="openConfirm(${tx.id}, '${tx.description.replace(/'/g, "\\'")}')"><i data-feather="trash-2"></i></button>
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
    showPageAlert('Erro ao carregar transações.')
  }
}

// ─── Type toggle ───────────────────────────────────────────
function setType(type) {
  selectedType = type
  document.getElementById('type-receita').classList.toggle('active', type === 'receita')
  document.getElementById('type-despesa').classList.toggle('active', type === 'despesa')
}

// ─── Modal open/close ──────────────────────────────────────
function openModal() {
  editingId = null
  selectedType = 'despesa'
  document.getElementById('modal-title').textContent = 'Nova Transação'
  document.getElementById('btn-submit-label').textContent = 'Salvar'
  document.getElementById('modal-form').reset()
  document.getElementById('tx-id').value = ''
  clearFormErrors()
  hideModalAlert()
  setType('despesa')
  // Default date = today
  document.getElementById('tx-date').value = new Date().toISOString().slice(0, 10)
  fetchCategories()
  document.getElementById('modal-overlay').classList.add('open')
}

function openEditModal(id) {
  const tx = allTransactions.find(t => t.id === id)
  if (!tx) return

  editingId = id
  document.getElementById('modal-title').textContent      = 'Editar Transação'
  document.getElementById('btn-submit-label').textContent = 'Atualizar'
  document.getElementById('tx-id').value                  = tx.id
  document.getElementById('tx-description').value         = tx.description
  document.getElementById('tx-amount').value              = tx.amount
  document.getElementById('tx-date').value                = toInputDate(tx.date)
  clearFormErrors()
  hideModalAlert()
  setType(tx.type)
  fetchCategories().then(() => {
    document.getElementById('tx-category').value = tx.category_id || ''
  })
  document.getElementById('modal-overlay').classList.add('open')
}

function closeModal() {
  document.getElementById('modal-overlay').classList.remove('open')
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
    type:        selectedType,
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
      showModalAlert(data.error || 'Erro ao salvar transação.')
      return
    }

    closeModal()
    await load(document.getElementById('month-picker').value)

  } catch (err) {
    console.error('[Submit Error]', err)
    showModalAlert('Erro de conexão. Tente novamente.')
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
    await load(document.getElementById('month-picker').value)

  } catch (err) {
    console.error('[Delete Error]', err)
    showPageAlert('Erro ao excluir transação.')
    closeConfirm()
  } finally {
    btn.disabled = false
    btn.classList.remove('loading')
  }
})

// ─── Month Picker ──────────────────────────────────────────
const monthPicker = document.getElementById('month-picker')
monthPicker.value = currentMonth()
monthPicker.addEventListener('change', () => load(monthPicker.value))

// ─── Init ──────────────────────────────────────────────────
initUserInfo()
load(currentMonth())
feather.replace()
