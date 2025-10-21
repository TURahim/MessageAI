import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';

interface Props {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: any;
}

export function SkeletonBox({ 
  width = '100%', 
  height = 20, 
  borderRadius = 4,
  style 
}: Props) {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );

    animation.start();

    return () => animation.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        styles.skeleton,
        {
          width,
          height,
          borderRadius,
          opacity,
        },
        style,
      ]}
    />
  );
}

export function SkeletonConversationItem() {
  return (
    <View style={styles.conversationContainer}>
      <SkeletonBox width={50} height={50} borderRadius={25} />
      <View style={styles.conversationContent}>
        <SkeletonBox width="60%" height={16} style={{ marginBottom: 8 }} />
        <SkeletonBox width="80%" height={14} />
      </View>
    </View>
  );
}

export function SkeletonMessageBubble({ isOwn = false }: { isOwn?: boolean }) {
  return (
    <View style={[styles.messageBubble, isOwn && styles.ownMessage]}>
      <SkeletonBox 
        width={isOwn ? 200 : 250} 
        height={60} 
        borderRadius={16} 
      />
    </View>
  );
}

export function SkeletonConversationList({ count = 5 }: { count?: number }) {
  return (
    <View style={styles.listContainer}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonConversationItem key={i} />
      ))}
    </View>
  );
}

export function SkeletonChatMessages({ count = 10 }: { count?: number }) {
  return (
    <View style={styles.listContainer}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonMessageBubble key={i} isOwn={i % 3 === 0} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: '#E1E9EE',
  },
  conversationContainer: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  conversationContent: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  messageBubble: {
    padding: 12,
    marginVertical: 4,
  },
  ownMessage: {
    alignItems: 'flex-end',
  },
  listContainer: {
    flex: 1,
  },
});

export default SkeletonBox;

