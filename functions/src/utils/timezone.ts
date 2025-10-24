/**
 * Timezone Utility
 * 
 * Provides user-specific timezone fetching with caching
 * All users default to America/Toronto if timezone not set
 * 
 * Usage:
 * const tz = await getUserTimezone(userId);
 * const formatted = date.toLocaleString('en-US', { timeZone: tz });
 */

import * as admin from 'firebase-admin';
import * as logger from 'firebase-functions/logger';

const timezoneCache = new Map<string, { timezone: string; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Get user's timezone from Firestore with caching
 * 
 * @param uid - User ID
 * @returns IANA timezone string (e.g., "America/Toronto")
 * 
 * @example
 * const tz = await getUserTimezone('user123');
 * const localTime = date.toLocaleString('en-US', { timeZone: tz });
 */
export async function getUserTimezone(uid: string): Promise<string> {
  // Check cache first
  const cached = timezoneCache.get(uid);
  if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
    return cached.timezone;
  }

  try {
    const snap = await admin.firestore().doc(`users/${uid}`).get();
    const timezone = snap.data()?.timezone ?? 'America/Toronto';
    
    // Cache for future calls
    timezoneCache.set(uid, { timezone, timestamp: Date.now() });
    
    return timezone;
  } catch (error) {
    // Log warning only once per user (when cache miss)
    if (!timezoneCache.has(uid)) {
      logger.warn('⚠️ Failed to fetch user timezone, using default', {
        uid: uid.substring(0, 8),
      });
    }
    
    // Cache the fallback to avoid repeated warnings
    timezoneCache.set(uid, { timezone: 'America/Toronto', timestamp: Date.now() });
    
    return 'America/Toronto';
  }
}

/**
 * Clear timezone cache for a user or all users
 * Useful after user updates their timezone
 * 
 * @param uid - Optional user ID to clear specific cache
 */
export function clearTimezoneCache(uid?: string): void {
  if (uid) {
    timezoneCache.delete(uid);
    logger.info('🗑️ Cleared timezone cache for user', {
      uid: uid.substring(0, 8),
    });
  } else {
    timezoneCache.clear();
    logger.info('🗑️ Cleared all timezone cache');
  }
}

/**
 * Get multiple user timezones in batch (optimized)
 * Reduces Firestore reads for multi-user scenarios
 * 
 * @param uids - Array of user IDs
 * @returns Map of userId → timezone
 */
export async function getUserTimezonesBatch(uids: string[]): Promise<Map<string, string>> {
  const result = new Map<string, string>();
  const uncached: string[] = [];

  // Check cache first
  for (const uid of uids) {
    const cached = timezoneCache.get(uid);
    if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
      result.set(uid, cached.timezone);
    } else {
      uncached.push(uid);
    }
  }

  // Fetch uncached users
  if (uncached.length > 0) {
    try {
      const userDocs = await Promise.all(
        uncached.map(uid => admin.firestore().doc(`users/${uid}`).get())
      );

      userDocs.forEach((snap, index) => {
        const uid = uncached[index];
        const timezone = snap.data()?.timezone ?? 'America/Toronto';
        
        // Cache and add to result
        timezoneCache.set(uid, { timezone, timestamp: Date.now() });
        result.set(uid, timezone);
      });
    } catch (error) {
      logger.warn('⚠️ Batch timezone fetch failed, using defaults', {
        count: uncached.length,
      });
      
      // Fallback for failed users
      uncached.forEach(uid => {
        result.set(uid, 'America/Toronto');
      });
    }
  }

  return result;
}

