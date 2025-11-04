async function adminLogin(event) {
  event.preventDefault();
  
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  
  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    
    const data = await response.json();
    
    if (data.success && data.user.role === 'admin') {
      localStorage.setItem('adminToken', data.token);
      window.location.href = '/api/admin';
    } else {
      document.getElementById('error').textContent = 'Invalid credentials or not an admin';
    }
  } catch (error) {
    document.getElementById('error').textContent = 'Login failed';
  }
}