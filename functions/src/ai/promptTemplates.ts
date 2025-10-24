/**
 * Prompt Templates for AI Operations
 * 
 * All prompts designed for cost efficiency and reliability
 */

/**
 * Gating Classifier Prompt
 * 
 * Uses lightweight models (GPT-3.5-turbo or Claude Haiku) for fast classification
 * Returns JSON with task type and confidence score
 * 
 * Target: <500ms P95 latency, >85% accuracy, ≥90% precision for urgency
 */
export const GATING_CLASSIFIER_PROMPT = `You are a message classifier for a tutoring platform. Analyze the message and determine if it requires AI processing.

Return JSON with this exact structure:
{
  "task": "scheduling" | "rsvp" | "task" | "urgent" | null,
  "confidence": 0.0-1.0
}

Task Types:
- "scheduling": Mentions specific dates/times for sessions (e.g., "tomorrow at 3pm", "Friday morning", "let's schedule a review session Sunday", "schedule English session")
- "rsvp": Response to an invitation (e.g., "yes that works", "can't make it", "I'll be there")
- "task": Homework/deadline mention (e.g., "due Friday", "test on Monday", "homework by next week", "remember the assignment is due", "also the quiz is due")
- "urgent": URGENT matters requiring immediate attention (see urgency rules below)
- null: Normal chat, no action needed (e.g., "how are you", "thanks", "see you later")

IMPORTANT:
- "task" includes: homework, assignments, tests, quizzes, projects, essays, reading - ANY academic deadline
- "scheduling" includes: ANY mention of scheduling a session, lesson, review, tutoring, meeting
- Look for task/scheduling keywords ANYWHERE in the message, even if surrounded by other text
- "Hey Brian also remember that the english assignment is due monday" → task (confidence 0.8+)
- "So lets schedule in the English review session on Sunday" → scheduling (confidence 0.8+)

Urgency Detection Rules (HIGH PRECISION TARGET - ≥90%):
ALWAYS mark as "urgent" with confidence ≥0.85:
  - Explicit: "URGENT", "ASAP", "emergency", "immediately", "right now"
  - Cancellations: "cancel session", "can't make it today", "need to cancel", "cancel appointment"
  - Emergency reschedule: "need to reschedule ASAP", "have to move immediately"

SOMETIMES mark as "urgent" with confidence 0.7-0.85 (requires validation):
  - Time pressure: "running late", "need to change time", "test today", "exam tomorrow"
  - Same-day issues: mentions of "today" with cancellation/reschedule context

NEVER mark as "urgent":
  - General questions, even with word "urgent" (e.g., "urgent question about homework")
  - Future planning without immediate action (e.g., "we should reschedule sometime")
  - Casual mentions of tests/exams without stress indicators

Confidence Guidelines:
- 0.9-1.0: Very clear, unambiguous, explicit urgency keywords
- 0.7-0.9: Likely urgent, has context indicators
- 0.6-0.7: Possible urgency, needs validation
- 0.0-0.6: Not confident, skip processing

CRITICAL for Urgency:
- Be EXTREMELY conservative. False positives are costly (unnecessary alerts).
- Prefer false negatives over false positives.
- If message has hedging ("maybe", "if possible", "no rush"), reduce confidence significantly.
- Only high confidence (≥0.85) urgency triggers push notifications.

Message:`;

/**
 * RSVP Interpretation Prompt
 * 
 * Classifies natural language responses to event invites
 * Target: >80% accuracy
 */
export const RSVP_INTERPRETATION_PROMPT = `Classify this response to an event invitation.

Return JSON:
{
  "response": "accept" | "decline" | "unclear",
  "confidence": 0.0-1.0
}

Examples:
- "Yes that works" → {"response": "accept", "confidence": 0.9}
- "Sounds good" → {"response": "accept", "confidence": 0.85}
- "Can't make it" → {"response": "decline", "confidence": 0.9}
- "Sorry, I'm busy" → {"response": "decline", "confidence": 0.85}
- "Maybe" → {"response": "unclear", "confidence": 0.3}
- "Let me check" → {"response": "unclear", "confidence": 0.4}

Ambiguity words that reduce confidence: "maybe", "might", "should work", "probably", "think so"
If detected, require explicit confirmation (set confidence <0.7).

Message:`;

/**
 * Date/Time Extraction Prompt (for PR4)
 * 
 * Extracts structured date/time from natural language
 * Will be used by time.parse tool
 */
export const DATE_TIME_EXTRACTION_PROMPT = `Extract date and time from this message.

CRITICAL: You MUST use the provided timezone for all calculations.

Return JSON:
{
  "found": true/false,
  "dateTime": "ISO8601 string in UTC",
  "duration": minutes (optional),
  "confidence": 0.0-1.0
}

Examples:
- "tomorrow at 3pm" → Parse relative to current date in timezone
- "Friday 2pm" → Next Friday at 2pm in timezone
- "next week" → Default to next Monday 9am in timezone

Reference date and timezone will be provided.

Message:`;

/**
 * Task/Deadline Extraction Prompt (for PR11)
 * 
 * Extracts homework and deadline information
 */
export const TASK_EXTRACTION_PROMPT = `Extract task/homework deadline from this message.

Return JSON:
{
  "found": true/false,
  "title": "extracted task name",
  "dueDate": "ISO8601 string in UTC",
  "confidence": 0.0-1.0
}

Keywords: "due by", "deadline", "homework", "test on", "quiz", "assignment", "submit by"

Message:`;

/**
 * Conflict Resolution Prompt (for PR10)
 * 
 * Suggests alternative times when conflicts detected
 */
export const CONFLICT_RESOLUTION_PROMPT = `A scheduling conflict was detected. Suggest 2-3 alternative times.

Given:
- Conflicting events (with times)
- User's calendar availability
- Timezone

Return JSON:
{
  "alternatives": [
    {
      "startTime": "ISO8601",
      "endTime": "ISO8601",
      "reason": "Brief explanation"
    }
  ]
}

Be considerate of:
- Time of day (avoid late evenings)
- Reasonable gaps between sessions
- DST transitions`;

/**
 * Weekly Summary Prompt (for PR8/PR13)
 * 
 * Generates progress summary from conversation
 */
export const WEEKLY_SUMMARY_PROMPT = `Generate a weekly summary of tutoring progress from these messages.

Focus on:
- Topics covered
- Homework assigned
- Tests/quizzes mentioned
- Student strengths/struggles
- Next steps

Keep it concise (3-4 sentences max), professional, and parent-friendly.

Messages:`;

