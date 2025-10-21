# MessageAI MVP - Task Checklist (Production-Ready)

## Project Structure ⚠️ CRITICAL: Nested app/app/ Directory

**IMPORTANT:** All Expo Router routes MUST live in `app/app/` subdirectory!

```
MessageAI/
├── app/                          # Project root
│   ├── app/                      # ⚠️ Expo Router screens (NESTED!)
│   │   ├── _layout.tsx           # Root layout with AuthProvider
│   │   ├── index.tsx             # Entry point with auth redirect
│   │   ├── (auth)/               # Auth routes
│   │   │   ├── _layout.tsx
│   │   │   ├── login.tsx
│   │   │   └── signup.tsx
│   │   ├── (tabs)/               # Tab routes
│   │   │   ├── _layout.tsx
│   │   │   ├── index.tsx         # Chats list
│   │   │   └── profile.tsx
│   │   └── chat/
│   │       └── [id].tsx          # Dynamic chat route
│   ├── src/
│   │   ├── lib/
│   │   │   ├── firebase.ts       # ✅ EXISTS
│   │   │   ├── firebaseConfig.ts # ✅ EXISTS
│   │   │   └── messageService.ts # ✅ EXISTS
│   │   ├── services/             # Business logic
│   │   │   └── authService.ts    # ✅ EXISTS
│   │   ├── hooks/                # Custom React hooks
│   │   │   └── useAuth.ts        # ✅ EXISTS
│   │   ├── contexts/
│   │   │   └── AuthContext.tsx   # ✅ EXISTS
│   │   ├── components/           # UI components (TODO)
│   │   ├── utils/
│   │   │   └── messageId.ts      # ✅ EXISTS
│   │   └── types/
│   │       ├── index.ts          # ✅ EXISTS
│   │       └── message.ts        # ✅ EXISTS
│   ├── __tests__/                # Test files (TODO: expand)
│   │   ├── setup.ts              # TODO: Emulator setup
│   │   ├── services/
│   │   │   └── authService.test.ts # ✅ EXISTS (5 tests)
│   │   ├── lib/
│   │   │   └── firebase.test.ts  # ✅ EXISTS (5 tests)
│   │   ├── utils/
│   │   │   └── messageId.test.ts # ✅ EXISTS (3 tests)
│   │   ├── rules/                # TODO: Security rules tests
│   │   │   ├── firestore.rules.test.ts
│   │   │   └── storage.rules.test.ts
│   │   └── integration/          # TODO: Integration tests
│   │       └── messaging.test.ts
│   ├── package.json              # "main": "expo-router/entry"
│   ├── app.json                  # Expo config
│   ├── babel.config.js           # ✅ EXISTS
│   ├── jest.config.js            # ✅ EXISTS
│   └── metro.config.js           # ✅ EXISTS
├── .github/
│   └── workflows/
│       └── ci.yml                # TODO: GitHub Actions CI
├── firebase.json                 # ✅ EXISTS
├── firestore.rules               # ✅ EXISTS
├── firestore.indexes.json        # ✅ EXISTS
├── storage.rules                 # ✅ EXISTS
└── README.md                     # ✅ EXISTS
```

**Current Status:** 13/13 tests passing, Expo Router working with nested structure

---

## Phase 0: Test Infrastructure (1-2 hours)

### ☐ PR #0: Test Harness + CI Setup
**Branch:** `setup/test-infrastructure`

**Goal:** Establish testing foundation with emulator, rules testing, and CI

#### Subtasks:
- [ ] **0.1** Install test dependencies
  - Files: `package.json`
  - Add: `jest`, `@testing-library/react-native`, `@testing-library/jest-native`, `@firebase/rules-unit-testing`, `ts-jest`
  - Command: `npm install --save-dev jest @testing-library/react-native @testing-library/jest-native @firebase/rules-unit-testing ts-jest`

- [ ] **0.2** Create Jest configuration
  - Create: `jest.config.js`
  ```javascript
  module.exports = {
    preset: 'jest-expo',
    setupFilesAfterEnv: ['<rootDir>/__tests__/setup.ts'],
    transformIgnorePatterns: [
      'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg)'
    ],
    testEnvironment: 'node',
    moduleNameMapper: {
      '^@/(.*)$': '<rootDir>/src/$1'
    }
  };
  ```

- [ ] **0.3** Create test setup with Firebase Emulator
  - Create: `__tests__/setup.ts`
  ```typescript
  import { initializeTestEnvironment } from '@firebase/rules-unit-testing';
  
  let testEnv: any;
  
  beforeAll(async () => {
    testEnv = await initializeTestEnvironment({
      projectId: 'messageai-test',
      firestore: { host: 'localhost', port: 8080 },
      storage: { host: 'localhost', port: 9199 }
    });
  });
  
  afterAll(async () => {
    await testEnv.cleanup();
  });
  
  afterEach(async () => {
    await testEnv.clearFirestore();
    await testEnv.clearStorage();
  });
  
  export { testEnv };
  ```

- [ ] **0.4** Create emulator configuration
  - Create: `src/config/firebaseEmulator.ts`
  ```typescript
  import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
  import { getAuth, connectAuthEmulator } from 'firebase/auth';
  import { getStorage, connectStorageEmulator } from 'firebase/storage';
  
  export function useEmulator(app: FirebaseApp) {
    if (__DEV__ && process.env.USE_EMULATOR === 'true') {
      const db = getFirestore(app);
      const auth = getAuth(app);
      const storage = getStorage(app);
      
      connectFirestoreEmulator(db, 'localhost', 8080);
      connectAuthEmulator(auth, 'http://localhost:9099');
      connectStorageEmulator(storage, 'localhost', 9199);
    }
  }
  ```

