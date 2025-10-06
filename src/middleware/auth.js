const jwt = require('jsonwebtoken');
const db = require('../config/database');

exports.protect = async (req, res, next) => {
  let token;

  // Get token from header "Authorization: Bearer <token>"
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ success: false, message: 'Not authorized, token missing' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

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
      return res.status(401).json({ success: false, message: 'Not authorized, user not found' });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Not authorized, token invalid' });
  }
};

// usage: authorize('mentor','admin')
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Not authorized' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: `Require role: ${roles.join(', ')}` });
    }
    next();
  };
};
