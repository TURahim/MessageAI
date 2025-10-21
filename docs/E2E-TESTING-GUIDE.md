# E2E Testing Guide - MessageAI MVP

This document provides step-by-step instructions for manually testing all critical user flows before deployment.

---

## 🎯 Overview

**Goal:** Verify all 11 MVP features work correctly in production-like conditions

**Time Required:** ~2 hours for complete testing

**Prerequisites:**
- 2 test devices (or 1 device + 1 emulator)
- 2 test accounts (e.g., test1@example.com, test2@example.com)
- Firebase Console access
- Network control (airplane mode toggle)

---

## 📱 Test Scenarios

### 17.1 Real-Time Messaging ⚡

**Objective:** Verify messages deliver within 3 seconds

**Steps:**
1. Device A: Sign in as User A
2. Device B: Sign in as User B
3. Device A: Start conversation with User B
4. Device A: Send message "Test message 1" - Note timestamp
5. Device B: Wait for message to appear - Note timestamp
6. Calculate latency: Should be < 3 seconds

**Success Criteria:**
- ✅ Message appears on Device B within 3 seconds
- ✅ Message text matches exactly
- ✅ Sender name displays correctly
- ✅ Timestamp is accurate

**Screenshot Locations:**
- Device A: Message sent view
- Device B: Message received view

---

### 17.2 Offline Queue & Sync 📡

**Objective:** Verify messages queue when offline and sync when back online

**Steps:**
1. Device A: Open existing conversation
2. Device A: Enable airplane mode
3. Device A: Send 5 messages:
   - "Offline message 1"
   - "Offline message 2"
   - "Offline message 3"
   - "Offline message 4"
   - "Offline message 5"
4. Verify: Messages show "sending" status (⏱️)
5. Device A: Disable airplane mode
6. Wait for sync (should be automatic)
7. Device B: Verify all 5 messages received

**Success Criteria:**
- ✅ Offline messages show "sending" status
- ✅ All 5 messages sync when online
- ✅ No duplicate messages
- ✅ Messages appear in correct order
- ✅ All message IDs are unique (check Firestore)

**Firestore Verification:**
```
1. Open Firebase Console > Firestore
2. Navigate to conversations/{conversationId}/messages
3. Verify 5 new documents with unique IDs
4. Check all have status: "sent"
```

---

### 17.3 App Lifecycle Persistence 🔄

**Objective:** Verify messages send even after force quit

**Steps:**
1. Device A: Open conversation
2. Device A: Send message "Persistence test"
3. Device A: **Immediately** force quit app (double tap home, swipe away)
4. Wait 5 seconds
5. Device B: Check if message received
6. Firebase Console: Verify message exists

**Success Criteria:**
- ✅ Message appears in Firestore
- ✅ Device B receives message
- ✅ Message status is "sent"
- ✅ No data loss

---

### 17.4 Group Chat (3+ Users) 👥

**Objective:** Verify group messaging works with multiple participants

**Setup:**
1. Create 3 test accounts (or use 2 devices + 1 emulator)
2. Device A: Sign in as User A
3. Device B: Sign in as User B
4. Device C: Sign in as User C (or emulator)

**Steps:**
1. Device A: Tap + button → "New Group"
2. Select User B and User C
3. Enter group name: "Test Group"
4. Tap "Create"
5. Device A: Send message "Hello group!"
6. Device B & C: Verify message appears within 3 seconds
7. Device B: Reply "Hi from B"
8. Device A & C: Verify reply appears

**Success Criteria:**
- ✅ Group created successfully
- ✅ All 3 users can see messages
- ✅ Sender names display correctly
- ✅ Messages deliver within 3 seconds
- ✅ Read counts update (shows "Read by 2/3")

---

### 17.5 Image Upload & Sharing 📷

**Objective:** Verify image compression and upload works

**Setup:**
- Prepare a large image (> 5MB) on Device A

**Steps:**
1. Device A: Open conversation
2. Device A: Tap image picker button (📷)
3. Select large image (> 5MB)
4. Observe upload progress bar
5. Wait for upload to complete
6. Device B: Verify image appears
7. Device B: Tap image to view full size

