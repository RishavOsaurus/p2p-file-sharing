import { useEffect } from 'react';
import useAppStore from '../store/appStore';
import { getSocket, emitJoin } from '../services/socket';

export const useDevices = () => {
  const { devices, setDevices } = useAppStore();

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    socket.on('devices', (deviceList) => {
      setDevices(deviceList.filter((d) => d.id !== socket.id));
    });

    return () => {
      socket.off('devices');
    };
  }, [setDevices]);

  return devices;
};
