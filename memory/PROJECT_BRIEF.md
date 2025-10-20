# MessageAI - Project Brief

## Overview
WhatsApp-style messaging app built with React Native + Expo + Firebase.
Goal: Production-quality real-time messaging with offline support.

## Tech Stack
- **Frontend:** React Native 0.81.4, Expo 54, React Navigation 7, TypeScript 5.9
- **Backend:** Firebase 12.4.0 (Firestore, Auth, Storage)
- **Development:** pnpm monorepo, Jest 30, React Testing Library
- **UI:** FlashList for performance

## Core Architecture
- **Message IDs:** Client-generated UUIDs (idempotent)
- **State Machine:** sending → sent → delivered → read
- **Persistence:** Firestore offline cache with persistentLocalCache
- **Real-Time:** onSnapshot listeners with cleanup
- **Optimistic UI:** Messages appear instantly (< 100ms target)

## Data Schema
```
/conversations/{cid}/messages/{mid}
{
  mid: UUID,
  senderId: UID,
  text: string,
  clientTs: number,
  serverTs: Timestamp,
  state: MessageState,
  readBy: string[]
}
```

## Security
- Firestore rules: Members-only read/write
- Storage rules: Conversation participant validation
- Firebase config: ✔ in .env (gitignored)

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
6. ⚠️ **User authentication** - Accounts/profiles (currently anonymous)
7. ⚠️ **Group chat** - 3+ users in one conversation
8. ⚠️ **Read receipts** - Message read status
9. ⚠️ **Push notifications** - At least foreground
10. ⚠️ **Deployment** - Local emulator + deployed Firebase backend

**Status:** 3/10 complete (messaging infrastructure solid, user features needed)

## Timeline
- MVP Target: 24 hours from start
- Current: Scaffolding complete (Step H) - ~4 hours in
- Remaining: ~20 hours for user features
- Next: User auth, presence, groups, notifications

