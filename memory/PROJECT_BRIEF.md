# MessageAI - Project Brief

> **📚 QUICK START FOR NEW CHATS:**  
> 1. Read `QUICK-REFERENCE.md` first (750 lines - code/architecture)
> 2. Read `UI-UX-REFERENCE.md` for design system (750 lines - visual/UX)
> 3. Check `MVP-SUBMISSION-SUMMARY.md` for complete overview (600 lines)
> 4. Use `MANUAL-TEST-CHECKLIST.md` for testing procedures (343 lines)

## Overview
MessageAI - Tutor-Parent Communication Platform built with React Native + Expo + Firebase.
Goal: Role-based educational coordination with AI-powered scheduling, task management, and real-time messaging.

**Current Focus:** Specialized tutor-parent messaging with distinct experiences for educators and parents.
- Tutors: Manage parent relationships, schedule lessons, assign topics
- Parents: Connect via tutor codes, track homework, receive updates

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

## MVP Requirements - ALL COMPLETE ✅

All features implemented and tested:
1. ✅ **One-on-one chat** - Real-time messaging between 2+ users
2. ✅ **Message persistence** - Survives app restarts (offline cache)
3. ✅ **Optimistic UI** - Messages appear instantly before server confirmation
4. ✅ **Retry logic** - Failed messages can be retried
5. ✅ **Message timestamps** - Display message timing
6. ✅ **User authentication** - Email/password + Google Sign-In
7. ✅ **Conversation management** - Create, list, real-time updates
8. ✅ **Offline support** - Queued writes, cache loading
9. ✅ **Online/offline status** - User presence indicators with 90s threshold
10. ✅ **Group chat** - 3-20 users with validation
11. ✅ **Foreground notifications** - Smart suppression with presence integration

**Status:** 11/11 complete (100%) ✅ | MVP COMPLETE

## JellyDM AI Platform - FULLY OPERATIONAL 🚀

**Complete AI-powered tutor messaging platform:**
- ✅ **AI Scheduling** - Natural language event creation ("physics lesson 5pm thursday")
- ✅ **Task Management** - Homework extraction ("homework due Friday" → DeadlineCard)
- ✅ **Smart Reminders** - 24h/2h advance notifications + overdue alerts
- ✅ **Urgency Detection** - Immediate push for cancellations/emergencies
- ✅ **Conflict Resolution** - AI suggests alternative times with availability
- ✅ **RSVP Processing** - Auto-records responses with confidence scoring
- ✅ **Autonomous Monitoring** - Proactive nudges for unconfirmed events
- ✅ **User Timezones** - All times displayed in user's local timezone
- ✅ **Working Hours** - AI respects user's availability preferences

**AI Features Working:**
- 🎯 **Task Detection** - "homework due Friday" → creates deadline
- 📅 **Scheduling** - "physics lesson thursday 5pm" → creates event
- ⚠️ **Urgency** - "URGENT: cancel session" → immediate push
- 🔄 **RSVP** - "yes that works" → auto-records acceptance
- 🤖 **Reminders** - Hourly/daily automated notifications
- ⏰ **Conflicts** - AI suggests alternatives when scheduling overlaps

**Backend Complete:** 15/15 PRs shipped, all Cloud Functions deployed, 229/229 tests passing



## Recent Completions (Oct 21, 2025)
- Phase 5: Message Pagination (PR #15), Error Handling (PR #16), Testing Framework (PR #17)
- Tests: 73/73 passing (up from 40)
- Coverage: 49% (acceptable for UI-heavy MVP)
- TypeScript: 0 production errors
- Documentation: E2E guide, manual checklist, deployment prep
- Git: Committed to main + mvp_submission branch created
- **MVP SUBMISSION READY** ✅

