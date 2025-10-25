import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, ScrollView, Pressable } from 'react-native';

interface TimezonePickerProps {
  visible: boolean;
  selectedTimezone: string;
  onSelect: (timezone: string) => void;
  onClose: () => void;
}

const COMMON_TIMEZONES = [
  { label: 'Eastern (New York)', value: 'America/New_York' },
  { label: 'Central (Chicago)', value: 'America/Chicago' },
  { label: 'Mountain (Denver)', value: 'America/Denver' },
  { label: 'Pacific (Los Angeles)', value: 'America/Los_Angeles' },
  { label: 'Alaska', value: 'America/Anchorage' },
  { label: 'Hawaii', value: 'Pacific/Honolulu' },
  { label: 'Toronto', value: 'America/Toronto' },
  { label: 'Vancouver', value: 'America/Vancouver' },
  { label: 'London (GMT/BST)', value: 'Europe/London' },
  { label: 'Paris (CET/CEST)', value: 'Europe/Paris' },
  { label: 'Berlin (CET/CEST)', value: 'Europe/Berlin' },
  { label: 'Dubai (GST)', value: 'Asia/Dubai' },
  { label: 'Mumbai (IST)', value: 'Asia/Kolkata' },
  { label: 'Singapore (SGT)', value: 'Asia/Singapore' },
  { label: 'Tokyo (JST)', value: 'Asia/Tokyo' },
  { label: 'Sydney (AEST/AEDT)', value: 'Australia/Sydney' },
];

export default function TimezonePicker({ visible, selectedTimezone, onSelect, onClose }: TimezonePickerProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={styles.handle} />
          
          <Text style={styles.title}>Select Timezone</Text>
          
          <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
            {COMMON_TIMEZONES.map((tz) => (
              <TouchableOpacity
                key={tz.value}
                style={[
                  styles.option,
                  selectedTimezone === tz.value && styles.selectedOption
                ]}
                onPress={() => {
                  onSelect(tz.value);
                  onClose();
                }}
                activeOpacity={0.7}
              >
                <Text style={[
                  styles.optionText,
                  selectedTimezone === tz.value && styles.selectedText
                ]}>
                  {tz.label}
                </Text>
                {selectedTimezone === tz.value && (
                  <Text style={styles.checkmark}>✓</Text>
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
          
          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose}
            activeOpacity={0.7}
          >
            <Text style={styles.closeButtonText}>Close</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 12,
    paddingBottom: 34,
    paddingHorizontal: 16,
    maxHeight: '70%',
  },
  handle: {
    width: 36,
    height: 4,
    backgroundColor: '#D1D1D6',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
    marginBottom: 16,
    textAlign: 'center',
  },
  list: {
    marginBottom: 16,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#F9F9F9',
    marginBottom: 8,
  },
  selectedOption: {
    backgroundColor: '#E3F2FD',
  },
  optionText: {
    fontSize: 16,
    color: '#000',
  },
  selectedText: {
    fontWeight: '600',
    color: '#007AFF',
  },
  checkmark: {
    fontSize: 18,
    color: '#007AFF',
  },
  closeButton: {
    backgroundColor: '#E5E5EA',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
});

