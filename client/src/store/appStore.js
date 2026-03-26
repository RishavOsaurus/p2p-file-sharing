import { create } from 'zustand';

const useAppStore = create((set) => ({
  devices: [],
  setDevices: (devices) => set({ devices }),
  
  currentConnection: null,
  setCurrentConnection: (connection) => set({ currentConnection: connection }),
  
  peerConnection: null,
  setPeerConnection: (pc) => set({ peerConnection: pc }),
  
  dataChannel: null,
  setDataChannel: (channel) => set({ dataChannel: channel }),
  
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
  
  incomingRequest: null,
  setIncomingRequest: (request) => set({ incomingRequest: request }),
}));

export default useAppStore;
