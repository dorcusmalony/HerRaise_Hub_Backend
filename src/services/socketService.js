const { Server } = require('socket.io');

let io;
const userSockets = new Map(); // Map userId to socket.id

function initializeSocket(server) {
  io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL || 'https://her-raise-hub.vercel.app',
      methods: ['GET', 'POST'],
      credentials: true
    }
  });

  io.on('connection', (socket) => {
    console.log(`🔌 Client connected: ${socket.id}`);

    // User authentication
    socket.on('authenticate', (userId) => {
      if (userId) {
        userSockets.set(userId, socket.id);
        socket.userId = userId;
        console.log(`✅ User ${userId} authenticated with socket ${socket.id}`);
        
        // Join user's personal room
        socket.join(`user:${userId}`);
      }
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      if (socket.userId) {
        userSockets.delete(socket.userId);
        console.log(`❌ User ${socket.userId} disconnected`);
      }
    });
  });

  console.log('✅ Socket.IO initialized');
  return io;
}

// Emit to specific user
function emitToUser(userId, event, data) {
  if (!io) return;
  
  const socketId = userSockets.get(userId);
  if (socketId) {
    io.to(socketId).emit(event, data);
    console.log(`📤 Emitted ${event} to user ${userId}`);
  } else {
    console.log(`⚠️ User ${userId} not connected`);
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
