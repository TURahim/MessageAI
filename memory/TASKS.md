# Tasks

## Current Sprint: User Features (Phase 2)

### High Priority
- [ ] **User Authentication**
  - Implement email/password auth
  - Add profile creation (name, photo)
  - Update AuthScreen with email/password flow
  - Handle auth state persistence

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
- [x] Navigation structure (React Navigation)
- [x] Real-time messaging (Firestore onSnapshot)
- [x] Optimistic send with UUID IDs
- [x] Message service (CRUD operations)
- [x] ChatRoomScreen with real-time UI
- [x] Message state machine
- [x] Testing setup (Jest + RTL)
- [x] ChatRoomScreen tests (4/4 passing)
- [x] TypeScript configuration
- [x] Security rules (Firestore + Storage)
- [x] Project documentation
- [x] Git repository setup

