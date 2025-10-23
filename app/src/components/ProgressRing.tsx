import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface ProgressRingProps {
  progress: number; // 0-100
  size?: number;
  color?: string;
  showPercentage?: boolean;
}

export default function ProgressRing({
  progress,
  size = 60,
  color = '#4CAF50',
  showPercentage = true,
}: ProgressRingProps) {
  // Simplified version without SVG - uses nested circles
  // For a full circular progress, would use react-native-svg
  
  return (
    <View style={[styles.container, { width: size, height: size }]}>
      {/* Background circle */}
      <View
        style={[
          styles.circle,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            borderWidth: 6,
            borderColor: '#E0E0E0',
          },
        ]}
      />

      {/* Progress indicator (simplified - shows as partial fill) */}
      <View
        style={[
          styles.progressOverlay,
          {
            width: size,
            height: size * (progress / 100),
            backgroundColor: `${color}40`, // 40 = 25% opacity
          },
        ]}
      />

      {/* Percentage text */}
      {showPercentage && (
        <View style={styles.textContainer}>
          <Text style={[styles.percentageText, { color }]}>
            {Math.round(progress)}%
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  circle: {
    position: 'absolute',
    backgroundColor: 'transparent',
  },
  progressOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  textContainer: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  percentageText: {
    fontSize: 14,
    fontWeight: '700',
  },
});

