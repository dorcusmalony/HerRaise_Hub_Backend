const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const authRoutes = require('./routes/authRoutes');
const resourceRoutes = require('./routes/resourceRoutes');
const activityRoutes = require('./routes/activityRoutes');
const reportRoutes = require('./routes/reportRoutes');
const mentorRoutes = require('./routes/mentorRoutes'); // Add mentor routes

const app = express();

// Middleware
app.use(helmet());
app.use(cors({
  origin: [
    'https://herraise-hub-frontend.vercel.app', // ✅ replace with your actual Vercel URL
  ],
  credentials: true, // if your frontend uses cookies or auth headers
}));


// Improve JSON body parsing with better error handling
app.use(express.json({
  verify: (req, res, buf, encoding) => {
    try {
      // buf is a Buffer; parse its string content
      if (buf && buf.length) {
        JSON.parse(buf.toString(encoding || 'utf8'));
      }
    } catch (e) {
      // Throw a SyntaxError so the error middleware handles the response consistently
      const err = new SyntaxError('Invalid JSON in request body');
      err.status = 400;
      throw err;
    }
  }
}));

app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/resources', resourceRoutes);
app.use('/api/activity', activityRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/mentors', mentorRoutes); // Add mentor routes

// List routes for each mounted router (more reliable than scanning app._router.stack)
function listMountedRoutes() {
  try {
    const mounted = [
      { prefix: '/api/auth', router: authRoutes },
      { prefix: '/api/resources', router: resourceRoutes },
      { prefix: '/api/activity', router: activityRoutes },
      { prefix: '/api/reports', router: reportRoutes },
      { prefix: '/api/mentors', router: mentorRoutes } // Add to mounted routes list
    ];

    const out = [];
    mounted.forEach(({ prefix, router }) => {
      if (!router || !router.stack) {
        out.push(`(no router.stack) ${prefix}`);
        return;
      }
      router.stack.forEach(layer => {
        // layer.route exists for direct routes on the router
        if (layer.route && layer.route.path) {
          const methods = Object.keys(layer.route.methods || {}).map(m => m.toUpperCase()).join(',');
          out.push(`${methods} ${prefix}${layer.route.path}`);
        } else if (layer.name === 'router' && layer.handle && layer.handle.stack) {
          // nested router - iterate inner stack
          layer.handle.stack.forEach(inner => {
            if (inner.route && inner.route.path) {
              const methods = Object.keys(inner.route.methods || {}).map(m => m.toUpperCase()).join(',');
              out.push(`${methods} ${prefix}${inner.route.path}`);
            }
          });
        }
      });
    });

    console.log('Mounted routes:\n', out.join('\n') || '(none)');
  } catch (e) {
    console.warn('Could not list mounted routes:', e && e.message);
  }
}
listMountedRoutes();

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'Server is running' });
});

// 404 handler (improved message for easier debugging)
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    method: req.method,
    path: req.originalUrl,
    hint: 'Confirm you are using the /api/* prefix (eg. /api/auth/register) and the correct HTTP method'
  });
});

// Improved error handler with more details
app.use((err, req, res, next) => {
  console.error('Error:', err.stack);
  
  // Handle JSON syntax errors
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({ 
      success: false, 
      message: 'Invalid JSON in request body',
      error: 'syntax_error'
    });
  }
  
  res.status(err.status || 500).json({ 
    success: false, 
    message: err.message || 'Server Error',
    error: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

module.exports = app;