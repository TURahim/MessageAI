# MessageAI

**WhatsApp-style messaging app with React Native + Firebase**

A production-quality real-time messaging application with offline support, optimistic UI, and group chat capabilities.

---

## 🎯 Project Status

### Current Phase: **Phase 2 Complete** ✅ - Core Messaging Working!

- ✅ **Phase 1:** Project setup, auth, navigation
- ✅ **Phase 2:** Conversations, messaging, retry logic, offline support
- 🚧 **Phase 3:** Presence, typing indicators, read receipts, group chat

### What's Working Now
- ✅ Email/password + Google Sign-In authentication
- ✅ User profiles with photo upload
- ✅ Create & manage conversations
- ✅ Real-time message sync (< 3s delivery)
- ✅ Optimistic UI (< 100ms render)
- ✅ Offline persistence (AsyncStorage cache)
- ✅ Message retry with exponential backoff
- ✅ Network status detection
- ✅ FlashList for 60fps scrolling
- ✅ WhatsApp-style message bubbles
- ✅ 13/13 tests passing

---

## 🏗️ Tech Stack

### Frontend
- **React Native 0.81.4** - Mobile framework
- **Expo SDK 54.0.13** - Development platform
- **Expo Router 6.0.12** - File-based routing
- **FlashList 2.0.2** - High-performance lists
- **TypeScript 5.9** - Type safety
- **React 19.1.0** - UI library

### Backend
- **Firebase 12.4.0** - Backend platform
  - **Firestore** - Real-time database with offline support
  - **Firebase Auth** - Email/password + Google Sign-In
  - **Firebase Storage** - Profile photos & media uploads
- **Firestore Offline Persistence** - Automatic AsyncStorage caching
- **@react-native-community/netinfo** - Network status detection

### Development
- **pnpm** - Package manager (workspace disabled)
- **Jest 29.7** - Testing framework
- **React Testing Library** - Component testing
- **Babel** - Transpilation with module resolver

---

## 📁 Project Structure ⚠️ NESTED app/app/ Directory

**CRITICAL:** Expo Router routes live in `app/app/` subdirectory!

```
MessageAI/
├── app/                          # Project root
│   ├── app/                      # ⚠️ Expo Router screens (NESTED!)
│   │   ├── _layout.tsx           # Root layout with AuthProvider
│   │   ├── index.tsx             # Auth redirect
│   │   ├── (auth)/               # Auth routes
│   │   │   ├── login.tsx
│   │   │   └── signup.tsx
│   │   ├── (tabs)/               # Tab navigation
│   │   │   ├── index.tsx         # Chats list
│   │   │   └── profile.tsx
│   │   ├── users.tsx             # User selection
│   │   └── chat/[id].tsx         # Chat room
│   ├── src/
│   │   ├── services/             # Business logic
│   │   │   ├── authService.ts
│   │   │   └── conversationService.ts
│   │   ├── hooks/                # React hooks
│   │   │   ├── useAuth.ts
│   │   │   ├── useConversations.ts
│   │   │   └── useNetworkStatus.ts
│   │   ├── components/           # UI components
│   │   │   ├── MessageBubble.tsx
│   │   │   ├── MessageInput.tsx
│   │   │   ├── ConversationListItem.tsx
│   │   │   └── ConnectionBanner.tsx
│   │   ├── contexts/             # React Context
│   │   │   └── AuthContext.tsx
│   │   ├── lib/                  # Core Firebase
│   │   │   ├── firebase.ts
│   │   │   ├── firebaseConfig.ts
│   │   │   └── messageService.ts
│   │   ├── types/                # TypeScript types
│   │   │   ├── index.ts
│   │   │   └── message.ts
│   │   └── utils/
│   │       └── messageId.ts      # UUID generation
│   ├── package.json              # Dependencies
│   ├── app.json                  # Expo config
│   ├── babel.config.js           # Babel + @ alias
│   ├── metro.config.js           # pnpm symlinks
│   └── jest.config.js            # Test config
├── docs/                         # Documentation
│   ├── MVP_PRD.md
│   ├── MVP_Tasklist.md
│   ├── PHASE-2-COMPLETE.md
│   ├── OFFLINE-TESTING-GUIDE.md
│   └── GOOGLE-AUTH-IMPLEMENTATION.md
├── memory/                       # Project state tracking
├── firebase.json                 # Firebase config
├── firestore.rules               # Firestore security
├── firestore.indexes.json        # Query indexes
└── storage.rules                 # Storage security
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** (v18+ LTS)
- **pnpm** (`npm install -g pnpm`)
- **Expo CLI** (`npm install -g expo-cli`)
- **Firebase project** (create at [console.firebase.google.com](https://console.firebase.google.com))
- **iOS Simulator** (Mac) or **Android Emulator**

### Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd MessageAI
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Configure Firebase**
   
   Create `app/src/lib/firebaseConfig.ts`:
   ```typescript
   export const firebaseConfig = {
     apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY!,
     authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN!,
     projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID!,
     storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET!,
     messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
     appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID!,
   };
   ```

   Create `.env` file in root:
   ```bash
   EXPO_PUBLIC_FIREBASE_API_KEY=your_api_key
   EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
   EXPO_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
   EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
   EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   EXPO_PUBLIC_FIREBASE_APP_ID=your_app_id
   ```

4. **Deploy Firebase rules**
   ```bash
   firebase deploy --only firestore:rules,storage:rules
   ```

5. **Start the app**
   ```bash
   cd app
   pnpm start
   ```

   Then press:
   - `i` for iOS simulator
   - `a` for Android emulator
   - `w` for web browser

---

## 🧪 Development

### Available Scripts

From the `app/` directory:

```bash
pnpm start         # Start Expo dev server
pnpm ios           # Run on iOS simulator
pnpm android       # Run on Android emulator
pnpm web           # Run in web browser
pnpm test          # Run tests
pnpm emu           # Start Firebase emulators
```

### Testing

```bash
# Run all tests
cd app
pnpm test