- [ ] **0.5** Write sample smoke test
  - Create: `__tests__/sample.test.ts`
  ```typescript
  describe('Test Infrastructure', () => {
    it('should run tests', () => {
      expect(true).toBe(true);
    });
  });
  ```

- [ ] **0.6** Create Firestore rules tests
  - Create: `__tests__/rules/firestore.rules.test.ts`
  ```typescript
  import { testEnv } from '../setup';
  
  describe('Firestore Security Rules', () => {
    it('should deny unauthenticated reads', async () => {
      const unauthedDb = testEnv.unauthenticatedContext().firestore();
      await expect(unauthedDb.collection('users').get())
        .toDeny();
    });
    
    it('should allow users to read their own profile', async () => {
      const alice = testEnv.authenticatedContext('alice').firestore();
      await expect(alice.doc('users/alice').get())
        .toAllow();
    });
    
    it('should deny reading conversations user is not part of', async () => {
      const alice = testEnv.authenticatedContext('alice').firestore();
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await context.firestore().doc('conversations/conv123').set({
          participants: ['bob', 'charlie']
        });
      });
      
      await expect(alice.doc('conversations/conv123').get())
        .toDeny();
    });
    
    it('should allow reading conversations user is part of', async () => {
      const alice = testEnv.authenticatedContext('alice').firestore();
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await context.firestore().doc('conversations/conv123').set({
          participants: ['alice', 'bob']
        });
      });
      
      await expect(alice.doc('conversations/conv123').get())
        .toAllow();
    });
  });
  ```

- [ ] **0.7** Create Storage rules tests
  - Create: `__tests__/rules/storage.rules.test.ts`
  ```typescript
  import { testEnv } from '../setup';
  
  describe('Storage Security Rules', () => {
    it('should deny unauthenticated uploads', async () => {
      const unauthedStorage = testEnv.unauthenticatedContext().storage();
      await expect(unauthedStorage.ref('messages/conv123/msg456.jpg').put(Buffer.from('test')))
        .toDeny();
    });
    
    it('should allow uploads to own message paths', async () => {
      const alice = testEnv.authenticatedContext('alice').storage();
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await context.firestore().doc('conversations/conv123').set({
          participants: ['alice', 'bob']
        });
        await context.firestore().doc('conversations/conv123/messages/msg456').set({
          senderId: 'alice'
        });
      });
      
      await expect(alice.ref('messages/conv123/msg456.jpg').put(Buffer.from('test')))
        .toAllow();
    });
  });
  ```

- [ ] **0.8** Create GitHub Actions CI workflow
  - Create: `.github/workflows/ci.yml`
  ```yaml
  name: CI
  
  on:
    pull_request:
      branches: [main]
    push:
      branches: [main]
  
  jobs:
    test:
      runs-on: ubuntu-latest
      
      steps:
        - uses: actions/checkout@v3
        
        - name: Setup Node.js
          uses: actions/setup-node@v3
          with:
            node-version: '18'
            cache: 'npm'
        
        - name: Install dependencies
          run: npm ci
        
        - name: Install Firebase Tools
          run: npm install -g firebase-tools
        
        - name: Start Firebase Emulators
          run: firebase emulators:start --only firestore,storage,auth --project messageai-test &
          
        - name: Wait for Emulators
          run: sleep 10
        
        - name: Run tests
          run: npm test -- --coverage
        
        - name: Upload coverage
          uses: codecov/codecov-action@v3
          with:
            files: ./coverage/lcov.info
  ```

- [ ] **0.9** Update firebase.json for emulators
  - Update: `firebase.json`
  ```json
  {
    "firestore": {
      "rules": "firestore.rules",
      "indexes": "firestore.indexes.json"
    },
    "storage": {
      "rules": "storage.rules"
    },
    "emulators": {
      "auth": { "port": 9099 },
      "firestore": { "port": 8080 },
      "storage": { "port": 9199 },
      "ui": { "enabled": true, "port": 4000 }
    }
  }
  ```

- [ ] **0.10** Update package.json scripts
  - Update: `package.json`
  ```json
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "emulators": "firebase emulators:start",
    "test:emulator": "USE_EMULATOR=true npm test"
  }
  ```

- [ ] **0.11** Test the test infrastructure
  - Run: `npm test` (sample test should pass)
  - Run: `firebase emulators:start` in separate terminal
  - Run: `npm run test:emulator` (rules tests should pass)

**Verification Test:**
```bash
# All tests pass
npm test

# Emulator tests pass
firebase emulators:start &
npm run test:emulator
```

**Commit:** `feat: add test infrastructure with emulator, rules tests, and CI`

---

## Phase 1: Foundation (3-4 hours)

### ✅ PR #1: Project Setup + Firebase
**Branch:** `setup/project-init`

- [x] 1.1 Init Expo with TypeScript: `npx create-expo-app messageai --template` ✅
- [x] 1.2 Install deps: `firebase`, `@shopify/flash-list`, `uuid`, `expo-router`, `expo-image-picker`, `expo-notifications` ✅
- [x] 1.3 Create folder structure ✅
- [x] 1.4 Firebase Console: Create project, enable Firestore/Auth/Storage ✅
- [x] 1.5 Create `src/lib/firebase.ts` with initialization + offline persistence ✅
- [x] 1.6 Integrate emulator config: Update `firebase.ts` to call `useEmulator(app)` in dev (TODO later)
- [x] 1.7 Create `firestore.rules`, `storage.rules`, `firestore.indexes.json` ✅
- [x] 1.8 Deploy: `firebase deploy --only firestore:rules,storage:rules,firestore:indexes` ✅
- [x] 1.9 Create `src/types/index.ts` with User, Conversation, Message interfaces ✅
- [x] 1.10 Test Firebase connection (run `npx expo start`) ✅

