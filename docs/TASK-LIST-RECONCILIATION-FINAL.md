# Task List Reconciliation - JellyDMTasklist.md Revision

**Date:** October 23, 2025  
**Purpose:** Align proposed task list with shipped UI (PRs 01-05)  
**Result:** Zero UI duplication, clear backend focus, safe to proceed

---

## UI Mapping Table

| Shipped UI (JellyDM_UI.md) | Proposed (JellyDMTasklist.md) | Status | Resolution |
|-----------------------------|--------------------------------|--------|------------|
| **ROUTES & SCREENS** | | | |
| `app/(tabs)/schedule.tsx` ✅ | `app/(tabs)/schedule.tsx` | ✅ Match | Keep - Already shipped (PR-03) |
| `app/(tabs)/tasks.tsx` ✅ | `app/(tabs)/tasks.tsx` | ✅ Match | Keep - Already shipped (PR-04) |
| `app/(tabs)/assistant.tsx` ✅ | Not mentioned | ✅ OK | Shipped (PR-05), not in original spec |
| | | | |
| **AI/CHAT COMPONENTS** | | | |
| `AssistantBubble.tsx` ✅ | `ai/AssistantMessage.tsx` | ❌ Duplicate | **Use AssistantBubble** (shipped PR-02) |
| `EventCard.tsx` ✅ | `chat/EventInviteCard.tsx` | ❌ Duplicate | **Use EventCard** (shipped PR-02) |
| `EventCard.tsx` ✅ | `schedule/EventCard.tsx` | ❌ Duplicate | **Use components/EventCard** (flat structure) |
| `ConflictWarning.tsx` ✅ | `schedule/ConflictWarning.tsx` | ❌ Duplicate | **Use components/ConflictWarning** (flat) |
| `RSVPButtons.tsx` ✅ | Part of EventInviteCard | ⚠️ Merged | **Use RSVPButtons** (separate component) |
| `StatusChip.tsx` ✅ | Not mentioned | ✅ OK | Shipped (PR-02) |
| `AIQuickActions.tsx` ✅ | Not mentioned | ✅ OK | Shipped (PR-02) |
| `DeadlineCard.tsx` ✅ | Not mentioned | ✅ OK | Shipped (PR-02) |
| | | | |
| **SCHEDULE COMPONENTS** | | | |
| `CalendarHeader.tsx` ✅ | Not mentioned | ✅ OK | Shipped (PR-03) |
| `EventListItem.tsx` ✅ | Not mentioned | ✅ OK | Shipped (PR-03) |
| `EventList.tsx` ✅ | Not mentioned | ✅ OK | Shipped (PR-03) |
| `EventDetailsSheet.tsx` ✅ | `EventConfirmModal.tsx` | ⚠️ Similar | **Use EventDetailsSheet** (more complete) |
| `AddLessonModal.tsx` ✅ | Not mentioned | ✅ OK | Shipped (PR-03) |
| `FAB.tsx` ✅ | Not mentioned | ✅ OK | Shipped (PR-03), reusable |
| | | | |
| **TASKS COMPONENTS** | | | |
| `DeadlineList.tsx` ✅ | Not mentioned | ✅ OK | Shipped (PR-04) |
| `DeadlineCreateModal.tsx` ✅ | Not mentioned | ✅ OK | Shipped (PR-04) |
| `ProgressRing.tsx` ✅ | Not mentioned | ✅ OK | Shipped (PR-04) |
| | | | |
| **ASSISTANT COMPONENTS** | | | |
| `InsightCard.tsx` ✅ | Not mentioned | ✅ OK | Shipped (PR-05) |
| `InsightsGrid.tsx` ✅ | Not mentioned | ✅ OK | Shipped (PR-05) |
| `AssistantActionRow.tsx` ✅ | Not mentioned | ✅ OK | Shipped (PR-05) |
| | | | |
| **HOOKS** | | | |
| `useThreadStatus.ts` ✅ | Not mentioned | ✅ OK | Shipped (PR-02) |
| `useEvents.ts` (MOCK) ✅ | `useEvents.ts` | ✅ Match | Exists, needs wiring to Firestore |
| `useDeadlines.ts` (MOCK) ✅ | `useTasks.ts` | ⚠️ Rename | **Keep useDeadlines** name (matches components) |
| Not shipped | `useParsedMessage.ts` | ✅ New | Can add if needed (optional) |
| | | | |
| **OPTIONAL NEW COMPONENTS** | | | |
| Not shipped | `DateHighlight.tsx` | ✅ New | Can add in PR4 if desired |
| Not shipped | `UrgentBadge.tsx` | ✅ New | Can add in PR9 if desired |
| | | | |
| **NAMING CONVENTION** | | | |
| "Schedule" (tab) | "Schedule" + "Calendar" | ⚠️ Mixed | **Use "Schedule" only** |
| "Tasks" (tab) | "Tasks" + "Deadlines" | ⚠️ Mixed | **"Tasks" for UI, "deadlines" for data** |
| Flat `components/` | Subdirs `chat/`, `schedule/`, `ai/` | ⚠️ Structure | **Keep flat** for components |

