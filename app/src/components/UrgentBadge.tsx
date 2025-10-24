/**
 * Urgent Badge Component
 * 
 * PR9: Urgency Detection (Optional UI)
 * 
 * Displays a small badge next to messages that have been flagged as urgent
 * Can be shown in:
 * - Message bubbles (inline)
 * - Conversation list (preview)
 * - Chat header (if active urgent message)
 * 
 * Usage:
 * <UrgentBadge category="cancellation" />
 * <UrgentBadge category="emergency" size="small" />
 */

import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';

interface UrgentBadgeProps {
  category?: 'cancellation' | 'reschedule' | 'emergency' | 'deadline' | 'general';
  size?: 'small' | 'medium' | 'large';
  style?: ViewStyle;
}

export default function UrgentBadge({
  category = 'general',
  size = 'medium',
  style,
}: UrgentBadgeProps) {
  const { icon, color, label } = getBadgeConfig(category);

  return (
    <View style={[styles.badge, styles[size], { backgroundColor: color }, style]}>
      <Text style={[styles.icon, styles[`${size}Icon`]]}>{icon}</Text>
      {size !== 'small' && (
        <Text style={[styles.label, styles[`${size}Label`]]}>{label}</Text>
      )}
    </View>
  );
}

/**
 * Get badge configuration based on urgency category
 */
function getBadgeConfig(category: string): {
  icon: string;
  color: string;
  label: string;
} {
  switch (category) {
    case 'cancellation':
      return {
        icon: '🚨',
        color: '#FF3B30', // Red
        label: 'CANCEL',
      };

    case 'reschedule':
      return {
        icon: '⚠️',
        color: '#FF9800', // Orange
        label: 'RESCHEDULE',
      };

    case 'emergency':
      return {
        icon: '🚨',
        color: '#D32F2F', // Dark Red
        label: 'URGENT',
      };

    case 'deadline':
      return {
        icon: '⏰',
        color: '#7C3AED', // Purple
        label: 'TIME SENSITIVE',
      };

    default:
      return {
        icon: '❗',
        color: '#FF9800', // Orange
        label: 'URGENT',
      };
  }
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },

  // Size variants
  small: {
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 8,
  },

  medium: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },

  large: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
  },

  // Icon styles
  icon: {
    fontSize: 12,
  },

  smallIcon: {
    fontSize: 10,
  },

  mediumIcon: {
    fontSize: 12,
  },

  largeIcon: {
    fontSize: 14,
  },

  // Label styles
  label: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 10,
    letterSpacing: 0.5,
    marginLeft: 4,
  },

  smallLabel: {
    fontSize: 8,
  },

  mediumLabel: {
    fontSize: 10,
  },

  largeLabel: {
    fontSize: 11,
  },
});

