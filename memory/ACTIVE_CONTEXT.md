# Active Context

## Current Milestone: Phase 2 Complete ✅
Core messaging system fully implemented with retry logic and offline support.
All PRs #1-8 complete. Real-time messaging, conversations, and offline persistence working.

## What's Working
- ✅ Expo Router file-based routing (nested app/app/ structure)
- ✅ Email/password + Google Sign-In authentication
- ✅ Auth state management via AuthContext
- ✅ Auto-redirect based on auth state
- ✅ User profiles with photo upload to Firebase Storage
- ✅ Conversation creation and management
- ✅ Real-time conversation list with useConversations hook
- ✅ Real-time message sync via Firestore onSnapshot
- ✅ Optimistic send (messages appear instantly < 100ms)
- ✅ Offline persistence (AsyncStorage cache, queued writes)
- ✅ Message retry with exponential backoff (3 attempts, 1s/2s/4s)
- ✅ Graceful offline handling (messages stay in sending, not failed)
- ✅ FlashList for 60fps scrolling performance
- ✅ Network status detection and banner
- ✅ Idempotent message IDs (UUID, no duplicates)
- ✅ PRD-compliant schema (Message, User, Conversation)
- ✅ Tests passing (13/13) - firebase, auth, messageId
- ✅ TypeScript with @ alias imports
- ✅ Firestore rules + indexes deployed

## Project Structure ⚠️ CRITICAL: Nested app/ Directory

**Expo Router Convention:** All routes MUST live in `app/app/` subdirectory!

```
MessageAI/
├── app/                         # Project root (package.json here)
│   ├── app/                     # ⚠️ Routes directory (Expo Router default!)
│   │   ├── _layout.tsx          # Root layout with AuthProvider
│   │   ├── index.tsx            # Entry point with auth redirect
│   │   ├── (auth)/              # Auth routes
│   │   │   ├── _layout.tsx
│   │   │   ├── login.tsx
│   │   │   └── signup.tsx
│   │   ├── (tabs)/              # Tab routes
│   │   │   ├── _layout.tsx
│   │   │   ├── index.tsx        # Chats list
│   │   │   └── profile.tsx
│   │   └── chat/                # Dynamic routes
│   │       └── [id].tsx         # Chat room
│   ├── src/                     # Support code (NOT routes!)
│   │   ├── contexts/            # AuthContext
│   │   ├── hooks/               # useAuth
│   │   ├── lib/                 # Firebase + services
│   │   ├── services/            # authService
│   │   ├── types/               # TypeScript types
│   │   └── utils/               # messageId (UUID)
│   ├── ios/                     # iOS native
│   ├── android/                 # Android native
│   ├── package.json             # "main": "expo-router/entry"
│   ├── app.json                 # Expo config
│   └── babel.config.js          # Build config
├── docs/                        # PRD, tasklist, guides
├── firestore.indexes.json       # Message query indexes ✔ deployed
├── firebase.json                # Firebase config
├── firestore.rules              # DB security ✔ deployed
└── storage.rules                # Storage security
```

**WHY NESTED?** Expo Router by default searches for routes in an `app/` subdirectory within your project root. This allows separation of routes from configuration files.

## Key Files
- `app/app/_layout.tsx` - Root layout (Expo Router entry) ✔ NESTED!
- `app/app/index.tsx` - Home screen ✔ NESTED!
- `app/app/(auth)/login.tsx` + `signup.tsx` - Auth screens ✔ NEW
- `app/app/(tabs)/profile.tsx` - User profile ✔ NEW
- `app/app/chat/[id].tsx` - Chat room (updated to PRD schema)
- `app/src/lib/firebase.ts` - Firebase init + offline persistence
- `app/src/lib/messageService.ts` - CRUD with PRD schema
- `app/src/services/authService.ts` - Auth operations ✔ NEW
- `app/src/contexts/AuthContext.tsx` - Auth state ✔ NEW
- `app/src/types/index.ts` - PRD-compliant types ✔ NEW
- `firestore.rules` - Security: participants-only ✔ deployed
- `firestore.indexes.json` - Message queries ✔ deployed

## Environment Setup
- Firebase config: ✔ Located at `app/src/lib/firebaseConfig.ts`
- Env vars: ✔ Template in `.env.example`
- Actual credentials: ✔ In `.env` (gitignored)
- PNPM: ✔ Workspace disabled (.npmrc: shamefully-hoist=true)
- Dependencies: ✔ All 968 packages in app/node_modules (Metro can resolve)
- Metro Runtime: ✔ @expo/metro-runtime 6.1.2 (fixes getDevServer)

## Dependencies (Key)
- firebase: ^12.4.0
- react: 19.1.0 ✔ (final version)
- react-native: 0.81.4 ✔ (final version)
- expo: ~54.0.13 ✔ (final version)
- expo-router: ~6.0.12 ✔ (SDK 54 expected, fixes getDevServer)
- expo-linking: ~8.0.8 ✔ (SDK 54 expected)
- @expo/metro-runtime: 6.1.2 ✔ KEY FIX (was 4.0.1)
- expo-image-picker: ~17.0.0
- expo-notifications: ~0.32.0
- @shopify/flash-list: 2.0.2
- uuid: ^13.0.0
- jest: ~29.7.0
- babel-plugin-module-resolver: ^5.0.2 (@ alias)

## Git Status
- Branch: main
- Last commit: 81bbed6 "docs: Update README with MVP details"
- Files tracked: 102 files, 14,267 lines
- Commits: 2 (initial scaffold + README update)

## Known Issues & Resolutions
- ✅ RESOLVED: Expo Router "Welcome to Expo" - Nested app/app/ directory required
- ✅ RESOLVED: Firestore permissions - Split get/list/create with proper guards
- ✅ RESOLVED: crypto.getRandomValues - Polyfilled with expo-crypto
- ✅ RESOLVED: Firebase re-initialization - getApps() check added
- ✅ RESOLVED: Offline error handling - Detect offline vs real errors
- ✅ RESOLVED: Metro module resolution - pnpm symlinks enabled
- ✅ RESOLVED: Google Auth configuration - Runtime detection (Expo Go vs dev builds)
- ⚠️ Auth persistence - Memory only (users re-login per session) - Acceptable for MVP
- ⚠️ Peer dependency warnings for React 19 - Non-blocking

## Next Actions (Phase 3)
1. PR #9: Presence System (online/offline indicators with heartbeat)
2. PR #10: Typing Indicators (debounced, 3s clear)
3. PR #11: Read Receipts (checkmarks for 1-on-1, count for groups)
4. PR #12: Group Chat (3-20 users, group names)
5. PR #13: Image Upload (compression, progress)
6. PR #14: Push Notifications (foreground, notification suppression)

## Testing Commands
```bash
cd app
pnpm test          # Run all tests (13/13)
pnpm start         # Start dev server
npx tsc --noEmit   # TypeScript check
```

## Import Pattern
Use @ alias for all src imports:
```typescript
import { useAuth } from '@/hooks/useAuth';
import { Message } from '@/types/index';
```

