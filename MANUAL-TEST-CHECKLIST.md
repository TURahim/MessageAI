# Manual Testing Checklist - MessageAI MVP

**Before you begin:** 
- Have 2 test devices/emulators ready
- Create 2 test accounts (test1@example.com, test2@example.com)
- Clear about 2-3 hours for complete testing

---

## 🎯 E2E Test Scenarios

### Test 1: Real-Time Messaging ⚡
- [ ] Device A: Sign in and start conversation with User B
- [ ] Device A: Send message "Test message 1"
- [ ] Device B: Verify message appears within 3 seconds
- [ ] Device B: Reply "Test response"
- [ ] Device A: Verify reply appears within 3 seconds
- [ ] Verify sender names display correctly
- [ ] Verify timestamps are accurate

**Pass Criteria:** Messages deliver in < 3 seconds both ways

---

### Test 2: Offline Queue & Sync 📡
- [ ] Device A: Open existing conversation
- [ ] Device A: Enable airplane mode
- [ ] Device A: Send 5 messages (they should show "sending" status ⏱️)
- [ ] Verify messages queue locally and don't fail
- [ ] Device A: Disable airplane mode
- [ ] Wait for automatic sync (should happen within 10s)
- [ ] Device B: Verify all 5 messages received
- [ ] Firebase Console: Verify no duplicate messages (check message IDs)

**Pass Criteria:** All 5 messages sync successfully with no duplicates

---

### Test 3: App Lifecycle Persistence 🔄
- [ ] Device A: Open conversation
- [ ] Device A: Send message "Persistence test"
- [ ] Device A: **Immediately** force quit app (swipe away from app switcher)
- [ ] Wait 10 seconds
- [ ] Device B: Check if message appeared
- [ ] Firebase Console: Verify message exists in Firestore
- [ ] Device A: Reopen app and verify message shows as sent

**Pass Criteria:** Message persists and sends even after force quit

---

### Test 4: Group Chat (3+ Users) 👥
- [ ] Device A: Tap + button → "New Group"
- [ ] Select 2+ other users (User B, User C)
- [ ] Enter group name: "Test Group"
- [ ] Tap "Create Group"
- [ ] Device A: Send message "Hello group!"
- [ ] Device B & C: Verify message appears within 3 seconds
- [ ] Device B: Reply "Hi from B"
- [ ] Device A & C: Verify reply appears
- [ ] Verify sender names display in group messages
- [ ] Check read receipts show "Read by X/Y"

**Pass Criteria:** Group messaging works for all participants

---

### Test 5: Image Upload & Sharing 📷
- [ ] Prepare a large image (> 5MB) on Device A
- [ ] Device A: Open conversation
- [ ] Device A: Tap image picker button (📷 icon)
- [ ] Select large image
- [ ] Observe upload progress bar appears
- [ ] Wait for upload to complete (should be < 15 seconds)
- [ ] Check console logs: Image compressed to < 2MB
- [ ] Device B: Verify image appears in chat
- [ ] Device B: Tap image to view full size
- [ ] Verify image quality is acceptable
- [ ] Verify full-size modal works (can close it)

**Pass Criteria:** Image uploads in < 15s and displays on both devices

---

