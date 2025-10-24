/**
 * Task/Deadline Extractor
 * 
 * PR11: Wire Tasks Backend + Auto-Extraction
 * 
 * Automatically detects homework, assignments, tests, and deadlines
 * in chat messages and creates deadline entries in Firestore
 */

import { generateObject } from 'ai';
import { openai } from '@ai-sdk/openai';
import * as logger from 'firebase-functions/logger';
import { z } from 'zod';
import * as admin from 'firebase-admin';

export interface TaskExtractionResult {
  found: boolean;
  title?: string;
  dueDate?: string; // ISO8601
  confidence: number;
  keywords?: string[];
  taskType?: 'homework' | 'test' | 'quiz' | 'assignment' | 'project' | 'reading';
}

// Keywords that indicate tasks/deadlines
const TASK_KEYWORDS = {
  deadline: ['due by', 'due on', 'deadline', 'submit by', 'turn in by'],
  homework: ['homework', 'assignment', 'hw', 'practice problems', 'exercises'],
  test: ['test', 'exam', 'quiz', 'midterm', 'final'],
  project: ['project', 'presentation', 'paper', 'essay', 'report'],
  reading: ['read', 'reading assignment', 'chapters'],
};

/**
 * Fast keyword-based task detection
 * Returns true if message likely contains task/deadline
 */