**Smoke Test:**
```typescript
// __tests__/config/firebase.test.ts
import { app } from '@/config/firebase';
import { getFirestore } from 'firebase/firestore';

describe('Firebase Configuration', () => {
  it('should initialize Firebase app', () => {
    expect(app).toBeDefined();
    expect(app.name).toBe('[DEFAULT]');
  });
  
  it('should initialize Firestore with offline persistence', () => {
    const db = getFirestore(app);
    expect(db).toBeDefined();
  });
});
```

**Commit:** `feat: initialize project with Firebase and test infrastructure`

---

### ✅ PR #2: Authentication
**Branch:** `feature/authentication`

- [x] 2.1 Create `src/contexts/AuthContext.tsx` ✅
- [x] 2.2 Create `src/services/authService.ts` ✅
- [x] 2.3 Create `src/hooks/useAuth.ts` ✅
- [x] 2.4 Create `app/app/(auth)/login.tsx` ✅
- [x] 2.5 Create `app/app/(auth)/signup.tsx` ✅
- [x] 2.6 Update authService: Create `/users/{uid}` doc on signup ✅
- [x] 2.7 Create `app/app/_layout.tsx` with auth routing ✅
- [ ] 2.8 Manual test: Signup → profile created, login works, logout redirects
- [x] 2.9 Add Google Sign-In option ✅ (NEW)

**Unit Test:**
```typescript
// __tests__/services/authService.test.ts
import { testEnv } from '../setup';
import { signUpWithEmail, signInWithEmail } from '@/services/authService';

describe('authService', () => {
  beforeEach(async () => {
    await testEnv.clearFirestore();
  });

  it('should create user profile on signup', async () => {
    const context = testEnv.authenticatedContext('alice');
    const user = await signUpWithEmail('alice@test.com', 'password', 'Alice');
    
    const userDoc = await context.firestore().doc('users/alice').get();
    expect(userDoc.exists).toBe(true);
    expect(userDoc.data().displayName).toBe('Alice');
    expect(userDoc.data().presence).toBeDefined();
  });
  
  it('should throw error for invalid credentials', async () => {
    await expect(signInWithEmail('wrong@test.com', 'wrong'))
      .rejects.toThrow();
  });
});
```

**Commit:** `feat: implement authentication with unit tests`

---

### ✅ PR #3: Navigation + Profile
**Branch:** `feature/navigation-profile`

- [x] 3.1 Create `app/(tabs)/_layout.tsx` ✅
- [x] 3.2 Create `app/(tabs)/index.tsx` (conversation list with empty state) ✅
- [x] 3.3 Create `app/(tabs)/profile.tsx` ✅
- [x] 3.4 Add profile edit functionality ✅
- [x] 3.5 Add image picker for profile photo ✅
- [x] 3.6 Create `app/users.tsx` ✅
- [ ] 3.7 Manual test: Navigate tabs, edit profile, sign out

**RTL Smoke Test:**
```typescript
// __tests__/screens/profile.test.tsx
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import ProfileScreen from '@/app/(tabs)/profile';

describe('ProfileScreen', () => {
  it('should render user profile', () => {
    const { getByText, getByTestId } = render(<ProfileScreen />);
    expect(getByText('Profile')).toBeTruthy();
    expect(getByTestId('sign-out-button')).toBeTruthy();
  });
  
  it('should call sign out on button press', async () => {
    const mockSignOut = jest.fn();
    const { getByTestId } = render(<ProfileScreen signOut={mockSignOut} />);
    
    fireEvent.press(getByTestId('sign-out-button'));
    await waitFor(() => expect(mockSignOut).toHaveBeenCalled());
  });
});
```

**Commit:** `feat: add navigation and profile with RTL tests`

---

## Phase 2: Core Messaging (7-8 hours)

### ✅ PR #4: Conversation Creation
**Branch:** `feature/conversation-creation`

- [x] 4.1 Create `src/services/conversationService.ts` ✅
- [x] 4.2 Create `src/hooks/useConversations.ts` ✅
- [x] 4.3 Create `src/components/ConversationListItem.tsx` ✅
- [x] 4.4 Update `app/app/(tabs)/index.tsx` with FlatList ✅
- [x] 4.5 Update `app/app/users.tsx`: tap user → create conversation ✅
- [ ] 4.6 Manual test: Create conversation, appears in list

**Integration Test:**
```typescript
// __tests__/integration/conversation.test.ts
import { testEnv } from '../setup';
import { createDirectConversation } from '@/services/conversationService';

describe('Conversation Creation', () => {
  beforeEach(async () => {
    await testEnv.clearFirestore();
  });

  it('should create direct conversation between two users', async () => {
    const alice = testEnv.authenticatedContext('alice');
    const conversationId = await createDirectConversation('alice', 'bob');
    
    const convDoc = await alice.firestore().doc(`conversations/${conversationId}`).get();
    expect(convDoc.exists).toBe(true);
    expect(convDoc.data().participants).toEqual(expect.arrayContaining(['alice', 'bob']));
    expect(convDoc.data().type).toBe('direct');
  });
  
  it('should prevent duplicate conversations', async () => {
    const id1 = await createDirectConversation('alice', 'bob');
    const id2 = await createDirectConversation('bob', 'alice'); // Reverse order
    expect(id1).toBe(id2); // Should return same conversation
  });
});
```

**Commit:** `feat: implement conversation creation with integration tests`

---

### ✅ PR #5: Send Message + Optimistic UI
**Branch:** `feature/send-message`

