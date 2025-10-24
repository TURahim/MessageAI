import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';

export default function LoadingCard() {
  const pulseAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Create pulsing animation for dots
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const opacity = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 1],
  });

  return (
    <View style={styles.container}>
      {/* Assistant icon - matches AssistantBubble */}
      <View style={styles.iconContainer}>
        <Text style={styles.iconEmoji}>✨</Text>
      </View>

      {/* Loading content - matches AssistantBubble styling */}
      <View style={styles.bubble}>
        <View style={styles.header}>
          <Text style={styles.label}>AI ASSISTANT</Text>
        </View>
        <View style={styles.loadingRow}>
          <Text style={styles.text}>Preparing your event</Text>
          <Animated.Text style={[styles.dots, { opacity }]}>...</Animated.Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    marginVertical: 8,
    paddingHorizontal: 12,
    alignItems: 'flex-start',
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F0E6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    marginTop: 4,
  },
  iconEmoji: {
    fontSize: 18,
  },
  bubble: {
    flex: 1,
    backgroundColor: '#F8F5FF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E0D4FF',
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: '#7C3AED',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  text: {
    fontSize: 15,
    lineHeight: 20,
    color: '#374151',
  },
  dots: {
    fontSize: 15,
    color: '#7C3AED',
    marginLeft: 2,
  },
});

