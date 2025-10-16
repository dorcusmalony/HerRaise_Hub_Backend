const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const authRoutes = require('./routes/authRoutes');
const resourceRoutes = require('./routes/resourceRoutes');
const activityRoutes = require('./routes/activityRoutes');
const reportRoutes = require('./routes/reportRoutes');
const mentorRoutes = require('./routes/mentorRoutes');
const profileRoutes = require('./routes/profileRoutes');

const app = express();

// ------------------ SECURITY & LOGGING ------------------
app.use(helmet());
app.use(morgan('dev'));

// ------------------ CORS CONFIG ------------------
const DEFAULT_FRONTENDS = [
  'https://her-raise-hub.vercel.app',
  'http://localhost:5173',
  'https://her-raise-qywpgby4w-dorcus-projects-926b115e.vercel.app',
  'https://her-raise-pyaoi58m4-dorcus-projects-926b115e.vercel.app', // ADD THIS LINE
];

const envOrigins = (process.env.FRONTEND_URLS || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

const allowedOrigins = [...DEFAULT_FRONTENDS, ...envOrigins];

const corsOptions = {
  origin: (origin, callback) => {
    // allow requests with no origin (e.g., curl, mobile apps, server-to-server)
    if (!origin) return callback(null, true);

    // allow exact-origin matches
    if (allowedOrigins.includes(origin)) return callback(null, true);

    // allow vercel.app subdomains (useful if frontend is deployed under different vercel subdomains)
    if (/\.vercel\.app$/.test(origin)) return callback(null, true);

    callback(new Error('Not allowed by CORS'));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
};

app.use(cors(corsOptions));

// ------------------ BODY PARSING ------------------
app.use(express.json({
  verify: (req, res, buf, encoding) => {
    try {
      if (buf && buf.length) {
        JSON.parse(buf.toString(encoding || 'utf8'));
      }
    } catch (e) {
      const err = new SyntaxError('Invalid JSON in request body');
      err.status = 400;
      throw err;
    }
  }
}));
app.use(express.urlencoded({ extended: true }));

// ------------------ STATIC FILES ------------------
// Serve uploaded files (only needed if using local storage)
app.use('/uploads', express.static('uploads'));

// ------------------ DEBUG LOGGING ------------------
// Log all API requests for debugging (remove in production or gate with NODE_ENV check)
app.use('/api', (req, res, next) => {
  console.log(`📥 ${req.method} ${req.path}`, {
    body: req.method !== 'GET' ? req.body : undefined,
    query: Object.keys(req.query).length ? req.query : undefined,
    headers: {
      'content-type': req.get('content-type'),
      'authorization': req.get('authorization') ? '(present)' : '(missing)',
    },
  });
  next();
});

// ------------------ ROUTES ------------------

// TEMPORARY FIX: If VITE_API_URL includes /api/auth, requests for other routes like /api/resources
// might arrive as /api/auth/api/resources. This middleware corrects that.
app.use((req, res, next) => {
  const wrongPrefix = '/api/auth/api/';
  if (req.path.startsWith(wrongPrefix)) {
    const correctPath = req.path.substring(wrongPrefix.length - 1); // Keep the leading '/'
    // Use 307 to preserve method and body
    return res.redirect(307, correctPath);
  }
  next();
});

// TEMPORARY FIX: Redirect incorrect /api/auth/signup calls from the frontend to the correct endpoint.
app.all('/api/auth/signup', (req, res) => {
  // Use a 307 redirect to preserve the request method (e.g., POST) and body.
  return res.redirect(307, '/api/auth/register');
});

app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/resources', resourceRoutes);
app.use('/api/activity', activityRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/mentors', mentorRoutes);

// Redirect GET visits to /login and /register to the frontend UI, but keep informative JSON for other methods.
const FRONTEND_URL = (process.env.FRONTEND_URL || 'https://her-raise-hub.vercel.app').replace(/\/$/, '');

app.get('/login', (req, res) => {
  return res.redirect(302, `${FRONTEND_URL}/login`);
});
app.all('/login', (req, res) => {
  // If the frontend (or a client) POSTs directly to /login, forward it to the API auth route.
  if (req.method === 'POST') {
    // Use 307 to preserve method and body when redirecting
    return res.redirect(307, '/api/auth/login');
  }

  // For non-POST (e.g. someone probing via curl), return a clear API hint.
  return res.status(400).json({
    success: false,
    message: 'This backend does not serve the frontend login page.',
    suggestion: `Open the frontend app (${FRONTEND_URL}/login) or POST to /api/auth/login`,
    api: { method: 'POST', path: '/api/auth/login' },
  });
});

app.get('/register', (req, res) => {
  return res.redirect(302, `${FRONTEND_URL}/register`);
});
app.all('/register', (req, res) => {
  // If the frontend (or a client) POSTs directly to /register, forward it to the API auth route.
  if (req.method === 'POST') {
    // Use 307 to preserve method and body when redirecting
    return res.redirect(307, '/api/auth/register');
  }

  return res.status(400).json({
    success: false,
    message: 'This backend does not serve the frontend register page.',
    suggestion: `Open the frontend app (${FRONTEND_URL}/register) or POST to /api/auth/register`,
    api: { method: 'POST', path: '/api/auth/register' },
  });
});

// Optional root hint preserved (still helpful for direct visits)
app.get('/', (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'This is the API backend. The frontend lives elsewhere.',
    hint: 'Use POST /api/auth/login or POST /api/auth/register for authentication. Visit your frontend for the UI.',
  });
});

function listMountedRoutes() {
  try {
    const mounted = [
      { prefix: '/api/auth', router: authRoutes },
      { prefix: '/api/profile', router: profileRoutes },
      { prefix: '/api/resources', router: resourceRoutes },
      { prefix: '/api/activity', router: activityRoutes },
      { prefix: '/api/reports', router: reportRoutes },
      { prefix: '/api/mentors', router: mentorRoutes },
    ];

    const out = [];
    mounted.forEach(({ prefix, router }) => {
      if (!router || !router.stack) {
        out.push(`(no router.stack) ${prefix}`);
        return;
      }
      router.stack.forEach(layer => {
        if (layer.route && layer.route.path) {
          const methods = Object.keys(layer.route.methods || {}).map(m => m.toUpperCase()).join(',');
          out.push(`${methods} ${prefix}${layer.route.path}`);
        } else if (layer.name === 'router' && layer.handle && layer.handle.stack) {
          layer.handle.stack.forEach(inner => {
            if (inner.route && inner.route.path) {
              const methods = Object.keys(inner.route.methods || {}).map(m => m.toUpperCase()).join(',');
              out.push(`${methods} ${prefix}${inner.route.path}`);
            }
          });
        }
      });
    });

    console.log('✅ Mounted routes:\n', out.join('\n') || '(none)');
  } catch (e) {
    console.warn('Could not list mounted routes:', e && e.message);
  }
}
listMountedRoutes();

// ------------------ HEALTH CHECK ------------------
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'Server is running' });
});

// ------------------ 404 HANDLER ------------------
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    method: req.method,
    path: req.originalUrl,
    hint: 'Confirm you are using the /api/* prefix (e.g., /api/auth/login)',
  });
});

// ------------------ ERROR HANDLER ------------------
app.use((err, req, res, next) => {
  console.error(' Error:', err.stack);
  
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      success: false,
      message: 'Invalid JSON in request body',
      error: 'syntax_error',
    });
  }

  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Server Error',
    error: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });
});

module.exports = app;
