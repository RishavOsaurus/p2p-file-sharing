import { useEffect, useState } from 'react';
import useAppStore from './store/appStore';
import { initSocket, getSocket, emitJoin, emitSendRequest } from './services/socket';
import { useDevices } from './hooks/useDevices';
import { useWebRTC } from './hooks/useWebRTC';
import { sendFileMetadata, sendFileChunks, receiveFileChunks } from './services/webrtc';
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
  
  const devices = useDevices();
  const { initiateConnection } = useWebRTC();
  const {
    dataChannel,
    incomingRequest,
    setIncomingRequest,
    addTransfer,
    removeTransfer,
    updateTransfer,
  } = useAppStore();

  // Initialize socket connection
  useEffect(() => {
    initSocket();
  }, []);

  // Handle incoming requests
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    socket.on('send-request', ({ from, fromName, files }) => {
      setIncomingRequest({ from, fromName, files });
    });

    socket.on('accept-request', ({ from }) => {
      console.log('Request accepted by', from);
    });

    socket.on('reject-request', ({ from }) => {
      console.log('Request rejected by', from);
    });

    return () => {
      socket.off('send-request');
      socket.off('accept-request');
      socket.off('reject-request');
    };
  }, [setIncomingRequest]);

  // Setup data channel listeners
  useEffect(() => {
    if (!dataChannel) return;

    dataChannel.onopen = () => {
      console.log('DataChannel opened');
    };

    dataChannel.onclose = () => {
      console.log('DataChannel closed');
    };

    dataChannel.onerror = (error) => {
      console.error('DataChannel error:', error);
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
      }
    );
  }, [dataChannel, selectedDevice, removeTransfer, updateTransfer]);

  const handleJoin = () => {
    if (!deviceName.trim()) {
      alert('Please enter a device name');
      return;
    }
    emitJoin(deviceName, room);
    setJoined(true);
  };

  const handleSelectDevice = (device) => {
    setSelectedDevice(device);
  };

  const handleFilesSelected = (files) => {
    setSelectedFiles(files);
  };

  const handleSendFiles = async () => {
    if (!selectedDevice || selectedFiles.length === 0) {
      alert('Select a device and files');
      return;
    }

    const socket = getSocket();
    emitSendRequest(selectedDevice.id, 
      selectedFiles.map(f => ({ name: f.name, size: f.size }))
    );

    // Wait for acceptance
    await new Promise(resolve => {
      socket.once('accept-request', async () => {
        // Initiate WebRTC connection
        await initiateConnection(selectedDevice.id);

        // Wait for data channel to be ready
        setTimeout(async () => {
          if (dataChannel?.readyState === 'open') {
            sendFileMetadata(dataChannel, selectedFiles);
            for (const file of selectedFiles) {
              addTransfer(`send-${file.name}`, {
                fileName: file.name,
                progress: 0,
                total: file.size,
              });
              await sendFileChunks(dataChannel, file, (progress, total) => {
                updateTransfer(`send-${file.name}`, { progress });
              });
            }
            removeTransfer(`send-${selectedFiles[0]?.name}`);
            setSelectedFiles([]);
          }
          resolve();
        }, 1000);
      });
    });
  };

  if (!joined) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">P2P File Sharing</h1>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Device Name
              </label>
              <input
                type="text"
                value={deviceName}
                onChange={(e) => setDeviceName(e.target.value)}
                placeholder="My Phone"
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
          <p className="text-gray-600">Connected as: <span className="font-medium">{deviceName}</span></p>
        </div>

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
                    <ul className="list-disc list-inside space-y-1">
                      {selectedFiles.map((file) => (
                        <li key={file.name} className="text-sm text-gray-700">
                          {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                        </li>
                      ))}
                    </ul>
                    <button
                      onClick={handleSendFiles}
                      className="w-full mt-4 bg-green-500 text-white py-2 rounded-lg hover:bg-green-600 transition font-medium"
                    >
                      Send Files
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