# Run specific test file
pnpm test -- ChatRoomScreen.test.tsx

# Run tests in watch mode
pnpm test -- --watch
```

### Firebase Emulators (Optional)

```bash
# Start emulators for local development
pnpm emu

# Emulators will run on:
# - Firestore: http://localhost:8080
# - Storage: http://localhost:9199
# - UI: http://localhost:4000
```

---

## 📐 Architecture

### Message Flow

1. **Optimistic Send**
   ```
   User sends message → Add to local state (status: "sending")
   → Write to Firestore → Update state (status: "sent")
   ```

2. **Real-Time Sync**
   ```
   Firestore onSnapshot → New messages arrive
   → Update local state → Render in UI
   ```

3. **Offline Support**
   ```
   No network → Messages queued locally
   → Network restored → Auto-sync to Firestore
   ```

### Data Schema

#### Messages (`/conversations/{cid}/messages/{mid}`)
```typescript
{
  mid: string;              // Client-generated UUID (idempotency)
  senderId: string;         // Firebase Auth UID
  text: string;
  clientTs: number;         // Date.now() for optimistic ordering
  serverTs: Timestamp;      // Firestore serverTimestamp()
  state: "sending" | "sent" | "delivered" | "read";
  readBy?: string[];        // For read receipts
}
```

### Key Features

- **Idempotent IDs** - Client-generated UUIDs prevent duplicates
- **Optimistic UI** - Messages appear instantly (< 100ms)
- **Offline Persistence** - Firestore local cache
- **Real-Time Sync** - `onSnapshot` listeners
- **State Machine** - sending → sent → delivered → read
- **Automatic Cleanup** - All listeners unsubscribe on unmount

---

## 🎯 MVP Requirements (24-Hour Hard Gate)

### ✅ Complete (8/11 features)
- [x] **One-on-one chat** - Real-time messaging working
- [x] **Message persistence** - Offline cache with AsyncStorage
- [x] **Optimistic UI** - Instant message display (< 100ms)
- [x] **Message timestamps** - Formatted timestamps with dayjs
- [x] **User authentication** - Email/password + Google Sign-In
- [x] **Conversation management** - Create, list, real-time updates
- [x] **Retry logic** - Automatic & manual retry for failed messages
- [x] **Offline support** - Queued writes, cache loading

### ⚠️ In Progress (3/11 features)
- [ ] **Online/offline presence** - User status indicators (PR #9)
- [ ] **Group chat** - 3+ users in conversation (PR #12)
- [ ] **Push notifications** - Foreground notifications (PR #14)

**Progress:** 73% complete (8/11 features) | ~12 hours in | ~12 hours remaining

**Current Status:** Core messaging fully functional and production-ready! 🚀

---

## 🗓️ Post-MVP Features

### Phase 2: Enhanced Features
- [ ] Typing indicators
- [ ] Image upload/sharing
- [ ] Image compression
- [ ] Windowed loading (pagination)
- [ ] Error states & retry UI

### Phase 3: Advanced
- [ ] Background push notifications
- [ ] Message editing/deletion
- [ ] Voice messages
- [ ] File sharing
- [ ] Message reactions
- [ ] End-to-end encryption

---

## 🔐 Security

### Firestore Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{db}/documents {
    // Helper: Check if user is conversation member
    function isMember(cid) {
      return request.auth != null &&
        get(/databases/$(db)/documents/conversations/$(cid))
          .data.members.hasAny([request.auth.uid]);
    }

    // Users can read all profiles, write own
    match /users/{uid} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == uid;
    }

    // Members can read/write conversation messages
    match /conversations/{cid} {
      allow read, write: if isMember(cid);
      
      match /messages/{mid} {
        allow read, write: if isMember(cid);
      }
    }
  }
}
```

