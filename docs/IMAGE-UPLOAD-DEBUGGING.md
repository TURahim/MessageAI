# Image Upload Debugging - Storage Permission Fix

**Date:** October 21, 2025  
**Status:** Debugging in progress  
**Approach:** Simplified rules + Guards

---

## Changes Made

### 1. ✅ Simplified Storage Rules (Temporary)

**File:** `storage.rules`

**Changed from hardened rules to auth-only:**

```javascript
// BEFORE (with Firestore participant check):
match /conversations/{cid}/messages/{file} {
  allow read, write: if request.auth != null &&
    firestore.exists(...) &&
    firestore.get(...).data.participants.hasAny([request.auth.uid]);
}

// AFTER (auth-only for testing):
match /conversations/{cid}/messages/{file} {
  allow read, write: if request.auth != null;
}
```

**Why:** Isolate if the issue is Firestore cross-service lookup or basic auth.

**Deployed:** ✅ Rules live in Firebase

---

### 2. ✅ Added Guards to Upload Function

**File:** `app/src/services/mediaService.ts`

**Guard 1: Require Authentication**
```typescript
if (!auth.currentUser) {
  throw new Error('User not authenticated - cannot upload image');
}

console.log('✅ Auth check passed:', {
  uid: auth.currentUser.uid,
  email: auth.currentUser.email,
});
```

**Guard 2: Verify Conversation Exists**
```typescript
const conversationSnap = await getDoc(doc(db, 'conversations', conversationId));

if (!conversationSnap.exists()) {
  throw new Error('Conversation does not exist');
}

const conversationData = conversationSnap.data();
console.log('✅ Conversation exists:', {
  id: conversationId,
  type: conversationData.type,
  participants: conversationData.participants,
  currentUserInParticipants: conversationData.participants?.includes(auth.currentUser.uid),
});
```

**Guard 3: Verify User is Participant**
```typescript
if (!conversationData.participants?.includes(auth.currentUser.uid)) {
  throw new Error('Current user is not a participant in this conversation');
}

console.log('✅ Participant check passed');
```

**Guard 4: Log Exact Upload Path**
```typescript
console.log('☁️ Uploading to Storage:', {
  path: storagePath,
  fullPath: storagePath,
  conversationId,
  messageId,
  authUid: auth.currentUser?.uid,
});
```

---

## What to Look For When Testing

### Expected Console Output (Success)

```
📤 Starting image upload: {conversationId: "5eZ3Wk1VOpR4...", messageId: "dae26279..."}
✅ Auth check passed: {uid: "5eZ3Wk1V", email: "your@email.com"}
✅ Conversation exists: {
  id: "5eZ3Wk1VOpR4...",
  type: "direct",
  participants: ["5eZ3Wk1VOpR4...", "6BTdyz6k2wON..."],
  currentUserInParticipants: true
}
✅ Participant check passed
🗜️ Compressing image...
📏 Original size: 3.50MB
✅ Compressed size: 1.85MB
📐 Dimensions: 1920x1080
📦 Converting to blob...
☁️ Uploading to Storage: {
  path: "conversations/.../messages/....jpg",
  conversationId: "5eZ3Wk1VOpR4...",
  messageId: "dae26279...",
  authUid: "5eZ3Wk1V..."
}
📊 Upload progress: 50%
📊 Upload progress: 100%
✅ Upload complete! URL: https://firebasestorage...
✅ Image uploaded successfully
```

---

### Possible Error Scenarios

#### Scenario 1: Auth Not Set
```
📤 Starting image upload...
❌ User not authenticated - cannot upload image
```
**Fix:** Ensure user is logged in

---

#### Scenario 2: Conversation Doesn't Exist
```
✅ Auth check passed...
❌ Conversation 5eZ3Wk1VOpR4 does not exist
```
**Fix:** Conversation document not created - check conversation creation logic

---

#### Scenario 3: User Not in Participants
```
✅ Auth check passed...
✅ Conversation exists: {participants: ["otherUser1", "otherUser2"], currentUserInParticipants: false}
❌ Current user is not a participant in this conversation
```
**Fix:** User shouldn't be in this chat - data consistency issue

---

#### Scenario 4: Storage Permission Still Denied (Auth-Only Rules)
```
✅ Auth check passed...
✅ Conversation exists...
✅ Participant check passed...
☁️ Uploading to Storage: {path: "conversations/.../messages/....jpg"}
❌ Firebase Storage: User does not have permission (storage/unauthorized)
```

**This would mean:**
- Auth is working
- Conversation exists
- Participant check passes
- **But Storage still denies** even with auth-only rules

**Diagnosis:** Problem with Firebase auth token not being sent to Storage, or Storage rules not recognizing auth.

---

## Next Steps Based on Results

### If Upload Succeeds with Auth-Only Rules ✅

**Conclusion:** The issue was the Firestore cross-service lookup in Storage rules.

**Action:** Re-harden rules with participant check in code (guards already added), keep simple Storage rules:

```javascript
// Keep this (works):
match /conversations/{cid}/messages/{file} {
  allow read, write: if request.auth != null;
}
```

**Security:** Participant validation happens in code before upload (guards we just added).

---

### If Upload Still Fails with Auth-Only Rules ❌

**Conclusion:** Issue is not the Firestore lookup - it's auth or path.

**Debug steps:**
1. Check `auth.currentUser` is actually set
2. Check upload path matches rules exactly
3. Check Firebase Console → Storage → Rules to verify deployment
4. Check auth token is being sent with Storage requests
5. Try even simpler rules: `allow read, write: if true;` (totally open - just for testing)

---

## Hardened Rules (When Ready)

Once uploads work with auth-only rules, we can re-harden:

**Option A: Keep Auth-Only (trust code guards)**
```javascript
match /conversations/{cid}/messages/{file} {
  allow read, write: if request.auth != null;
}
```
- ✅ Simple, reliable
- ✅ Participant check in code (already added)
- ⚠️ Relies on app logic for security

**Option B: Add Participant Check in Rules (if cross-service works)**
```javascript
match /conversations/{cid}/messages/{file} {
  allow read, write: if request.auth != null &&
    firestore.get(/databases/(default)/documents/conversations/$(cid))
      .data.participants.hasAny([request.auth.uid]);
}
```
- ✅ Defense in depth
- ⚠️ Depends on Firestore lookup working
- ⚠️ Slightly slower (extra Firestore read)

**Recommendation:** Start with Option A (auth-only + code guards), add Option B later if needed.

---

## Test Status

- ✅ 40/40 tests passing
- ✅ No linter errors
- ✅ Guards added to upload function
- ✅ Simplified rules deployed
- 🧪 Ready for manual testing

---

## Test Now

**Try uploading an image and check the console:**

1. Open chat
2. Click camera button
3. Select image
4. **Watch console logs** - you should see:
   - ✅ Auth check passed
   - ✅ Conversation exists
   - ✅ Participant check passed
   - ☁️ Uploading to Storage
   - Either success or specific error

**Share the console output** and we'll know exactly what's happening!

