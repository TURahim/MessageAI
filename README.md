# MessageAI

**WhatsApp-style messaging app with React Native + Firebase**

A production-quality real-time messaging application with offline support, optimistic UI, and group chat capabilities.

---

## 🎯 Project Status

### Current Phase: **Scaffolding Complete (Step H)** ✅

- ✅ **Step A-G:** Project setup, navigation, and screens
- ✅ **Step H:** Real-time Firestore messaging with optimistic send
- 🚧 **Next:** User authentication, presence system, and group chat

### What's Working Now
- ✅ Real-time message sync with Firestore
- ✅ Optimistic UI (messages appear instantly)
- ✅ Offline persistence (messages persist across app restarts)
- ✅ Idempotent message IDs (no duplicates on retry)
- ✅ Message state transitions (sending → sent → delivered → read)
- ✅ Comprehensive testing (Jest + React Testing Library)

---

## 🏗️ Tech Stack

### Frontend
- **React Native 0.81.4** - Mobile framework
- **Expo 54** - Development platform
- **React Navigation 7** - Navigation library
- **FlashList** - High-performance lists
- **TypeScript 5.9** - Type safety

### Backend
- **Firebase 12.4.0** - Backend platform
  - **Firestore** - Real-time database with offline support
  - **Firebase Auth** - Authentication (anonymous for MVP)
  - **Firebase Storage** - Media uploads
- **Firestore Offline Persistence** - Local caching

### Development
- **pnpm** - Package manager (monorepo)
- **Jest 30** - Testing framework
- **React Testing Library** - Component testing
- **Babel** - Transpilation

---

## 📁 Project Structure

```
MessageAI/
├── app/                          # React Native mobile app
│   ├── src/
│   │   ├── app/
│   │   │   ├── AppNavigator.tsx       # Navigation setup
│   │   │   └── screens/               # App screens
│   │   │       ├── AuthScreen.tsx
│   │   │       ├── ChatsScreen.tsx
│   │   │       ├── ChatRoomScreen.tsx # Real-time messaging
│   │   │       └── SettingsScreen.tsx
│   │   ├── lib/
│   │   │   ├── firebase.ts            # Firebase init + persistence
│   │   │   ├── firebaseConfig.ts      # Firebase credentials
│   │   │   └── messageService.ts      # Message CRUD operations
│   │   ├── types/
│   │   │   └── message.ts             # TypeScript interfaces
│   │   └── utils/
│   │       └── messageId.ts           # UUID generation
│   ├── assets/                        # Images and icons
│   ├── ios/                           # iOS native code
│   ├── android/                       # Android native code
│   └── __tests__/                     # Test files
├── docs/
│   ├── MVP_PRD.md                     # Product requirements
│   ├── MVP_Tasklist.md                # Development tasks
│   └── Scaffold/
│       ├── Steps.md                   # Scaffolding guide
│       └── Step-H-Complete.md         # Completion summary
├── firebase.json                      # Firebase config
├── firestore.rules                    # Firestore security rules
├── storage.rules                      # Storage security rules
├── pnpm-workspace.yaml                # Monorepo config
└── package.json                       # Root dependencies
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

## 🎯 MVP Features (Planned)

### Phase 1: Core Messaging ✅ (Current)
- [x] Real-time text messaging
- [x] Optimistic UI
- [x] Offline support
- [x] Message persistence
- [x] Idempotent sends

### Phase 2: User Features (Next)
- [ ] User authentication (email/password)
- [ ] User profiles (name, photo)
- [ ] Presence indicators (online/offline)
- [ ] Typing indicators
- [ ] Read receipts

### Phase 3: Group Chat
- [ ] Create group conversations
- [ ] Add/remove members
- [ ] Group messaging
- [ ] Group read receipts

### Phase 4: Media & Polish
- [ ] Image upload/sharing
- [ ] Image compression
- [ ] Message timestamps
- [ ] Windowed loading (pagination)
- [ ] Error states & retry UI

### Phase 5: Notifications
- [ ] Foreground notifications
- [ ] Notification suppression
- [ ] Background notifications (post-MVP)

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
PASS src/app/screens/ChatRoomScreen.test.tsx
  ChatRoomScreen - Optimistic Send
    ✓ should show message immediately (optimistic) and update to sent
    ✓ should clear input after sending
    ✓ should not send empty messages
    ✓ should unsubscribe on unmount

Test Suites: 1 passed, 1 total
Tests: 4 passed, 4 total
```

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

If offline persistence isn't working:
- Check that `initializeFirestore` is used (not `getFirestore`)
- Verify `persistentLocalCache` is configured in `firebase.ts`

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

- [MVP PRD](./docs/MVP_PRD.md) - Product requirements and technical specs
- [Scaffolding Steps](./docs/Scaffold/Steps.md) - Development guide
- [Step H Complete](./docs/Scaffold/Step-H-Complete.md) - Current milestone summary

---

## 🤝 Contributing

This is currently a solo project in active development. Contributions will be welcome after MVP completion.

---

## 📄 License

[Add your license here]

---

## 🗺️ Roadmap

### Immediate (Week 1)
- Complete user authentication
- Implement presence system
- Build group chat functionality

### Near-term (Week 2-3)
- Add image sharing
- Implement typing indicators
- Polish UI/UX

### Future (Post-MVP)
- End-to-end encryption
- Voice messages
- Background notifications
- Message search
- AI features (phase 2)

---

**Built with ❤️ using React Native, Expo, and Firebase**
