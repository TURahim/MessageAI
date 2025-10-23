import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';

interface RSVPButtonsProps {
  onAccept: () => void;
  onDecline: () => void;
  disabled?: boolean;
  userResponse?: 'accepted' | 'declined' | null;
}

export default function RSVPButtons({ onAccept, onDecline, disabled = false, userResponse = null }: RSVPButtonsProps) {
  return (
    <View style={styles.container}>
      {userResponse ? (
        // Show current response
        <View style={styles.responseContainer}>
          <Text style={styles.responseLabel}>You responded:</Text>
          <View style={[
            styles.responseBadge,
            userResponse === 'accepted' ? styles.acceptedBadge : styles.declinedBadge
          ]}>
            <Text style={styles.responseText}>
              {userResponse === 'accepted' ? '✓ Accepted' : '✗ Declined'}
            </Text>
          </View>
        </View>
      ) : (
        // Show RSVP buttons
        <View style={styles.buttonsRow}>
          <TouchableOpacity
            style={[styles.button, styles.acceptButton, disabled && styles.buttonDisabled]}
            onPress={onAccept}
            disabled={disabled}
            activeOpacity={0.7}
          >
            <Text style={styles.acceptText}>✓ Accept</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.declineButton, disabled && styles.buttonDisabled]}
            onPress={onDecline}
            disabled={disabled}
            activeOpacity={0.7}
          >
            <Text style={styles.declineText}>✗ Decline</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 12,
  },
  buttonsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  acceptButton: {
    backgroundColor: '#34C759',
  },
  declineButton: {
    backgroundColor: '#FF3B30',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  acceptText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  declineText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  responseContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
  },
  responseLabel: {
    fontSize: 13,
    color: '#666',
    marginRight: 8,
  },
  responseBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  acceptedBadge: {
    backgroundColor: '#E8F5E9',
  },
  declinedBadge: {
    backgroundColor: '#FFEBEE',
  },
  responseText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#000',
  },
});

