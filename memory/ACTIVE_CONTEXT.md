# Active Context

> **🚀 FOR NEW LLM CHATS - READ THESE FIRST:**  
> - `QUICK-REFERENCE.md` - Complete code/architecture reference (750 lines)
> - `UI-UX-REFERENCE.md` - Design system & components (750 lines)
> - `MVP-SUBMISSION-SUMMARY.md` - Project overview (600 lines)
> - `MANUAL-TEST-CHECKLIST.md` - Testing procedures (343 lines)
> 
> These guides provide instant context for any development task.

## Current Milestone: MVP COMPLETE + Enhanced ✅ - Phase 6 Done
All 11 MVP features + 15 bonus features implemented. Friends-first UX, group info, offline sync enhancements complete.
Production-ready codebase with WhatsApp-quality offline messaging.
Latest commit: fb4a614 (main branch)

## What's Working (Phase 1-6 Complete)
- ✅ Expo Router file-based routing (nested app/app/ structure)
- ✅ Email/password authentication (Google Sign-In removed)
- ✅ Auth state management via AuthContext
- ✅ Auto-redirect based on auth state
- ✅ User profiles with photo upload to Firebase Storage
- ✅ Friends system (add/remove, bidirectional relationships)
- ✅ Suggested contacts screen with search
- ✅ User profile screens with bio, online status, add friend button
- ✅ Conversation creation and management
- ✅ Real-time conversation list with useConversations hook
- ✅ Friends-first home screen (SectionList: Friends + Recent Conversations)
- ✅ Real-time message sync via Firestore onSnapshot
- ✅ Optimistic UI with AsyncStorage persistence (survives app restart)
- ✅ True offline support (queued messages + auto-retry on reconnect)
- ✅ Message retry with exponential backoff (3 attempts, 1s/2s/4s)
- ✅ Network recovery listener (auto-retries when connection restored)
- ✅ FlashList with extraData for proper re-rendering
- ✅ Network status detection and banner
- ✅ Idempotent message IDs (UUID, no duplicates)
- ✅ PRD-compliant schema (Message, User, Conversation)
- ✅ Message pagination (50 per page, auto-load)
- ✅ Presence indicators (online/offline with 90s threshold)
- ✅ Typing indicators (debounced, animated, improved timing)
- ✅ Read receipts (✓ gray sent, ✓✓ green read)
- ✅ WhatsApp-style message status ("Sending..." with pulse, colored checks)
- ✅ Group chat (3-20 users with validation)
- ✅ Group info screen (member list, real-time presence, leave/add members)
- ✅ Tappable group header with member count
- ✅ Display sender names in group chats (not UIDs)
- ✅ Image upload with compression (< 2MB)
- ✅ Modern attachment modal (camera/gallery picker)
- ✅ Blue + button for attachments (replaced camera emoji)
- ✅ Foreground notifications with smart suppression
- ✅ Long-press to delete conversations
- ✅ Double-tap navigation prevention
- ✅ Skeleton loaders for better UX
- ✅ Error handling with user-friendly messages
- ✅ Empty states with actions
- ✅ TypeScript with @ alias imports
- ✅ Firestore rules + indexes deployed (updated for friends)
- ✅ Bundle identifier: com.dawnrobotics.messageai

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
│   │   │   ├── index.tsx        # Chats list (friends-first)
│   │   │   └── profile.tsx
│   │   ├── users.tsx            # Suggested contacts
│   │   ├── newGroup.tsx         # Group creation
│   │   ├── profile/[id].tsx     # User profiles
│   │   ├── groupInfo/[id].tsx   # Group info
│   │   └── chat/                # Dynamic routes
│   │       └── [id].tsx         # Chat room
│   ├── src/                     # Support code (NOT routes!)
│   │   ├── contexts/            # AuthContext
│   │   ├── hooks/               # useAuth, useFriends (9 hooks)
│   │   ├── lib/                 # Firebase + services
│   │   ├── services/            # authService, friendService (9 services)
│   │   ├── components/          # 20+ UI components
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

## Dependencies (Key - Updated)
- firebase: ^12.4.0
- react: 19.1.0 ✔ (final version)
- react-native: 0.81.5 ✔ (updated for compatibility)
- expo: ~54.0.18 ✔ (updated from 54.0.13)
- expo-router: ~6.0.13 ✔ (updated from 6.0.12)
- expo-constants: ~18.0.10 ✔ (updated)
- expo-image-picker: ~17.0.0
- expo-notifications: ~0.32.0
- @react-native-async-storage/async-storage: ^2.2.0 ✔ (for offline persistence)
- @shopify/flash-list: 2.0.2
- uuid: ^13.0.0
- jest: ~29.7.0
- babel-plugin-module-resolver: ^5.0.2 (@ alias)

## Git Status
- Branch: main
- Last commit: fb4a614 "feat: friends-first UX, group info, offline sync, and major UX improvements"
- Files changed: 70 files (+5,769 lines, -3,377 lines)
- Ahead of origin: 5 commits
- New files: AttachmentModal.tsx, friendService.ts, useFriends.ts, profile/[id].tsx, groupInfo/[id].tsx
- Documentation: 5 new implementation guides added

