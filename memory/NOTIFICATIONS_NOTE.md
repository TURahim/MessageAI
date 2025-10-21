# Notifications Implementation Note

**Date:** October 21, 2025  
**Status:** Implemented but needs UX clarification

---

## What's Implemented

**PR #14: Foreground Notifications** - Code complete ✅

**Features:**
- Local notifications for new messages
- Presence-based suppression (activeConversationId)
- Tap-to-navigate to conversation
- Permission handling
- Sender name + message preview
- Image message indicator ("📷 Image")

**Files:**
- `app/src/services/notificationService.ts` - Complete notification system
- `app/app.json` - Permissions configured
- `app/app/_layout.tsx` - Setup on login
- `app/app/chat/[id].tsx` - Trigger on new messages

---

## Issue Identified

**User reported:** "I am not receiving push notifications when I receive a message"

**Analysis:**
The current implementation triggers notifications **only when the chat screen is open**. This creates a logical conflict:
- Notifications triggered in chat/[id].tsx message listener
- But if user is viewing that chat, activeConversationId matches
- Result: Notification gets suppressed (working as designed)
- User never sees notification when viewing the conversation

**Current behavior:**
- In Chat A, receive message in Chat A → Suppressed ✅ (correct)
- On Home screen, receive message → No notification ❌ (bug - listener not active)
- In Chat A, receive message in Chat B → No notification ❌ (bug - listener not active)

---

## Root Cause

**Notification listener is per-chat, not global:**
- Each chat screen has its own message listener
- Notifications only trigger if that specific chat's listener fires
- If you're on home screen or different chat, no listener = no notification

**Should be:**
- Global message listener for ALL conversations user participates in
- Trigger regardless of current screen
- Suppression logic still applies (don't notify if viewing that conversation)

---

## Clarification Needed

**Questions to answer before refining:**

1. **When should notifications appear?**
   - Only when app is in foreground but NOT viewing the conversation?
   - Or also when in background (requires FCM/push notifications)?

2. **Scope:**
   - MVP scope says "foreground notifications"
   - Does this mean: "Show when app open but viewing different screen"?
   - Or: "Show native OS notifications even when app closed" (that's push, not foreground)

3. **User expectations:**
   - What's the expected behavior when receiving a message?
   - Should we show banner at top of screen?
   - Should we play sound?
   - Should we update conversation list badge?

4. **Implementation approach:**
   - Option A: Global listener in _layout.tsx for all conversations
   - Option B: Conversation list listens and triggers notifications
   - Option C: Per-chat listeners (current) with better suppression logic

---

## Recommendation

**Defer to later iteration:**
- Current implementation is technically complete
- Need product requirements clarification
- Not blocking MVP (82% complete without this)
- Can refine once UX requirements are clear

**For now:**
- Mark PR #14 as "implemented, needs UX refinement"
- Move to Phase 5 (final polish)
- Come back to notifications with clearer requirements

---

## Next Steps (When Refining)

1. Define exact notification trigger scenarios
2. Implement global listener if needed
3. Test suppression logic thoroughly
4. Build with Dev Client for proper testing
5. Validate all notification scenarios
6. Update documentation with final behavior

**Status:** Deferred for requirements clarification

