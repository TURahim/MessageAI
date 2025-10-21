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
2. ✅ **Message persistence** - Survives app restarts (offline cache)
3. ✅ **Optimistic UI** - Messages appear instantly before server confirmation
4. ✅ **Retry logic** - Failed messages can be retried
5. ✅ **Message timestamps** - Display message timing
6. ✅ **User authentication** - Email/password + Google Sign-In
7. ✅ **Conversation management** - Create, list, real-time updates
8. ✅ **Offline support** - Queued writes, cache loading
9. ⚠️ **Online/offline status** - User presence indicators (TODO: PR #9)
10. ⚠️ **Group chat** - 3+ users in one conversation (TODO: PR #12)
11. ⚠️ **Push notifications** - At least foreground (TODO: PR #14)

**Status:** 8/11 complete (Phase 2 done, Phase 3 in progress)

## Timeline
- MVP Target: 24 hours from start
- Current: Phase 2 complete - ~12 hours in
- Remaining: ~12 hours for Phase 3 (presence, groups, notifications)
- Progress: 8/11 features done (73%)
- Status: ON TRACK ✅

