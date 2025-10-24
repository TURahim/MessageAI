Autonomous Monitor Reliability & Idempotency Upgrade

Goal
Refactor the Autonomous Monitor module to improve correctness, reliability, and idempotency now that user timezones are supported.
Focus on these areas: event confirmation logic, idempotent nudges, timezone usage, and query scalability.

🧩 Scope

Modify only the file(s) related to the Autonomous Monitor (autonomousMonitor.ts and any helpers it imports).
Do not alter unrelated services (e.g., AI analyzers or RSVP interpreters).
Preserve the current Firestore schema and log style (emoji-prefixed logs).

⚙️ Changes Required
1️⃣ Fix “confirmed” event logic

Currently an event is considered confirmed if all participants have any response — even declines.
Update logic to treat an event as confirmed only if all required participants have explicitly accepted.

Organizer (createdBy) should be excluded from required participants.

Skip or warn on events with no participants.

Example:

const required = participants.filter(uid => uid !== event.createdBy);
const accepted = required.filter(uid => rsvps[uid]?.response === 'accept').length;
const allAccepted = required.length > 0 && accepted === required.length;
if (!allAccepted) { /* unconfirmed */ }

2️⃣ Use user timezones for formatting

Use the getUserTimezone(event.createdBy) helper before formatting dates.

Replace toLocaleString() with:

const tz = await getUserTimezone(event.createdBy);
const fmt = new Intl.DateTimeFormat('en-CA', {
  weekday: 'short', month: 'short', day: 'numeric',
  hour: 'numeric', minute: '2-digit', hour12: true, timeZone: tz,
});
const startLabel = fmt.format(event.startTime);


Include (tz) in the nudge message to make it explicit.

3️⃣ Add idempotency for nudges

Prevent duplicate nudges by writing an idempotent record before sending the message.

Replace wasNudgeSent() + logNudge() with a single atomic write:

const id = `${event.eventId}__${nudgeType}`;
await admin.firestore().collection('nudge_logs').doc(id).create({
  eventId: event.eventId,
  conversationId: event.conversationId,
  nudgeType,
  sentAt: admin.firestore.FieldValue.serverTimestamp(),
});


If create() throws “already exists,” skip sending the message and log:

logger.info('⏭️ Nudge already logged; skipping send', { eventId });

4️⃣ Add query limit + index note

Add a .limit(500) safeguard to your Firestore event query.

Add a code comment noting the required composite index:

// Firestore index: events(status ASC, startTime ASC)

5️⃣ Improve hours calculation + edge handling

Use Math.floor(hoursTillStart) instead of rounding.

Handle events with zero participants:

if (required.length === 0) {
  logger.warn('⚠️ Event has no participants; skipping', { eventId });
  continue;
}

6️⃣ Add message metadata consistency

When creating the nudge message, set:

messageType: 'system_nudge',
createdAt: admin.firestore.FieldValue.serverTimestamp(),


This helps the client render system messages differently and sort correctly.

7️⃣ Add better observability

Add correlationId (eventId substring) to every log line in this module.

Log timing stats:

Detection duration (event query → filter complete)

Total processing duration (start → all nudges sent)

✅ Acceptance Criteria

 “Confirmed” logic checks accepted responses only.

 Time formatting uses each tutor’s timezone via getUserTimezone().

 Duplicate nudges prevented via idempotent log documents.

 Query safely limited and indexed.

 hoursTillStart always floored, not rounded.

 Events with no participants are skipped gracefully.

 All logs include a correlationId and step timings.

 No Firestore schema changes required.

 TypeScript compiles cleanly; all logger calls remain consistent.

🧠 Optional Stretch (if Cursor has bandwidth)

Extract new utility functions:

isEventUnconfirmed(event) → encapsulates RSVP logic.

sendTemplateNudge(event, templateId) → generic for future templates.

Add unit tests for:

Events with mixed accept/decline.

Duplicate nudge run.

Timezone formatting differences.

🧩 Context Summary for Cursor

Firestore collections: /events, /conversations/{id}/messages, /nudge_logs.

User timezone is now stored under /users/{uid}.timezone.

This function runs as a scheduled Cloud Function every few hours.