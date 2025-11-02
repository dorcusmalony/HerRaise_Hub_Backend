const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>HerRaise Hub Admin Dashboard</title>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #f8f9fa; }
        .header { background: #6A1B9A; color: white; padding: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .header h1 { font-size: 24px; }
        .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
        .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 20px 0; }
        .stat-card { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); text-align: center; }
        .stat-number { font-size: 32px; font-weight: bold; color: #6A1B9A; }
        .stat-label { color: #666; margin-top: 5px; }
        .tabs { display: flex; background: white; border-radius: 8px; overflow: hidden; margin: 20px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .tab { flex: 1; padding: 15px; text-align: center; cursor: pointer; border: none; background: white; transition: background 0.3s; }
        .tab:hover, .tab.active { background: #6A1B9A; color: white; }
        .content { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .btn { background: #6A1B9A; color: white; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer; margin: 5px; text-decoration: none; display: inline-block; }
        .btn:hover { background: #5A1A8A; }
        .btn-success { background: #4CAF50; }
        .btn-danger { background: #E53935; }
        .table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        .table th, .table td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
        .table th { background: #f8f9fa; font-weight: 600; }
        .loading { text-align: center; padding: 40px; color: #666; }
        .hidden { display: none; }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="container">
          <h1>🎯 HerRaise Hub Admin Dashboard</h1>
        </div>
      </div>
      
      <div class="container">
        <!-- Stats Cards -->
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-number" id="totalUsers">-</div>
            <div class="stat-label">Total Users</div>
          </div>
          <div class="stat-card">
            <div class="stat-number" id="totalMentors">-</div>
            <div class="stat-label">Total Mentors</div>
          </div>
          <div class="stat-card">
            <div class="stat-number" id="totalOpportunities">-</div>
            <div class="stat-label">Opportunities</div>
          </div>
          <div class="stat-card">
            <div class="stat-number" id="totalResources">-</div>
            <div class="stat-label">Resources</div>
          </div>
          <div class="stat-card">
            <div class="stat-number" id="activeApplications">-</div>
            <div class="stat-label">Active Applications</div>
          </div>
        </div>
        
        <!-- Tabs -->
        <div class="tabs">
          <button class="tab active" onclick="showTab('users')">👥 Users & Mentors</button>
          <button class="tab" onclick="showTab('opportunities')">🎓 Opportunities</button>
          <button class="tab" onclick="showTab('resources')">📚 Resources</button>
          <button class="tab" onclick="showTab('reports')">🚨 Reports</button>
        </div>
        
        <!-- Content Areas -->
        <div class="content">
          <div id="users-content">
            <h3>User Management</h3>
            <div class="loading">Loading users...</div>
            <div id="users-table"></div>
          </div>
          
          <div id="opportunities-content" class="hidden">
            <h3>Opportunity Management</h3>
            <a href="/api/opportunities" class="btn">View All Opportunities</a>
            <div class="loading">Loading opportunities...</div>
          </div>
          
          <div id="resources-content" class="hidden">
            <h3>Resource Management</h3>
            <a href="/api/resources" class="btn">View All Resources</a>
            <div class="loading">Loading resources...</div>
          </div>
          
          <div id="reports-content" class="hidden">
            <h3>Reports & Forum Moderation</h3>
            <a href="/api/reports" class="btn">View Reports</a>
            <a href="/api/forum/posts" class="btn">View Forum Posts</a>
            <div class="loading">Loading reports...</div>
          </div>
        </div>
      </div>
      
      <script>
        // Load dashboard stats
        async function loadStats() {
          try {
            const response = await fetch('/api/admin/stats');
            const data = await response.json();
            if (data.success) {
              document.getElementById('totalUsers').textContent = data.stats.totalUsers;
              document.getElementById('totalMentors').textContent = data.stats.totalMentors;
              document.getElementById('totalOpportunities').textContent = data.stats.totalOpportunities;
              document.getElementById('totalResources').textContent = data.stats.totalResources;
              document.getElementById('activeApplications').textContent = data.stats.activeApplications;
            }
          } catch (error) {
            console.error('Failed to load stats:', error);
          }
        }
        
        // Tab switching
        function showTab(tabName) {
          // Hide all content
          document.querySelectorAll('[id$="-content"]').forEach(el => el.classList.add('hidden'));
          // Remove active class from all tabs
          document.querySelectorAll('.tab').forEach(el => el.classList.remove('active'));
          // Show selected content
          document.getElementById(tabName + '-content').classList.remove('hidden');
          // Add active class to clicked tab
          event.target.classList.add('active');
        }
        
        // Load users
        async function loadUsers() {
          try {
            const response = await fetch('/api/admin/users');
            const data = await response.json();
            if (data.success) {
              const table = \`
                <table class="table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Role</th>
                      <th>Status</th>
                      <th>Created</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    \${data.users.map(user => \`
                      <tr>
                        <td>\${user.name}</td>
                        <td>\${user.email}</td>
                        <td>\${user.role}</td>
                        <td>\${user.isActive ? 'Active' : 'Inactive'}</td>
                        <td>\${new Date(user.createdAt).toLocaleDateString()}</td>
                        <td>
                          <button class="btn btn-success" onclick="toggleUserStatus('\${user.id}', \${!user.isActive})">
                            \${user.isActive ? 'Deactivate' : 'Activate'}
                          </button>
                        </td>
                      </tr>
                    \`).join('')}
                  </tbody>
                </table>
              \`;
              document.getElementById('users-table').innerHTML = table;
            }
          } catch (error) {
            console.error('Failed to load users:', error);
          }
        }
        
        // Toggle user status
        async function toggleUserStatus(userId, newStatus) {
          try {
            const response = await fetch(\`/api/admin/users/\${userId}\`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ isActive: newStatus })
            });
            if (response.ok) {
              loadUsers(); // Reload users table
              loadStats(); // Reload stats
            }
          } catch (error) {
            console.error('Failed to update user:', error);
          }
        }
        
        // Initialize dashboard
        document.addEventListener('DOMContentLoaded', () => {
          loadStats();
          loadUsers();
        });
      </script>
    </body>
    </html>
  `);
});

module.exports = router;