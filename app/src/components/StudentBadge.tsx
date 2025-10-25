import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface StudentBadgeProps {
  studentContext: string;
  size?: 'small' | 'medium' | 'large';
}

export default function StudentBadge({ studentContext, size = 'medium' }: StudentBadgeProps) {
  const sizeStyles = {
    small: { fontSize: 10, paddingHorizontal: 8, paddingVertical: 4 },
    medium: { fontSize: 12, paddingHorizontal: 10, paddingVertical: 5 },
    large: { fontSize: 14, paddingHorizontal: 12, paddingVertical: 6 },
  };

  return (
    <View style={[styles.badge, sizeStyles[size]]}>
      <Text style={[styles.text, { fontSize: sizeStyles[size].fontSize }]}>
        Student: {studentContext}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    backgroundColor: '#E8F5E9',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  text: {
    color: '#2E7D32',
    fontWeight: '600',
  },
});

