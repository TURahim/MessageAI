# JellyDM AI Platform - 2-Minute Demo Video Script

**Total Time:** ~2 minutes  
**Target:** Technical demonstration of AI scheduling and conflict resolution  
**Tone:** Clear, professional, focused on technical innovation

---

## SCENE 1: The Problem (0:00-0:20)

### Narration:
"Traditional scheduling in messaging apps is slow and manual. Users have to type out dates, wait for responses, and manually check for conflicts. Most AI scheduling systems take 10-15 seconds due to multiple large language model calls."

### Visual:
- Show slow loading experience (old system)
- Clock ticking, showing 15 seconds
- Multiple "Thinking..." states

---

## SCENE 2: Our Solution - Fast-Path Architecture (0:20-0:50)

### Narration:
"We built JellyDM with a revolutionary fast-path architecture. When you say 'physics lesson Monday at 3pm,' here's what happens in under one second:

First, regex patterns instantly detect this is a scheduling request—no AI needed.

Second, Chrono-node parses 'Monday 3pm' into a timezone-aware UTC timestamp deterministically—again, no AI.

Third, our server creates the event, checks for conflicts, and posts a templated confirmation—all in parallel.

The result? Sub-second scheduling with zero LLM calls for 80% of messages."

### Visual (Side-by-side code + UI):
**LEFT: Code Flow**
```
1. Regex: "lesson + 3pm" → scheduling (10ms)
2. Chrono: "Monday 3pm" → UTC (5ms)  
3. Server: Create event (262ms)
4. Template: Confirmation (175ms)
───────────────────────
TOTAL: 725ms
```

**RIGHT: User Experience**
- Show message send
- Loading card appears (instant)
- Confirmation appears (<1s)
- Event in Schedule tab

---

## SCENE 3: Intelligent Conflict Resolution (0:50-1:20)

### Narration:
"But what about conflicts? Our AI conflict engine detects overlapping events in real-time. When a conflict occurs, GPT-4o-mini generates 2-3 smart alternative times based on the user's working hours and existing schedule.

Users see a clean purple card with tappable alternatives. One tap reschedules the event—no back-and-forth needed. The system tracks this with idempotency keys, so double-taps are handled gracefully."

### Visual:
**Show conflict flow:**
1. Create "art lesson Friday 3pm" → confirmed
2. Create "music lesson Friday 3pm" → conflict detected
3. **Conflict card appears:**
   ```
   ⚠️ Conflict detected
   
   This overlaps with another session.
   
   [Fri • 4:00-5:00 PM]  ← Tap this
   [Sat • 3:00-4:00 PM]
   
   Keep current time
   ```
4. Tap alternative → event rescheduled
5. **Calendar shows red highlight on Friday initially**
6. **Red disappears after resolution**

---

## SCENE 4: Per-User Timezone Rendering (1:20-1:45)

### Narration:
"Everything is timezone-aware. Events are stored in UTC, but rendered in each viewer's local timezone. When a tutor in New York schedules 3pm, their student in Los Angeles sees 12pm—automatically.

Users can change their timezone anytime in their profile, and all confirmations, notifications, and calendar displays update instantly."

### Visual:
**Split screen:**
- **LEFT:** User A (Eastern) sees "Mon, Oct 27 at 3:00 PM"
- **RIGHT:** User B (Pacific) sees "Mon, Oct 27 at 12:00 PM"
- Same event, different rendering
- Show profile timezone selector (16 zones)

---

## SCENE 5: Privacy & Cost Efficiency (1:45-2:00)

### Narration:
"Behind the scenes, we've implemented comprehensive privacy and cost controls. Personal information is automatically redacted before any embedding generation. We track costs in real-time, and our fast-path design reduced operational costs by 93%.

The system is idempotent at every layer—events, tasks, messages, and reschedules—eliminating duplicates even under network failures or rapid user interactions."

### Visual:
**Dashboard-style metrics:**
```
Performance:
  ✅ 725ms average (93% faster)
  
Cost:
  ✅ $0.0002/message (93% cheaper)
  
Privacy:
  ✅ PII redacted before AI
  ✅ Only 100-char snippets stored
  
Reliability:
  ✅ Idempotency: 0 duplicates
  ✅ Conflict resolution: 100% success
```

---

## CLOSING (2:00)

### Narration:
"JellyDM: Production-ready AI scheduling in under a second."

### Visual:
- App icon
- Key stat overlay: "725ms | 93% faster | 0 duplicates"

---

## 🎬 TECHNICAL TALKING POINTS (For Q&A)

### Architecture Highlights:

**1. Fast-Path Design:**
- Hybrid approach: Heuristics for clear cases, LLM for ambiguous
- Eliminates unnecessary AI calls (80% fast-path coverage)
- Chrono-node handles "Monday 3pm", "tomorrow at 5", "next week Tuesday"
- Falls back to GPT-4o-mini only when truly needed

**2. Conflict Resolution:**
- Real-time detection using Firestore queries
- AI generates context-aware alternatives (time of day, working hours)
- One-tap resolution with backend reschedule actions
- Visual indicators (red calendar dates, conflict badges)
- Privacy-preserving (doesn't reveal other participants' details)

