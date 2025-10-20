# MessageAI MVP - Product Requirements Document

## Executive Summary

**Project:** WhatsApp-style messaging app with React Native + Firebase  
**Timeline:** 24 hours to MVP checkpoint  
**Goal:** Production-quality real-time messaging with offline support and group chat

---

## Guardrails (Unchangeable)

1. **24-hour hard gate** - MVP must be demonstrable
2. **Messaging first** - No AI features until infrastructure solid
3. **Test on real devices** - Simulators insufficient
4. **Single platform choice** - React Native + Expo
5. **Backend deployed** - Firebase must be live
6. **No feature creep** - Only what's listed below

---

## Tech Stack (Selected)

- **Frontend:** React Native + Expo Router
- **Local Storage:** Firestore offline persistence ONLY (no SQLite/Realm)
- **Backend:** Firebase Firestore + Cloud Functions
- **Auth:** Firebase Auth
- **Push:** Expo Notifications (foreground only for MVP)
- **Storage:** Firebase Storage
- **UI Performance:** FlashList (not FlatList)

---

## Core Technical Decisions

### Message Architecture
- **Client-side message IDs** - UUID v4 for idempotency
- **Optimistic UI** - Render with `clientTimestamp`, reconcile to `serverTimestamp`
- **Retry policy** - Exponential backoff (1s→60s cap), indefinite retry until app closed
- **State machine** - `sending` → `sent` → `read` (skip `delivered` for MVP)
- **Windowed loading** - Last 50 messages, lazy load older with `startAfter`

### Presence System
- **Firestore heartbeat** - Update every 30s, offline after 90s timeout
- **Track activeConversationId** - For notification suppression
- **Update on activity** - Send message, switch conversation, app foreground

### Read Receipts
- **One-on-one** - Individual read status with checkmarks
- **Groups** - Aggregate count ("Read by 3") using `readBy[]` array

### Media Upload
- **Upload-then-send flow** - Status: `uploading` → `ready`
- **Client compression** - < 2MB before upload
- **Immediate preview** - Show local URI while uploading

### Notifications
- **Foreground only** - Suppress when `activeConversationId` matches
- **Background deferred** - Post-MVP with FCM

---

## Data Schema (Simplified)

### `/users/{uid}`
```typescript
{
  uid: string;
  displayName: string;
  photoURL: string | null;
  presence: {
    status: 'online' | 'offline';
    lastSeen: Timestamp;
    activeConversationId: string | null;
  };
}
```

### `/conversations/{conversationId}`
```typescript
{
  id: string;
  type: 'direct' | 'group';
  participants: string[]; // Max 20 for MVP
  lastMessage: { text, senderId, timestamp, type } | null;
  name?: string; // Groups only
}
```

### `/conversations/{cid}/messages/{messageId}`
```typescript
{
  id: string; // Client-generated UUID (idempotency key)
  conversationId: string;
  senderId: string;
  type: 'text' | 'image';
  text: string;
  media?: { status, url, width, height }; // If type === 'image'
  clientTimestamp: Timestamp; // Optimistic ordering
  serverTimestamp: Timestamp | null; // Authoritative
  status: 'sending' | 'sent' | 'failed';
  retryCount: number;
  readBy: string[]; // For read receipts
  readCount: number; // Aggregate for groups
}
```

---

## MVP Features (Must Have)

### P0 - Critical Path
1. **User Authentication** - Email/password, profile setup (name, photo)
2. **One-on-One Chat** - Send/receive text in real-time (< 3s latency)
3. **Message Persistence** - Offline support, survives app restart
4. **Optimistic UI** - Messages appear instantly (< 100ms)
5. **Retry Logic** - Exponential backoff, no duplicates (idempotent IDs)

### P1 - Core Functionality
6. **Real-Time Presence** - Online/offline indicators, typing status
7. **Read Receipts** - Individual (1-on-1), aggregate (groups)
8. **Group Chat** - 3-20 users, message attribution
9. **Image Sharing** - Upload with compression, display with preview
10. **Message Timestamps** - Smart formatting (relative/absolute)
11. **Foreground Notifications** - Suppressed when conversation open

