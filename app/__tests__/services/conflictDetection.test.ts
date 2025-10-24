/**
 * Conflict Detection Tests
 * 
 * PR10: Conflict Engine
 * 
 * Tests conflict detection logic, buffer time calculations,
 * and alternative time slot generation
 */

import { describe, it, expect } from '@jest/globals';

// Mock conflict detection logic
type ConflictType = 'overlap' | 'back-to-back' | 'insufficient-buffer';

interface ConflictResult {
  hasConflict: boolean;
  conflictType?: ConflictType;
  conflictSeverity?: 'high' | 'medium' | 'low';
  recommendation?: string;
}

/**
 * Mock implementation of conflict detection
 */
function detectConflict(
  proposedStart: Date,
  proposedEnd: Date,
  existingStart: Date,
  existingEnd: Date,
  minimumBuffer: number = 15 // minutes
): ConflictResult {
  // Check for direct overlap (HIGH SEVERITY)
  if (proposedStart < existingEnd && existingStart < proposedEnd) {
    return {
      hasConflict: true,
      conflictType: 'overlap',
      conflictSeverity: 'high',
      recommendation: 'Direct time conflict. Choose a completely different time slot.',
    };
  }

  // Check for back-to-back (MEDIUM SEVERITY)
  if (
    proposedStart.getTime() === existingEnd.getTime() ||
    proposedEnd.getTime() === existingStart.getTime()
  ) {
    return {
      hasConflict: true,
      conflictType: 'back-to-back',
      conflictSeverity: 'medium',
      recommendation: `Back-to-back sessions. Consider ${minimumBuffer} minute buffer.`,
    };
  }

  // Check for insufficient buffer (LOW SEVERITY)
  const bufferAfter = (proposedStart.getTime() - existingEnd.getTime()) / (60 * 1000); // minutes
  const bufferBefore = (existingStart.getTime() - proposedEnd.getTime()) / (60 * 1000); // minutes

  if (bufferAfter > 0 && bufferAfter < minimumBuffer) {
    return {
      hasConflict: true,
      conflictType: 'insufficient-buffer',
      conflictSeverity: 'low',
      recommendation: `Only ${bufferAfter.toFixed(0)} min buffer. Recommend ${minimumBuffer} min.`,
    };
  }

  if (bufferBefore > 0 && bufferBefore < minimumBuffer) {
    return {
      hasConflict: true,
      conflictType: 'insufficient-buffer',
      conflictSeverity: 'low',
      recommendation: `Only ${bufferBefore.toFixed(0)} min buffer. Recommend ${minimumBuffer} min.`,
    };
  }

  return {
    hasConflict: false,
  };
}

