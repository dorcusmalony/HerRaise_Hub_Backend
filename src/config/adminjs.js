const AdminJS = require('adminjs');
const AdminJSExpress = require('@adminjs/express');
const AdminJSSequelize = require('@adminjs/sequelize');
const bcrypt = require('bcryptjs');
const db = require('./database');

// Register the Sequelize adapter
AdminJS.registerAdapter({
  Resource: AdminJSSequelize.Resource,
  Database: AdminJSSequelize.Database,
});

// Admin authentication
const authenticate = async (email, password) => {
  const adminEmail = process.env.ADMIN_EMAIL || 'herraise337@gmail.com';
  const adminPassword = process.env.ADMIN_PASSWORD || 'mosesalier@2023';
  
  if (email === adminEmail && password === adminPassword) {
    return { email: adminEmail, role: 'admin' };
  }
  return null;
};

// AdminJS configuration
const adminOptions = {
  resources: [
    {
      resource: db.models.User,
      options: {
        parent: {
          name: 'User Management',
          icon: 'User',
        },
        listProperties: ['id', 'name', 'email', 'role', 'isActive', 'createdAt'],
        filterProperties: ['name', 'email', 'role', 'isActive', 'createdAt'],
        editProperties: ['name', 'email', 'role', 'isActive', 'profilePicture', 'bio', 'location', 'language'],
        showProperties: ['id', 'name', 'email', 'role', 'isActive', 'profilePicture', 'bio', 'location', 'language', 'createdAt', 'updatedAt'],
        actions: {
          new: {
            before: async (request) => {
              if (request.payload.password) {
                request.payload.password = await bcrypt.hash(request.payload.password, 10);
              }
              return request;
            },
          },
          edit: {
            before: async (request) => {
              if (request.payload.password && request.payload.password !== '') {
                request.payload.password = await bcrypt.hash(request.payload.password, 10);
              } else {
                delete request.payload.password;
              }
              return request;
            },
          },
        },
      },
    },
    {
      resource: db.models.Opportunity,
      options: {
        parent: {
          name: 'Content Management',
          icon: 'Briefcase',
        },
        listProperties: ['id', 'title', 'organization', 'type', 'isActive', 'isFeatured', 'applicationDeadline', 'createdAt'],
        filterProperties: ['title', 'organization', 'type', 'isActive', 'isFeatured', 'applicationDeadline'],
        editProperties: ['title', 'description', 'organization', 'type', 'location', 'applicationLink', 'applicationDeadline', 'amount', 'eligibility', 'requirements', 'isActive', 'isFeatured'],
        showProperties: ['id', 'title', 'description', 'organization', 'type', 'location', 'applicationLink', 'applicationDeadline', 'amount', 'eligibility', 'requirements', 'isActive', 'isFeatured', 'createdAt', 'updatedAt'],
      },
    },
    {
      resource: db.models.ForumPost,
      options: {
        parent: {
          name: 'Content Management',
          icon: 'MessageSquare',
        },
        listProperties: ['id', 'title', 'type', 'authorId', 'isPinned', 'isLocked', 'createdAt'],
        filterProperties: ['title', 'type', 'authorId', 'isPinned', 'isLocked', 'createdAt'],
        editProperties: ['title', 'content', 'type', 'isPinned', 'isLocked', 'tags'],
        showProperties: ['id', 'title', 'content', 'type', 'authorId', 'isPinned', 'isLocked', 'tags', 'likes', 'views', 'createdAt', 'updatedAt'],
      },
    },
    {
      resource: db.models.ForumComment,
      options: {
        parent: {
          name: 'Content Management',
          icon: 'MessageCircle',
        },
        listProperties: ['id', 'content', 'authorId', 'postId', 'createdAt'],
        filterProperties: ['authorId', 'postId', 'createdAt'],
        editProperties: ['content'],
        showProperties: ['id', 'content', 'authorId', 'postId', 'likes', 'createdAt', 'updatedAt'],
      },
    },
    {
      resource: db.models.UserApplication,
      options: {
        parent: {
          name: 'Applications',
          icon: 'FileText',
        },
        listProperties: ['id', 'userId', 'opportunityId', 'status', 'appliedAt'],
        filterProperties: ['userId', 'opportunityId', 'status', 'appliedAt'],
        editProperties: ['status', 'notes'],
        showProperties: ['id', 'userId', 'opportunityId', 'status', 'notes', 'appliedAt', 'updatedAt'],
      },
    },
    {
      resource: db.models.Scholarship,
      options: {
        parent: {
          name: 'Content Management',
          icon: 'Award',
        },
        listProperties: ['id', 'title', 'provider', 'amount', 'deadline', 'isActive', 'createdAt'],
        filterProperties: ['title', 'provider', 'isActive', 'deadline'],
        editProperties: ['title', 'description', 'provider', 'amount', 'deadline', 'eligibility', 'requirements', 'applicationProcess', 'isActive', 'isFeatured'],
        showProperties: ['id', 'title', 'description', 'provider', 'amount', 'deadline', 'eligibility', 'requirements', 'applicationProcess', 'isActive', 'isFeatured', 'createdAt', 'updatedAt'],
      },
    },
    {
      resource: db.models.Resource,
      options: {
        parent: {
          name: 'Content Management',
          icon: 'Book',
        },
        listProperties: ['id', 'title', 'type', 'category', 'isActive', 'createdAt'],
        filterProperties: ['title', 'type', 'category', 'isActive'],
        editProperties: ['title', 'description', 'content', 'type', 'category', 'tags', 'isActive', 'isFeatured'],
        showProperties: ['id', 'title', 'description', 'content', 'type', 'category', 'tags', 'isActive', 'isFeatured', 'createdAt', 'updatedAt'],
      },
    },
    {
      resource: db.models.Report,
      options: {
        parent: {
          name: 'Safety & Reports',
          icon: 'Shield',
        },
        listProperties: ['id', 'type', 'status', 'reporterId', 'createdAt'],
        filterProperties: ['type', 'status', 'reporterId', 'createdAt'],
        editProperties: ['status', 'adminNotes'],
        showProperties: ['id', 'type', 'description', 'status', 'reporterId', 'targetId', 'targetType', 'adminNotes', 'createdAt', 'updatedAt'],
      },
    },
    {
      resource: db.models.Notification,
      options: {
        parent: {
          name: 'Communications',
          icon: 'Bell',
        },
        listProperties: ['id', 'title', 'type', 'userId', 'isRead', 'createdAt'],
        filterProperties: ['type', 'userId', 'isRead', 'createdAt'],
        editProperties: ['title', 'message', 'type', 'isRead'],
        showProperties: ['id', 'title', 'message', 'type', 'userId', 'isRead', 'data', 'createdAt'],
      },
    },
    {
      resource: db.models.UserActivity,
      options: {
        parent: {
          name: 'Analytics',
          icon: 'Activity',
        },
        listProperties: ['id', 'userId', 'action', 'createdAt'],
        filterProperties: ['userId', 'action', 'createdAt'],
        showProperties: ['id', 'userId', 'action', 'details', 'createdAt'],
        actions: {
          new: { isVisible: false },
          edit: { isVisible: false },
          delete: { isVisible: false },
        },
      },
    },
  ],
  branding: {
    companyName: 'HerRaise Hub Admin',
    softwareBrothers: false,
    theme: {
      colors: {
        primary100: '#ff0043',
        primary80: '#ff1a57',
        primary60: '#ff3369',
        primary40: '#ff4d7a',
        primary20: '#ff668c',
      },
    },
  },
  rootPath: '/admin',
  dashboard: {
    handler: async () => {
      const stats = {};
      try {
        stats.totalUsers = await db.models.User.count();
        stats.activeUsers = await db.models.User.count({ where: { isActive: true } });
        stats.totalOpportunities = await db.models.Opportunity.count();
        stats.activeOpportunities = await db.models.Opportunity.count({ where: { isActive: true } });
        stats.totalApplications = await db.models.UserApplication.count();
        stats.totalPosts = await db.models.ForumPost.count();
        stats.totalReports = await db.models.Report.count();
        stats.pendingReports = await db.models.Report.count({ where: { status: 'pending' } });
      } catch (error) {
        console.error('Dashboard stats error:', error);
      }
      return { stats };
    },
  },
};

// Create AdminJS instance
const adminJs = new AdminJS(adminOptions);

// Create router with authentication
const adminRouter = AdminJSExpress.buildAuthenticatedRouter(
  adminJs,
  {
    authenticate,
    cookieName: 'adminjs',
    cookiePassword: process.env.JWT_SECRET || 'your_jwt_secret_key_here_make_it_long_and_secure',
  },
  null,
  {
    resave: false,
    saveUninitialized: true,
    secret: process.env.JWT_SECRET || 'your_jwt_secret_key_here_make_it_long_and_secure',
    cookie: {
      httpOnly: process.env.NODE_ENV === 'production',
      secure: process.env.NODE_ENV === 'production',
    },
    name: 'adminjs',
  }
);

module.exports = { adminJs, adminRouter };