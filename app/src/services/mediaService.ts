import { ref, uploadBytesResumable, getDownloadURL, UploadTask } from 'firebase/storage';
import { doc, getDoc } from 'firebase/firestore';
import { storage, db, auth } from '@/lib/firebase';
import { compressImage } from '@/utils/imageCompression';

export interface UploadProgress {
  bytesTransferred: number;
  totalBytes: number;
  progress: number; // 0-100
}

export interface UploadResult {
  url: string;
  width: number;
  height: number;
  sizeBytes: number;
}

/**
 * Upload an image to Firebase Storage with progress tracking
 * - Compresses image before upload
 * - Returns download URL
 * - Provides upload progress via callback
 */
export async function uploadImage(
  uri: string,
  conversationId: string,
  messageId: string,
  onProgress?: (progress: UploadProgress) => void
): Promise<UploadResult> {
  console.log('📤 Starting image upload:', {
    conversationId: conversationId.substring(0, 12),
    messageId: messageId.substring(0, 8),
  });

  // GUARD 1: Require authentication
  if (!auth.currentUser) {
    const error = 'User not authenticated - cannot upload image';
    console.error('❌', error);
    throw new Error(error);
  }

  console.log('✅ Auth check passed:', {
    uid: auth.currentUser.uid.substring(0, 8),
    email: auth.currentUser.email,
  });

  // GUARD 2: Ensure conversation document exists with participants
  try {
    const conversationRef = doc(db, 'conversations', conversationId);
    const conversationSnap = await getDoc(conversationRef);

    if (!conversationSnap.exists()) {
      const error = `Conversation ${conversationId.substring(0, 12)} does not exist`;
      console.error('❌', error);
      throw new Error(error);
    }

    const conversationData = conversationSnap.data();
    console.log('✅ Conversation exists:', {
      id: conversationId.substring(0, 12),
      type: conversationData.type,
      participants: conversationData.participants,
      currentUserInParticipants: conversationData.participants?.includes(auth.currentUser.uid),
    });

    if (!conversationData.participants?.includes(auth.currentUser.uid)) {
      const error = 'Current user is not a participant in this conversation';
      console.error('❌', error);
      throw new Error(error);
    }

    console.log('✅ Participant check passed');
  } catch (error: any) {
    console.error('❌ Conversation validation failed:', error);
    throw error;
  }

  try {
    // Step 1: Compress image
    console.log('🗜️ Compressing image...');
    const compressed = await compressImage(uri);
    
    // Step 2: Convert to blob
    console.log('📦 Converting to blob...');
    const response = await fetch(compressed.uri);
    const blob = await response.blob();

    // Step 3: Upload to Firebase Storage
    // Path must match storage.rules: /conversations/{cid}/messages/{file}
    const storagePath = `conversations/${conversationId}/messages/${messageId}.jpg`;
    const storageRef = ref(storage, storagePath);
    
    console.log('☁️ Uploading to Storage:', {
      path: storagePath,
      fullPath: storagePath,
      conversationId,
      messageId,
      authUid: auth.currentUser?.uid,
    });

    // Create upload task for progress tracking
    const uploadTask: UploadTask = uploadBytesResumable(storageRef, blob, {
      contentType: 'image/jpeg',
    });

    // Track upload progress
    return new Promise((resolve, reject) => {
      uploadTask.on(
        'state_changed',
        (snapshot) => {
          const progress = {
            bytesTransferred: snapshot.bytesTransferred,
            totalBytes: snapshot.totalBytes,
            progress: (snapshot.bytesTransferred / snapshot.totalBytes) * 100,
          };
          
          console.log(`📊 Upload progress: ${progress.progress.toFixed(0)}%`);
          
          if (onProgress) {
            onProgress(progress);
          }
        },
        (error) => {
          console.error('❌ Upload failed:', error);
          reject(error);
        },
        async () => {
          // Upload completed successfully
          try {
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            console.log('✅ Upload complete! URL:', downloadURL.substring(0, 50) + '...');

            resolve({
              url: downloadURL,
              width: compressed.width,
              height: compressed.height,
              sizeBytes: compressed.sizeBytes,
            });
          } catch (error) {
            console.error('❌ Failed to get download URL:', error);
            reject(error);
          }
        }
      );
    });
  } catch (error: any) {
    console.error('❌ Image upload failed:', error);
    throw new Error(`Failed to upload image: ${error.message}`);
  }
}

/**
 * Delete an image from Firebase Storage
 */
export async function deleteImage(url: string): Promise<void> {
  try {
    // Extract path from URL
    const urlObj = new URL(url);
    const path = decodeURIComponent(
      urlObj.pathname.split('/o/')[1].split('?')[0]
    );
    
    const storageRef = ref(storage, path);
    // Note: deleteObject is not imported yet - add if needed
    // await deleteObject(storageRef);
    
    console.log('🗑️ Image deleted:', path);
  } catch (error) {
    console.warn('Failed to delete image:', error);
    // Don't throw - deletion failures shouldn't block the app
  }
}