**3. Timezone Handling:**
- Single source of truth: `formatInUserTimezone(date, userId)`
- Events stored UTC, rendered per-viewer
- Auto-detection on signup
- ESLint rules prevent hardcoded timezone regressions

**4. Idempotency Strategy:**
- Event creation: `${conversationId}_${title}_${date}` key
- Task creation: `${conversationId}_${title}_${dueDate}` key
- Reschedules: `${conflictId}_${alternativeIndex}` key
- Message deduplication: Check by eventId/deadlineId
- Write-once guard: Per-correlation tracking

**5. RAG Privacy:**
- PII redactor removes phones, emails, addresses, SSNs
- 500-char limit per message
- Only 100-char snippets stored
- Cost tracking with token estimates
- Idempotent embedding (check before regenerate)

### Code Statistics:
- **Total commits:** 17
- **Files created:** 12
- **Lines added:** ~4,500
- **Performance improvement:** 93%
- **Cost reduction:** 93%

### Models Used:
- **Fast-path:** 0 LLM calls (regex + chrono-node)
- **Gating fallback:** GPT-3.5-turbo (~500ms)
- **Disambiguation:** GPT-4o-mini (~800ms)
- **Conflict alternatives:** GPT-4o-mini (~3-5s)
- **Embeddings:** text-embedding-3-small (when enabled)

---

## 🎯 DEMO SEQUENCE (Suggested)

### Live Demo Flow:

**1. Fast Scheduling (0:30)**
```
Type: "chemistry lesson Wednesday at 4pm"
Show: Instant loading card → <1s confirmation
Highlight: No lag, smooth UX
```

**2. Conflict Detection (0:40)**
```
Type: "biology lesson Wednesday at 4pm"
Show: Conflict card with 3 alternatives
Tap: First alternative
Result: Rescheduled instantly, confirmation posted
Calendar: Red highlight appears then clears
```

**3. Timezone Demo (0:20)**
```
Show: Profile screen with timezone
Change: Eastern → Pacific
Create: New event
Result: Time displayed in Pacific timezone
```

**4. Multi-User View (0:20)**
```
Split screen: Two devices
Same event: Different timezone displays
Show: Real-time RSVP updates
```

**5. Technical Deep-Dive (0:10)**
```
Show: Firebase Console
  - Events collection (UTC storage)
  - conflict_logs (alternatives)
  - vector_messages (PII-redacted)
Cloud Functions logs:
  - Fast-path succeeded logs
  - Cost tracking
  - Performance metrics
```

---

## 📝 KEY MESSAGES TO EMPHASIZE

### Innovation Points:
1. **"93% faster than traditional AI scheduling"**
2. **"Zero LLM calls for 80% of scheduling messages"**
3. **"Privacy-first RAG with automatic PII redaction"**
4. **"Idempotent at every layer—no duplicates, ever"**
5. **"Per-viewer timezone rendering for global teams"**

### Technical Differentiators:
- Hybrid AI approach (fast-path + intelligent fallback)
- Server-side orchestration (not client-side LLM calls)
- Template-based confirmations (consistent, instant)
- Real-time conflict detection with AI alternatives
- Feature-flagged architecture (safe rollouts)

---

## 🎬 ALTERNATIVE FORMATS

### 30-Second Elevator Pitch:
"JellyDM revolutionizes AI scheduling. By using deterministic parsing and templates for clear cases and reserving LLM calls for truly ambiguous scenarios, we achieve sub-second scheduling—93% faster than traditional AI systems—while cutting costs by 93%. Intelligent conflict resolution with one-tap alternatives and per-user timezone support make it production-ready for global tutoring platforms."

### 60-Second Technical Overview:
"Traditional AI scheduling makes multiple slow LLM calls for simple tasks. JellyDM's fast-path architecture uses regex patterns to detect scheduling intent instantly, Chrono-node to parse dates deterministically, and templated responses for confirmations—eliminating LLM calls entirely for 80% of messages.

When conflicts arise, GPT-4o-mini generates context-aware alternatives based on working hours and existing schedule. Users tap an alternative, and the event reschedules automatically with full idempotency protection.

Everything is timezone-aware: events store in UTC, render in each user's timezone, with automatic detection and ESLint guards preventing regressions.

The result: 725-millisecond scheduling, 93% cost reduction, and zero duplicates—production-ready AI scheduling."

---

## 📊 SLIDES (If Presenting)

### Slide 1: Problem
- Title: "The AI Scheduling Bottleneck"
- Bullet: Traditional systems: 10-15 seconds
- Bullet: Multiple expensive LLM calls
- Bullet: No conflict awareness

### Slide 2: Solution
- Title: "Fast-Path Architecture"
- Diagram: Flow chart (regex → chrono → template)
- Stat: <1 second, 0 LLM calls

### Slide 3: Conflict Resolution
- Title: "Intelligent Conflict Handling"
- Screenshot: Conflict card
- Bullet: AI-powered alternatives
- Bullet: One-tap resolution

### Slide 4: Results
- Title: "Production Metrics"
- 93% faster | 93% cheaper | 0 duplicates
- Ready for beta testing

---

**End of Script**

This script is optimized for a 2-minute technical demo showcasing the key innovations of your AI platform. You can adjust pacing based on whether you want more demo time or more explanation time.

