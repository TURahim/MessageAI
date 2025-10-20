# Phase 0: Test Infrastructure - Status Evaluation

## Overview
Phase 0 focuses on establishing test infrastructure with Firebase Emulator, security rules testing, and CI/CD pipeline.

**Estimated Time:** 1-2 hours remaining
**Priority:** Medium (can proceed with development while enhancing tests)

---

## ✅ Already Complete (50%)

### 0.1 Test Dependencies ✅
**Status:** DONE
**Evidence:**
- `@firebase/rules-unit-testing`: ^5.0.0 ✅
- `jest`: ~29.7.0 ✅
- `@testing-library/react-native`: ^13.3.3 ✅
- `@testing-library/jest-native`: ^5.4.3 ✅
- `ts-jest`: ^29.4.5 ✅
- `react-test-renderer`: 19.1.0 ✅

### 0.2 Jest Configuration ✅
**Status:** DONE
**Location:** `app/jest.config.js`
**Evidence:**
```javascript
preset: 'react-native'
testEnvironment: 'node'
transformIgnorePatterns: [firebase, uuid, expo-router]
```
**Note:** Missing @ alias moduleNameMapper, but tests still passing

### 0.5 Sample Tests ✅
**Status:** DONE - 13 tests passing
**Evidence:**
- `app/src/lib/__tests__/firebase.test.ts` (5 tests)
- `app/src/services/__tests__/authService.test.ts` (5 tests)
- `app/src/utils/messageId.test.ts` (3 tests)

### 0.9 Firebase Emulator Config ✅
**Status:** DONE
**Location:** `firebase.json`
**Evidence:**
```json
"emulators": {
  "auth": { "port": 9099 },
  "firestore": { "port": 8080 },
  "storage": { "port": 9199 },
  "ui": { "enabled": true, "port": 4000 }
}
```

### 0.10 Package.json Scripts ✅
**Status:** DONE
**Evidence:**
```json
"test": "jest --runInBand"
"emu": "firebase emulators:start"
```

---

## ❌ TODO (50% remaining)

### 0.3 Test Setup with Firebase Emulator ❌
**Status:** NOT STARTED
**Priority:** HIGH (required for rules testing)
**Action:** Create `app/src/__tests__/setup.ts`
**Dependencies:** None
**Estimated Time:** 15 minutes

**Implementation:**
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

**Verification:**
- Run `firebase emulators:start` in terminal
- Run `npm test` - should not break existing tests

---

### 0.4 Emulator Configuration for Dev ❌
**Status:** NOT STARTED
**Priority:** MEDIUM (useful for local dev, not critical for MVP)
**Action:** Create `app/src/lib/firebaseEmulator.ts`
**Dependencies:** None
**Estimated Time:** 10 minutes

**Implementation:**
```typescript
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getStorage, connectStorageEmulator } from 'firebase/storage';
import type { FirebaseApp } from 'firebase/app';

export function connectToEmulator(app: FirebaseApp) {
  if (__DEV__ && process.env.USE_EMULATOR === 'true') {
    const db = getFirestore(app);
    const auth = getAuth(app);
    const storage = getStorage(app);
    
    connectFirestoreEmulator(db, 'localhost', 8080);
    connectAuthEmulator(auth, 'http://localhost:9099');
    connectStorageEmulator(storage, 'localhost', 9199);
    
    console.log('🔧 Connected to Firebase Emulators');
  }
}
```

**Integration:**
Update `app/src/lib/firebase.ts`:
```typescript
import { connectToEmulator } from './firebaseEmulator';

// After initializeApp
connectToEmulator(app);
```

**Verification:**
- Set `USE_EMULATOR=true` in .env
- Run app - should connect to local emulators
- Firestore UI at http://localhost:4000 should show data

---

### 0.6 Firestore Rules Tests ❌
**Status:** NOT STARTED
**Priority:** HIGH (security critical)
**Action:** Create `app/src/__tests__/rules/firestore.rules.test.ts`
**Dependencies:** Task 0.3 (setup.ts)
**Estimated Time:** 30 minutes