- [x] 5.1 Create `src/utils/messageId.ts` (UUID generation) ✅ (Already existed)
- [x] 5.2 Create `src/services/messageService.ts` (sendMessage) ✅ (Already existed)
- [x] 5.3 Create `src/hooks/useSendMessage.ts` ✅ (Integrated in chat screen)
- [x] 5.4 Create `src/components/MessageBubble.tsx` ✅
- [x] 5.5 Create `src/components/MessageInput.tsx` ✅
- [x] 5.6 Create `app/app/chat/[id].tsx` ✅ (Already existed, updated)
- [x] 5.7 Manual test: Send message, appears instantly, status updates

**Unit Test:**
```typescript
// __tests__/utils/messageId.test.ts
import { generateMessageId } from '@/utils/messageId';

describe('messageId', () => {
  it('should generate valid UUID v4', () => {
    const id = generateMessageId();
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
  });
  
  it('should generate unique IDs', () => {
    const ids = new Set([...Array(100)].map(() => generateMessageId()));
    expect(ids.size).toBe(100);
  });
});
```

**Commit:** `feat: implement message sending with optimistic UI and tests`

---

### ✅ PR #6: Real-Time Listener + FlashList
**Branch:** `feature/realtime-messages`

- [x] 6.1 Create `src/hooks/useMessages.ts` (onSnapshot, cleanup, sorting) ✅ (Integrated in chat screen)
- [x] 6.2 Update `app/app/chat/[id].tsx` with FlashList ✅ (Migrated from FlatList)
- [x] 6.3 Implement timestamp reconciliation (serverTs > clientTs) ✅ (Already in messageService)
- [x] 6.4 Update messageService: Update conversation.lastMessage ✅
- [x] 6.5 Manual test: Two devices, A sends → B receives < 3s ✅ (Working)

**Integration Test with Emulator:**
```typescript
// __tests__/integration/messaging.test.ts
import { testEnv } from '../setup';
import { sendMessage } from '@/services/messageService';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';

describe('Real-time Messaging', () => {
  beforeEach(async () => {
    await testEnv.clearFirestore();
    
    // Seed: Create conversation
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await context.firestore().doc('conversations/conv123').set({
        type: 'direct',
        participants: ['alice', 'bob'],
        createdAt: new Date()
      });
    });
  });

  it('should deliver message in real-time', async () => {
    const alice = testEnv.authenticatedContext('alice');
    const messageId = await sendMessage('conv123', 'Hello', 'alice', 'Alice');
    
    await new Promise(resolve => setTimeout(resolve, 500)); // Wait for write
    
    const messagesRef = alice.firestore().collection('conversations/conv123/messages');
    const snapshot = await messagesRef.get();
    
    expect(snapshot.size).toBe(1);
    expect(snapshot.docs[0].id).toBe(messageId);
    expect(snapshot.docs[0].data().text).toBe('Hello');
    expect(snapshot.docs[0].data().serverTimestamp).toBeDefined();
  });
  
  it('should order messages by serverTimestamp', async () => {
    const alice = testEnv.authenticatedContext('alice');
    
    // Send 3 messages rapidly
    await sendMessage('conv123', 'Message 1', 'alice', 'Alice');
    await sendMessage('conv123', 'Message 2', 'alice', 'Alice');
    await sendMessage('conv123', 'Message 3', 'alice', 'Alice');
    
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const q = query(
      alice.firestore().collection('conversations/conv123/messages'),
      orderBy('serverTimestamp', 'asc')
    );
    const snapshot = await q.get();
    
    const texts = snapshot.docs.map(doc => doc.data().text);
    expect(texts).toEqual(['Message 1', 'Message 2', 'Message 3']);
  });
});
```

**Invariant Test for Timestamp Reconciliation:**
```typescript
// __tests__/hooks/useMessages.test.ts
import { sortMessages } from '@/hooks/useMessages';

describe('useMessages timestamp reconciliation', () => {
  it('should prefer serverTimestamp over clientTimestamp', () => {
    const messages = [
      { id: '1', text: 'A', clientTimestamp: { toMillis: () => 1000 }, serverTimestamp: { toMillis: () => 900 } },
      { id: '2', text: 'B', clientTimestamp: { toMillis: () => 800 }, serverTimestamp: null }
    ];
    
    const sorted = sortMessages(messages);
    expect(sorted[0].text).toBe('B'); // 800 (client) comes before 900 (server)
    expect(sorted[1].text).toBe('A');
  });
  
  it('should maintain order when serverTimestamp arrives late', () => {
    const optimistic = { id: '1', clientTimestamp: { toMillis: () => 1000 }, serverTimestamp: null };
    const withServer = { id: '1', clientTimestamp: { toMillis: () => 1000 }, serverTimestamp: { toMillis: () => 950 } };
    
    // Simulate optimistic render, then server ack
    const initial = sortMessages([optimistic]);
    const afterAck = sortMessages([withServer]);
    
    expect(initial[0].id).toBe('1');
    expect(afterAck[0].id).toBe('1');
    // Position may shift but message doesn't disappear
  });
});
```

**Commit:** `feat: add real-time messaging with FlashList and timestamp reconciliation tests`

---

### ✅ PR #7: Retry Logic + Failed State
**Branch:** `feature/message-retry`

- [x] 7.1 Update `src/services/messageService.ts` with sendMessageWithRetry ✅
  - **CRITICAL:** Stop retry immediately on server ack of same `mid` ✅
  - Implementation: Check if doc exists before retry ✅
  - Exponential backoff: 1s, 2s, 4s ✅
