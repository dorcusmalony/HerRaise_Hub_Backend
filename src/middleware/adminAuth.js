const jwt = require('jsonwebtoken');
const { models } = require('../config/database');

const adminAuth = async (req, res, next) => {
  try {
    // Check URL token first
    const urlToken = req.query.token;
    if (urlToken) {
      try {
        const decoded = Buffer.from(urlToken, 'base64').toString();
        const [userId, role, _timestamp] = decoded.split(':');
        if (role === 'admin') {
          req.user = { id: userId, role: 'admin' };
          return next();
        }
      } catch (e) {
        // Invalid token, continue to other checks
      }
    }
    
    // Check session
    if (req.session.adminId && req.session.adminRole === 'admin') {
      req.user = { id: req.session.adminId, role: 'admin' };
      return next();
    }
    
    // Check for token in Authorization header
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).send('<h1>Access Denied</h1><p><a href="/api/admin/login">Please login as admin</a></p>');
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Handle hardcoded admin or database user
    if (decoded.id === 'admin') {
      req.user = { id: 'admin', role: 'admin' };
      return next();
    }
    
    const user = await models.User.findByPk(decoded.id);
    
    if (!user || user.role !== 'admin') {
      return res.status(403).send('<h1>Access Denied</h1><p>Admin role required. <a href="/api/admin/login">Login</a></p>');
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401).send('<h1>Authentication Error</h1><p><a href="/api/admin/login">Please login</a></p>');
  }
};

module.exports = adminAuth;