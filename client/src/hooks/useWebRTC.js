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
import { getSocket, emitOffer, emitAnswer, emitIceCandidate } from '../services/socket';

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
      console.log('[WEBRTC-HOOK] Received offer from', from);
      try {
        if (!peerConnection) {
          const pc = createPeerConnection();
          setPeerConnection(pc);

          pc.ondatachannel = (event) => {
            console.log('[WEBRTC-HOOK] DataChannel received');
            setDataChannel(event.channel);
          };

          const answer = await createAnswer(pc, offer);
          emitAnswer(from, answer);

          pc.onicecandidate = (event) => {
            if (event.candidate) {
              emitIceCandidate(from, event.candidate);
            }
          };
        }
      } catch (error) {
        console.error('[WEBRTC-HOOK] Error handling offer:', error);
      }
    });

    socket.on('answer', async ({ answer }) => {
      console.log('[WEBRTC-HOOK] Received answer');
      try {
        if (peerConnection) {
          await setRemoteAnswer(peerConnection, answer);
        }
      } catch (error) {
        console.error('[WEBRTC-HOOK] Error handling answer:', error);
      }
    });

    socket.on('ice-candidate', async ({ candidate }) => {
      try {
        if (peerConnection) {
          await addIceCandidate(peerConnection, candidate);
        }
      } catch (error) {
        console.error('[WEBRTC-HOOK] Error handling ICE candidate:', error);
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
    if (!socket) throw new Error('Socket not connected');

    try {
      console.log('[WEBRTC-HOOK] Initiating connection to', targetId);
      const pc = createPeerConnection();
      setPeerConnection(pc);
      initiatorRef.current = true;

      const channel = createDataChannel(pc);
      setDataChannel(channel);

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          emitIceCandidate(targetId, event.candidate);
        }
      };

      const offer = await createOffer(pc);
      emitOffer(targetId, offer);
    } catch (error) {
      console.error('[WEBRTC-HOOK] Error initiating connection:', error);
      throw error;
    }
  };

  return { initiateConnection };
};
