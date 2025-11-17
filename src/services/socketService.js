const { Server } = require('socket.io');

let io;
const userSockets = new Map(); // Map userId to socket.id

function initializeSocket(server) {
  const allowedOrigins = [
    'https://her-raise-hub.vercel.app',
    'http://localhost:5173',
    'https://her-raise-qywpgby4w-dorcus-projects-926b115e.vercel.app',
    'https://her-raise-pyaoi58m4-dorcus-projects-926b115e.vercel.app',
    'http://localhost:10000',
    'https://herraise-hub-backend.onrender.com'
  ];
  
  io = new Server(server, {
    cors: {
      origin: (origin, callback) => {
        // Allow requests with no origin (mobile apps, etc.)
        if (!origin) return callback(null, true);
        
        // Allow localhost
        if (origin.includes('localhost')) return callback(null, true);
        
        // Allow vercel.app domains
        if (origin.includes('.vercel.app')) return callback(null, true);
        
        // Allow render.com domains
        if (origin.includes('.onrender.com')) return callback(null, true);
        
        // Allow specific origins
        if (allowedOrigins.includes(origin)) return callback(null, true);
        
        callback(null, true); // Allow all for now to fix connection issues
      },
      methods: ['GET', 'POST'],
      credentials: true
    },
    transports: ['websocket', 'polling'],
    allowEIO3: true
  });

  io.on('connection', (socket) => {
    console.log(` Client connected: ${socket.id}`);

    
    // Auto-authenticate from JWT token in handshake
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;
    if (token) {
      try {
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const userId = decoded.id;
        
        userSockets.set(userId, socket.id);
        socket.userId = userId;
        console.log(`User ${userId} authenticated with socket ${socket.id}`);
        
        // Join user's personal room
        socket.join(`user_${userId}`);
      } catch (error) {
        console.log(' Socket authentication failed:', error.message);
      }
    }
    
    // Manual authentication (backup)
    socket.on('authenticate', (userId) => {
      if (userId) {
        userSockets.set(userId, socket.id);
        socket.userId = userId;
        console.log(` User ${userId} authenticated with socket ${socket.id}`);
        
        // Join user's personal room
        socket.join(`user_${userId}`);
      }
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      if (socket.userId) {
        userSockets.delete(socket.userId);
        console.log(` User ${socket.userId} disconnected`);
      }
    });
  });

  console.log(' Socket.IO initialized');
  return io;
}

// Emit to specific user
function emitToUser(userId, event, data) {
  if (!io) return;
  
  const socketId = userSockets.get(userId);
  if (socketId) {
    io.to(socketId).emit(event, data);
    console.log(` Emitted ${event} to user ${userId}`);
  } else {
    console.log(` User ${userId} not connected`);
  }
}

// Emit to multiple users
function emitToUsers(userIds, event, data) {
  userIds.forEach(userId => emitToUser(userId, event, data));
}

// Broadcast to all users
function broadcast(event, data) {
  if (!io) return;
  io.emit(event, data);
  console.log(`📢 Broadcasted ${event} to all users`);
}

// Emit new opportunity notification
function notifyNewOpportunity(opportunity) {
  broadcast('opportunity:new', {
    id: opportunity.id,
    title: opportunity.title,
    type: opportunity.type,
    organization: opportunity.organization,
    deadline: opportunity.applicationDeadline,
    createdAt: opportunity.createdAt
  });
}

// Emit application status update
function notifyApplicationStatus(userId, application) {
  emitToUser(userId, 'application:status_update', {
    applicationId: application.id,
    opportunityTitle: application.Opportunity?.title,
    status: application.status,
    notes: application.notes,
    updatedAt: new Date()
  });
}

// Emit deadline reminder
function notifyDeadlineReminder(userId, opportunity, daysLeft) {
  emitToUser(userId, 'opportunity:deadline_reminder', {
    opportunityId: opportunity.id,
    title: opportunity.title,
    deadline: opportunity.applicationDeadline,
    daysLeft,
    message: `Only ${daysLeft} day${daysLeft > 1 ? 's' : ''} left to apply!`
  });
}

module.exports = {
  initializeSocket,
  emitToUser,
  emitToUsers,
  broadcast,
  notifyNewOpportunity,
  notifyApplicationStatus,
  notifyDeadlineReminder,
  getIO: () => io
};
