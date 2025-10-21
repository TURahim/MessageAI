/**
 * Helper script to seed 100+ messages for pagination testing
 * 
 * Usage:
 * 1. Start the app and create a conversation
 * 2. Run this helper in the app by importing it temporarily
 * 3. Test pagination features
 */

import { db } from '@/lib/firebase';
import { collection, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { newMessageId } from '@/utils/messageId';

export async function seedMessagesForTesting(
  conversationId: string,
  senderId: string,
  senderName: string,
  count: number = 100
): Promise<void> {
  console.log(`🌱 Seeding ${count} messages for conversation ${conversationId}...`);

  const messagesRef = collection(db, 'conversations', conversationId, 'messages');
  
  const promises: Promise<void>[] = [];

  for (let i = 0; i < count; i++) {
    const messageId = newMessageId();
    const messageRef = doc(messagesRef, messageId);
    
    // Create messages with timestamps spread over time
    const delay = i * 1000; // 1 second apart
    const clientTime = new Date(Date.now() - (count - i) * 60000); // Spread over hours

    const promise = setDoc(messageRef, {
      id: messageId,
      conversationId,
      senderId,
      senderName,
      type: 'text',
      text: `Test message ${i + 1} of ${count}`,
      clientTimestamp: clientTime,
      serverTimestamp: serverTimestamp(),
      status: 'sent',
      retryCount: 0,
      readBy: [senderId],
      readCount: 1,
    });

    promises.push(promise);

    // Batch writes in groups of 20 to avoid overwhelming Firestore
    if ((i + 1) % 20 === 0) {
      await Promise.all(promises.splice(0, promises.length));
      console.log(`  ✓ Seeded ${i + 1}/${count} messages`);
    }
  }

  // Write any remaining messages
  if (promises.length > 0) {
    await Promise.all(promises);
  }

  console.log(`✅ Successfully seeded ${count} messages!`);
  console.log(`\n📋 Testing checklist:`);
  console.log(`  1. ✓ Initial load shows 50 most recent messages`);
  console.log(`  2. ✓ "Load Older Messages" button appears`);
  console.log(`  3. ✓ Clicking button loads next 50 messages`);
  console.log(`  4. ✓ Scroll to bottom triggers auto-load`);
  console.log(`  5. ✓ After loading all, button shows "Beginning of conversation"`);
  console.log(`  6. ✓ Scroll performance remains smooth (60fps)`);
  console.log(`  7. ✓ New messages appear at bottom in real-time`);
}

/**
 * Manual testing instructions:
 * 
 * 1. In your chat screen, temporarily add this button:
 * 
 *    <TouchableOpacity
 *      onPress={() => seedMessagesForTesting(conversationId, currentUserId, 'Test User', 150)}
 *      style={{ padding: 10, backgroundColor: 'red' }}
 *    >
 *      <Text style={{ color: 'white' }}>Seed 150 Messages</Text>
 *    </TouchableOpacity>
 * 
 * 2. Click the button
 * 3. Wait for seeding to complete
 * 4. Test pagination features:
 *    - Initial load (50 messages)
 *    - Load more button
 *    - Auto-load on scroll
 *    - Scroll performance
 *    - End state ("Beginning of conversation")
 * 
 * 5. Send a new message and verify it appears at the bottom
 * 6. Remove the seed button before committing
 */

