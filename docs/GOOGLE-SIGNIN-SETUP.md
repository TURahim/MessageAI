# Google Sign-In Setup Guide

## Prerequisites
- Firebase project created
- Firebase Authentication enabled

---

## Step 1: Enable Google Sign-In in Firebase Console

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project
3. Navigate to **Authentication** → **Sign-in method**
4. Click on **Google** provider
5. Toggle **Enable**
6. Add a **Project support email** (required)
7. Click **Save**

---

## Step 2: Get OAuth Client IDs

Firebase automatically creates OAuth clients for you, but you need to retrieve the client IDs.

### For Web (Development Testing)

1. In Firebase Console, go to **Project Settings** (gear icon)
2. Scroll to **Your apps** section
3. Find your **Web app** config
4. Copy the **Web client ID** from the OAuth 2.0 Client ID section

### For iOS

1. In Firebase Console, go to **Project Settings**
2. Go to **Your apps** → **iOS app**
3. Download `GoogleService-Info.plist`
4. Find `REVERSED_CLIENT_ID` - this is your iOS client ID

**OR:**

Go to [Google Cloud Console](https://console.cloud.google.com):
1. Select your Firebase project
2. Go to **APIs & Services** → **Credentials**
3. Find the **iOS client** (created by Firebase)
4. Copy the **Client ID**

### For Android

1. In Firebase Console, go to **Project Settings**
2. Go to **Your apps** → **Android app**  
3. Download `google-services.json`
4. Find `client_id` field under `oauth_client`

**OR:**

Go to [Google Cloud Console](https://console.cloud.google.com):
1. Select your Firebase project
2. Go to **APIs & Services** → **Credentials**
3. Find the **Android client** (created by Firebase)
4. Copy the **Client ID**

---

## Step 3: Configure Environment Variables

Create or update `app/.env`:

```bash
# Google Sign-In Configuration
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=123456789-abcdefg.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=123456789-hijklmn.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=123456789-opqrstu.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_CLIENT_ID=123456789-vwxyz.apps.googleusercontent.com
```

**Notes:**
- `EXPO_PUBLIC_GOOGLE_CLIENT_ID` should be your **Web client ID** (for Expo Go testing)
- Each platform (iOS, Android, Web) has its own client ID
- All IDs end with `.apps.googleusercontent.com`

---

## Step 4: Update app.json (iOS Bundle ID)

For iOS to work properly, ensure your `app.json` has the correct bundle identifier:

```json
{
  "expo": {
    "ios": {
      "bundleIdentifier": "com.yourcompany.messageai"
    },
    "android": {
      "package": "com.yourcompany.messageai"
    }
  }
}
```

**Important:** The bundle ID must match what's registered in Firebase Console.

---

## Step 5: Testing

### Testing in Expo Go (Development)

1. Restart Metro:
   ```bash
   cd app
   pnpm start --clear
   ```

2. Reload the app (press `r`)

3. On Login screen, tap "🔐 Continue with Google"

4. **Expected behavior:**
   - Opens browser with Google sign-in
   - You select a Google account
   - Redirects back to app
   - You're logged in

### Testing on Physical Device (Production)

For production builds, you'll need:

1. **iOS:**
   ```bash
   eas build --profile production --platform ios
   ```
   Or use development build:
   ```bash
   npx expo run:ios
   ```

2. **Android:**
   ```bash
   eas build --profile production --platform android
   ```
   Or use development build:
   ```bash
   npx expo run:android
   ```

---

## Troubleshooting

### "Error 10" or "Sign-in cancelled"

**Cause:** Client ID mismatch

**Solution:**
1. Verify `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` matches your Firebase Web client ID
2. Restart Metro after changing `.env`

### "Redirect URI mismatch"

**Cause:** Expo redirect URI not whitelisted

**Solution:**
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. **APIs & Services** → **Credentials**
3. Click your Web client ID
4. Add to **Authorized redirect URIs**:
   ```
   https://auth.expo.io/@your-username/your-app-slug
   ```

### iOS: "Invalid client" error

**Cause:** iOS client ID missing or incorrect

**Solution:**
1. Verify `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` is set correctly
2. Check bundle ID in `app.json` matches Firebase
3. Make sure Google Sign-In is enabled in Firebase Console

### Android: Authentication error

**Cause:** SHA-1 certificate fingerprint not added to Firebase

**Solution:**
1. Get your SHA-1 fingerprint:
   ```bash
   cd android
   ./gradlew signingReport
   ```
2. Add SHA-1 to Firebase Console:
   - Go to **Project Settings** → **Your apps** → **Android app**
   - Add SHA-1 certificate fingerprint

---

## Files Modified

1. `app/src/services/authService.ts` - Added `signInWithGoogle()` and `useGoogleAuth()`
2. `app/app/(auth)/login.tsx` - Added Google Sign-In button
3. `app/package.json` - Added dependencies:
   - `expo-auth-session`
   - `expo-web-browser`
   - `expo-crypto`

---

## Security Notes

- ✅ Client IDs are **public** - it's safe to commit them
- ❌ **Never** commit Firebase Admin SDK private keys
- ✅ OAuth flow is secure - Google handles auth, Firebase verifies tokens
- ✅ Firestore rules still protect user data

---

## Next Steps

After Google Sign-In is working:
1. Test signup → creates Firestore user document
2. Test signin → authenticates existing user
3. Verify photo from Google account appears in Profile
4. Test on both iOS and Android devices

---

## Quick Reference

**Firebase Console Links:**
- Enable Google Auth: `console.firebase.google.com/project/YOUR_PROJECT/authentication/providers`
- Get Web Client ID: `console.firebase.google.com/project/YOUR_PROJECT/settings/general`

**Google Cloud Console:**
- View all OAuth clients: `console.cloud.google.com/apis/credentials`

**Expo Docs:**
- Google Auth: `docs.expo.dev/guides/google-authentication/`

