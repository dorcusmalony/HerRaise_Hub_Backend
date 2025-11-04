const express = require('express');
const { models } = require('../config/database');
const adminAuth = require('../middleware/adminAuth');
const router = express.Router();

// @desc    Admin dashboard HTML
// @route   GET /api/admin
// @access  Private (Admin only)
router.get('/', adminAuth, (req, res) => {
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
        <h1>HerRaise Hub Admin Dashboard</h1>
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
        
        <div class="tabs">
          <div class="tab active" onclick="showTab('overview', this)">Overview</div>
          <div class="tab" onclick="showTab('users', this)">Users & Mentors</div>
          <div class="tab" onclick="showTab('opportunities', this)">Opportunities</div>
          <div class="tab" onclick="showTab('resources', this)">Resources</div>
          <div class="tab" onclick="showTab('reports', this)">Reports & Forum</div>
          <button onclick="logout()" class="btn" style="background: #dc3545; margin-left: auto;">Logout</button>
        </div>
        
        <div id="overview" class="tab-content active">
          <div class="section">
            <h3>Quick Actions</h3>
            <button onclick="showOpportunityModal()" class="btn">+ Add Opportunity</button>
            <button onclick="showTab('users', document.querySelector('.tab:nth-child(2)'))" class="btn">Manage Users</button>
            <button onclick="showTab('reports', document.querySelector('.tab:nth-child(5)'))" class="btn">View Reports</button>
          </div>
        </div>
        
        <div id="users" class="tab-content">
          <div class="section">
            <h3>Users & Mentors Management</h3>
            <div id="usersContent">Loading users...</div>
          </div>
        </div>
        
        <div id="opportunities" class="tab-content">
          <div class="section">
            <h3>Opportunities Management</h3>
            <div id="opportunitiesContent">Loading opportunities...</div>
          </div>
        </div>
        
        <div id="resources" class="tab-content">
          <div class="section">
            <h3>Resources Management</h3>
            <div id="resourcesContent">Loading resources...</div>
          </div>
        </div>
        
        <div id="reports" class="tab-content">
          <div class="section">
            <h3>Reports & Forum Management</h3>
            <div id="reportsContent">Loading reports...</div>
          </div>
        </div>
        
        <div id="opportunityModal" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 1000;">
          <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); background: white; padding: 30px; border-radius: 8px; width: 500px; max-height: 80vh; overflow-y: auto;">
            <h3 id="modalTitle" style="margin-top: 0; color: #6A1B9A;">Add New Opportunity</h3>
            
            <form onsubmit="saveOpportunity(event)">
              <div style="margin-bottom: 15px;">
                <label style="display: block; margin-bottom: 5px; font-weight: bold;">Title:</label>
                <input type="text" id="oppTitle" required style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box;">
              </div>
              
              <div style="margin-bottom: 15px;">
                <label style="display: block; margin-bottom: 5px; font-weight: bold;">Type:</label>
                <select id="oppType" required style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box;">
                  <option value="">Select Type</option>
                  <option value="scholarship">Scholarship</option>
                  <option value="internship">Internship</option>
                  <option value="conference">Conference</option>
                  <option value="competition">Competition</option>
                  <option value="job">Job</option>
                  <option value="grant">Grant</option>
                </select>
              </div>
              
              <div style="margin-bottom: 15px;">
                <label style="display: block; margin-bottom: 5px; font-weight: bold;">Description:</label>
                <textarea id="oppDescription" required style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px; height: 100px; box-sizing: border-box; resize: vertical;"></textarea>
              </div>
              
              <div style="margin-bottom: 15px;">
                <label style="display: block; margin-bottom: 5px; font-weight: bold;">Deadline:</label>
                <input type="date" id="oppDeadline" required style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box;">
              </div>
              
              <div style="margin-bottom: 15px;">
                <label style="display: block; margin-bottom: 5px; font-weight: bold;">Application Link:</label>
                <input type="url" id="oppLink" required placeholder="https://example.com/apply" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box;">
              </div>
              
              <div style="margin-bottom: 15px;">
                <label style="display: block; margin-bottom: 5px; font-weight: bold;">Organization:</label>
                <input type="text" id="oppOrganization" placeholder="Company/Organization name" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box;">
              </div>
              
              <div style="margin-bottom: 20px;">
                <label style="display: block; margin-bottom: 5px; font-weight: bold;">Location:</label>
                <input type="text" id="oppLocation" placeholder="City, Country or Remote" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box;">
              </div>
              
              <div style="text-align: right;">
                <button type="button" onclick="hideOpportunityModal()" style="background: #666; color: white; padding: 10px 20px; border: none; border-radius: 4px; margin-right: 10px; cursor: pointer;">Cancel</button>
                <button type="submit" id="saveBtn" style="background: #6A1B9A; color: white; padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer;">Save</button>
              </div>
            </form>
          </div>
        </div>
      </div>
      
      <script>
        function showTab(tabName, clickedTab) {
          document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
          document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
          
          const tabElement = document.getElementById(tabName);
          if (tabElement) {
            tabElement.classList.add('active');
          }
          
          if (clickedTab) {
            clickedTab.classList.add('active');
          }
          
          if (tabName !== 'overview') {
            loadTabContent(tabName);
          }
        }
        
        function makeAuthRequest(url, options = {}) {
          const headers = options.headers || {};
          headers['Content-Type'] = headers['Content-Type'] || 'application/json';
          
          // Get token from URL if available
          const urlParams = new URLSearchParams(window.location.search);
          const urlToken = urlParams.get('token');
          
          if (urlToken) {
            // Add token to URL if we have it
            const separator = url.includes('?') ? '&' : '?';
            url = url + separator + 'token=' + urlToken;
          }
          
          return fetch(url, { 
            ...options, 
            headers,
            credentials: 'include'
          });
        }
        
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
                      <h4>User Overview</h4>
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
                  document.getElementById('usersContent').innerHTML = '<p>No users found</p>';
                }
              } catch (error) {
                document.getElementById('usersContent').innerHTML = 'Error loading users: ' + error.message;
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
                      <button onclick="showOpportunityModal()" class="btn">+ Add New Opportunity</button>
                      <span style="margin-left: 15px; color: #666;">Total: \${data.opportunities.length} opportunities</span>
                    </div>
                    
                    \${data.opportunities.map(opp => \`
                      <div class="user-card" style="border-left-color: #007bff;">
                        <div style="display: flex; justify-content: space-between; align-items: start;">
                          <div style="flex: 1; margin-right: 15px;">
                            <strong>\${opp.title}</strong> 
                            <span style="background: #6A1B9A; color: white; padding: 2px 8px; border-radius: 12px; font-size: 12px;">\${opp.type}</span><br>
                            <span style="color: #666;">\${(opp.description || '').substring(0, 100)}...</span><br>
                            <span style="color: #888; font-size: 12px;">Deadline: \${new Date(opp.applicationDeadline || opp.deadline).toLocaleDateString()}</span><br>
                            <span style="color: #888; font-size: 12px;">Organization: \${opp.organization || 'N/A'} | Location: \${opp.location || 'N/A'}</span>
                          </div>
                          <div style="display: flex; flex-direction: column; gap: 5px;">
                            <button onclick="editOpportunity('\${opp.id}')" style="background: #ffc107; color: #000; padding: 5px 10px; border: none; border-radius: 3px; cursor: pointer; font-size: 12px;">Edit</button>
                            <button onclick="deleteOpportunity('\${opp.id}')" style="background: #dc3545; color: white; padding: 5px 10px; border: none; border-radius: 3px; cursor: pointer; font-size: 12px;">Delete</button>
                          </div>
                        </div>
                      </div>
                    \`).join('')}
                  \`;
                } else {
                  document.getElementById('opportunitiesContent').innerHTML = \`
                    <div style="text-align: center; padding: 40px;">
                      <button onclick="showOpportunityModal()" class="btn">+ Add New Opportunity</button>
                      <p style="color: #666; margin-top: 20px;">No opportunities found. Create your first opportunity!</p>
                    </div>
                  \`;
                }
              } catch (error) {
                document.getElementById('opportunitiesContent').innerHTML = 'Error: ' + error.message;
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
                document.getElementById('resourcesContent').innerHTML = 'Error: ' + error.message;
              }
              break;
              
            case 'reports':
              document.getElementById('reportsContent').innerHTML = 'Loading reports...';
              try {
                const response = await makeAuthRequest('/api/admin/reports');
                const data = await response.json();
                
                const reports = data.success ? data.reports || [] : [];
                
                document.getElementById('reportsContent').innerHTML = \`
                  <h4>User Reports (\${reports.length})</h4>
                  \${reports.length > 0 ? reports.map(report => \`
                    <div class="user-card" style="border-left-color: #dc3545;">
                      <div style="display: flex; justify-content: space-between; align-items: start;">
                        <div style="flex: 1;">
                          <strong>\${report.name || 'Anonymous'}</strong> 
                          <span style="background: \${report.status === 'resolved' ? '#28a745' : '#dc3545'}; color: white; padding: 2px 8px; border-radius: 12px; font-size: 12px;">\${report.status || 'pending'}</span><br>
                          <span style="color: #666;">Email: \${report.email || 'Not provided'}</span><br>
                          <span style="color: #666;">Subject: \${report.subject || 'No subject'}</span><br>
                          <span style="color: #666;">Message: \${(report.message || '').substring(0, 150)}...</span><br>
                          <span style="color: #888; font-size: 12px;">Submitted: \${new Date(report.createdAt).toLocaleDateString()}</span>
                        </div>
                        <div style="display: flex; flex-direction: column; gap: 5px;">
                          <button onclick="resolveReport('\${report.id}')" style="background: #28a745; color: white; padding: 5px 10px; border: none; border-radius: 3px; cursor: pointer; font-size: 12px;">Mark Resolved</button>
                          <button onclick="deleteReport('\${report.id}')" style="background: #dc3545; color: white; padding: 5px 10px; border: none; border-radius: 3px; cursor: pointer; font-size: 12px;">Delete</button>
                        </div>
                      </div>
                    </div>
                  \`).join('') : '<p>No reports found</p>'}
                \`;
              } catch (error) {
                document.getElementById('reportsContent').innerHTML = 'Error: ' + error.message;
              }
              break;
          }
        }
        
        function logout() {
          // Clear all possible admin tokens
          document.cookie = 'adminToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
          document.cookie = 'admin_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
          
          // Clear session storage
          sessionStorage.clear();
          localStorage.clear();
          
          // Redirect to login
          window.location.replace('/api/admin/auth/login');
        }
        
        let editingOpportunityId = null;
        
        function showOpportunityModal() {
          editingOpportunityId = null;
          document.getElementById('modalTitle').textContent = 'Add New Opportunity';
          document.getElementById('saveBtn').textContent = 'Save';
          document.querySelector('#opportunityModal form').reset();
          document.getElementById('opportunityModal').style.display = 'block';
        }
        
        function hideOpportunityModal() {
          document.getElementById('opportunityModal').style.display = 'none';
          document.querySelector('#opportunityModal form').reset();
          editingOpportunityId = null;
        }
        
        async function editOpportunity(id) {
          try {
            const response = await makeAuthRequest(\`/api/admin/opportunities/\${id}\`);
            const data = await response.json();
            
            if (data.success && data.opportunity) {
              const opp = data.opportunity;
              editingOpportunityId = id;
              
              document.getElementById('oppTitle').value = opp.title;
              document.getElementById('oppType').value = opp.type;
              document.getElementById('oppDescription').value = opp.description;
              document.getElementById('oppDeadline').value = opp.applicationDeadline ? opp.applicationDeadline.split('T')[0] : '';
              document.getElementById('oppLink').value = opp.applicationLink || '';
              document.getElementById('oppOrganization').value = opp.organization || '';
              document.getElementById('oppLocation').value = opp.location || '';
              
              document.getElementById('modalTitle').textContent = 'Edit Opportunity';
              document.getElementById('saveBtn').textContent = 'Update';
              document.getElementById('opportunityModal').style.display = 'block';
            }
          } catch (error) {
            alert('Error loading opportunity: ' + error.message);
          }
        }
        
        async function saveOpportunity(event) {
          event.preventDefault();
          
          const formData = {
            title: document.getElementById('oppTitle').value,
            type: document.getElementById('oppType').value,
            description: document.getElementById('oppDescription').value,
            applicationDeadline: document.getElementById('oppDeadline').value,
            applicationLink: document.getElementById('oppLink').value,
            organization: document.getElementById('oppOrganization').value,
            location: document.getElementById('oppLocation').value,
            isActive: true
          };
          
          try {
            let response;
            if (editingOpportunityId) {
              response = await makeAuthRequest(\`/api/admin/opportunities/\${editingOpportunityId}\`, {
                method: 'PUT',
                body: JSON.stringify(formData)
              });
            } else {
              response = await makeAuthRequest('/api/admin/opportunities', {
                method: 'POST',
                body: JSON.stringify(formData)
              });
            }
            
            const result = await response.json();
            
            if (result.success) {
              alert(editingOpportunityId ? 'Opportunity updated!' : 'Opportunity created!');
              hideOpportunityModal();
              loadTabContent('opportunities');
            } else {
              alert('Error: ' + result.message);
            }
          } catch (error) {
            alert('Failed to save: ' + error.message);
          }
        }
        
        async function deleteOpportunity(id) {
          if (!confirm('Delete this opportunity? This cannot be undone.')) return;
          
          try {
            const response = await makeAuthRequest(\`/api/admin/opportunities/\${id}\`, {
              method: 'DELETE'
            });
            
            const result = await response.json();
            
            if (result.success) {
              alert('Opportunity deleted!');
              loadTabContent('opportunities');
            } else {
              alert('Error: ' + result.message);
            }
          } catch (error) {
            alert('Failed to delete: ' + error.message);
          }
        }
        
        async function resolveReport(id) {
          try {
            const response = await makeAuthRequest(\`/api/admin/reports/\${id}\`, {
              method: 'PUT',
              body: JSON.stringify({ status: 'resolved' })
            });
            
            const result = await response.json();
            
            if (result.success) {
              alert('Report marked as resolved!');
              loadTabContent('reports');
            } else {
              alert('Error: ' + result.message);
            }
          } catch (error) {
            alert('Failed to resolve: ' + error.message);
          }
        }
        
        async function deleteReport(id) {
          if (!confirm('Delete this report? This cannot be undone.')) return;
          
          try {
            const response = await makeAuthRequest(\`/api/admin/reports/\${id}\`, {
              method: 'DELETE'
            });
            
            const result = await response.json();
            
            if (result.success) {
              alert('Report deleted!');
              loadTabContent('reports');
            } else {
              alert('Error: ' + result.message);
            }
          } catch (error) {
            alert('Failed to delete: ' + error.message);
          }
        }
        
        document.addEventListener('click', function(event) {
          const modal = document.getElementById('opportunityModal');
          if (event.target === modal) {
            hideOpportunityModal();
          }
        });
      </script>
    </body>
    </html>
  `);
});

