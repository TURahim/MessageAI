# MessageAI - Project Brief

## Overview
WhatsApp-style messaging app built with React Native + Expo + Firebase.
Goal: Production-quality real-time messaging with offline support.

## Tech Stack
- **Frontend:** React Native 0.81.4, Expo 54.0.13, Expo Router 6.0.12, React 19.1.0, TypeScript 5.9
- **Backend:** Firebase 12.4.0 (Firestore, Auth, Storage)
- **Development:** pnpm (workspace disabled), Jest 29.7, React Testing Library
- **UI:** FlashList 2.0.2 for performance

## Core Architecture
- **Message IDs:** Client-generated UUIDs (idempotent)
- **State Machine:** sending → sent → delivered → read
- **Persistence:** Firestore offline cache with persistentLocalCache
- **Real-Time:** onSnapshot listeners with cleanup
- **Optimistic UI:** Messages appear instantly (< 100ms target)

## Data Schema (PRD-Compliant)
```
/users/{uid}
{
  uid, displayName, photoURL,
  presence: { status, lastSeen, activeConversationId }
}

/conversations/{cid}
{
  id, type: 'direct'|'group', participants[],
  lastMessage: { text, senderId, timestamp, type },
  name (groups only)
}

/conversations/{cid}/messages/{id}
{
  id: UUID, conversationId, senderId, type: 'text'|'image',
  text, clientTimestamp, serverTimestamp,
  status: 'sending'|'sent'|'failed',
  retryCount, readBy[], readCount
}
```

## Security
- Firestore rules: Participants-only read/write (deployed ✔)
- Storage rules: Conversation participant validation
- Firebase config: ✔ in .env (gitignored)
- Indexes: ✔ deployed (conversationId + serverTimestamp)

## Performance Targets
- Message delivery: < 3s (P95)
- Optimistic render: < 100ms
- 60fps scroll with 100+ messages
- Delivery success: > 99.5%

## MVP Requirements (24-Hour Hard Gate)

Must have to pass checkpoint:
1. ✅ **One-on-one chat** - Real-time messaging between 2+ users
2. ✅ **Message persistence** - Survives app restarts
3. ✅ **Optimistic UI** - Messages appear instantly before server confirmation
4. ⚠️ **Online/offline status** - User presence indicators
5. ✅ **Message timestamps** - Display message timing
6. ✅ **User authentication** - Email/password + profiles in Firestore
7. ⚠️ **Group chat** - 3+ users in one conversation
8. ⚠️ **Read receipts** - Message read status
9. ⚠️ **Push notifications** - At least foreground
10. ⚠️ **Deployment** - Backend deployed, app needs device testing

**Status:** 5/11 complete (PR #1 & #2 done)

## Timeline
- MVP Target: 24 hours from start
- Current: PR #1 & #2 complete - ~6 hours in
- Remaining: ~18 hours for 6 features
- Next: Conversation service, presence, groups, notifications

