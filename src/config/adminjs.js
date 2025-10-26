const express = require('express');

// Simple admin router without AdminJS dependency
const adminRouter = express.Router();

// Basic admin routes are handled in app.js
adminRouter.get('/', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Admin API is working',
    endpoints: [
      'GET /api/admin/stats',
      'GET /api/admin/users', 
      'GET /api/admin/opportunities',
      'POST /api/admin/opportunities/create'
    ]
  });
});

module.exports = { adminRouter };