### P2 - Polish
12. **Windowed Loading** - Load older messages (50 at a time)
13. **Error States** - Clear UI for failures with retry buttons
14. **Empty States** - Onboarding for new users

---

## Non-Goals (Out of Scope)

- ❌ End-to-end encryption
- ❌ Voice/video calls
- ❌ Message editing/deletion
- ❌ Voice messages or file sharing
- ❌ Message reactions or threading
- ❌ Background push notifications
- ❌ Chat search or backup
- ❌ Contact sync
- ❌ Any AI features (Phase 2)

---

## Acceptance Criteria (Pass/Fail)

### Core Messaging
- ✅ Two users chat in real-time (< 3s latency)
- ✅ Messages appear instantly for sender (< 100ms)
- ✅ Messages persist after app restart
- ✅ No duplicate messages after reconnect
- ✅ Offline → send → reconnect → auto-send works

### Group Chat
- ✅ Create group with 3+ users
- ✅ All members receive messages in real-time
- ✅ Sender name visible in groups

### Enhanced Features
- ✅ Presence indicators accurate (online within 5s, offline within 90s)
- ✅ Read receipts work (1-on-1 and groups)
- ✅ Images upload and display (< 15s on good network)
- ✅ Foreground notifications show (suppressed when viewing conversation)

### Performance
- ✅ Smooth 60fps scroll with 100+ messages
- ✅ No memory leaks (all listeners cleaned up)
- ✅ No crashes on common actions

### Deployment
- ✅ Backend deployed (Firebase live)
- ✅ Mobile app runs on device/emulator
- ✅ Can demo all features end-to-end

---

## PR Breakdown (12 PRs)

### Phase 1: Foundation (3-4 hours)
1. **Project setup** - Expo + Firebase + folder structure
2. **Authentication** - Login/signup + user profiles
3. **Navigation** - Tab nav + conversation list screen

### Phase 2: Core Messaging (7-8 hours)
4. **Conversation creation** - Schema + start new chat
5. **Send message** - UUID IDs + optimistic UI
6. **Real-time listener** - `onSnapshot` + FlashList rendering
7. **Retry logic** - Exponential backoff + failed state
8. **Offline sync** - Verify Firestore offline persistence

### Phase 3: Enhanced Features (5-6 hours)
9. **Presence system** - Heartbeat + online/offline indicators
10. **Typing indicators** - Debounced events + UI display
11. **Read receipts** - Viewport tracking + `readBy[]` updates
12. **Group chat** - Create groups + multi-user messaging

### Phase 4: Media + Notifications (4-5 hours)
13. **Image upload** - Compression + upload-then-send flow
14. **Foreground notifications** - Expo Notifications + suppression logic

### Phase 5: Polish (3-4 hours)
15. **Windowed loading** - Pagination for older messages
16. **Error handling** - Clear error states + retry buttons
17. **Testing + deployment** - E2E tests + build for devices

---

## Critical Implementation Notes

### Idempotency
```typescript
// Generate client-side, use as Firestore doc ID
const messageId = uuidv4();
await setDoc(doc(db, `conversations/${cid}/messages/${messageId}`), {...});
// Retries with same ID = no duplicates
```

### Listener Cleanup (Prevents Memory Leaks)
```typescript
useEffect(() => {
  const unsubscribe = onSnapshot(query, callback);
  return () => unsubscribe(); // CRITICAL
}, [conversationId]);
```

### Message Ordering
```typescript
// Sort by serverTimestamp (authoritative), fall back to clientTimestamp
messages.sort((a, b) => {
  const aTime = a.serverTimestamp || a.clientTimestamp;
  const bTime = b.serverTimestamp || b.clientTimestamp;
  return aTime.toMillis() - bTime.toMillis();
});
```

### Firestore Offline Persistence
```typescript
import { initializeFirestore, persistentLocalCache } from 'firebase/firestore';
const db = initializeFirestore(app, {
  localCache: persistentLocalCache(), // Enable offline
});
```