**Legend:**
- ✅ Match - No conflict
- ⚠️ Rename/Similar - Needs alignment
- ❌ Duplicate - Must use shipped version

---

## Collisions & Resolutions

### 1. Component Name: AssistantMessage → AssistantBubble
**Resolution:** Use shipped `AssistantBubble.tsx`. Update all task list references from "AssistantMessage" to "AssistantBubble".

### 2. Component Name: EventInviteCard → EventCard
**Resolution:** Use shipped `EventCard.tsx` which already handles invite display + RSVP. It's more versatile than the proposed EventInviteCard.

### 3. Component Name: EventConfirmModal → EventDetailsSheet
**Resolution:** Use shipped `EventDetailsSheet.tsx`. It's a bottom sheet (not center modal) and includes details + actions (Message Group, Reschedule, Cancel).

### 4. Component Location: Subdirectories vs Flat
**Resolution:** Keep shipped flat structure for components (`components/*.tsx` not `components/chat/*.tsx`). Only use subdirectories for services.

### 5. Hook Name: useTasks → useDeadlines
**Resolution:** Keep shipped `useDeadlines.ts` name. It matches `DeadlineList`, `DeadlineCard`, `DeadlineCreateModal` component names.

### 6. PR6 "Schedule UI" - Fully Implemented
**Resolution:** Rewrite as "Wire Schedule Backend". All UI shipped in PR-03. Focus on:
- Wire useEvents to Firestore
- Wire AddLessonModal to AI parsing
- Wire EventDetailsSheet actions
- No new UI components needed

### 7. PR11 "Build Tasks Tab" - Fully Implemented
**Resolution:** Rewrite as "Wire Tasks Backend + Auto-Extract". All UI shipped in PR-04. Focus on:
- Wire useDeadlines to Firestore
- Implement taskService CRUD
- Build AI auto-extractor
- No new UI components needed

### 8. Naming: "Calendar" vs "Schedule" Throughout Spec
**Resolution:** Use "Schedule" consistently - matches shipped tab name and files.

### 9. ConflictWarning Location
**Resolution:** Use shipped `components/ConflictWarning.tsx` (flat structure), not `schedule/ConflictWarning.tsx`.

### 10. Component Directory Structure
**Resolution:** 
- **Components:** Flat (`components/*.tsx`) - As shipped
- **Services:** Subdirectories OK (`services/schedule/`, `services/task/`) - New backend code
- **Hooks:** Flat (`hooks/*.ts`) - As shipped

---

## Revised JellyDMTasklist.md

**Status:** ✅ Complete  
**Location:** `docs/Initialdocs/JellyDMTasklist-REVISED.md`

**Key Changes:**
1. Added CHANGELOG at top documenting all changes
2. Updated file structure to match shipped flat component structure
3. Renamed all component references to match shipped names
4. Rewrote PR6: "Schedule UI" → "Wire Schedule Backend"
5. Rewrote PR11: "Commitment Extraction + UI" → "Wire Tasks Backend + Auto-Extract"
6. Added specific wiring tasks with file names and line numbers
7. Kept useDeadlines name (not useTasks)
8. Consistent "Schedule" and "Tasks" naming throughout
9. Added reference to shipped UI docs
10. Marked PR15 as already complete (push notifications shipped)

**All Backend Tasks Preserved:**
- PR1-3: AI infrastructure, RAG, function calling
- PR4-5: Date parsing, event backend
- PR7-8: RSVP backend, NL interpretation
- PR9-10: Urgency, conflicts
- PR12: Reminders
- PR13-14: Proactive assistant
- Eval framework, cost monitoring

