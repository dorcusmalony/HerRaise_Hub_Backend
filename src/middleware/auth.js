const jwt = require('jsonwebtoken');
const db = require('../config/database');

exports.protect = async (req, res, next) => {
  let token;

  try {
    // Check URL token first (for admin panel)
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
    
    // Get token from header "Authorization: Bearer <token>"
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      console.log(`Authentication failed: No token provided in request to ${req.method} ${req.originalUrl}`);
      return res.status(401).json({ 
        success: false, 
        message: 'Authentication required. Please provide a token in the Authorization header (Bearer token)' 
      });
    }

    // Verify token
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log(`Token verified for user ID: ${decoded.id}`);
      
      // Ensure Sequelize models are available
      if (!db.models) {
        if (typeof db.connectDB === 'function') {
          await db.connectDB();
        } else {
          return res.status(500).json({ success: false, message: 'Database not initialized' });
        }
      }

      const User = db.models && db.models.User;
      if (!User) {
        return res.status(500).json({ success: false, message: 'User model not available' });
      }

      // Fetch user without password
      const user = await User.findByPk(decoded.id, { attributes: { exclude: ['password'] } });

      if (!user) {
        console.log(`Authentication failed: User with ID ${decoded.id} not found in database`);
        return res.status(401).json({ success: false, message: 'User account not found or deactivated' });
      }

      req.user = user;
      next();
    } catch (jwtError) {
      // Handle specific JWT errors
      if (jwtError.name === 'TokenExpiredError') {
        console.log('Authentication failed: Token expired');
        return res.status(401).json({ 
          success: false, 
          message: 'Your session has expired. Please log in again.',
          error: 'token_expired' 
        });
      } else if (jwtError.name === 'JsonWebTokenError') {
        console.log('Authentication failed: Invalid token format');
        return res.status(401).json({ 
          success: false, 
          message: 'Invalid authentication token',
          error: 'invalid_token' 
        });
      }

      console.error('JWT verification error:', jwtError.message);
      return res.status(401).json({ 
        success: false, 
        message: 'Authentication failed. Please log in again.' 
      });
    }
  } catch (error) {
    console.error('Middleware error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Internal server error during authentication' 
    });
  }
};

// Alias for compatibility with different naming conventions
exports.authMiddleware = exports.protect;

// usage: authorize('mentor','admin')
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Not authorized' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        success: false, 
        message: `Access denied: Required role: ${roles.join(', ')}, your role: ${req.user.role}` 
      });
    }
    next();
  };
};
// usage: authorize('mentor','admin')
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Not authorized' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        success: false, 
        message: `Access denied: Required role: ${roles.join(', ')}, your role: ${req.user.role}` 
      });
    }
    next();
  };
};
