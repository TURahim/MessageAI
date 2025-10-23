# UI Reconciliation Analysis - JellyDMTasklist vs Shipped UI

**Date:** October 23, 2025  
**Purpose:** Identify and resolve collisions between proposed tasks and shipped UI (PRs 01-05)

---

## UI Mapping Table

| Shipped UI (JellyDM_UI.md) | Proposed in JellyDMTasklist.md | Status | Resolution |
|----------------------------|--------------------------------|--------|------------|
| **Routes & Screens** | | | |
| `app/(tabs)/schedule.tsx` ✅ | `app/(tabs)/schedule.tsx` | ✅ Match | Keep - Already shipped |
| `app/(tabs)/tasks.tsx` ✅ | `app/(tabs)/tasks.tsx` | ✅ Match | Keep - Already shipped |
| `app/(tabs)/assistant.tsx` ✅ | Not mentioned | ✅ OK | No conflict - Shipped |
| **AI/Chat Components** | | | |
| `AssistantBubble.tsx` ✅ | `ai/AssistantMessage.tsx` | ❌ Duplicate | Use AssistantBubble |
| `EventCard.tsx` ✅ | `chat/EventInviteCard.tsx` | ❌ Duplicate | Use EventCard |
| `EventCard.tsx` ✅ | `schedule/EventCard.tsx` | ❌ Duplicate | Use components/EventCard |
| `ConflictWarning.tsx` ✅ | `schedule/ConflictWarning.tsx` | ❌ Duplicate | Use components/ConflictWarning |
| `DeadlineCard.tsx` ✅ | Not mentioned | ✅ OK | No conflict - Shipped |
| `RSVPButtons.tsx` ✅ | Part of EventInviteCard | ⚠️ Merged | Use RSVPButtons |
| `StatusChip.tsx` ✅ | Not mentioned | ✅ OK | No conflict - Shipped |
| `AIQuickActions.tsx` ✅ | Not mentioned | ✅ OK | No conflict - Shipped |
| **New Components Proposed** | | | |
| Not shipped | `chat/DateHighlight.tsx` | ✅ New | Can add (PR4) |
| Not shipped | `chat/UrgentBadge.tsx` | ✅ New | Can add (PR9) |
| **Schedule Components** | | | |
| `CalendarHeader.tsx` ✅ | Not mentioned | ✅ OK | No conflict - Shipped |
| `EventListItem.tsx` ✅ | Not mentioned | ✅ OK | No conflict - Shipped |
| `EventList.tsx` ✅ | Not mentioned | ✅ OK | No conflict - Shipped |
| `EventDetailsSheet.tsx` ✅ | `EventConfirmModal.tsx` | ⚠️ Rename | Use EventDetailsSheet |
| `AddLessonModal.tsx` ✅ | Not mentioned | ✅ OK | No conflict - Shipped |
| `FAB.tsx` ✅ | Not mentioned | ✅ OK | No conflict - Shipped |
| **Tasks Components** | | | |
| `DeadlineList.tsx` ✅ | Not mentioned | ✅ OK | No conflict - Shipped |
| `DeadlineCreateModal.tsx` ✅ | Not mentioned | ✅ OK | No conflict - Shipped |
| `ProgressRing.tsx` ✅ | Not mentioned | ✅ OK | No conflict - Shipped |
| **Assistant Components** | | | |
| `InsightCard.tsx` ✅ | Not mentioned | ✅ OK | No conflict - Shipped |
| `InsightsGrid.tsx` ✅ | Not mentioned | ✅ OK | No conflict - Shipped |
| `AssistantActionRow.tsx` ✅ | Not mentioned | ✅ OK | No conflict - Shipped |
| **Hooks** | | | |
| `useThreadStatus.ts` ✅ | Not mentioned | ✅ OK | No conflict - Shipped |
| `useEvents.ts` (MOCK) ✅ | `useEvents.ts` | ✅ Match | Wire to Firestore |
| `useDeadlines.ts` (MOCK) ✅ | `useTasks.ts` | ⚠️ Rename | Keep useDeadlines name |
| Not shipped | `useParsedMessage.ts` | ✅ New | Can add |
| **Naming Convention** | | | |
| "Schedule" (tab) | "Schedule" + "Calendar" (mixed) | ⚠️ Inconsistent | Use "Schedule" only |
| "Tasks" (tab) | "Tasks" + "Deadlines" (mixed) | ⚠️ Inconsistent | Use "Tasks" for tab, "deadlines" for data |

