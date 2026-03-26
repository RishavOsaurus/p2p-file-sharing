import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import useAppStore from '../src/store/appStore';
import { validateFiles } from '../src/services/webrtc';

describe('Frontend Integration Tests', () => {
  describe('Store Operations', () => {
    it('should manage complete transfer lifecycle', async () => {
      const { result } = renderHook(() => useAppStore());

      act(() => {
        result.current.addTransfer('file1', {
          fileName: 'test.txt',
          progress: 0,
          total: 1000,
        });
      });

      expect(result.current.transfers['file1']).toBeDefined();

      act(() => {
        result.current.updateTransfer('file1', { progress: 500 });
      });

      expect(result.current.transfers['file1'].progress).toBe(500);
      expect(result.current.getTransferProgress('file1')).toBe(50);

      act(() => {
        result.current.removeTransfer('file1');
      });

      expect(result.current.transfers['file1']).toBeUndefined();
    });

    it('should handle multiple concurrent transfers', () => {
      const { result } = renderHook(() => useAppStore());

      act(() => {
        result.current.addTransfer('file1', {
          fileName: 'test1.txt',
          progress: 0,
          total: 1000,
        });
        result.current.addTransfer('file2', {
          fileName: 'test2.txt',
          progress: 0,
          total: 2000,
        });
      });

      expect(Object.keys(result.current.transfers).length).toBe(2);

      act(() => {
        result.current.updateTransfer('file1', { progress: 500 });
        result.current.updateTransfer('file2', { progress: 1000 });
      });

      expect(result.current.getTransferProgress('file1')).toBe(50);
      expect(result.current.getTransferProgress('file2')).toBe(50);
    });
  });

  describe('Request Handling', () => {
    it('should manage incoming requests', () => {
      const { result } = renderHook(() => useAppStore());

      const mockRequest = {
        from: 'device-123',
        fromName: 'Phone',
        files: [
          { name: 'file.txt', size: 1024 },
        ],
      };

      act(() => {
        result.current.setIncomingRequest(mockRequest);
      });

      expect(result.current.incomingRequest).toEqual(mockRequest);

      act(() => {
        result.current.setIncomingRequest(null);
      });

      expect(result.current.incomingRequest).toBeNull();
    });
  });

  describe('Device Management', () => {
    it('should manage device list', () => {
      const { result } = renderHook(() => useAppStore());

      const devices = [
        { id: '1', name: 'Phone' },
        { id: '2', name: 'Laptop' },
        { id: '3', name: 'Tablet' },
      ];

      act(() => {
        result.current.setDevices(devices);
      });

      expect(result.current.devices.length).toBe(3);
      expect(result.current.getDeviceById('2').name).toBe('Laptop');
    });

    it('should find device by ID', () => {
      const { result } = renderHook(() => useAppStore());

      act(() => {
        result.current.setDevices([
          { id: 'device-abc', name: 'MyPhone' },
        ]);
      });

      const device = result.current.getDeviceById('device-abc');
      expect(device.name).toBe('MyPhone');
    });
  });

  describe('File Validation', () => {
    it('should accept valid files', () => {
      const files = [
        { name: 'file1.txt', size: 1024 },
        { name: 'file2.pdf', size: 2048 },
      ];
      expect(() => validateFiles(files)).not.toThrow();
    });

    it('should reject empty array', () => {
      expect(() => validateFiles([])).toThrow('No files selected');
    });

    it('should reject oversized individual files', () => {
      const files = [{ name: 'huge.bin', size: 101 * 1024 * 1024 }];
      expect(() => validateFiles(files)).toThrow('File too large');
    });

    it('should reject oversized total transfer', () => {
      const files = [
        { name: 'file1.bin', size: 300 * 1024 * 1024 },
        { name: 'file2.bin', size: 300 * 1024 * 1024 },
      ];
      expect(() => validateFiles(files)).toThrow('Total size too large');
    });

    it('should accept files at the limit', () => {
      const files = [{ name: 'maxfile.bin', size: 100 * 1024 * 1024 }];
      expect(() => validateFiles(files)).not.toThrow();
    });
  });

  describe('Session Management', () => {
    it('should manage device name and room', () => {
      const { result } = renderHook(() => useAppStore());

      act(() => {
        result.current.setDeviceName('My Device');
        result.current.setRoom('my-room');
      });

      expect(result.current.deviceName).toBe('My Device');
      expect(result.current.room).toBe('my-room');
    });

    it('should track connection status', () => {
      const { result } = renderHook(() => useAppStore());

      act(() => {
        result.current.setIsConnected(true);
      });

      expect(result.current.isConnected).toBe(true);

      act(() => {
        result.current.setIsConnected(false);
      });

      expect(result.current.isConnected).toBe(false);
    });
  });
});
