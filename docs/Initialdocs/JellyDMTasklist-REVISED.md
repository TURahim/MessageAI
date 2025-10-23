# MessageAI Tutor AI - Implementation Task List (REVISED)

**15 Shippable PRs | Complete Checklist**  
**Revised:** October 23, 2025 - Aligned with Shipped UI (PRs 01-05)

---

## 📋 CHANGELOG (Oct 23, 2025)

### What Changed
1. **File Structure:** Updated to match shipped flat component structure (not subdirectories)
2. **Component Names:** Aligned with shipped components:
   - `AssistantMessage.tsx` → `AssistantBubble.tsx` (already shipped)
   - `EventInviteCard.tsx` → `EventCard.tsx` (already shipped)
   - `EventConfirmModal.tsx` → `EventDetailsSheet.tsx` (already shipped)
   - `ConflictWarning.tsx` → Use `components/ConflictWarning.tsx` (already shipped)
3. **Hooks:** Kept `useDeadlines.ts` (not `useTasks.ts`) to match shipped components
4. **PR6 Rewritten:** "Schedule UI" → "Wire Schedule Backend" (UI already complete)
5. **PR11 Rewritten:** "Commitment Extraction + UI" → "Wire Tasks Backend + Auto-Extract" (UI already complete)
6. **Naming:** Consistent "Schedule" (not Calendar) and "Tasks" (tab name) throughout
7. **Routes:** Confirmed `schedule.tsx`, `tasks.tsx`, `assistant.tsx` (all shipped)

### What Stayed the Same
- All backend/AI infrastructure tasks (PR1-5, PR7-10, PR12-15)
- Tool schemas and function calling framework
- RAG pipeline and vector store abstraction
- Security rules and Firestore emulator tests
- Eval harness and cost monitoring
- Cloud Functions architecture

### Why It's Safe
- Zero UI duplication - all shipped components preserved
- Backend tasks unaffected - focus on wiring
- Clear separation: UI (done) vs Backend (todo)
- No breaking changes to shipped code

---

## Overview

| Item | Details |
|------|---------|
| **Total PRs** | 15 shippable pull requests |
| **Timeline** | 4-6 weeks (2-4 days per PR average) |
| **Repository** | https://github.com/TURahim/MessageAI |
| **UI Status** | ✅ Complete (PRs 01-05 shipped) |
| **Backend Status** | ⏳ Pending (PRs 1-15 of this list) |

---

## Project File Structure (Aligned with Shipped UI)

```
MessageAI/
├── app/                              # React Native application
│   ├── app/                          # Expo Router screens
│   │   ├── (auth)/
│   │   ├── (tabs)/
│   │   │   ├── index.tsx             # ✅ SHIPPED: Chats
│   │   │   ├── schedule.tsx          # ✅ SHIPPED: PR-03 (was empty, now full)
│   │   │   ├── tasks.tsx             # ✅ SHIPPED: PR-04 (was empty, now full)
│   │   │   ├── assistant.tsx         # ✅ SHIPPED: PR-05 (was empty, now full)
│   │   │   └── profile.tsx           # ✅ SHIPPED: Existing
│   │   ├── chat/[id].tsx             # ✅ SHIPPED: Modified PR-02
│   │   ├── users.tsx                 # ✅ SHIPPED: Existing
│   │   ├── newGroup.tsx              # ✅ SHIPPED: Existing
│   │   ├── profile/[id].tsx          # ✅ SHIPPED: Existing
│   │   └── groupInfo/[id].tsx        # ✅ SHIPPED: Existing
│   │
│   ├── src/
│   │   ├── components/               # ✅ SHIPPED: Flat structure (not subdirectories)
│   │   │   ├── TabIcon.tsx           # ✅ SHIPPED: PR-01
│   │   │   ├── SectionHeader.tsx     # ✅ SHIPPED: PR-01
│   │   │   ├── StatusChip.tsx        # ✅ SHIPPED: PR-02
│   │   │   ├── AssistantBubble.tsx   # ✅ SHIPPED: PR-02 (use this, not AssistantMessage)
│   │   │   ├── EventCard.tsx         # ✅ SHIPPED: PR-02 (use this, not EventInviteCard)
│   │   │   ├── DeadlineCard.tsx      # ✅ SHIPPED: PR-02
│   │   │   ├── ConflictWarning.tsx   # ✅ SHIPPED: PR-02 (flat, not in schedule/)
│   │   │   ├── RSVPButtons.tsx       # ✅ SHIPPED: PR-02
│   │   │   ├── AIQuickActions.tsx    # ✅ SHIPPED: PR-02
│   │   │   ├── CalendarHeader.tsx    # ✅ SHIPPED: PR-03
│   │   │   ├── EventListItem.tsx     # ✅ SHIPPED: PR-03
│   │   │   ├── EventList.tsx         # ✅ SHIPPED: PR-03
│   │   │   ├── EventDetailsSheet.tsx # ✅ SHIPPED: PR-03 (use this, not EventConfirmModal)
│   │   │   ├── AddLessonModal.tsx    # ✅ SHIPPED: PR-03
│   │   │   ├── FAB.tsx               # ✅ SHIPPED: PR-03
│   │   │   ├── DeadlineList.tsx      # ✅ SHIPPED: PR-04
│   │   │   ├── DeadlineCreateModal.tsx # ✅ SHIPPED: PR-04
│   │   │   ├── ProgressRing.tsx      # ✅ SHIPPED: PR-04
│   │   │   ├── InsightCard.tsx       # ✅ SHIPPED: PR-05
│   │   │   ├── InsightsGrid.tsx      # ✅ SHIPPED: PR-05
│   │   │   ├── AssistantActionRow.tsx # ✅ SHIPPED: PR-05
│   │   │   ├── DateHighlight.tsx     # 📝 NEW: Optional (PR4)
│   │   │   └── UrgentBadge.tsx       # 📝 NEW: Optional (PR9)
│   │   │
│   │   ├── services/                 # 📝 NEW: Backend services
│   │   │   ├── ai/
│   │   │   │   ├── aiGatingService.ts
│   │   │   │   ├── aiOrchestratorService.ts
│   │   │   │   └── ragService.ts
│   │   │   ├── schedule/
│   │   │   │   ├── eventService.ts
│   │   │   │   ├── rsvpService.ts
│   │   │   │   ├── conflictService.ts
│   │   │   │   └── timezoneService.ts
│   │   │   ├── task/
│   │   │   │   └── taskService.ts
│   │   │   ├── notifications/
│   │   │   │   ├── reminderService.ts
│   │   │   │   └── pushTokenService.ts
│   │   │   └── vector/
│   │   │       ├── vectorRetriever.ts
│   │   │       ├── firebaseRetriever.ts
│   │   │       ├── pineconeRetriever.ts
│   │   │       └── mockRetriever.ts
│   │   │
│   │   ├── hooks/
│   │   │   ├── useThreadStatus.ts    # ✅ SHIPPED: PR-02
│   │   │   ├── useEvents.ts          # ✅ SHIPPED: PR-03 (MOCK - needs wiring)
│   │   │   ├── useDeadlines.ts       # ✅ SHIPPED: PR-04 (MOCK - needs wiring)
│   │   │   └── useParsedMessage.ts   # 📝 NEW: Optional
│   │   │
│   │   ├── contexts/
│   │   │   └── AIContext.tsx         # 📝 NEW: Optional
│   │   │
│   │   └── types/
│   │       ├── index.ts              # ✅ SHIPPED: Modified PR-02 (has EventMeta, DeadlineMeta, etc.)
│   │       ├── aiTypes.ts            # 📝 NEW: Additional AI types
│   │       ├── eventTypes.ts         # 📝 NEW: Event-specific types
│   │       └── toolTypes.ts          # 📝 NEW: Tool schemas
│   │
│   └── __tests__/
│       ├── services/
│       │   ├── vectorRetriever.test.ts
│       │   ├── aiGating.test.ts
│       │   └── timezone.test.ts
│       ├── integration/
│       │   ├── dst-transitions.test.ts
│       │   ├── rag-pipeline.test.ts
│       │   └── eval-runner.test.ts
│       └── emulator/
│           └── firestore-rules.test.ts
│
├── functions/                        # Firebase Cloud Functions
│   ├── src/
│   │   ├── ai/
│   │   │   ├── messageAnalyzer.ts
│   │   │   ├── toolExecutor.ts
│   │   │   └── promptTemplates.ts
│   │   ├── notifications/
│   │   │   ├── outboxWorker.ts
│   │   │   └── reminderScheduler.ts
│   │   ├── rag/
│   │   │   ├── embeddingService.ts
│   │   │   └── contextBuilder.ts
│   │   ├── utils/
│   │   │   └── timezoneUtils.ts
│   │   └── admin/
│   │       └── failedOpsViewer.ts
│   │
│   └── .env.example
│
├── monitoring/
│   ├── cost-dashboard.sql
│   └── eval-suite/
│       ├── test-conversations.json
│       ├── eval-runner.ts
│       └── README.md
│
├── firestore.rules                   # 📝 UPDATE
├── firestore.indexes.json            # 📝 UPDATE
└── firebase.json
```

