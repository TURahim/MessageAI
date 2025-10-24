Stabilize Multi-Action Scheduling Flow

Goal
Make the “schedule from chat” flow reliable and polished when a user says things like “Physics lesson next Sunday 5 pm”. The system must (a) create exactly one event or task, (b) post exactly one confirmation message, and (c) cleanly replace the loading card. No duplicates. No stuck placeholders.

Problems to fix

Misclassification (“reminder” vs “scheduling”)
Messages that mention the word “reminder” are being classified as reminder even when they clearly contain a date/time + lesson intent. This routes the model to the wrong tools (task/reminder) instead of the scheduling stack.

Duplicate actions in Round 2
With maxSteps: 3 the model sometimes calls multiple write tools in one pass (e.g., task.create twice + messages.post_system twice), producing duplicate cards.

Loading card never replaced
The placeholder remains because the app can’t reliably find/replace it (and an index error surfaced). Result: user sees a stuck “Preparing your event…” card in addition to final messages.

Required outcomes

A message like “physics lesson next Sunday 5 pm” is treated as scheduling, even if it contains “reminder” language.

For each user intent, the system performs one and only one persistent write (event or task) and one and only one confirmation message.

The loading card is always replaced (or removed) when the final assistant message arrives.

No duplicate cards or confirmations appear, regardless of retries, fallbacks, or multi-step orchestration.

Product constraints & guidance (implementation left to you)
A) Classification hardening (Gating → Router)

Add priority rules so “date/time + session/lesson/review” maps to scheduling even if the word “reminder” appears.

Add a post-gating heuristic: if text contains scheduling keywords + a parseable time, force route to scheduling.

Include a few test cases that reflect tutoring phrasing (“remind me we have a lesson on Sunday at 5pm” → scheduling).

B) Tool scope & step policy

For scheduling, expose only: time.parse, schedule.create_event, messages.post_system.

For reminder, expose only: task.create, reminders.schedule, messages.post_system.

In Round 2, keep multi-step capacity but enforce “one write tool per round”. Any subsequent write attempts in the same round become no-ops. Log and continue.

C) Idempotency & de-dup (server-side)

Introduce an idempotency key for writes (e.g., hash of conversationId + normalizedTitle + ISO time).

Before creating, check for an existing record with the same key; if found, skip creation and only ensure a single confirmation message exists.

Use a similar check to prevent duplicate messages.post_system for the same entity (e.g., meta.eventId/meta.taskId + type:"confirmation").

D) Loading card lifecycle

Assign a correlationId per intent.

When showing the placeholder, store its messageId and correlationId.

The final assistant message should carry the same correlationId, allowing a direct replace (don’t rely on a Firestore query to locate the placeholder).

If replacement fails, server removes the placeholder after posting the final message as a backstop.

Resolve the Firestore index error by defining the needed composite index or by eliminating the dependency on that query entirely via correlationId.

E) Prompt & orchestration nudge (not rigid)

Update the scheduling orchestration prompt with a short workflow checklist:
time.parse → schedule.create_event → messages.post_system (confirmation)
and the instruction “Stop only after these are complete.”

Keep Round 2 maxSteps high enough to do both actions, but rely on the write-once guard to prevent duplication.

Acceptance criteria

Routing: Phrases like “reminder we have a lesson Sunday 5pm” route to scheduling, not reminder.

Writes: Exactly one event (or task) is created per intent, even with retries or multi-step chains.

Confirmation: Exactly one confirmation message is posted per created entity.

Placeholder: The loading card always disappears (or is replaced) when the final message appears. No stuck placeholders.

Resilience: No duplicates in logs across Round 1/2, even with maxSteps: 3.

No index failures: Either the correct Firestore index exists, or replacement doesn’t depend on a query that needs a new index.

Instruction for Cursor:
Refactor the classification, tool policy, idempotency, and placeholder replacement logic to meet the outcomes above. Favor simple, robust server-side guards over complex client queries. Keep UX identical to our assistant card style and ensure the conversation feels seamless.