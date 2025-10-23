MessageAI for Tutors
1. Goal
Build a lightweight messaging app for private tutors, parents, and students that keeps everyone aligned on schedules, progress, and homework, while AI automatically detects scheduling conflicts and drafts reschedule suggestions.
This project meets MVP + rubric requirements by implementing five core AI features and one advanced capability (Proactive Conflict Assistant).

2. Key Personas
Persona
Needs
Tutor
Communicate progress clearly, manage schedule, avoid double-booking
Parent
Understand child’s strengths/weaknesses, see schedule, receive timely updates
Student
Know homework, stay organized, avoid missed sessions


3. Core AI Features
#
Feature
Description
1
Smart Calendar Extraction
Detect session times mentioned in chat → create shared calendar events (/sessions/{id})
2
Decision Summarization
Summarize recent messages into a clear progress update (e.g., “Focus: factoring; next test Fri.”)
3
Priority Highlighting
Flag urgent/reschedule/test messages for quick visibility
4
RSVP Tracking
Tutors propose times; parents/students confirm or decline
5
Deadline / Reminder Extraction
Identify homework or test deadlines → auto-create reminders (/todos/{id})
6
Advanced AI – Proactive Conflict Assistant
Detect overlapping sessions or travel conflicts → suggest new times + draft polite reschedule message


4. User Flow
Tutor or parent mentions a time in chat → AI proposes session card.


When confirmed, session syncs to both calendars.


If overlap detected → Conflict Assistant suggests two alternatives and drafts a message.


Weekly summaries auto-generated from chat (“Covered Ch. 7; homework due Fri.”).


Priority messages + reminders appear in the Priority tab.

Lets start by applying some UI updates to match the roadmap.

PR-01: App navigation + tab scaffolding

Branch: feat/ui-tabs-shell
Summary: Introduce 5-tab layout (Chats, Schedule, Tasks, Assistant, Profile) using Expo Router. Create empty screen stubs + shared tab icon components. No backend changes.

Scope (files)

app/(tabs)/_layout.tsx (update Tab config + icons)

app/(tabs)/index.tsx (existing Chats list remains default tab)

app/(tabs)/schedule.tsx (new)

app/(tabs)/tasks.tsx (new)

app/(tabs)/assistant.tsx (new)

app/(tabs)/profile.tsx (existing/rename target if needed)

src/components/TabIcon.tsx (new)

src/components/SectionHeader.tsx (new, reused list header)

Implementation notes

Keep Chats as today’s behavior (reuse useConversations, ConversationListItem).

Add tab bar icons via TabIcon.

Screens render skeleton/empty states now; subsequent PRs fill content.

Acceptance

Tabs render; navigation works on iOS/Android.

Deep link to /chat/[id] still works.

No regressions in Chats list.

Test plan

Manual: switch tabs, deep link to chat, hot reload.

Unit: trivial render tests for new screens.

PR-02: Chat room upgrades (assistant identity, RSVP/status chips, inline cards, quick actions)

Branch: feat/ui-chat-enhancements
Summary: Enhance /chat/[id].tsx with AI-aware visual elements and scheduling affordances.

Scope (files)

app/chat/[id].tsx (augment header, message rendering, bottom sheet actions)

src/components/StatusChip.tsx (new) — variant: 'pending'|'confirmed'|'declined'|'conflict'

src/components/AssistantBubble.tsx (new) — distinct style for system/assistant posts

src/components/EventCard.tsx (new) — title, time range, participants, “Open details”

src/components/RSVPButtons.tsx (new) — Accept / Decline

src/components/DeadlineCard.tsx (new) — due date, assignee, “Mark done”

src/components/ConflictWarning.tsx (new) — inline banner; links to alternatives

src/components/AIQuickActions.tsx (new) — bottom sheet: Suggest Time, Summarize, Create Deadline, Set Reminder

src/hooks/useThreadStatus.ts (new) — derive RSVP/confirmation state for header chip

src/components/MessageBubble.tsx (extend) — render inline cards based on message.type/meta

src/components/MessageInput.tsx (extend) — integrate AIQuickActions

Implementation notes

Header: show StatusChip (Pending/Confirmed/Declined) when thread has an active invite.

Messages: detect assistant/system messages via senderId === 'assistant' or meta.role === 'assistant' → render AssistantBubble.

Inline UX: when a message has meta.eventId render EventCard; meta.rsvp → RSVPButtons; meta.deadlineId → DeadlineCard; meta.conflict → ConflictWarning.