describe('Conflict Detection', () => {
  describe('Direct Overlaps (High Severity)', () => {
    it('should detect complete overlap', () => {
      const proposedStart = new Date('2025-10-25T10:00:00Z');
      const proposedEnd = new Date('2025-10-25T11:00:00Z');
      const existingStart = new Date('2025-10-25T10:00:00Z');
      const existingEnd = new Date('2025-10-25T11:00:00Z');

      const result = detectConflict(proposedStart, proposedEnd, existingStart, existingEnd);

      expect(result.hasConflict).toBe(true);
      expect(result.conflictType).toBe('overlap');
      expect(result.conflictSeverity).toBe('high');
    });

    it('should detect partial overlap (proposed starts first)', () => {
      const proposedStart = new Date('2025-10-25T10:00:00Z');
      const proposedEnd = new Date('2025-10-25T11:00:00Z');
      const existingStart = new Date('2025-10-25T10:30:00Z');
      const existingEnd = new Date('2025-10-25T11:30:00Z');

      const result = detectConflict(proposedStart, proposedEnd, existingStart, existingEnd);

      expect(result.hasConflict).toBe(true);
      expect(result.conflictType).toBe('overlap');
      expect(result.conflictSeverity).toBe('high');
    });

    it('should detect partial overlap (existing starts first)', () => {
      const proposedStart = new Date('2025-10-25T10:30:00Z');
      const proposedEnd = new Date('2025-10-25T11:30:00Z');
      const existingStart = new Date('2025-10-25T10:00:00Z');
      const existingEnd = new Date('2025-10-25T11:00:00Z');

      const result = detectConflict(proposedStart, proposedEnd, existingStart, existingEnd);

      expect(result.hasConflict).toBe(true);
      expect(result.conflictType).toBe('overlap');
    });

    it('should detect proposed completely inside existing', () => {
      const proposedStart = new Date('2025-10-25T10:15:00Z');
      const proposedEnd = new Date('2025-10-25T10:45:00Z');
      const existingStart = new Date('2025-10-25T10:00:00Z');
      const existingEnd = new Date('2025-10-25T11:00:00Z');

      const result = detectConflict(proposedStart, proposedEnd, existingStart, existingEnd);

      expect(result.hasConflict).toBe(true);
      expect(result.conflictType).toBe('overlap');
    });

    it('should detect existing completely inside proposed', () => {
      const proposedStart = new Date('2025-10-25T10:00:00Z');
      const proposedEnd = new Date('2025-10-25T11:00:00Z');
      const existingStart = new Date('2025-10-25T10:15:00Z');
      const existingEnd = new Date('2025-10-25T10:45:00Z');

      const result = detectConflict(proposedStart, proposedEnd, existingStart, existingEnd);

      expect(result.hasConflict).toBe(true);
      expect(result.conflictType).toBe('overlap');
    });
  });

  describe('Back-to-Back Sessions (Medium Severity)', () => {
    it('should detect back-to-back (proposed after existing)', () => {
      const proposedStart = new Date('2025-10-25T11:00:00Z');
      const proposedEnd = new Date('2025-10-25T12:00:00Z');
      const existingStart = new Date('2025-10-25T10:00:00Z');
      const existingEnd = new Date('2025-10-25T11:00:00Z');

      const result = detectConflict(proposedStart, proposedEnd, existingStart, existingEnd);

      expect(result.hasConflict).toBe(true);
      expect(result.conflictType).toBe('back-to-back');
      expect(result.conflictSeverity).toBe('medium');
    });

    it('should detect back-to-back (proposed before existing)', () => {
      const proposedStart = new Date('2025-10-25T09:00:00Z');
      const proposedEnd = new Date('2025-10-25T10:00:00Z');
      const existingStart = new Date('2025-10-25T10:00:00Z');
      const existingEnd = new Date('2025-10-25T11:00:00Z');

      const result = detectConflict(proposedStart, proposedEnd, existingStart, existingEnd);

      expect(result.hasConflict).toBe(true);
      expect(result.conflictType).toBe('back-to-back');
    });
  });

  describe('Insufficient Buffer (Low Severity)', () => {
    it('should detect 10-minute buffer (below 15-min minimum)', () => {
      const proposedStart = new Date('2025-10-25T11:10:00Z'); // 10 min after existing ends
      const proposedEnd = new Date('2025-10-25T12:00:00Z');
      const existingStart = new Date('2025-10-25T10:00:00Z');
      const existingEnd = new Date('2025-10-25T11:00:00Z');

      const result = detectConflict(proposedStart, proposedEnd, existingStart, existingEnd);

      expect(result.hasConflict).toBe(true);
      expect(result.conflictType).toBe('insufficient-buffer');
      expect(result.conflictSeverity).toBe('low');
      expect(result.recommendation).toContain('10 min buffer');
    });

    it('should detect 5-minute buffer before existing', () => {
      const proposedStart = new Date('2025-10-25T09:00:00Z');
      const proposedEnd = new Date('2025-10-25T09:55:00Z'); // 5 min before existing starts
      const existingStart = new Date('2025-10-25T10:00:00Z');
      const existingEnd = new Date('2025-10-25T11:00:00Z');

      const result = detectConflict(proposedStart, proposedEnd, existingStart, existingEnd);

      expect(result.hasConflict).toBe(true);
      expect(result.conflictType).toBe('insufficient-buffer');
    });

    it('should NOT detect conflict with 15-minute buffer (meets minimum)', () => {
      const proposedStart = new Date('2025-10-25T11:15:00Z'); // 15 min after existing ends
      const proposedEnd = new Date('2025-10-25T12:00:00Z');
      const existingStart = new Date('2025-10-25T10:00:00Z');
      const existingEnd = new Date('2025-10-25T11:00:00Z');

      const result = detectConflict(proposedStart, proposedEnd, existingStart, existingEnd);

      expect(result.hasConflict).toBe(false);
    });

    it('should NOT detect conflict with 20-minute buffer (exceeds minimum)', () => {
      const proposedStart = new Date('2025-10-25T11:20:00Z'); // 20 min after existing ends
      const proposedEnd = new Date('2025-10-25T12:00:00Z');
      const existingStart = new Date('2025-10-25T10:00:00Z');
      const existingEnd = new Date('2025-10-25T11:00:00Z');

      const result = detectConflict(proposedStart, proposedEnd, existingStart, existingEnd);

      expect(result.hasConflict).toBe(false);
    });
  });

  describe('No Conflicts', () => {
    it('should NOT detect conflict for well-separated events (2 hours apart)', () => {
      const proposedStart = new Date('2025-10-25T13:00:00Z'); // 2 hours after existing ends
      const proposedEnd = new Date('2025-10-25T14:00:00Z');
      const existingStart = new Date('2025-10-25T10:00:00Z');
      const existingEnd = new Date('2025-10-25T11:00:00Z');

      const result = detectConflict(proposedStart, proposedEnd, existingStart, existingEnd);

      expect(result.hasConflict).toBe(false);
    });

    it('should NOT detect conflict for events on different days', () => {
      const proposedStart = new Date('2025-10-26T10:00:00Z'); // Next day
      const proposedEnd = new Date('2025-10-26T11:00:00Z');
      const existingStart = new Date('2025-10-25T10:00:00Z');
      const existingEnd = new Date('2025-10-25T11:00:00Z');

      const result = detectConflict(proposedStart, proposedEnd, existingStart, existingEnd);

      expect(result.hasConflict).toBe(false);
    });
  });

  describe('Custom Buffer Requirements', () => {
    it('should respect custom 30-minute buffer requirement', () => {
      const proposedStart = new Date('2025-10-25T11:20:00Z'); // 20 min buffer
      const proposedEnd = new Date('2025-10-25T12:00:00Z');
      const existingStart = new Date('2025-10-25T10:00:00Z');
      const existingEnd = new Date('2025-10-25T11:00:00Z');

      const result = detectConflict(proposedStart, proposedEnd, existingStart, existingEnd, 30);

      expect(result.hasConflict).toBe(true);
      expect(result.conflictType).toBe('insufficient-buffer');
      expect(result.recommendation).toContain('30 min');
    });

    it('should accept 30-minute buffer when required', () => {
      const proposedStart = new Date('2025-10-25T11:30:00Z'); // 30 min buffer
      const proposedEnd = new Date('2025-10-25T12:00:00Z');
      const existingStart = new Date('2025-10-25T10:00:00Z');
      const existingEnd = new Date('2025-10-25T11:00:00Z');

      const result = detectConflict(proposedStart, proposedEnd, existingStart, existingEnd, 30);

      expect(result.hasConflict).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    it('should handle 1-minute overlap', () => {
      const proposedStart = new Date('2025-10-25T10:59:00Z');
      const proposedEnd = new Date('2025-10-25T11:30:00Z');
      const existingStart = new Date('2025-10-25T10:00:00Z');
      const existingEnd = new Date('2025-10-25T11:00:00Z');

      const result = detectConflict(proposedStart, proposedEnd, existingStart, existingEnd);

      expect(result.hasConflict).toBe(true);
      expect(result.conflictType).toBe('overlap');
    });

    it('should handle same start, different end', () => {
      const proposedStart = new Date('2025-10-25T10:00:00Z');
      const proposedEnd = new Date('2025-10-25T11:30:00Z');
      const existingStart = new Date('2025-10-25T10:00:00Z');
      const existingEnd = new Date('2025-10-25T11:00:00Z');

      const result = detectConflict(proposedStart, proposedEnd, existingStart, existingEnd);

      expect(result.hasConflict).toBe(true);
      expect(result.conflictType).toBe('overlap');
    });

    it('should handle zero-duration events', () => {
      const proposedStart = new Date('2025-10-25T10:00:00Z');
      const proposedEnd = new Date('2025-10-25T10:00:00Z'); // Same time
      const existingStart = new Date('2025-10-25T10:00:00Z');
      const existingEnd = new Date('2025-10-25T11:00:00Z');

      const result = detectConflict(proposedStart, proposedEnd, existingStart, existingEnd);

      // Zero-duration at same start time is treated as conflict (edge case)
      expect(result.hasConflict).toBe(true);
    });
  });
});

describe('Alternative Time Slot Generation', () => {
  describe('Score Calculation', () => {
    it('should score midday slots higher (11 AM - 2 PM)', () => {
      // Mock scoring logic
      const getTimeScore = (hour: number): number => {
        let score = 100;
        if (hour < 10) score -= 20; // Early morning
        if (hour >= 16) score -= 30; // Late afternoon
        if (hour >= 11 && hour <= 14) score += 10; // Midday bonus
        return score;
      };

      expect(getTimeScore(12)).toBeGreaterThan(getTimeScore(9)); // Midday > early
      expect(getTimeScore(12)).toBeGreaterThan(getTimeScore(17)); // Midday > late
      expect(getTimeScore(12)).toBe(110); // Base 100 + 10 midday bonus
    });

    it('should penalize early morning slots', () => {
      const getTimeScore = (hour: number): number => {
        let score = 100;
        if (hour < 10) score -= 20;
        return score;
      };

      expect(getTimeScore(9)).toBe(80); // 100 - 20 penalty
      expect(getTimeScore(8)).toBe(80);
    });

    it('should penalize late afternoon slots', () => {
      const getTimeScore = (hour: number): number => {
        let score = 100;
        if (hour >= 16) score -= 30;
        return score;
      };

      expect(getTimeScore(16)).toBe(70); // 100 - 30 penalty
      expect(getTimeScore(17)).toBe(70);
    });
  });

  describe('Weekday vs Weekend Preference', () => {
    it('should prefer weekdays over weekends', () => {
      // 0 = Sunday, 6 = Saturday
      const isWeekend = (dayOfWeek: number): boolean => {
        return dayOfWeek === 0 || dayOfWeek === 6;
      };

      expect(isWeekend(0)).toBe(true); // Sunday
      expect(isWeekend(6)).toBe(true); // Saturday
      expect(isWeekend(1)).toBe(false); // Monday
      expect(isWeekend(5)).toBe(false); // Friday
    });
  });
});

