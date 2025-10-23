# JellyDM UI/UX Architecture - Tutor Messaging Platform

**Project:** MessageAI → JellyDM (Tutor-Focused Messaging)  
**Date:** October 23, 2025  
**Status:** UI Scaffolding Complete - Ready for AI Integration  
**Version:** 2.0.0 (Tutor Edition)

---

## Table of Contents

1. [Overview](#overview)
2. [UI Transformation Summary](#ui-transformation-summary)
3. [Component Architecture](#component-architecture)
4. [Tab Structure](#tab-structure)
5. [Mock/Placeholder Tracking](#mockplaceholder-tracking)
6. [AI Integration Points](#ai-integration-points)
7. [Design System](#design-system)
8. [File Map](#file-map)
9. [Next Steps](#next-steps)

---

## Overview

JellyDM is a transformation of MessageAI from a general messaging app into a specialized tutor-parent-student communication platform with AI-powered scheduling assistance. The UI maintains the solid foundation of MessageAI while adding tutor-specific features.

**Core Personas:**
- **Tutors** - Manage schedule, track progress, avoid double-booking
- **Parents** - Understand child's progress, see schedule, receive updates
- **Students** - Know homework, stay organized, avoid missed sessions

**Key Differentiation:**
- AI automatically detects scheduling conflicts
- Smart calendar extraction from chat messages
- Decision summarization and progress tracking
- RSVP tracking for session confirmations
- Deadline/reminder extraction

---

## UI Transformation Summary

### Phase 1: PR-01 - Tab Navigation (Complete ✅)
**Goal:** Introduce 5-tab layout replacing 2-tab structure  
**Status:** Complete with icons and empty states

**Changes:**
- Added 3 new tabs: Schedule, Tasks, Assistant
- Created TabIcon component for consistent tab bar
- Created SectionHeader for reusable headers
- All tabs functional with navigation

**Files:** 6 files (5 new, 1 modified)  
**Lines:** 183 lines added

---

### Phase 2: PR-02 - AI-Aware Chat UI (Complete ✅)
**Goal:** Add AI assistant identity, RSVP/status chips, inline cards, quick actions  
**Status:** Complete with mock actions

**Changes:**
- AssistantBubble for AI messages (purple theme)
- StatusChip with 4 variants (pending/confirmed/declined/conflict)
- Inline cards: EventCard, DeadlineCard, ConflictWarning, RSVPButtons
- AIQuickActions bottom sheet (4 actions)
- Extended Message type with meta field
- Header shows status chip when active invite detected

**Files:** 12 files (8 new, 4 modified)  
**Lines:** ~950 lines added

---

### Phase 3: PR-03 - Schedule Tab (Complete ✅)
**Goal:** Week/month views, event list, details sheet, "Add Lesson"  
**Status:** Complete with mock data

**Changes:**
- CalendarHeader with week navigation
- EventList with day grouping
- EventDetailsSheet modal
- AddLessonModal with AI parsing placeholder
- FAB component
- useEvents hook with 7 mock events

**Files:** 8 files (7 new, 1 modified)  
**Lines:** ~1,000 lines added

---

### Phase 4: PR-04 - Tasks Tab (Complete ✅)
**Goal:** Deadlines list, filters, quick create  
**Status:** Complete with mock data

**Changes:**
- DeadlineList with Overdue/Upcoming/Completed sections
- DeadlineCreateModal with assignee selector
- ProgressRing component
- useDeadlines hook with 8 mock tasks
- Smart date formatting and color coding

**Files:** 5 files (4 new, 1 modified)  
**Lines:** ~760 lines added

---

### Phase 5: PR-05 - Assistant Tab (Complete ✅)
**Goal:** Insights widgets + quick actions dashboard  
**Status:** Complete with real-time calculations

**Changes:**
- InsightCard widget component
- InsightsGrid responsive layout
- AssistantActionRow for quick actions
- 5 calculated insights from mock data
- Personalized greeting

**Files:** 4 files (3 new, 1 modified)  
**Lines:** ~370 lines added

---

## Component Architecture

### Component Hierarchy

```
App
├── Root Layout (_layout.tsx)
│   ├── Auth Provider
│   └── Stack Navigator
│       ├── (auth) Group
│       │   ├── login.tsx
│       │   └── signup.tsx
│       └── (tabs) Group
│           ├── Tab Navigator (_layout.tsx) ← UPDATED PR-01
│           │   ├── index.tsx (Chats) ← EXISTING
│           │   ├── schedule.tsx ← NEW PR-03
│           │   ├── tasks.tsx ← NEW PR-04
│           │   ├── assistant.tsx ← NEW PR-05
│           │   └── profile.tsx ← EXISTING
│           ├── chat/[id].tsx ← MODIFIED PR-02
│           ├── users.tsx (Suggested Contacts)
│           ├── newGroup.tsx
│           ├── profile/[id].tsx
│           └── groupInfo/[id].tsx
```

### Shared Components

#### PR-01 Components
- **TabIcon** - Tab bar icon with label
- **SectionHeader** - Reusable section header

#### PR-02 Components (AI Chat)
- **StatusChip** - RSVP status indicator (4 variants)
- **AssistantBubble** - AI message container (purple theme)
- **EventCard** - Calendar event inline card
- **DeadlineCard** - Task/homework inline card
- **ConflictWarning** - Scheduling conflict banner
- **RSVPButtons** - Accept/Decline buttons
- **AIQuickActions** - Bottom sheet with 4 AI actions

#### PR-03 Components (Schedule)
- **CalendarHeader** - Week navigation
- **EventListItem** - Event card
- **EventList** - Day-grouped event list
- **EventDetailsSheet** - Event details modal
- **AddLessonModal** - Natural language lesson creation
- **FAB** - Floating action button (reusable)

#### PR-04 Components (Tasks)
- **ProgressRing** - Simplified progress indicator
- **DeadlineList** - Sectioned deadline list
- **DeadlineCreateModal** - Task creation with assignee

#### PR-05 Components (Assistant)
- **InsightCard** - Dashboard widget
- **InsightsGrid** - Responsive grid layout
- **AssistantActionRow** - Quick action buttons

### Hooks

#### PR-02 Hooks
- **useThreadStatus** - Derives RSVP state from messages

#### PR-03 Hooks
- **useEvents** - Fetches events (mock data)

#### PR-04 Hooks
- **useDeadlines** - Fetches deadlines (mock data + actions)

---

## Tab Structure

### Tab 1: Chats (Existing)
**File:** `app/app/(tabs)/index.tsx`  
**Status:** Unchanged from MessageAI  
**Features:**
- Friends list with online status
- Recent conversations
- Message preview with timestamps
- FAB to find friends
- "New Group" button

**No changes needed** - This tab remains the core messaging experience

---

### Tab 2: Schedule (New)
**File:** `app/app/(tabs)/schedule.tsx`  
**Status:** Complete with mock data  
**Features:**
- Week calendar with horizontal scroll
- Event list grouped by day
- Event details modal
- "Add Lesson" with AI parsing
- 7 mock events

**Dependencies:**
- CalendarHeader, EventList, EventListItem
- EventDetailsSheet, AddLessonModal
- FAB, LoadingSpinner
- useEvents hook

---

### Tab 3: Tasks (New)
**File:** `app/app/(tabs)/tasks.tsx`  
**Status:** Complete with mock data  
**Features:**
- Three sections: Overdue, Upcoming, Completed
- Smart date formatting
- Mark complete/incomplete
- Create task modal
- Assignee selector (yourself + friends)
- 8 mock deadlines

**Dependencies:**
- DeadlineList, DeadlineCreateModal
- ProgressRing, FAB
- LoadingSpinner
- useDeadlines hook

---

### Tab 4: Assistant (New)
**File:** `app/app/(tabs)/assistant.tsx`  
**Status:** Complete with calculated insights  
**Features:**
- Personalized greeting
- 5 insight widgets (calculated from mock data)
- Responsive 2-column grid
- 4 quick action buttons
- Real-time calculations

**Dependencies:**
- InsightCard, InsightsGrid, AssistantActionRow
- useEvents, useDeadlines hooks
- dayjs for date calculations

---

### Tab 5: Profile (Existing)
**File:** `app/app/(tabs)/profile.tsx`  
**Status:** Unchanged from MessageAI  
**Features:**
- Display name and email
- Photo upload
- Edit profile
- Sign out

**No changes needed** - Standard profile functionality

---

## Mock/Placeholder Tracking

### 🚨 CRITICAL: Areas to Replace When Wiring AI Orchestrator

This section tracks ALL mock/placeholder implementations that need to be replaced with real AI/backend functionality.

---

### PR-02: AI-Aware Chat UI

#### File: `src/components/MessageBubble.tsx`

**Lines 150-172: Mock Card Action Handlers**

```typescript
// MOCK - Replace with real handlers
const handleEventPress = () => {
  Alert.alert('Event Details', 'Event details will open here once AI orchestrator is connected.');
};

const handleDeadlinePress = () => {
  Alert.alert('Deadline Details', 'Deadline details will open here once AI orchestrator is connected.');
};

const handleMarkDone = () => {
  Alert.alert('Mark Done', 'Deadline marked as done (mock action)');
};

const handleRSVPAccept = () => {
  Alert.alert('RSVP', 'You accepted the invite (mock action)');
};

const handleRSVPDecline = () => {
  Alert.alert('RSVP', 'You declined the invite (mock action)');
};

const handleConflictSelect = (index: number) => {
  Alert.alert('Alternative Selected', `You selected alternative #${index + 1} (mock action)`);
};
```

**Replace with:**
```typescript
const handleEventPress = () => {
  router.push(`/schedule?eventId=${message.meta.event.eventId}`);
};

const handleRSVPAccept = async () => {
  await updateEventRSVP(message.meta.rsvp.eventId, currentUserId, 'accepted');
};

// ... etc
```

---

#### File: `src/components/AIQuickActions.tsx`

**Lines 24-31: Default No-Op Handler**

```typescript
// MOCK - Replace with real AI calls
const handleAction = (actionName: string, action?: () => void) => {
  if (action) {
    action();
  } else {
    Alert.alert('Coming Soon', `${actionName} will be available once AI orchestrator is connected.`);
  }
  onClose();
};
```

**Replace with:**
```typescript
const handleAction = async (actionName: string, action?: () => void) => {
  if (action) {
    action();
  } else {
    // Call AI orchestrator endpoint
    await callAIOrchestrator(actionName, conversationId);
  }
  onClose();
};
```

---

#### File: `src/hooks/useThreadStatus.ts`

**Status:** Ready - No mocks, calculates from real message data  
**Note:** This hook scans messages for meta fields. Works with real data when AI starts creating messages.

---

### PR-03: Schedule Tab

#### File: `src/hooks/useEvents.ts`

**Lines 18-109: Entire Hook is Mock Data**

```typescript
// MOCK - Replace entire implementation with Firestore queries
export function useEvents(userId: string | null, selectedDate?: Date) {
  // ... mock events generation ...
  const mockEvents: Event[] = [ /* 7 hardcoded events */ ];
  // ...
}
```

**Replace with:**
```typescript
export function useEvents(userId: string | null, selectedDate?: Date) {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;

    const eventsRef = collection(db, 'events');
    const q = query(
      eventsRef,
      where('participants', 'array-contains', userId),
      orderBy('startTime', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const eventsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        startTime: doc.data().startTime.toDate(),
        endTime: doc.data().endTime.toDate(),
      })) as Event[];

      setEvents(eventsData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [userId, selectedDate]);

  return { events, loading };
}
```

---

#### File: `src/components/EventDetailsSheet.tsx`

**Lines 38-61: Mock Action Handlers**

```typescript
// MOCK - Replace with real navigation and AI
const handleMessageGroup = () => {
  Alert.alert('Message Group', 'This will open the group chat (mock action)');
  onClose();
};

const handleReschedule = () => {
  Alert.alert('Reschedule', 'Reschedule functionality coming soon with AI');
  onClose();
};

const handleCancel = () => {
  Alert.alert('Cancel Session', '...');
  // Mock confirmation
};
```

**Replace with:**
```typescript
const handleMessageGroup = () => {
  if (event.conversationId) {
    router.push(`/chat/${event.conversationId}`);
  }
  onClose();
};

const handleReschedule = async () => {
  const suggestions = await callAI('/api/ai/reschedule', { eventId: event.id });
  // Show suggestions...
  onClose();
};

const handleCancel = async () => {
  await deleteDoc(doc(db, 'events', event.id));
  onClose();
};
```

---

#### File: `src/components/AddLessonModal.tsx`

**Lines 20-33: Mock AI Parsing**

```typescript
// MOCK - Replace with real AI parsing
const handleSubmit = () => {
  if (!text.trim()) {
    Alert.alert('Empty Input', 'Please describe the lesson you want to schedule');
    return;
  }

  Alert.alert(
    'AI Scheduling',
    `AI will parse: "${text.trim()}"\n\nThis will be connected to the AI orchestrator...`
  );
  
  setText('');
  onClose();
};
```

**Replace with:**
```typescript
const handleSubmit = async () => {
  if (!text.trim()) {
    Alert.alert('Empty Input', 'Please describe the lesson you want to schedule');
    return;
  }

  setLoading(true);
  try {
    const response = await fetch('/api/ai/parse-lesson', {
      method: 'POST',
      body: JSON.stringify({ text: text.trim(), userId }),
    });

    const { event } = await response.json();
    
    // Create event in Firestore
    await addDoc(collection(db, 'events'), {
      ...event,
      startTime: Timestamp.fromDate(event.startTime),
      endTime: Timestamp.fromDate(event.endTime),
    });

    Alert.alert('Success', 'Lesson scheduled!');
    setText('');
    onClose();
  } catch (error) {
    Alert.alert('Error', error.message);
  } finally {
    setLoading(false);
  }
};
```

---

### PR-04: Tasks Tab

#### File: `src/hooks/useDeadlines.ts`

**Lines 18-107: Entire Hook is Mock Data**

```typescript
// MOCK - Replace entire implementation with Firestore queries
export function useDeadlines(userId: string | null) {
  // ... mock deadlines generation ...
  const mockDeadlines: Deadline[] = [ /* 8 hardcoded deadlines */ ];
  // ...
  
  // MOCK - Local state only
  const addDeadline = (deadline: Omit<Deadline, 'id'>) => {
    setDeadlines(prev => [...prev, newDeadline]);
  };
  
  const toggleComplete = (deadlineId: string) => {
    setDeadlines(prev => prev.map(...));
  };
}
```

**Replace with:**
```typescript
export function useDeadlines(userId: string | null) {
  const [deadlines, setDeadlines] = useState<Deadline[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;

    const deadlinesRef = collection(db, 'deadlines');
    const q = query(
      deadlinesRef,
      where('assignee', '==', userId),
      orderBy('dueDate', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const deadlinesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        dueDate: doc.data().dueDate.toDate(),
        createdAt: doc.data().createdAt?.toDate(),
      })) as Deadline[];

      setDeadlines(deadlinesData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [userId]);

  const addDeadline = async (deadline: Omit<Deadline, 'id'>) => {
    await addDoc(collection(db, 'deadlines'), {
      ...deadline,
      dueDate: Timestamp.fromDate(deadline.dueDate),
      createdAt: Timestamp.now(),
    });
  };

  const toggleComplete = async (deadlineId: string) => {
    const ref = doc(db, 'deadlines', deadlineId);
    const current = await getDoc(ref);
    await updateDoc(ref, { completed: !current.data()?.completed });
  };

  return { deadlines, loading, addDeadline, toggleComplete };
}
```

---

#### File: `src/components/DeadlineCreateModal.tsx`

**Lines 67-86: Simplified Date/Time Picker (Alerts)**

```typescript
// MOCK - Replace with real DateTimePicker
const handleDatePress = () => {
  Alert.alert('Set Date', 'Date/time picker will be implemented...');
  setDueDate(dayjs().add(1, 'day').hour(17).minute(0).toDate());
};

const handleTimePress = () => {
  Alert.alert('Set Time', 'Date/time picker will be implemented...');
  setDueDate(dayjs(dueDate).hour(17).minute(0).toDate());
};
```

**Replace with:**
```typescript
// Install: npm install @react-native-community/datetimepicker

const [showDatePicker, setShowDatePicker] = useState(false);
const [showTimePicker, setShowTimePicker] = useState(false);

const handleDatePress = () => {
  setShowDatePicker(true);
};

const handleTimePress = () => {
  setShowTimePicker(true);
};

// Add in JSX:
{showDatePicker && (
  <DateTimePicker
    value={dueDate}
    mode="date"
    onChange={(e, date) => {
      setShowDatePicker(Platform.OS === 'ios');
      if (date) setDueDate(date);
    }}
  />
)}
```

---

#### File: `src/components/DeadlineList.tsx`

**Lines 106-110: Mock Navigation**

```typescript
// MOCK - Currently just tap handler, needs real navigation
const handleDeadlinePress = (deadline: Deadline) => {
  if (onDeadlinePress) {
    onDeadlinePress(deadline);
  } else if (deadline.conversationId) {
    router.push(`/chat/${deadline.conversationId}`);  // This is good, not mock
  }
};
```

**Status:** Actually good - will work when conversationId is present. May need to wire onDeadlinePress for detail modal.

---

### PR-05: Assistant Tab

#### File: `src/components/AssistantActionRow.tsx`

**Lines 17-28: Default Placeholder Alerts**

```typescript
// MOCK - Replace with real AI orchestrator calls
const handlePress = (action: AssistantAction) => {
  if (action.onPress) {
    action.onPress();
  } else {
    Alert.alert(action.title, `This action will be connected to the AI orchestrator...`);
  }
};
```

**Replace with:**
```typescript
const handlePress = async (action: AssistantAction) => {
  if (action.onPress) {
    action.onPress();
    return;
  }

  // Call AI orchestrator based on action type
  try {
    setLoading(true);
    const response = await callAIAction(action.title, userId);
    // Handle response...
  } catch (error) {
    Alert.alert('Error', error.message);
  } finally {
    setLoading(false);
  }
};
```

---

#### File: `app/(tabs)/assistant.tsx`

**Lines 58-80: Quick Actions with Partial Implementation**

```typescript
// PARTIALLY IMPLEMENTED - Only "Resend Reminders" has custom onPress
const assistantActions = [
  {
    icon: '📧',
    title: 'Resend Reminders',
    description: 'Send reminders for pending invites',
    onPress: () => Alert.alert('Resend Reminders', `Sending...`), // ← Has onPress but still mock
  },
  {
    icon: '📊',
    title: 'Summarize Week',
    description: 'Get a summary of this week\'s activities',
    // ← No onPress, uses default alert
  },
  // ... others also no onPress
];
```

**Replace with:**
```typescript
const assistantActions = [
  {
    icon: '📧',
    title: 'Resend Reminders',
    description: 'Send reminders for pending invites',
    onPress: async () => {
      await sendPendingReminders(userId, insights.unconfirmedCount);
      Alert.alert('Success', 'Reminders sent!');
    },
  },
  {
    icon: '📊',
    title: 'Summarize Week',
    description: 'Get a summary of this week\'s activities',
    onPress: async () => {
      const summary = await generateWeeklySummary(userId);
      router.push(`/summary?data=${encodeURIComponent(summary)}`);
    },
  },
  // ... implement others
];
```

---

#### File: `app/(tabs)/assistant.tsx`

**Lines 17-54: Insights Calculation**

**Status:** ✅ READY - Not mock!  
**Note:** Calculations use real logic but operate on mock data. Will automatically work with real Firestore data once useEvents and useDeadlines are wired to backend.

No changes needed - just replace the data sources.

---

### Mock Data Hooks

#### File: `src/hooks/useEvents.ts`

**Status:** 🚨 ENTIRE FILE IS MOCK  
**Lines:** 1-116  
**Mock Data:** 7 hardcoded events

**Backend Schema Needed:**
```typescript
// Firestore collection: /events/{eventId}
interface EventDocument {
  id: string;
  title: string;
  startTime: Timestamp;
  endTime: Timestamp;
  participants: string[];
  status: 'pending' | 'confirmed' | 'declined';
  conversationId?: string;
  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

---

#### File: `src/hooks/useDeadlines.ts`

**Status:** 🚨 ENTIRE FILE IS MOCK  
**Lines:** 1-128  
**Mock Data:** 8 hardcoded deadlines  
**Mock Actions:** addDeadline, toggleComplete, deleteDeadline (local state only)

**Backend Schema Needed:**
```typescript
// Firestore collection: /deadlines/{deadlineId}
interface DeadlineDocument {
  id: string;
  title: string;
  dueDate: Timestamp;
  assignee: string;
  conversationId?: string;
  completed: boolean;
  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

---

### Message Metadata (Ready for AI)

#### File: `src/types/index.ts`

**Lines 7-48: AI Metadata Types**

**Status:** ✅ READY - Type definitions complete  
**Usage:** AI orchestrator should create messages with these meta fields

**Example AI-Generated Message:**
```typescript
// When AI detects a time mention in chat
const assistantMessage: Message = {
  id: newMessageId(),
  conversationId: 'conv_123',
  senderId: 'assistant',
  type: 'text',
  text: 'I found a good time for your math tutoring session!',
  meta: {
    role: 'assistant',
    event: {
      eventId: 'event_456',
      title: 'Math Tutoring',
      startTime: Timestamp.fromDate(new Date('2025-10-25T15:00:00')),
      endTime: Timestamp.fromDate(new Date('2025-10-25T16:00:00')),
      participants: ['user_1', 'user_2'],
      status: 'pending',
    },
    rsvp: {
      eventId: 'event_456',
      responses: {},
    },
  },
  // ... rest of message fields
};

// Save to Firestore
await addDoc(collection(db, 'messages'), assistantMessage);
```

UI will automatically render EventCard and RSVPButtons when this message appears.

---

## AI Integration Points

### 1. Smart Calendar Extraction

**Where:** Chat messages analysis  
**Components Ready:** EventCard, RSVPButtons  
**Backend Needed:**
- Cloud Function triggered on message.onCreate
- AI parsing to detect times/dates in text
- Create assistant message with meta.event
- Create event in /events collection

**Example Flow:**
```
User: "Can we meet tomorrow at 3pm?"
  ↓
AI Cloud Function analyzes text
  ↓
Creates assistant message: "I'll schedule that for tomorrow at 3pm"
  ↓
Message has meta.event + meta.rsvp
  ↓
UI renders EventCard with Accept/Decline buttons
```

---

### 2. Decision Summarization

**Where:** AIQuickActions → "Summarize Week"  
**Components Ready:** AssistantActionRow  
**Backend Needed:**
- Endpoint: `/api/ai/summarize-week`
- Fetches recent messages from conversation
- AI generates summary
- Returns formatted text or creates assistant message

**Current State:** Shows placeholder alert  
**Wire To:**
```typescript
const onSummarize = async () => {
  const summary = await fetch('/api/ai/summarize-week', {
    method: 'POST',
    body: JSON.stringify({ userId, startDate, endDate }),
  }).then(r => r.json());
  
  // Navigate to summary screen or show in modal
  router.push(`/summary?text=${encodeURIComponent(summary.text)}`);
};
```

---

### 3. Priority Highlighting

**Where:** Not yet implemented  
**Proposed Location:** Message flags or filters in Chats tab  
**Components Needed:**
- PriorityBadge component
- Filter buttons in Chats header
- AI backend to classify messages

**Future Implementation:**
```typescript
// Add to Message type
interface Message {
  // ... existing fields
  priority?: 'urgent' | 'reschedule' | 'test' | 'normal';
}

// Filter in Chats
const urgentMessages = messages.filter(m => m.priority === 'urgent');
```

---

### 4. RSVP Tracking

**Where:** Chat header StatusChip  
**Components Ready:** StatusChip, useThreadStatus hook, RSVPButtons  
**Backend Needed:**
- Update RSVP responses in Firestore
- Sync event status based on responses
- Send notifications on status changes

**Current State:** UI displays chip when meta.rsvp detected in messages  
**Wire To:**
```typescript
const handleRSVPAccept = async () => {
  const eventId = message.meta.rsvp.eventId;
  const messageRef = doc(db, 'messages', message.id);
  
  await updateDoc(messageRef, {
    'meta.rsvp.responses': {
      ...message.meta.rsvp.responses,
      [currentUserId]: 'accepted',
    },
  });
  
  // Also update event in /events collection
  await updateDoc(doc(db, 'events', eventId), {
    status: 'confirmed',
  });
};
```

---

### 5. Deadline/Reminder Extraction

**Where:** AIQuickActions → "Create Deadline"  
**Components Ready:** DeadlineCard, DeadlineCreateModal  
**Backend Needed:**
- AI parsing of chat messages for deadlines
- Auto-create deadline documents
- Link to conversation
- Send reminders via push notifications

**Current State:** Manual creation via modal  
**AI Enhancement:**
```typescript
// Cloud Function on message.onCreate
if (containsDeadlineKeywords(message.text)) {
  const extracted = await aiParseDeadline(message.text);
  
  await addDoc(collection(db, 'deadlines'), {
    title: extracted.title,
    dueDate: Timestamp.fromDate(extracted.dueDate),
    assignee: extracted.assigneeId,
    conversationId: message.conversationId,
    createdBy: 'assistant',
    completed: false,
    createdAt: Timestamp.now(),
  });
  
  // Create assistant message with meta.deadline
  await createAssistantMessage(conversationId, {
    text: `I created a deadline: ${extracted.title}`,
    meta: { deadline: extracted },
  });
}
```

---

### 6. Proactive Conflict Assistant (Advanced AI)

**Where:** ConflictWarning component  
**Components Ready:** ConflictWarning with alternative suggestions  
**Backend Needed:**
- Monitor event creation/updates
- Detect overlapping times or travel conflicts
- Generate alternative time suggestions
- Draft polite reschedule message

**Current State:** Component ready but no data source  
**AI Implementation:**
```typescript
// Cloud Function on event.onCreate
export const detectConflicts = functions.firestore
  .document('events/{eventId}')
  .onCreate(async (snapshot, context) => {
    const newEvent = snapshot.data();
    const userId = newEvent.createdBy;
    
    // Fetch user's other events
    const userEvents = await getUserEvents(userId);
    
    // Check for overlaps
    const conflicts = findTimeConflicts(newEvent, userEvents);
    
    if (conflicts.length > 0) {
      // Generate alternatives with AI
      const alternatives = await aiSuggestAlternatives(newEvent, userEvents);
      
      // Create assistant message with conflict warning
      await createAssistantMessage(newEvent.conversationId, {
        text: `I detected a scheduling conflict with ${conflicts[0].title}`,
        meta: {
          conflict: {
            conflictId: 'conflict_123',
            message: 'This overlaps with your existing session',
            suggestedAlternatives: alternatives,
          },
        },
      });
    }
  });
```

---

## Design System

### Color Palette

#### Primary Colors
- **iOS Blue:** #007AFF (primary actions, active states)
- **Purple:** #7C3AED (AI features, assistant theme)
- **Light Purple:** #F8F5FF, #F0E6FF (AI backgrounds)

#### Status Colors
- **Pending:** #FFD60A (yellow) - Awaiting response
- **Confirmed:** #4CAF50 (green) - All set
- **Declined:** #FF3B30 (red) - Not happening
- **Conflict:** #FF9800 (orange) - Needs attention

#### Semantic Colors
- **Success:** #34C759
- **Warning:** #FF9500
- **Error:** #FF3B30
- **Info:** #007AFF
- **Purple (AI):** #9C27B0

#### Neutral Colors
- **Background:** #f5f5f5
- **Card Background:** #fff
- **Border:** #E0E0E0
- **Text Primary:** #000
- **Text Secondary:** #666
- **Text Tertiary:** #999

### Typography

#### Headings
- **H1 (Greeting):** 28px, 700 weight
- **H2 (Screen Title):** 22-24px, 700 weight
- **H3 (Section):** 18-20px, 600 weight

#### Body Text
- **Large:** 16px, regular
- **Medium:** 14-15px, regular
- **Small:** 13px, regular
- **Caption:** 11-12px, regular

#### Labels
- **Uppercase Labels:** 13-14px, 600 weight, uppercase, 0.5 letter-spacing

### Component Patterns

#### Cards
- Border radius: 12-16px
- Padding: 12-16px
- Shadow: offset (0, 1-2), opacity 0.05-0.08, radius 2-4
- Elevation: 1-2

#### Buttons
- Border radius: 8-12px for action buttons, 20px for pills
- Padding: 12-16px vertical, 16-24px horizontal
- Font weight: 600
- Active opacity: 0.7

#### Modals
- Bottom sheet: borderTopRadius 20px
- Center modal: borderRadius 20px
- Backdrop: rgba(0, 0, 0, 0.5)
- Handle bar: 36x4px, #D1D1D6, borderRadius 2px

#### Icons
- Emoji icons: 20-28px
- Icon containers: 40-56px circles
- Background: 15% opacity of primary color

---

## File Map

### Complete File Inventory (PRs 01-05)

```
MessageAI/
├── app/
│   ├── app/
│   │   ├── (tabs)/
│   │   │   ├── _layout.tsx           ← PR-01: Updated (5 tabs + icons)
│   │   │   ├── index.tsx             ← Existing (Chats)
│   │   │   ├── schedule.tsx          ← PR-03: Implemented
│   │   │   ├── tasks.tsx             ← PR-04: Implemented
│   │   │   ├── assistant.tsx         ← PR-05: Implemented
│   │   │   └── profile.tsx           ← Existing
│   │   └── chat/
│   │       └── [id].tsx              ← PR-02: Modified (StatusChip integration)
│   └── src/
│       ├── components/
│       │   ├── TabIcon.tsx           ← PR-01: New
│       │   ├── SectionHeader.tsx     ← PR-01: New
│       │   ├── StatusChip.tsx        ← PR-02: New
│       │   ├── AssistantBubble.tsx   ← PR-02: New
│       │   ├── EventCard.tsx         ← PR-02: New
│       │   ├── DeadlineCard.tsx      ← PR-02: New
│       │   ├── ConflictWarning.tsx   ← PR-02: New
│       │   ├── RSVPButtons.tsx       ← PR-02: New
│       │   ├── AIQuickActions.tsx    ← PR-02: New
│       │   ├── CalendarHeader.tsx    ← PR-03: New
│       │   ├── EventListItem.tsx     ← PR-03: New
│       │   ├── EventList.tsx         ← PR-03: New
│       │   ├── EventDetailsSheet.tsx ← PR-03: New
│       │   ├── FAB.tsx               ← PR-03: New (reusable)
│       │   ├── AddLessonModal.tsx    ← PR-03: New
│       │   ├── ProgressRing.tsx      ← PR-04: New
│       │   ├── DeadlineList.tsx      ← PR-04: New
│       │   ├── DeadlineCreateModal.tsx ← PR-04: New
│       │   ├── InsightCard.tsx       ← PR-05: New
│       │   ├── InsightsGrid.tsx      ← PR-05: New
│       │   ├── AssistantActionRow.tsx ← PR-05: New
│       │   ├── MessageBubble.tsx     ← PR-02: Modified (AI detection)
│       │   └── MessageInput.tsx      ← PR-02: Modified (AI button)
│       ├── hooks/
│       │   ├── useThreadStatus.ts    ← PR-02: New
│       │   ├── useEvents.ts          ← PR-03: New (MOCK)
│       │   └── useDeadlines.ts       ← PR-04: New (MOCK)
│       └── types/
│           └── index.ts              ← PR-02: Modified (meta types)
│
└── docs/
    ├── PR-01-TAB-SCAFFOLDING-COMPLETE.md
    ├── PR-02-CHAT-ENHANCEMENTS-COMPLETE.md
    ├── PR-03-SCHEDULE-TAB-COMPLETE.md
    ├── PR-04-TASKS-TAB-COMPLETE.md
    ├── PR-05-ASSISTANT-TAB-COMPLETE.md
    └── JellyDM_UI.md                ← This document
```

---

## Summary: What to Replace

### Priority 1: Critical Mock Replacements

1. **useEvents.ts** - Replace with Firestore real-time listener
2. **useDeadlines.ts** - Replace with Firestore real-time listener
3. **AddLessonModal** - Wire handleSubmit to AI parsing endpoint
4. **DeadlineCreateModal** - Install DateTimePicker package

### Priority 2: Action Handlers

5. **MessageBubble** - Wire card press handlers (events, deadlines, RSVP)
6. **EventDetailsSheet** - Wire Message Group, Reschedule, Cancel
7. **AssistantActionRow** - Wire all 4 quick actions to AI
8. **AIQuickActions** - Wire Suggest Time, Summarize, Create Deadline, Set Reminder

### Priority 3: Backend Collections

9. Create `/events` Firestore collection with indexes
10. Create `/deadlines` Firestore collection with indexes
11. Create Cloud Functions for AI orchestration
12. Set up Firestore rules for new collections

### Optional: Polish

13. Install @react-native-community/datetimepicker
14. Add Priority tab or filter to Chats
15. Implement message search
16. Add animations and transitions

---

## Next Steps

### Immediate (Before AI Integration)

1. **Manual Testing**
   - Test all 5 tabs
   - Verify navigation works
   - Check mock data displays correctly
   - Test all modals open/close
   - Verify responsive layout

2. **Install Missing Package** (Optional)
   ```bash
   cd app
   npm install @react-native-community/datetimepicker
   ```

3. **Documentation Review**
   - Read PR-01 through PR-05 completion docs
   - Review mock/placeholder list above
   - Plan AI orchestrator architecture

### AI Orchestrator Setup

4. **Create AI Endpoints**
   - `/api/ai/parse-lesson` - Extract event from text
   - `/api/ai/summarize-week` - Generate weekly summary
   - `/api/ai/suggest-times` - Find available slots
   - `/api/ai/detect-conflicts` - Check for overlaps
   - `/api/ai/extract-deadline` - Parse deadlines from text

5. **Backend Collections**
   - Create `/events` collection
   - Create `/deadlines` collection
   - Add Firestore indexes
   - Update security rules

6. **Wire Components**
   - Replace useEvents with Firestore
   - Replace useDeadlines with Firestore
   - Connect all action handlers
   - Test with real AI responses

---

## Success Metrics

### UI Scaffolding (Complete)
- ✅ 5 tabs implemented
- ✅ 33 new components/hooks created
- ✅ ~3,263 lines of production code
- ✅ 0 TypeScript errors
- ✅ 0 linter errors
- ✅ Responsive design (mobile/tablet)
- ✅ Mock data for realistic demos
- ✅ All interaction points identified

### Readiness for AI
- ✅ All UI components ready
- ✅ Type system supports AI metadata
- ✅ Message rendering handles assistant messages
- ✅ Inline cards render from meta fields
- ✅ Action callbacks defined and typed
- ⏳ Need: Backend endpoints
- ⏳ Need: Firestore collections
- ⏳ Need: AI parsing logic

### Code Quality
- ✅ TypeScript strict mode
- ✅ Consistent styling
- ✅ Reusable components
- ✅ Clear separation of concerns
- ✅ Well-documented mocks
- ✅ Easy to replace placeholders

---

## Architecture Principles

### 1. Separation of Concerns
- UI components focus on presentation
- Hooks manage data fetching
- Services handle business logic
- AI orchestrator in Cloud Functions

### 2. Mock-First Development
- All components built with mock data
- Easy to test without backend
- Clear integration points
- Replaceable hooks pattern

### 3. Type Safety First
- All components typed
- Message meta structure defined
- Event and Deadline interfaces exported
- No any types in new code

### 4. Progressive Enhancement
- Core messaging still works
- New features additive
- Graceful degradation
- No breaking changes to MessageAI base

---

## Quick Reference: Find & Replace Guide

### To Wire Real Events
**Find:** `useEvents.ts` entire file  
**Replace:** Firestore query implementation  
**Test:** Schedule tab shows real data

### To Wire Real Deadlines
**Find:** `useDeadlines.ts` entire file  
**Replace:** Firestore query + CRUD operations  
**Test:** Tasks tab shows real data

### To Wire AI Parsing
**Find:** `AddLessonModal.tsx` line 20-33  
**Replace:** Fetch call to `/api/ai/parse-lesson`  
**Test:** Creating lesson calls AI and creates event

### To Wire RSVP Actions
**Find:** `MessageBubble.tsx` lines 162-167  
**Replace:** Firestore update calls  
**Test:** Accepting invite updates event status

### To Wire Quick Actions
**Find:** `AssistantActionRow.tsx` lines 17-28  
**Replace:** Real AI endpoint calls  
**Test:** Each action performs its function

### To Add DateTimePicker
**Install:** `npm install @react-native-community/datetimepicker`  
**Find:** `DeadlineCreateModal.tsx` lines 67-86  
**Replace:** Real DateTimePicker components  
**Test:** Date/time selection works natively

---

## Document Version

**Version:** 1.0  
**Last Updated:** October 23, 2025  
**Author:** Development Team  
**Status:** UI Complete - Ready for AI Integration

**Next Document Update:** After AI orchestrator wired to first endpoint