Quick actions: static commands now; wire to orchestrator later (onPress triggers no-op toast or navigator to relevant tab).

Acceptance

Header chip reflects mock RSVP state.

Assistant messages render in distinct style.

Inline cards render from mock meta fields without crashing.

Quick actions bottom sheet opens and buttons fire callbacks.

Test plan

Snapshot tests for new components.

RTL tests for AIQuickActions open/close and button callbacks.

PR-03: Schedule tab (week/month views, event list, details sheet, “Add Lesson”)

Branch: feat/ui-schedule-tab
Summary: Add Schedule screen with a week view, event list grouped by day, and an event detail bottom sheet. Include “Add Lesson” modal (text → time parse later).

Scope (files)

app/(tabs)/schedule.tsx (fill in UI)

src/components/CalendarHeader.tsx (new) — Month/Week toggle + week scroller

src/components/EventList.tsx (new) — grouped by day

src/components/EventListItem.tsx (new)

src/components/EventDetailsSheet.tsx (new) — details, participants, RSVP status, actions

src/components/FAB.tsx (new) — “Add Lesson”

src/hooks/useEvents.ts (new, placeholder) — return mocked events by current user/thread until backend lands

Implementation notes

Prefer a custom lightweight week list (FlatList + day columns) to avoid new heavy deps; keep performant on low-end devices.

EventDetailsSheet supports “Message group”, “Reschedule”, “Cancel” (stub actions).

“Add Lesson” opens a simple modal with text field; for now, it just closes (wire to AI later).

Acceptance

Week view renders; scrolls.

Tapping an event opens details sheet.

FAB opens modal; cancel works.

No performance regressions vs. Chats tab.

Test plan

Render tests for list/grouping and details sheet.

PR-04: Tasks tab (deadlines list, filters, quick create)

Branch: feat/ui-tasks-tab
Summary: Add Tasks screen for deadlines: Upcoming, Overdue, Completed sections; quick create; simple assignee selector.

Scope (files)

app/(tabs)/tasks.tsx (fill in UI)

src/components/DeadlineList.tsx (new) — sections + empty states

src/components/DeadlineCreateModal.tsx (new) — title, due date/time, assignee selector

src/components/ProgressRing.tsx (new)

src/hooks/useDeadlines.ts (new, placeholder)

Implementation notes

Use existing user/friends data to populate assignees.

Quick create drops a mock deadline into local state (wire later).

Acceptance

Sectioned lists render; empty states look correct.

Create flow adds an item to the upcoming section (local/mock).

Each item links back to its thread (opens /chat/[id]).

Test plan

Render + interaction tests for create modal and section logic.

PR-05: Assistant tab (insights widgets + quick actions)

Branch: feat/ui-assistant-tab
Summary: Add an Assistant dashboard with simple widgets and quick actions—pure UI scaffolding now.

Scope (files)

app/(tabs)/assistant.tsx (fill in UI)

src/components/InsightCard.tsx (new)

src/components/InsightsGrid.tsx (new) — responsive grid layout

src/components/AssistantActionRow.tsx (new) — “Resend reminders”, “Summarize week”, etc.

Implementation notes

Example widgets:

“Unconfirmed invites” count (mock)

“Upcoming lessons (3 days)”

“Deadlines due soon”

Actions currently no-op; hook to orchestrator later.

Acceptance

Grid renders 3–5 widgets.

Tapping actions shows a toast (placeholder).

Test plan

Snapshot + simple interaction tests.

Cross-PR design system touches (kept minimal)

Styling: adopt nativewind classes across new components; focus on consistent paddings (p-4), rounded cards (rounded-2xl), soft shadows.

Typography: introduce Text wrappers (Title, Body, Caption) to unify sizes and line heights.

Color tokens: centralize status colors for StatusChip (pending/confirmed/declined/conflict).

Dev notes & handoff to future AI work (non-blocking)

Each UI surface exposes clear callbacks you can later connect to your Vercel AI SDK orchestrator:

onSuggestTime(), onCreateLesson(text), onRSVP(response), onCreateDeadline(form), onSummarize().

Add thin adapters later that call your Cloud Function endpoint; keep UI unchanged.

Risk & rollback

Scope isolation: Every PR is additive with new files or small extensions to chat/[id].tsx and core components; low regression risk.

Rollback: Revert PR by PR without touching existing messaging flows.