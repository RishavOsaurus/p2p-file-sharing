import { useEffect, useState } from 'react';
import useAppStore from './store/appStore';
import { 
  initSocket, 
  getSocket, 
  emitJoin, 
  emitSendRequest,
  isSocketConnected,
  emitAcceptRequest,
  emitRejectRequest,
} from './services/socket';
import { useDevices } from './hooks/useDevices';
import { useWebRTC } from './hooks/useWebRTC';
import { 
  sendFileMetadata, 
  sendFileChunks, 
  receiveFileChunks,
  validateFiles,
  waitForDataChannel,
} from './services/webrtc';
import FileInput from './components/FileInput';
import DeviceList from './components/DeviceList';
import RequestModal from './components/RequestModal';
import TransferProgress from './components/TransferProgress';

const App = () => {
  const [deviceName, setDeviceName] = useState('');
  const [room, setRoom] = useState('default-room');
  const [joined, setJoined] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [error, setError] = useState('');
  const [isTransfering, setIsTransfering] = useState(false);
  
  const devices = useDevices();
  const { initiateConnection } = useWebRTC();
  const {
    dataChannel,
    incomingRequest,
    setIncomingRequest,
    addTransfer,
    removeTransfer,
    updateTransfer,
    setIsConnected,
  } = useAppStore();

  // Initialize socket connection
  useEffect(() => {
    try {
      initSocket();
      console.log('[APP] Socket initialized');
    } catch (err) {
      setError('Failed to initialize WebSocket connection');
      console.error('[APP] Socket initialization error:', err);
    }
  }, []);

  // Handle incoming requests
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    socket.on('send-request', ({ from, fromName, files }) => {
      console.log('[APP] Received transfer request from', fromName);
      setIncomingRequest({ from, fromName, files });
    });

    socket.on('accept-request', ({ from }) => {
      console.log('[APP] Request accepted by', from);
      setError('');
    });

    socket.on('reject-request', ({ from }) => {
      console.log('[APP] Request rejected by', from);
      setError('Transfer request was rejected');
    });

    socket.on('error', (error) => {
      console.error('[APP] Socket error:', error);
      setError(error.message || 'Connection error');
    });

    return () => {
      socket.off('send-request');
      socket.off('accept-request');
      socket.off('reject-request');
      socket.off('error');
    };
  }, [setIncomingRequest]);

  // Setup data channel listeners
  useEffect(() => {
    if (!dataChannel) return;

    console.log('[APP] Setting up DataChannel listeners');

    dataChannel.onopen = () => {
      console.log('[APP] DataChannel opened');
      setIsConnected(true);
      setError('');
    };

    dataChannel.onclose = () => {
      console.log('[APP] DataChannel closed');
      setIsConnected(false);
    };

    dataChannel.onerror = (error) => {
      console.error('[APP] DataChannel error:', error);
      setError('Data transfer error: ' + error.message);
      setIsConnected(false);
    };

    receiveFileChunks(
      dataChannel,
      (fileName, received, total) => {
        updateTransfer(`recv-${fileName}`, {
          progress: received,
          total,
        });
      },
      () => {
        removeTransfer(`recv-${selectedDevice?.name}`);
        setError('');
      }
    );
  }, [dataChannel, selectedDevice, removeTransfer, updateTransfer, setIsConnected]);

  const handleJoin = () => {
    if (!deviceName.trim()) {
      setError('Please enter a device name');
      return;
    }
    if (!room.trim()) {
      setError('Please enter a room ID');
      return;
    }
    
    try {
      const success = emitJoin(deviceName, room);
      if (!success) {
        setError('Not connected to server. Please check your connection.');
        return;
      }
      setJoined(true);
      setError('');
      console.log('[APP] Joined room:', room);
    } catch (err) {
      setError('Failed to join room: ' + err.message);
      console.error('[APP] Join error:', err);
    }
  };

  const handleSelectDevice = (device) => {
    setSelectedDevice(device);
    setError('');
    console.log('[APP] Selected device:', device.name);
  };

  const handleFilesSelected = (files) => {
    try {
      validateFiles(files);
      setSelectedFiles(files);
      setError('');
      console.log('[APP] Files selected:', files.length);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleSendFiles = async () => {
    if (!selectedDevice) {
      setError('Select a device first');
      return;
    }
    if (selectedFiles.length === 0) {
      setError('Select files to send');
      return;
    }

    if (isTransfering) {
      setError('Transfer already in progress');
      return;
    }

    try {
      setIsTransfering(true);
      setError('');

      const socket = getSocket();
      console.log('[APP] Sending transfer request to', selectedDevice.name);
      
      emitSendRequest(selectedDevice.id, 
        selectedFiles.map(f => ({ name: f.name, size: f.size }))
      );

      // Wait for acceptance
      let accepted = false;
      const acceptPromise = new Promise((resolve) => {
        const timer = setTimeout(() => {
          setError('Transfer request timeout - no response from receiver');
          resolve();
        }, 30000); // 30 second timeout

        socket.once('accept-request', async () => {
          clearTimeout(timer);
          accepted = true;
          console.log('[APP] Transfer accepted, initiating WebRTC connection');
          
          try {
            // Initiate WebRTC connection
            const initiatedChannel = await initiateConnection(selectedDevice.id);
            console.log('[APP] WebRTC connection initiated, waiting for DataChannel...');

            // Wait for the data channel to open using event listener (not polling)
            const openChannel = await waitForDataChannel(initiatedChannel);
            console.log('[APP] DataChannel opened! State:', openChannel.readyState);

            console.log('[APP] DataChannel ready, sending files');
            sendFileMetadata(openChannel, selectedFiles);
            
            for (const file of selectedFiles) {
              console.log('[APP] Sending file:', file.name);
              addTransfer(`send-${file.name}`, {
                fileName: file.name,
                progress: 0,
                total: file.size,
              });
              
              await sendFileChunks(openChannel, file, (progress, total) => {
                updateTransfer(`send-${file.name}`, { progress });
              });
            }
            
            console.log('[APP] All files sent');
            removeTransfer(`send-${selectedFiles[0]?.name}`);
            setSelectedFiles([]);
            setSelectedDevice(null);
            setError('');
          } catch (err) {
            console.error('[APP] Send error:', err);
            setError('Transfer failed: ' + err.message);
          } finally {
            setIsTransfering(false);
          }
          resolve();
        });

        socket.once('reject-request', () => {
          clearTimeout(timer);
          setError('Transfer request was rejected');
          setIsTransfering(false);
          resolve();
        });
      });

      await acceptPromise;
      
      if (!accepted) {
        setIsTransfering(false);
      }
    } catch (err) {
      console.error('[APP] Send files error:', err);
      setError('Failed to send files: ' + err.message);
      setIsTransfering(false);
    }
  };

  if (!joined) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">P2P File Sharing</h1>
          
          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
              {error}
            </div>
          )}
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Device Name
              </label>
              <input
                type="text"
                value={deviceName}
                onChange={(e) => setDeviceName(e.target.value)}
                placeholder="My Laptop"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Room ID
              </label>
              <input
                type="text"
                value={room}
                onChange={(e) => setRoom(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              onClick={handleJoin}
              className="w-full bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600 transition font-medium"
            >
              Join
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">P2P File Sharing</h1>
          <p className="text-gray-600">
            Connected as: <span className="font-medium">{deviceName}</span> 
            {' '}in room: <span className="font-medium">{room}</span>
          </p>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
            {error}
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Available Devices</h2>
            <DeviceList devices={devices} onSelectDevice={handleSelectDevice} />
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Send Files</h2>
            {selectedDevice ? (
              <>
                <p className="text-gray-700 mb-4">
                  Sending to: <span className="font-medium">{selectedDevice.name}</span>
                </p>
                <FileInput onFilesSelected={handleFilesSelected} />
                {selectedFiles.length > 0 && (
                  <div className="mt-4">
                    <h3 className="font-medium text-gray-900 mb-2">Selected Files:</h3>
                    <ul className="list-disc list-inside space-y-1 mb-4">
                      {selectedFiles.map((file) => (
                        <li key={file.name} className="text-sm text-gray-700">
                          {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                        </li>
                      ))}
                    </ul>
                    <button
                      onClick={handleSendFiles}
                      disabled={isTransfering}
                      className="w-full bg-green-500 text-white py-2 rounded-lg hover:bg-green-600 transition font-medium disabled:bg-gray-400"
                    >
                      {isTransfering ? 'Transferring...' : 'Send Files'}
                    </button>
                  </div>
                )}
              </>
            ) : (
              <p className="text-gray-500">Select a device first</p>
            )}
          </div>
        </div>
      </div>

      <RequestModal />
      <TransferProgress />
    </div>
  );
};

export default App;
