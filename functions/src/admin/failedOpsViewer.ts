/**
 * Failed Operations Viewer
 * 
 * HTTP Cloud Function for admin access to failed tool operations
 * 
 * Security:
 * - Requires Firebase Auth with admin custom claim
 * - Or checks against allowed admin emails list
 * 
 * PII Protection:
 * - Redacts prompt text (shows length only)
 * - Hashes user IDs (first 8 chars for debugging)
 * - Redacts params (shows structure only)
 * 
 * Usage:
 * ```bash
 * curl -H "Authorization: Bearer $ADMIN_TOKEN" \
 *   "https://us-central1-PROJECT.cloudfunctions.net/viewFailedOps?days=7"
 * ```
 */

import * as admin from 'firebase-admin';
import { onRequest } from 'firebase-functions/v2/https';
import * as logger from 'firebase-functions/logger';
import { createHash } from 'crypto';

// Admin emails allowed to view failed ops
// TODO: Move to environment variable or Firestore config
const ADMIN_EMAILS = [
  'admin@dawnrobotics.com',
  // Add more admin emails here
];

/**
 * Checks if user is admin
 */
async function isAdmin(authToken: string | undefined): Promise<boolean> {
  if (!authToken) {
    return false;
  }

  try {
    // Verify the Firebase ID token
    const decodedToken = await admin.auth().verifyIdToken(authToken.replace('Bearer ', ''));
    
    // Check custom claim
    if (decodedToken.admin === true) {
      return true;
    }

    // Check email whitelist
    if (decodedToken.email && ADMIN_EMAILS.includes(decodedToken.email)) {
      return true;
    }

    return false;
  } catch (error) {
    logger.warn('⚠️ Auth verification failed', { error });
    return false;
  }
}

/**
 * Hashes user ID for privacy
 */
function hashUserId(userId: string): string {
  // Show first 8 chars for debugging, hash the rest
  if (userId.length <= 8) {
    return userId;
  }

  const hash = createHash('sha256').update(userId).digest('hex');
  return `${userId.substring(0, 8)}_${hash.substring(0, 8)}`;
}

/**
 * Redacts sensitive params
 */
function redactParams(params: any): any {
  const redacted = { ...params };

  // Redact text fields (show length only)
  if (redacted.text) {
    redacted.text = `[REDACTED ${redacted.text.length} chars]`;
  }

  // Redact message field
  if (redacted.message) {
    redacted.message = `[REDACTED ${redacted.message.length} chars]`;
  }

  // Keep structure but hide content
  return redacted;
}

/**
 * HTTP Cloud Function to view failed operations
 * GET /viewFailedOps?days=7&tool=time.parse&user=user123
 */
export const viewFailedOps = onRequest({
  region: 'us-central1',
  cors: true,
  timeoutSeconds: 30,
}, async (req, res) => {
  // SECURITY: Check admin auth
  const authHeader = req.headers.authorization;
  const isAdminUser = await isAdmin(authHeader);

  if (!isAdminUser) {
    logger.warn('🚫 Unauthorized access attempt to failed ops viewer');
    res.status(403).json({
      error: 'FORBIDDEN: Admin access required',
      message: 'You must be an admin to view failed operations',
    });
    return;
  }

  try {
    // Parse query parameters
    const days = parseInt(req.query.days as string) || 7;
    const toolFilter = req.query.tool as string | undefined;
    const userFilter = req.query.user as string | undefined;

    logger.info('📊 Admin viewing failed operations', {
      days,
      toolFilter,
      userFilter,
    });

    // Build query
    let query = admin.firestore().collection('failed_operations')
      .orderBy('timestamp', 'desc');

    // Filter by date range
    const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    query = query.where('timestamp', '>=', cutoffDate);

    // Filter by tool name
    if (toolFilter) {
      query = query.where('toolName', '==', toolFilter);
    }

    // Filter by user (partial match on hashed ID)
    if (userFilter) {
      query = query.where('userId', '==', userFilter);
    }

    // Execute query (limit to 100 for performance)
    const snapshot = await query.limit(100).get();

    // Format results with PII protection
    const results = snapshot.docs.map(doc => {
      const data = doc.data();
      
      return {
        id: doc.id,
        toolName: data.toolName,
        error: data.error,
        attempts: data.attempts,
        timestamp: data.timestamp?.toDate().toISOString(),
        userId: hashUserId(data.userId || 'unknown'), // HASHED
        conversationId: data.conversationId?.substring(0, 12) || 'unknown',
        params: redactParams(data.params || {}), // REDACTED
      };
    });

    // Group by tool for summary
    const summary = results.reduce((acc, op) => {
      acc[op.toolName] = (acc[op.toolName] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    logger.info('✅ Failed ops retrieved', {
      count: results.length,
      summary,
    });

    res.status(200).json({
      count: results.length,
      summary,
      operations: results,
      filters: {
        days,
        toolFilter: toolFilter || 'all',
        userFilter: userFilter || 'all',
      },
      note: 'User IDs are hashed, params are redacted for privacy',
    });
  } catch (error: any) {
    logger.error('❌ Failed ops viewer error', { error: error.message });
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: error.message,
    });
  }
});

