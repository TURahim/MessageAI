/**
 * Conflict Service
 * 
 * Detects and resolves scheduling conflicts
 * Used by eventService and conflict detection triggers
 */

import type { ConflictCheckResult } from '@/types/eventTypes';
import { checkConflicts as checkEventConflicts } from './eventService';

/**
 * Checks if a proposed time conflicts with user's existing events
 * 
 * @param userId - User to check conflicts for
 * @param startTime - Proposed start time
 * @param endTime - Proposed end time
 * @param timezone - REQUIRED for DST handling
 * @returns Conflict check result
 * 
 * @example
 * const result = await detectConflicts('user123', start, end, 'America/New_York');
 * if (result.hasConflict) {
 *   console.log('Conflicts:', result.conflictingEvents);
 * }
 */
export async function detectConflicts(
  userId: string,
  startTime: Date,
  endTime: Date,
  timezone: string
): Promise<ConflictCheckResult> {
  return checkEventConflicts(userId, startTime, endTime, timezone);
}

/**
 * Selects an alternative time from conflict suggestions
 * Creates a new event with the selected time
 * 
 * @param conflictId - Conflict ID from ConflictMeta
 * @param alternativeIndex - Index of selected alternative
 * @param originalEventId - ID of the conflicting event
 * @param userId - User making the selection
 * @returns New event ID
 */
export async function selectAlternative(
  conflictId: string,
  alternativeIndex: number,
  originalEventId: string,
  userId: string
): Promise<string> {
  // TODO (PR10): Implement alternative selection
  // 1. Get conflict metadata from messages
  // 2. Extract selected alternative time
  // 3. Create new event with alternative time
  // 4. Mark original event as rescheduled or delete
  
  console.log('🔄 Conflict alternative selected (TODO: implement in PR10)', {
    conflictId,
    alternativeIndex,
    originalEventId,
  });

  throw new Error('NOT_IMPLEMENTED: selectAlternative will be implemented in PR10');
}

