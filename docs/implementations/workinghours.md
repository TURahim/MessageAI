Goal
Add a simple “Working Hours” selector for each user and integrate it with scheduling, conflict resolution, and AI time suggestion logic.
The user can choose which days of the week and time ranges they are available.
The system will use this to:

Filter or rank AI-generated suggested times

Detect conflicts with personal availability

Improve proactive scheduling recommendations

⚙️ Scope

Modify user profile model, client UI, and backend utilities.

Integrate with:

generateAlternatives() (AI time suggestions)

handleEventConflict() (conflict resolution)

Scheduling flows (schedule.create_event)

Autonomous Monitor (optional for later)

Keep schema backward compatible.

🧩 Phase 1 — Schema

Add a new field to each user’s Firestore profile:

// /users/{uid}
{
  uid: string;
  displayName: string;
  timezone?: string;
  workingHours?: {
    [day: string]: { start: string; end: string }[]; // e.g., { mon:[{start:"09:00",end:"17:00"}], tue:[...]}
  };
}


Store 24h format strings ("HH:mm") for consistency.

Days use lowercase 3-letter keys: mon, tue, wed, thu, fri, sat, sun.

Default to a simple 9–5, Mon–Fri schedule.

🎨 Phase 2 — Client UI / UX

Create a minimal “Working Hours” screen in user settings.

Requirements:

Show 7 days (Mon–Sun)

For each day:

Checkbox toggle “Available”

Two dropdowns or time pickers: Start / End (default 9:00–17:00)

Simple “Save” button

Behavior:

On toggle off → remove that day from Firestore.

On save → write to /users/{uid}.workingHours.

Use Intl.DateTimeFormat().resolvedOptions().timeZone for display context (show times in user’s timezone).

Keep design consistent with current MessageAI profile UI:

Use FlashList-style clean cards (no heavy modal).

Label: “Working Hours (for scheduling suggestions)”.

Example UI Mock:
🕓 Working Hours
Your timezone: America/Toronto

Mon [✓]  09:00 → 17:00
Tue [✓]  09:00 → 17:00
Wed [✓]  09:00 → 17:00
Thu [✓]  09:00 → 17:00
Fri [✓]  09:00 → 17:00
Sat [ ]  — 
Sun [ ]  — 

[ Save ]

⚙️ Phase 3 — Backend Integration
1️⃣ Create a helper:

Add getUserWorkingHours(uid: string): Promise<WorkingHours> in src/utils/availability.ts:

import * as admin from 'firebase-admin';

export type WorkingHours = {
  [day: string]: { start: string; end: string }[];
};

export async function getUserWorkingHours(uid: string): Promise<WorkingHours> {
  const userDoc = await admin.firestore().doc(`users/${uid}`).get();
  const data = userDoc.data();
  return data?.workingHours ?? getDefaultWorkingHours();
}

export function getDefaultWorkingHours(): WorkingHours {
  return {
    mon: [{ start: '09:00', end: '17:00' }],
    tue: [{ start: '09:00', end: '17:00' }],
    wed: [{ start: '09:00', end: '17:00' }],
    thu: [{ start: '09:00', end: '17:00' }],
    fri: [{ start: '09:00', end: '17:00' }],
  };
}

2️⃣ Integrate with generateAlternatives()

Import both getUserTimezone() and getUserWorkingHours().

When building alternative slots:

Generate candidate times within the user’s working hours for their timezone.

Filter out times outside that window.

Pseudo:

const tz = await getUserTimezone(userId);
const workingHours = await getUserWorkingHours(userId);

// Convert each day’s working window to UTC ranges
const availableWindows = convertWorkingHoursToUTC(workingHours, tz);

// Generate AI alternative candidates only within those ranges


If the AI model proposes times outside availability, prune them before returning.

3️⃣ Integrate with handleEventConflict()

Add workingHours to the ConflictContext.

When AI suggests alternatives, provide user’s availability window.

Add logic: if no alternative fits → include a “no available slot in working hours” message.

4️⃣ Scheduling Guard (optional for now)

When users manually create an event (schedule.create_event):

Check if the start/end time falls inside their working hours.

If not, show a soft warning:

“⚠️ This session is outside your set working hours. Continue anyway?”

🧠 Phase 4 — AI Integration Notes

In generateAlternatives(context: ConflictContext):

When building the prompt for GPT or Claude, include:

The user’s working hours are:
Monday–Friday: 09:00–17:00 local time.
Only suggest alternatives within those times.


Convert all hours to ISO UTC before sending.

🧩 Phase 5 — Validation & Testing
Backend test cases:

User with default hours → alternatives only between 09:00–17:00 local time.

User with custom hours → suggestions outside range are dropped.

Conflict message includes user’s timezone and available windows.

Frontend test cases:

Toggle days on/off → updates Firestore.

Edit hours → reflects in saved data.

Save → toast confirmation “Working hours updated.”

✅ Acceptance Criteria

 Each user document includes workingHours.

 Settings screen allows selecting availability per day.

 AI alternative generation respects these hours.

 Conflict resolution suggests only valid times.

 Timezones correctly applied for all conversions.

 TypeScript compiles with no new errors.

🧠 Optional Stretch

Add color-coded availability overlay to the scheduling calendar.

Add availabilityCache computed field in Firestore for faster queries.

Allow multiple time blocks per day (e.g., morning/evening tutoring sessions).