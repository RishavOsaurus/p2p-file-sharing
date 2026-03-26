const STUN_SERVERS = [
  'stun:stun.l.google.com:19302',
  'stun:stun1.l.google.com:19302',
  'stun:stun2.l.google.com:19302',
  'stun:stun3.l.google.com:19302',
];

// Free public TURN servers
const TURN_SERVERS = [
  {
    urls: ['turn:openrelay.metered.ca:80'],
    username: 'openrelayproject',
    credential: 'openrelayproject',
  },
  {
    urls: ['turn:openrelay.metered.ca:443'],
    username: 'openrelayproject',
    credential: 'openrelayproject',
  },
];

const CHUNK_SIZE = 64 * 1024; // 64KB
const MAX_BUFFER_SIZE = 1024 * 1024; // 1MB

export const createPeerConnection = () => {
  try {
    const config = {
      iceServers: [
        { urls: STUN_SERVERS },
        ...TURN_SERVERS,
      ],
      iceCandidatePoolSize: 10,
    };

    const pc = new RTCPeerConnection(config);
    
    console.log('[WEBRTC] Peer connection created with config:', config);

    // Monitor connection state changes
    pc.onconnectionstatechange = () => {
      console.log('[WEBRTC] Connection state:', pc.connectionState);
    };

    pc.oniceconnectionstatechange = () => {
      console.log('[WEBRTC] ICE connection state:', pc.iceConnectionState);
    };

    pc.onicecandidate = (e) => {
      if (e.candidate) {
        console.log('[WEBRTC] ICE candidate generated:', e.candidate.candidate.substring(0, 50));
      } else {
        console.log('[WEBRTC] ICE candidate gathering completed');
      }
    };

    pc.onsignalingstatechange = () => {
      console.log('[WEBRTC] Signaling state:', pc.signalingState);
    };

    return pc;
  } catch (error) {
    console.error('[WEBRTC] Failed to create peer connection:', error);
    throw error;
  }
};

export const createDataChannel = (pc, label = 'file-transfer') => {
  try {
    const channel = pc.createDataChannel(label, {
      ordered: true,
    });
    channel.bufferedAmountLowThreshold = 65536;
    console.log('[WEBRTC] DataChannel created:', label);
    return channel;
  } catch (error) {
    console.error('[WEBRTC] Failed to create DataChannel:', error);
    throw error;
  }
};

export const setupDataChannelHandlers = (channel, onOpen, onClose, onError) => {
  try {
    channel.onopen = () => {
      console.log('[WEBRTC] DataChannel opened');
      onOpen?.();
    };

    channel.onclose = () => {
      console.log('[WEBRTC] DataChannel closed');
      onClose?.();
    };

    channel.onerror = (error) => {
      console.error('[WEBRTC] DataChannel error:', error);
      onError?.(error);
    };
  } catch (error) {
    console.error('[WEBRTC] Failed to setup DataChannel handlers:', error);
    throw error;
  }
};

export const waitForDataChannel = (channel) => {
  return new Promise((resolve, reject) => {
    if (!channel) {
      reject(new Error('DataChannel is null or undefined'));
      return;
    }

    console.log('[WEBRTC] Waiting for DataChannel to open (current state:', channel.readyState, ')');

    if (channel.readyState === 'open') {
      console.log('[WEBRTC] DataChannel already open');
      resolve(channel);
      return;
    }

    if (channel.readyState === 'closed') {
      reject(new Error('DataChannel is closed'));
      return;
    }

    const timeout = setTimeout(() => {
      channel.removeEventListener('open', onOpen);
      reject(new Error('DataChannel open timeout (30 seconds)'));
    }, 30000);

    const onOpen = () => {
      clearTimeout(timeout);
      channel.removeEventListener('open', onOpen);
      console.log('[WEBRTC] DataChannel opened via event listener');
      resolve(channel);
    };

    channel.addEventListener('open', onOpen);
  });
};

export const createOffer = async (pc) => {
  try {
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    console.log('[WEBRTC] Offer created and set as local description');
    return offer;
  } catch (error) {
    console.error('[WEBRTC] Failed to create offer:', error);
    throw error;
  }
};

export const createAnswer = async (pc, offer) => {
  try {
    const rtcOffer = new RTCSessionDescription(offer);
    await pc.setRemoteDescription(rtcOffer);
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    console.log('[WEBRTC] Answer created and set as local description');
    return answer;
  } catch (error) {
    console.error('[WEBRTC] Failed to create answer:', error);
    throw error;
  }
};

