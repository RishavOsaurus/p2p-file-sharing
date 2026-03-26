import { describe, it, expect, vi } from 'vitest';
import { validateFiles } from '../services/webrtc';
import useAppStore from '../store/appStore';

describe('Frontend Store & Services', () => {
  describe('Zustand Store', () => {
    it('should initialize with default values', () => {
      const store = useAppStore.getState();
      expect(store.devices).toEqual([]);
      expect(store.transfers).toEqual({});
      expect(store.incomingRequest).toBeNull();
    });

    it('should update devices', () => {
      useAppStore.setState({
        devices: [
          { id: '1', name: 'Phone' },
          { id: '2', name: 'Laptop' },
        ],
      });
      const devices = useAppStore.getState().devices;
      expect(devices.length).toBe(2);
      expect(devices[0].name).toBe('Phone');
    });

    it('should add transfer', () => {
      useAppStore.setState({ transfers: {} });
      useAppStore.getState().addTransfer('file1', {
        fileName: 'test.txt',
        progress: 0,
        total: 1024,
      });
      const transfers = useAppStore.getState().transfers;
      expect(transfers['file1']).toBeDefined();
      expect(transfers['file1'].fileName).toBe('test.txt');
    });

    it('should update transfer progress', () => {
      useAppStore.getState().addTransfer('file2', {
        fileName: 'test2.txt',
        progress: 0,
        total: 2048,
      });
      useAppStore.getState().updateTransfer('file2', { progress: 1024 });
      const transfer = useAppStore.getState().transfers['file2'];
      expect(transfer.progress).toBe(1024);
    });

    it('should calculate transfer progress percentage', () => {
      useAppStore.getState().addTransfer('file3', {
        fileName: 'test3.txt',
        progress: 500,
        total: 1000,
      });
      const progress = useAppStore.getState().getTransferProgress('file3');
      expect(progress).toBe(50);
    });

    it('should remove transfer', () => {
      useAppStore.getState().addTransfer('file4', {
        fileName: 'test4.txt',
        progress: 0,
        total: 1024,
      });
      useAppStore.getState().removeTransfer('file4');
      const transfers = useAppStore.getState().transfers;
      expect(transfers['file4']).toBeUndefined();
    });
  });

  describe('File Validation', () => {
    it('should validate valid files', () => {
      const files = [
        { name: 'file1.txt', size: 1024 },
        { name: 'file2.txt', size: 2048 },
      ];
      expect(() => validateFiles(files)).not.toThrow();
    });

    it('should reject empty file array', () => {
      expect(() => validateFiles([])).toThrow('No files selected');
    });

    it('should reject files larger than 100MB', () => {
      const files = [{ name: 'huge.bin', size: 101 * 1024 * 1024 }];
      expect(() => validateFiles(files)).toThrow('File too large');
    });

    it('should reject total size larger than 500MB', () => {
      const files = [
        { name: 'file1.bin', size: 300 * 1024 * 1024 },
        { name: 'file2.bin', size: 300 * 1024 * 1024 },
      ];
      expect(() => validateFiles(files)).toThrow('Total size too large');
    });
  });
});
