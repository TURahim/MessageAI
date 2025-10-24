Goal
Refactor generateAlternatives() in conflictResolver.ts so that it produces AI-generated alternative time slots that respect:

The user’s timezone

Their working hours

Existing event conflicts

🧩 Scope

Modify only the generateAlternatives() function and any local helper functions it depends on.
You can import utilities from:

getUserTimezone(userId) → returns string (e.g., "America/Toronto")

getUserWorkingHours(userId) → returns { mon: [{start,end}], ... }

convertWorkingHoursToUTC(workingHours, timezone) → new helper if needed.

Do not alter Firestore schema or unrelated modules.

⚙️ Tasks
1️⃣ Update the Function Signature

Add explicit timezone and working hours awareness:

export async function generateAlternatives(context: ConflictContext): Promise<AlternativeTimeSlot[]> {
  const { userId, proposedStartTime, proposedEndTime, conflictingEvents } = context;
  const tz = await getUserTimezone(userId);
  const workingHours = await getUserWorkingHours(userId);
  ...
}

2️⃣ Create a Utility to Convert Availability Windows

Add a local helper:

function convertWorkingHoursToUTC(workingHours: WorkingHours, tz: string, daysAhead = 7): Array<{ start: Date; end: Date }> {
  const now = new Date();
  const windows: Array<{ start: Date; end: Date }> = [];
  for (let d = 0; d < daysAhead; d++) {
    const date = new Date(now.getTime() + d * 86400000);
    const dayKey = date.toLocaleDateString('en-US', { weekday: 'short' }).toLowerCase().slice(0,3);
    if (!workingHours[dayKey]) continue;

    for (const block of workingHours[dayKey]) {
      const [hStart, mStart] = block.start.split(':').map(Number);
      const [hEnd, mEnd] = block.end.split(':').map(Number);
      const localStart = new Date(date);
      localStart.setHours(hStart, mStart, 0, 0);
      const localEnd = new Date(date);
      localEnd.setHours(hEnd, mEnd, 0, 0);

      const startUTC = new Date(localStart.toLocaleString('en-US', { timeZone: 'UTC' }));
      const endUTC = new Date(localEnd.toLocaleString('en-US', { timeZone: 'UTC' }));
      windows.push({ start: startUTC, end: endUTC });
    }
  }
  return windows;
}


This builds a rolling 7-day map of allowed UTC ranges.

3️⃣ Filter Conflicting Events

Flatten existing conflicting events into blocked UTC intervals:

const blocked = conflictingEvents.map(e => ({
  start: e.startTime,
  end: e.endTime,
}));


and use a helper isTimeFree(candidateStart, candidateEnd, blocked).

4️⃣ AI Prompt Template Update

Build a context-aware prompt for GPT-4 or Claude that includes timezone and working hours:

const prompt = `
You are a scheduling assistant for a tutoring platform.

User timezone: ${tz}
Working hours:
${Object.entries(workingHours).map(([day, blocks]) => 
  `${day.toUpperCase()}: ${blocks.map(b => `${b.start}–${b.end}`).join(', ')}`
).join('\n')}

Proposed session:
${proposedStartTime.toLocaleString('en-US', { timeZone: tz })} → ${proposedEndTime.toLocaleString('en-US', { timeZone: tz })}

Existing conflicts:
${conflictingEvents.map(e => `• ${e.title} (${e.startTime.toLocaleString('en-US',{timeZone:tz})}–${e.endTime.toLocaleString('en-US',{timeZone:tz})})`).join('\n')}

Generate up to 3 alternative time slots within the next 7 days that:
- Fit entirely within working hours
- Avoid conflicts
- Preserve the same session duration (${context.sessionDuration} minutes)
- Are spaced at least 30 minutes apart

Return JSON:
[
  { "startTime": "ISO8601 UTC", "endTime": "ISO8601 UTC", "reason": "string" }
]
`;


Then call the LLM:

const { generateObject } = await import('ai');
const { openai } = await import('@ai-sdk/openai');

const result = await generateObject({
  model: openai('gpt-4-turbo'),
  prompt,
  schema: z.array(
    z.object({
      startTime: z.string().describe('Alternative start time in ISO UTC'),
      endTime: z.string().describe('Alternative end time in ISO UTC'),
      reason: z.string(),
    })
  ),
  temperature: 0.4,
  maxTokens: 250,
});

5️⃣ Post-Processing

Parse and validate each returned slot.

Ensure each proposed time fits inside a UTC working window.

Deduplicate near-identical suggestions.

Return final list as AlternativeTimeSlot[].

return validated.filter(slot =>
  availableWindows.some(win => slot.startTime >= win.start && slot.endTime <= win.end)
);

6️⃣ Logging and Metrics

Log:

logger.info('🧠 Alternatives generated', {
  userId: userId.substring(0,8),
  timezone: tz,
  count: alternatives.length,
  duration: `${context.sessionDuration}m`,
});

✅ Acceptance Criteria

 AI prompt includes timezone + working hours context.

 Suggested times fall within user’s working hours (local time).

 Suggested times avoid conflicts and preserve duration.

 At least one alternative returned in common cases.

 All times are stored and transmitted in UTC for Firestore consistency.

 No breaking changes to existing ConflictContext consumers.

💡 Optional Stretch

Add preference weighting (morning vs afternoon).

Cache last 7-day availability windows for faster lookups.

Add confidence score for each suggested slot.