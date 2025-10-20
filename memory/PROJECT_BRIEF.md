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

## Timeline
- MVP Target: 24 hours
- Current: Scaffolding complete (Step H)
- Next: User auth, presence, groups