---

## Phase 1: AI Infrastructure (PRs 1-3)

**Timeline:** 6-8 days total  
**Goal:** Establish architectural foundations + evaluation framework

### PR1: AI Agent Setup + Timezone Architecture + Eval Harness

**Estimated Time:** 3 days

**High-Level Tasks:**
- [ ] Setup Firebase Cloud Functions with TypeScript
- [ ] Integrate AI SDK by Vercel
- [ ] Configure OpenAI and Anthropic API keys
- [ ] Implement gating classifier (Haiku/GPT-3.5)
- [ ] Build timezone architecture with validation
- [ ] Write DST integration tests
- [ ] Build lightweight eval harness for CI

**Detailed Subtasks:**

#### 1.1 Initialize Cloud Functions project
- [ ] **Files:** `functions/package.json`, `functions/tsconfig.json`, `functions/src/index.ts`
- [ ] Install dependencies: firebase-functions, firebase-admin, ai SDK, date-fns-tz
- [ ] Setup TypeScript with strict mode

#### 1.2 Create environment configuration
- [ ] **Files:** `functions/.env.example`
- [ ] Add API keys: OPENAI_API_KEY, ANTHROPIC_API_KEY
- [ ] Setup Firebase config for secrets

#### 1.3 Implement gating classifier
- [ ] **Files:** `functions/src/ai/messageAnalyzer.ts`, `functions/src/ai/aiGatingService.ts`
- [ ] Create `gateMessage(text)` returning `{task, confidence}`
- [ ] Prompt: "Classify this tutoring message. Return JSON: {task: scheduling|rsvp|task|urgent|null, confidence: 0.0-1.0}"
- [ ] Add retry logic with exponential backoff
- [ ] Add cost tracking (log tokens by task type)

#### 1.4 Build timezone service
- [ ] **Files:** `functions/src/utils/timezoneUtils.ts`, `app/src/services/schedule/timezoneService.ts`
- [ ] Create TimeContext interface
- [ ] Implement `validateTimezone(tz)` using `Intl.supportedValuesOf('timeZone')`
- [ ] Create `parseDateTime(text, timezone)` function
- [ ] **CRITICAL:** Ensure all functions require explicit timezone parameter (throw if missing)
- [ ] Add validation: reject any call without `timezone` in params

#### 1.5 Setup Firestore trigger
- [ ] **Files:** `functions/src/index.ts`
- [ ] Create onMessageCreated trigger
- [ ] Call gating service on new messages
- [ ] Prepare for full processing when task detected

#### 1.6 Write DST integration tests
- [ ] **Files:** `app/__tests__/integration/dst-transitions.test.ts`
- [ ] Test 1: Create event on March 10 (spring forward)
- [ ] Test 2: Create event on November 3 (fall back)
- [ ] Test 3: Schedule reminder at 2pm on DST transition
- [ ] Test 4: Conflict detection across DST boundary
- [ ] Test 5: DST boundary conflict check (two events spanning DST change)

#### 1.7 Build eval harness for CI
- [ ] **Files:** `monitoring/eval-suite/eval-runner.ts`, `monitoring/eval-suite/test-conversations.json`, `.github/workflows/eval.yml`
- [ ] Create seeded test conversations (10+ examples each):
  - Schedule extraction ("meet tomorrow at 3pm")
  - RSVP interpretation ("yes that works", "can't make it")
  - Task/deadline detection ("homework due Friday")
- [ ] Build runner that:
  - Feeds messages to gating classifier
  - Measures accuracy (expected vs actual task)
  - Measures latency (P50, P95, P99)
  - Reports false positives/negatives
- [ ] Add CI job that runs on every PR
- [ ] Set thresholds: accuracy >85%, P95 latency <500ms

**Acceptance Criteria:**
- Gating classifier <500ms P95 latency ✅
- Gate passes only if `confidence ≥ 0.6`; <0.6 → no-op (skip processing)
- Log gating decisions weekly (task counts, confidence distribution)
- Manual override flag in message metadata (bypass gating for testing)
- Timezone validation works ✅
- All date functions require timezone (throw error if missing) ✅
- 5 DST tests pass (including conflict check) ✅
- Eval harness runs in CI, reports accuracy & latency ✅
- Eval suite passes with >85% accuracy ✅