- [x] 7.2 Update chat screen for failed state ✅ (Integrated in chat/[id].tsx)
- [x] 7.3 Update `src/components/MessageBubble.tsx` with retry button ✅
- [x] 7.4 Add network error detection ✅ (useNetworkStatus hook + offline banner)
- [ ] 7.5 Manual test: Offline → send → retries, online → success

**Unit Test with Retry Stop:**
```typescript
// __tests__/services/messageService.test.ts
import { testEnv } from '../setup';
import { sendMessageWithRetry } from '@/services/messageService';
import { doc, setDoc } from 'firebase/firestore';

describe('messageService retry logic', () => {
  beforeEach(async () => {
    await testEnv.clearFirestore();
  });

  it('should stop retrying when server ack received', async () => {
    const alice = testEnv.authenticatedContext('alice');
    const messageId = 'msg-123';
    
    // Simulate: Message already processed by server
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await context.firestore().doc(`conversations/conv123/messages/${messageId}`).set({
        id: messageId,
        text: 'Test',
        serverTimestamp: new Date(),
        status: 'sent'
      });
    });
    
    const retryCount = await sendMessageWithRetry({
      id: messageId,
      conversationId: 'conv123',
      text: 'Test',
      /* ... */
    });
    
    expect(retryCount).toBe(0); // Should not retry if already acked
  });
  
  it('should not create duplicates with same messageId', async () => {
    const messageId = generateMessageId();
    
    await sendMessage('conv123', 'Test', 'alice', 'Alice', messageId);
    await sendMessage('conv123', 'Test', 'alice', 'Alice', messageId);
    
    const alice = testEnv.authenticatedContext('alice');
    const snapshot = await alice.firestore()
      .collection('conversations/conv123/messages')
      .where('id', '==', messageId)
      .get();
    
    expect(snapshot.size).toBe(1);
  });
});
```

**Commit:** `feat: add retry logic with server ack stop and idempotency tests`

---

### ✅ PR #8: Offline Persistence
**Branch:** `feature/offline-support`

- [x] 8.1 Verify offline persistence in firebase.ts ✅ (Using getFirestore with auto AsyncStorage)
- [x] 8.2 Create `src/components/ConnectionBanner.tsx` ✅
- [ ] 8.3 Manual E2E test: Offline → messages load from cache
- [ ] 8.4 Manual E2E test: Offline → send 5 → online → all send, no dupes
- [ ] 8.5 Manual E2E test: Send → force quit → reopen → sends
- [x] 8.6 Add debug logging ✅

**Commit:** `feat: verify offline persistence with manual E2E tests`

---

## Phase 3: Enhanced Features (5-6 hours)

### ☐ PR #9: Presence System
**Branch:** `feature/presence-system`

- [ ] 9.1 Create `src/services/presenceService.ts`
  - **CRITICAL:** Use heartbeat doc pattern, not hot writes
  - Strategy: Update `presence.lastSeen` every 30s via `updateDoc` batch
  - Include `activeConversationId` for notification suppression
  ```typescript
  // Only write on: app foreground, send message, switch conversation, 30s heartbeat
  const batch = writeBatch(db);
  batch.update(userRef, {
    'presence.lastSeen': serverTimestamp(),
    'presence.status': 'online',
    'presence.activeConversationId': conversationId
  });
  await batch.commit();
  ```
- [ ] 9.2 Create `src/hooks/usePresence.ts` (30s interval, cleanup)
- [ ] 9.3 Integrate in `app/_layout.tsx`
- [ ] 9.4 Create `src/components/OnlineIndicator.tsx`
- [ ] 9.5 Add to ConversationListItem and chat header
- [ ] 9.6 Manual test: Open → online < 5s, close → offline < 90s

**Unit Test:**
```typescript
// __tests__/services/presenceService.test.ts
import { testEnv } from '../setup';
import { updatePresence, isUserOnline } from '@/services/presenceService';
import { Timestamp } from 'firebase/firestore';

describe('presenceService', () => {
  beforeEach(async () => {
    await testEnv.clearFirestore();
  });

  it('should update presence without hot writes', async () => {
    const alice = testEnv.authenticatedContext('alice');
    
    // First update
    await updatePresence('alice', 'online', 'conv-123');
    const doc1 = await alice.firestore().doc('users/alice').get();
    const lastSeen1 = doc1.data().presence.lastSeen;
    
    // Wait 100ms (simulate no update)
    await new Promise(r => setTimeout(r, 100));
    
    // Should not have changed (no hot writes)
    const doc2 = await alice.firestore().doc('users/alice').get();
    expect(doc2.data().presence.lastSeen).toEqual(lastSeen1);
  });
  
  it('should detect offline after 90s threshold', () => {
    const now = Timestamp.now();
    const recent = Timestamp.fromMillis(now.toMillis() - 30000); // 30s ago
    const old = Timestamp.fromMillis(now.toMillis() - 120000); // 2min ago
    
    expect(isUserOnline(recent)).toBe(true);
    expect(isUserOnline(old)).toBe(false);
  });
  
  it('should track activeConversationId for notification suppression', async () => {
    await updatePresence('alice', 'online', 'conv-123');
    const alice = testEnv.authenticatedContext('alice');
    const doc = await alice.firestore().doc('users/alice').get();
    
    expect(doc.data().presence.activeConversationId).toBe('conv-123');
  });
});
```

**Commit:** `feat: implement presence with heartbeat pattern and tests`

---

### ☐ PR #10: Typing Indicators
**Branch:** `feature/typing-indicators`