---

## Collisions & Resolutions

### 1. File Structure Collision
**Issue:** Task list proposes subdirectories (`chat/`, `schedule/`, `ai/`) but shipped components are flat  
**Resolution:** Keep flat structure - all components in `src/components/`. Only add DateHighlight and UrgentBadge if truly needed.

### 2. AssistantMessage → AssistantBubble
**Issue:** PR13 mentions `components/ai/AssistantMessage.tsx`  
**Resolution:** Use existing `AssistantBubble.tsx`. Update all task list references to AssistantBubble.

### 3. EventInviteCard → EventCard
**Issue:** PR6 proposes `components/chat/EventInviteCard.tsx`  
**Resolution:** Use existing `EventCard.tsx` with `RSVPButtons`. Already handles RSVP functionality.

### 4. EventConfirmModal → EventDetailsSheet
**Issue:** PR6 proposes "event confirmation modal"  
**Resolution:** Use existing `EventDetailsSheet.tsx` - more comprehensive (shows details + has actions).

### 5. ConflictWarning Location
**Issue:** Task list proposes `components/schedule/ConflictWarning.tsx`  
**Resolution:** Use existing `components/ConflictWarning.tsx` (flat structure).

### 6. useTasks → useDeadlines
**Issue:** Task list proposes `hooks/useTasks.ts`  
**Resolution:** Keep existing `useDeadlines.ts` name - matches DeadlineList, DeadlineCard, DeadlineCreateModal components.

### 7. PR6 "Schedule UI" - Fully Shipped
**Issue:** PR6 proposes building schedule tab UI  
**Resolution:** Rewrite as "Wire Schedule UI to Backend":
- ~~Build inline date suggestion UI~~ → Use EventCard (shipped)
- ~~Create event confirmation modal~~ → Wire EventDetailsSheet actions
- ~~Add schedule tab screen~~ → Wire useEvents to Firestore
- ~~Show conflict warnings~~ → Wire ConflictWarning to backend

### 8. PR11 "Commitment Extraction" UI - Fully Shipped
**Issue:** PR11 includes "Tasks tab lists all tasks"  
**Resolution:** Rewrite as "Wire Tasks UI to Backend":
- ~~Creates task entries~~ → Wire useDeadlines.addDeadline to Firestore
- ~~Tasks tab lists all tasks~~ → Wire useDeadlines to Firestore query
- ~~Can mark complete~~ → Wire toggleComplete to Firestore

### 9. Directory Structure
**Issue:** Task list proposes `services/schedule/`, `services/task/` subdirectories  
**Resolution:** Keep subdirectories for services (good organization) but use flat components/

### 10. Naming: "Calendar" vs "Schedule"
**Issue:** Mixed usage in task list  
**Resolution:** **"Schedule" everywhere** - file names, UI copy, documentation

---

## Revised Task List Changes

### PRs to Rewrite

**PR6: Schedule UI → Wire Schedule Backend**
- Remove all UI creation tasks
- Focus on: Firestore integration, action handlers, AI message creation
- Reference existing components

**PR11: Commitment Extraction → Wire Tasks Backend**
- Remove tasks tab creation
- Focus on: Firestore integration, auto-extraction, backend service

### PRs to Update with Name Changes

**All PRs:**
- Replace "AssistantMessage" → "AssistantBubble"
- Replace "EventInviteCard" → "EventCard"
- Replace "EventConfirmModal" → "EventDetailsSheet"
- Replace "useTasks" → "useDeadlines"
- Replace "Calendar" → "Schedule" (when referring to tab)
- Replace "Deadlines" → "Tasks" (when referring to tab UI)

### New Wiring Tasks to Add

**Add to PR5 or PR6:**
- [ ] Wire useEvents to Firestore /events collection
- [ ] Replace mock data with real-time onSnapshot listener
- [ ] Add loading states and error handling

**Add to PR11:**
- [ ] Wire useDeadlines to Firestore /deadlines collection
- [ ] Implement addDeadline, toggleComplete, deleteDeadline with Firestore
- [ ] Replace local state with real-time listener

**Add to PR6 or separate:**
- [ ] Wire EventDetailsSheet actions:
  - handleMessageGroup → router.push(`/chat/${event.conversationId}`)
  - handleReschedule → Call AI reschedule endpoint
  - handleCancel → deleteDoc(db, 'events', eventId)