---

## Security Rules (Minimum)

### Firestore
```javascript
match /conversations/{cid} {
  allow read: if request.auth.uid in resource.data.participants;
  match /messages/{mid} {
    allow read, write: if request.auth.uid in get(/databases/$(database)/documents/conversations/$(cid)).data.participants;
  }
}
```

### Storage
```javascript
match /messages/{cid}/{mid}.{ext} {
  allow read, write: if request.auth.uid in firestore.get(/databases/(default)/documents/conversations/$(cid)).data.participants;
}
```

---

## Required Firestore Indexes

```json
{
  "indexes": [
    {
      "collectionGroup": "messages",
      "fields": [
        { "fieldPath": "conversationId", "order": "ASCENDING" },
        { "fieldPath": "serverTimestamp", "order": "DESCENDING" }
      ]
    }
  ]
}
```

---

## Risks & Mitigations

### High Risk
- **Real-time sync fails** → Use Firestore `onSnapshot` (battle-tested)
- **Message duplicates** → Client-generated UUID IDs (idempotent writes)
- **Messages lost** → Firestore offline queue + retry logic
- **Memory leaks** → Strict `useEffect` cleanup discipline

### Medium Risk
- **Presence flapping** → 90s timeout (3x heartbeat)
- **Image upload fails** → Compress < 2MB, retry logic, clear errors
- **Group chat slow** → Cap at 20 members, aggregate read receipts

---

## Performance Targets

- **Message delivery:** < 3s (P95)
- **Optimistic render:** < 100ms
- **Initial load (50 msgs):** < 500ms
- **Image upload (2MB):** < 15s
- **Delivery success rate:** > 99.5%
- **Scroll FPS:** 60fps (100+ messages)

---

## Testing Scenarios (Must Pass)

1. **Real-time chat** - Device A sends → Device B receives < 3s
2. **Offline queue** - Airplane mode → send 5 msgs → go online → all send (no duplicates)
3. **App restart** - Force quit mid-send → reopen → message still sends
4. **Group chat** - 3 users → A sends → B & C receive < 3s
5. **Image upload** - Select image → uploads → shows on both devices
6. **Read receipts** - A sends → B views → A sees checkmark < 2s
7. **Presence** - A opens app → online < 5s; closes → offline < 90s
8. **Notifications** - A in conversation X → B sends to Y → notification shows; B sends to X → suppressed

---

## File Structure

```
src/
├── config/firebase.ts              # Firebase init + offline persistence
├── services/
│   ├── messageService.ts           # Send, retry, idempotency
│   ├── mediaService.ts             # Image upload
│   ├── presenceService.ts          # Heartbeat
│   └── notificationService.ts      # Foreground notifications
├── hooks/
│   ├── useMessages.ts              # Real-time listener + pagination
│   ├── useSendMessage.ts           # Optimistic send
│   └── usePresence.ts              # Heartbeat management
├── components/
│   ├── ChatScreen.tsx              # FlashList chat UI
│   ├── MessageBubble.tsx           # Message component
│   └── TypingIndicator.tsx         # Typing status
├── utils/
│   ├── messageId.ts                # UUID generation
│   └── imageCompression.ts         # Client compression
└── types/index.ts                  # TypeScript interfaces
```

---

## Key Dependencies

```json
{
  "dependencies": {
    "expo": "~50.x",
    "react-native": "0.73.x",
    "firebase": "^10.x",
    "@shopify/flash-list": "^1.6.x",
    "uuid": "^9.0.x",
    "expo-image-picker": "~14.x",
    "expo-notifications": "~0.27.x"
  }
}
```

---

## Next Steps

1. ✅ Review PRD
2. 🚀 Start PR #1 - Project setup (30 mins)
3. 🔨 Build vertically - Complete one slice before next
4. 📱 Test on real devices frequently
5. 🎯 Focus on passing acceptance criteria

**Estimated Total Time:** 20-24 hours
