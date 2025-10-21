import {
  collection,
  doc,
  getDoc,
  setDoc,
  query,
  where,
  onSnapshot,
  serverTimestamp,
  Timestamp,
  orderBy,
} from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { Conversation } from '@/types/index';

/**
 * Create a direct (1-on-1) conversation between two users
 */
export async function createDirectConversation(
  userId1: string,
  userId2: string
): Promise<string> {
  // GUARD: Ensure user is authenticated
  if (!auth.currentUser) {
    throw new Error(
      '❌ Cannot create conversation: User not authenticated. Please log in first.'
    );
  }

  // GUARD: Ensure current user is one of the participants
  if (userId1 !== auth.currentUser.uid && userId2 !== auth.currentUser.uid) {
    throw new Error(
      `❌ Cannot create conversation: Current user must be one of the participants.\n` +
      `Current user: ${auth.currentUser.uid}\n` +
      `Participants: ${userId1}, ${userId2}`
    );
  }

  // Sort UIDs alphabetically to ensure consistent ID
  const participants = [userId1, userId2].sort();
  const conversationId = `${participants[0]}_${participants[1]}`;

  // DEBUG: Log what we're creating
  console.log('🔍 Step 1 - Auth check:', {
    currentUser: auth.currentUser?.uid,
    userId1,
    userId2,
    isAuthenticated: !!auth.currentUser,
    currentUserInParticipants: participants.includes(auth.currentUser.uid),
  });

  const payload = {
    id: conversationId,
    type: 'direct',
    participants,
    lastMessage: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  // DEBUG: Log payload
  console.log('🔍 Step 2 - Conversation payload:', payload);
  console.log('🔍 Step 3 - Collection path:', 'conversations/' + conversationId);

  const conversationRef = doc(db, 'conversations', conversationId);
  
  console.log('🔍 Attempting to create conversation...');

  await setDoc(conversationRef, payload);

  console.log('✅ Conversation created successfully!');

  return conversationId;
}

/**
 * Find existing direct conversation between two users
 */
export async function findDirectConversation(
  userId1: string,
  userId2: string
): Promise<string | null> {
  const participants = [userId1, userId2].sort();
  const conversationId = `${participants[0]}_${participants[1]}`;

  console.log('🔍 findDirectConversation - Checking for existing conversation:', conversationId);

  try {
    const conversationRef = doc(db, 'conversations', conversationId);
    const conversationSnap = await getDoc(conversationRef);

    if (conversationSnap.exists()) {
      console.log('✅ Found existing conversation:', conversationId);
      return conversationId;
    }

    console.log('ℹ️ No existing conversation found');
    return null;
  } catch (error: any) {
    // Permission error when document doesn't exist - that's okay, return null
    if (error.code === 'permission-denied') {
      console.log('ℹ️ Permission denied on getDoc (document might not exist) - will create new');
      return null;
    }
    throw error;
  }
}

/**
 * Get existing conversation or create new one
 */
export async function getOrCreateDirectConversation(
  userId1: string,
  userId2: string
): Promise<string> {
  const existingId = await findDirectConversation(userId1, userId2);
  
  if (existingId) {
    return existingId;
  }

  return await createDirectConversation(userId1, userId2);
}

/**
 * Subscribe to user's conversations in real-time
 */
export function subscribeToUserConversations(
  userId: string,
  onUpdate: (conversations: Conversation[]) => void,
  onError?: (error: Error) => void
) {
  const q = query(
    collection(db, 'conversations'),
    where('participants', 'array-contains', userId),
    orderBy('updatedAt', 'desc')
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const conversations: Conversation[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        conversations.push({
          id: doc.id,
          type: data.type,
          participants: data.participants,
          lastMessage: data.lastMessage,
          name: data.name,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
        });
      });
      onUpdate(conversations);
    },
    (error) => {
      console.error('Error subscribing to conversations:', error);
      if (onError) onError(error);
    }
  );
}

/**
 * Update conversation's last message preview
 */
export async function updateConversationLastMessage(
  conversationId: string,
  message: {
    text: string;
    senderId: string;
    timestamp: Timestamp;
    type: 'text' | 'image';
  }
): Promise<void> {
  const conversationRef = doc(db, 'conversations', conversationId);

  await setDoc(
    conversationRef,
    {
      lastMessage: {
        text: message.text,
        senderId: message.senderId,
        timestamp: message.timestamp,
        type: message.type,
      },
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

/**
 * Create a group conversation
 */
export async function createGroupConversation(
  participants: string[],
  groupName: string,
  creatorId: string
): Promise<string> {
  if (participants.length < 3) {
    throw new Error('Group conversations require at least 3 participants');
  }

  const conversationRef = doc(collection(db, 'conversations'));
  const conversationId = conversationRef.id;

  await setDoc(conversationRef, {
    id: conversationId,
    type: 'group',
    participants,
    name: groupName,
    createdBy: creatorId,
    lastMessage: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return conversationId;
}