### Test 6: Read Receipts ✓✓
- [ ] Device A: Send new message to User B
- [ ] Device A: Observe single checkmark (✓ = sent)
- [ ] Device B: Open conversation (but don't scroll to message yet)
- [ ] Device B: Scroll to make message visible on screen
- [ ] Device A: Observe checkmark changes to double (✓✓ = read)
- [ ] Time the update: Should be < 2 seconds
- [ ] Test in group chat: Verify shows "Read by 2/3" format

**Pass Criteria:** Read receipts update within 2 seconds

---

### Test 7: Presence Indicators 🟢
**Part A: Going Online**
- [ ] Device B: Completely close app (force quit)
- [ ] Device A: Open conversation with User B
- [ ] Device A: Observe User B is offline (gray dot or no indicator)
- [ ] Device B: Open app and sign in
- [ ] Device A: Observe User B goes online (green dot) within 5 seconds

**Part B: Going Offline**
- [ ] Device B: Keep app open in foreground
- [ ] Device A: Observe User B is online (green dot)
- [ ] Device B: Close app completely
- [ ] Wait 90 seconds (set a timer)
- [ ] Device A: Observe User B goes offline (gray dot)
- [ ] Firebase Console: Check users/{userId}/presence.status = "offline"

**Pass Criteria:** Online < 5s, Offline < 90s

---

### Test 8: Foreground Notifications 🔔

**⚠️ IMPORTANT:** This test requires Expo Dev Client or standalone build
- [ ] Build dev client: Run `npx expo run:ios` OR `npx expo run:android`
- [ ] Grant notification permissions when prompted

**Test A: Notification Suppression**
- [ ] Device A: Open conversation X with User B
- [ ] Device B: Send message to conversation X
- [ ] Device A: Verify NO notification appears (suppressed because viewing)

**Test B: Notification Shows**
- [ ] Device A: Navigate away from conversation (go to home screen)
- [ ] Device B: Send another message to conversation X
- [ ] Device A: Verify notification appears with sender name and message
- [ ] Device A: Tap notification
- [ ] Verify: Opens directly to conversation X

**Test C: Sound & Appearance**
- [ ] Verify notification plays sound (if device not silenced)
- [ ] Verify notification banner shows sender name
- [ ] Verify notification shows message preview

**Pass Criteria:** Notifications show/suppress correctly, tap opens chat

**Note:** If testing in Expo Go, notifications will have limited functionality. Use dev client for full testing.

---

## 🚀 Performance Tests

### Test 9: Scroll Performance (60fps) 📱
- [ ] Use seed helper to create 150 messages (see E2E-TESTING-GUIDE.md)
- [ ] Open conversation with 150+ messages
- [ ] Scroll rapidly up and down
- [ ] Observe smoothness (should feel fluid, no jank)
- [ ] Scroll to top, tap "Load Older Messages"
- [ ] Verify older messages load without scroll jump
- [ ] Continue scrolling - should remain smooth

**Pass Criteria:** Scrolling feels smooth (like 60fps), no stuttering

---

### Test 10: Memory Usage 📊
**iOS (Xcode):**
- [ ] Open Xcode → Window → Devices and Simulators
- [ ] Select your device → Open Console
- [ ] Run app and note memory usage at start
- [ ] Use app for 30 minutes:
  - [ ] Send/receive 50+ messages
  - [ ] Upload 5+ images
  - [ ] Switch between 5+ conversations
  - [ ] Create a group chat
- [ ] Note final memory usage
- [ ] Memory should be < 200MB
- [ ] Graph should plateau (no continuous increase)

**Android (Android Studio):**
- [ ] Open Android Studio → View → Tool Windows → Profiler
- [ ] Select device and app
- [ ] Click "Memory" profiler
- [ ] Use app for 30 minutes (same actions as iOS)
- [ ] Memory should stay < 200MB
- [ ] No continuous upward trend

**Pass Criteria:** Memory < 200MB, no leaks (stable after initial ramp)

---

### Test 11: Console Errors ⚠️
- [ ] Run app in dev mode: `cd app && pnpm start`
- [ ] Open Metro bundler console (terminal)
- [ ] Perform all user flows while monitoring console:
  - [ ] Sign in/sign out
  - [ ] Create new conversation
  - [ ] Send 10+ messages
  - [ ] Upload 2+ images
  - [ ] Create group chat
  - [ ] Switch between conversations
  - [ ] Enable/disable airplane mode
  - [ ] Force quit and reopen
- [ ] Review console output
- [ ] Verify no red error messages
- [ ] Yellow warnings are acceptable
- [ ] Info logs (console.log) are fine

**Pass Criteria:** No red errors during normal operation

---

## ✅ Feature Verification Checklist

Verify each MVP feature works:

### Core Messaging
- [ ] Can send text messages
- [ ] Messages appear instantly (optimistic UI)
- [ ] Messages persist after app restart
- [ ] Can view message timestamps
- [ ] Messages show correct status (sending/sent/failed)

### Authentication
- [ ] Can sign up with email/password
- [ ] Can sign in with email/password
- [ ] Can sign in with Google (if configured)
- [ ] Can sign out
- [ ] Profile photo upload works

### Conversations
- [ ] Can create 1-on-1 conversation
- [ ] Can create group conversation (3-20 users)
- [ ] Conversation list shows last message
- [ ] Conversation list shows timestamp
- [ ] Can see unread indicator (if implemented)

### Advanced Features
- [ ] Read receipts work (✓ and ✓✓)
- [ ] Presence indicators work (online/offline)
- [ ] Typing indicators work (if implemented)
- [ ] Image upload works
- [ ] Image compression works (< 2MB)
- [ ] Pagination works (load older messages)

### Error Handling
- [ ] Error messages are user-friendly (not technical)
- [ ] Can retry failed messages
- [ ] Offline banner appears when no connection
- [ ] Empty states show helpful messages
- [ ] Skeleton loaders appear while loading

### UX Polish
- [ ] App loads quickly (< 2s)
- [ ] Navigation is smooth
- [ ] No UI jank or glitches
- [ ] Buttons respond immediately
- [ ] Forms validate properly

---

## 🏁 Final Sign-Off

**Before marking MVP complete, verify:**

### All Tests Pass
- [ ] All 11 manual tests completed
- [ ] All issues documented
- [ ] Critical bugs fixed
- [ ] 73/73 automated tests still passing

### Quality Standards
- [ ] No crashes during testing
- [ ] No data loss observed
- [ ] Performance acceptable on target devices
- [ ] User experience is smooth

### Documentation
- [ ] Known issues documented
- [ ] Test results recorded
- [ ] Screenshots captured (if needed)

---

## 📝 Issue Tracking Template

If you find issues, document them:

```markdown
### Issue: [Brief Description]
**Severity:** Critical / High / Medium / Low
**Test:** [Which test number]
**Steps to Reproduce:**
1. Step 1
2. Step 2
3. Step 3

**Expected:** [What should happen]
**Actual:** [What actually happened]
**Device:** [iOS/Android, version, model]
**Screenshots:** [Attach if available]
```

---

## ⏱️ Time Estimate

- **E2E Tests (1-8):** ~2 hours
- **Performance Tests (9-11):** ~1 hour
- **Feature Verification:** ~30 minutes
- **Issue Documentation:** Variable
- **Total:** ~3-4 hours for thorough testing

---

## 🎯 Success Criteria Summary

**MVP is ready for users when:**
- ✅ All 8 E2E scenarios pass
- ✅ Performance meets targets (60fps, < 200MB)
- ✅ No console errors during normal use
- ✅ All 11 MVP features verified working
- ✅ Critical bugs resolved

**Current Status:**
- Code: ✅ Production-ready
- Automated Tests: ✅ 73/73 passing
- Manual Tests: ⏳ Awaiting execution

---

## 📞 Need Help?

If you encounter issues:
1. Check `docs/E2E-TESTING-GUIDE.md` for detailed steps
2. Review `docs/PR17-FINAL-TESTING-SUMMARY.md` for context
3. Check Firebase Console for data issues
4. Review console logs for errors
5. Check `memory/` files for project context

---

**Ready to test?** Start with Test 1 and work your way through! 🚀

Good luck! 🎉