- [ ] 10.1 Create `src/services/typingService.ts`
- [ ] 10.2 Create `src/hooks/useTypingIndicator.ts` (debounce 500ms, clear 3s)
- [ ] 10.3 Create `src/components/TypingIndicator.tsx`
- [ ] 10.4 Update `app/chat/[id].tsx` with useTypingIndicator
- [ ] 10.5 Update `src/components/MessageInput.tsx` to trigger events
- [ ] 10.6 Manual test: Type → indicator < 1s, stop → clears < 3s

**RTL Smoke Test:**
```typescript
// __tests__/components/TypingIndicator.test.tsx
import { render } from '@testing-library/react-native';
import TypingIndicator from '@/components/TypingIndicator';

describe('TypingIndicator', () => {
  it('should render typing text', () => {
    const { getByText } = render(
      <TypingIndicator userName="Alice" isTyping={true} />
    );
    expect(getByText(/Alice is typing/i)).toBeTruthy();
  });
  
  it('should not render when isTyping is false', () => {
    const { queryByText } = render(
      <TypingIndicator userName="Alice" isTyping={false} />
    );
    expect(queryByText(/typing/i)).toBeNull();
  });
});
```

**Commit:** `feat: add typing indicators with RTL smoke tests`

---

### ☐ PR #11: Read Receipts
**Branch:** `feature/read-receipts`

- [ ] 11.1 Create `src/services/readReceiptService.ts` (arrayUnion for readBy)
- [ ] 11.2 Create `src/hooks/useMarkAsRead.ts` (IntersectionObserver/onViewableItemsChanged)
- [ ] 11.3 Update `app/chat/[id].tsx` with viewport tracking
- [ ] 11.4 Update `src/components/MessageBubble.tsx` (checkmarks for 1-on-1, count for groups)
- [ ] 11.5 Add checkmark icons
- [ ] 11.6 Manual test: Send → recipient views → checkmark < 2s

**Unit Test:**
```typescript
// __tests__/services/readReceiptService.test.ts
import { testEnv } from '../setup';
import { markMessageAsRead } from '@/services/readReceiptService';

describe('readReceiptService', () => {
  beforeEach(async () => {
    await testEnv.clearFirestore();
    
    // Seed: Create conversation and message
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await context.firestore().doc('conversations/conv123').set({
        participants: ['alice', 'bob']
      });
      await context.firestore().doc('conversations/conv123/messages/msg456').set({
        text: 'Hello',
        readBy: [],
        readCount: 0
      });
    });
  });

  it('should add user to readBy array', async () => {
    const alice = testEnv.authenticatedContext('alice');
    await markMessageAsRead('conv123', 'msg456', 'alice');
    
    const msgDoc = await alice.firestore().doc('conversations/conv123/messages/msg456').get();
    expect(msgDoc.data().readBy).toContain('alice');
    expect(msgDoc.data().readCount).toBe(1);
  });
  
  it('should not create duplicates with arrayUnion', async () => {
    await markMessageAsRead('conv123', 'msg456', 'alice');
    await markMessageAsRead('conv123', 'msg456', 'alice');
    
    const alice = testEnv.authenticatedContext('alice');
    const msgDoc = await alice.firestore().doc('conversations/conv123/messages/msg456').get();
    
    const aliceCount = msgDoc.data().readBy.filter(uid => uid === 'alice').length;
    expect(aliceCount).toBe(1);
    expect(msgDoc.data().readCount).toBe(1);
  });
});
```

**Commit:** `feat: implement read receipts with arrayUnion idempotency tests`

---

### ☐ PR #12: Group Chat
**Branch:** `feature/group-chat`

- [ ] 12.1 Update `src/services/conversationService.ts` (createGroupConversation, 3-20 users)
- [ ] 12.2 Create `app/newGroup.tsx` (multi-select, group name)
- [ ] 12.3 Update `src/components/MessageBubble.tsx` (sender name for groups)
- [ ] 12.4 Update `src/components/ConversationListItem.tsx` (group name)
- [ ] 12.5 Add "New Group" button in conversation list
- [ ] 12.6 Update read receipts (aggregate count)
- [ ] 12.7 Manual test: Create 3-user group, send, all receive < 3s

**Integration Test:**
```typescript
// __tests__/integration/groupChat.test.ts
import { testEnv } from '../setup';
import { createGroupConversation } from '@/services/conversationService';
import { sendMessage } from '@/services/messageService';

describe('Group Chat', () => {
  beforeEach(async () => {
    await testEnv.clearFirestore();
  });

  it('should create group with multiple participants', async () => {
    const alice = testEnv.authenticatedContext('alice');
    const groupId = await createGroupConversation(
      ['alice', 'bob', 'charlie'],
      'Test Group',
      'alice'
    );
    
    const groupDoc = await alice.firestore().doc(`conversations/${groupId}`).get();
    expect(groupDoc.data().type).toBe('group');
    expect(groupDoc.data().participants).toHaveLength(3);
    expect(groupDoc.data().name).toBe('Test Group');
  });
  
  it('should deliver messages to all group members', async () => {
    const groupId = await createGroupConversation(['alice', 'bob', 'charlie'], 'Test', 'alice');
    await sendMessage(groupId, 'Hello group', 'alice', 'Alice');
    
    await new Promise(r => setTimeout(r, 500));
    
    const bob = testEnv.authenticatedContext('bob');
    const messages = await bob.firestore()
      .collection(`conversations/${groupId}/messages`)
      .get();
    
    expect(messages.size).toBe(1);
    expect(messages.docs[0].data().text).toBe('Hello group');
  });
});
```

**Commit:** `feat: implement group chat with integration tests`

---

## Phase 4: Media + Notifications (4-5 hours)

### ☐ PR #13: Image Upload
**Branch:** `feature/image-upload`

