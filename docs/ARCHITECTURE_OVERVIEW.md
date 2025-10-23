# MessageAI - Architecture Overview

**Version:** 1.0.0  
**Last Updated:** October 23, 2025  
**Purpose:** Technical reference for AI feature integration planning

---

## Table of Contents

1. [High-Level Overview](#high-level-overview)
2. [System Architecture](#system-architecture)
3. [Data Architecture](#data-architecture)
4. [Core Modules](#core-modules)
5. [Frontend Architecture](#frontend-architecture)
6. [Backend Architecture](#backend-architecture)
7. [Networking & Synchronization](#networking--synchronization)
8. [Performance Optimizations](#performance-optimizations)
9. [Testing Infrastructure](#testing-infrastructure)
10. [Known Constraints & Technical Debt](#known-constraints--technical-debt)

---

## High-Level Overview

### Application Purpose

MessageAI is a real-time messaging application providing WhatsApp-quality chat experience with:
- Direct 1:1 conversations
- Group chat (3-20 users)
- Image sharing
- Remote push notifications (APNs/FCM)
- Offline-first architecture
- Friends-based social model

### Technology Stack

**Frontend:**
- React Native 0.81.5
- Expo SDK 54.0.18
- Expo Router 6.0.13 (file-based routing)
- TypeScript 5.9 (strict mode)
- FlashList 2.0.2 (virtualized lists)

**Backend:**
- Firebase Firestore (real-time database)
- Firebase Auth (authentication)
- Firebase Storage (media files)
- **Firebase Cloud Functions** (push notifications)
- Expo Push Service (APNs/FCM routing)

**Local Storage:**
- AsyncStorage (React Native)
- Firestore offline cache (automatic)

---

## System Architecture

### Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         Mobile App (React Native)                │
│                                                                   │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐      │
│  │ Auth Screens │    │  Chat Screen │    │ Profile/     │      │
│  │ (login.tsx)  │───▶│  ([id].tsx)  │───▶│ Friends      │      │
│  └──────────────┘    └──────┬───────┘    └──────────────┘      │
│         │                    │                     │             │
│         │                    │                     │             │
│  ┌──────▼────────────────────▼─────────────────────▼───────┐   │
│  │              Services Layer                              │   │
│  │  authService │ messageService │ presenceService │ etc.   │   │
│  └──────┬────────────────┬─────────────────────┬───────────┘   │
│         │                │                     │                 │
└─────────┼────────────────┼─────────────────────┼─────────────────┘
          │                │                     │
          ▼                ▼                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Firebase Backend                            │
│                                                                   │
│  ┌───────────┐    ┌────────────┐    ┌──────────┐               │
│  │   Auth    │    │  Firestore │    │  Storage │               │
│  └───────────┘    └─────┬──────┘    └──────────┘               │
│                          │                                        │
│                   ┌──────▼───────┐                              │
│                   │ Cloud Function│                              │
│                   │sendMessage    │                              │
│                   │Notification   │                              │
│                   └──────┬────────┘                              │
└──────────────────────────┼──────────────────────────────────────┘
                           │
                           ▼
              ┌────────────────────────┐
              │  Expo Push Service     │
              └────────┬───────────────┘
                       │
            ┌──────────┴──────────┐
            ▼                     ▼
       ┌────────┐            ┌────────┐
       │  APNs  │            │  FCM   │
       │  (iOS) │            │(Android)│
       └────────┘            └────────┘
```

### Component Interaction

```
User Action (Send Message)
  │
  ├─▶ Optimistic Update (Local State)
  │     └─▶ UI updates immediately
  │
  ├─▶ AsyncStorage (Offline Queue)
  │     └─▶ Persists for app restart
  │
  ├─▶ messageService.sendMessageWithRetry()
  │     └─▶ Write to Firestore
  │           │
  │           ├─▶ Success → Cloud Function triggers
  │           │     └─▶ Send push to recipients
  │           │
  │           └─▶ Offline → Queue locally
  │                 └─▶ Retry on network restore
  │
  └─▶ Real-time Listener (onSnapshot)
        └─▶ Update UI when server confirms
              └─▶ Remove from optimistic queue
```

---

## Data Architecture

### Firestore Schema

#### Collections Structure

```
/users/{uid}
  - uid: string
  - displayName: string
  - email?: string
  - photoURL: string | null
  - bio?: string
  - friends: string[]                    # Array of friend UIDs
  - pushToken?: string                   # Expo push token
  - pushTokenUpdatedAt?: Timestamp
  - presence: {
      status: 'online' | 'offline'
      lastSeen: Timestamp
      activeConversationId: string | null  # For notification suppression
    }
  - createdAt: Timestamp

/conversations/{cid}
  - id: string                           # Auto-generated or deterministic
  - type: 'direct' | 'group'
  - participants: string[]               # Array of UIDs
  - name?: string                        # For groups
  - createdBy?: string                   # Group creator
  - typing: {                            # Real-time typing indicators
      [uid]: Timestamp
    }
  - lastMessage: {
      text: string
      senderId: string
      timestamp: Timestamp
      type: 'text' | 'image'
    }
  - createdAt: Timestamp
  - updatedAt: Timestamp

/conversations/{cid}/messages/{mid}
  - id: string                           # Client-generated UUID
  - conversationId: string
  - senderId: string
  - senderName: string                   # Denormalized for performance
  - type: 'text' | 'image'
  - text: string
  - media?: {
      url: string                        # Firebase Storage URL
      width: number
      height: number
      status: 'uploading' | 'ready'
    }
  - clientTimestamp: Timestamp           # Client-generated (for ordering)
  - serverTimestamp: Timestamp | null    # Server-generated (source of truth)
  - status: 'sending' | 'sent' | 'failed'
  - retryCount: number
  - readBy: string[]                     # Array of UIDs who read
  - readCount: number                    # Denormalized count
```

### Indexes

**Required Firestore Composite Index:**
```
Collection: messages (collection group)
Fields:
  - conversationId (ascending)
  - serverTimestamp (descending)
```

**Purpose:** Enables paginated queries ordered by timestamp

---

### Offline Persistence Strategy

#### Two-Layer Persistence

**Layer 1: Firestore Offline Cache (Automatic)**
```
- Mechanism: AsyncStorage-backed cache
- Scope: All Firestore documents
- Managed by: Firebase SDK
- Use case: Read operations, cached queries
```

**Layer 2: Optimistic Message Queue (Manual)**
```
- Mechanism: React state + AsyncStorage
- Scope: Unsent messages only
- Managed by: app/chat/[id].tsx
- Storage key: `optimistic_messages_${conversationId}`
- Use case: Show messages before server confirmation
```

#### State Reconciliation

```typescript
// Merge strategy in chat/[id].tsx
const allMessages = useMemo(() => {
  const firestoreIds = new Set(messages.map(m => m.id));
  const pendingOptimistic = optimisticMessages.filter(m => !firestoreIds.has(m.id));
  return [...messages, ...pendingOptimistic].sort(byTimestamp);
}, [messages, optimisticMessages]);
```

**Key Points:**
- Firestore messages are source of truth
- Optimistic messages fill gaps during offline/pending
- Deduplication by message ID
- Auto-cleanup when messages sync

---

## Core Modules

### Services Layer (`app/src/services/`)

**Business logic layer - no UI dependencies**

#### 1. **authService.ts**

**Purpose:** User authentication and profile management

**Key Functions:**
```typescript
signInWithEmail(email, password): Promise<User>
signUpWithEmail(email, password, displayName): Promise<User>
signOut(): Promise<void>
ensureUserDocument(user): Promise<void>  // Creates/updates user profile
updateUserProfile(uid, updates): Promise<void>
updateProfilePhoto(uid, photoURL): Promise<void>
```

**Firebase Integration:**
- `signInWithEmailAndPassword()` - Firebase Auth
- `createUserWithEmailAndPassword()` - Firebase Auth
- `setDoc()` to create user document in Firestore

**User Profile Creation:**
```typescript
// On signup, creates:
{
  uid, email, displayName, photoURL: null,
  bio: '', friends: [],
  presence: { status: 'offline', lastSeen, activeConversationId: null },
  createdAt: serverTimestamp()
}
```

---

#### 2. **conversationService.ts**

**Purpose:** Conversation CRUD and management

**Key Functions:**
```typescript
createDirectConversation(uid1, uid2): Promise<string>
  // Returns deterministic ID: `${uid1}_${uid2}` (sorted)

getOrCreateDirectConversation(uid1, uid2): Promise<string>
  // Checks existence first, creates if needed

createGroupConversation(participants[], name, creator): Promise<string>
  // Validation: 3-20 users, name required

subscribeToUserConversations(userId, onUpdate, onError): Unsubscribe
  // Real-time listener for all user conversations

deleteConversation(cid): Promise<void>
  // Deletes conversation + all messages in batch

leaveGroup(cid, uid): Promise<void>
  // Removes user from participants, auto-deletes if < 2 remain

addMemberToGroup(cid, newMemberId): Promise<void>
  // Adds member with validation (max 20)
```

**Conversation ID Strategy:**
- **Direct chats:** Deterministic `${uid1}_${uid2}` (sorted alphabetically)
- **Group chats:** Auto-generated Firestore ID
- **Why:** Prevents duplicate direct conversations

---

#### 3. **messageService.ts** (`app/src/lib/messageService.ts`)

**Purpose:** Core message CRUD with retry logic

**Key Functions:**
```typescript
sendMessage(conversationId, message): Promise<void>
  // Writes message to Firestore, updates conversation.lastMessage

sendMessageWithRetry(conversationId, message, maxRetries=3): Promise<Result>
  // Exponential backoff: 1s, 2s, 4s
  // Checks server ack before retry (prevents duplicates)
  // Returns: { success, retryCount, isOffline }

subscribeToMessages(cid, onUpdate, onError): Unsubscribe
  // Used by useMessages hook for pagination

markMessagesAsRead(cid, messageIds[], uid): Promise<void>
  // Batch update with arrayUnion

updateMessageStatus(cid, mid, status): Promise<void>
```

**Critical Pattern - Server Ack Check:**
```typescript
// Before retry, check if message already exists
const docSnap = await getDoc(messageRef);
if (docSnap.exists() && docSnap.data().serverTimestamp) {
  return { success: true }; // Already sent, stop retrying
}
```

**Why:** Prevents duplicate sends if network flakes during initial write

---

#### 4. **presenceService.ts**

**Purpose:** User online/offline status with heartbeat pattern

**Key Functions:**
```typescript
updatePresence(uid, status, activeConversationId): Promise<void>
  // Updates presence.lastSeen, status, activeConversationId

isUserOnline(lastSeen: Timestamp): boolean
  // Returns true if lastSeen < 90 seconds ago

subscribeToUserPresence(uid, onUpdate, onError): Unsubscribe
  // Real-time listener for single user presence

setOnline(uid, conversationId?): Promise<void>
setOffline(uid): Promise<void>
```

**Heartbeat Pattern:**
```
Updates triggered by:
- App foreground
- Send message
- Switch conversation
- 30-second interval (usePresence hook)
```

**Why 30s interval:** Balances freshness with Firestore write costs

**90s threshold:** User considered offline if lastSeen > 90 seconds ago

---

#### 5. **typingService.ts**

**Purpose:** Real-time typing indicators

**Key Functions:**
```typescript
setTyping(cid, uid, isTyping: boolean): Promise<void>
  // Sets typing.{uid} = serverTimestamp() or deleteField()

subscribeToTyping(cid, currentUserId, onUpdate): Unsubscribe
  // Filters users typing within last 5 seconds

clearTyping(cid, uid): Promise<void>
```

**Typing Document Structure:**
```typescript
conversations/{cid}.typing = {
  [uid]: Timestamp  // When user started typing
}
```

**Filtering Logic:**
```typescript
// Show typing if:
- User not current user
- Timestamp exists and < 5 seconds old
```

---

#### 6. **readReceiptService.ts**

**Purpose:** Mark messages as read, update read counts

**Key Functions:**
```typescript
markMessagesAsRead(cid, messageIds[], uid): Promise<void>
  // Batch update with arrayUnion (idempotent)

updateReadCount(cid, messageIds[]): Promise<void>
  // Increments readCount field
```

**Pattern:**
```typescript
// Uses arrayUnion for idempotency
batch.update(messageRef, {
  readBy: arrayUnion(uid)
});
```

**Why arrayUnion:** Prevents duplicate entries if called multiple times

---

#### 7. **friendService.ts**

**Purpose:** Bidirectional friend relationships

**Key Functions:**
```typescript
addFriend(currentUserId, friendId): Promise<void>
  // Bidirectional: Adds to both users' friends arrays

removeFriend(currentUserId, friendId): Promise<void>
  // Bidirectional removal

getSuggestedContacts(userId): Promise<User[]>
  // Returns users not in friends list

getUserFriends(userId): Promise<User[]>
  // Fetches full User objects for friends

isFriend(currentUser, userId): boolean
```

**Implementation:**
```typescript
// Uses setDoc with merge for safety
await Promise.all([
  setDoc(userRef1, { friends: arrayUnion(friendId) }, { merge: true }),
  setDoc(userRef2, { friends: arrayUnion(currentUserId) }, { merge: true })
]);
```

---

#### 8. **mediaService.ts**

**Purpose:** Image upload with compression

**Key Functions:**
```typescript
uploadImage(uri, cid, mid, onProgress): Promise<UploadResult>
  // 1. Compress image (< 2MB)
  // 2. Upload to Firebase Storage
  // 3. Return public URL

compressImage(uri, options): Promise<CompressedImage>
  // Two-stage: 80% quality, then 60% if still > 2MB
```

**Upload Flow:**
```
1. Select image (expo-image-picker)
2. Compress (expo-image-manipulator)
   - Max dimensions: 1920x1920
   - Quality: 80% → 60% if needed
3. Upload to Storage: /messages/{cid}/{mid}.{ext}
4. Get download URL
5. Send message with media.url
```

**Storage Path Pattern:**
```
/messages/{conversationId}/{messageId}.{extension}
```

---

#### 9. **notificationService.ts**

**Purpose:** Remote push notification registration and handling

**Key Functions:**
```typescript
registerForPushNotifications(userId): Promise<string | null>
  // Gets Expo push token, stores in Firestore

setupNotificationTapHandler(): void
  // Navigates to conversation on tap

setNotificationHandler(config)
  // Foreground display configuration

shouldSuppressNotification(cid): Promise<boolean>
  // Checks presence.activeConversationId
```

**Push Token Flow:**
```
1. Check if physical device (expo-device)
2. Request permissions
3. Get Expo push token
4. Store in Firestore: users/{uid}.pushToken
5. Cloud Function uses token to send pushes
```

**Suppression Logic:**
```typescript
// Don't notify if user viewing the conversation
const userPresence = await getDoc(userRef);
const activeConversationId = userPresence.data().presence.activeConversationId;
return activeConversationId === notificationConversationId;
```

---

### Hooks Layer (`app/src/hooks/`)

**React hooks for state management and side effects**

#### 1. **useAuth.ts**

**Purpose:** Auth state from AuthContext

```typescript
const { user, loading, signOut } = useAuth();
```

**Returns:**
- `user: User | null` - Current authenticated user
- `loading: boolean` - Auth state loading
- `signOut: () => Promise<void>` - Sign out function

---

#### 2. **useConversations.ts**

**Purpose:** Real-time list of user's conversations

```typescript
const { conversations, loading, error } = useConversations(userId);
```

**Implementation:**
```typescript
// Real-time query
const q = query(
  collection(db, 'conversations'),
  where('participants', 'array-contains', userId),
  orderBy('updatedAt', 'desc')
);

return onSnapshot(q, (snapshot) => {
  const convs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  onUpdate(convs);
});
```

**Used by:** Home screen (tabs)/index.tsx

---

#### 3. **useMessages.ts**

**Purpose:** Paginated message loading with real-time updates

```typescript
const { messages, loading, hasMore, loadMore, loadingMore } = useMessages(cid, uid);
```

**Features:**
- Initial load: 50 most recent messages
- Real-time updates via onSnapshot
- Cursor-based pagination (startAfter)
- Auto-load on scroll (onEndReached)

**Query:**
```typescript
query(
  collection(db, 'conversations', cid, 'messages'),
  orderBy('serverTimestamp', 'desc'),
  limit(50)
)
```

**Display Order:**
- Firestore returns: Newest → Oldest (desc)
- UI displays: `[...messages].reverse()` → Oldest → Newest
- Reason: Natural chat order (newest at bottom)

---

#### 4. **usePresence.ts**

**Purpose:** Heartbeat updates for current user

```typescript
usePresence(activeConversationId);
```

**Behavior:**
- Updates presence every 30 seconds
- Sets status: 'online'
- Sets activeConversationId (for notification suppression)
- Cleanup: Sets 'offline' on unmount

**Integration:** Called in `_layout.tsx` globally

---

#### 5. **useUserPresence.ts**

**Purpose:** Real-time presence for any user (single source of truth)

```typescript
const { status, lastSeen, displayText } = useUserPresence(userId);
```

**Returns:**
- `status: 'online' | 'offline'` - Calculated from 90s threshold
- `lastSeen: Timestamp | null` - Last seen time
- `displayText: string` - "Online" | "Last seen 4 min ago" | "Offline"

**Used by:**
- OnlineIndicator component
- Friends list items
- Profile screens

**Why:** Ensures consistent presence display across entire app

---

#### 6. **useTypingIndicator.ts**

**Purpose:** Debounced typing status updates

```typescript
const { startTyping, stopTyping } = useTypingIndicator(cid, uid);
```

**Debouncing:**
- First keystroke: 200ms delay before setting typing=true
- Subsequent keystrokes: Update timestamp immediately
- Auto-clear: 5 seconds after last keystroke

**Why debounce:** Reduces Firestore writes, smoother UX

---

#### 7. **useMarkAsRead.ts**

**Purpose:** Viewport-based read receipt tracking

```typescript
const { onViewableItemsChanged, viewabilityConfig } = useMarkAsRead(cid, uid);
```

**Integration with FlashList:**
```typescript
<FlashList
  onViewableItemsChanged={onViewableItemsChanged}
  viewabilityConfig={viewabilityConfig}
/>
```

**Behavior:**
- Marks messages as read when 50% visible for 500ms
- Batches updates to reduce Firestore writes
- Tracks marked messages to prevent duplicates

---

#### 8. **useFriends.ts**

**Purpose:** Real-time friends list

```typescript
const { friends, loading } = useFriends(userId);
```

**Implementation:**
- Subscribes to user document
- Extracts friends[] array
- Fetches full User objects for each friend
- Returns populated friends list

---

#### 9. **useNetworkStatus.ts**

**Purpose:** Network connectivity detection

```typescript
const { isOnline, isConnected, isInternetReachable } = useNetworkStatus();
```

**Uses:** `@react-native-community/netinfo`

**States:**
- `isConnected`: Device connected to network
- `isInternetReachable`: Network has internet access
- `isOnline`: Both connected AND internet reachable

**Used for:**
- ConnectionBanner display
- Network recovery retry trigger
- Retry banner logic

---

### Components Layer (`app/src/components/`)

**Reusable UI components**

#### Key Components

**1. MessageBubble.tsx**
- Displays individual messages
- Handles text and image messages
- Shows sender name (groups)
- Status indicators ("Sending...", ✓, ✓✓)
- Pulsing animation for sending state
- Retry button for failed messages

**2. MessageInput.tsx**
- Text input with multiline support
- Blue + button for attachments
- Typing event triggers
- Send button (disabled when empty)

**3. AttachmentModal.tsx**
- Bottom sheet for media selection
- Camera and gallery options
- Dark mode support
- Permission handling

**4. ConversationListItem.tsx**
- Conversation row in list
- Avatar, name, last message preview
- Timestamp (relative: "4 minutes ago")
- Online indicator for direct chats
- Long-press to delete

**5. OnlineIndicator.tsx**
- Green dot for online users
- Uses useUserPresence hook
- Hidden when offline
- Size configurable

**6. TypingIndicator.tsx**
- Animated dots (3 dots)
- Displays "X is typing..."
- Fades in/out smoothly
- Supports multiple users

**7. SkeletonLoader.tsx**
- 5 variants: conversations, messages, profile, user list, single
- Animated pulsing effect
- Better perceived performance

**8. ErrorBanner.tsx**
- Inline error display
- Retry and dismiss actions
- Maps Firebase errors to friendly messages

**9. EmptyState.tsx**
- Icon, title, subtitle
- Optional action button
- Used for empty conversations, no friends, etc.

**10. ConnectionBanner.tsx**
- Orange banner for offline state
- Shows "Messages are queued and will sync automatically"
- Auto-hides when online

---

## Frontend Architecture

### Navigation Structure (Expo Router)

```
app/app/
├── _layout.tsx               # Root layout, auth guard
├── index.tsx                 # Entry point, redirects based on auth
│
├── (auth)/                   # Auth route group
│   ├── _layout.tsx          # Auth group layout
│   ├── login.tsx
│   └── signup.tsx
│
├── (tabs)/                   # Tab navigation group
│   ├── _layout.tsx          # Tab bar configuration
│   ├── index.tsx            # Chats list (friends + conversations)
│   └── profile.tsx          # Current user profile
│
├── chat/
│   └── [id].tsx             # Dynamic chat screen
│
├── profile/
│   └── [id].tsx             # User profile view
│
├── groupInfo/
│   └── [id].tsx             # Group info and management
│
├── users.tsx                 # Suggested contacts (modal)
└── newGroup.tsx              # Group creation (modal)
```

### Route Parameters

**Dynamic routes:**
- `/chat/[id]` - `id` = conversationId
- `/profile/[id]` - `id` = userId
- `/groupInfo/[id]` - `id` = conversationId (group only)

**Navigation:**
```typescript
router.push(`/chat/${conversationId}`);
router.push(`/profile/${userId}`);
router.push(`/groupInfo/${conversationId}`);
```

---

### State Management

**No Redux/Zustand** - Uses React patterns:

1. **Global State:**
   - AuthContext (user, loading, signOut)
   - Provided at root in _layout.tsx

2. **Screen-Level State:**
   - Local useState for UI state
   - Custom hooks for data fetching

3. **Data Fetching:**
   - Real-time: onSnapshot listeners in hooks
   - One-time: getDoc/getDocs in services

4. **Optimistic State:**
   - Local arrays merged with Firestore data
   - AsyncStorage for persistence

**State Flow:**
```
User Action
  ↓
Local State Update (optimistic)
  ↓
Service Function Call
  ↓
Firestore Write
  ↓
onSnapshot Listener
  ↓
Hook Updates State
  ↓
Component Re-renders
```

---

### Screen Breakdown

#### 1. **Chat Screen** (`chat/[id].tsx`) - Most Complex

**State:**
- `conversation: Conversation | null` - Current conversation metadata
- `otherUserName: string` - For direct chat header
- `optimisticMessages: Message[]` - Unsent/queued messages
- `uploadingImages: Map<string, number>` - Upload progress tracking
- `showRetryBanner: boolean` - Delayed retry banner visibility

**Hooks Used:**
- `useMessages` - Paginated message loading
- `usePresence` - Update activeConversationId
- `useTypingIndicator` - Typing events
- `useMarkAsRead` - Viewport tracking
- `useNetworkStatus` - Connection status

**Key Features:**
- FlashList for message rendering
- Optimistic message queue
- AsyncStorage persistence
- Network recovery auto-retry
- Image upload with progress
- Typing indicator display
- Read receipt marking
- Retry banner (3s delay)

**Performance:**
- FlashList: Virtualized rendering (60fps)
- extraData prop: Forces re-render on message changes
- Pagination: 50 messages per page
- Auto-load on scroll

---

#### 2. **Home Screen** (`(tabs)/index.tsx`)

**Structure:** SectionList with two sections

**Sections:**
1. **Friends** (if any)
   - Uses useFriends hook
   - Real-time presence via useUserPresence
   - "Message" button → getOrCreateDirectConversation

2. **Recent Conversations** (if any)
   - Uses useConversations hook
   - ConversationListItem components
   - Long-press to delete

**Header:**
- "New Group" button (top right)

**FAB:**
- Blue + button → Navigate to /users (suggested contacts)

**Empty State:**
- "No friends yet" with action buttons

---

#### 3. **Suggested Contacts** (`users.tsx`)

**Features:**
- Search bar (filters by name/email)
- Lists users not in friends
- Tap user → Navigate to profile
- Double-tap prevention

---

#### 4. **User Profile** (`profile/[id].tsx`)

**Features:**
- Avatar, name, bio
- Online status (useUserPresence)
- "Add Friend" / "Remove Friend" button
- Dynamic based on friendship status

**Actions:**
- Add friend → Navigate to home
- Remove friend → Navigate to home
- Friendship status updates in real-time

---

#### 5. **Group Info** (`groupInfo/[id].tsx`)

**Features:**
- Group avatar (letter placeholder)
- Group name and member count
- Member list with real-time presence
- "Add Member" (placeholder)
- "Leave Group" action

**Member List:**
- Avatar, name, online status
- Last seen timestamps
- Tap member → View profile

---

## Backend Architecture

### Firebase Cloud Functions

**Location:** `functions/src/index.ts`

**Function:** `sendMessageNotification`

**Trigger:**
```typescript
functions.firestore
  .document('conversations/{cid}/messages/{mid}')
  .onCreate(async (snapshot, context) => { ... })
```

**Logic Flow:**
```
1. Get message data from snapshot
2. Fetch conversation to find participants
3. Filter recipients (exclude sender)
4. For each recipient:
   a. Get user document
   b. Check if has pushToken
   c. Check if viewing this conversation (suppress)
   d. Build push message
5. Batch send via Expo Push API
6. Log results
```

**Suppression:**
```typescript
if (userData.presence?.activeConversationId === conversationId) {
  console.log('🔕 Suppressed - user viewing conversation');
  continue; // Skip this recipient
}
```

**Push Payload:**
```typescript
{
  to: pushToken,
  sound: 'default',
  title: message.senderName || 'New Message',
  body: message.type === 'image' ? '📷 Image' : message.text,
  data: {
    conversationId,
    messageId,
    type: 'message'
  },
  badge: 1,
  priority: 'high',
  channelId: 'messages'
}
```

**Dependencies:**
- `firebase-functions`: Cloud Functions SDK
- `firebase-admin`: Firestore admin access
- `expo-server-sdk`: Send to Expo Push Service

**Deployment:**
```bash
cd functions
npm install
npm run build
firebase deploy --only functions
```

**Requires:** Firebase Blaze plan (pay-as-you-go)

---

## Networking & Synchronization

### Real-Time Message Handling

**Pattern:** onSnapshot Listeners

**Example:**
```typescript
const messagesRef = collection(db, 'conversations', cid, 'messages');
const q = query(messagesRef, orderBy('serverTimestamp', 'desc'), limit(50));

const unsubscribe = onSnapshot(q, (snapshot) => {
  const messages = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
  setMessages(messages);
});

// Cleanup
return () => unsubscribe();
```

**Metadata:**
- `snapshot.metadata.fromCache` - Indicates cached vs server data
- `snapshot.metadata.hasPendingWrites` - Indicates local writes pending

**Used for:**
- Logging source (💾 CACHE or ☁️ SERVER)
- Understanding sync state

---

### Retry Logic Architecture

**Exponential Backoff:**
```typescript
let retryCount = 0;
const maxRetries = 3;

while (retryCount < maxRetries) {
  try {
    await sendMessage();
    return { success: true, retryCount };
  } catch (error) {
    if (isOfflineError) {
      return { success: false, isOffline: true };
    }
    
    retryCount++;
    const backoffMs = Math.pow(2, retryCount - 1) * 1000; // 1s, 2s, 4s
    await sleep(backoffMs);
  }
}
```

**Error Classification:**
```typescript
const isOfflineError = 
  error.code === 'unavailable' ||
  error.code === 'failed-precondition' ||
  message.includes('client is offline');
```

**Network Recovery:**
```typescript
useEffect(() => {
  if (wasOffline && isNowOnline && optimisticMessages.length > 0) {
    // Retry all pending messages
    for (const msg of optimisticMessages) {
      await sendMessageWithRetry(cid, msg);
    }
  }
}, [isOnline]);
```

---

### Presence Heartbeat

**Update Triggers:**
```
1. App foreground (usePresence mounts)
2. Every 30 seconds (setInterval)
3. Send message (updates activeConversationId)
4. Navigate to chat (sets activeConversationId)
5. Navigate away (clears activeConversationId)
```

**Implementation:**
```typescript
useEffect(() => {
  if (!user) return;

  const updateInterval = setInterval(() => {
    updatePresence(user.uid, 'online', activeConversationId);
  }, 30000); // 30 seconds

  // Initial update
  updatePresence(user.uid, 'online', activeConversationId);

  // Cleanup: Set offline
  return () => {
    clearInterval(updateInterval);
    updatePresence(user.uid, 'offline', null);
  };
}, [user, activeConversationId]);
```

**Cost Optimization:**
- 30s interval = 120 writes/hour per active user
- Alternative (not used): Hot writes on every action = 1000s/hour
- Savings: ~90% reduction in Firestore writes

---

## Authentication & User Management

### Auth Flow

```
Unauthenticated User
  ↓
App opens → _layout.tsx auth guard
  ↓
Redirects to /(auth)/login
  ↓
User enters credentials
  ↓
authService.signInWithEmail()
  ↓
Firebase Auth signs in
  ↓
AuthContext updates: user = { uid, email, ... }
  ↓
Auth guard detects user
  ↓
Redirects to /(tabs) (home screen)
  ↓
registerForPushNotifications(user.uid)
  ↓
Setup presence tracking
```

### Profile Creation (Signup)

```typescript
// authService.signUpWithEmail()
1. Create Firebase Auth user
2. Create Firestore document:
   await setDoc(doc(db, 'users', uid), {
     uid, email, displayName,
     photoURL: null,
     bio: '',
     friends: [],
     presence: {
       status: 'offline',
       lastSeen: serverTimestamp(),
       activeConversationId: null
     },
     createdAt: serverTimestamp()
   });
```

### Auth Persistence

**Current:** Memory-only (session-based)

**Reason:** Simplicity for MVP

**Future:** Can add AsyncStorage persistence
```typescript
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage)
});
```

---

## Notifications & Media

### Push Notification Architecture

**Client-Side:**
```
1. Login → registerForPushNotifications()
2. expo-notifications gets Expo push token
3. Store in Firestore: users/{uid}.pushToken
4. Setup notification tap handler
```

**Server-Side (Cloud Functions):**
```
1. Message created in Firestore
2. Cloud Function triggers
3. Fetch recipient(s) from conversation.participants
4. Get pushToken from each user document
5. Check suppression (activeConversationId)
6. Send via Expo Push API
7. Expo routes to APNs (iOS) or FCM (Android)
8. Device receives push
9. Foreground handler displays notification
```

**Foreground Handler:**
```typescript
Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    const shouldSuppress = await shouldSuppressNotification(cid);
    return {
      shouldShowAlert: !shouldSuppress,
      shouldPlaySound: !shouldSuppress,
      shouldSetBadge: false
    };
  }
});
```

---

### Image Upload Architecture

**Two-Phase Process:**

**Phase 1: Upload to Storage**
```
1. User selects image
2. expo-image-picker provides local URI
3. Compress image:
   - Stage 1: 80% quality, max 1920x1920
   - Stage 2: If > 2MB, compress to 60%
4. Upload to Firebase Storage: /messages/{cid}/{mid}.{ext}
5. Get public download URL
```

**Phase 2: Send Message**
```
6. Create message with media.url
7. sendMessageWithRetry()
8. Message appears with image
```

**Optimistic UI:**
```typescript
// Show image immediately with local URI
setOptimisticMessages(prev => [...prev, {
  ...message,
  media: {
    status: 'uploading',
    url: localUri  // Temporary
  }
}]);

// After upload, update with public URL
setOptimisticMessages(prev => prev.map(m =>
  m.id === messageId
    ? { ...m, media: { ...m.media, url: publicUrl, status: 'ready' } }
    : m
));
```

**Progress Tracking:**
```typescript
const [uploadingImages, setUploadingImages] = useState<Map<string, number>>();

await uploadImage(uri, cid, mid, (progress) => {
  setUploadingImages(new Map(uploadingImages.set(mid, progress.progress)));
});
```

---

## Performance Optimizations

### 1. FlashList Instead of FlatList

**Why:**
- Recycled list items (up to 10x faster)
- Maintains 60fps with 100+ messages
- Lower memory footprint

**Implementation:**
```typescript
<FlashList
  data={messages}
  renderItem={({ item }) => <MessageBubble message={item} />}
  keyExtractor={(item) => item.id}
  extraData={messages}  // Force re-render on data change
/>
```

---

### 2. Message Pagination

**Strategy:** Cursor-based pagination

**Initial Load:**
```typescript
query(messagesRef, orderBy('serverTimestamp', 'desc'), limit(50))
```

**Load More:**
```typescript
query(messagesRef, orderBy('serverTimestamp', 'desc'), startAfter(lastVisible), limit(50))
```

**Benefits:**
- Fast initial load (50 messages only)
- On-demand loading for older messages
- Consistent performance regardless of conversation size

---

### 3. Listener Cleanup

**Pattern:** All hooks return cleanup functions

```typescript
useEffect(() => {
  const unsubscribe = onSnapshot(query, callback);
  return () => unsubscribe(); // Cleanup
}, [dependencies]);
```

**Why:** Prevents memory leaks, reduces Firestore reads when component unmounts

---

### 4. Debouncing

**Typing Indicators:**
- 200ms delay before first update
- Prevents rapid-fire writes

**Presence:**
- 30s interval updates
- Prevents hot writes

**Read Receipts:**
- Viewport tracking: 50% visible for 500ms
- Batched updates

---

### 5. Image Compression

**Two-Stage Compression:**
```typescript
// Stage 1
const compressed = await manipulateAsync(uri, [], {
  compress: 0.8,
  format: SaveFormat.JPEG
});

// Stage 2 (if still > 2MB)
if (compressed.size > 2MB) {
  const moreCompressed = await manipulateAsync(compressed.uri, [], {
    compress: 0.6
  });
}
```

**Target:** < 2MB final size

**Typical Results:**
- 5MB original → 1.5MB compressed
- Maintains aspect ratio
- 2-3 seconds compression time

---

### 6. Denormalization

**Examples:**
```typescript
// Message includes senderName (not just senderId)
{
  senderId: 'uid123',
  senderName: 'John Doe'  // Denormalized for performance
}

// Conversation includes lastMessage (not just reference)
{
  lastMessage: {
    text: 'Hey there',
    senderId: 'uid123',
    timestamp: ...
  }
}
```

**Why:** Reduces Firestore reads - no need to fetch sender for every message

---

## Testing Infrastructure

### Test Categories

**1. Unit Tests (30 tests)**
- Services: authService, conversationService, presenceService, etc.
- Utils: messageId generation, image compression
- Pure functions, isolated logic

**2. Component Tests (33 tests)**
- React Testing Library
- ErrorBanner, EmptyState, ConnectionBanner, TypingIndicator
- Rendering, user interactions, state changes

**3. Integration Tests (10 tests - skipped)**
- Require Firebase Emulator
- Firestore security rules
- Storage security rules
- End-to-end flows

**4. Hook Tests (8 tests)**
- useMessages pagination logic
- Scroll position maintenance
- Load more functionality

### Test Environment

**Configuration:** `jest.config.js`
```javascript
{
  preset: 'react-native',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1'  // @ alias support
  },
  setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup.ts']
}
```

**Mocking:**
- Firebase modules mocked via `__tests__/setup.ts`
- NetInfo mocked for offline tests
- ImagePicker mocked for component tests

**Commands:**
```bash
pnpm test              # All tests
pnpm jest --coverage   # With coverage report
```

---

## Known Constraints & Technical Debt

### 1. Auth Persistence

**Current:** Memory-only (users re-login per session)

**Impact:** Minor UX friction

**Future Work:** Add AsyncStorage persistence (1-2 hours)

**Affects AI:** None - AI features work regardless of auth persistence

---

### 2. Push Notification Testing

**Current:** Requires physical device + EAS build

**Impact:** Cannot test in simulator during development

**Constraint:** APNs/FCM don't work in iOS Simulator

**Affects AI:** If AI generates messages, push will work the same way

---

### 3. Message Search

**Current:** No search functionality

**Impact:** Users can't search message history

**Future Work:** Would require:
- Firestore full-text search (limited)
- OR Algolia/Elasticsearch integration
- OR local SQLite index

**Affects AI:** AI-powered search would be valuable addition

---

### 4. Message Editing/Deletion

**Current:** Messages cannot be edited or deleted after sending

**Impact:** Users can't fix mistakes

**Future Work:** 
- Add `isEdited: boolean` and `editedAt: Timestamp` fields
- Add `isDeleted: boolean` field
- Update UI to show "Edited" label

**Affects AI:** AI features might need to handle edited context

---

### 5. Conversation Cache Invalidation

**Current:** Conversations cached indefinitely in Firestore offline cache

**Impact:** Stale data possible if user removed from group

**Edge Case:** User removed from group by admin, but still has cached messages

**Future Work:** Manual cache clearing on permission denied errors

**Affects AI:** AI should check user permissions before responding

---

### 6. Scalability Limits

**Current Limitations:**
- Group chat: Max 20 users (hardcoded)
- Message pagination: 50 per page (hardcoded)
- Presence update: 30s interval (hardcoded)

**Impact:** Works well for MVP, might need tuning at scale

**Future Work:** Make configurable, optimize for larger scale

**Affects AI:** If AI generates many messages, might need rate limiting

---

### 7. No Message Reactions

**Current:** Cannot react to messages (👍, ❤️, etc.)

**Impact:** Less expressive communication

**Future Work:**
- Add `reactions: { [emoji]: string[] }` to Message
- Component to display reactions
- Tap to add reaction

**Affects AI:** Could be great AI integration point (suggest reactions)

---

### 8. Typing Indicator Accuracy

**Current:** Shows typing for 5 seconds after last keystroke

**Edge Case:** User types, pauses 6s, continues - indicator disappears briefly

**Impact:** Minor UX quirk

**Affects AI:** If AI "types" responses, should use same pattern

---

### 9. Presence Latency

**Current:** Can take up to 90 seconds to show offline

**Why:** 30s heartbeat + 90s threshold

**Impact:** User might appear online briefly after closing app

**Trade-off:** Accuracy vs. Firestore write costs

**Affects AI:** AI-generated messages should respect presence

---

### 10. No End-to-End Encryption

**Current:** Messages stored in plaintext in Firestore

**Impact:** Not suitable for highly sensitive communications

**Security:** Firestore security rules prevent unauthorized access

**Future Work:** E2E encryption would require:
- Key exchange mechanism
- Client-side encryption/decryption
- Encrypted message storage

**Affects AI:** AI would need decrypted messages to process - architecture decision needed

---

## Integration Points for AI Features

### Potential AI Integration Areas

#### 1. **Message Generation**

**Hook Point:** `app/chat/[id].tsx` - handleSend()

**Implementation Approach:**
```typescript
const handleAIResponse = async (userMessage: string) => {
  // 1. Get conversation context
  const recentMessages = messages.slice(-10);
  
  // 2. Call AI API (OpenAI, Claude, etc.)
  const aiResponse = await generateAIResponse(userMessage, recentMessages);
  
  // 3. Send as message from AI user
  const aiMessage = {
    id: newMessageId(),
    senderId: 'ai-bot-uid',
    senderName: 'AI Assistant',
    text: aiResponse,
    type: 'text',
    ...
  };
  
  // 4. Use existing sendMessage flow
  await sendMessageWithRetry(conversationId, aiMessage);
};
```

**Considerations:**
- Create dedicated AI user account in Firestore
- Add AI indicator in message bubbles
- Stream responses for typing effect
- Rate limiting for AI calls

---

#### 2. **Smart Suggestions**

**Hook Point:** `MessageInput.tsx` - text analysis

**Implementation Approach:**
```typescript
const [suggestions, setSuggestions] = useState<string[]>([]);

useEffect(() => {
  if (text.length > 10) {
    // Debounced AI call for suggestions
    const getSuggestions = async () => {
      const suggested = await aiService.suggestCompletions(text, context);
      setSuggestions(suggested);
    };
    debounce(getSuggestions, 500)();
  }
}, [text]);
```

**Display:** Suggestion chips above keyboard

---

#### 3. **Message Summarization**

**Hook Point:** `groupInfo/[id].tsx` or conversation list

**Implementation Approach:**
```typescript
const summarizeConversation = async (cid: string) => {
  // 1. Fetch last N messages
  const messages = await getMessages(cid, 100);
  
  // 2. Call AI summarization API
  const summary = await aiService.summarize(messages);
  
  // 3. Display in UI (modal or banner)
  return summary;
};
```

---

#### 4. **Smart Replies**

**Hook Point:** `MessageInput.tsx` - quick reply chips

**Implementation Approach:**
```typescript
const getSmartReplies = async (lastMessage: Message) => {
  const replies = await aiService.generateReplies(lastMessage.text);
  // Returns: ['Sounds good!', 'Let me check', 'Thanks!']
  return replies;
};
```

**Display:** Horizontal ScrollView of chips above input

---

#### 5. **Content Moderation**

**Hook Point:** `messageService.sendMessage()` - pre-send validation

**Implementation Approach:**
```typescript
const moderateMessage = async (text: string): Promise<boolean> => {
  const result = await aiService.moderateContent(text);
  if (result.flagged) {
    Alert.alert('Message Blocked', result.reason);
    return false;
  }
  return true;
};

// In sendMessage:
const allowed = await moderateMessage(message.text);
if (!allowed) return;
```

---

#### 6. **Auto-Translation**

**Hook Point:** `MessageBubble.tsx` - tap to translate

**Implementation Approach:**
```typescript
const [translated, setTranslated] = useState<string | null>(null);

const handleTranslate = async () => {
  const result = await aiService.translate(message.text, targetLanguage);
  setTranslated(result);
};
```

**Display:** Show translated text below original, tap to toggle

---

### AI Service Architecture Recommendation

**Create:** `app/src/services/aiService.ts`

```typescript
// Centralized AI service
export const aiService = {
  async generateResponse(prompt: string, context: Message[]): Promise<string> {
    // Call OpenAI/Claude API
  },
  
  async suggestCompletions(text: string, context): Promise<string[]> {
    // Smart autocomplete
  },
  
  async summarize(messages: Message[]): Promise<string> {
    // Conversation summary
  },
  
  async generateReplies(lastMessage: string): Promise<string[]> {
    // Smart reply suggestions
  },
  
  async moderateContent(text: string): Promise<ModerationResult> {
    // Content safety check
  },
  
  async translate(text: string, targetLang: string): Promise<string> {
    // Message translation
  }
};
```

**Configuration:**
- API keys in .env (OPENAI_API_KEY, etc.)
- Rate limiting middleware
- Error handling and fallbacks
- Cost tracking

---

## Security Considerations for AI

### 1. **Context Window Management**

**Current Message History:** Unlimited in conversation

**For AI:** Need to limit context
```typescript
const getAIContext = (messages: Message[], maxTokens: number) => {
  // Estimate tokens per message (~4 chars = 1 token)
  // Take most recent messages fitting in context window
  // Include system prompts
};
```

### 2. **User Privacy**

**Current:** All messages visible to participants

**For AI:**
- AI should only access conversations where AI is participant
- OR user explicitly enables AI in conversation
- Document AI data usage in privacy policy

### 3. **Rate Limiting**

**Firebase:** No built-in rate limiting

**For AI:**
- Implement client-side rate limiting
- OR Cloud Function middleware
- Prevent abuse and control costs

```typescript
const rateLimiter = {
  async checkLimit(userId: string): Promise<boolean> {
    const count = await getAICallCount(userId, '1hour');
    return count < 100; // Max 100 AI calls per hour
  }
};
```

### 4. **Cost Control**

**AI API Costs:** Can be significant at scale

**Recommendations:**
- Track usage per user
- Set monthly limits
- Free tier + paid plans
- Cache common responses

---

## Technical Debt & Constraints

### High Priority (Should Address Before AI)

**1. Error Handling in Cloud Functions**
- **Current:** Basic try-catch
- **Issue:** Failed pushes don't retry
- **Fix:** Add retry queue with exponential backoff
- **Impact on AI:** AI-generated pushes might fail silently

**2. Push Token Refresh**
- **Current:** Token stored once on login
- **Issue:** Tokens can expire, device changes
- **Fix:** Periodic refresh, handle token refresh events
- **Impact on AI:** AI notifications might not deliver

**3. Message Denormalization Consistency**
- **Current:** `message.senderName` set at creation
- **Issue:** If user changes displayName, old messages show old name
- **Fix:** Accept as feature OR re-fetch names on display
- **Impact on AI:** AI should use current names, not cached

---

### Medium Priority (Can Defer)

**1. Conversation Caching**
- **Current:** Indefinite cache, no invalidation
- **Issue:** Stale data possible
- **Impact on AI:** AI might see outdated conversation state

**2. Batch Operations**
- **Current:** Some operations are sequential
- **Issue:** Slower than necessary
- **Fix:** Use Firestore batch writes more extensively
- **Impact on AI:** AI bulk operations could be slow

**3. No Message Indexing**
- **Current:** No search capability
- **Issue:** Can't search message history
- **Impact on AI:** AI can't search context easily

---

### Low Priority (Acceptable for MVP)

**1. No Message Reactions**
**2. No Message Editing/Deletion**
**3. No Voice Messages**
**4. No File Attachments** (only images)
**5. Auth Persistence** (memory-only)

---

## AI Integration Recommendations

### Phase 1: Simple AI Responder

**Scope:** AI responds to @mentions in group chats

**Implementation:**
1. Detect @ai or @assistant in message text
2. Trigger Cloud Function
3. Call AI API with conversation context
4. Post response as AI user
5. Use existing message flow

**Complexity:** Low  
**Estimated Time:** 4-6 hours

---

### Phase 2: Smart Compose

**Scope:** Autocomplete suggestions while typing

**Implementation:**
1. Add aiService.suggestCompletions()
2. Debounced calls on text change
3. Display suggestion chips
4. Tap to insert

**Complexity:** Medium  
**Estimated Time:** 8-10 hours

---

### Phase 3: Conversation Assistant

**Scope:** Dedicated AI chat accessible from any conversation

**Implementation:**
1. Create AI conversation type: 'ai_chat'
2. Dedicated AI service with context management
3. Streaming responses for typing effect
4. Cost tracking per user

**Complexity:** High  
**Estimated Time:** 15-20 hours

---

## Codebase Health

### Strengths

✅ **Type Safety:** Full TypeScript, strict mode  
✅ **Modularity:** Clear separation of concerns  
✅ **Testing:** 73 automated tests  
✅ **Documentation:** Comprehensive guides  
✅ **Performance:** Optimized with FlashList, pagination  
✅ **Offline-First:** Robust offline support  
✅ **Real-Time:** onSnapshot listeners everywhere  
✅ **Security:** Firestore rules, authenticated operations  

### Areas for Improvement

⚠️ **Error Recovery:** Could be more robust in Cloud Functions  
⚠️ **Caching:** No explicit cache invalidation strategy  
⚠️ **Monitoring:** No analytics or error tracking (Sentry, etc.)  
⚠️ **Search:** No message search capability  
⚠️ **Rate Limiting:** None currently (needed for AI)  

---

## File Organization

### Directory Structure

```
app/
├── app/                      # Screens (Expo Router)
│   ├── (auth)/              # Auth screens
│   ├── (tabs)/              # Tab navigation
│   ├── chat/[id].tsx        # Chat screen (most complex)
│   ├── profile/[id].tsx     # User profiles
│   ├── groupInfo/[id].tsx   # Group management
│   ├── users.tsx            # Suggested contacts
│   └── newGroup.tsx         # Group creation
│
├── src/
│   ├── services/            # Business logic (8 files)
│   │   ├── authService.ts
│   │   ├── conversationService.ts
│   │   ├── friendService.ts
│   │   ├── mediaService.ts
│   │   ├── notificationService.ts
│   │   ├── presenceService.ts
│   │   ├── readReceiptService.ts
│   │   └── typingService.ts
│   │
│   ├── hooks/               # Custom React hooks (9 files)
│   │   ├── useAuth.ts
│   │   ├── useConversations.ts
│   │   ├── useFriends.ts
│   │   ├── useMarkAsRead.ts
│   │   ├── useMessages.ts           # Pagination
│   │   ├── useNetworkStatus.ts
│   │   ├── usePresence.ts
│   │   ├── useTypingIndicator.ts
│   │   └── useUserPresence.ts
│   │
│   ├── components/          # UI components (14 files)
│   │   ├── AttachmentModal.tsx
│   │   ├── ConnectionBanner.tsx
│   │   ├── ConversationListItem.tsx
│   │   ├── EmptyState.tsx
│   │   ├── ErrorBanner.tsx
│   │   ├── ImageMessage.tsx
│   │   ├── ImageUploadProgress.tsx
│   │   ├── LoadingSpinner.tsx
│   │   ├── MessageBubble.tsx        # Most complex component
│   │   ├── MessageInput.tsx
│   │   ├── OnlineIndicator.tsx
│   │   ├── SkeletonLoader.tsx
│   │   ├── TypingIndicator.tsx
│   │   └── UserCheckbox.tsx
│   │
│   ├── contexts/
│   │   └── AuthContext.tsx          # Global auth state
│   │
│   ├── lib/
│   │   ├── firebase.ts              # Firebase initialization
│   │   ├── firebaseConfig.ts        # Config from .env
│   │   └── messageService.ts        # Core message CRUD
│   │
│   ├── types/
│   │   ├── index.ts                 # User, Conversation, etc.
│   │   └── message.ts               # Message type
│   │
│   └── utils/
│       ├── errorMessages.ts         # Firebase error mapping
│       ├── imageCompression.ts      # Image utilities
│       └── messageId.ts             # UUID generation
│
├── __tests__/               # 73 automated tests
└── assets/                  # Images, icons

functions/                   # Firebase Cloud Functions
├── src/
│   └── index.ts            # sendMessageNotification
├── package.json
└── tsconfig.json
```

---

## Key Design Patterns

### 1. Optimistic UI Pattern

```typescript
// Pattern used throughout
const handleAction = async () => {
  // 1. Update local state immediately
  setLocalState(optimisticValue);
  
  // 2. Persist to AsyncStorage (optional)
  await AsyncStorage.setItem(key, value);
  
  // 3. Send to server
  const result = await serverAction();
  
  // 4. Handle result
  if (result.success) {
    // Real-time listener will update from server
  } else {
    // Revert or mark as failed
    setLocalState(failedValue);
  }
};
```

**Used for:**
- Sending messages
- Adding friends
- Creating conversations
- Uploading images

---

### 2. Service + Hook Pattern

```typescript
// Service: Pure business logic
export async function fetchData(id: string): Promise<Data> {
  const doc = await getDoc(docRef);
  return processData(doc.data());
}

// Hook: React integration
export function useData(id: string) {
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const unsubscribe = onSnapshot(docRef, (snap) => {
      setData(processData(snap.data()));
      setLoading(false);
    });
    return () => unsubscribe();
  }, [id]);
  
  return { data, loading };
}
```

**Benefits:**
- Services testable without React
- Hooks provide reactive data
- Clear separation of concerns

---

### 3. Real-Time Listener Pattern

```typescript
// Standard pattern across codebase
useEffect(() => {
  if (!resourceId) return;
  
  const unsubscribe = onSnapshot(
    resourceRef,
    (snapshot) => {
      // Success callback
      setState(processSnapshot(snapshot));
    },
    (error) => {
      // Error callback
      handleError(error);
    }
  );
  
  return () => unsubscribe(); // Cleanup
}, [resourceId]);
```

**Applied to:**
- Conversations
- Messages
- Presence
- Typing
- User profiles

---

### 4. Batch Write Pattern

```typescript
// Used for atomic operations
const batch = writeBatch(db);

batch.update(ref1, data1);
batch.update(ref2, data2);
batch.delete(ref3);

await batch.commit(); // All or nothing
```

**Used for:**
- Deleting conversations (conversation + all messages)
- Adding friends (both users' friends arrays)
- Marking multiple messages as read

---

## Data Flow Examples

### Example 1: Sending a Message

```
User types "Hello" and taps Send
  │
  ├─▶ handleSend('Hello')
  │     │
  │     ├─▶ Generate messageId (UUID)
  │     │
  │     ├─▶ Create message object
  │     │     { id, text: 'Hello', status: 'sending', ... }
  │     │
  │     ├─▶ Add to optimisticMessages state
  │     │     └─▶ UI shows message immediately with "Sending..."
  │     │
  │     ├─▶ Save to AsyncStorage
  │     │     └─▶ Persists across app restart
  │     │
  │     └─▶ sendMessageWithRetry(conversationId, message)
  │           │
  │           ├─▶ Check server ack (already sent?)
  │           │
  │           ├─▶ setDoc(messageRef, message)
  │           │     └─▶ Firestore write
  │           │           │
  │           │           ├─▶ Online: Write succeeds
  │           │           │     │
  │           │           │     ├─▶ Cloud Function triggers
  │           │           │     │     └─▶ sendMessageNotification
  │           │           │     │           └─▶ Expo Push → APNs/FCM → Recipient
  │           │           │     │
  │           │           │     └─▶ updateDoc(conversationRef, { lastMessage })
  │           │           │
  │           │           └─▶ Offline: Write queued by Firestore
  │           │                 └─▶ Auto-send when online
  │           │
  │           └─▶ Returns { success: true/false, isOffline: true/false }
  │
  └─▶ onSnapshot listener fires (recipient)
        │
        ├─▶ useMessages hook receives new message
        │     └─▶ messages state updates
        │           └─▶ FlashList re-renders
        │                 └─▶ Message appears for recipient
        │
        └─▶ Sender's listener also fires
              └─▶ Message now has serverTimestamp
                    └─▶ Cleanup effect removes from optimisticMessages
                          └─▶ Status changes "Sending..." → "✓"
```

---

### Example 2: Adding a Friend

```
User taps "Add Friend" on profile screen
  │
  ├─▶ handleAddFriend()
  │     │
  │     └─▶ friendService.addFriend(currentUserId, friendId)
  │           │
  │           ├─▶ Check guards (not self, authenticated, etc.)
  │           │
  │           └─▶ Bidirectional update:
  │                 │
  │                 ├─▶ setDoc(userRef1, { friends: arrayUnion(friendId) }, { merge: true })
  │                 │
  │                 └─▶ setDoc(userRef2, { friends: arrayUnion(currentUserId) }, { merge: true })
  │                       │
  │                       └─▶ Both users' friends arrays updated atomically
  │
  ├─▶ Navigate back to home screen
  │
  └─▶ useFriends hook detects change
        │
        └─▶ Home screen re-renders with new friend in Friends section
```

---

## Summary

### Architectural Strengths

1. **Offline-First:** Robust AsyncStorage + Firestore cache
2. **Real-Time:** onSnapshot listeners for instant updates
3. **Modular:** Clear service/hook/component separation
4. **Type-Safe:** Full TypeScript coverage
5. **Tested:** 73 automated tests
6. **Scalable:** Pagination, virtualized lists, efficient queries

### Ready for AI Integration

**Strengths for AI:**
- ✅ Clean service layer (easy to add aiService)
- ✅ Message context readily available
- ✅ Existing error handling patterns
- ✅ Real-time updates work for AI responses
- ✅ Optimistic UI supports streaming

**Considerations for AI:**
- ⚠️ Need rate limiting
- ⚠️ Need context window management
- ⚠️ Need cost tracking
- ⚠️ Privacy policy updates
- ⚠️ User consent mechanism

### Recommended AI Integration Path

**Phase 1:** Simple AI chat bot (dedicated conversation)  
**Phase 2:** Smart replies (suggestion chips)  
**Phase 3:** Message summarization (group chats)  
**Phase 4:** Auto-translation (tap to translate)  
**Phase 5:** Content moderation (pre-send check)

**Each phase builds on existing architecture without major refactoring.**

---

**End of Architecture Overview**

This document provides a comprehensive map of the current system. All AI features can integrate cleanly into existing patterns and data flows.

For AI implementation planning, refer to:
- Integration points in each section
- aiService.ts recommended structure
- Security considerations
- Technical debt to address first

**Next Steps:** Review this document, identify AI features to prioritize, and create detailed AI feature specifications.

