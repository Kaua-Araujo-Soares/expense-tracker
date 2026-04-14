// ─── Auth Guard ────────────────────────────────────────────
const token = localStorage.getItem('expense_token')
if (!token) window.location.replace('index.html')

// ─── Constants ────────────────────────────────────────────
const HEADERS = () => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${token}`,
})

// ─── State ────────────────────────────────────────────────
let deleteTargetId = null

// ─── Helpers ──────────────────────────────────────────────
function decodeToken(jwt) {
  try { return JSON.parse(atob(jwt.split('.')[1])) } catch { return null }
}

function logout() {
  localStorage.removeItem('expense_token')
  window.location.replace('index.html')
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

function showPageSuccess(msg) {
  const el = document.getElementById('page-success')
  document.getElementById('page-success-msg').textContent = msg
  el.classList.add('visible')
  setTimeout(() => el.classList.remove('visible'), 3500)
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

// ─── Fetch Categories ──────────────────────────────────────
async function fetchCategories() {
  const res = await fetch('/categories', { headers: HEADERS() })
  if (res.status === 401) { logout(); return [] }
  if (!res.ok) throw new Error('Failed to fetch categories')
  return res.json()
}

// ─── Render Grid ───────────────────────────────────────────
function renderGrid(categories) {
  const grid  = document.getElementById('cat-grid')
  const empty = document.getElementById('cat-empty')
  const count = document.getElementById('cat-count')

  if (!categories.length) {
    grid.innerHTML = ''
    grid.style.display  = 'none'
    empty.style.display = 'flex'
    count.textContent   = 'No categories yet'
    return
  }

  grid.style.display = 'grid'
  empty.style.display = 'none'
  count.textContent = `${categories.length} categor${categories.length === 1 ? 'y' : 'ies'}`

  grid.innerHTML = categories.map(cat => `
    <div class="cat-card" id="cat-${cat.id}">
      <div class="cat-icon-wrap">
        <i data-feather="tag"></i>
      </div>
      <div class="cat-info">
        <div class="cat-card-name" title="${cat.name}">${cat.name}</div>
        <div class="cat-card-meta">Custom category</div>
      </div>
      <div class="cat-card-actions">
        <button class="action-btn delete" title="Delete" onclick="openConfirm(${cat.id}, '${cat.name.replace(/'/g, "\\'")}')">
          <i data-feather="trash-2"></i>
        </button>
      </div>
    </div>
  `).join('')

  feather.replace()
}

// ─── Load ──────────────────────────────────────────────────
async function load() {
  try {
    const cats = await fetchCategories()
    renderGrid(cats)
  } catch (err) {
    console.error('[Load Error]', err)
    showPageAlert('Failed to load categories.')
  }
}

// ─── Modal open/close ──────────────────────────────────────
function openModal() {
  document.getElementById('cat-name').value = ''
  clearFormErrors()
  hideModalAlert()
  document.getElementById('modal-overlay').classList.add('open')
  setTimeout(() => document.getElementById('cat-name').focus(), 120)
}

function closeModal() {
  document.getElementById('modal-overlay').classList.remove('open')
}

function handleOverlayClick(e) {
  if (e.target === document.getElementById('modal-overlay')) closeModal()
}

// ─── Confirm Delete ────────────────────────────────────────
function openConfirm(id, name) {
  deleteTargetId = id
  document.getElementById('confirm-cat-name').textContent = name
  document.getElementById('confirm-overlay').classList.add('open')
}

function closeConfirm() {
  document.getElementById('confirm-overlay').classList.remove('open')
  deleteTargetId = null
}

function handleConfirmOverlay(e) {
  if (e.target === document.getElementById('confirm-overlay')) closeConfirm()
}

// ─── Submit: Create ────────────────────────────────────────
function setSubmitLoading(on) {
  const btn = document.getElementById('btn-submit')
  btn.disabled = on
  btn.classList.toggle('loading', on)
}

document.getElementById('modal-form').addEventListener('submit', async (e) => {
  e.preventDefault()
  clearFormErrors()
  hideModalAlert()

  const name = document.getElementById('cat-name').value.trim()
  if (!name) {
    showFieldError('err-cat-name')
    return
  }

  setSubmitLoading(true)

  try {
    const res = await fetch('/categories', {
      method:  'POST',
      headers: HEADERS(),
      body:    JSON.stringify({ name }),
    })

    if (res.status === 401) { logout(); return }
    if (!res.ok) {
      const data = await res.json()
      showModalAlert(data.error || 'Failed to create category.')
      return
    }

    closeModal()
    showPageSuccess(`Category "${name}" created successfully!`)
    await load()

  } catch (err) {
    console.error('[Create Error]', err)
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
    const res = await fetch(`/categories/${deleteTargetId}`, {
      method:  'DELETE',
      headers: HEADERS(),
    })

    if (res.status === 401) { logout(); return }

    closeConfirm()
    showPageSuccess('Category deleted.')
    await load()

  } catch (err) {
    console.error('[Delete Error]', err)
    showPageAlert('Failed to delete category.')
    closeConfirm()
  } finally {
    btn.disabled = false
    btn.classList.remove('loading')
  }
})

// ─── Keyboard: Escape closes modals ────────────────────────
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeModal()
    closeConfirm()
  }
})

// ─── Init ──────────────────────────────────────────────────
initUserInfo()
load()
feather.replace()
