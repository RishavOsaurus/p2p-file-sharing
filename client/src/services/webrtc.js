const STUN_SERVER = 'stun:stun.l.google.com:19302';
const CHUNK_SIZE = 64 * 1024; // 64KB

export const createPeerConnection = () => {
  const pc = new RTCPeerConnection({
    iceServers: [{ urls: [STUN_SERVER] }],
  });
  return pc;
};

export const createDataChannel = (pc, label) => {
  const channel = pc.createDataChannel(label, {
    bufferedAmountLowThreshold: 65536,
  });
  return channel;
};

export const createOffer = async (pc) => {
  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);
  return offer;
};

export const createAnswer = async (pc, offer) => {
  await pc.setRemoteDescription(new RTCSessionDescription(offer));
  const answer = await pc.createAnswer();
  await pc.setLocalDescription(answer);
  return answer;
};

export const setRemoteAnswer = async (pc, answer) => {
  await pc.setRemoteDescription(new RTCSessionDescription(answer));
};

export const addIceCandidate = async (pc, candidate) => {
  if (candidate) {
    await pc.addIceCandidate(new RTCIceCandidate(candidate));
  }
};

export const sendFileMetadata = (channel, files) => {
  const metadata = {
    type: 'file-meta',
    files: files.map((f) => ({
      name: f.name,
      size: f.size,
      type: f.type,
    })),
  };
  channel.send(JSON.stringify(metadata));
};

export const sendFileChunks = async (channel, file, onProgress) => {
  const reader = new FileReader();
  let offset = 0;

  return new Promise((resolve, reject) => {
    const readNextChunk = () => {
      if (offset >= file.size) {
        channel.send(JSON.stringify({ type: 'file-end', name: file.name }));
        resolve();
        return;
      }

      const chunk = file.slice(offset, offset + CHUNK_SIZE);
      reader.onload = (e) => {
        channel.send(e.target.result);
        offset += CHUNK_SIZE;
        onProgress?.(offset, file.size);

        // Wait for bufferedAmount to decrease
        if (channel.bufferedAmount > 1024 * 1024) {
          channel.onbufferedamountlow = () => {
            channel.onbufferedamountlow = null;
            readNextChunk();
          };
        } else {
          readNextChunk();
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
      const message = JSON.parse(event.data.toString());
      if (message.type === 'file-meta') {
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
          delete receivedFiles[message.name];
          onComplete?.();
        }
      }
    } catch (e) {
      // Binary data (file chunks)
      if (event.data instanceof ArrayBuffer) {
        // Find which file this chunk belongs to
        // For now, assume first file in progress
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
