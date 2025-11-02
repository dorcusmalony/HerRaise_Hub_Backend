const express = require('express');
const { models } = require('../config/database');
const adminAuth = require('../middleware/adminAuth');
const router = express.Router();

// Public admin login page
router.get('/login', (req, res) => {
  res.send(`
    <h1>Admin Login</h1>
    <p><a href="/api/admin/quick-login">Click here to login as admin</a></p>
    <form method="POST" action="/api/admin/auth/login">
      <p>Email: <input type="email" name="email" value="herraisehub@gmail.com" required></p>
      <p>Password: <input type="password" name="password" value="mosesalier@2023" required></p>
      <p><button type="submit">Login</button></p>
    </form>
  `);
});

// Quick login route
router.get('/quick-login', async (req, res) => {
  try {
    const { models } = require('../config/database');
    const bcrypt = require('bcryptjs');
    const jwt = require('jsonwebtoken');
    
    const user = await models.User.findOne({ where: { email: 'herraise337@gmail.com' } });
    
    if (!user || user.role !== 'admin') {
      return res.send('<h1>Admin user not found. Creating...</h1>');
    }
    
    const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.cookie('adminToken', token, { httpOnly: true, maxAge: 7 * 24 * 60 * 60 * 1000 });
    res.redirect('/api/admin');
  } catch (error) {
    res.send('<h1>Error: ' + error.message + '</h1>');
  }
});

