import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';

interface User {
  id: string;
  name: string;
}

interface VideoRoom {
  videoId: string;
  users: Map<string, User>;
}

const videoRooms = new Map<string, VideoRoom>();

export function setupSocketHandlers(io: Server) {
  // Authentication middleware
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;

    if (!token) {
      return next(new Error('Authentication required'));
    }

    try {
      const decoded = jwt.verify(token, config.jwtSecret) as {
        userId: string;
        email: string;
      };
      socket.data.userId = decoded.userId;
      next();
    } catch (err) {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.data.userId}`);

    // Join video room
    socket.on('join-video', async ({ videoId, userName }) => {
      socket.join(`video:${videoId}`);

      // Add to room tracking
      if (!videoRooms.has(videoId)) {
        videoRooms.set(videoId, {
          videoId,
          users: new Map(),
        });
      }

      const room = videoRooms.get(videoId)!;
      room.users.set(socket.id, {
        id: socket.data.userId,
        name: userName,
      });

      // Notify others
      socket.to(`video:${videoId}`).emit('user-joined', {
        userId: socket.data.userId,
        userName,
      });

      // Send current users to the joining user
      const users = Array.from(room.users.values());
      socket.emit('room-users', { users });
    });

    // Leave video room
    socket.on('leave-video', ({ videoId }) => {
      handleLeaveVideo(socket, videoId);
    });

    // Video sync events
    socket.on('video-sync', ({ videoId, currentTime, isPlaying, playbackRate }) => {
      socket.to(`video:${videoId}`).emit('video-sync', {
        userId: socket.data.userId,
        currentTime,
        isPlaying,
        playbackRate,
      });
    });

    // Annotation events
    socket.on('annotation-start', ({ videoId, type }) => {
      socket.to(`video:${videoId}`).emit('annotation-start', {
        userId: socket.data.userId,
        type,
      });
    });

    socket.on('annotation-update', ({ videoId, annotationId, data }) => {
      socket.to(`video:${videoId}`).emit('annotation-update', {
        userId: socket.data.userId,
        annotationId,
        data,
      });
    });

    socket.on('annotation-complete', ({ videoId, annotation }) => {
      socket.to(`video:${videoId}`).emit('annotation-complete', {
        userId: socket.data.userId,
        annotation,
      });
    });

    // Cursor tracking
    socket.on('cursor-move', ({ videoId, position }) => {
      socket.to(`video:${videoId}`).emit('cursor-move', {
        userId: socket.data.userId,
        position,
      });
    });

    // Comment events
    socket.on('comment-added', ({ videoId, comment }) => {
      socket.to(`video:${videoId}`).emit('comment-added', {
        comment,
      });
    });

    // Disconnect
    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.data.userId}`);

      // Remove from all video rooms
      for (const [videoId, room] of videoRooms.entries()) {
        if (room.users.has(socket.id)) {
          handleLeaveVideo(socket, videoId);
        }
      }
    });
  });
}

function handleLeaveVideo(socket: Socket, videoId: string) {
  socket.leave(`video:${videoId}`);

  const room = videoRooms.get(videoId);
  if (room) {
    const user = room.users.get(socket.id);
    room.users.delete(socket.id);

    if (user) {
      socket.to(`video:${videoId}`).emit('user-left', {
        userId: user.id,
      });
    }

    // Clean up empty rooms
    if (room.users.size === 0) {
      videoRooms.delete(videoId);
    }
  }
}