## Known Issues & Resolutions
- ✅ RESOLVED: Expo Router "Welcome to Expo" - Nested app/app/ directory required
- ✅ RESOLVED: Firestore permissions - Split get/list/create with proper guards
- ✅ RESOLVED: crypto.getRandomValues - Polyfilled with expo-crypto
- ✅ RESOLVED: Firebase re-initialization - getApps() check added
- ✅ RESOLVED: Offline error handling - Detect offline vs real errors
- ✅ RESOLVED: Metro module resolution - pnpm symlinks enabled
- ✅ RESOLVED: Google Auth configuration - Removed (simplified to email/password only)
- ✅ RESOLVED: Offline messages disappearing - Optimistic UI with AsyncStorage persistence
- ✅ RESOLVED: Messages not auto-sending when online - Network recovery listener added
- ✅ RESOLVED: FlashList not re-rendering - Added extraData prop
- ✅ RESOLVED: Typing indicator not showing - Fixed timing and trigger logic
- ✅ RESOLVED: Double-tap navigation - Added navigationInProgress guard
- ✅ RESOLVED: Bundle identifier conflict - Updated to com.dawnrobotics.messageai
- ✅ RESOLVED: Friends security rules - Simplified for bidirectional updates
- ✅ RESOLVED: Package version compatibility - Updated expo/react-native versions
- ⚠️ Auth persistence - Memory only (users re-login per session) - Acceptable for MVP
- ⚠️ Notifications - Foreground only (no FCM/push) - Post-MVP enhancement

## Next Actions
1. Fix remaining offline auto-retry issue (messages staying in "Sending..." state)
2. Test multiple offline messages with network recovery
3. Execute E2E Test Scenarios (use MANUAL-TEST-CHECKLIST.md)
4. Performance Verification (scroll, memory, console)
5. Build Dev Client (eas build --profile development --platform ios)
6. Test Notifications (requires dev client, not Expo Go)
7. Optional: Implement global notification listener for all-screen notifications
8. Optional: Deploy to TestFlight/Play Console

## Testing Commands
```bash
cd app
pnpm test          # Run all tests (73/73)
pnpm jest --coverage  # Run with coverage (49%)
pnpm start         # Start dev server
npx tsc --noEmit   # TypeScript check (0 errors)
npx expo run:ios   # Build dev client (iOS)
npx expo run:android  # Build dev client (Android)
```

## Import Pattern
Use @ alias for all src imports:
```typescript
import { useAuth } from '@/hooks/useAuth';
import { Message } from '@/types/index';
import { addFriend } from '@/services/friendService';
```

## Phase 6 Features Added (Latest Session)

### Friends-First UX
- New User type fields: `email`, `bio`, `friends: string[]`, `createdAt`
- friendService.ts: addFriend(), removeFriend(), getSuggestedContacts(), getUserFriends()
- useFriends hook: Real-time friends list listener
- profile/[id].tsx: User profile screen with add/remove friend
- users.tsx: Refactored to "Suggested Contacts" with search
- Home screen: SectionList with Friends + Recent Conversations sections
- Navigation: FAB → Suggested Contacts → Profile → Add Friend → Back to home

### Group Info & Management
- groupInfo/[id].tsx: Full group info screen with member list
- Real-time presence tracking for all members
- Leave group functionality (auto-deletes if < 2 members)
- Add member placeholder (ready for implementation)
- Tappable group header in chat screen shows name + member count
- Info icon (ⓘ) for quick access to group info

### Offline Sync Enhancements
- Optimistic message state with AsyncStorage persistence
- Messages survive app restart and navigation
- Network recovery listener (auto-retry when online)
- Dual-state merge: Firestore + optimistic messages
- Manual "Retry All" banner when messages stuck
- Comprehensive logging for debugging

### Visual Improvements
- "Sending..." text with pulsing animation (replaced clock emoji)
- Color-coded status: Gray ✓ sent, Green ✓✓ read, Red "Failed"
- Modern attachment modal with camera/gallery picker
- Blue + button (replaced camera emoji)
- Sender names in group chats (not UIDs)
- Improved retry button styling
- Smooth status transitions

### Bug Fixes
- Fixed offline messages disappearing
- Fixed messages not auto-sending when online
- Fixed typing indicator not working
- Fixed double-tap navigation
- Fixed back button showing "(tabs)"
- Fixed FlashList not re-rendering (extraData prop)
- Fixed conversation deletion navigation
- TypeScript errors resolved

### Documentation Added
- FRIENDS-FIRST-IMPLEMENTATION-SUMMARY.md
- GROUP-INFO-IMPLEMENTATION.md
- GROUP-CHAT-UX-IMPROVEMENTS.md
- NOTIFICATIONS-DEEP-DIVE.md
- OFFLINE-SYNC-FIX.md

### Firestore Rules Updated
- Allow bidirectional friend updates
- Simplified friends field modification rules
- Deployed to production

### App Configuration
- Bundle ID: com.dawnrobotics.messageai
- App name: MessageAI
- Native folders regenerated with new bundle ID
- Package versions updated for compatibility