**Success Criteria:**
- ✅ Image compresses to < 2MB (check logs)
- ✅ Upload completes within 15 seconds
- ✅ Progress bar shows correctly
- ✅ Image displays on both devices
- ✅ Full-size modal works
- ✅ Image quality is acceptable

**Firestore Verification:**
```
Check message document has:
{
  type: "image",
  media: {
    url: "https://...",
    width: number,
    height: number,
    status: "ready"
  }
}
```

---

### 17.6 Read Receipts ✓✓

**Objective:** Verify read receipts update within 2 seconds

**Steps:**
1. Device A: Send message to User B
2. Device A: Observe single checkmark (✓ sent)
3. Device B: Open conversation
4. Device B: Scroll to new message (ensure it's visible)
5. Device A: Observe checkmark change to double (✓✓ read)
6. Measure time: Should be < 2 seconds

**Success Criteria:**
- ✅ Single checkmark when sent
- ✅ Double checkmark when read
- ✅ Update happens within 2 seconds
- ✅ Works in 1-on-1 chats
- ✅ Shows "Read by X/Y" in group chats

---

### 17.7 Presence Indicators 🟢

**Objective:** Verify online/offline status updates correctly

**Steps:**
1. **Online Test:**
   - Device B: Close app completely
   - Device A: Observe User B is offline (gray dot)
   - Device B: Open app
   - Device A: Observe User B goes online (green dot) within 5s
   
2. **Offline Test:**
   - Device B: App is open
   - Device A: Observe User B is online (green dot)
   - Device B: Close app
   - Wait 90 seconds
   - Device A: Observe User B goes offline (gray dot)

**Success Criteria:**
- ✅ Online status shows within 5 seconds of app open
- ✅ Offline status shows within 90 seconds of app close
- ✅ Indicator color changes (green = online, gray = offline)
- ✅ Status appears in conversation list and chat header

**Firestore Verification:**
```
Check users/{userId} document:
{
  presence: {
    status: "online" | "offline",
    lastSeen: Timestamp,
    activeConversationId: string | null
  }
}
```

---

### 17.8 Foreground Notifications 🔔

**Objective:** Verify notifications show/suppress correctly

**⚠️ Note:** Requires Expo Dev Client or standalone build (not Expo Go)

**Setup:**
1. Build dev client: `npx expo run:ios` or `npx expo run:android`
2. Grant notification permissions when prompted

**Steps:**
1. Device A: Open conversation X with User B
2. Device B: Send message to conversation X
3. Device A: Observe NO notification (suppressed because viewing)
4. Device A: Navigate to home/conversations list
5. Device B: Send another message to conversation X
6. Device A: Observe notification appears
7. Device A: Tap notification
8. Verify: Opens conversation X directly

**Success Criteria:**
- ✅ No notification when viewing conversation
- ✅ Notification shows when in other screens
- ✅ Notification has sender name and message preview
- ✅ Tapping notification opens correct conversation
- ✅ Notification plays sound (if not silenced)

**Known Limitations:**
- Expo Go: Limited notification support
- Solution: Use dev client or standalone build

---

## 🚀 Performance Tests

### 17.9 Scroll Performance (60fps)

**Objective:** Verify smooth scrolling with 100+ messages

**Setup:**
1. Use seed helper to create 150 messages:
   ```typescript
   import { seedMessagesForTesting } from '@/__tests__/helpers/seedMessages';
   seedMessagesForTesting(conversationId, userId, 'Test User', 150);
   ```

**Steps:**
1. Open conversation with 150+ messages
2. Scroll rapidly up and down
3. Observe for jank or frame drops
4. Use React DevTools Profiler (if available)

**Success Criteria:**
- ✅ Scrolling is smooth (feels like 60fps)
- ✅ No stuttering or jank
- ✅ Images load progressively
- ✅ No significant lag

**Metrics (if available):**
- Target: < 16.67ms per frame (60fps)
- Accept: < 33ms per frame (30fps minimum)

---

### 17.10 Memory Usage

**Objective:** Verify no memory leaks over 30 minutes

**iOS (Xcode Instruments):**
1. Open Xcode
2. Product → Profile
3. Select "Leaks" or "Allocations" instrument
4. Run app for 30 minutes:
   - Send/receive messages
   - Switch conversations
   - Upload images
   - Open/close app
5. Observe memory graph

**Android (Profiler):**
1. Open Android Studio
2. View → Tool Windows → Profiler
3. Select device and app
4. Click "Memory" profiler
5. Perform same actions as iOS test
6. Observe memory graph

**Success Criteria:**
- ✅ Memory stays < 200MB
- ✅ No continuous upward trend (indicates leak)
- ✅ Memory decreases after GC
- ✅ Graph shows plateau after initial ramp

---

### 17.11 Console Errors

**Objective:** Verify no errors during normal operation

**Steps:**
1. Run app in dev mode: `pnpm start`
2. Open Metro bundler console
3. Perform all user flows:
   - Sign in/out
   - Create conversations
   - Send messages
   - Upload images
   - View different screens
4. Monitor console for errors

**Success Criteria:**
- ✅ No red error messages
- ✅ No unhandled promise rejections
- ✅ Warning messages are acceptable (yellow)
- ✅ Info logs are fine (console.log)

---

## ✅ Final Checklist

Before marking MVP as complete, verify:

### Core Features (11/11)
- [ ] One-on-one chat working
- [ ] Real-time delivery (< 3s)
- [ ] Message persistence (offline cache)
- [ ] Optimistic UI (instant display)
- [ ] Online/offline status
- [ ] Message timestamps
- [ ] User authentication
- [ ] Group chat (3-20 users)
- [ ] Read receipts
- [ ] Image upload/sharing
- [ ] Foreground notifications

### Quality Checks
- [ ] All 8 E2E scenarios pass
- [ ] Performance acceptable (60fps, < 200MB)
- [ ] No console errors
- [ ] 73/73 unit tests pass
- [ ] Firebase rules deployed
- [ ] TypeScript errors resolved

### Documentation
- [ ] README updated
- [ ] .env.example created
- [ ] E2E guide complete
- [ ] Known issues documented

---

## 📊 Test Results Template

Use this template to document your test results:

```markdown
## Test Session: [Date]
**Tester:** [Name]
**Devices:** [List]
**Build:** [Version/Commit]

### Results

| Test | Status | Notes |
|------|--------|-------|
| 17.1 Real-time | ✅ Pass | Latency: 1.2s |
| 17.2 Offline queue | ✅ Pass | All 5 synced |
| 17.3 App lifecycle | ✅ Pass | Message sent |
| 17.4 Group chat | ✅ Pass | 3 users OK |
| 17.5 Image upload | ✅ Pass | 8s upload |
| 17.6 Read receipts | ✅ Pass | < 2s update |
| 17.7 Presence | ✅ Pass | Timings OK |
| 17.8 Notifications | ⏳ Pending | Need dev build |
| 17.9 Scroll perf | ✅ Pass | Smooth at 150 msgs |
| 17.10 Memory | ✅ Pass | 180MB stable |
| 17.11 Console | ✅ Pass | No errors |

### Issues Found
- None / [List any issues]

### Recommendations
- [Any suggestions for improvement]
```

---

## 🐛 Common Issues & Solutions

### Issue: Messages don't sync after going online
**Solution:** Check Firestore connection in console logs

### Issue: Notifications don't show
**Solution:** Verify using Expo Dev Client (not Expo Go)

### Issue: Image upload fails
**Solution:** Check Storage rules and permissions

### Issue: Presence doesn't update
**Solution:** Verify heartbeat is running (check logs)

### Issue: Read receipts don't work in groups
**Solution:** Check readBy array is updating in Firestore

---

**Happy Testing!** 🎉

If you find any issues, document them with:
1. Steps to reproduce
2. Expected behavior
3. Actual behavior
4. Screenshots/videos
5. Device/OS version