- [ ] 13.1 Create `src/utils/imageCompression.ts` (< 2MB, 1920x1920, 80%)
- [ ] 13.2 Create `src/services/mediaService.ts` (upload-then-send)
- [ ] 13.3 Update `src/components/MessageInput.tsx` (image picker button)
- [ ] 13.4 Create `src/components/ImageMessage.tsx`
- [ ] 13.5 Update `src/components/MessageBubble.tsx` (handle type='image')
- [ ] 13.6 Create `src/components/ImageUploadProgress.tsx`
- [ ] 13.7 Add full-size modal
- [ ] 13.8 Update `storage.rules`
- [ ] 13.9 Manual test: Upload < 15s, shows both devices, retry on fail

**Unit Test:**
```typescript
// __tests__/utils/imageCompression.test.ts
import { compressImage } from '@/utils/imageCompression';

describe('imageCompression', () => {
  it('should compress image below 2MB', async () => {
    // Mock implementation with known file
    const mockResult = {
      uri: 'file://compressed.jpg',
      width: 1920,
      height: 1080,
      sizeBytes: 1.5 * 1024 * 1024 // 1.5MB
    };
    
    jest.spyOn(require('expo-image-manipulator'), 'manipulateAsync')
      .mockResolvedValue(mockResult);
    
    const result = await compressImage('file://large.jpg', { maxWidth: 1920 });
    expect(result.sizeBytes).toBeLessThan(2 * 1024 * 1024);
  });
  
  it('should maintain aspect ratio', async () => {
    const mockResult = { width: 1920, height: 1080, sizeBytes: 500000 };
    jest.spyOn(require('expo-image-manipulator'), 'manipulateAsync')
      .mockResolvedValue(mockResult);
    
    const result = await compressImage('file://test.jpg', { maxWidth: 1920 });
    const aspectRatio = result.width / result.height;
    expect(aspectRatio).toBeCloseTo(16/9, 1);
  });
});
```

**Commit:** `feat: implement image upload with compression tests`

---

### ☐ PR #14: Foreground Notifications
**Branch:** `feature/notifications`

- [ ] 14.1 Update `app.json` (notification permissions)
- [ ] 14.2 Create `src/services/notificationService.ts` (setup, send, suppression)
- [ ] 14.3 Configure handler (check activeConversationId from presence)
- [ ] 14.4 Integrate in message listener
- [ ] 14.5 Handle notification tap (navigate to conversation)
- [ ] 14.6 **CRITICAL:** Test on Dev Client or standalone build (not just Expo Go)
  ```bash
  # Build dev client
  npx expo install expo-dev-client
  eas build --profile development --platform ios
  # Or: npx expo run:ios
  ```
- [ ] 14.7 Manual test: Foreground notif shows, suppressed when viewing, tap opens chat

**Validation Checklist:**
- [ ] Test on Expo Dev Client (iOS)
- [ ] Test on Expo Dev Client (Android)
- [ ] Verify notification shows in foreground
- [ ] Verify suppression works with activeConversationId
- [ ] Verify tap navigation works
- [ ] Test on standalone build (optional but recommended)

**Commit:** `feat: add foreground notifications validated on dev client`

---

## Phase 5: Polish + Testing (3-4 hours)

### ☐ PR #15: Message Pagination
**Branch:** `feature/message-pagination`

- [ ] 15.1 Update `src/hooks/useMessages.ts` (add loadMore, track hasMore, lastVisible)
- [ ] 15.2 Add "Load More" button in `app/chat/[id].tsx`
- [ ] 15.3 Create `src/components/LoadingSpinner.tsx`
- [ ] 15.4 Maintain scroll position after load
- [ ] 15.5 Optional: Auto-load on scroll to top
- [ ] 15.6 Manual test: 100+ messages, pagination works

**Invariant Test for Scroll Position:**
```typescript
// __tests__/hooks/useMessages.test.ts
import { maintainScrollPosition } from '@/hooks/useMessages';

describe('useMessages pagination', () => {
  it('should maintain scroll position after loadMore', () => {
    const initialMessages = [
      { id: '1', text: 'New' },
      { id: '2', text: 'Newer' }
    ];
    const olderMessages = [
      { id: '3', text: 'Old' },
      { id: '4', text: 'Older' }
    ];
    
    const initialScroll = { offset: 100, contentHeight: 500 };
    
    // Load older messages (prepended)
    const newMessages = [...olderMessages, ...initialMessages];
    const newScroll = maintainScrollPosition(initialScroll, olderMessages.length);
    
    // Scroll offset should increase by height of new items
    expect(newScroll.offset).toBeGreaterThan(initialScroll.offset);
    // User's view should remain on the same message
  });
  
  it('should handle empty loadMore gracefully', () => {
    const scroll = { offset: 100, contentHeight: 500 };
    const maintained = maintainScrollPosition(scroll, 0);
    expect(maintained.offset).toBe(100); // No change
  });
});
```

**RTL Smoke Test:**
```typescript
// __tests__/components/pagination.test.tsx
import { render, fireEvent } from '@testing-library/react-native';
import ChatScreen from '@/app/chat/[id]';

describe('Message Pagination', () => {
  it('should render load more button when hasMore is true', () => {
    const { getByText } = render(<ChatScreen hasMore={true} />);
    expect(getByText(/load more/i)).toBeTruthy();
  });
  
  it('should hide load more button when hasMore is false', () => {
    const { queryByText } = render(<ChatScreen hasMore={false} />);
    expect(queryByText(/load more/i)).toBeNull();
  });
  
  it('should call loadMore on button press', () => {
    const mockLoadMore = jest.fn();
    const { getByText } = render(
      <ChatScreen hasMore={true} loadMore={mockLoadMore} />
    );
    
    fireEvent.press(getByText(/load more/i));
    expect(mockLoadMore).toHaveBeenCalled();
  });
});
```

