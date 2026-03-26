import { useEffect } from 'react';
import useAppStore from '../store/appStore';
import { getSocket, emitJoin } from '../services/socket';

export const useDevices = () => {
  const { devices, setDevices } = useAppStore();

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleDevices = (deviceList) => {
      console.log('[HOOK] Devices updated:', deviceList.length);
      // Filter out self
      const otherDevices = deviceList.filter(d => d.id !== socket.id);
      setDevices(otherDevices);
    };

    socket.on('devices', handleDevices);

    return () => {
      socket.off('devices');
    };
  }, [setDevices]);

  return devices;
};
