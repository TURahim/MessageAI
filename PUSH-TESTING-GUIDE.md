# Quick Push Notification Testing Guide (One Device)

## Prerequisites

- ✅ iPhone (physical device)
- ✅ EAS CLI installed: `npm install -g eas-cli`
- ✅ Expo account (free)
- ✅ Cloud Functions deployed

---

## Step-by-Step Testing Process

### Step 1: Deploy Cloud Functions (One-Time Setup)

```bash
cd /Users/tahmeedrahim/Projects/MessageAI/functions
npm install
cd ..
firebase deploy --only functions
```

**Expected output:**
```
✔ functions[sendMessageNotification(us-central1)]: Successful create operation
✔ Deploy complete!
```

**Note:** This requires Firebase Blaze plan. If not enabled, enable it in Firebase Console first.

---

### Step 2: Build Development App for iPhone

```bash
cd /Users/tahmeedrahim/Projects/MessageAI/app
eas build --profile development --platform ios
```

**What happens:**
1. EAS CLI will ask you to login (if not already)
2. Build starts on Expo servers (~10-15 minutes)
3. You'll get a link to track build progress

**Build progress link:**
```
https://expo.dev/accounts/[your-account]/projects/app/builds/[build-id]
```

---

### Step 3: Install on Your iPhone

**Option A: Install via EAS CLI (Easiest)**
```bash
# After build completes
eas build:run -p ios
```

This will:
1. Download the .ipa file
2. Install directly on connected iPhone via USB

**Option B: Download from EAS Dashboard**
1. Open build link from Step 2
2. Click "Download" button
3. Scan QR code with iPhone camera
4. Install the app

---

### Step 4: Get Your Push Token

1. **Open the app on your iPhone**
2. **Login or signup** (this triggers push token registration)
3. **Check Xcode console logs** OR **Firebase Console**

**Via Xcode Console:**
```
1. Connect iPhone to Mac
2. Open Xcode → Window → Devices and Simulators
3. Select your iPhone
4. Click "Open Console"
5. Filter by "MessageAI"
6. Look for: 📱 Expo push token obtained: ExponentPushToken[xxxxxx]
```

**Via Firebase Console:**
```
1. Open Firebase Console
2. Go to Firestore Database
3. Navigate to users/{your-uid}
4. Copy the pushToken field value
```

**Your token will look like:**
```
ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]
```

---

### Step 5: Send Test Notification

1. **Open Expo Push Notification Tool:**
   https://expo.dev/notifications

2. **Fill in the form:**

```
┌─────────────────────────────────────┐
│ Send a notification                  │
├─────────────────────────────────────┤
│ To (Expo Push Token):               │
│ ExponentPushToken[your-token-here]  │
│                                      │
│ Title:                               │
│ John Doe                            │
│                                      │
│ Body:                                │
│ Hey, testing push notifications!    │
│                                      │
│ JSON Data:                           │
│ {                                    │
│   "conversationId": "test123",      │
│   "type": "message"                 │
│ }                                    │
│                                      │
│ [Send a Notification]               │
└─────────────────────────────────────┘
```

3. **Click "Send a Notification"**

---

### Step 6: Verify Notification

**Your iPhone should show:**

**If app is in foreground (open):**
```
┌────────────────────────┐
│ 🔔 John Doe           │
│ Hey, testing push!    │
└────────────────────────┘
```

**If app is in background/closed:**
- Lock screen notification
- Banner notification
- Badge on app icon

**Tap the notification:**
- App opens
- Navigates to conversation (if conversationId provided)

---

## Testing Different Scenarios

### Test 1: Foreground Notification

```
1. Open app on iPhone
2. Go to home screen (NOT in a chat)
3. Send notification via Expo tool
4. ✅ Should see banner at top of app
```

### Test 2: Background Notification

```
1. Close app (home button)
2. Send notification via Expo tool
3. ✅ Should see lock screen notification
4. Tap it → App opens → Navigates to chat
```

### Test 3: Suppression

```
1. Open app
2. Create/open a conversation
3. Note the conversationId from URL or console
4. Send notification with that conversationId in data
5. ✅ Should be suppressed (no notification shown)
   Reason: User is viewing that conversation
```

### Test 4: Multiple Notifications

```
1. Send 3-4 notifications quickly via Expo tool
2. ✅ All should appear
3. ✅ Badge count should increase
```

---

## Troubleshooting

### "Push token not showing in console"

**Check:**
```bash
# In Firebase Console → Firestore
# Navigate to: users/{your-uid}
# Check if pushToken field exists
```

**If missing:**
- Verify you're on a physical device (not simulator)
- Check app logs for errors
- Ensure permissions were granted

### "Notification not received"

**Check Cloud Function logs:**
```bash
firebase functions:log --only sendMessageNotification
```

**Look for:**
```
📬 New message created
📤 Sending notifications to 1 recipient(s)
✅ Queued push for user
```

### "Invalid push token error"

**Issue:** Token format is wrong

**Solution:**
- Copy entire token including `ExponentPushToken[...]`
- Don't add quotes or extra characters
- Paste directly into Expo tool

---

## Quick Reference

**Expo Push Tool:** https://expo.dev/notifications

**Required Fields:**
- **To:** Your ExponentPushToken
- **Title:** Sender name (e.g., "Test User")
- **Body:** Message text
- **Data:** `{"conversationId": "test123", "type": "message"}`

**Optional Fields:**
- Sound: default
- Badge: 1
- Priority: high

---

## Expected Timeline

- Deploy functions: 5-10 minutes (one-time)
- Build app: 10-15 minutes (one-time)
- Install on iPhone: 2-3 minutes
- Get push token: 1 minute
- Send test push: 30 seconds
- **Total:** ~20-30 minutes for first test

After setup, testing each notification takes 30 seconds!

---

## Success Checklist

- [ ] Firebase Blaze plan enabled
- [ ] Cloud Functions deployed successfully
- [ ] EAS development build created
- [ ] App installed on iPhone
- [ ] Logged into app
- [ ] Push token obtained from console or Firestore
- [ ] Notification sent via Expo tool
- [ ] Notification received on iPhone
- [ ] Tap navigation works
- [ ] Suppression tested (viewing conversation)

---

## Next Steps After Successful Test

1. ✅ Test with real messages (create second account)
2. ✅ Test group chat notifications
3. ✅ Test image message notifications
4. ✅ Verify Cloud Function logs
5. ✅ Document any issues found

---

**Ready to start? Begin with Step 1: Deploy Cloud Functions**

```bash
cd /Users/tahmeedrahim/Projects/MessageAI/functions
npm install
cd ..
firebase deploy --only functions
```