// @desc    Get admin dashboard stats
// @route   GET /api/admin/stats
// @access  Private (Admin only)
router.get('/stats', adminAuth, async (req, res) => {
  try {
    const [
      totalUsers,
      totalMentors,
      totalOpportunities,
      totalResources
    ] = await Promise.all([
      models.User.count(),
      models.User.count({ where: { role: 'mentor' } }),
      models.Opportunity.count({ where: { isActive: true } }),
      models.Resource.count()
    ]);

    res.json({
      success: true,
      stats: {
        totalUsers,
        totalMentors,
        totalOpportunities,
        totalResources
      }
    });
  } catch (error) {
    console.error('Admin stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching stats'
    });
  }
});

// @desc    Get all users for admin
// @route   GET /api/admin/users
// @access  Private (Admin only)
router.get('/users', adminAuth, async (req, res) => {
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

// @desc    Get single opportunity
// @route   GET /api/admin/opportunities/:id
// @access  Private (Admin only)
router.get('/opportunities/:id', adminAuth, async (req, res) => {
  try {
    const opportunity = await models.Opportunity.findByPk(req.params.id);
    
    if (!opportunity) {
      return res.status(404).json({ success: false, message: 'Opportunity not found' });
    }

    res.json({ success: true, opportunity });
  } catch (error) {
    console.error('Get opportunity error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// @desc    Update opportunity
// @route   PUT /api/admin/opportunities/:id
// @access  Private (Admin only)
router.put('/opportunities/:id', adminAuth, async (req, res) => {
  try {
    const { title, type, description, applicationDeadline, applicationLink, organization, location, isActive } = req.body;
    
    const opportunity = await models.Opportunity.findByPk(req.params.id);
    if (!opportunity) {
      return res.status(404).json({ success: false, message: 'Opportunity not found' });
    }

    await opportunity.update({
      title,
      type,
      description,
      applicationDeadline,
      applicationLink,
      organization,
      location,
      isActive: isActive !== undefined ? isActive : true
    });
    
    res.json({ success: true, opportunity });
  } catch (error) {
    console.error('Update opportunity error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// @desc    Delete opportunity
// @route   DELETE /api/admin/opportunities/:id
// @access  Private (Admin only)
router.delete('/opportunities/:id', adminAuth, async (req, res) => {
  try {
    const opportunity = await models.Opportunity.findByPk(req.params.id);
    if (!opportunity) {
      return res.status(404).json({ success: false, message: 'Opportunity not found' });
    }

    await opportunity.destroy();
    
    res.json({ success: true, message: 'Opportunity deleted successfully' });
  } catch (error) {
    console.error('Delete opportunity error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// @desc    Create new opportunity
// @route   POST /api/admin/opportunities
// @access  Private (Admin only)
router.post('/opportunities', adminAuth, async (req, res) => {
  try {
    const { title, type, description, applicationDeadline, applicationLink, organization, location } = req.body;
    
    const opportunity = await models.Opportunity.create({
      title,
      type,
      description,
      applicationDeadline,
      applicationLink,
      organization,
      location,
      isActive: true
    });
    
    // Send all types of notifications to users
    const { sendPushNotificationToAll } = require('../services/pushNotificationService');
    const { sendNewOpportunityEmailToAll } = require('../services/emailService');
    const NotificationService = require('../services/notificationService');
    
    // Database notification (for notification bell)
    await NotificationService.notifyNewOpportunity(opportunity, 'admin');
    
    // Push notification to all users
    await sendPushNotificationToAll({
      title: `🎯 New ${type.charAt(0).toUpperCase() + type.slice(1)}!`,
      body: `${title} - Apply now before the deadline!`,
      data: {
        type: 'opportunity',
        opportunityId: opportunity.id.toString(),
        url: `/opportunities/${opportunity.id}`
      }
    });
    
    // Email notification to all users
    await sendNewOpportunityEmailToAll(opportunity);
    
    console.log(`📢 All notifications sent for new ${type}: ${title}`);
    console.log('  ✅ Database notifications (bell)');
    console.log('  ✅ WebSocket notifications');
    console.log('  ✅ Push notifications');
    console.log('  ✅ Email notifications');
    
    res.status(201).json({ success: true, opportunity });
  } catch (error) {
    console.error('Create opportunity error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// @desc    Get all reports for admin
// @route   GET /api/admin/reports
// @access  Private (Admin only)
router.get('/reports', adminAuth, async (req, res) => {
  try {
    const reports = await models.Report.findAll({
      order: [['createdAt', 'DESC']],
      limit: 100
    });

    res.json({ success: true, reports });
  } catch (error) {
    console.error('Admin reports error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// @desc    Update report status
// @route   PUT /api/admin/reports/:id
// @access  Private (Admin only)
router.put('/reports/:id', adminAuth, async (req, res) => {
  try {
    const { status } = req.body;
    
    const report = await models.Report.findByPk(req.params.id);
    if (!report) {
      return res.status(404).json({ success: false, message: 'Report not found' });
    }

    await report.update({ status });
    
    res.json({ success: true, report });
  } catch (error) {
    console.error('Update report error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// @desc    Delete report
// @route   DELETE /api/admin/reports/:id
// @access  Private (Admin only)
router.delete('/reports/:id', adminAuth, async (req, res) => {
  try {
    const report = await models.Report.findByPk(req.params.id);
    if (!report) {
      return res.status(404).json({ success: false, message: 'Report not found' });
    }

    await report.destroy();
    
    res.json({ success: true, message: 'Report deleted successfully' });
  } catch (error) {
    console.error('Delete report error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;