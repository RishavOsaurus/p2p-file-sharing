import { useEffect, useRef } from 'react';
import useAppStore from '../store/appStore';
import {
  createPeerConnection,
  createDataChannel,
  createOffer,
  createAnswer,
  setRemoteAnswer,
  addIceCandidate,
} from '../services/webrtc';
import { getSocket } from '../services/socket';

export const useWebRTC = () => {
  const {
    peerConnection,
    setPeerConnection,
    dataChannel,
    setDataChannel,
  } = useAppStore();

  const initiatorRef = useRef(false);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    socket.on('offer', async ({ from, offer }) => {
      if (!peerConnection) {
        const pc = createPeerConnection();
        setPeerConnection(pc);

        pc.ondatachannel = (event) => {
          setDataChannel(event.channel);
        };

        const answer = await createAnswer(pc, offer);
        socket.emit('answer', { to: from, answer });

        pc.onicecandidate = (event) => {
          if (event.candidate) {
            socket.emit('ice-candidate', { to: from, candidate: event.candidate });
          }
        };
      }
    });

    socket.on('answer', async ({ answer }) => {
      if (peerConnection) {
        await setRemoteAnswer(peerConnection, answer);
      }
    });

    socket.on('ice-candidate', async ({ candidate }) => {
      if (peerConnection) {
        await addIceCandidate(peerConnection, candidate);
      }
    });

    return () => {
      socket.off('offer');
      socket.off('answer');
      socket.off('ice-candidate');
    };
  }, [peerConnection, setPeerConnection, setDataChannel]);

  const initiateConnection = async (targetId) => {
    const socket = getSocket();
    if (!socket) return;

    const pc = createPeerConnection();
    setPeerConnection(pc);
    initiatorRef.current = true;

    const channel = createDataChannel(pc, 'file-transfer');
    setDataChannel(channel);

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('ice-candidate', { to: targetId, candidate: event.candidate });
      }
    };

    const offer = await createOffer(pc);
    socket.emit('offer', { to: targetId, offer });
  };

  return { initiateConnection };
};
