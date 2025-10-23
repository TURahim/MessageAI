import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { Expo, ExpoPushMessage } from 'expo-server-sdk';

// Initialize Firebase Admin
admin.initializeApp();

// Initialize Expo SDK
const expo = new Expo();

/**
 * Cloud Function: Send push notifications when a new message is created
 * Triggers on: /conversations/{conversationId}/messages/{messageId} onCreate
 */
export const sendMessageNotification = functions.firestore
  .document('conversations/{conversationId}/messages/{messageId}')
  .onCreate(async (snapshot, context) => {
    const message = snapshot.data();
    const conversationId = context.params.conversationId;
    const messageId = context.params.messageId;

    console.log('📬 New message created:', {
      conversationId: conversationId.substring(0, 12),
      messageId: messageId.substring(0, 8),
      sender: message.senderId?.substring(0, 8),
      type: message.type,
    });

    try {
      // Get conversation to find recipients
      const convDoc = await admin.firestore()
        .doc(`conversations/${conversationId}`)
        .get();

      if (!convDoc.exists) {
        console.warn('⚠️ Conversation not found:', conversationId);
        return;
      }

      const conversation = convDoc.data();
      if (!conversation) return;

      // Get recipients (everyone except sender)
      const recipients: string[] = conversation.participants.filter(
        (uid: string) => uid !== message.senderId
      );

      console.log(`📤 Sending notifications to ${recipients.length} recipient(s)`);

      // Fetch user documents for all recipients
      const userDocs = await Promise.all(
        recipients.map((uid: string) =>
          admin.firestore().doc(`users/${uid}`).get()
        )
      );

      // Build push notification messages
      const pushMessages: ExpoPushMessage[] = [];

      for (const userDoc of userDocs) {
        if (!userDoc.exists) {
          console.warn('⚠️ User document not found:', userDoc.id);
          continue;
        }

        const userData = userDoc.data();
        if (!userData) continue;

        const pushToken = userData.pushToken;

        // Skip if user has no push token
        if (!pushToken) {
          console.log(`📵 No push token for user: ${userDoc.id.substring(0, 8)}`);
          continue;
        }

        // Skip if user is currently viewing this conversation (suppression)
        if (userData.presence?.activeConversationId === conversationId) {
          console.log(`🔕 Suppressed for user: ${userDoc.id.substring(0, 8)} (viewing conversation)`);
          continue;
        }

        // Validate Expo push token
        if (!Expo.isExpoPushToken(pushToken)) {
          console.warn(`⚠️ Invalid push token for user: ${userDoc.id.substring(0, 8)}`);
          continue;
        }

        // Format notification body
        const body = message.type === 'image' 
          ? '📷 Image' 
          : (message.text || 'New message');

        // Add to batch
        pushMessages.push({
          to: pushToken,
          sound: 'default',
          title: message.senderName || 'New Message',
          body: body.substring(0, 200), // Limit length
          data: {
            conversationId,
            messageId,
            type: 'message',
          },
          badge: 1, // Increment badge
          priority: 'high',
          channelId: 'messages', // Android notification channel
        });

        console.log(`✅ Queued push for user: ${userDoc.id.substring(0, 8)}`);
      }

      // Send notifications in chunks (Expo recommends batching)
      if (pushMessages.length === 0) {
        console.log('📭 No push notifications to send (all suppressed or no tokens)');
        return;
      }

      const chunks = expo.chunkPushNotifications(pushMessages);
      const tickets = [];

      console.log(`📤 Sending ${pushMessages.length} notification(s) in ${chunks.length} chunk(s)`);

      for (const chunk of chunks) {
        try {
          const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
          tickets.push(...ticketChunk);
          console.log(`✅ Chunk sent: ${ticketChunk.length} tickets`);
        } catch (error) {
          console.error('❌ Error sending push notification chunk:', error);
        }
      }

      // Log any errors from tickets
      for (const ticket of tickets) {
        if (ticket.status === 'error') {
          console.error('❌ Push notification error:', ticket.message);
        }
      }

      console.log(`🎉 Push notification job complete: ${tickets.length} sent`);
    } catch (error) {
      console.error('❌ Error in sendMessageNotification function:', error);
      // Don't throw - allow message to be created even if notifications fail
    }
  });

