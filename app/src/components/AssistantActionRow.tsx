import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';

interface AssistantAction {
  icon: string;
  title: string;
  description: string;
  onPress?: () => void;
}

interface AssistantActionRowProps {
  actions: AssistantAction[];
}

export default function AssistantActionRow({ actions }: AssistantActionRowProps) {
  const handlePress = (action: AssistantAction) => {
    if (action.onPress) {
      action.onPress();
    } else {
      // Default placeholder action
      Alert.alert(
        action.title,
        `This action will be connected to the AI orchestrator.\n\nPlaceholder for: ${action.description}`,
        [{ text: 'OK' }]
      );
    }
  };

  return (
    <View style={styles.container}>
      {actions.map((action, index) => (
        <TouchableOpacity
          key={index}
          style={styles.actionButton}
          onPress={() => handlePress(action)}
          activeOpacity={0.7}
        >
          <View style={styles.actionIcon}>
            <Text style={styles.actionIconText}>{action.icon}</Text>
          </View>
          <View style={styles.actionContent}>
            <Text style={styles.actionTitle}>{action.title}</Text>
            <Text style={styles.actionDescription}>{action.description}</Text>
          </View>
          <Text style={styles.arrow}>›</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F0E6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  actionIconText: {
    fontSize: 24,
  },
  actionContent: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  actionDescription: {
    fontSize: 13,
    color: '#666',
  },
  arrow: {
    fontSize: 24,
    color: '#C7C7CC',
    marginLeft: 8,
  },
});