export const setRemoteAnswer = async (pc, answer) => {
  try {
    const rtcAnswer = new RTCSessionDescription(answer);
    await pc.setRemoteDescription(rtcAnswer);
    console.log('[WEBRTC] Remote answer set');
  } catch (error) {
    console.error('[WEBRTC] Failed to set remote answer:', error);
    throw error;
  }
};

export const addIceCandidate = async (pc, candidate) => {
  try {
    if (candidate) {
      await pc.addIceCandidate(new RTCIceCandidate(candidate));
      console.log('[WEBRTC] ICE candidate added');
    }
  } catch (error) {
    console.error('[WEBRTC] Failed to add ICE candidate:', error);
    // Don't throw - ICE candidates can fail
  }
};

export const sendFileMetadata = (channel, files) => {
  try {
    if (channel.readyState !== 'open') {
      throw new Error('DataChannel not open');
    }
    const metadata = {
      type: 'file-meta',
      files: files.map((f) => ({
        name: f.name,
        size: f.size,
        type: f.type,
      })),
    };
    channel.send(JSON.stringify(metadata));
    console.log('[FILE-TRANSFER] Metadata sent for', files.length, 'files');
  } catch (error) {
    console.error('[FILE-TRANSFER] Failed to send metadata:', error);
    throw error;
  }
};

export const sendFileChunks = async (channel, file, onProgress) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    let offset = 0;

    const readNextChunk = () => {
      if (offset >= file.size) {
        try {
          channel.send(JSON.stringify({ type: 'file-end', name: file.name }));
          console.log('[FILE-TRANSFER] File complete:', file.name);
        } catch (error) {
          console.error('[FILE-TRANSFER] Failed to send file-end:', error);
        }
        resolve();
        return;
      }

      const chunk = file.slice(offset, offset + CHUNK_SIZE);
      reader.onload = (e) => {
        try {
          const data = e.target.result;
          
          // Check if buffer is too full
          if (channel.bufferedAmount > MAX_BUFFER_SIZE) {
            console.log('[FILE-TRANSFER] Buffer full, waiting...');
            channel.onbufferedamountlow = () => {
              channel.onbufferedamountlow = null;
              try {
                channel.send(data);
                offset += CHUNK_SIZE;
                onProgress?.(offset, file.size);
                readNextChunk();
              } catch (error) {
                reject(error);
              }
            };
          } else {
            channel.send(data);
            offset += CHUNK_SIZE;
            onProgress?.(offset, file.size);
            readNextChunk();
          }
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(chunk);
    };

    readNextChunk();
  });
};

export const receiveFileChunks = (channel, onChunk, onComplete) => {
  const receivedFiles = {};

  channel.onmessage = (event) => {
    try {
      // Try to parse as JSON (control messages)
      const message = JSON.parse(
        event.data instanceof ArrayBuffer
          ? new TextDecoder().decode(event.data)
          : event.data
      );

      if (message.type === 'file-meta') {
        console.log('[FILE-TRANSFER] Received metadata for', message.files.length, 'files');
        message.files.forEach((file) => {
          receivedFiles[file.name] = {
            name: file.name,
            size: file.size,
            type: file.type,
            chunks: [],
            receivedSize: 0,
          };
        });
      } else if (message.type === 'file-end') {
        const file = receivedFiles[message.name];
        if (file) {
          const blob = new Blob(file.chunks, { type: file.type });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = file.name;
          a.click();
          URL.revokeObjectURL(url);
          console.log('[FILE-TRANSFER] File downloaded:', file.name);
          delete receivedFiles[message.name];
          onComplete?.();
        }
      }
    } catch (e) {
      // Binary data (file chunks)
      if (event.data instanceof ArrayBuffer) {
        const fileNames = Object.keys(receivedFiles).filter(
          (name) =>
            receivedFiles[name].receivedSize < receivedFiles[name].size
        );
        if (fileNames.length > 0) {
          const file = receivedFiles[fileNames[0]];
          file.chunks.push(event.data);
          file.receivedSize += event.data.byteLength;
          onChunk?.(fileNames[0], file.receivedSize, file.size);
        }
      }
    }
  };
};

export const validateFiles = (files) => {
  if (!Array.isArray(files) || files.length === 0) {
    throw new Error('No files selected');
  }
  
  const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB per file
  const MAX_TOTAL_SIZE = 500 * 1024 * 1024; // 500MB total
  
  let totalSize = 0;
  for (const file of files) {
    if (file.size > MAX_FILE_SIZE) {
      throw new Error(`File too large: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB)`);
    }
    totalSize += file.size;
  }
  
  if (totalSize > MAX_TOTAL_SIZE) {
    throw new Error(`Total size too large: ${(totalSize / 1024 / 1024).toFixed(2)}MB`);
  }
  
  return true;
};