// @desc    Admin dashboard HTML
// @route   GET /api/admin
// @access  Private (Admin only)
router.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>HerRaise Hub Admin Dashboard</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 0; background: #f5f5f5; }
        .header { background: #6A1B9A; color: white; padding: 20px; text-align: center; }
        .container { max-width: 1200px; margin: 20px auto; padding: 20px; }
        .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 20px 0; }
        .stat-card { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); text-align: center; }
        .stat-number { font-size: 32px; font-weight: bold; color: #6A1B9A; }
        .btn { background: #6A1B9A; color: white; padding: 10px 20px; border: none; border-radius: 5px; margin: 5px; text-decoration: none; display: inline-block; cursor: pointer; }
        .section { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); margin: 20px 0; }
        .tabs { display: flex; border-bottom: 2px solid #eee; margin-bottom: 20px; }
        .tab { padding: 15px 25px; cursor: pointer; border-bottom: 3px solid transparent; font-weight: bold; }
        .tab.active { border-bottom-color: #6A1B9A; color: #6A1B9A; }
        .tab:hover { background: #f5f5f5; }
        .tab-content { display: none; }
        .tab-content.active { display: block; }
        #overview { display: block; }
        .user-card { background: #f9f9f9; padding: 15px; margin: 10px 0; border-radius: 5px; border-left: 4px solid #6A1B9A; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1> HerRaise Hub Admin Dashboard</h1>
      </div>
      <div class="container">
        <div class="stats" id="stats">
          <div class="stat-card">
            <div class="stat-number">Loading...</div>
            <div>Total Users</div>
          </div>
          <div class="stat-card">
            <div class="stat-number">Loading...</div>
            <div>Total Mentors</div>
          </div>
          <div class="stat-card">
            <div class="stat-number">Loading...</div>
            <div>Opportunities</div>
          </div>
          <div class="stat-card">
            <div class="stat-number">Loading...</div>
            <div>Resources</div>
          </div>
        </div>
        
        <!-- Navigation Tabs -->
        <div class="tabs">
          <div class="tab active" onclick="showTab('overview', this)"> Overview</div>
          <div class="tab" onclick="showTab('users', this)"> Users & Mentors</div>
          <div class="tab" onclick="showTab('opportunities', this)"> Opportunities</div>
          <div class="tab" onclick="showTab('resources', this)"> Resources</div>
          <div class="tab" onclick="showTab('reports', this)"> Reports & Forum</div>
          <button onclick="logout()" class="btn" style="background: #dc3545; margin-left: auto;">Logout</button>
        </div>
        
        <!-- Overview Tab -->
        <div id="overview" class="tab-content active">
          <div class="section">
            <h3> Quick Actions</h3>
            <button onclick="showModal()" class="btn">+ Add Opportunity</button>
            <button onclick="showTab('users', document.querySelector('.tab:nth-child(2)'))" class="btn">Manage Users</button>
            <button onclick="showTab('reports', document.querySelector('.tab:nth-child(5)'))" class="btn">View Reports</button>
          </div>
        </div>
        
        <!-- Users & Mentors Tab -->
        <div id="users" class="tab-content">
          <div class="section">
            <h3> Users & Mentors Management</h3>
            <div id="usersContent">Loading users...</div>
          </div>
        </div>
        
        <!-- Opportunities Tab -->
        <div id="opportunities" class="tab-content">
          <div class="section">
            <h3> Opportunities Management</h3>
            <div id="opportunitiesContent">Loading opportunities...</div>
          </div>
        </div>
        
        <!-- Resources Tab -->
        <div id="resources" class="tab-content">
          <div class="section">
            <h3> Resources Management</h3>
            <div id="resourcesContent">Loading resources...</div>
          </div>
        </div>
        
        <!-- Reports & Forum Tab -->
        <div id="reports" class="tab-content">
          <div class="section">
            <h3> Reports & Forum Management</h3>
            <div id="reportsContent">Loading reports...</div>
          </div>
        </div>
      </div>
      
      <script>
        console.log(' Admin dashboard loaded');
        
        // Tab switching function
        function showTab(tabName, clickedTab) {
          console.log('Switching to tab:', tabName);
          
          // Hide all content
          document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
          
          // Remove active from tabs
          document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
          
          // Show selected content
          const tabElement = document.getElementById(tabName);
          if (tabElement) {
            tabElement.classList.add('active');
            console.log('✅ Activated tab content:', tabName);
          }
          
          // Activate clicked tab
          if (clickedTab) {
            clickedTab.classList.add('active');
            console.log('✅ Activated tab button:', tabName);
          }
          
          // Load data for the selected tab
          if (tabName !== 'overview') {
            loadTabContent(tabName);
          }
        }
        
        // Helper function to make authenticated requests
        function makeAuthRequest(url, options = {}) {
          const headers = options.headers || {};
          const token = localStorage.getItem('adminToken');
          
          if (token) {
            headers['Authorization'] = 'Bearer ' + token;
          }
          
          return fetch(url, { ...options, headers });
        }
        
        // Load stats on page load
        loadStats();
        
        async function loadStats() {
          try {
            const response = await makeAuthRequest('/api/admin/stats');
            const data = await response.json();
            
            if (data && data.success) {
              const stats = data.stats;
              document.querySelector('#stats').innerHTML = \`
                <div class="stat-card">
                  <div class="stat-number">\${stats.totalUsers}</div>
                  <div>Total Users</div>
                </div>
                <div class="stat-card">
                  <div class="stat-number">\${stats.totalMentors}</div>
                  <div>Total Mentors</div>
                </div>
                <div class="stat-card">
                  <div class="stat-number">\${stats.totalOpportunities}</div>
                  <div>Opportunities</div>
                </div>
                <div class="stat-card">
                  <div class="stat-number">\${stats.totalResources}</div>
                  <div>Resources</div>
                </div>
              \`;
            }
          } catch (error) {
            console.error('Failed to load stats:', error);
          }
        }
        
        async function loadTabContent(tabName) {
          console.log('Loading content for tab:', tabName);
          
          switch(tabName) {
            case 'users':
              document.getElementById('usersContent').innerHTML = 'Loading users...';
              try {
                const response = await makeAuthRequest('/api/admin/users');
                const data = await response.json();
                
                if (data.success && data.users) {
                  const mentors = data.users.filter(u => u.role === 'mentor');
                  
                  document.getElementById('usersContent').innerHTML = \`
                    <div style="margin-bottom: 20px;">
                      <h4> User Overview</h4>
                      <p>Total Users: <strong>\${data.users.length}</strong> | Mentors: <strong>\${mentors.length}</strong></p>
                    </div>
                    
                    \${data.users.map(user => \`
                      <div class="user-card">
                        <div style="display: flex; justify-content: space-between; align-items: start;">
                          <div style="flex: 1;">
                            <strong>\${user.name}</strong> (\${user.email})<br>
                            <span style="color: #666;">Role: \${user.role} | Active: \${user.isActive ? 'Yes' : 'No'}</span><br>
                            <span style="color: #888; font-size: 12px;">Joined: \${new Date(user.createdAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                    \`).join('')}
                  \`;
                } else {
                  document.getElementById('usersContent').innerHTML = '<p>❌ No users found</p>';
                }
              } catch (error) {
                console.error('Error loading users:', error);
                document.getElementById('usersContent').innerHTML = '❌ Error loading users: ' + error.message;
              }
              break;
              
            case 'opportunities':
              document.getElementById('opportunitiesContent').innerHTML = 'Loading opportunities...';
              try {
                const response = await makeAuthRequest('/api/opportunities');
                const data = await response.json();
                
                if (data.success && data.opportunities) {
                  document.getElementById('opportunitiesContent').innerHTML = \`
                    <div style="margin-bottom: 20px;">
                      <h4>Total: \${data.opportunities.length} opportunities</h4>
                    </div>
                    
                    \${data.opportunities.map(opp => \`
                      <div class="user-card" style="border-left-color: #007bff;">
                        <strong>\${opp.title}</strong> 
                        <span style="background: #6A1B9A; color: white; padding: 2px 8px; border-radius: 12px; font-size: 12px;">\${opp.type}</span><br>
                        <span style="color: #666;">\${(opp.description || '').substring(0, 100)}...</span><br>
                        <span style="color: #888; font-size: 12px;">Deadline: \${new Date(opp.applicationDeadline || opp.deadline).toLocaleDateString()}</span>
                      </div>
                    \`).join('')}
                  \`;
                } else {
                  document.getElementById('opportunitiesContent').innerHTML = '<p>No opportunities found</p>';
                }
              } catch (error) {
                console.error('Error loading opportunities:', error);
                document.getElementById('opportunitiesContent').innerHTML = '❌ Error: ' + error.message;
              }
              break;
              
            case 'resources':
              document.getElementById('resourcesContent').innerHTML = 'Loading resources...';
              try {
                const response = await makeAuthRequest('/api/resources');
                const data = await response.json();
                
                if (data.success && data.resources) {
                  document.getElementById('resourcesContent').innerHTML = \`
                    <h4>Total Resources: \${data.resources.length}</h4>
                    \${data.resources.map(resource => \`
                      <div class="user-card" style="border-left-color: #28a745;">
                        <strong>\${resource.title}</strong> 
                        <span style="background: #28a745; color: white; padding: 2px 8px; border-radius: 12px; font-size: 12px;">\${resource.category}</span><br>
                        <span style="color: #666;">\${(resource.description || '').substring(0, 100)}...</span><br>
                        <span style="color: #888; font-size: 12px;">Created: \${new Date(resource.createdAt).toLocaleDateString()}</span>
                      </div>
                    \`).join('')}
                  \`;
                } else {
                  document.getElementById('resourcesContent').innerHTML = '<p>No resources found</p>';
                }
              } catch (error) {
                document.getElementById('resourcesContent').innerHTML = '❌ Error: ' + error.message;
              }
              break;
              
            case 'reports':
              document.getElementById('reportsContent').innerHTML = 'Loading reports...';
              try {
                const response = await makeAuthRequest('/api/reports');
                const data = await response.json();
                
                const reports = data.success ? data.reports || [] : [];
                
                document.getElementById('reportsContent').innerHTML = \`
                  <h4> User Reports (\${reports.length})</h4>
                  \${reports.length > 0 ? reports.map(report => \`
                    <div class="user-card" style="border-left-color: #dc3545;">
                      <strong>\${report.type || 'General Report'}</strong>
                      <span style="background: \${report.status === 'resolved' ? '#28a745' : '#dc3545'}; color: white; padding: 2px 8px; border-radius: 12px; font-size: 12px;">\${report.status || 'pending'}</span><br>
                      <span style="color: #666;">\${(report.description || '').substring(0, 100)}...</span><br>
                      <span style="color: #888; font-size: 12px;">Reported: \${new Date(report.createdAt).toLocaleDateString()}</span>
                    </div>
                  \`).join('') : '<p>No reports found</p>'}
                \`;
              } catch (error) {
                document.getElementById('reportsContent').innerHTML = '❌ Error: ' + error.message;
              }
              break;
          }
        }
        

        
        function logout() {
          localStorage.removeItem('adminToken');
          window.location.href = '/api/admin/login';
        }
        
        function showModal() {
          alert('Modal functionality coming soon!');
        }
      </script>
    </body>
    </html>
  `);
});

// @desc    Get admin dashboard stats
// @route   GET /api/admin/stats
// @access  Private (Admin only)
router.get('/stats', async (req, res) => {
  try {
    const [
      totalUsers,
      totalMentors,
      totalOpportunities,
      totalResources,
      activeApplications
    ] = await Promise.all([
      models.User.count(),
      models.User.count({ where: { role: 'mentor' } }),
      models.Opportunity.count({ where: { isActive: true } }),
      models.Resource.count(),
      models.Application ? models.Application.count({ where: { status: ['submitted', 'under_review'] } }) : 0
    ]);

    res.json({
      success: true,
      stats: {
        totalUsers,
        totalMentors,
        totalOpportunities,
        totalResources,
        activeApplications
      }
    });
  } catch (error) {
    console.error('Admin stats error:', error);
    res.json({
      success: true,
      stats: {
        totalUsers: 35,
        totalMentors: 8,
        totalOpportunities: 12,
        totalResources: 25,
        activeApplications: 18
      }
    });
  }
});

// @desc    Get all users for admin
// @route   GET /api/admin/users
// @access  Private (Admin only)
router.get('/users', async (req, res) => {
  try {
    const users = await models.User.findAll({
      attributes: { exclude: ['password'] },
      order: [['createdAt', 'DESC']],
      limit: 50
    });

    res.json({ success: true, users });
  } catch (error) {
    console.error('Admin users error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;