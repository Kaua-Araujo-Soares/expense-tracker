// ─── Constants ────────────────────────────────────────────
const API_BASE = '/auth'

// ─── Tab Switcher ─────────────────────────────────────────
function switchTab(tab) {
  const isLogin = tab === 'login'

  document.getElementById('panel-login').style.display    = isLogin ? 'block' : 'none'
  document.getElementById('panel-register').style.display = isLogin ? 'none'  : 'block'

  document.getElementById('tab-login').classList.toggle('active', isLogin)
  document.getElementById('tab-register').classList.toggle('active', !isLogin)

  // Clear alerts when switching
  hideAlert('login')
  hideAlert('register')
}

// ─── Toggle Password Visibility ───────────────────────────
function togglePassword(inputId, btn) {
  const input = document.getElementById(inputId)
  const isHidden = input.type === 'password'
  input.type = isHidden ? 'text' : 'password'
  btn.setAttribute('aria-label', isHidden ? 'Hide password' : 'Show password')
  // Swap icon
  btn.innerHTML = isHidden
    ? '<i data-feather="eye-off"></i>'
    : '<i data-feather="eye"></i>'
  feather.replace()
}

// ─── Alert helpers ────────────────────────────────────────
function showAlert(form, message, type = 'error') {
  const alert = document.getElementById(`alert-${form}`)
  const msg   = document.getElementById(`alert-${form}-msg`)
  alert.className = `alert alert-${type} visible`
  msg.textContent = message
}

function hideAlert(form) {
  const alert = document.getElementById(`alert-${form}`)
  alert.classList.remove('visible')
}

// ─── Inline validation helpers ────────────────────────────
function showFieldError(id, message) {
  const el = document.getElementById(id)
  if (el) { el.textContent = message; el.classList.add('visible') }
}

function clearFieldErrors(prefix) {
  document.querySelectorAll(`.form-error`).forEach(el => el.classList.remove('visible'))
}

// ─── Button loading state ─────────────────────────────────
function setLoading(btnId, loading) {
  const btn = document.getElementById(btnId)
  btn.disabled = loading
  btn.classList.toggle('loading', loading)
}

// ─── Token storage ────────────────────────────────────────
function saveToken(token) {
  localStorage.setItem('expense_token', token)
}

function getToken() {
  return localStorage.getItem('expense_token')
}

// ─── Login ────────────────────────────────────────────────
document.getElementById('form-login').addEventListener('submit', async (e) => {
  e.preventDefault()
  hideAlert('login')
  clearFieldErrors('login')

  const email    = document.getElementById('login-email').value.trim()
  const password = document.getElementById('login-password').value

  // Client-side validation
  let valid = true
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    showFieldError('login-email-error', 'Please enter a valid email.')
    valid = false
  }
  if (!password) {
    showFieldError('login-password-error', 'Please enter your password.')
    valid = false
  }
  if (!valid) return

  setLoading('btn-login', true)

  try {
    const res  = await fetch(`${API_BASE}/login`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ email, password }),
    })

    const data = await res.json()

    if (!res.ok) {
      showAlert('login', data.message || 'Invalid email or password.')
      return
    }

    // Save token and redirect to dashboard
    saveToken(data.token)
    window.location.href = 'dashboard.html'

  } catch (err) {
    console.error('[Login Error]', err)
    showAlert('login', 'Connection error. Please try again.')
  } finally {
    setLoading('btn-login', false)
  }
})

// ─── Register ─────────────────────────────────────────────
document.getElementById('form-register').addEventListener('submit', async (e) => {
  e.preventDefault()
  hideAlert('register')
  clearFieldErrors('register')

  const name     = document.getElementById('register-name').value.trim()
  const email    = document.getElementById('register-email').value.trim()
  const password = document.getElementById('register-password').value

  // Client-side validation
  let valid = true
  if (!name) {
    showFieldError('register-name-error', 'Please enter your name.')
    valid = false
  }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    showFieldError('register-email-error', 'Please enter a valid email.')
    valid = false
  }
  if (!password || password.length < 6) {
    showFieldError('register-password-error', 'Password must be at least 6 characters.')
    valid = false
  }
  if (!valid) return

  setLoading('btn-register', true)

  try {
    const res  = await fetch(`${API_BASE}/register`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ name, email, password }),
    })

    const data = await res.json()

    if (!res.ok) {
      showAlert('register', data.message || 'Error creating account.')
      return
    }

    // Auto-login after registration
    saveToken(data.token)
    window.location.href = 'dashboard.html'

  } catch (err) {
    console.error('[Register Error]', err)
    showAlert('register', 'Connection error. Please try again.')
  } finally {
    setLoading('btn-register', false)
  }
})

// ─── Auto-redirect if already logged in ───────────────────
;(function checkAuth() {
  if (getToken()) {
    window.location.href = 'dashboard.html'
  }
})()