**Commit:** `feat: add message pagination with scroll position tests`

---

### ☐ PR #16: Error Handling
**Branch:** `feature/error-handling`

- [ ] 16.1 Create `src/components/ErrorBanner.tsx`
- [ ] 16.2 Create `src/components/EmptyState.tsx`
- [ ] 16.3 Add error handling to all screens
- [ ] 16.4 Add empty states
- [ ] 16.5 Create `src/components/SkeletonLoader.tsx`
- [ ] 16.6 Map Firebase errors to friendly messages
- [ ] 16.7 Create `src/components/OfflineBanner.tsx`
- [ ] 16.8 Manual test: All error scenarios

**RTL Smoke Test:**
```typescript
// __tests__/components/ErrorBanner.test.tsx
import { render, fireEvent } from '@testing-library/react-native';
import ErrorBanner from '@/components/ErrorBanner';

describe('ErrorBanner', () => {
  it('should render error message', () => {
    const { getByText } = render(
      <ErrorBanner message="Something went wrong" />
    );
    expect(getByText('Something went wrong')).toBeTruthy();
  });
  
  it('should show retry button when onRetry provided', () => {
    const mockRetry = jest.fn();
    const { getByText } = render(
      <ErrorBanner message="Error" onRetry={mockRetry} />
    );
    
    expect(getByText(/retry/i)).toBeTruthy();
  });
  
  it('should call onRetry when retry button pressed', () => {
    const mockRetry = jest.fn();
    const { getByText } = render(
      <ErrorBanner message="Error" onRetry={mockRetry} />
    );
    
    fireEvent.press(getByText(/retry/i));
    expect(mockRetry).toHaveBeenCalled();
  });
});
```

**Commit:** `feat: add comprehensive error handling with RTL tests`

---

### ☐ PR #17: Final Testing + Deployment
**Branch:** `release/mvp-v1`

**E2E Test Suite (8 Critical Scenarios):**
- [ ] **17.1** Real-time: A sends → B receives < 3s ✅
  - Two physical devices or emulators
  - Measure latency with timestamps

- [ ] **17.2** Offline queue: Airplane mode → send 5 → online → all send, no dupes ✅
  - Enable airplane mode
  - Send 5 messages (should show "sending")
  - Disable airplane mode
  - Verify all 5 appear in Firestore with unique IDs

- [ ] **17.3** App lifecycle: Send → force quit → reopen → sends ✅
  - Send message
  - Immediately force quit app (swipe away)
  - Reopen app
  - Verify message sent (check Firestore)

- [ ] **17.4** Group chat: Create 3 users → A sends → B & C receive < 3s ✅
  - Create group with 3 users
  - User A sends message
  - Verify B and C receive within 3 seconds

- [ ] **17.5** Image upload: Select → uploads → appears both devices ✅
  - Select large image (> 5MB)
  - Verify compression (< 2MB)
  - Upload completes < 15s
  - Image visible on recipient device

- [ ] **17.6** Read receipts: A sends → B views → A sees checkmark < 2s ✅
  - User A sends message
  - User B opens chat and scrolls to message
  - User A sees read checkmark within 2 seconds

- [ ] **17.7** Presence: Open → online < 5s, close → offline < 90s ✅
  - User opens app
  - Check Firestore: presence.status = 'online' within 5s
  - User closes app
  - Check Firestore: presence.status = 'offline' within 90s

- [ ] **17.8** Notifications: In X → send to Y → shows; in Y → suppressed ✅
  - User A viewing conversation X
  - User B sends to conversation Y → notification shows
  - User B sends to conversation X → notification suppressed
  - Tap notification → opens correct conversation

**Performance Verification:**
- [ ] **17.9** Scroll performance: 100+ messages at 60fps ✅
  - Create conversation with 100+ messages
  - Scroll rapidly up and down
  - Use React DevTools Profiler
  - Target: < 16.67ms per frame (60fps)

- [ ] **17.10** Memory check: < 200MB after 30min ✅
  - Use app for 30 minutes (send messages, switch chats)
  - Check memory in Xcode/Android Studio Profiler
  - No memory leaks (flat line after initial ramp)

- [ ] **17.11** No console errors ✅
  - Run app in dev mode
  - Verify no errors in console during all operations

**Code Quality:**
- [ ] 17.12 Remove debug code (console.logs, commented code)
- [ ] 17.13 Run linter: `npm run lint`
- [ ] 17.14 Run all tests: `npm test` (all pass)
- [ ] 17.15 Check test coverage: `npm run test:coverage` (aim for > 70%)

**Documentation:**
- [ ] 17.16 Update README.md (setup, Firebase config, run instructions)
- [ ] 17.17 Create .env.example
- [ ] 17.18 Document test commands in README

**Deployment:**
- [ ] 17.19 Build dev client: `npx expo run:ios` / `npx expo run:android`
- [ ] 17.20 Or build standalone: `eas build --platform all`
- [ ] 17.21 Record demo video (5-7 min, show all 8 E2E scenarios)
- [ ] 17.22 Push to GitHub (all PRs merged to main)

**Final Verification Checklist:**
```bash
# All tests pass
npm test

# No TypeScript errors
npx tsc --noEmit

# No lint errors
npm run lint

# Build succeeds
eas build --profile development --platform ios
eas build --profile development --platform android

# Emulator tests pass
firebase emulators:start &
npm run test:emulator
```

**Commit:** `release: MVP v1.0 - production-ready with full test coverage`
