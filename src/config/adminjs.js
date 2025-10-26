const AdminJS = require('adminjs');
const AdminJSExpress = require('@adminjs/express');
const AdminJSSequelize = require('@adminjs/sequelize');
const db = require('./database');

// Register the Sequelize adapter
AdminJS.registerAdapter(AdminJSSequelize);

// AdminJS configuration
const adminJs = new AdminJS({
  resources: [
    {
      resource: db.models.User,
      options: {
        properties: {
          password: { isVisible: false }
        }
      }
    },
    db.models.ForumPost,
    db.models.Scholarship,
    db.models.Resource,
    db.models.Opportunity
  ],
  rootPath: '/admin',
  branding: {
    companyName: 'HerRaise Hub',
    softwareBrothers: false
  }
});

// Authentication function
const authenticate = async (email, password) => {
  console.log('AdminJS login attempt:', email);
  if (email === process.env.ADMIN_EMAIL && password === process.env.ADMIN_PASSWORD) {
    console.log('AdminJS login successful');
    return { email, role: 'admin' };
  }
  console.log('AdminJS login failed');
  return null;
};

// Build router with session configuration
const adminRouter = AdminJSExpress.buildAuthenticatedRouter(adminJs, {
  authenticate,
  cookieName: 'adminjs',
  cookiePassword: process.env.JWT_SECRET || 'very-long-secret-key-for-adminjs-sessions',
  resave: false,
  saveUninitialized: false
});

module.exports = { adminJs, adminRouter };