---

### PR2: RAG Pipeline + Vector Store Abstraction

**Estimated Time:** 2-3 days

**High-Level Tasks:**
- [ ] Define VectorRetriever interface
- [ ] Implement Firebase, Pinecone, and Mock retrievers
- [ ] Setup embedding service (OpenAI text-embedding-3-small)
- [ ] Build RAG context retrieval with top-K + recency
- [ ] Write unit tests with MockRetriever

**Detailed Subtasks:**

#### 2.1 Define vector store interface
- [ ] **Files:** `app/src/services/vector/vectorRetriever.ts`, `app/src/types/aiTypes.ts`
- [ ] Create VectorRetriever interface: upsert, search, delete, healthCheck
- [ ] Define SearchOptions, SearchResult, Document types
- [ ] Add JSDoc with usage examples

#### 2.2 Implement Firebase Vector Search retriever
- [ ] **Files:** `app/src/services/vector/firebaseRetriever.ts`
- [ ] Install Firebase Extensions: Firestore Vector Search
- [ ] Implement search with conversationId filter
- [ ] Add topK limiting and score threshold
- [ ] Implement `healthCheck()` method

#### 2.3 Implement Pinecone retriever (future)
- [ ] **Files:** `app/src/services/vector/pineconeRetriever.ts`
- [ ] Implement interface (may not connect yet)
- [ ] Add namespace support for multi-tenancy
- [ ] Implement `healthCheck()` method

#### 2.4 Implement Mock retriever for tests
- [ ] **Files:** `app/src/services/vector/mockRetriever.ts`
- [ ] Accept mock data in constructor
- [ ] Return canned responses for testing
- [ ] Implement `healthCheck()` method (always returns true)

#### 2.5 Build embedding service
- [ ] **Files:** `functions/src/rag/embeddingService.ts`
- [ ] Use OpenAI text-embedding-3-small (1536 dims)
- [ ] Create `embedMessage(text)` function
- [ ] Add batch embedding support (10-50 messages)

#### 2.6 Build RAG context service
- [ ] **Files:** `functions/src/rag/contextBuilder.ts`, `app/src/services/ai/ragService.ts`
- [ ] Implement `getContext(query, conversationId)` returning top 20
- [ ] Add recency reranking (last 7 days weighted 2x)
- [ ] Limit context to 4096 tokens
- [ ] Implement PII minimization (replace names with IDs)

#### 2.7 Setup embedding upsert trigger
- [ ] **Files:** `functions/src/index.ts`
- [ ] Create background Cloud Function on message creation
- [ ] Batch upserts every 30s for cost efficiency
- [ ] Store: {messageId, conversationId, senderId, timestamp, embedding[]}

#### 2.8 Write RAG unit tests
- [ ] **Files:** `app/__tests__/services/vectorRetriever.test.ts`, `app/__tests__/integration/rag-pipeline.test.ts`
- [ ] Test RAG with MockRetriever (no Firebase)
- [ ] Verify top-K, recency reranking, token limits
- [ ] Test PII minimization
- [ ] Test env-based retriever swap (VECTOR_STORE=mock)
- [ ] Verify `healthCheck()` on all implementations

**Acceptance Criteria:**
- Interface defined ✅
- Three implementations work (Firebase, Pinecone stub, Mock) ✅
- RAG returns <4096 token context ✅
- Unit tests pass without Firebase ✅
- PII minimized ✅
- `healthCheck()` implemented and tested on all retrievers ✅
- Can swap to MockRetriever via `VECTOR_STORE=mock` env var ✅

---

### PR3: Function Calling Framework

**Estimated Time:** 1-2 days

**High-Level Tasks:**
- [ ] Define all 8 tool schemas (JSON + TypeScript)
- [ ] Build tool executor with error handling
- [ ] Implement retry logic with exponential backoff
- [ ] Create failed_operations collection
- [ ] Add failed operations viewer

**Detailed Subtasks:**

#### 3.1 Define tool schemas
- [ ] **Files:** `app/src/types/toolTypes.ts`, `functions/src/ai/toolSchemas.ts`
- [ ] Define 8 tools: time.parse, schedule.create_event, schedule.check_conflicts, rsvp.create_invite, rsvp.record_response, task.create, reminders.schedule, messages.post_system
- [ ] Each tool: name, description, parameters (required/optional), return type
- [ ] **CRITICAL:** Validate timezone is required in time.parse (throw if missing)

#### 3.2 Build tool executor
- [ ] **Files:** `functions/src/ai/toolExecutor.ts`
- [ ] Create `executeTool(toolName, params)` async function
- [ ] Map tool names to handler functions
- [ ] Return: {success: boolean, data?: any, error?: string}

#### 3.3 Implement retry logic
- [ ] **Files:** `functions/src/ai/toolExecutor.ts`
- [ ] Retry with exponential backoff: 1s, 2s, 4s
- [ ] Maximum 3 attempts
- [ ] After 3 failures, write to failed_operations

#### 3.4 Create failed operations collection
- [ ] **Files:** `firestore.rules` (update)
- [ ] Schema: {toolName, params, error, attempts, timestamp, userId, conversationId}
- [ ] Security rule: only Cloud Functions can write

#### 3.5 Build failed operations viewer
- [ ] **Files:** `functions/src/admin/failedOpsViewer.ts`
- [ ] Add HTTP Cloud Function for admin access
- [ ] Query failed_operations with filters (date range, tool, user)
- [ ] Return JSON for debugging
- [ ] Add basic auth (admin-only)

#### 3.6 Integrate with gating service
- [ ] **Files:** `functions/src/ai/messageAnalyzer.ts`
- [ ] When task detected, call GPT-4 with RAG + tools
- [ ] Parse LLM response for tool calls
- [ ] Execute tools via toolExecutor

**Acceptance Criteria:**
- 8 schemas defined ✅
- Tool executor works ✅
- Retry logic (max 3) ✅
- Failed ops logged ✅
- Integration complete ✅
- Failed ops viewer HTTP endpoint deployed ✅
- Can query failed ops by date, tool, user ✅

---

## Phase 2: Schedule Extraction (PRs 4-6)

**Timeline:** 6-8 days total  
**Goal:** Extract dates/times and create events

### PR4: LLM Date Parser

**Estimated Time:** 2 days

**High-Level Tasks:**
- [ ] Build GPT-4 prompt for date/time extraction
- [ ] Implement time.parse tool handler
- [ ] Handle timezone conversion with date-fns-tz
- [ ] Test common phrases
- [ ] **OPTIONAL:** Add DateHighlight.tsx component if desired

