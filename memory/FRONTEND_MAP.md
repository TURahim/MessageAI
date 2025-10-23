# Frontend Map

## Routing Structure (Expo Router) ⚠️ NESTED app/ Directory

**CRITICAL:** All routes live in `app/app/` subdirectory (Expo Router default)

```
app/                           # Project root
├── package.json               # "main": "expo-router/entry"
├── app.json                   # Expo config
└── app/                       # ⚠️ Routes directory (Expo Router looks here!)
    ├── _layout.tsx            [Root Layout - AuthProvider]
    ├── index.tsx              [/ - Auth redirect]
    ├── (auth)/
    │   ├── _layout.tsx        [Auth group layout]
    │   ├── login.tsx          [/(auth)/login]
    │   └── signup.tsx         [/(auth)/signup]
    ├── (tabs)/
    │   ├── _layout.tsx        [Tab navigator - 5 tabs]
    │   ├── index.tsx          [/(tabs) - Chats list]
    │   ├── schedule.tsx       [/(tabs)/schedule - Calendar/Events]
    │   ├── tasks.tsx          [/(tabs)/tasks - Deadlines/To-dos]
    │   ├── assistant.tsx      [/(tabs)/assistant - AI Dashboard]
    │   └── profile.tsx        [/(tabs)/profile]
    ├── chat/
    │   └── [id].tsx           [/chat/:id - Dynamic route]
    ├── users.tsx              [/users - Suggested Contacts]
    ├── newGroup.tsx           [/newGroup - Group Creation]
    ├── profile/[id].tsx       [/profile/:id - User Profile]
    └── groupInfo/[id].tsx     [/groupInfo/:id - Group Info]
```

## Components Structure

### Implemented ✅

#### `_layout.tsx` (Root)
- **Location:** `app/app/_layout.tsx` ⚠️ NESTED!
- **Purpose:** Root layout with authentication
- **Wraps:** AuthProvider → Stack Navigator
- **Screens:** index, (auth), (tabs), chat/[id]

#### `index.tsx` (Entry)
- **Location:** `app/app/index.tsx` ⚠️ NESTED!
- **Purpose:** Initial route with auth redirect
- **Logic:** 
  - Shows loading spinner while checking auth
  - Redirects to login if not authenticated
  - Redirects to tabs if authenticated

#### `login.tsx` ✅
- **Location:** `app/app/(auth)/login.tsx` ⚠️ NESTED!
- **State:** email, password, loading
- **Actions:** 
  - handleLogin() - signInWithEmail
  - Navigate to signup
  - Auto-redirect to tabs on success
- **Validation:** Required fields check

#### `signup.tsx` ✅
- **Location:** `app/app/(auth)/signup.tsx` ⚠️ NESTED!
- **State:** email, password, displayName, loading
- **Actions:**
  - handleSignup() - signUpWithEmail
  - Creates user doc in Firestore
  - Auto-redirect to tabs on success
- **Firestore:** Creates /users/{uid} with presence

#### `(tabs)/index.tsx` (Chats) ✅
- **Location:** `app/app/(tabs)/index.tsx` ⚠️ NESTED!
- **Status:** Complete - Friends-first layout
- **Purpose:** Conversation list with friends section
- **Features:**
  - Friends list with online status
  - Recent conversations
  - Message preview with timestamps
  - FAB to find friends
  - "New Group" button

#### `(tabs)/schedule.tsx` (Schedule) ✅ NEW
- **Location:** `app/app/(tabs)/schedule.tsx` ⚠️ NESTED!
- **Status:** Complete - Mock data
- **Purpose:** Calendar and event management
- **Features:**
  - Week calendar with navigation
  - Event list grouped by day
  - Event details modal
  - "Add Lesson" with AI parsing (mock)
- **Mock Data:** useEvents hook (7 events)