export function hasTaskKeywords(text: string): boolean {
  const lowerText = text.toLowerCase();

  // Check all keyword categories
  for (const category of Object.values(TASK_KEYWORDS)) {
    for (const keyword of category) {
      if (lowerText.includes(keyword)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Extract task/deadline from message using GPT-4
 * 
 * Detects:
 * - Homework assignments ("Math homework due Friday")
 * - Tests/exams ("Test on Monday", "Quiz next week")
 * - Projects ("Essay due next Tuesday")
 * - Reading assignments ("Read chapters 5-7 by Wednesday")
 * 
 * @param text - Message text to analyze
 * @param timezone - User's timezone for date parsing
 * @param referenceDate - Current date/time for relative parsing
 * @returns TaskExtractionResult with extracted task details
 */
export async function extractTask(
  text: string,
  timezone: string,
  referenceDate: Date = new Date()
): Promise<TaskExtractionResult> {
  logger.info('📝 Extracting task from message', {
    textLength: text.length,
    timezone,
  });

  // Fast keyword check first
  if (!hasTaskKeywords(text)) {
    logger.info('✅ No task keywords detected');
    return {
      found: false,
      confidence: 0.0,
    };
  }

  try {
    const prompt = buildTaskExtractionPrompt(text, timezone, referenceDate);

    const schema = z.object({
      found: z.boolean(),
      title: z.string().optional(),
      dueDate: z.string().optional(), // ISO8601
      confidence: z.number().min(0).max(1),
      taskType: z.enum(['homework', 'test', 'quiz', 'assignment', 'project', 'reading']).optional(),
      explanation: z.string().optional(),
    });

    const result = await generateObject({
      model: openai('gpt-4-turbo'),
      schema,
      prompt,
      temperature: 0.3, // Deterministic
      maxTokens: 200,
    });

    const extracted = result.object;

    if (!extracted.found || !extracted.title || !extracted.dueDate) {
      logger.info('✅ No task found by LLM', {
        confidence: extracted.confidence,
      });

      return {
        found: false,
        confidence: extracted.confidence,
      };
    }

    // Validate date
    const parsedDate = new Date(extracted.dueDate);
    if (isNaN(parsedDate.getTime())) {
      logger.warn('⚠️ Invalid due date from LLM', {
        dueDate: extracted.dueDate,
      });

      return {
        found: false,
        confidence: 0.0,
      };
    }

    logger.info('✅ Task extracted successfully', {
      title: extracted.title,
      dueDate: extracted.dueDate,
      taskType: extracted.taskType,
      confidence: extracted.confidence,
    });

    return {
      found: true,
      title: extracted.title,
      dueDate: extracted.dueDate,
      confidence: extracted.confidence,
      taskType: extracted.taskType,
    };
  } catch (error: any) {
    logger.error('❌ Task extraction failed', {
      error: error.message,
      text: text.substring(0, 100),
    });

    return {
      found: false,
      confidence: 0.0,
    };
  }
}

/**
 * Build prompt for task extraction
 */
function buildTaskExtractionPrompt(
  text: string,
  timezone: string,
  referenceDate: Date
): string {
  const referenceDateStr = referenceDate.toLocaleString('en-US', {
    timeZone: timezone,
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

  return `Extract task/homework/deadline from this tutoring message.

**Message:** "${text}"

**Current Date/Time:** ${referenceDateStr} (${timezone})

**Return JSON:**
{
  "found": true/false,
  "title": "extracted task name (be concise)",
  "dueDate": "ISO8601 string in UTC",
  "confidence": 0.0-1.0,
  "taskType": "homework" | "test" | "quiz" | "assignment" | "project" | "reading",
  "explanation": "brief reasoning"
}

**Examples:**

1. "Homework is due Friday"
   → { "found": true, "title": "Homework", "dueDate": "[next Friday ISO]", "confidence": 0.9, "taskType": "homework" }

2. "Test on Monday at 9am"
   → { "found": true, "title": "Test", "dueDate": "[next Monday 9am ISO]", "confidence": 0.95, "taskType": "test" }

3. "Math homework - complete exercises 1-10 by next Tuesday"
   → { "found": true, "title": "Math homework - exercises 1-10", "dueDate": "[next Tuesday ISO]", "confidence": 0.9, "taskType": "homework" }

4. "Can you help me with this problem?"
   → { "found": false, "confidence": 0.0 }

**Guidelines:**
- Extract clear, actionable task titles (avoid vague "homework")
- Include subject if mentioned (e.g., "Math homework" not just "homework")
- Parse relative dates correctly (tomorrow, next week, Friday)
- Return ISO8601 in UTC (convert from timezone)
- Be conservative with confidence (<0.7 if ambiguous)
- Distinguish between mentioning a test vs. a test being due

**Keywords to look for:**
- Deadline: "due by", "due on", "deadline", "submit by"
- Homework: "homework", "assignment", "hw", "exercises"
- Tests: "test", "exam", "quiz", "midterm", "final"
- Projects: "project", "presentation", "paper", "essay", "report"`;
}

/**
 * Create deadline in Firestore and post assistant message
 * 
 * @param conversationId - Conversation where task was mentioned
 * @param task - Extracted task details
 * @param assignee - User ID to assign task to
 * @param createdBy - User ID who mentioned the task (usually tutor)
 * @returns Deadline ID
 */
export async function createDeadlineFromExtraction(
  conversationId: string,
  task: TaskExtractionResult,
  assignee: string,
  createdBy: string
): Promise<string | null> {
  if (!task.found || !task.title || !task.dueDate) {
    return null;
  }

  try {
    // Get assignee name for display
    const assigneeDoc = await admin.firestore().doc(`users/${assignee}`).get();
    const assigneeName = assigneeDoc.data()?.displayName || 'Unknown';

    // Create deadline in Firestore
    const deadlineRef = await admin.firestore().collection('deadlines').add({
      title: task.title,
      dueDate: admin.firestore.Timestamp.fromDate(new Date(task.dueDate)),
      assignee,
      assigneeName,
      conversationId,
      completed: false,
      createdBy,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    logger.info('✅ Deadline created from extraction', {
      deadlineId: deadlineRef.id,
      title: task.title,
      assignee: assignee.substring(0, 8),
    });

    // Post assistant message with DeadlineMeta
    await postDeadlineMessage(
      conversationId,
      deadlineRef.id,
      task.title,
      new Date(task.dueDate),
      assigneeName
    );

    return deadlineRef.id;
  } catch (error: any) {
    logger.error('❌ Failed to create deadline from extraction', {
      error: error.message,
      task: task.title,
    });
    return null;
  }
}

/**
 * Post assistant message with deadline metadata
 * This will render as DeadlineCard in the UI
 */
async function postDeadlineMessage(
  conversationId: string,
  deadlineId: string,
  title: string,
  dueDate: Date,
  assigneeName: string
): Promise<void> {
  try {
    await admin.firestore()
      .collection('conversations')
      .doc(conversationId)
      .collection('messages')
      .add({
        senderId: 'assistant',
        senderName: 'JellyDM Assistant',
        type: 'text',
        text: `📝 I've added "${title}" to ${assigneeName}'s task list.`,
        clientTimestamp: admin.firestore.FieldValue.serverTimestamp(),
        serverTimestamp: admin.firestore.FieldValue.serverTimestamp(),
        status: 'sent',
        retryCount: 0,
        readBy: [],
        readCount: 0,
        meta: {
          role: 'assistant',
          deadlineId,
          deadline: {
            deadlineId,
            title,
            dueDate: admin.firestore.Timestamp.fromDate(dueDate),
            assignee: assigneeName,
          },
        },
      });

    logger.info('✅ Posted deadline message to conversation', {
      conversationId: conversationId.substring(0, 12),
      deadlineId: deadlineId.substring(0, 8),
    });
  } catch (error: any) {
    logger.error('❌ Failed to post deadline message', {
      error: error.message,
    });
    // Don't throw - deadline was created, message is optional
  }
}

