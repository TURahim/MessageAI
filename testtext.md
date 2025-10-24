# MessageAI Test Scenarios

Comprehensive test scenarios for validating AI scheduling, task management, RSVP handling, and duplicate prevention.

---

## 🎯 Priority Tests - Fix Validation

### Test 1: "Reminder" + Scheduling (PRIMARY FIX)
**Goal:** Verify messages with "reminder" word but containing time + session are classified as SCHEDULING

#### Test Messages:
```
oh hey just a reminder that you have a lesson for 5 pm on sunday
```
```
reminder we have a lesson Sunday 5pm
```
```
just reminding you about our session tomorrow at 3
```
```
don't forget class next Tuesday 4pm
```

**Expected Behavior:**
- ✅ Creates EVENT in Schedule tab (not task)
- ✅ Shows loading card "Preparing your event..."
- ✅ Loading card disappears when confirmation arrives
- ✅ ONE confirmation message with EventCard
- ✅ Event visible to both participants

**Check Logs For:**
- `task: "scheduling"` (NOT "reminder")
- `🚫 Write already executed` should NOT appear (no duplicates)
- `✅ Event created in Firestore`

---

## 📅 Scheduling Tests

### Test 2: Standard Scheduling
```
Physics lesson next Sunday 5 pm
```
```
math tutoring tomorrow at 3pm
```
```
let's do English review Friday at 4:30
```
```
schedule a session for Tuesday morning
```

**Expected:**
- ✅ Loading card → EventCard transition
- ✅ Event in Schedule tab
- ✅ ONE confirmation message only

### Test 3: Scheduling with Duration
```
2-hour math session tomorrow at 2pm
```
```
physics review next week Monday 3pm to 5pm
```

**Expected:**
- ✅ Correct duration calculated
- ✅ Event shows proper time range

### Test 4: Ambiguous Time References
```
lesson next week
```
```
session sometime tomorrow
```
```
class in the afternoon
```

**Expected:**
- ✅ AI asks for clarification OR makes reasonable assumption
- ✅ Still creates event (default to 1 hour if unclear)

---

## 🔁 Duplicate Prevention Tests

### Test 5: Rapid Duplicate Messages
**Action:** Send SAME message twice within 2 seconds
```
Chemistry lesson Friday at 5pm
[WAIT 1 SECOND]
Chemistry lesson Friday at 5pm
```

**Expected:**
- ✅ Only ONE event created (idempotency)
- ✅ Second attempt returns existing event
- ✅ Check logs for: "✅ Event already exists (idempotent)"

### Test 6: Slightly Different Wording (Same Intent)
```
Physics lesson Sunday 5pm
[THEN]
physics session Sunday at 5:00 PM
```

**Expected:**
- ✅ Should create ONE event (normalized title matches)
- ✅ Idempotency key matches despite wording differences

### Test 7: Confirmation Message Deduplication
**Action:** If system somehow calls messages.post_system twice
- Check logs for: "✅ Confirmation already exists (deduped)"
- Verify only ONE confirmation appears in chat

---

## 📝 Task vs Deadline vs Reminder Classification

### Test 8: Deadlines (Homework with Due Date)
```
homework due Friday
```
```
test on Monday
```
```
submit essay by next Tuesday
```
```
quiz tomorrow morning
```

**Expected:**
- ✅ Creates TASK with due date
- ✅ Shows DeadlineCard (not EventCard)
- ✅ Task appears in Tasks tab
- ✅ Classification: `task: "deadline"`

### Test 9: Generic Tasks (No Due Date)
```
review chapter 5
```
```
practice problems
```
```
finish the essay soon
```

**Expected:**
- ✅ Creates task WITHOUT specific due date
- ✅ Classification: `task: "task"`

### Test 10: Pure Reminders (No Session Time)
```
remember to bring your textbook
```
```
don't forget the homework
```
```
reminder to review notes
```

**Expected:**
- ✅ Should be classified as "reminder"
- ✅ Creates task or sends notification
- ✅ Does NOT create calendar event

---

## ✅ RSVP & Cancellation Tests

