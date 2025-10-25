import {
  collection,
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  updateDoc,
  arrayRemove,
  arrayUnion,
  query,
  where,
  onSnapshot,
  serverTimestamp,
  Timestamp,
  orderBy,
  getDocs,
  writeBatch,
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
    async (snapshot) => {
      // First fetch the user's blocked list
      let blockedUserIds: string[] = [];
      try {
        const userDoc = await getDoc(doc(db, 'users', userId));
        if (userDoc.exists()) {
          blockedUserIds = userDoc.data().blockedUserIds || [];
        }
      } catch (error) {
        console.error('Error fetching blocked users:', error);
      }

      const conversations: Conversation[] = [];
      snapshot.forEach((docSnapshot) => {
        const data = docSnapshot.data();
        
        // Skip archived conversations
        if (data.archived === true) {
          return;
        }
        
        // Skip conversations with blocked users
        const hasBlockedUser = data.participants.some((participantId: string) => 
          participantId !== userId && blockedUserIds.includes(participantId)
        );
        
        if (hasBlockedUser) {
          return;
        }
        
        conversations.push({
          id: docSnapshot.id,
          type: data.type,
          participants: data.participants,
          lastMessage: data.lastMessage,
          name: data.name,
          archived: data.archived,
          archivedAt: data.archivedAt,
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
  // Validation
  if (participants.length < 3) {
    throw new Error('Group conversations require at least 3 participants');
  }

  if (participants.length > 20) {
    throw new Error('Group conversations cannot have more than 20 participants');
  }

  if (!groupName || groupName.trim().length === 0) {
    throw new Error('Group name is required');
  }

  if (!participants.includes(creatorId)) {
    throw new Error('Creator must be included in participants');
  }

  const conversationRef = doc(collection(db, 'conversations'));
  const conversationId = conversationRef.id;

  await setDoc(conversationRef, {
    id: conversationId,
    type: 'group',
    participants,
    name: groupName.trim(),
    createdBy: creatorId,
    lastMessage: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  console.log(`👥 Group "${groupName}" created with ${participants.length} members`);

  return conversationId;
}

/**
 * Delete a conversation and all its messages
 */
export async function deleteConversation(conversationId: string): Promise<void> {
  // GUARD: Ensure user is authenticated
  if (!auth.currentUser) {
    throw new Error('User not authenticated');
  }

  console.log('🗑️ Deleting conversation:', conversationId);

  try {
    // First, verify user is a participant
    const conversationRef = doc(db, 'conversations', conversationId);
    const conversationSnap = await getDoc(conversationRef);

    if (!conversationSnap.exists()) {
      throw new Error('Conversation not found');
    }

    const conversation = conversationSnap.data();
    if (!conversation.participants.includes(auth.currentUser.uid)) {
      throw new Error('You are not a participant in this conversation');
    }

    // Delete all messages in the conversation using batch
    const messagesQuery = query(
      collection(db, 'conversations', conversationId, 'messages')
    );
    const messagesSnapshot = await getDocs(messagesQuery);

    // Use batch for efficient deletion
    const batch = writeBatch(db);
    
    messagesSnapshot.forEach((messageDoc) => {
      batch.delete(messageDoc.ref);
    });

    // Delete the conversation document
    batch.delete(conversationRef);

    // Commit all deletes
    await batch.commit();

    console.log(`✅ Deleted conversation ${conversationId} and ${messagesSnapshot.size} messages`);
  } catch (error: any) {
    console.error('❌ Error deleting conversation:', error);
    throw error;
  }
}

/**
 * Leave a group conversation
 */
export async function leaveGroup(conversationId: string, userId: string): Promise<void> {
  // GUARD: Ensure user is authenticated
  if (!auth.currentUser) {
    throw new Error('User not authenticated');
  }

  // GUARD: Ensure current user is the one leaving
  if (auth.currentUser.uid !== userId) {
    throw new Error('You can only leave a group for yourself');
  }

  console.log('🚪 Leaving group:', { conversationId, userId });

  try {
    const conversationRef = doc(db, 'conversations', conversationId);
    const conversationSnap = await getDoc(conversationRef);

    if (!conversationSnap.exists()) {
      throw new Error('Conversation not found');
    }

    const conversation = conversationSnap.data();

    if (conversation.type !== 'group') {
      throw new Error('Can only leave group conversations');
    }

    if (!conversation.participants.includes(userId)) {
      throw new Error('You are not a participant in this group');
    }

    // Remove user from participants array
    await updateDoc(conversationRef, {
      participants: arrayRemove(userId),
      updatedAt: serverTimestamp(),
    });

    console.log(`✅ User ${userId} left group ${conversationId}`);

    // If the group is now empty (or has only 1 person), delete it
    const updatedConv = await getDoc(conversationRef);
    if (updatedConv.exists()) {
      const participants = updatedConv.data().participants || [];
      if (participants.length < 2) {
        console.log('🗑️ Group has < 2 members, deleting...');
        await deleteConversation(conversationId);
      }
    }
  } catch (error: any) {
    console.error('❌ Error leaving group:', error);
    throw error;
  }
}

/**
 * Add a member to a group conversation
 */
export async function addMemberToGroup(
  conversationId: string,
  newMemberId: string
): Promise<void> {
  // GUARD: Ensure user is authenticated
  if (!auth.currentUser) {
    throw new Error('User not authenticated');
  }

  console.log('👥 Adding member to group:', { conversationId, newMemberId });

  try {
    const conversationRef = doc(db, 'conversations', conversationId);
    const conversationSnap = await getDoc(conversationRef);

    if (!conversationSnap.exists()) {
      throw new Error('Conversation not found');
    }

    const conversation = conversationSnap.data();

    if (conversation.type !== 'group') {
      throw new Error('Can only add members to group conversations');
    }

    // GUARD: Ensure current user is a participant (only members can add members)
    if (!conversation.participants.includes(auth.currentUser.uid)) {
      throw new Error('Only group members can add new members');
    }

    // GUARD: Check if user is already a member
    if (conversation.participants.includes(newMemberId)) {
      throw new Error('User is already a member of this group');
    }

    // GUARD: Check group size limit
    if (conversation.participants.length >= 20) {
      throw new Error('Group has reached maximum size (20 members)');
    }

    // Add user to participants array
    await updateDoc(conversationRef, {
      participants: arrayUnion(newMemberId),
      updatedAt: serverTimestamp(),
    });

    console.log(`✅ User ${newMemberId} added to group ${conversationId}`);
  } catch (error: any) {
    console.error('❌ Error adding member to group:', error);
    throw error;
  }
}