**Key Files:** `functions/src/ai/promptTemplates.ts`, `functions/src/ai/toolExecutor.ts`, `app/__tests__/services/timeParse.test.ts`

**Optional UI Enhancement:**
- [ ] **File:** `app/src/components/DateHighlight.tsx` (optional)
- [ ] Inline component to highlight detected dates in chat messages
- [ ] Use existing shipped components; only add if truly needed

**Acceptance Criteria:**
- Date extraction for common phrases ✅
- Timezone-aware ✅
- >85% accuracy ✅
- Eval suite includes date parsing tests ✅
- (Optional) Dates highlighted in UI ✅

---

### PR5: Event Data Model + Security Rules

**Estimated Time:** 2-3 days

**High-Level Tasks:**
- [ ] Design Firestore events collection
- [ ] Implement event CRUD service
- [ ] Add transactional conflict checking
- [ ] Create composite indexes
- [ ] Write security rules
- [ ] Add Firestore emulator tests

**Key Files:** `app/src/types/eventTypes.ts`, `app/src/services/schedule/eventService.ts`, `app/src/services/schedule/conflictService.ts`, `firestore.indexes.json`, `firestore.rules`, `app/__tests__/emulator/firestore-rules.test.ts`

**Detailed Subtasks:**

#### 5.1 Design events collection schema
- [ ] Fields: id, dateTime (use startTime/endTime to match shipped EventMeta), duration, participants[], createdBy, status, title, location, rsvps{}
- [ ] Add indexes for queries (by tutor, by date, by participant)
- [ ] **ALIGN:** Use startTime, endTime (not dateTime + duration) to match `EventMeta` in shipped types

#### 5.2 Implement event service
- [ ] **Files:** `app/src/services/schedule/eventService.ts`
- [ ] Create `createEvent()`, `updateEvent()`, `deleteEvent()`, `getEvent()`
- [ ] Add transactional conflict checking

#### 5.3 Write Firestore security rules
- [ ] **Files:** `firestore.rules`
- [ ] Rule 1: Participants can read their events
- [ ] Rule 2: Only creator can update/delete
- [ ] Rule 3: Cloud Functions can write all

#### 5.4 Write emulator tests for security rules
- [ ] **Files:** `app/__tests__/emulator/firestore-rules.test.ts`
- [ ] Setup: Install `@firebase/rules-unit-testing`, start emulator in test
- [ ] Test 1: Participant CAN read event ✅
- [ ] Test 2: Non-participant CANNOT read event ✅
- [ ] Test 3: Creator CAN update event ✅
- [ ] Test 4: Non-creator CANNOT update event ✅
- [ ] Test 5: Cloud Function CAN write event ✅
- [ ] Add to CI: Run emulator tests on every PR

**Acceptance Criteria:**
- Events collection works ✅
- CRUD operations ✅
- Conflict detection with transactions ✅
- Transactional overlap logic: two concurrent creates with overlapping windows → exactly one succeeds ✅
- Indexes deployed ✅
- Security rules enforce access ✅
- Jest test suite against `firestore-emulator` with allow/deny cases ✅
- Emulator tests run in CI ✅

---

### PR6: Wire Schedule UI to Backend (REVISED from "Schedule UI")

**Estimated Time:** 2-3 days

**High-Level Tasks:**
- [ ] Wire existing useEvents hook to Firestore /events collection
- [ ] Wire EventDetailsSheet action handlers to backend
- [ ] Wire AddLessonModal to AI parsing endpoint
- [ ] Integrate ConflictWarning with conflict detection service
- [ ] Test end-to-end event creation and display

**Key Files:** `app/src/hooks/useEvents.ts`, `app/src/components/EventDetailsSheet.tsx`, `app/src/components/AddLessonModal.tsx`, `app/src/components/MessageBubble.tsx`

**Detailed Subtasks:**

#### 6.1 Wire useEvents hook to Firestore
- [ ] **Files:** `app/src/hooks/useEvents.ts` (replace lines 18-109 - entire mock implementation)
- [ ] Replace mock data with Firestore onSnapshot listener
- [ ] Query: `where('participants', 'array-contains', userId)`
- [ ] Order by: `startTime asc`
- [ ] Convert Timestamps to Dates
- [ ] Add error handling and loading states
- [ ] **KEEP:** Event interface from EventListItem.tsx (already defined)

#### 6.2 Wire AddLessonModal to AI parsing
- [ ] **Files:** `app/src/components/AddLessonModal.tsx` (replace lines 20-33)
- [ ] Replace Alert.alert with fetch to `/api/ai/parse-lesson`
- [ ] Pass: {text, userId, timezone} to endpoint
- [ ] Create event in Firestore with returned data
- [ ] Show success/error messages
- [ ] Add loading state during API call

#### 6.3 Wire EventDetailsSheet actions
- [ ] **Files:** `app/src/components/EventDetailsSheet.tsx` (replace lines 38-61)
- [ ] **handleMessageGroup:** Navigate to `/chat/${event.conversationId}` (not alert)
- [ ] **handleReschedule:** Call AI reschedule endpoint, show suggestions
- [ ] **handleCancel:** Delete event from Firestore with `deleteDoc()`
- [ ] Add loading states and error handling

#### 6.4 Wire RSVP handlers in MessageBubble
- [ ] **Files:** `app/src/components/MessageBubble.tsx` (replace lines 162-167)
- [ ] **handleRSVPAccept:** Update message.meta.rsvp.responses in Firestore
- [ ] **handleRSVPDecline:** Update message.meta.rsvp.responses in Firestore
- [ ] Also update event status in /events collection
- [ ] Show success feedback (toast or status chip update)

#### 6.5 Wire EventCard press handler
- [ ] **Files:** `app/src/components/MessageBubble.tsx` (line 150)
- [ ] **handleEventPress:** Navigate to Schedule tab with eventId: `router.push(/schedule?eventId=${id})`
- [ ] Or open EventDetailsSheet modal with event data

#### 6.6 Integrate ConflictWarning with backend
- [ ] **Files:** `app/src/components/MessageBubble.tsx` (line 170)
- [ ] **handleConflictSelect:** Call rescheduling service with selected alternative
- [ ] Create new event with alternative time
- [ ] Delete or mark old event as rescheduled

#### 6.7 Test Schedule tab end-to-end
- [ ] Create event via AddLessonModal
- [ ] Verify event appears in EventList
- [ ] Tap event → EventDetailsSheet opens
- [ ] Tap "Message Group" → navigates to chat
- [ ] Tap "Cancel" → event deleted, UI updates
- [ ] Create overlapping event → ConflictWarning appears in chat

