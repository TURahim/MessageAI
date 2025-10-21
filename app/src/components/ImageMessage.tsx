import React, { useState } from 'react';
import { View, Image, TouchableOpacity, StyleSheet, Modal, Dimensions, Text } from 'react-native';
import { ActivityIndicator } from 'react-native';

interface Props {
  imageUrl: string;
  width: number;
  height: number;
  status?: 'uploading' | 'ready' | 'failed';
}

const SCREEN_WIDTH = Dimensions.get('window').width;
const MAX_IMAGE_WIDTH = SCREEN_WIDTH * 0.7; // 70% of screen width
const MAX_IMAGE_HEIGHT = 300;

export default function ImageMessage({ imageUrl, width, height, status = 'ready' }: Props) {
  const [showFullSize, setShowFullSize] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);

  // Calculate display dimensions while maintaining aspect ratio
  const aspectRatio = width / height;
  let displayWidth = MAX_IMAGE_WIDTH;
  let displayHeight = displayWidth / aspectRatio;

  if (displayHeight > MAX_IMAGE_HEIGHT) {
    displayHeight = MAX_IMAGE_HEIGHT;
    displayWidth = displayHeight * aspectRatio;
  }

  if (status === 'uploading') {
    return (
      <View style={[styles.container, { width: displayWidth, height: displayHeight }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Uploading...</Text>
        </View>
      </View>
    );
  }

  if (status === 'failed') {
    return (
      <View style={[styles.container, { width: displayWidth, height: displayHeight }, styles.failedContainer]}>
        <Text style={styles.failedText}>❌ Upload failed</Text>
      </View>
    );
  }

  return (
    <>
      <TouchableOpacity
        onPress={() => setShowFullSize(true)}
        activeOpacity={0.9}
      >
        <View style={styles.container}>
          {imageLoading && (
            <View style={[styles.loadingContainer, { width: displayWidth, height: displayHeight }]}>
              <ActivityIndicator size="large" color="#007AFF" />
            </View>
          )}
          <Image
            source={{ uri: imageUrl }}
            style={[
              styles.image,
              { width: displayWidth, height: displayHeight },
              imageLoading && styles.hidden,
            ]}
            onLoad={() => setImageLoading(false)}
            onError={() => setImageLoading(false)}
            resizeMode="cover"
          />
        </View>
      </TouchableOpacity>

      {/* Full-size modal */}
      <Modal
        visible={showFullSize}
        transparent
        animationType="fade"
        onRequestClose={() => setShowFullSize(false)}
      >
        <TouchableOpacity
          style={styles.modalContainer}
          activeOpacity={1}
          onPress={() => setShowFullSize(false)}
        >
          <Image
            source={{ uri: imageUrl }}
            style={styles.fullSizeImage}
            resizeMode="contain"
          />
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => setShowFullSize(false)}
          >
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#f0f0f0',
  },
  image: {
    borderRadius: 12,
  },
  hidden: {
    opacity: 0,
  },
  loadingContainer: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
  },
  loadingText: {
    marginTop: 8,
    fontSize: 12,
    color: '#666',
  },
  failedContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffe5e5',
    borderWidth: 1,
    borderColor: '#ff0000',
  },
  failedText: {
    color: '#ff0000',
    fontSize: 14,
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullSizeImage: {
    width: '100%',
    height: '100%',
  },
  closeButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
});

