Refactor nudge generator for idempotency, scale, and correctness.

GOAL
- Prevent duplicate nudges
- Reduce Firestore load
- Ensure only confirmed sessions are considered
- Add consistent metadata for client rendering

CHANGES
1) Replace wasNudgeSent/logNudge with reserveNudge(entityId, nudgeType, conversationId?)
   - deterministic id: `${nudgeType}__${entityId}`
   - use doc.create() for idempotency
   - return true if reserved, false if already exists
   - update sendPostSessionNotePrompt and sendLongGapAlert to call reserveNudge BEFORE writing a message

2) Query tuning
   - detectRecentlyEndedSessions: add .limit(200); keep range on endTime; status == 'confirmed'
   - detectLongGaps: add status == 'confirmed', add oneYearAgo lower bound and .limit(2000)
   - Document required indexes in a comment

3) Timezone formatting (prepare)
   - Import getUserTimezone in processors to format any dates if included later

4) Message metadata
   - Add messageType: 'system_nudge' in meta for both nudge types

5) Math/guards
   - Use Math.floor when computing whole days/hours
   - Guard toDate() calls and skip malformed docs

6) Concurrency (optional if easy)
   - Process sends with a small concurrency pool (<=10)

ACCEPTANCE
- Double-invoking processors produces at most one message per nudge type per entity (event or conversation)
- Queries succeed at scale (limits, indexes)
- TS compiles cleanly; logs remain privacy-safe
