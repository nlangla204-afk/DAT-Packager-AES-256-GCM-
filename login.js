const form = document.getElementById('loginForm');
const errorMsg = document.getElementById('errorMsg');
const loginBtn = document.getElementById('loginBtn');

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  errorMsg.textContent = '';
  loginBtn.disabled = true;
  loginBtn.textContent = 'Logging in…';

  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value;

  try {
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();

    if (data.success) {
      window.location.href = '/admin/dashboard';
    } else {
      errorMsg.textContent = data.message || 'Login failed';
    }
  } catch (err) {
    errorMsg.textContent = 'Network error. Is the server running?';
  } finally {
    loginBtn.disabled = false;
    loginBtn.textContent = 'LOGIN';
  }
});
