import io from 'socket.io-client';

let socket = null;

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

export const initSocket = () => {
  if (!socket) {
    socket = io(SOCKET_URL, {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
    });
    
    socket.on('connect', () => {
      console.log('[SOCKET] Connected to server');
    });
    
    socket.on('disconnect', () => {
      console.log('[SOCKET] Disconnected from server');
    });
    
    socket.on('error', (error) => {
      console.error('[SOCKET] Error:', error);
    });
  }
  return socket;
};

export const getSocket = () => {
  if (!socket) {
    return initSocket();
  }
  return socket;
};

export const isSocketConnected = () => {
  return socket && socket.connected;
};

export const emitJoin = (name, room) => {
  if (!isSocketConnected()) {
    console.error('[SOCKET] Not connected');
    return false;
  }
  socket?.emit('join', { name, room });
  return true;
};

export const emitOffer = (to, offer) => {
  socket?.emit('offer', { to, offer });
};

export const emitAnswer = (to, answer) => {
  socket?.emit('answer', { to, answer });
};

export const emitIceCandidate = (to, candidate) => {
  socket?.emit('ice-candidate', { to, candidate });
};

export const emitSendRequest = (to, files) => {
  socket?.emit('send-request', { to, files });
};

export const emitAcceptRequest = (to) => {
  socket?.emit('accept-request', { to });
};

export const emitRejectRequest = (to) => {
  socket?.emit('reject-request', { to });
};
