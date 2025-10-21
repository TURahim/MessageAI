import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { subscribeToTyping } from '@/services/typingService';

interface Props {
  conversationId: string;
  currentUserId: string;
}

export default function TypingIndicator({ conversationId, currentUserId }: Props) {
  const [typingUserIds, setTypingUserIds] = useState<string[]>([]);
  const [typingUserNames, setTypingUserNames] = useState<string[]>([]);
  const opacity = useState(new Animated.Value(0))[0];

  // Subscribe to typing status
  useEffect(() => {
    if (!currentUserId || !conversationId) return;
    
    const unsubscribe = subscribeToTyping(
      conversationId,
      currentUserId,
      (userIds) => {
        setTypingUserIds(userIds);
      },
      (error) => {
        // Silently ignore permission errors (happens after sign out)
        if (error.message?.includes('Missing or insufficient permissions')) {
          return;
        }
        console.warn('Error in TypingIndicator:', error);
      }
    );

    return () => unsubscribe();
  }, [conversationId, currentUserId]);

  // Fetch user names for typing users
  useEffect(() => {
    const fetchUserNames = async () => {
      if (typingUserIds.length === 0) {
        setTypingUserNames([]);
        return;
      }

      const names = await Promise.all(
        typingUserIds.map(async (uid) => {
          try {
            const userDoc = await getDoc(doc(db, 'users', uid));
            if (userDoc.exists()) {
              return userDoc.data().displayName || 'Someone';
            }
            return 'Someone';
          } catch (error) {
            console.warn('Error fetching user name:', error);
            return 'Someone';
          }
        })
      );

      setTypingUserNames(names);
    };

    fetchUserNames();
  }, [typingUserIds]);

  // Animate in/out
  useEffect(() => {
    if (typingUserNames.length > 0) {
      Animated.timing(opacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(opacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [typingUserNames, opacity]);

  if (typingUserNames.length === 0) {
    return null;
  }

  const getTypingText = () => {
    if (typingUserNames.length === 1) {
      return `${typingUserNames[0]} is typing...`;
    } else if (typingUserNames.length === 2) {
      return `${typingUserNames[0]} and ${typingUserNames[1]} are typing...`;
    } else {
      return `${typingUserNames.length} people are typing...`;
    }
  };

  return (
    <Animated.View style={[styles.container, { opacity }]}>
      <View style={styles.content}>
        <View style={styles.dotsContainer}>
          <View style={[styles.dot, styles.dot1]} />
          <View style={[styles.dot, styles.dot2]} />
          <View style={[styles.dot, styles.dot3]} />
        </View>
        <Text style={styles.text}>{getTypingText()}</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 15,
    paddingVertical: 8,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#999',
    marginHorizontal: 2,
  },
  dot1: {},
  dot2: {},
  dot3: {},
  text: {
    fontSize: 13,
    color: '#666',
    fontStyle: 'italic',
  },
});

