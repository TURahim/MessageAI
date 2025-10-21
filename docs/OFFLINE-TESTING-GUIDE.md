# Offline Persistence - Manual Testing Guide

## Overview
Test Firestore's offline persistence to ensure messages are cached, queued, and sync properly.

---

## Test 8.3: Offline → Messages Load from Cache

**Goal:** Verify messages load from local cache when offline

### Steps:

1. **Prepare Data:**
   - Open app and navigate to a conversation
   - Send 3-5 messages
   - Verify they appear
   - **Wait 5 seconds** for Firestore to cache

2. **Go Offline:**
   - iOS Simulator: Enable Airplane Mode in Settings
   - Or: Use Network Link Conditioner to disable network

3. **Force Close App:**
   - Swipe up → swipe away the app
   - Or: Cmd+Q in simulator

4. **Reopen App:**
   - Launch app again
   - Navigate to the same conversation

5. **Expected Results:**
   ```
   ✅ Messages appear (loaded from cache)
   ✅ Can scroll through message history
   ✅ Console shows: "📥 Received X messages { fromCache: true, source: '💾 CACHE' }"
   ⚠️ Orange banner: "📡 No internet connection"
   ```

6. **Failure Indicators:**
   ```
   ❌ Blank screen
   ❌ Loading spinner stuck
   ❌ Error: "Failed to get documents from cache"
   ```

---

## Test 8.4: Offline → Send 5 → Online → All Send, No Dupes

**Goal:** Verify queued writes work and don't create duplicates

### Steps:

1. **Go Offline:**
   - Enable Airplane Mode

2. **Send 5 Messages:**
   ```
   - "Message 1"
   - "Message 2"
   - "Message 3"
   - "Message 4"
   - "Message 5"
   ```

3. **Observe Behavior:**
   ```
   Expected:
   ✅ All 5 messages appear in UI immediately (optimistic)
   ✅ All show "sending" status with 🕐 icon
   ✅ Console shows retry attempts: "⏳ Waiting Xms before retry..."
   ✅ After 3 retries: Messages turn red with retry button
   ```

4. **Go Online:**
   - Disable Airplane Mode

5. **Expected Results:**
   ```
   Within 5 seconds:
   ✅ All 5 messages change to "sent" with ✓ icon
   ✅ Red bubbles turn blue (success)
   ✅ Console: "✅ Message sent successfully"
   ✅ Check Firebase Console: Exactly 5 messages (no duplicates)
   ```

6. **Verify No Duplicates:**
   - Open Firebase Console → Firestore → conversations/{id}/messages
   - Count messages: Should be exactly 5
   - Check IDs: All unique
   - Check timestamps: All have serverTimestamp

7. **Failure Indicators:**
   ```
   ❌ Messages disappear
   ❌ Duplicate messages appear
   ❌ Some messages stuck in "sending"
   ❌ Firebase shows more than 5 messages
   ```

---

## Test 8.5: Send → Force Quit → Reopen → Sends

**Goal:** Verify pending writes survive app restart

### Steps:

1. **Ensure Online:**
   - Airplane Mode OFF
   - Connected to internet

2. **Send Message:**
   - Type: "Test persistence"
   - Tap Send
   - **Immediately** (within 1 second) force quit app

3. **Force Quit:**
   - Swipe up → swipe away app
   - Or: Cmd+Q in simulator
   - **Do this FAST** before message finishes sending

4. **Wait 3 Seconds:**
   - Let Firestore background sync complete

5. **Reopen App:**
   - Launch app
   - Navigate to same conversation

6. **Expected Results:**
   ```
   ✅ Message "Test persistence" appears in chat
   ✅ Message has "sent" status with ✓
   ✅ Check Firebase Console: Message exists
   ✅ Console: "📥 Received 1 message { fromCache: false, source: '☁️ SERVER' }"
   ```

7. **Alternative (if message sent before force quit):**
   ```
   ✅ Message appears (already sent)
   ℹ️ This is also acceptable - just means send was faster than force quit
   ```

8. **Failure Indicators:**
   ```
   ❌ Message disappeared
   ❌ Message stuck in "sending"
   ❌ Message not in Firebase
   ❌ Error on reopening app
   ```

---

## Debug Logs to Look For

### Offline Cache Loading:
```
✅ Firestore initialized with automatic offline persistence
👂 Subscribing to messages for conversation xxx
📥 Received 5 messages { fromCache: true, source: '💾 CACHE' }
```

### Online Message Sending:
```
📤 Sending message abc12345... { conversationId: 'xxx', text: 'Hello' }
✅ Message abc12345 sent to Firestore
✅ Updated lastMessage for conversation xxx
```

### Offline Message Queuing:
```
📤 Sending message def67890...
❌ Error sending message: unavailable
📦 Message queued for offline - will send when online
⏳ Waiting 1000ms before retry...
```

### Network Status Changes:
```
📡 Network: Offline
📡 Network: Online
```

---

## Common Issues

### Issue: Messages don't load offline
**Cause:** Cache not populated  
**Solution:** Wait 5 seconds after sending before going offline

### Issue: Queued messages don't send when back online
**Cause:** Firestore offline queue timeout  
**Solution:** Retry manually with retry button

### Issue: Duplicate messages
**Cause:** Client sent message twice with same ID  
**Solution:** Check UUID generation - should be unique

### Issue: App crashes on force quit
**Cause:** Improper cleanup  
**Solution:** Check all useEffect cleanup functions

---

## Success Criteria

✅ **8.3:** Messages load from cache when offline  
✅ **8.4:** 5 queued messages send without duplicates  
✅ **8.5:** Pending writes survive force quit  

All three tests must pass for PR #8 to be complete.

---

## Tips for Testing

1. **Use Console Logs:** The debug logs tell you exactly what's happening
2. **Check Firebase Console:** Verify server state matches app state
3. **Test Multiple Times:** Offline behavior can be inconsistent - test 2-3 times
4. **Use Different Timing:** Try force quitting at different points in the send process
5. **Check Message IDs:** All should be unique UUIDs

---

**Start with Test 8.3** (easiest) and work through to 8.5. Good luck! 🧪

