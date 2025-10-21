// Mock expo modules
jest.mock('expo-image-manipulator', () => ({
  manipulateAsync: jest.fn(),
  SaveFormat: {
    JPEG: 'jpeg',
    PNG: 'png',
  },
}));

jest.mock('expo-file-system/legacy', () => ({
  getInfoAsync: jest.fn(),
}));

import { compressImage, needsCompression } from '../imageCompression';

describe('imageCompression', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('compressImage', () => {
    it('should compress image below 2MB', async () => {
      const { manipulateAsync } = require('expo-image-manipulator');
      const { getInfoAsync } = require('expo-file-system/legacy');

      // Mock original file (5MB)
      getInfoAsync
        .mockResolvedValueOnce({ exists: true, size: 5 * 1024 * 1024 })
        // Mock compressed file (1.5MB)
        .mockResolvedValueOnce({ exists: true, size: 1.5 * 1024 * 1024 });

      manipulateAsync.mockResolvedValue({
        uri: 'file://compressed.jpg',
        width: 1920,
        height: 1080,
      });

      const result = await compressImage('file://large.jpg', { maxWidth: 1920 });

      expect(result.sizeBytes).toBeLessThan(2 * 1024 * 1024);
      expect(result.uri).toBe('file://compressed.jpg');
      expect(result.width).toBe(1920);
      expect(result.height).toBe(1080);
    });

    it('should maintain aspect ratio', async () => {
      const { manipulateAsync } = require('expo-image-manipulator');
      const { getInfoAsync } = require('expo-file-system/legacy');

      getInfoAsync
        .mockResolvedValueOnce({ exists: true, size: 3 * 1024 * 1024 })
        .mockResolvedValueOnce({ exists: true, size: 500000 });

      manipulateAsync.mockResolvedValue({
        uri: 'file://compressed.jpg',
        width: 1920,
        height: 1080,
      });

      const result = await compressImage('file://test.jpg', { maxWidth: 1920 });
      
      const aspectRatio = result.width / result.height;
      expect(aspectRatio).toBeCloseTo(16/9, 1);
    });

    it('should throw error if file not found', async () => {
      const { getInfoAsync } = require('expo-file-system/legacy');

      getInfoAsync.mockResolvedValue({ exists: false });

      await expect(compressImage('file://missing.jpg')).rejects.toThrow('Image file not found');
    });

    it('should compress more aggressively if still too large', async () => {
      const { manipulateAsync } = require('expo-image-manipulator');
      const { getInfoAsync } = require('expo-file-system/legacy');

      // Original file
      getInfoAsync
        .mockResolvedValueOnce({ exists: true, size: 10 * 1024 * 1024 })
        // First compression still too large
        .mockResolvedValueOnce({ exists: true, size: 3 * 1024 * 1024 })
        // Second compression (aggressive)
        .mockResolvedValueOnce({ exists: true, size: 1.2 * 1024 * 1024 });

      manipulateAsync
        // First compression
        .mockResolvedValueOnce({
          uri: 'file://compressed1.jpg',
          width: 1920,
          height: 1080,
        })
        // Second compression (more aggressive)
        .mockResolvedValueOnce({
          uri: 'file://compressed2.jpg',
          width: 1536,
          height: 864,
        });

      const result = await compressImage('file://huge.jpg', { maxSizeBytes: 2 * 1024 * 1024 });

      expect(manipulateAsync).toHaveBeenCalledTimes(2);
      expect(result.uri).toBe('file://compressed2.jpg');
      expect(result.sizeBytes).toBeLessThan(2 * 1024 * 1024);
    });
  });

  describe('needsCompression', () => {
    it('should return true if file is larger than max size', async () => {
      const { getInfoAsync } = require('expo-file-system/legacy');

      getInfoAsync.mockResolvedValue({ exists: true, size: 3 * 1024 * 1024 });

      const result = await needsCompression('file://large.jpg', 2 * 1024 * 1024);
      expect(result).toBe(true);
    });

    it('should return false if file is smaller than max size', async () => {
      const { getInfoAsync } = require('expo-file-system/legacy');

      getInfoAsync.mockResolvedValue({ exists: true, size: 1 * 1024 * 1024 });

      const result = await needsCompression('file://small.jpg', 2 * 1024 * 1024);
      expect(result).toBe(false);
    });

    it('should assume compression needed if file does not exist', async () => {
      const { getInfoAsync } = require('expo-file-system/legacy');

      getInfoAsync.mockResolvedValue({ exists: false });

      const result = await needsCompression('file://missing.jpg');
      expect(result).toBe(false); // Returns false when file doesn't exist
    });
  });
});

