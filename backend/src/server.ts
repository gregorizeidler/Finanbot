import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import rateLimit from 'express-rate-limit';

import { config } from './config/env';
import prisma from './config/database';

// Import routes
import authRoutes from './routes/auth';
import userRoutes from './routes/user';
import accountRoutes from './routes/accounts';
import transactionRoutes from './routes/transactions';
import chatRoutes from './routes/chat';
import openFinanceRoutes from './routes/openFinance';
import dashboardRoutes from './routes/dashboard';

// Import middleware
import { errorHandler } from './middleware/errorHandler';
import { authenticateJWT } from './middleware/auth';

// Create Express app
const app = express();
const server = createServer(app);

// Setup Socket.IO
const io = new SocketIOServer(server, {
  cors: {
    origin: config.socketIO.corsOrigin,
    methods: ['GET', 'POST'],
  },
});

// Rate limiter configuration removed - using express-rate-limit instead

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// CORS configuration
app.use(cors({
  origin: config.cors.origin,
  credentials: true,
}));

// General middleware
app.use(compression());
app.use(morgan(config.env === 'production' ? 'combined' : 'dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting middleware
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    error: {
      code: 'TOO_MANY_REQUESTS',
      message: 'Too many requests. Please try again later.',
    },
  },
});

app.use(limiter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    success: true,
    data: {
      status: 'OK',
      timestamp: new Date().toISOString(),
      environment: config.env,
    },
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/user', authenticateJWT, userRoutes);
app.use('/api/accounts', authenticateJWT, accountRoutes);
app.use('/api/transactions', authenticateJWT, transactionRoutes);
app.use('/api/chat', authenticateJWT, chatRoutes);
app.use('/api/open-finance', authenticateJWT, openFinanceRoutes);
app.use('/api/dashboard', authenticateJWT, dashboardRoutes);

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  socket.on('join-room', (userId: string) => {
    socket.join(`user:${userId}`);
    console.log(`User ${userId} joined room`);
  });

  socket.on('chat-message', async (data) => {
    try {
      // Emit message to user's room
      socket.to(`user:${data.userId}`).emit('new-message', data);
    } catch (error) {
      console.error('Socket.IO error:', error);
      socket.emit('error', { message: 'Failed to process message' });
    }
  });

  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.originalUrl} not found`,
    },
  });
});

// Global error handler
app.use(errorHandler);

// Graceful shutdown
const gracefulShutdown = async () => {
  console.log('Starting graceful shutdown...');
  
  server.close(async () => {
    console.log('HTTP server closed.');
    
    try {
      await prisma.$disconnect();
      console.log('Database connection closed.');
      process.exit(0);
    } catch (error) {
      console.error('Error during shutdown:', error);
      process.exit(1);
    }
  });
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// Start server
const port = config.port;
server.listen(port, () => {
  console.log(`🚀 FinanBot server running on port ${port}`);
  console.log(`📊 Environment: ${config.env}`);
  console.log(`🗄️  Database: Connected`);
  console.log(`💬 Socket.IO: Enabled`);
});

export { app, io };
export default server; 