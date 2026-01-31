import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { config } from './config/index.js';
import { errorHandler } from './middleware/errorHandler.js';
import { authRouter } from './routes/auth.js';
import { teamsRouter } from './routes/teams.js';
import { videosRouter } from './routes/videos.js';
import { annotationsRouter } from './routes/annotations.js';
import { clipsRouter } from './routes/clips.js';
import { aiRouter } from './routes/ai.js';
import { setupSocketHandlers } from './socket/index.js';

const app = express();
const httpServer = createServer(app);

// Socket.io setup
const io = new Server(httpServer, {
  cors: {
    origin: config.corsOrigin,
    methods: ['GET', 'POST'],
  },
});

// Middleware
app.use(helmet());
app.use(cors({ origin: config.corsOrigin }));
app.use(morgan('combined'));
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/teams', teamsRouter);
app.use('/api/v1/videos', videosRouter);
app.use('/api/v1/annotations', annotationsRouter);
app.use('/api/v1/clips', clipsRouter);
app.use('/api/v1/ai', aiRouter);

// Error handling
app.use(errorHandler);

// Socket.io handlers
setupSocketHandlers(io);

// Start server
httpServer.listen(config.port, () => {
  console.log(`Server running on port ${config.port}`);
  console.log(`Environment: ${config.nodeEnv}`);
});

export { app, io };
