import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system/legacy';

export interface CompressedImageResult {
  uri: string;
  width: number;
  height: number;
  sizeBytes: number;
}

export interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  maxSizeBytes?: number;
}

const DEFAULT_OPTIONS: CompressionOptions = {
  maxWidth: 1920,
  maxHeight: 1920,
  quality: 0.8, // 80%
  maxSizeBytes: 2 * 1024 * 1024, // 2MB
};

/**
 * Compress an image to meet size and dimension requirements
 * - Max dimensions: 1920x1920 (maintains aspect ratio)
 * - Quality: 80%
 * - Target size: < 2MB
 */
export async function compressImage(
  uri: string,
  options: CompressionOptions = {}
): Promise<CompressedImageResult> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  console.log('🖼️ Compressing image:', uri);

  try {
    // Get original image info
    const fileInfo = await FileSystem.getInfoAsync(uri);
    if (!fileInfo.exists) {
      throw new Error('Image file not found');
    }

    const originalSize = (fileInfo as any).size || 0;
    console.log(`📏 Original size: ${(originalSize / 1024 / 1024).toFixed(2)}MB`);

    // Compress and resize
    const result = await ImageManipulator.manipulateAsync(
      uri,
      [
        {
          resize: {
            width: opts.maxWidth,
            height: opts.maxHeight,
          },
        },
      ],
      {
        compress: opts.quality,
        format: ImageManipulator.SaveFormat.JPEG,
      }
    );

    // Get compressed file size
    const compressedInfo = await FileSystem.getInfoAsync(result.uri);
    const compressedSize = (compressedInfo as any).size || 0;

    console.log(`✅ Compressed size: ${(compressedSize / 1024 / 1024).toFixed(2)}MB`);
    console.log(`📐 Dimensions: ${result.width}x${result.height}`);

    // If still too large, compress more aggressively
    if (opts.maxSizeBytes && compressedSize > opts.maxSizeBytes) {
      console.log('⚠️ Still too large, compressing more...');
      
      const aggressiveResult = await ImageManipulator.manipulateAsync(
        result.uri,
        [
          {
            resize: {
              width: Math.floor(result.width * 0.8),
              height: Math.floor(result.height * 0.8),
            },
          },
        ],
        {
          compress: 0.6, // More aggressive compression
          format: ImageManipulator.SaveFormat.JPEG,
        }
      );

      const finalInfo = await FileSystem.getInfoAsync(aggressiveResult.uri);
      const finalSize = (finalInfo as any).size || 0;
      
      console.log(`✅ Final size: ${(finalSize / 1024 / 1024).toFixed(2)}MB`);

      return {
        uri: aggressiveResult.uri,
        width: aggressiveResult.width,
        height: aggressiveResult.height,
        sizeBytes: finalSize,
      };
    }

    return {
      uri: result.uri,
      width: result.width,
      height: result.height,
      sizeBytes: compressedSize,
    };
  } catch (error: any) {
    console.error('❌ Image compression failed:', error);
    throw new Error(`Failed to compress image: ${error.message}`);
  }
}

/**
 * Check if image needs compression
 */
export async function needsCompression(uri: string, maxSizeBytes: number = 2 * 1024 * 1024): Promise<boolean> {
  try {
    const fileInfo = await FileSystem.getInfoAsync(uri);
    if (!fileInfo.exists) return false;
    
    const size = (fileInfo as any).size || 0;
    return size > maxSizeBytes;
  } catch (error) {
    console.warn('Failed to check file size:', error);
    return true; // Assume it needs compression if we can't check
  }
}

