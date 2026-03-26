import { create } from 'zustand';

const useAppStore = create((set, get) => ({
  // Devices
  devices: [],
  setDevices: (devices) => set({ devices }),
  getDeviceById: (id) => get().devices.find(d => d.id === id),

  // Connections
  currentConnection: null,
  setCurrentConnection: (connection) => set({ currentConnection: connection }),

  peerConnection: null,
  setPeerConnection: (pc) => set({ peerConnection: pc }),

  dataChannel: null,
  setDataChannel: (channel) => set({ dataChannel: channel }),

  // Transfers
  transfers: {},
  addTransfer: (id, transfer) => set((state) => ({
    transfers: { ...state.transfers, [id]: transfer },
  })),
  updateTransfer: (id, updates) => set((state) => ({
    transfers: {
      ...state.transfers,
      [id]: { ...state.transfers[id], ...updates },
    },
  })),
  removeTransfer: (id) => set((state) => ({
    transfers: Object.fromEntries(
      Object.entries(state.transfers).filter(([k]) => k !== id)
    ),
  })),
  getTransferProgress: (id) => {
    const transfer = get().transfers[id];
    return transfer ? (transfer.progress / transfer.total) * 100 : 0;
  },

  // Requests
  incomingRequest: null,
  setIncomingRequest: (request) => set({ incomingRequest: request }),

  // Session
  deviceName: '',
  setDeviceName: (name) => set({ deviceName: name }),
  
  room: 'default-room',
  setRoom: (room) => set({ room }),
  
  isConnected: false,
  setIsConnected: (connected) => set({ isConnected: connected }),
}));

export default useAppStore;