### Test 11: RSVP Acceptance
**Setup:** Create event first, then respond
```
[CREATE EVENT: "Math lesson Sunday 5pm"]
[THEN SEND:]
yes that works
```
```
sounds good!
```
```
I'll be there
```

**Expected:**
- ✅ Event status updates to "confirmed"
- ✅ RSVP recorded in event document

### Test 12: RSVP Decline / Cancellation
```
[AFTER EVENT CREATED:]
sorry I can't make it for the physics lesson this sunday
```
```
need to cancel the math session
```
```
can't make it tomorrow
```

**Expected:**
- ✅ Event status updates to "declined"
- ✅ Event still visible but marked as cancelled
- ✅ Both participants see the update

### Test 13: Cancellation Without Event ID
```
actually i have to cancel the math lesson at 5 tomorrow
```

**Expected:**
- ✅ System finds recent event by title/time match
- ✅ Updates event status to declined
- ✅ No "event not found" errors

---

## 🔄 Loading Card & UX Tests

### Test 14: Loading Card Lifecycle
**Action:** Send scheduling message and observe carefully

**Expected Sequence:**
1. ⏳ Loading card appears immediately (~100ms)
2. ⏳ Shows "AI ASSISTANT" with pulsing animation
3. ⏳ Text: "Preparing your event..."
4. ✅ Loading card disappears
5. ✅ Confirmation message with EventCard appears
6. ✅ NO duplicates
7. ✅ NO stuck loading cards

**Visual Check:**
- Loading card should match assistant message style (purple accent, white background)
- Smooth transition (no flicker)

### Test 15: Slow Network Simulation
**Action:** Enable throttling in DevTools, send message

**Expected:**
- ✅ Loading card stays visible during processing
- ✅ Eventually replaced by confirmation
- ✅ No timeout errors

---

## 🚨 Urgent Message Tests

### Test 16: Urgent Cancellations
```
URGENT: need to cancel today's session
```
```
emergency - can't make it to the lesson in 30 minutes
```

**Expected:**
- ✅ Classified as "urgent"
- ✅ Push notification sent (if configured)
- ✅ Event cancelled
- ✅ High confidence score (≥0.85)

### Test 17: Not Urgent (Should NOT Trigger)
```
urgent question about homework
```
```
we should reschedule sometime
```

**Expected:**
- ✅ NOT classified as urgent
- ✅ No push notifications
- ✅ Normal processing

---

## 🧪 Edge Cases & Error Handling

### Test 18: Invalid Time Expressions
```
lesson yesterday at 5pm
```
```
session last week
```

**Expected:**
- ✅ AI asks for clarification
- ✅ OR interprets as future date (e.g., "next week")
- ✅ No crashes or errors

### Test 19: Missing Information
```
schedule a lesson
```
```
create event
```

**Expected:**
- ✅ AI asks for missing details (when, with whom)
- ✅ OR makes reasonable defaults

### Test 20: Multiple Actions in One Message
```
homework due Friday and also let's schedule a review session Saturday at 2pm
```

**Expected:**
- ✅ System should handle the higher priority action (scheduling)
- ✅ May create both deadline AND event
- ✅ No duplicates of either

---

## 📊 Log Validation Checks

After each test, check Firebase logs:

```bash
firebase functions:log --only onMessageCreated | tail -100
```

### ✅ Success Indicators:
- `✅ Message passed gating` with correct task type
- `📅 schedule.create_event called`
- `✅ Event created in Firestore`
- `✅ Assistant message posted`
- `🗑️ Removed loading message(s)` (count: 1)
- `✅ Full AI processing complete`

