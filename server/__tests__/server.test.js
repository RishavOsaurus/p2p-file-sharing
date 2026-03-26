import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { io as ioServer } from '../server.js';
import { Server as IOClient } from 'socket.io-client';
import http from 'http';

describe('P2P Backend Server Tests', () => {
  let clientSocket1, clientSocket2;
  const SERVER_URL = 'http://localhost:5000';

  beforeAll((done) => {
    setTimeout(done, 1000);
  });

  afterAll(() => {
    clientSocket1?.disconnect();
    clientSocket2?.disconnect();
  });

  describe('Server Health', () => {
    it('should respond to health check', (done) => {
      fetch('http://localhost:5000/health')
        .then(res => res.json())
        .then(data => {
          expect(data.status).toBe('ok');
          expect(data.timestamp).toBeDefined();
          done();
        })
        .catch(done);
    });
  });

  describe('Socket Connection', () => {
    it('should connect client to WebSocket', (done) => {
      clientSocket1 = new IOClient(SERVER_URL, {
        reconnectionDelay: 0,
        reconnection: false,
        forceNew: true,
      });

      clientSocket1.on('connect', () => {
        expect(clientSocket1.connected).toBe(true);
        done();
      });
    });
  });

  describe('Device Join/Leave', () => {
    it('should allow device to join room', (done) => {
      clientSocket1 = new IOClient(SERVER_URL, {
        reconnectionDelay: 0,
        reconnection: false,
        forceNew: true,
      });

      clientSocket1.on('connect', () => {
        clientSocket1.emit('join', { name: 'Phone', room: 'test-room' });
        
        clientSocket1.on('devices', (deviceList) => {
          expect(Array.isArray(deviceList)).toBe(true);
          expect(deviceList.length).toBeGreaterThan(0);
          done();
        });
      });
    });

    it('should handle invalid join request', (done) => {
      clientSocket1 = new IOClient(SERVER_URL, {
        reconnectionDelay: 0,
        reconnection: false,
        forceNew: true,
      });

      clientSocket1.on('connect', () => {
        clientSocket1.emit('join', { name: '', room: '' });
        
        clientSocket1.on('error', (error) => {
          expect(error.message).toBeDefined();
          done();
        });
      });
    });
  });

  describe('Device Discovery', () => {
    it('should broadcast devices when one joins', (done) => {
      clientSocket1 = new IOClient(SERVER_URL, {
        reconnectionDelay: 0,
        reconnection: false,
        forceNew: true,
      });

      clientSocket1.on('connect', () => {
        clientSocket1.emit('join', { name: 'Device1', room: 'discover-test' });
        
        let deviceCount = 0;
        clientSocket1.on('devices', (deviceList) => {
          deviceCount++;
          if (deviceCount === 2) {
            expect(deviceList.length).toBe(2);
            done();
          }
        });

        setTimeout(() => {
          clientSocket2 = new IOClient(SERVER_URL, {
            reconnectionDelay: 0,
            reconnection: false,
            forceNew: true,
          });

          clientSocket2.on('connect', () => {
            clientSocket2.emit('join', { name: 'Device2', room: 'discover-test' });
          });
        }, 500);
      });
    });
  });

  describe('WebRTC Signaling', () => {
    it('should relay offer correctly', (done) => {
      const mockOffer = { type: 'offer', sdp: 'mock-sdp' };
      
      clientSocket1 = new IOClient(SERVER_URL, {
        reconnectionDelay: 0,
        reconnection: false,
        forceNew: true,
      });

      clientSocket1.on('connect', () => {
        clientSocket1.emit('join', { name: 'Sender', room: 'signal-test' });

        setTimeout(() => {
          clientSocket2 = new IOClient(SERVER_URL, {
            reconnectionDelay: 0,
            reconnection: false,
            forceNew: true,
          });

          clientSocket2.on('connect', () => {
            clientSocket2.emit('join', { name: 'Receiver', room: 'signal-test' });

            clientSocket2.on('offer', (data) => {
              expect(data.offer).toEqual(mockOffer);
              expect(data.from).toBeDefined();
              done();
            });
          });
        }, 300);

        clientSocket1.on('devices', (deviceList) => {
          if (deviceList.length > 1) {
            const receiverId = deviceList.find(d => d.name === 'Receiver')?.id;
            if (receiverId) {
              clientSocket1.emit('offer', { to: receiverId, offer: mockOffer });
            }
          }
        });
      });
    });
  });

  describe('Transfer Requests', () => {
    it('should handle send-request event', (done) => {
      clientSocket1 = new IOClient(SERVER_URL, {
        reconnectionDelay: 0,
        reconnection: false,
        forceNew: true,
      });

      clientSocket1.on('connect', () => {
        clientSocket1.emit('join', { name: 'Sender', room: 'transfer-test' });

        setTimeout(() => {
          clientSocket2 = new IOClient(SERVER_URL, {
            reconnectionDelay: 0,
            reconnection: false,
            forceNew: true,
          });

          clientSocket2.on('connect', () => {
            clientSocket2.emit('join', { name: 'Receiver', room: 'transfer-test' });

            clientSocket2.on('send-request', (data) => {
              expect(data.fromName).toBe('Sender');
              expect(data.files).toEqual([{ name: 'file.txt', size: 1024 }]);
              done();
            });
          });
        }, 300);

        clientSocket1.on('devices', (deviceList) => {
          if (deviceList.length > 1) {
            const receiverId = deviceList.find(d => d.name === 'Receiver')?.id;
            if (receiverId) {
              clientSocket1.emit('send-request', {
                to: receiverId,
                files: [{ name: 'file.txt', size: 1024 }],
              });
            }
          }
        });
      });
    });
  });
});
