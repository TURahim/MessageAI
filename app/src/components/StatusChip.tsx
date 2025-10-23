import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export type StatusVariant = 'pending' | 'confirmed' | 'declined' | 'conflict';

interface StatusChipProps {
  variant: StatusVariant;
  text?: string;
}

export default function StatusChip({ variant, text }: StatusChipProps) {
  const getStyle = () => {
    switch (variant) {
      case 'confirmed':
        return {
          backgroundColor: '#E8F5E9',
          borderColor: '#4CAF50',
          textColor: '#2E7D32',
          defaultText: 'Confirmed',
        };
      case 'declined':
        return {
          backgroundColor: '#FFEBEE',
          borderColor: '#F44336',
          textColor: '#C62828',
          defaultText: 'Declined',
        };
      case 'conflict':
        return {
          backgroundColor: '#FFF3E0',
          borderColor: '#FF9800',
          textColor: '#E65100',
          defaultText: 'Conflict',
        };
      case 'pending':
      default:
        return {
          backgroundColor: '#FFF9C4',
          borderColor: '#FFD60A',
          textColor: '#F57C00',
          defaultText: 'Pending',
        };
    }
  };

  const style = getStyle();

  return (
    <View
      style={[
        styles.chip,
        { backgroundColor: style.backgroundColor, borderColor: style.borderColor },
      ]}
    >
      <Text style={[styles.text, { color: style.textColor }]}>
        {text || style.defaultText}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});

