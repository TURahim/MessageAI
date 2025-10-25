import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import dayjs from 'dayjs';
import { ConflictMeta } from '@/types/index';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface ConflictWarningProps {
  conflict: ConflictMeta;
  onSelectAlternative?: (index: number) => void;
}

export default function ConflictWarning({ conflict, onSelectAlternative }: ConflictWarningProps) {
  const handleKeepCurrentTime = async () => {
    if (!conflict.conflictId) return;
    
    try {
      // Update event to mark user accepted conflict
      await updateDoc(doc(db, 'events', conflict.conflictId), {
        userAcceptedConflict: true,
        hasConflict: false, // Remove conflict flag
        updatedAt: new Date(),
      });
      
      Alert.alert('Confirmed', 'Event kept at originally requested time');
    } catch (error: any) {
      console.error('Error keeping time:', error);
      Alert.alert('Error', 'Failed to confirm time');
    }
  };

  const alternatives = conflict.suggestedAlternatives?.slice(0, 3) || [];

  return (
    <View style={styles.container}>
      {/* Simple header */}
      <View style={styles.header}>
        <Text style={styles.warningIcon}>⚠️</Text>
        <Text style={styles.title}>Conflict detected</Text>
      </View>

      {/* One-line context */}
      <Text style={styles.context}>This overlaps with another session. Pick a new time below:</Text>

      {/* Compact alternative chips */}
      {alternatives.length > 0 ? (
        <View style={styles.alternatives}>
          {alternatives.map((alt, index) => {
            const start = dayjs(alt.startTime.toDate());
            const end = dayjs(alt.endTime.toDate());
            
            return (
              <TouchableOpacity
                key={index}
                style={styles.chip}
                onPress={() => onSelectAlternative?.(index)}
                activeOpacity={0.7}
                disabled={!onSelectAlternative}
              >
                <Text style={styles.chipTime}>
                  {start.format('ddd • h:mm')}–{end.format('h:mm A')}
                </Text>
                {alt.reason && (
                  <Text style={styles.chipReason}>{alt.reason}</Text>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      ) : (
        <Text style={styles.noAlternatives}>
          No alternative times available. Please manually reschedule in the Schedule tab.
        </Text>
      )}

      {/* Secondary actions */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.linkButton}
          onPress={handleKeepCurrentTime}
          activeOpacity={0.7}
        >
          <Text style={styles.linkText}>Keep current time</Text>
        </TouchableOpacity>
      </View>

      {/* Subtle timezone hint */}
      <Text style={styles.timezone}>Times shown in America/New_York</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#F8F5FF', // Match AssistantBubble
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0D4FF',
    padding: 12,
    marginTop: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  warningIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: '#7C3AED',
  },
  context: {
    fontSize: 13,
    lineHeight: 18,
    color: '#374151',
    marginBottom: 12,
  },
  alternatives: {
    gap: 8,
  },
  chip: {
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E0D4FF',
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  chipTime: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    marginBottom: 2,
  },
  chipReason: {
    fontSize: 12,
    color: '#666',
  },
  actions: {
    marginTop: 12,
    alignItems: 'center',
  },
  linkButton: {
    padding: 8,
  },
  linkText: {
    fontSize: 13,
    color: '#7C3AED',
    fontWeight: '500',
  },
  noAlternatives: {
    fontSize: 13,
    color: '#666',
    fontStyle: 'italic',
    textAlign: 'center',
    marginVertical: 12,
  },
  timezone: {
    fontSize: 11,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 8,
  },
});

