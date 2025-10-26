const AdminJS = require('adminjs');
const AdminJSExpress = require('@adminjs/express');
const AdminJSSequelize = require('@adminjs/sequelize');
const db = require('./database');

// Register the Sequelize adapter
AdminJS.registerAdapter(AdminJSSequelize);

// AdminJS configuration
const adminOptions = {
  resources: [
    {
      resource: db.models.User,
      options: {
        properties: {
          password: { isVisible: false },
          resetPasswordToken: { isVisible: false },
          resetPasswordExpire: { isVisible: false }
        },
        actions: {
          new: {
            before: async (request) => {
              if (request.payload.password) {
                const bcrypt = require('bcryptjs');
                request.payload.password = await bcrypt.hash(request.payload.password, 12);
              }
              return request;
            }
          }
        }
      }
    },
    {
      resource: db.models.ForumPost,
      options: {
        properties: {
          content: { type: 'textarea' }
        }
      }
    },
    {
      resource: db.models.Scholarship,
      options: {
        properties: {
          description: { type: 'textarea' },
          eligibility: { type: 'textarea' },
          requirements: { type: 'textarea' },
          benefits: { type: 'textarea' }
        }
      }
    },
    db.models.Resource,
    db.models.Opportunity,
    db.models.MentorProfile,
    db.models.Report,
    db.models.ForumComment
  ],
  rootPath: '/admin',
  branding: {
    companyName: 'HerRaise Hub',
    logo: false,
    softwareBrothers: false,
  },
  dashboard: {
    handler: async () => {
      const stats = await Promise.all([
        db.models.User.count(),
        db.models.ForumPost.count(),
        db.models.Scholarship.count(),
        db.models.Resource.count()
      ]);
      
      return {
        totalUsers: stats[0],
        totalPosts: stats[1],
        totalScholarships: stats[2],
        totalResources: stats[3]
      };
    }
  }
};

const adminJs = new AdminJS(adminOptions);

// Authentication
const authenticate = async (email, password) => {
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;
  
  if (email === adminEmail && password === adminPassword) {
    return { email: adminEmail, role: 'admin' };
  }
  return null;
};

const adminRouter = AdminJSExpress.buildAuthenticatedRouter(adminJs, {
  authenticate,
  cookieName: 'adminjs',
  cookiePassword: process.env.JWT_SECRET || 'admin-secret-key',
});

module.exports = { adminJs, adminRouter };