**Add to PR3 or PR4:**
- [ ] Wire AddLessonModal to AI parsing endpoint
- [ ] Replace alert with real fetch to `/api/ai/parse-lesson`

---

## Recommended File Structure (Aligned)

### Routes (No Changes - As Shipped)
```
app/app/(tabs)/
├── index.tsx           # Chats (shipped)
├── schedule.tsx        # Schedule (shipped PR-03)
├── tasks.tsx           # Tasks (shipped PR-04)
├── assistant.tsx       # Assistant (shipped PR-05)
└── profile.tsx         # Profile (shipped)
```

### Components (Flat - As Shipped)
```
app/src/components/
├── TabIcon.tsx                 # PR-01
├── SectionHeader.tsx           # PR-01
├── StatusChip.tsx              # PR-02
├── AssistantBubble.tsx         # PR-02 (not AssistantMessage!)
├── EventCard.tsx               # PR-02 (not EventInviteCard!)
├── DeadlineCard.tsx            # PR-02
├── ConflictWarning.tsx         # PR-02 (flat, not in schedule/)
├── RSVPButtons.tsx             # PR-02
├── AIQuickActions.tsx          # PR-02
├── CalendarHeader.tsx          # PR-03
├── EventListItem.tsx           # PR-03
├── EventList.tsx               # PR-03
├── EventDetailsSheet.tsx       # PR-03 (not EventConfirmModal!)
├── AddLessonModal.tsx          # PR-03
├── FAB.tsx                     # PR-03
├── DeadlineList.tsx            # PR-04
├── DeadlineCreateModal.tsx     # PR-04
├── ProgressRing.tsx            # PR-04
├── InsightCard.tsx             # PR-05
├── InsightsGrid.tsx            # PR-05
├── AssistantActionRow.tsx      # PR-05
├── MessageBubble.tsx           # Modified PR-02
├── MessageInput.tsx            # Modified PR-02
└── (existing components...)
```

### Optional: Add if Needed (Not Shipped)
```
app/src/components/
├── DateHighlight.tsx           # PR4 - Optional: Highlight dates in chat
└── UrgentBadge.tsx             # PR9 - Optional: Urgent message indicator
```

### Services (Subdirectories OK - New Backend)
```
app/src/services/
├── schedule/
│   ├── eventService.ts         # CRUD for events
│   ├── rsvpService.ts          # RSVP updates
│   ├── conflictService.ts      # Conflict detection
│   └── timezoneService.ts      # Timezone handling
├── task/                       # Or deadline/ - choose one
│   └── taskService.ts          # CRUD for deadlines
├── ai/
│   ├── aiGatingService.ts
│   ├── aiOrchestratorService.ts
│   └── ragService.ts
├── notifications/
│   ├── reminderService.ts
│   └── pushTokenService.ts
└── vector/
    ├── vectorRetriever.ts
    ├── firebaseRetriever.ts
    ├── pineconeRetriever.ts
    └── mockRetriever.ts
```

### Hooks (As Shipped)
```
app/src/hooks/
├── useThreadStatus.ts          # PR-02 (shipped)
├── useEvents.ts                # PR-03 (shipped - MOCK, needs wiring)
├── useDeadlines.ts             # PR-04 (shipped - MOCK, needs wiring)
└── useParsedMessage.ts         # Can add if needed
```

**Do NOT rename useDeadlines → useTasks**. Keep useDeadlines.

---

## Summary for Revised Task List

### What Changes
1. **PR6:** Rewritten from "Schedule UI" to "Wire Schedule Backend"
2. **PR11:** Rewritten from "Commitment Extraction + UI" to "Wire Tasks Backend + Auto-Extract"
3. **All PRs:** Component names updated to match shipped UI
4. **All PRs:** Consistent "Schedule" and "Tasks" naming
5. **New subtasks:** Added wiring tasks for useEvents, useDeadlines, action handlers

### What Stays the Same
- All backend/AI tasks (PR1-5, PR7-10, PR12-15)
- Tool schemas and function calling
- RAG pipeline
- Security rules
- Cloud Functions
- Eval framework

### What's Safe
- No UI components will be rebuilt
- All existing routes preserved
- Component contracts unchanged
- Type definitions stay as-is
- Zero risk of duplication

### Next Steps
1. Review revised task list below
2. Start with backend tasks (PR1-5 backend work)
3. Wire UI to backend (PR6, PR11 wiring tasks)
4. Add optional components (DateHighlight, UrgentBadge) only if needed

---