#### `(tabs)/tasks.tsx` (Tasks) ✅ NEW
- **Location:** `app/app/(tabs)/tasks.tsx` ⚠️ NESTED!
- **Status:** Complete - Mock data
- **Purpose:** Deadline and task management
- **Features:**
  - Overdue/Upcoming/Completed sections
  - Mark complete/incomplete
  - Create task with assignee selector
  - Navigate to conversations
- **Mock Data:** useDeadlines hook (8 deadlines)

#### `(tabs)/assistant.tsx` (Assistant) ✅ NEW
- **Location:** `app/app/(tabs)/assistant.tsx` ⚠️ NESTED!
- **Status:** Complete - Real calculations
- **Purpose:** AI insights dashboard
- **Features:**
  - 5 insight widgets (calculated from mock data)
  - Responsive 2-column grid
  - 4 quick action buttons
  - Personalized greeting
- **Data:** Real-time calculations from useEvents + useDeadlines

#### `(tabs)/profile.tsx` ✅
- **Location:** `app/app/(tabs)/profile.tsx` ⚠️ NESTED!
- **State:** None (uses AuthContext)
- **Displays:** displayName, email
- **Actions:** handleSignOut() - signs out and auto-redirects
- **Test ID:** sign-out-button

#### `chat/[id].tsx` ✅ UPDATED
- **Location:** `app/app/chat/[id].tsx` ⚠️ NESTED!
- **State:**
  - `text` - Input value
  - `messages` - Message array (new schema)
- **Params:**
  - `id` - conversationId from URL
- **Effects:**
  - subscribeToMessages() on mount
  - markMessagesAsRead() for others' messages
  - Unsubscribe on unmount
- **Methods:**
  - `send()` - Optimistic send with PRD schema
- **Features:**
  - Real-time sync
  - Optimistic UI
  - Message bubbles
  - Status indicators (sending/sent/failed)
  - Timestamps via clientTimestamp

## Services & Hooks

### `authService.ts` ✅ NEW
- **Location:** `src/services/authService.ts`
- **Functions:**
  - `signUpWithEmail(email, password, displayName)` - Create account
  - `signInWithEmail(email, password)` - Login
  - `signOut()` - Logout
- **Firestore:** Creates user doc with presence on signup

### `AuthContext.tsx` ✅ NEW
- **Location:** `src/contexts/AuthContext.tsx`
- **Provides:** user, loading
- **Listens:** onAuthStateChanged
- **Cleanup:** Unsubscribe on unmount

### `useAuth.ts` ✅ NEW
- **Location:** `src/hooks/useAuth.ts`
- **Re-exports:** useAuth from AuthContext

### `messageService.ts` ✅ UPDATED
- **Location:** `src/lib/messageService.ts`
- **Functions (PRD Schema):**
  - `sendMessage(cid, message)` - Uses new Message type
  - `updateMessageStatus(cid, id, status)` - Was updateMessageState
  - `markMessagesAsRead(cid, ids[])` - Updates readBy[], readCount
  - `subscribeToMessages(cid, callback, onError)` - Query by serverTimestamp
- **Breaking Changes:** All field names updated to PRD spec

### `firebase.ts` ✅
- **Location:** `src/lib/firebase.ts`
- **Exports:** auth, db, storage, app
- **Config:** Offline persistence enabled

## Data Flow

### Auth Flow
```
App Start → AuthProvider.onAuthStateChanged
→ index.tsx checks user state
→ No user? → /(auth)/login
→ Has user? → /(tabs)
```

### Login Flow
```
login.tsx → signInWithEmail()
→ Firebase Auth
→ AuthContext updates
→ index.tsx auto-redirect → /(tabs)
```

### Signup Flow  
```
signup.tsx → signUpWithEmail()
→ Create Firebase Auth user
→ Update profile.displayName
→ Create /users/{uid} doc with presence
→ AuthContext updates
→ index.tsx auto-redirect → /(tabs)
```

### Message Send Flow (Updated)
```
User types → chat/[id].tsx.send()
→ Create optimistic Message (new schema)
→ Add to local state
→ messageService.sendMessage()
→ Firestore write with serverTimestamp
→ onSnapshot callback
→ Update local state (status: sent)
```