**Test Cases:**
1. ✅ Deny unauthenticated reads
2. ✅ Allow users to read their own profile
3. ✅ Deny reading conversations user is not part of
4. ✅ Allow reading conversations user is part of
5. ✅ Deny writing to other user's profiles
6. ✅ Allow conversation participants to send messages

**Verification:**
```bash
firebase emulators:start &
npm test -- firestore.rules.test
```

---

### 0.7 Storage Rules Tests ❌
**Status:** NOT STARTED
**Priority:** MEDIUM (needed before image upload feature)
**Action:** Create `app/src/__tests__/rules/storage.rules.test.ts`
**Dependencies:** Task 0.3 (setup.ts)
**Estimated Time:** 20 minutes

**Test Cases:**
1. ✅ Deny unauthenticated uploads
2. ✅ Allow uploads to own message paths
3. ✅ Deny uploads outside conversation context
4. ✅ Verify file size limits

**Verification:**
```bash
firebase emulators:start &
npm test -- storage.rules.test
```

---

### 0.8 GitHub Actions CI ❌
**Status:** NOT STARTED
**Priority:** LOW (nice to have, not blocking development)
**Action:** Create `.github/workflows/ci.yml`
**Dependencies:** None (independent task)
**Estimated Time:** 15 minutes

**Configuration:**
- Node.js 18
- Install dependencies
- Start Firebase Emulators
- Run all tests
- Upload coverage to Codecov (optional)

**Verification:**
- Push to GitHub
- Check Actions tab - workflow should run
- All tests should pass

---

### 0.11 Test Infrastructure Verification ❌
**Status:** NOT STARTED
**Priority:** HIGH (validates Phase 0 completion)
**Action:** Run comprehensive test suite
**Dependencies:** Tasks 0.3, 0.6, 0.7
**Estimated Time:** 10 minutes

**Checklist:**
```bash
# Start emulators
firebase emulators:start &

# Run all tests
npm test

# Run emulator-specific tests
USE_EMULATOR=true npm test

# Verify coverage
npm run test:coverage
```

**Success Criteria:**
- All existing tests still pass (13/13)
- New rules tests pass
- Emulator tests run without errors
- No console warnings

---

## Recommended Approach

### Option A: Skip Phase 0 for Now (RECOMMENDED for MVP speed)
**Rationale:** 
- Tests are already passing (13/13)
- Firebase rules deployed and working
- Can add emulator tests later without blocking development

**Action:**
- Mark Phase 0 as "Partially Complete"
- Proceed to Phase 1 (already done) and Phase 2
- Return to complete 0.3, 0.6, 0.7 after MVP core features

**Pros:**
- Faster MVP delivery
- Focus on user-facing features
- Can iterate on tests alongside features

**Cons:**
- Missing security validation via tests
- No automated CI pipeline

---

### Option B: Complete Phase 0 Now (1-2 hours)
**Rationale:**
- Establishes robust test foundation
- Catches security issues early
- CI pipeline prevents regressions

**Action:**
1. **30 min:** Tasks 0.3, 0.4 (emulator setup)
2. **30 min:** Task 0.6 (Firestore rules tests)
3. **20 min:** Task 0.7 (Storage rules tests)
4. **15 min:** Task 0.8 (CI setup)
5. **10 min:** Task 0.11 (verification)

**Pros:**
- Complete test infrastructure
- Security rules validated
- CI prevents bugs

**Cons:**
- Delays MVP features by 1-2 hours
- May need debugging if emulator issues arise

---

## Decision Needed

**Question for you:** Which approach do you prefer?

**A) Skip Phase 0 emulator tests, proceed to Phase 2 features** (faster MVP)
**B) Complete Phase 0 now** (robust foundation, 1-2 hour investment)

---

## Current Test Status Summary

```
✅ PASSING (13 tests)
- Firebase configuration (5 tests)
- Auth service (5 tests)  
- Message ID generation (3 tests)

❌ TODO (emulator tests)
- Firestore rules tests (0 tests)
- Storage rules tests (0 tests)
- Integration tests (0 tests)
```

**Recommendation:** Proceed with **Option A** - Skip emulator tests for now, focus on MVP features (Phase 2-3), return to complete Phase 0 after core messaging works.

Time saved: ~1-2 hours → can deliver MVP features faster

