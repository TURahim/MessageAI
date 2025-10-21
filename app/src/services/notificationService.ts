import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { router } from 'expo-router';
import { doc, getDoc } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';

/**
 * Configure how notifications are displayed in foreground
 */
Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    const data = notification.request.content.data;
    const conversationId = data?.conversationId as string | undefined;

    // Check if user is currently viewing this conversation
    const shouldSuppress = await shouldSuppressNotification(conversationId);

    console.log('🔔 Notification received:', {
      conversationId: conversationId?.substring(0, 12),
      shouldSuppress,
      title: notification.request.content.title,
    });

    return {
      shouldShowAlert: !shouldSuppress,
      shouldPlaySound: !shouldSuppress,
      shouldSetBadge: false,
    };
  },
});

/**
 * Check if notification should be suppressed
 * Suppress if user is currently viewing the conversation
 */
async function shouldSuppressNotification(conversationId?: string): Promise<boolean> {
  if (!conversationId || !auth.currentUser) return false;

  try {
    // Get current user's presence to check activeConversationId
    const userRef = doc(db, 'users', auth.currentUser.uid);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      const userData = userSnap.data();
      const activeConversationId = userData.presence?.activeConversationId;

      // Suppress if user is currently viewing this conversation
      const suppress = activeConversationId === conversationId;

      if (suppress) {
        console.log('🔕 Notification suppressed - user viewing conversation');
      }

      return suppress;
    }
  } catch (error) {
    console.warn('Failed to check notification suppression:', error);
  }

  return false;
}

/**
 * Request notification permissions
 */
export async function requestNotificationPermissions(): Promise<boolean> {
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.warn('⚠️ Notification permissions not granted');
      return false;
    }

    console.log('✅ Notification permissions granted');
    return true;
  } catch (error) {
    console.error('❌ Failed to request notification permissions:', error);
    return false;
  }
}

/**
 * Show a local notification for a new message
 * Automatically suppressed if user is viewing the conversation
 */
export async function showMessageNotification(
  conversationId: string,
  senderName: string,
  messageText: string,
  messageType: 'text' | 'image' = 'text'
): Promise<void> {
  try {
    // Don't show notification for own messages
    const messageFromSelf = false; // Caller should check this before calling

    if (messageFromSelf) {
      console.log('🔕 Skipping notification - message from self');
      return;
    }

    const body = messageType === 'image' ? '📷 Image' : messageText;

    await Notifications.scheduleNotificationAsync({
      content: {
        title: senderName,
        body: body,
        data: {
          conversationId,
          type: 'message',
        },
        sound: Platform.OS === 'ios' ? 'default' : undefined,
      },
      trigger: null, // Show immediately
    });

    console.log('🔔 Notification scheduled:', {
      conversationId: conversationId.substring(0, 12),
      sender: senderName,
    });
  } catch (error) {
    console.warn('Failed to show notification:', error);
    // Don't throw - notifications should be non-blocking
  }
}

/**
 * Setup notification tap handler
 * Navigates to the conversation when user taps notification
 */
export function setupNotificationTapHandler(): void {
  // Handle notification tap when app is in foreground/background
  Notifications.addNotificationResponseReceivedListener((response) => {
    const data = response.notification.request.content.data;
    const conversationId = data?.conversationId as string;

    if (conversationId) {
      console.log('📱 Notification tapped, navigating to:', conversationId.substring(0, 12));
      
      // Navigate to conversation
      router.push(`/chat/${conversationId}`);
    }
  });

  console.log('✅ Notification tap handler setup complete');
}

/**
 * Cancel all pending notifications
 */
export async function cancelAllNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
  console.log('🔕 All notifications cancelled');
}

