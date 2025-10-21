import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { User } from '@/types/index';

interface Props {
  user: User;
  selected: boolean;
  onToggle: (userId: string) => void;
}

export default function UserCheckbox({ user, selected, onToggle }: Props) {
  return (
    <TouchableOpacity 
      style={styles.container} 
      onPress={() => onToggle(user.uid)}
    >
      {/* Checkbox */}
      <View style={[styles.checkbox, selected && styles.checkboxSelected]}>
        {selected && <Text style={styles.checkmark}>✓</Text>}
      </View>

      {/* Avatar */}
      {user.photoURL ? (
        <Image source={{ uri: user.photoURL }} style={styles.avatar} />
      ) : (
        <View style={styles.avatarPlaceholder}>
          <Text style={styles.avatarText}>
            {user.displayName.charAt(0).toUpperCase()}
          </Text>
        </View>
      )}

      {/* User Info */}
      <View style={styles.info}>
        <Text style={styles.name}>{user.displayName}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  checkboxSelected: {
    backgroundColor: '#007AFF',
  },
  checkmark: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000',
  },
});