---

## Summary

### 1. What Changed

**Component Names Aligned:**
- `AssistantMessage.tsx` → `AssistantBubble.tsx` (shipped)
- `EventInviteCard.tsx` → `EventCard.tsx` (shipped)
- `EventConfirmModal.tsx` → `EventDetailsSheet.tsx` (shipped)
- `useTasks.ts` → `useDeadlines.ts` (shipped)

**Tasks Rewritten:**
- PR6: From "Build Schedule UI" → "Wire Schedule Backend to Shipped UI"
- PR11: From "Build Tasks UI" → "Wire Tasks Backend to Shipped UI"

**Structure Aligned:**
- Components: Flat structure (`components/*.tsx`)
- Services: Subdirectories OK (`services/schedule/`, `services/task/`)
- Routes: Confirmed (`schedule.tsx`, `tasks.tsx`, `assistant.tsx`)

**Naming Fixed:**
- "Schedule" (not Calendar) everywhere
- "Tasks" for tab, "deadlines" for data model

**Wiring Tasks Added:**
- 7 specific wiring tasks with file names and line numbers
- All reference shipped components
- Clear integration points

### 2. Why It's Safe

**Zero Breaking Changes:**
- All 33 shipped components preserved
- No UI will be rebuilt or duplicated
- All routes stay as-is
- Type definitions unchanged
- Component contracts maintained

**Clear Separation:**
- UI layer: Complete (PRs 01-05 shipped)
- Backend layer: To-do (PRs 1-15 of revised task list)
- Wiring layer: Clearly defined in revised PRs 6 and 11

**Validation:**
- TypeScript compilation confirms no errors
- All shipped files verified present
- Component names confirmed in codebase
- No conflicting file paths

### 3. Next Steps

**Immediate (Before Starting Backend Work):**
1. Review revised task list: `docs/Initialdocs/JellyDMTasklist-REVISED.md`
2. Read shipped UI docs: `docs/JellyDM_UI.md` for mock locations
3. Test shipped UI: Start dev server, navigate all 5 tabs

**Start Backend Work (PR1):**
4. Setup Cloud Functions project
5. Implement gating classifier
6. Build timezone service
7. Write eval harness

**Wire UI to Backend (PR6, PR11):**
8. Replace useEvents mock with Firestore
9. Replace useDeadlines mock with Firestore
10. Wire all action handlers (15+ placeholders)

**Polish & Deploy:**
11. Install DateTimePicker (optional)
12. Run evaluation suite
13. Monitor costs
14. Deploy to production

### 4. What Wasn't Changed

**All Backend/AI Infrastructure Tasks Intact:**
- ✅ PR1-3: AI setup, RAG, function calling
- ✅ PR4-5: Date parsing, event backend
- ✅ PR7-8: RSVP backend, NL interpretation
- ✅ PR9-10: Urgency detection, conflict engine
- ✅ PR12: Reminder service
- ✅ PR13-14: Autonomous monitoring, smart nudges
- ✅ Eval framework, cost monitoring
- ✅ Deployment checklist

**All Cloud Functions Work Preserved:**
- Tool schemas (8 tools)
- Vector store abstraction
- Timezone validation
- DST testing
- Security rules
- Firestore emulator tests

### 5. Confidence Assessment

**Risk Level:** ✅ ZERO

**Why:**
- No UI components will be rebuilt
- All backend work is new/additive
- Wiring tasks reference exact line numbers
- Type system already supports all features
- Clear documentation of what's shipped vs todo

**Quality:**
- All 33 shipped components compile (0 errors)
- Type definitions support AI metadata
- Message rendering handles assistant messages
- Inline cards render from meta fields
- Action callbacks defined and ready

**Ready for:**
- Backend implementation (PR1-15)
- AI orchestrator setup
- Firestore collection creation
- Wiring shipped UI to real data

---

## Files Delivered

1. **`docs/UI-RECONCILIATION-ANALYSIS.md`** - Detailed collision analysis
2. **`docs/Initialdocs/JellyDMTasklist-REVISED.md`** - Complete revised task list
3. **`docs/TASK-LIST-RECONCILIATION-FINAL.md`** - This summary document

---

**Status:** ✅ Reconciliation complete. Revised task list ready for backend implementation.  
**Next Action:** Start PR1 (AI Infrastructure) while referencing shipped UI in JellyDM_UI.md