**Acceptance Criteria:**
- useEvents returns real Firestore data ✅
- Schedule tab displays real events ✅
- Create lesson via AI parsing works ✅
- All EventDetailsSheet actions functional ✅
- RSVP Accept/Decline updates Firestore ✅
- Conflicts detected and warnings shown ✅
- Real-time updates work ✅
- **UI unchanged from shipped PR-03** ✅

---

## Phase 3: RSVP System (PRs 7-8)

**Timeline:** 4-5 days total  
**Goal:** Track confirmations with interactive cards

### PR7: RSVP Backend Service

**Estimated Time:** 2-3 days

**High-Level Tasks:**
- [ ] Implement RSVP service for event confirmations
- [ ] Create rsvp.create_invite tool
- [ ] Create rsvp.record_response tool
- [ ] **Use shipped RSVPButtons and EventCard components**
- [ ] Wire components to RSVP service

**Key Files:** `app/src/types/eventTypes.ts`, `app/src/services/schedule/rsvpService.ts`, `functions/src/ai/toolExecutor.ts`

**Detailed Subtasks:**

#### 7.1 Implement RSVP service
- [ ] **Files:** `app/src/services/schedule/rsvpService.ts`
- [ ] Create `createInvite(eventId, participants[])`
- [ ] Create `recordResponse(eventId, userId, response: 'accepted' | 'declined')`
- [ ] Update event status based on responses
- [ ] Send notifications on status changes