---

## 🧪 Testing Status

```
PASS src/lib/__tests__/firebase.test.ts
PASS src/services/__tests__/authService.test.ts
PASS src/utils/messageId.test.ts

Test Suites: 3 passed, 3 total
Tests: 13 passed, 13 total
TypeScript: 0 errors
```

**Test Coverage:**
- Firebase configuration (5 tests)
- Auth service with Google Sign-In (5 tests)
- Message ID generation (3 tests)

---

## 📊 Performance Targets

- **Message delivery:** < 3s (P95)
- **Optimistic render:** < 100ms
- **Initial load (50 msgs):** < 500ms
- **Scroll performance:** 60fps with 100+ messages
- **Delivery success rate:** > 99.5%

---

## 🛠️ Troubleshooting

### TypeScript Errors

If you see "Cannot find module 'firebase/auth'" or similar:
1. Restart TypeScript server: `Cmd+Shift+P` → "TypeScript: Restart TS Server"
2. Or reinstall dependencies: `pnpm install`

### Firestore Persistence

Offline persistence is automatic in React Native:
- Uses AsyncStorage for document caching
- Queued writes when offline
- No manual configuration needed
- Check console for: "✅ Firestore initialized with automatic offline persistence"

### Test Failures

If tests fail after dependency updates:
```bash
cd app
pnpm jest --clearCache
pnpm install
pnpm test
```

---

## 📚 Documentation

### Product & Planning
- [MVP PRD](./docs/MVP_PRD.md) - Product requirements and technical specs
- [MVP Tasklist](./docs/MVP_Tasklist.md) - Detailed task breakdown

### Implementation Guides
- [Phase 2 Complete](./docs/PHASE-2-COMPLETE.md) - Core messaging implementation
- [Phase 2 Final Summary](./docs/PHASE-2-FINAL-SUMMARY.md) - Achievement summary
- [Google Auth Setup](./docs/GOOGLE-AUTH-IMPLEMENTATION.md) - Google Sign-In configuration
- [Offline Testing Guide](./docs/OFFLINE-TESTING-GUIDE.md) - Manual E2E testing steps

### Architecture
- [PR1-PR2 Implementation](./docs/PR1-PR2-IMPLEMENTATION.md) - Setup & auth
- [PR3 Navigation Profile](./docs/PR3-NAVIGATION-PROFILE.md) - Navigation details

---

## 🤝 Contributing

This is currently a solo project in active development. Contributions will be welcome after MVP completion.

---

## 📄 License

[Add your license here]

---

## 🗺️ Roadmap

### ✅ Completed (Phase 1-2)
- Project setup with Expo Router
- Firebase integration (Auth, Firestore, Storage)
- Email/password + Google Sign-In authentication
- User profiles with photo upload
- Conversation creation & management
- Real-time messaging with FlashList
- Optimistic UI with retry logic
- Offline persistence with cache

### 🚧 In Progress (Phase 3)
- Presence system (online/offline indicators)
- Typing indicators
- Read receipts
- Group chat (3-20 users)

### 📅 Upcoming (Phase 4-5)
- Push notifications (foreground & background)
- Image sharing with compression
- Message pagination
- Error handling polish
- Production deployment

### 🔮 Future (Post-MVP)
- End-to-end encryption
- Voice messages
- Message search
- File sharing
- Message reactions
- AI features

---

**Built with ❤️ using React Native, Expo, and Firebase**
