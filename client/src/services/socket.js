import io from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

let socket = null;

export const initSocket = () => {
  if (!socket) {
    socket = io(SOCKET_URL, {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
    });
  }
  return socket;
};

export const getSocket = () => socket;

export const emitJoin = (name, room) => {
  socket?.emit('join', { name, room });
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
