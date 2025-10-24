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

  return (
    <View style={styles.container}>
      {/* Warning icon and message */}
      <View style={styles.header}>
        <View style={styles.iconContainer}>
          <Text style={styles.icon}>⚠️</Text>
        </View>
        <Text style={styles.message}>{conflict.message}</Text>
      </View>

      {/* Suggested alternatives */}
      {conflict.suggestedAlternatives && conflict.suggestedAlternatives.length > 0 && (
        <View style={styles.alternatives}>
          <Text style={styles.alternativesTitle}>Suggested alternatives:</Text>
          {conflict.suggestedAlternatives.map((alt, index) => {
            const start = dayjs(alt.startTime.toDate());
            const end = dayjs(alt.endTime.toDate());
            
            return (
              <TouchableOpacity
                key={index}
                style={styles.alternativeItem}
                onPress={() => onSelectAlternative?.(index)}
                activeOpacity={0.7}
                disabled={!onSelectAlternative}
              >
                <View style={styles.alternativeContent}>
                  <Text style={styles.alternativeTime}>
                    {start.format('ddd, MMM D • h:mm A')} - {end.format('h:mm A')}
                  </Text>
                  {alt.reason && (
                    <Text style={styles.alternativeReason}>{alt.reason}</Text>
                  )}
                </View>
                {onSelectAlternative && (
                  <Text style={styles.selectButton}>Select →</Text>
                )}
              </TouchableOpacity>
            );
          })}
          
          {/* Keep Current Time Button */}
          <TouchableOpacity
            style={styles.keepTimeButton}
            onPress={handleKeepCurrentTime}
            activeOpacity={0.7}
          >
            <Text style={styles.keepTimeText}>Keep current time anyway</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFF3E0',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FFB74D',
    padding: 12,
    marginTop: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFE0B2',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  icon: {
    fontSize: 18,
  },
  message: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#E65100',
  },
  alternatives: {
    marginTop: 8,
  },
  alternativesTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  alternativeItem: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 10,
    marginBottom: 6,
    alignItems: 'center',
  },
  alternativeContent: {
    flex: 1,
  },
  alternativeTime: {
    fontSize: 13,
    fontWeight: '600',
    color: '#000',
    marginBottom: 2,
  },
  alternativeReason: {
    fontSize: 12,
    color: '#666',
  },
  selectButton: {
    fontSize: 13,
    color: '#007AFF',
    fontWeight: '600',
    marginLeft: 8,
  },
  keepTimeButton: {
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    padding: 10,
    marginTop: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#DDD',
  },
  keepTimeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
  },
});

