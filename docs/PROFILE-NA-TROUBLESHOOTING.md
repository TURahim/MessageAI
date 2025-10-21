# Profile N/A Issue - Troubleshooting Implementation

**Date:** October 21, 2025  
**Status:** Debugging features added ✅  
**Tests:** 33/33 passing

---

## Problem Analysis

The user is still experiencing "N/A" in the profile screen despite previous fixes. Console logs show:
- ✅ User document IS being created (`Updated user document for: 5eZ3Wk1...`)
- ✅ Sign out works correctly
- ❌ Permission errors when reading user data
- ❌ Profile still shows N/A

**Root Cause Hypothesis**: The issue may be that:
1. Firebase Auth user object doesn't have `displayName` set
2. Profile screen was only using Firebase Auth data, not Firestore data
3. Race condition between document creation and UI rendering

---

## Actions Taken

### 1. ✅ Verified and Deployed Firestore Rules

**Checked `firestore.rules`:**
```javascript
match /users/{uid} {
  allow read: if request.auth != null;  // ✅ Any authenticated user can read
  allow write: if request.auth != null && request.auth.uid == uid;  // ✅ Only self can write
}
```

**Rules are correct and deployed:**
- Ran: `firebase deploy --only firestore:rules`
- Status: "rules file already up to date" - no issues

---

### 2. ✅ Added Comprehensive Debugging Logs

**In `AuthContext.tsx`:**
- Logs auth state changes with user details
- Logs user document creation/update
- Attempts to read back the user document after creation
- Shows detailed error information if read fails

**Expected console output:**
```
🔐 Auth state changed: {hasUser: true, uid: "...", email: "...", displayName: "..."}
✅ Created user document for: xxx
📄 User document after ensure: {exists: true, data: {...}}
```

**In `profile.tsx`:**
- Logs Firebase Auth user object on mount
- Fetches Firestore profile data separately
- Logs Firestore profile data when loaded
- Shows detailed error information if fetch fails

**Expected console output:**
```
👤 Profile screen - Firebase Auth user: {hasUser: true, uid: "...", email: "..."}
📥 Fetching Firestore profile for: xxx
✅ Firestore profile loaded: {displayName: "...", email: "..."}
```

---

### 3. ✅ Added Firestore Fallback to Profile Screen

**Problem**: Profile was only using Firebase Auth's `user.displayName`, which might be null.

**Solution**: Now fetches data from Firestore separately:

```typescript
// Fetch Firestore profile data
useEffect(() => {
  if (!user) return;
  
  const fetchProfile = async () => {
    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        setFirestoreProfile(userDoc.data());
      }
    } catch (error) {
      setFetchError(error.message);
    }
  };
  
  fetchProfile();
}, [user]);

// Use fallback chain
const profileDisplayName = user?.displayName || firestoreProfile?.displayName || 'N/A';
const profileEmail = user?.email || firestoreProfile?.email || 'N/A';
```

**Benefits:**
- Profile shows Firestore data even if Firebase Auth doesn't have displayName
- Handles both Google Sign-In (has displayName) and email sign-in (might not)
- Shows error messages if Firestore fetch fails

---

### 4. ✅ Added Error UI to Profile Screen

**Added error banner:**
- Shows permission errors or fetch failures
- Helps user understand what's wrong
- Red banner with clear error message

```typescript
{fetchError && (
  <View style={styles.errorContainer}>
    <Text style={styles.errorText}>⚠️ {fetchError}</Text>
  </View>
)}
```

---

## What to Look For When Testing

### Check Console Logs

When you reload the app, you should see:

1. **Auth State Change Log:**
   ```
   🔐 Auth state changed: {
     hasUser: true,
     uid: "5eZ3Wk1VQpR4O1Oi8fHi4fI0tqB2",
     email: "your@email.com",
     displayName: "Your Name" or null  ← Check this!
   }
   ```

2. **User Document Log:**
   ```
   ✅ Created user document for: 5eZ3Wk1...
   📄 User document after ensure: {
     exists: true,
     data: {
       displayName: "Your Name",
       email: "your@email.com",
       uid: "...",
       presence: {...}
     }
   }
   ```

3. **Profile Screen Logs:**
   ```
   👤 Profile screen - Firebase Auth user: {
     hasUser: true,
     uid: "...",
     email: "...",
     displayName: "..." or null  ← Check this!
   }
   📥 Fetching Firestore profile for: 5eZ3Wk1...
   ✅ Firestore profile loaded: {displayName: "...", email: "..."}
   ```

### Diagnose Based on Logs

**If you see:**

#### ✅ Scenario 1: Everything Working
```
🔐 Auth state changed: {displayName: "Your Name"}
📄 User document after ensure: {exists: true, data: {displayName: "Your Name"}}
👤 Profile screen: {displayName: "Your Name"}
✅ Firestore profile loaded: {displayName: "Your Name"}
```
**Result**: Profile should show your name correctly!