#### 7.2 Implement rsvp.create_invite tool
- [ ] **Files:** `functions/src/ai/toolExecutor.ts`
- [ ] Tool handler creates message with meta.rsvp field
- [ ] Use shipped EventCard and RSVPButtons (they're already built!)
- [ ] Returns: {success, messageId, inviteId}

#### 7.3 Implement rsvp.record_response tool
- [ ] **Files:** `functions/src/ai/toolExecutor.ts`
- [ ] Tool handler updates Firestore message.meta.rsvp.responses
- [ ] Also updates /events/{eventId}/status
- [ ] Returns: {success, updatedStatus}

#### 7.4 Wire shipped RSVPButtons to backend
- [ ] **Files:** `app/src/components/MessageBubble.tsx` (already has RSVPButtons rendered)
- [ ] Replace lines 162-167 alerts with rsvpService calls
- [ ] Update useThreadStatus to reflect real responses
- [ ] Test: Accept → updates Firestore → StatusChip changes

**Acceptance Criteria:**
- createInvite creates message with EventCard + RSVPButtons ✅
- Accept/Decline buttons update Firestore ✅
- StatusChip in header reflects real RSVP state ✅
- Real-time status updates work ✅
- Tools integrated with AI orchestrator ✅
- **Use shipped EventCard and RSVPButtons** ✅

---

### PR8: NL Response Interpretation

**Estimated Time:** 2 days

**High-Level Tasks:**
- [ ] Build AI classifier for natural language RSVP responses
- [ ] Detect "yes", "no", "can't make it", etc.
- [ ] Auto-record response when confidence >0.7
- [ ] Prompt clarification when ambiguous

**Key Files:** `functions/src/ai/promptTemplates.ts`, `functions/src/ai/messageAnalyzer.ts`, `app/__tests__/services/rsvpInterpretation.test.ts`

**Detailed Subtasks:**

#### 8.1 Build RSVP classifier prompt
- [ ] **Files:** `functions/src/ai/promptTemplates.ts`
- [ ] Prompt: "Classify this response to an event invite. Return {response: accept|decline|unclear, confidence: 0.0-1.0}"
- [ ] Examples: "Yes that works" → accept (0.9), "Sorry can't" → decline (0.85), "Maybe" → unclear (0.3)

#### 8.2 Implement auto-recording
- [ ] **Files:** `functions/src/ai/messageAnalyzer.ts`
- [ ] If confidence >0.7 and response clear → auto-record via rsvp.record_response tool
- [ ] If unclear or ambiguity detected → prompt user for explicit confirmation

#### 8.3 Detect ambiguity words
- [ ] Keywords: "maybe", "should work", "might", "probably", "think so"
- [ ] If detected → require explicit confirm even if confidence high

#### 8.4 Write interpretation tests
- [ ] **Files:** `app/__tests__/services/rsvpInterpretation.test.ts`
- [ ] Test 15+ common phrases
- [ ] Verify >80% accuracy
- [ ] Test ambiguity detection

**Acceptance Criteria:**
- Classifier works for common phrases ✅
- Auto-records when confidence >0.7 ✅
- Explicit confirm required when ambiguity words detected ("maybe", "should work", "might") ✅
- Unclear responses prompt clarification ✅
- >80% accuracy ✅
- Eval suite includes RSVP interpretation tests ✅

---

## Phase 4: Priority & Conflicts (PRs 9-10)

**Timeline:** 4-5 days total  
**Goal:** Detect urgent messages and conflicts

### PR9: Urgency Detection

**Estimated Time:** 2 days

**High-Level Tasks:**
- [ ] Build urgency classifier (keyword + LLM hybrid)
- [ ] Add priority field to Message type
- [ ] **OPTIONAL:** Create UrgentBadge component (only if needed)
- [ ] Send push notifications for urgent messages

**Key Files:** `functions/src/ai/urgencyClassifier.ts`, `functions/src/notifications/urgentNotifier.ts`

**Detailed Subtasks:**

#### 9.1 Implement urgency classifier
- [ ] **Files:** `functions/src/ai/urgencyClassifier.ts`
- [ ] Keyword detection: "urgent", "ASAP", "emergency", "cancel", "reschedule needed"
- [ ] LLM classifier for context (is "cancel" urgent or casual?)
- [ ] Return: {isUrgent: boolean, confidence: number}

#### 9.2 Add priority field to Message type
- [ ] **Files:** `app/src/types/index.ts`
- [ ] Add optional field: `priority?: 'urgent' | 'high' | 'normal'`
- [ ] **NOTE:** Message type already has meta field from PR-02

#### 9.3 Optional: Create UrgentBadge component
- [ ] **Files:** `app/src/components/UrgentBadge.tsx` (ONLY if needed)
- [ ] Small red badge showing "Urgent" or "⚠️"
- [ ] Render in MessageBubble when message.priority === 'urgent'
- [ ] **DECISION:** May not need - priority could show in chat list instead

#### 9.4 Send urgent notifications
- [ ] **Files:** `functions/src/notifications/urgentNotifier.ts`
- [ ] On urgent message → send push notification immediately
- [ ] Use existing sendMessageNotification but with high priority flag

**Acceptance Criteria:**
- Keyword detection ("urgent", "cancel", "ASAP") ✅
- (Optional) Visual badge in chat ✅
- Push notification for urgent messages ✅
- >90% precision (low false positives) ✅

---

### PR10: Conflict Engine

**Estimated Time:** 2-3 days

**High-Level Tasks:**
- [ ] Implement conflict detection service
- [ ] Create Cloud Function trigger on event.onCreate
- [ ] Generate alternative time suggestions with AI
- [ ] **Use shipped ConflictWarning component** to display
- [ ] Post assistant message with conflict alert

**Key Files:** `app/src/services/schedule/conflictService.ts`, `functions/src/ai/conflictResolver.ts`

**Detailed Subtasks:**

#### 10.1 Build conflict detection service
- [ ] **Files:** `app/src/services/schedule/conflictService.ts`
- [ ] Function: `detectConflicts(newEvent, userEvents[])` → Event[]
- [ ] Check for time overlaps (account for DST)
- [ ] Check for travel time conflicts (future enhancement)

#### 10.2 Create event.onCreate trigger
- [ ] **Files:** `functions/src/index.ts`
- [ ] Trigger on /events document creation
- [ ] Fetch user's other events
- [ ] Call conflictService.detectConflicts()
- [ ] If conflicts found → generate alternatives with AI

#### 10.3 Generate alternative suggestions with AI
- [ ] **Files:** `functions/src/ai/conflictResolver.ts`
- [ ] Prompt: "Given these events and conflict, suggest 2-3 alternative times"
- [ ] Return array of {startTime, endTime, reason}

#### 10.4 Create assistant message with ConflictWarning
- [ ] **Files:** `functions/src/index.ts` (in trigger)
- [ ] Create message with senderId: 'assistant'
- [ ] Set meta.conflict with ConflictMeta structure
- [ ] **UI:** Shipped ConflictWarning component will automatically render this
- [ ] Set meta.conflict.suggestedAlternatives from AI response

#### 10.5 Wire ConflictWarning selection handler
- [ ] **Files:** `app/src/components/MessageBubble.tsx` (line 170)
- [ ] Replace alert with real action: reschedule to selected alternative
- [ ] Call eventService.updateEvent() with new time

**Acceptance Criteria:**
- Real-time conflict detection ✅
- Shipped ConflictWarning component displays conflicts ✅
- Assistant posts conflict alert via message.meta.conflict ✅
- AI suggests 2-3 alternatives ✅
- User can select alternative → event rescheduled ✅

---

## Phase 5: Tasks (PRs 11-12)

**Timeline:** 4-5 days total  
**Goal:** Track commitments and send reminders

### PR11: Wire Tasks UI + Auto-Extraction (REVISED from "Commitment Extraction")

**Estimated Time:** 2 days

**High-Level Tasks:**
- [ ] Wire existing useDeadlines hook to Firestore /deadlines collection
- [ ] Implement taskService for CRUD operations
- [ ] Build AI extractor for deadline detection in chat
- [ ] Test Tasks tab with real data

**Key Files:** `app/src/hooks/useDeadlines.ts`, `app/src/services/task/taskService.ts`, `functions/src/ai/taskExtractor.ts`

**Detailed Subtasks:**

#### 11.1 Create /deadlines collection
- [ ] **Files:** `firestore.rules`, `firestore.indexes.json`
- [ ] Schema: {id, title, dueDate, assignee, conversationId, completed, createdBy, createdAt, updatedAt}
- [ ] Index: (assignee, dueDate), (assignee, completed, dueDate)
- [ ] Security rules: assignee can read/update, creator can delete

#### 11.2 Wire useDeadlines hook to Firestore
- [ ] **Files:** `app/src/hooks/useDeadlines.ts` (replace lines 18-107 - entire mock implementation)
- [ ] Replace mock data with Firestore onSnapshot listener
- [ ] Query: `where('assignee', '==', userId), orderBy('dueDate', 'asc')`
- [ ] Convert Timestamps to Dates
- [ ] **KEEP:** Deadline interface from DeadlineList.tsx (already defined)

#### 11.3 Implement taskService CRUD
- [ ] **Files:** `app/src/services/task/taskService.ts`
- [ ] `addDeadline(deadline)` → addDoc to Firestore (not local state)
- [ ] `toggleComplete(deadlineId)` → updateDoc in Firestore (not local state)
- [ ] `deleteDeadline(deadlineId)` → deleteDoc from Firestore
- [ ] Update useDeadlines to use taskService

#### 11.4 Build AI deadline extractor
- [ ] **Files:** `functions/src/ai/taskExtractor.ts`
- [ ] Prompt: "Extract deadlines from this message. Return {title, dueDate, assignee}"
- [ ] Detect phrases: "due by", "deadline", "homework", "test on", "quiz"
- [ ] Call on message.onCreate when gating detects task

#### 11.5 Auto-create deadlines from chat
- [ ] **Files:** `functions/src/ai/messageAnalyzer.ts`
- [ ] When deadline detected → extract with AI
- [ ] Create in /deadlines collection
- [ ] Create assistant message with meta.deadline
- [ ] **UI:** Shipped DeadlineCard component will automatically render this

#### 11.6 Test Tasks tab with real data
- [ ] Create deadline via DeadlineCreateModal
- [ ] Verify appears in correct section (Overdue/Upcoming/Completed)
- [ ] Mark complete → moves to Completed section
- [ ] Create deadline from chat → appears in Tasks tab
- [ ] Tap deadline → navigates to conversation

**Acceptance Criteria:**
- useDeadlines returns real Firestore data ✅
- Tasks tab displays real deadlines ✅
- Detects "due by", "deadline" phrases ✅
- Auto-creates deadline entries ✅
- Mark complete updates Firestore ✅
- Navigation to conversation works ✅
- **UI unchanged from shipped PR-04** ✅

---

### PR12: Reminder Service + Outbox Worker

**Estimated Time:** 2-3 days

**High-Level Tasks:**
- [ ] Build reminder scheduler (Cloud Function runs hourly)
- [ ] Implement outbox worker for reliable delivery
- [ ] Add idempotency and deduplication
- [ ] Test 24h and 2h advance reminders

**Key Files:** `functions/src/notifications/outboxWorker.ts`, `functions/src/notifications/reminderScheduler.ts`, `firestore.rules`

**Detailed Subtasks:**

#### 12.1 Build reminder scheduler
- [ ] **Files:** `functions/src/notifications/reminderScheduler.ts`
- [ ] Create scheduled Cloud Function (runs hourly via Cloud Scheduler)
- [ ] Query events in next 24h and next 2h
- [ ] Query deadlines due in next 24h
- [ ] Write reminder docs to `notification_outbox` collection

#### 12.2 Build outbox worker
- [ ] **Files:** `functions/src/notifications/outboxWorker.ts`
- [ ] Create triggered Cloud Function on outbox.onCreate
- [ ] Send push notification via Expo Push API (reuse existing pushSender logic)
- [ ] Record attempt count, success/failure
- [ ] Retry with exponential backoff (max 3 attempts)

#### 12.3 Implement idempotency & dedupe
- [ ] Composite key: (entityType, entityId, targetUserId, reminderType)
- [ ] Check if reminder already sent before writing
- [ ] Update status after send (pending → sent | failed)

#### 12.4 Create notification_outbox collection
- [ ] **Files:** `firestore.rules`
- [ ] Schema: {id, type, entityId, targetUserId, title, body, data, status, attempts, createdAt}
- [ ] Security: only Cloud Functions can write

**Acceptance Criteria:**
- 24h advance reminders for sessions ✅
- 2h advance reminders for sessions ✅
- Task due date reminders ✅
- Outbox pattern for reliability ✅
- No duplicate sends per `(entityType, entityId, targetUserId, reminderType)` ✅
- Retries with exponential backoff (1s, 2s, 4s) ✅
- Attempt count recorded in outbox doc ✅
- Manual retry possible (failed → pending) ✅

---

## Phase 6: Proactive Assistant (PRs 13-14)

**Timeline:** 4-5 days total  
**Goal:** Autonomous monitoring and suggestions

### PR13: Autonomous Monitoring

**Estimated Time:** 2-3 days

**High-Level Tasks:**
- [ ] Build autonomous monitoring service
- [ ] Detect unconfirmed events 24h before
- [ ] **Use shipped AssistantBubble component** for nudges
- [ ] Implement pattern detection (no unsolicited AI-generated content)

**Key Files:** `functions/src/ai/autonomousMonitor.ts`, `functions/src/ai/patternDetector.ts`

**Detailed Subtasks:**

#### 13.1 Build monitoring service
- [ ] **Files:** `functions/src/ai/autonomousMonitor.ts`
- [ ] Scheduled function (runs every 6 hours)
- [ ] Query events with status='pending' and startTime within 24h
- [ ] Query conversations with no activity in 14+ days

#### 13.2 Implement nudge generator
- [ ] **Files:** `functions/src/ai/patternDetector.ts`
- [ ] Template-based nudges (NO OpenAI for simple notifications)
- [ ] "You have an unconfirmed session with {name} tomorrow at {time}"
- [ ] Create message with senderId='assistant', use shipped AssistantBubble

#### 13.3 Post nudge messages
- [ ] **Files:** `functions/src/ai/autonomousMonitor.ts`
- [ ] Create message in /messages collection
- [ ] Set meta.role = 'assistant' → triggers AssistantBubble rendering
- [ ] Do NOT send unsolicited AI-generated messages (only template nudges)

**Acceptance Criteria:**
- Detects unconfirmed events 24h before ✅
- Nudges tutor to follow up (template-based) ✅
- Shipped AssistantBubble component renders nudges ✅
- Does NOT send unsolicited AI-generated messages ✅

---

### PR14: Smart Nudges

**Estimated Time:** 2 days

**High-Level Tasks:**
- [ ] Post-session note prompt
- [ ] Long gap between sessions alert
- [ ] User settings to disable nudges
- [ ] Template-based only (no LLM)

**Key Files:** `functions/src/ai/nudgeGenerator.ts`, `app/app/(tabs)/profile.tsx` (add settings)

**Detailed Subtasks:**

#### 14.1 Post-session note reminder
- [ ] After session ends (check startTime + duration)
- [ ] Wait 30min, then prompt tutor to add notes
- [ ] Template: "How did the session with {student} go?"

#### 14.2 Long gap alert
- [ ] If >14 days since last session with student → nudge
- [ ] Template: "It's been 2 weeks since your last session with {student}. Schedule a follow-up?"

#### 14.3 Add nudge settings
- [ ] **Files:** `app/app/(tabs)/profile.tsx` (or new settings screen)
- [ ] Add toggle: "Enable smart nudges"
- [ ] Store in users/{uid}/settings/nudgesEnabled
- [ ] Check before sending any nudge

**Acceptance Criteria:**
- Post-session note prompt ✅
- Long gap between sessions alert ✅
- User can disable nudges in settings ✅
- Templates only (no OpenAI for MVP) ✅

---

## Phase 7: Push Notifications (PR15 - Already Implemented)

**Status:** ✅ COMPLETE in MessageAI MVP  
**Note:** Remote push via Cloud Functions + Expo Push Service already working

**Shipped Features:**
- ✅ FCM/APNs token collection
- ✅ Push token storage in Firestore
- ✅ sendMessageNotification Cloud Function
- ✅ Expo Push Service integration
- ✅ Foreground and background delivery
- ✅ Offline persistence enabled
- ✅ Presence status (online/offline)

**No Work Needed:** Skip PR15 entirely or just verify it works with new features.

---

## Additional Wiring Tasks (Add to Appropriate PRs)

### Wire AI Quick Actions (Add to PR3 or Create New Mini-PR)

**Files to Modify:**
- `app/src/components/AIQuickActions.tsx` (lines 24-31)
- `app/(tabs)/assistant.tsx` (lines 58-80)

**Tasks:**
- [ ] Wire "Suggest Time" → Call `/api/ai/suggest-times` endpoint
- [ ] Wire "Summarize" → Call `/api/ai/summarize-week` endpoint
- [ ] Wire "Create Deadline" → Open DeadlineCreateModal (already works!) or AI auto-create
- [ ] Wire "Set Reminder" → Call reminderService

### Wire Assistant Quick Actions Row (Add to PR13 or PR14)

**Files to Modify:**
- `app/src/components/AssistantActionRow.tsx` (lines 17-28)

**Tasks:**
- [ ] Replace default alert handler with real AI orchestrator calls
- [ ] Add loading states
- [ ] Show success/error feedback

### Install DateTimePicker (Optional Enhancement)

**Not blocking - can be done anytime:**
- [ ] Install: `npm install @react-native-community/datetimepicker`
- [ ] **Files:** `app/src/components/DeadlineCreateModal.tsx` (replace lines 67-86)
- [ ] Replace alert placeholders with real DateTimePicker components
- [ ] Test on iOS and Android

---

## Deployment Checklist

After all PRs are merged:

- [ ] Deploy Firestore indexes: `firebase deploy --only firestore:indexes`
- [ ] Deploy security rules: `firebase deploy --only firestore:rules`
- [ ] Deploy Cloud Functions: `firebase deploy --only functions`
- [ ] Set secrets: `firebase functions:secrets:set OPENAI_API_KEY ANTHROPIC_API_KEY`
- [ ] Enable Firebase Extensions: Firestore Vector Search
- [ ] Setup BigQuery export for Cloud Logging (cost tracking)
- [ ] Deploy cost dashboard queries
- [ ] Build mobile app: `eas build --profile production --platform all`
- [ ] Test on physical devices (iOS + Android)
- [ ] Run evaluation suite: `npm run eval`
- [ ] Verify eval suite passes with >85% accuracy
- [ ] Monitor costs (OpenAI/Anthropic dashboards + BigQuery)
- [ ] Set alert: cost >$10/1k messages
- [ ] Submit to TestFlight/Play Console for beta

---

## Cost Monitoring

### Cost Dashboard Setup

**Goal:** Keep AI costs under $10 per 1,000 messages

**Implementation:**

1. **Cloud Logging → BigQuery Export**
   - **Files:** `monitoring/cost-dashboard.sql`
   - Enable Cloud Logging export to BigQuery
   - Create dataset: `messageai_logs`
   - Export function logs with custom fields: `toolName`, `model`, `tokens`, `cost`

2. **Cost Tracking in Code**
   - **Files:** `functions/src/ai/aiGatingService.ts`, `functions/src/ai/toolExecutor.ts`
   - Log after each API call with token counts and costs

3. **BigQuery Queries**
   - **Files:** `monitoring/cost-dashboard.sql`
   - Query 1: Total cost by day/week
   - Query 2: Cost per tool
   - Query 3: Cost per task type (schedule, rsvp, task)
   - Query 4: Average cost per message
   - Query 5: Top users by cost

4. **Dashboard Visualization**
   - Use Google Data Studio or Looker
   - Chart daily cost trends and per-tool costs

5. **Alerting**
   - Set alert: if cost >$10/1k messages, send email
   - Monitor weekly, adjust prompts/models if needed

**Acceptance Criteria:**
- BigQuery export enabled ✅
- Logs include cost data ✅
- SQL queries return cost metrics ✅
- Dashboard visualizes trends ✅
- Alert configured ✅

---

## Evaluation Framework

### Test Conversations

**Files:** `monitoring/eval-suite/test-conversations.json`

Example structure:
```json
{
  "schedule": [
    {
      "input": "Can we meet tomorrow at 3pm?",
      "expected": {"task": "scheduling", "confidence": 0.9, "datetime": "2025-10-24T15:00:00"}
    }
    // ... 10+ examples
  ],
  "rsvp": [
    {
      "input": "Yes that works for me",
      "expected": {"task": "rsvp", "confidence": 0.9, "response": "accept"}
    }
    // ... 10+ examples
  ],
  "task": [
    {
      "input": "Homework is due Friday",
      "expected": {"task": "task", "confidence": 0.9, "dueDate": "2025-10-25"}
    }
    // ... 10+ examples
  ]
}
```

### Eval Runner

**Files:** `monitoring/eval-suite/eval-runner.ts`

- Loads test conversations
- Calls gating classifier + tools
- Measures accuracy, latency
- Reports results to CI

**CI Integration:**
- Add to `.github/workflows/eval.yml`
- Run on every PR to `main`
- Fail CI if accuracy <85% or P95 latency >500ms

---

## Naming Consistency (FINAL)

**UI/UX Copy:**
- ✅ "Schedule" (not Calendar) - Tab name, file names, user-facing text
- ✅ "Tasks" (not Deadlines) - Tab name, user-facing text
- ✅ "Deadlines" - Data model, internal variable names (useDeadlines, DeadlineList)
- ✅ "Events" - Data model, internal variable names (useEvents, EventList)
- ✅ "Lesson" - User-facing for tutoring sessions

**File Names (Confirmed Shipped):**
- ✅ `app/app/(tabs)/schedule.tsx`
- ✅ `app/app/(tabs)/tasks.tsx`
- ✅ `app/src/hooks/useEvents.ts`
- ✅ `app/src/hooks/useDeadlines.ts`

**Component Names (Confirmed Shipped):**
- ✅ `AssistantBubble.tsx` (not AssistantMessage)
- ✅ `EventCard.tsx` (not EventInviteCard)
- ✅ `EventDetailsSheet.tsx` (not EventConfirmModal)
- ✅ `ConflictWarning.tsx` (flat in components/, not in schedule/)
- ✅ `DeadlineList.tsx`, `DeadlineCard.tsx`, `DeadlineCreateModal.tsx`

---

## Summary of Revisions

### UI Tasks Removed (Already Shipped)
- ~~Build schedule tab UI~~ → Shipped in PR-03
- ~~Create event confirmation modal~~ → EventDetailsSheet shipped in PR-03
- ~~Build tasks tab UI~~ → Shipped in PR-04
- ~~Create EventInviteCard~~ → EventCard shipped in PR-02
- ~~Create AssistantMessage~~ → AssistantBubble shipped in PR-02
- ~~Add inline date suggestions~~ → EventCard shipped in PR-02

### Backend Tasks Added (Wiring Work)
- ✅ Wire useEvents to Firestore (PR6.1)
- ✅ Wire useDeadlines to Firestore (PR11.2)
- ✅ Wire EventDetailsSheet actions (PR6.3)
- ✅ Wire AddLessonModal to AI (PR6.2)
- ✅ Wire RSVP handlers (PR6.4, PR7.4)
- ✅ Wire conflict selection (PR10.5)
- ✅ Implement taskService CRUD (PR11.3)

### Optional Tasks (Can Skip)
- DateHighlight.tsx component (PR4) - Only if highlighting dates in chat
- UrgentBadge.tsx component (PR9) - Only if showing urgent badges
- useParsedMessage.ts hook - Only if needed for optimization

---

## References

### Shipped UI Documentation
- `docs/JellyDM_UI.md` - Complete UI architecture with mock tracking
- `docs/PR-01-TAB-SCAFFOLDING-COMPLETE.md` - Tab navigation
- `docs/PR-02-CHAT-ENHANCEMENTS-COMPLETE.md` - AI chat UI
- `docs/PR-03-SCHEDULE-TAB-COMPLETE.md` - Schedule tab
- `docs/PR-04-TASKS-TAB-COMPLETE.md` - Tasks tab
- `docs/PR-05-ASSISTANT-TAB-COMPLETE.md` - Assistant tab
- `docs/JELLYDM-TRANSFORMATION-SUMMARY.md` - Transformation summary

### For AI Integration
See `docs/JellyDM_UI.md` Section: "Mock/Placeholder Tracking" for:
- Exact line numbers of all placeholders
- Replacement code examples
- Backend schema requirements
- Integration patterns

---

**Last Updated:** October 23, 2025  
**Status:** Aligned with shipped UI (PRs 01-05)  
**Repository:** https://github.com/TURahim/MessageAI  
**Next:** Start with PR1 (AI infrastructure) while UI is complete

