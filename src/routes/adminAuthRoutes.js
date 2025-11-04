const express = require('express');
const router = express.Router();
const { adminLogin } = require('../controllers/adminAuthController');

router.post('/login', adminLogin);

// GET route for login page
router.get('/login', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Admin Login - HerRaise Hub</title>
      <style>
        body { font-family: Arial, sans-serif; background: #f5f5f5; margin: 0; padding: 0; }
        .container { max-width: 400px; margin: 100px auto; background: white; padding: 40px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        h2 { text-align: center; color: #6A1B9A; margin-bottom: 30px; }
        .form-group { margin-bottom: 20px; }
        label { display: block; margin-bottom: 5px; font-weight: bold; }
        input { width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box; }
        button { width: 100%; background: #6A1B9A; color: white; padding: 12px; border: none; border-radius: 4px; cursor: pointer; font-size: 16px; }
        button:hover { background: #5A1A8A; }
        .error { color: #dc3545; margin-top: 10px; }
      </style>
    </head>
    <body>
      <div class="container">
        <h2>Admin Login</h2>
        <form onsubmit="login(event)">
          <div class="form-group">
            <label>Email:</label>
            <input type="email" id="email" required>
          </div>
          <div class="form-group">
            <label>Password:</label>
            <input type="password" id="password" required>
          </div>
          <button type="submit">Login</button>
          <div id="error" class="error"></div>
        </form>
      </div>
      
      <script>
        async function login(event) {
          event.preventDefault();
          
          const email = document.getElementById('email').value;
          const password = document.getElementById('password').value;
          
          try {
            const response = await fetch('/api/admin/auth/login', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email, password })
            });
            
            const data = await response.json();
            
            if (data.success) {
              window.location.href = '/api/admin?token=' + data.token;
            } else {
              document.getElementById('error').textContent = data.message || 'Login failed';
            }
          } catch (error) {
            document.getElementById('error').textContent = 'Login failed: ' + error.message;
          }
        }
      </script>
    </body>
    </html>
  `);
});

module.exports = router;