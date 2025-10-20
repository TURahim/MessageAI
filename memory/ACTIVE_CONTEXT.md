# Active Context

## Current Milestone: Step H Complete ✅
Scaffolding finished with real-time Firestore messaging implementation.

## What's Working
- ✅ Real-time message sync via Firestore onSnapshot
- ✅ Optimistic send (messages appear instantly)
- ✅ Offline persistence (survives app restart)
- ✅ Idempotent message IDs (no duplicates)
- ✅ Message state transitions (sending → sent)
- ✅ Tests passing (4/4) - ChatRoomScreen.test.tsx
- ✅ TypeScript configured with JSX support
- ✅ Firebase persistence enabled with persistentLocalCache

## Project Structure
```
MessageAI/
├── app/                      # React Native Expo app
│   ├── src/
│   │   ├── app/             # Navigation + screens
│   │   ├── lib/             # Firebase + services
│   │   ├── types/           # TypeScript types
│   │   └── utils/           # Helpers (UUID gen)
│   ├── ios/                 # iOS native
│   ├── android/             # Android native
│   └── __tests__/
├── docs/                    # PRD, tasklist, guides
├── firebase.json            # Firebase config
├── firestore.rules          # DB security rules
├── storage.rules            # Storage security rules
└── pnpm-workspace.yaml      # Monorepo config
```

## Key Files
- `app/src/lib/firebase.ts` - Firebase init with offline persistence
- `app/src/lib/messageService.ts` - CRUD operations for messages
- `app/src/app/screens/ChatRoomScreen.tsx` - Real-time chat UI
- `app/src/types/message.ts` - Message interface
- `firestore.rules` - Security: members-only access
- `storage.rules` - Security: participant validation

## Environment Setup
- Firebase config: ✔ Located at `app/src/lib/firebaseConfig.ts`
- Env vars: ✔ Template in `.env.example`
- Actual credentials: ✔ In `.env` (gitignored)

## Dependencies (Key)
- firebase: ^12.4.0
- react-native: 0.81.4
- expo: ~54.0.13
- @react-navigation/native: ^7.1.18
- @shopify/flash-list: ^2.1.0
- uuid: ^13.0.0
- jest: ^30.2.0

## Git Status
- Branch: main
- Last commit: 81bbed6 "docs: Update README with MVP details"
- Files tracked: 102 files, 14,267 lines
- Commits: 2 (initial scaffold + README update)

## Known Issues
- ⚠️ TypeScript cache sometimes shows "Cannot find module firebase/auth"
  - Fix: Restart TS Server (Cmd+Shift+P → TypeScript: Restart TS Server)
- ⚠️ Some linter errors due to TS server cache
  - Non-blocking, clears on restart

## Next Actions
1. Implement user authentication (anonymous → email/password)
2. Add user profile management
3. Build presence system (online/offline indicators)
4. Implement typing indicators
5. Add read receipts
6. Create conversation list screen
7. Build group chat functionality

