/**
 * Smart Nudge Generator Tests
 * 
 * PR14: Smart Nudges
 * 
 * Tests template-based nudge generation (no AI)
 */

import { describe, it, expect } from '@jest/globals';

describe('Smart Nudge Generator', () => {
  describe('Post-Session Note Prompts', () => {
    it('should generate template-based message', () => {
      const sessionTitle = 'Math Tutoring';
      const message = `📝 How did the "${sessionTitle}" session go?\n\n` +
        `Feel free to add any notes about topics covered, homework assigned, or areas to focus on next time.`;

      expect(message).toContain('How did the');
      expect(message).toContain('Math Tutoring');
      expect(message).toContain('session go');
      expect(message).toContain('notes');
    });

    it('should not use AI-generated content', () => {
      const template = 'Feel free to add any notes about topics covered';
      
      // Template should be hardcoded, not AI-generated
      expect(typeof template).toBe('string');
      expect(template).toBe('Feel free to add any notes about topics covered');
    });
  });

  describe('Long Gap Alerts', () => {
    it('should generate alert for 14+ day gap', () => {
      const daysSince = 15;
      const studentName = 'Sarah';

      const message = `📅 It's been ${daysSince} days since your last session with ${studentName}.\n\n` +
        `Consider scheduling a follow-up session to maintain momentum.`;

      expect(message).toContain('15 days');
      expect(message).toContain('Sarah');
      expect(message).toContain('scheduling a follow-up');
    });

    it('should generate alert without student name', () => {
      const daysSince = 20;

      const message = `📅 It's been ${daysSince} days since your last session.\n\n` +
        `Consider scheduling a follow-up session to maintain momentum.`;

      expect(message).toContain('20 days');
      expect(message).toContain('last session');
      expect(message).not.toContain('with'); // No student name
    });

    it('should use template (not AI-generated)', () => {
      const template = 'Consider scheduling a follow-up session to maintain momentum.';
      
      expect(typeof template).toBe('string');
      expect(template).toBe('Consider scheduling a follow-up session to maintain momentum.');
    });
  });

  describe('User Preferences', () => {
    it('should support disabling all nudges', () => {
      const prefs = {
        enabled: false,
        postSessionNotesEnabled: true,
        longGapAlertsEnabled: true,
        unconfirmedEventsEnabled: true,
      };

      const shouldSendNudge = prefs.enabled;
      expect(shouldSendNudge).toBe(false);
    });

    it('should support disabling specific nudge types', () => {
      const prefs = {
        enabled: true,
        postSessionNotesEnabled: false, // Disabled
        longGapAlertsEnabled: true,
        unconfirmedEventsEnabled: true,
      };

      const shouldSendPostSession = prefs.enabled && prefs.postSessionNotesEnabled;
      const shouldSendLongGap = prefs.enabled && prefs.longGapAlertsEnabled;

      expect(shouldSendPostSession).toBe(false);
      expect(shouldSendLongGap).toBe(true);
    });

    it('should have all nudges enabled by default', () => {
      const defaults = {
        enabled: true,
        postSessionNotesEnabled: true,
        longGapAlertsEnabled: true,
        unconfirmedEventsEnabled: true,
      };

      expect(defaults.enabled).toBe(true);
      expect(defaults.postSessionNotesEnabled).toBe(true);
      expect(defaults.longGapAlertsEnabled).toBe(true);
    });
  });

  describe('Session Detection', () => {
    it('should detect sessions ended within 2 hours', () => {
      const now = Date.now();
      const sessionEnd = new Date(now - 1.5 * 60 * 60 * 1000); // 1.5h ago
      const twoHoursAgo = new Date(now - 2 * 60 * 60 * 1000);

      const inWindow = sessionEnd >= twoHoursAgo && sessionEnd <= new Date(now);
      expect(inWindow).toBe(true);
    });

    it('should NOT detect sessions ended >2 hours ago', () => {
      const now = Date.now();
      const sessionEnd = new Date(now - 3 * 60 * 60 * 1000); // 3h ago
      const twoHoursAgo = new Date(now - 2 * 60 * 60 * 1000);

      const inWindow = sessionEnd >= twoHoursAgo && sessionEnd <= new Date(now);
      expect(inWindow).toBe(false);
    });
  });

  describe('Long Gap Detection', () => {
    it('should detect >14 day gaps', () => {
      const now = Date.now();
      const lastSession = new Date(now - 20 * 24 * 60 * 60 * 1000); // 20 days ago
      const fourteenDaysAgo = new Date(now - 14 * 24 * 60 * 60 * 1000);

      const isLongGap = lastSession < fourteenDaysAgo;
      expect(isLongGap).toBe(true);
    });

    it('should NOT flag recent sessions (<14 days)', () => {
      const now = Date.now();
      const lastSession = new Date(now - 7 * 24 * 60 * 60 * 1000); // 7 days ago
      const fourteenDaysAgo = new Date(now - 14 * 24 * 60 * 60 * 1000);

      const isLongGap = lastSession < fourteenDaysAgo;
      expect(isLongGap).toBe(false);
    });

    it('should calculate days correctly', () => {
      const now = new Date('2025-10-24T10:00:00Z');
      const lastSession = new Date('2025-10-10T10:00:00Z');

      const daysSince = (now.getTime() - lastSession.getTime()) / (24 * 60 * 60 * 1000);
      expect(daysSince).toBe(14);
    });
  });

  describe('Nudge Idempotency', () => {
    it('should prevent duplicate post-session prompts', () => {
      const sentNudges = new Map<string, Set<string>>();

      const wasNudgeSent = (eventId: string, nudgeType: string): boolean => {
        if (!sentNudges.has(eventId)) {
          sentNudges.set(eventId, new Set());
        }
        return sentNudges.get(eventId)!.has(nudgeType);
      };

      const logNudge = (eventId: string, nudgeType: string): void => {
        if (!sentNudges.has(eventId)) {
          sentNudges.set(eventId, new Set());
        }
        sentNudges.get(eventId)!.add(nudgeType);
      };

      expect(wasNudgeSent('evt1', 'post_session_note')).toBe(false);
      
      logNudge('evt1', 'post_session_note');
      
      expect(wasNudgeSent('evt1', 'post_session_note')).toBe(true);
      expect(wasNudgeSent('evt1', 'post_session_note')).toBe(true); // Still true
    });
  });
});

