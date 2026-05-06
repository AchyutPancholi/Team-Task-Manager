// Auth State
let currentUser = null;

function checkAuth() {
  const token = localStorage.getItem('token');
  const userStr = localStorage.getItem('user');
  
  if (token && userStr) {
    currentUser = JSON.parse(userStr);
    showApp();
    initApp();
  } else {
    showAuth();
  }
}

function showAuth() {
  document.getElementById('auth-overlay').classList.remove('hidden');
  document.getElementById('app').classList.add('hidden');
}

function showApp() {
  document.getElementById('auth-overlay').classList.add('hidden');
  document.getElementById('app').classList.remove('hidden');
  
  // Setup user info in UI
  document.getElementById('sidebar-name').textContent = currentUser.name;
  document.getElementById('sidebar-role').textContent = currentUser.role;
  document.getElementById('topbar-name').textContent = currentUser.name;
  
  const avatar = document.getElementById('sidebar-avatar');
  const topAvatar = document.getElementById('topbar-avatar');
  
  avatar.textContent = currentUser.name.charAt(0).toUpperCase();
  avatar.style.backgroundColor = currentUser.avatar_color;
  
  topAvatar.textContent = currentUser.name.charAt(0).toUpperCase();
  topAvatar.style.backgroundColor = currentUser.avatar_color;
  
  // Show admin items
  if (currentUser.role === 'admin') {
    document.querySelectorAll('.admin-only').forEach(el => el.classList.remove('hidden'));
  }
}

function switchForm(form) {
  document.querySelectorAll('.auth-form').forEach(el => el.classList.remove('active'));
  document.getElementById(`${form}-form`).classList.add('active');
  document.querySelectorAll('.form-error').forEach(el => el.classList.add('hidden'));
}

function togglePassword(inputId, btn) {
  const input = document.getElementById(inputId);
  if (input.type === 'password') {
    input.type = 'text';
    btn.style.opacity = '0.5';
  } else {
    input.type = 'password';
    btn.style.opacity = '1';
  }
}

function fillDemo(email, pwd) {
  document.getElementById('login-email').value = email;
  document.getElementById('login-password').value = pwd;
}

function setLoading(btnId, isLoading) {
  const btn = document.getElementById(btnId);
  const text = btn.querySelector('.btn-text');
  const loader = btn.querySelector('.btn-loader');
  
  if (isLoading) {
    text.classList.add('hidden');
    loader.classList.remove('hidden');
    btn.disabled = true;
  } else {
    text.classList.remove('hidden');
    loader.classList.add('hidden');
    btn.disabled = false;
  }
}

function showError(id, msg) {
  const el = document.getElementById(id);
  el.textContent = msg;
  el.classList.remove('hidden');
}

async function handleLogin() {
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;
  
  if (!email || !password) return showError('login-error', 'Please fill all fields');
  
  setLoading('login-btn', true);
  document.getElementById('login-error').classList.add('hidden');
  
  try {
    const res = await api.post('/auth/login', { email, password });
    localStorage.setItem('token', res.token);
    localStorage.setItem('user', JSON.stringify(res.user));
    currentUser = res.user;
    showApp();
    initApp();
  } catch (err) {
    showError('login-error', err.message);
  } finally {
    setLoading('login-btn', false);
  }
}

async function handleRegister() {
  const name = document.getElementById('reg-name').value;
  const role = document.getElementById('reg-role').value;
  const email = document.getElementById('reg-email').value;
  const password = document.getElementById('reg-password').value;
  
  if (!name || !email || !password) return showError('reg-error', 'Please fill all fields');
  
  setLoading('reg-btn', true);
  document.getElementById('reg-error').classList.add('hidden');
  
  try {
    const res = await api.post('/auth/register', { name, email, password, role });
    localStorage.setItem('token', res.token);
    localStorage.setItem('user', JSON.stringify(res.user));
    currentUser = res.user;
    showApp();
    initApp();
  } catch (err) {
    showError('reg-error', err.message);
  } finally {
    setLoading('reg-btn', false);
  }
}

function handleLogout() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  currentUser = null;
  window.location.reload();
}