### 🚫 Warning Signs (Should NOT Appear):
- `🚫 Write already executed this round` (indicates duplicate prevention working, but shouldn't happen in normal flow)
- `❌ Tool execution failed`
- `⚠️ Could not clean up loading message` (acceptable, but shouldn't persist)
- `UNKNOWN_TOOL` errors
- Multiple events with same idempotency key

### 📝 Idempotency Logs (GOOD):
- `✅ Event already exists (idempotent)`
- `✅ Task already exists (idempotent)`
- `✅ Confirmation already exists (deduped)`

---

## 🎨 UI/UX Manual Checks

### Test 21: Multi-User Event Visibility
**Action:** Create event from User A's phone
**Check:** 
- ✅ User B sees event in their Schedule tab
- ✅ Both users see same event details
- ✅ Both users can RSVP

### Test 22: AssistantBubble Styling Consistency
**Check:**
- ✅ Loading card matches AssistantBubble style
- ✅ Purple accent color (#7C3AED)
- ✅ Light purple background (#F8F5FF)
- ✅ ✨ sparkle icon
- ✅ "AI ASSISTANT" label

### Test 23: EventCard Display
**Check:**
- ✅ Shows event title
- ✅ Shows formatted date/time
- ✅ Shows participant count
- ✅ Tappable to view details
- ✅ Status indicator (pending/confirmed/declined)

### Test 24: Schedule Tab Updates
**Action:** Create several events
**Check:**
- ✅ Events appear in chronological order
- ✅ Past events are distinguished from future
- ✅ Real-time updates (no manual refresh needed)

---

## 🔍 Performance Tests

### Test 25: Response Time
**Measure:**
- Time from message send → loading card appears
- Time from loading card → confirmation appears

**Target:**
- Loading card: <200ms
- Total completion: <5 seconds

### Test 26: Concurrent Users
**Action:** Have 2+ users send scheduling messages simultaneously
**Expected:**
- ✅ Both processed correctly
- ✅ No race conditions
- ✅ No duplicate events

---

## 🛡️ Regression Tests

### Test 27: Original Functionality Still Works
**Action:** Test features that existed before recent changes

#### Standard Chat:
```
how are you?
thanks!
see you later
```
**Expected:** No AI processing, normal chat

#### Image Upload:
**Expected:** Images upload and display correctly

#### Profile Navigation:
**Expected:** Navigation still works

---

## 📱 Device-Specific Tests

### Test 28: iOS Specific
- Test on iPhone (real device if possible)
- Check notification permissions
- Verify time zone handling

### Test 29: Android Specific
- Test on Android device
- Check notification delivery
- Verify back button behavior

---

## 🎯 Acceptance Criteria Summary

Run through all tests above. System passes if:

1. ✅ **Classification**: "reminder + session + time" → scheduling (NOT reminder task)
2. ✅ **No Duplicates**: ONE event/task per intent regardless of retries
3. ✅ **No Duplicate Messages**: ONE confirmation per entity
4. ✅ **Loading Cards**: Always appear and disappear cleanly
5. ✅ **Multi-User**: Events visible to all participants
6. ✅ **RSVP**: Works for both accept and decline
7. ✅ **Logs**: No errors, proper deduplication messages
8. ✅ **Performance**: Loading card <200ms, total <5s
9. ✅ **UI Consistency**: All cards match design system

---

## 📝 Test Execution Checklist

- [ ] Test 1-4: Scheduling (especially reminder variants)
- [ ] Test 5-7: Duplicate prevention
- [ ] Test 8-10: Task/deadline/reminder classification
- [ ] Test 11-13: RSVP and cancellations
- [ ] Test 14-15: Loading card UX
- [ ] Test 16-17: Urgent messages
- [ ] Test 18-20: Edge cases
- [ ] Test 21-24: UI/UX manual checks
- [ ] Test 25-26: Performance
- [ ] Test 27: Regression
- [ ] Test 28-29: Device-specific

**After all tests:** Review logs for any warnings or errors, verify Firestore data integrity.

---

## 🐛 Bug Report Template

If issues found, use this format:

```
**Test:** [Test number and name]
**Input:** [Exact message sent]
**Expected:** [What should happen]
**Actual:** [What actually happened]
**Logs:** [Relevant log entries]
**Screenshots:** [If applicable]
**Device:** [iOS/Android, version]
**Reproducible:** [Yes/No, steps to reproduce]
```

---

**Last Updated:** October 24, 2025
**Tests Created For:** Scheduling Flow Stabilization (PR)
**Related Docs:** `functions/src/ai/SuggestedChangesAI.md`