## State Management

### Global State
- **AuthContext** - User session, loading state
  - Accessed via useAuth() hook
  - Auto-redirects on state change

### Component State
- Each screen manages own state with useState
- No Redux/Zustand yet

## Import Pattern (@ Alias)

All imports now use @ for src/ folder:

```typescript
import { useAuth } from '@/hooks/useAuth';
import { signInWithEmail } from '@/services/authService';
import { Message } from '@/types/index';
import { db, auth } from '@/lib/firebase';
```

**Configured in:**
- `tsconfig.json` - TypeScript path mapping
- `babel.config.js` - babel-plugin-module-resolver

## Styling

### Approach: Inline StyleSheet
- No external UI library
- StyleSheet.create() for performance
- Consistent across auth and profile screens

### Theme
- Primary: Blue (#007AFF)
- Background: White (#fff), Light gray (#f5f5f5)
- Text: Black (#000), Gray (#666)
- Bubbles: Blue (mine), Light gray (#E5E5EA, theirs)
- Inputs: Border #ddd, rounded

## Testing Coverage

### Tested ✅ (13 tests)
- Firebase configuration (5 tests)
- Auth service (5 tests)
- Message ID generation (3 tests)

### Not Tested Yet
- Auth screens UI
- Tab navigation
- Chat screen UI
- Conversation service
- Integration tests

## Performance

### Optimizations
- ✅ Optimistic UI (< 100ms)
- ✅ Proper useEffect cleanup
- ✅ @ alias for clean imports
- 🚧 FlashList (installed, not used in chat yet)
- 🚧 Message windowing (pagination)

## Type Safety

### Centralized Types
- **Location:** `src/types/index.ts`
- **Exports:** Message, User, Conversation, MessageStatus, etc.
- **Usage:** All services import from here
- **Backward compat:** `types/message.ts` re-exports

## Configuration Files

### package.json
- **main:** "expo-router/entry"
- **Dependencies:** expo-router, expo-image-picker, expo-notifications
- **Removed:** React Navigation packages

### tsconfig.json
- **baseUrl:** "."
- **paths:** { "@/*": ["src/*"] }

### babel.config.js
- **Plugin:** module-resolver for @ alias
- **Presets:** babel-preset-expo, @babel/preset-typescript

### jest.config.ts
- **transformIgnorePatterns:** expo-router, uuid, @firebase

## JellyDM UI Components (Phase 8 - NEW)

### PR-01: Tab Navigation
- TabIcon - Tab bar icons with Ionicons
- SectionHeader - Reusable section headers

### PR-02: AI-Aware Chat
- StatusChip - RSVP status (pending/confirmed/declined/conflict)
- AssistantBubble - AI message container (purple theme)
- EventCard - Inline calendar event
- DeadlineCard - Inline task/deadline
- ConflictWarning - Scheduling conflict banner
- RSVPButtons - Accept/Decline for invites
- AIQuickActions - Bottom sheet (4 AI actions)
- useThreadStatus - Derives RSVP state from messages

### PR-03: Schedule Tab
- CalendarHeader - Week navigation
- EventListItem - Event card
- EventList - Day-grouped list
- EventDetailsSheet - Event details modal
- AddLessonModal - Natural language lesson creation
- FAB - Floating action button
- useEvents - Fetch events (MOCK DATA)

### PR-04: Tasks Tab
- ProgressRing - Simplified progress indicator
- DeadlineList - Sectioned deadlines
- DeadlineCreateModal - Task creation
- useDeadlines - Fetch deadlines (MOCK DATA)

### PR-05: Assistant Tab
- InsightCard - Dashboard widget
- InsightsGrid - Responsive grid layout
- AssistantActionRow - Quick action buttons

**See JellyDM_UI.md for complete mock/placeholder tracking**

## Accessibility
- ⚠️ Not implemented yet
- TODO: Add accessibility labels
- TODO: Test with screen readers