#### ⚠️ Scenario 2: Auth has no displayName, but Firestore does
```
🔐 Auth state changed: {displayName: null}  ← Auth doesn't have it
📄 User document after ensure: {exists: true, data: {displayName: "Your Name"}}
✅ Firestore profile loaded: {displayName: "Your Name"}  ← Firestore has it
```
**Result**: Profile should STILL show your name (using Firestore fallback)

#### ❌ Scenario 3: Permission Error
```
🔐 Auth state changed: {displayName: null}
❌ Failed to read user document: FirebaseError: Missing or insufficient permissions
👤 Profile screen: Permission denied
❌ Error fetching Firestore profile: Missing or insufficient permissions
```
**Result**: Profile shows error banner. **This is the real issue!**

#### ❌ Scenario 4: Document doesn't exist
```
🔐 Auth state changed: {displayName: null}
📄 User document after ensure: {exists: false}
⚠️ User document does not exist in Firestore
```
**Result**: Profile shows error banner. Document creation failed.

---

## Next Steps Based on Console Output

### If Scenario 1 (✅ Everything Working)
- **Problem solved!** The profile should now show correct data.
- Remove debug logs if desired (optional)

### If Scenario 2 (⚠️ Auth has no displayName)
- **Expected for email sign-in users**
- Profile will use Firestore data as fallback
- Consider updating Firebase Auth profile:
  ```typescript
  await updateProfile(user, { 
    displayName: firestoreProfile.displayName 
  });
  ```

### If Scenario 3 (❌ Permission Error)
**This is a Firebase project configuration issue:**

1. **Check Firebase Console:**
   - Go to https://console.firebase.google.com
   - Select your project: `messageai-88921`
   - Go to Firestore Database → Rules
   - Verify rules are published

2. **Try Re-deploying Rules:**
   ```bash
   cd /Users/tahmeedrahim/Projects/MessageAI
   firebase deploy --only firestore:rules --force
   ```

3. **Check User Authentication:**
   - Go to Firebase Console → Authentication
   - Verify your user exists
   - Check if there are any security issues

4. **Test in Firestore Console:**
   - Go to Firestore Database → Data
   - Navigate to `users` collection
   - Try to manually view your user document
   - If you can't see it, there's a permission issue in console itself

### If Scenario 4 (❌ Document doesn't exist)
**Document creation is failing:**

1. **Check `ensureUserDocument()` logs:**
   - Should see: "Created user document for: xxx"
   - If you see errors, check the error message

2. **Manually create document:**
   - Go to Firebase Console → Firestore
   - Create document: `/users/{your-uid}`
   - Add fields:
     ```
     uid: {your-uid}
     email: {your-email}
     displayName: {your-name}
     presence: {
       status: "offline"
       lastSeen: (timestamp)
       activeConversationId: null
     }
     createdAt: (timestamp)
     ```

3. **Check write permissions:**
   - The rules allow `write: if request.auth.uid == uid`
   - Make sure the user is authenticated

---

## Files Modified

1. **`app/src/contexts/AuthContext.tsx`**
   - Added detailed logging for auth state changes
   - Added verification read after document creation
   - Shows errors if document read fails

2. **`app/app/(tabs)/profile.tsx`**
   - Added Firestore profile fetch separate from Auth
   - Added fallback chain: Auth → Firestore → N/A
   - Added error state and error UI
   - Added comprehensive logging

3. **`firestore.rules`**
   - Verified rules are correct (no changes needed)
   - Deployed rules to Firebase

---

## Testing Checklist

### Manual Tests
- [ ] Reload the app and check console logs
- [ ] Navigate to Profile screen
- [ ] Check if display name and email appear
- [ ] Check console for any error messages
- [ ] If errors appear, note the specific error code/message

### What to Report Back
Please share:
1. **Console logs** from app reload (the 🔐, 📄, 👤, ✅ logs)
2. **What the profile shows** (N/A or actual data?)
3. **Any error messages** in console or on screen
4. **Firebase Console** - Can you see the document at `/users/{your-uid}`?

---

## Expected Outcome

After these changes:
- ✅ **At minimum**: Profile should show your email (from Firebase Auth)
- ✅ **Ideally**: Profile shows both displayName and email (from Firestore)
- ✅ **If issues**: You'll see clear error messages explaining what's wrong
- ✅ **Debug info**: Console logs will tell us exactly where the problem is

---

## Files to Check in Firebase Console

1. **Firestore Rules**: Should match `firestore.rules` file
2. **Firestore Data**: Check `/users/{your-uid}` document exists
3. **Authentication**: Verify your user account exists
4. **Project Settings**: Ensure project ID matches `.env` file

---

## Status

**Ready for testing!** 🚀

Reload the app and share the console output. The logs will tell us exactly what's happening and where the issue is.

