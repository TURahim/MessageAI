# Tasks

## Current Sprint: Conversations & Presence (Phase 2-3)

### High Priority
- [x] **User Authentication** ✅ PR #2 COMPLETE
  - Email/password auth (signUpWithEmail, signInWithEmail)
  - Profile creation with displayName in Firestore
  - Auth screens (login, signup) with Expo Router
  - Auth state persistence via AuthContext

- [ ] **Conversation List**
  - Build ChatsScreen with conversation list
  - Subscribe to user's conversations
  - Display last message preview
  - Show unread count badges
  - Sort by last message timestamp

- [ ] **User Profiles**
  - Create user document on signup
  - Add profile edit screen
  - Implement photo upload to Storage
  - Display user info in chat headers

### Medium Priority
- [ ] **Presence System**
  - Implement heartbeat (every 30s)
  - Online/offline indicators
  - Track activeConversationId
  - 90s timeout for offline status

- [ ] **Typing Indicators**
  - Debounced typing events
  - Display "User is typing..." in chat
  - Clear on message send

- [ ] **Read Receipts**
  - Track message read state
  - Update readBy array
  - Display checkmarks (1-on-1)
  - Show read count (groups)

### Lower Priority
- [ ] **Group Chat**
  - Create conversation with multiple participants
  - Add/remove members UI
  - Group name and avatar
  - Member list display

- [ ] **Polish**
  - Message timestamps (smart formatting)
  - Error states with retry buttons
  - Loading states
  - Empty states

## Backlog
- [ ] Image upload/sharing
- [ ] Image compression
- [ ] Windowed message loading (pagination)
- [ ] Foreground notifications
- [ ] Message search
- [ ] Push notifications (background)

## Completed ✅
- [x] Project setup (pnpm monorepo)
- [x] Firebase initialization with offline persistence
- [x] Navigation structure (Expo Router - migrated from React Navigation)
- [x] Real-time messaging (Firestore onSnapshot)
- [x] Optimistic send with UUID IDs
- [x] Message service (CRUD operations, updated to PRD schema)
- [x] ChatRoomScreen with real-time UI
- [x] Message state machine
- [x] Testing setup (Jest + RTL)
- [x] Tests passing (13/13: firebase, auth, messageId)
- [x] TypeScript configuration with @ alias
- [x] Security rules (Firestore + Storage, deployed)
- [x] Firestore indexes (deployed)
- [x] Project documentation
- [x] Git repository setup
- [x] **PR #1: Expo Router migration + setup**
- [x] **PR #2: Email/password authentication**

