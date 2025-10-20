# Active Context

## Current Milestone: Expo Router Working ✅
Expo Router migration + Email/password authentication implemented.
Routes now correctly loading from nested app/app/ directory (Expo Router default convention).

## What's Working
- ✅ Expo Router file-based routing ((auth)/, (tabs)/, chat/[id])
- ✅ Email/password authentication with Firestore profiles
- ✅ Auth state management via AuthContext
- ✅ Auto-redirect based on auth state
- ✅ Real-time message sync via Firestore onSnapshot
- ✅ Optimistic send (messages appear instantly)
- ✅ Offline persistence (survives app restart)
- ✅ Idempotent message IDs (no duplicates)
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

## Known Issues
- ✅ RESOLVED: getDevServer TypeError - Fixed with metro-runtime 6.1.2
- ✅ RESOLVED: Expo Router "Welcome to Expo" screen - Fixed by using nested app/app/ directory
  - **Root Cause:** Expo Router looks for routes in app/ subdirectory by default
  - **Solution:** Moved all routes into app/app/ (auth, tabs, chat, _layout, index)
  - **Critical:** DO NOT flatten structure - nested app/app/ is REQUIRED!
- ✅ NUCLEAR RESET: Complete reinstall with SDK 54 + React 19.1 + RN 0.81.4
  - All simulators erased and reset to factory
  - Fresh install with 968 packages in app/node_modules
  - PNPM workspace disabled (shamefully-hoist enabled)
  - expo-router upgraded to 6.0.12 (SDK 54 compatible)
- ✅ RESOLVED: TypeScript errors - All fixed with @ alias
- ✅ RESOLVED: React Navigation conflicts - Removed completely
- ✅ RESOLVED: PNPM hoisting - Disabled workspace, all deps in app/node_modules
- ✅ RESOLVED: New Architecture conflict - Disabled in app.json
- ⚠️ Peer dependency warnings for React 19 - Non-blocking

## Next Actions (PR #3-4)
1. Create conversationService.ts (create, list, find direct chats)
2. Build users.tsx screen (list all users)
3. Implement conversation creation flow
4. Update (tabs)/index.tsx with real conversation list
5. Add ConversationListItem component
6. Subscribe to user's conversations in real-time

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

