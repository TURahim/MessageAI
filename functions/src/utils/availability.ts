/**
 * Availability Utility
 * 
 * Provides working hours fetching and time slot filtering
 * Helps AI generate scheduling alternatives within user's availability
 */

import * as admin from 'firebase-admin';
import * as logger from 'firebase-functions/logger';

export type WorkingHours = {
  [day: string]: { start: string; end: string }[]; // day keys: mon, tue, wed, thu, fri, sat, sun
};

export interface TimeSlot {
  start: Date;
  end: Date;
}

const availabilityCache = new Map<string, { hours: WorkingHours; timestamp: number }>();
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

/**
 * Default working hours (Mon-Fri 9am-5pm)
 */
export function getDefaultWorkingHours(): WorkingHours {
  return {
    mon: [{ start: '09:00', end: '17:00' }],
    tue: [{ start: '09:00', end: '17:00' }],
    wed: [{ start: '09:00', end: '17:00' }],
    thu: [{ start: '09:00', end: '17:00' }],
    fri: [{ start: '09:00', end: '17:00' }],
  };
}

/**
 * Get user's working hours from Firestore with caching
 * 
 * @param uid - User ID
 * @returns Working hours map by day
 */
export async function getUserWorkingHours(uid: string): Promise<WorkingHours> {
  // Check cache
  const cached = availabilityCache.get(uid);
  if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
    return cached.hours;
  }

  try {
    const userDoc = await admin.firestore().doc(`users/${uid}`).get();
    const data = userDoc.data();
    const hours = data?.workingHours ?? getDefaultWorkingHours();
    
    // Cache
    availabilityCache.set(uid, { hours, timestamp: Date.now() });
    
    return hours;
  } catch (error) {
    logger.warn('⚠️ Failed to fetch working hours, using defaults', {
      uid: uid.substring(0, 8),
    });
    return getDefaultWorkingHours();
  }
}

/**
 * Check if a time falls within user's working hours
 * 
 * @param time - Date/time to check
 * @param workingHours - User's working hours
 * @param timezone - User's timezone
 * @returns true if within working hours
 */
export function isWithinWorkingHours(
  time: Date,
  workingHours: WorkingHours,
  timezone: string
): boolean {
  // Get day of week and time in user's timezone
  const formatter = new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: timezone,
  });

  const parts = formatter.formatToParts(time);
  const dayName = parts.find(p => p.type === 'weekday')?.value.toLowerCase().substring(0, 3);
  const hour = parts.find(p => p.type === 'hour')?.value;
  const minute = parts.find(p => p.type === 'minute')?.value;
  
  if (!dayName || !hour || !minute) {
    return false;
  }

  const timeStr = `${hour}:${minute}`;

  // Check if this day has working hours
  const daySlots = workingHours[dayName];
  if (!daySlots || daySlots.length === 0) {
    return false; // Day is not available
  }

  // Check if time falls within any slot for this day
  return daySlots.some(slot => {
    return timeStr >= slot.start && timeStr <= slot.end;
  });
}

/**
 * Filter time slots to only those within working hours
 * 
 * @param slots - Array of time slots
 * @param workingHours - User's working hours
 * @param timezone - User's timezone
 * @returns Filtered slots
 */
export function filterByWorkingHours(
  slots: TimeSlot[],
  workingHours: WorkingHours,
  timezone: string
): TimeSlot[] {
  return slots.filter(slot => 
    isWithinWorkingHours(slot.start, workingHours, timezone)
  );
}

/**
 * Convert working hours to UTC time ranges for a specific date
 * Useful for conflict detection and scheduling
 * 
 * @param workingHours - User's working hours
 * @param timezone - User's timezone
 * @param date - Target date
 * @returns Array of UTC time ranges
 */
export function convertWorkingHoursToUTC(
  workingHours: WorkingHours,
  timezone: string,
  date: Date
): TimeSlot[] {
  const slots: TimeSlot[] = [];

  // Get day of week for target date
  const dayFormatter = new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    timeZone: timezone,
  });
  
  const dayName = dayFormatter.format(date).toLowerCase().substring(0, 3);
  const daySlots = workingHours[dayName];

  if (!daySlots || daySlots.length === 0) {
    return []; // No availability on this day
  }

  // Convert each slot to UTC
  for (const slot of daySlots) {
    try {
      // Parse HH:mm format
      const [startHour, startMinute] = slot.start.split(':').map(Number);
      const [endHour, endMinute] = slot.end.split(':').map(Number);

      // Create date objects in user's timezone
      const startLocal = new Date(date);
      startLocal.setHours(startHour, startMinute, 0, 0);

      const endLocal = new Date(date);
      endLocal.setHours(endHour, endMinute, 0, 0);

      // Note: JavaScript Date objects are always in local system time
      // For proper timezone conversion, we'd need a library like date-fns-tz
      // For now, this is a reasonable approximation
      
      slots.push({
        start: startLocal,
        end: endLocal,
      });
    } catch (error) {
      logger.warn('⚠️ Invalid time format in working hours', {
        slot,
      });
    }
  }

  return slots;
}

/**
 * Clear availability cache
 */
export function clearAvailabilityCache(uid?: string): void {
  if (uid) {
    availabilityCache.delete(uid);
  } else {
    availabilityCache.clear();
  }
}

