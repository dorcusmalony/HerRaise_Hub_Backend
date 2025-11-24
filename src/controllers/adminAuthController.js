const db = require('../config/database');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Admin login
exports.adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log('Admin login attempt:', email);
    console.log('Environment check:', {
      ADMIN_EMAIL: process.env.ADMIN_EMAIL,
      ADMIN_PASSWORD: process.env.ADMIN_PASSWORD ? 'SET' : 'NOT SET'
    });
    
    // Check if it's the admin credentials
    if (email === process.env.ADMIN_EMAIL && password === process.env.ADMIN_PASSWORD) {
      // Create admin user if doesn't exist
      const User = db.models.User;
      let user = await User.findOne({ where: { email } });
      
      if (!user) {
        console.log('Creating admin user...');
        const hashedPassword = await bcrypt.hash(password, 10);
        user = await User.create({
          name: 'Admin User',
          email: email,
          password: hashedPassword,
          role: 'admin',
          isActive: true,
          language: 'en',
          educationLevel: 'bachelor'
        });
        console.log('Admin user created');
      } else if (user.role !== 'admin') {
        // Update existing user to admin
        await user.update({ role: 'admin' });
        console.log('User role updated to admin');
      }
      
      // Generate JWT token
      const token = jwt.sign(
        { id: user.id, email: user.email, role: 'admin' },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );
      
      return res.json({
        success: true,
        token,
        admin: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: 'admin'
        }
      });
    }
    
    return res.status(401).send('<h1>Invalid admin credentials</h1><a href="/api/admin/login">Try again</a>');
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).send('<h1>Login error: ' + error.message + '</h1><a href="/api/admin/login">Try again</a>');
  }
};

// Verify admin token
exports.verifyAdmin = async (req, res) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No admin token provided'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    if (!decoded.isAdmin || decoded.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin privileges required.'
      });
    }

    res.json({
      success: true,
      admin: {
        email: decoded.email,
        role: decoded.role
      }
    });

  } catch (error) {
    res.status(401).json({
      success: false,
      message: 'Invalid admin token'
    });
  }
};