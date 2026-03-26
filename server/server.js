import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});

const PORT = process.env.PORT || 5000;

// Device storage: Map<socketId, { name, room }>
const devices = new Map();
const rooms = new Map(); // Map<roomId, Set<socketId>>

app.use(cors());
app.use(express.json());

// REST endpoint for health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

app.get('/api/rooms', (req, res) => {
  const roomList = Array.from(rooms.entries()).map(([roomId, socketIds]) => ({
    roomId,
    deviceCount: socketIds.size,
  }));
  res.json({ rooms: roomList });
});

app.get('/api/devices/:room', (req, res) => {
  const room = req.params.room;
  const socketIds = rooms.get(room) || new Set();
  const deviceList = Array.from(socketIds).map(id => ({
    id,
    name: devices.get(id)?.name || 'Unknown',
  }));
  res.json({ devices: deviceList });
});

// Socket.IO event handlers
io.on('connection', (socket) => {
  console.log(`[CONNECTION] Client connected: ${socket.id}`);

  socket.on('join', ({ name, room }) => {
    if (!name || !room) {
      socket.emit('error', { message: 'Name and room required' });
      return;
    }

    socket.join(room);
    
    // Store device info
    devices.set(socket.id, { name, room });
    
    // Track devices in room
    if (!rooms.has(room)) {
      rooms.set(room, new Set());
    }
    rooms.get(room).add(socket.id);
    
    // Broadcast updated device list to room
    const deviceList = Array.from(rooms.get(room)).map(id => ({
      id,
      name: devices.get(id)?.name || 'Unknown',
    }));
    
    io.to(room).emit('devices', deviceList);
    console.log(`[JOIN] Device joined room "${room}": ${name} (${socket.id})`);
  });

  socket.on('offer', ({ to, offer }) => {
    if (!to || !offer) {
      socket.emit('error', { message: 'Invalid offer' });
      return;
    }
    socket.to(to).emit('offer', { from: socket.id, offer });
    console.log(`[OFFER] From ${socket.id} to ${to}`);
  });

  socket.on('answer', ({ to, answer }) => {
    if (!to || !answer) {
      socket.emit('error', { message: 'Invalid answer' });
      return;
    }
    socket.to(to).emit('answer', { from: socket.id, answer });
    console.log(`[ANSWER] From ${socket.id} to ${to}`);
  });

  socket.on('ice-candidate', ({ to, candidate }) => {
    if (!to || !candidate) {
      socket.emit('error', { message: 'Invalid ICE candidate' });
      return;
    }
    socket.to(to).emit('ice-candidate', { from: socket.id, candidate });
  });

  socket.on('send-request', ({ to, files }) => {
    if (!to || !files || !Array.isArray(files)) {
      socket.emit('error', { message: 'Invalid transfer request' });
      return;
    }
    socket.to(to).emit('send-request', {
      from: socket.id,
      fromName: devices.get(socket.id)?.name || 'Unknown',
      files,
    });
    console.log(`[SEND-REQUEST] From ${socket.id} to ${to}, ${files.length} files`);
  });

  socket.on('accept-request', ({ to }) => {
    if (!to) {
      socket.emit('error', { message: 'Invalid recipient' });
      return;
    }
    socket.to(to).emit('accept-request', { from: socket.id });
    console.log(`[ACCEPT-REQUEST] From ${socket.id} to ${to}`);
  });

  socket.on('reject-request', ({ to }) => {
    if (!to) {
      socket.emit('error', { message: 'Invalid recipient' });
      return;
    }
    socket.to(to).emit('reject-request', { from: socket.id });
    console.log(`[REJECT-REQUEST] From ${socket.id} to ${to}`);
  });

  socket.on('disconnect', () => {
    const device = devices.get(socket.id);
    if (device) {
      const room = device.room;
      devices.delete(socket.id);
      rooms.get(room)?.delete(socket.id);
      
      // Broadcast updated device list
      const deviceList = Array.from(rooms.get(room) || new Set()).map(id => ({
        id,
        name: devices.get(id)?.name || 'Unknown',
      }));
      
      io.to(room).emit('devices', deviceList);
      console.log(`[DISCONNECT] Device left room "${room}": ${device.name} (${socket.id})`);
    }
  });

  socket.on('error', (error) => {
    console.error(`[ERROR] Socket ${socket.id}:`, error);
  });
});

httpServer.listen(PORT, () => {
  console.log(`\n[SERVER] P2P Signaling server running on port ${PORT}`);
  console.log(`[SERVER] Health check: http://localhost:${PORT}/health`);
  console.log(`[SERVER] WebSocket signaling ready\n`);
});

export { io, app, httpServer, devices, rooms };
