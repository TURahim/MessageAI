# Frontend Map

## Screen Hierarchy

```
AppNavigator (Stack)
├── AuthScreen         [/]
├── ChatsScreen        [/chats]
├── ChatRoomScreen     [/chat/:conversationId]
└── SettingsScreen     [/settings]
```

## Components Structure

### Implemented ✅

#### `App.tsx`
- **Location:** `app/App.tsx`
- **Purpose:** Root component
- **Exports:** AppNavigator

#### `AppNavigator.tsx`
- **Location:** `app/src/app/AppNavigator.tsx`
- **Purpose:** Navigation setup
- **Stack:** React Navigation Native Stack
- **Screens:** Auth, Chats, ChatRoom, Settings

#### `AuthScreen.tsx`
- **Location:** `app/src/app/screens/AuthScreen.tsx`
- **State:** None (basic placeholder)
- **Actions:** 
  - handleLogin() - Anonymous auth
  - Navigate to Chats on success
- **TODO:** Add email/password form, profile setup

#### `ChatsScreen.tsx`
- **Location:** `app/src/app/screens/ChatsScreen.tsx`
- **State:** None (placeholder)
- **Purpose:** Conversation list
- **TODO:** 
  - Subscribe to user's conversations
  - Display last message preview
  - Show unread counts
  - Navigate to ChatRoom on tap

#### `ChatRoomScreen.tsx` ✅ COMPLETE
- **Location:** `app/src/app/screens/ChatRoomScreen.tsx`
- **State:**
  - `text` - Input value
  - `messages` - Message array
- **Props:**
  - `route.params.conversationId` (defaults to "demo-conversation-1")
- **Effects:**
  - subscribeToMessages() on mount
  - markMessagesAsRead() for others' messages
  - Unsubscribe on unmount
- **Methods:**
  - `send()` - Optimistic send with Firestore write
- **Features:**
  - Real-time sync
  - Optimistic UI
  - Message bubbles (styled by sender)
  - State indicators (sending/sent)
  - Timestamps
- **Tests:** 4/4 passing

#### `SettingsScreen.tsx`
- **Location:** `app/src/app/screens/SettingsScreen.tsx`
- **State:** None (placeholder)
- **TODO:** User settings, logout, profile edit

## Services & Hooks

### `messageService.ts` ✅
- **Location:** `app/src/lib/messageService.ts`
- **Functions:**
  - `sendMessage(cid, message)` - Write to Firestore
  - `updateMessageState(cid, mid, state)` - Update state
  - `markMessagesAsRead(cid, mids[])` - Bulk read update
  - `subscribeToMessages(cid, callback, onError)` - Real-time listener
- **Returns:** Unsubscribe function

### `firebase.ts` ✅
- **Location:** `app/src/lib/firebase.ts`
- **Exports:** auth, db, storage
- **Config:** Offline persistence enabled

### `firebaseConfig.ts` ✅
- **Location:** `app/src/lib/firebaseConfig.ts`
- **Exports:** firebaseConfig object
- **Source:** Environment variables

## Data Flow

### Message Send Flow
```
User types → ChatRoomScreen.send() 
→ Add to local state (optimistic)
→ messageService.sendMessage()
→ Firestore write
→ Update local state (sent)
```

### Message Receive Flow
```
Firestore change → onSnapshot callback
→ messageService callback
→ ChatRoomScreen setState
→ FlatList re-render
```

### Auth Flow (Current)
```
AuthScreen → signInAnonymously()
→ navigation.replace("Chats")
```

### Auth Flow (Planned)
```
AuthScreen → Email/Password form
→ createUserWithEmailAndPassword()
→ Create user doc in Firestore
→ Upload profile photo to Storage
→ navigation.replace("Chats")
```

## State Management

### Current: Component State
- Each screen manages own state with useState
- No global state yet

### Planned: Context (Phase 2)
- AuthContext - User session
- PresenceContext - Online/offline status
- NotificationContext - Foreground notifications

## Styling

### Approach: Inline StyleSheet
- No external UI library
- StyleSheet.create() for performance
- Consistent spacing/colors needed

### Theme (To Define)
- Primary: Blue (#007AFF)
- Background: Light gray (#f5f5f5)
- Text: Black/Gray
- Bubbles: Blue (mine), Gray (theirs)

## Performance

### Optimizations
- ✅ Optimistic UI (< 100ms)
- ✅ Proper useEffect cleanup
- 🚧 FlashList (installed but not used yet)
- 🚧 Message windowing (pagination)
- 🚧 Image caching

### Monitoring
- No crash reporting yet
- No analytics yet
- Manual testing only

## Testing Coverage

### Tested ✅
- ChatRoomScreen:
  - Optimistic send
  - State transitions
  - Input clearing
  - Empty validation
  - Cleanup

### Not Tested Yet
- AuthScreen
- ChatsScreen
- SettingsScreen
- AppNavigator
- messageService
- Integration tests

## Accessibility
- ⚠️ Not implemented yet
- TODO: Add accessibility labels
- TODO: Test with screen readers
- TODO: Keyboard navigation

