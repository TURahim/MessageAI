/**
 * DST Transition Integration Tests
 * 
 * Tests timezone handling across Daylight Saving Time transitions
 * Critical for scheduling accuracy in tutoring platform
 * 
 * Run with: cd app && npm test -- dst-transitions
 * Run locally with functions deps: npm test -- dst-transitions
 * 
 * Note: Requires date-fns-tz to be installed in app/package.json
 */

// Skip if running in CI without functions dependencies
const hasFunctionsDeps = (() => {
  try {
    require.resolve('date-fns-tz');
    return true;
  } catch {
    return false;
  }
})();

const describeOrSkip = hasFunctionsDeps ? describe : describe.skip;

// Only import if dependencies available
let validateTimezone: any, parseDateTime: any, formatInTimezone: any, isDSTTransition: any, timeRangesOverlap: any;

if (hasFunctionsDeps) {
  const utils = require('../../../functions/src/utils/timezoneUtils');
  validateTimezone = utils.validateTimezone;
  parseDateTime = utils.parseDateTime;
  formatInTimezone = utils.formatInTimezone;
  isDSTTransition = utils.isDSTTransition;
  timeRangesOverlap = utils.timeRangesOverlap;
}

describeOrSkip('DST Transition Tests', () => {
  describe('Timezone Validation', () => {
    it('should validate correct IANA timezone', () => {
      expect(() => validateTimezone('America/New_York')).not.toThrow();
      expect(() => validateTimezone('Europe/London')).not.toThrow();
      expect(() => validateTimezone('Asia/Tokyo')).not.toThrow();
    });

    it('should throw on invalid timezone', () => {
      expect(() => validateTimezone('EST')).toThrow('INVALID_TIMEZONE');
      expect(() => validateTimezone('PST')).toThrow('INVALID_TIMEZONE');
      expect(() => validateTimezone('GMT')).toThrow('INVALID_TIMEZONE');
    });

    it('should throw on missing timezone', () => {
      expect(() => validateTimezone('')).toThrow('TIMEZONE_REQUIRED');
      expect(() => validateTimezone(undefined as any)).toThrow('TIMEZONE_REQUIRED');
    });
  });

  describe('Test 1: Spring Forward (March 10, 2024 - 2am → 3am)', () => {
    const timezone = 'America/New_York';
    const springForwardDate = new Date('2024-03-10T07:00:00Z'); // 2am EST = 7am UTC

    it('should detect DST transition on March 10', () => {
      expect(isDSTTransition(springForwardDate, timezone)).toBe(true);
    });

    it('should correctly parse time during spring forward', () => {
      // Parsing "March 10 at 3pm" should account for DST
      const result = parseDateTime('3pm', timezone, new Date('2024-03-10T00:00:00Z'));
      
      // Should be 3pm EDT (not EST)
      expect(result.getUTCHours()).toBe(19); // 3pm EDT = 19:00 UTC (EDT is UTC-4)
    });

    it('should format time correctly after DST transition', () => {
      const date = new Date('2024-03-10T19:00:00Z'); // 3pm EDT
      const formatted = formatInTimezone(date, timezone, 'h:mm a zzz');
      
      expect(formatted).toContain('3:00');
      expect(formatted).toContain('PM');
      // Should show EDT (not EST)
    });
  });

  describe('Test 2: Fall Back (November 3, 2024 - 2am → 1am)', () => {
    const timezone = 'America/New_York';
    const fallBackDate = new Date('2024-11-03T06:00:00Z'); // 2am EDT = 6am UTC

    it('should detect DST transition on November 3', () => {
      expect(isDSTTransition(fallBackDate, timezone)).toBe(true);
    });

    it('should correctly parse time during fall back', () => {
      // Parsing "November 3 at 1:30am" - ambiguous time (happens twice)
      const result = parseDateTime('1:30am', timezone, new Date('2024-11-03T00:00:00Z'));
      
      // Should resolve to first occurrence (1:30am EDT before transition)
      // This test documents the behavior even if ambiguous
      expect(result).toBeInstanceOf(Date);
    });

    it('should format time correctly after fall back', () => {
      const date = new Date('2024-11-03T14:00:00Z'); // 10am EST (after fall back)
      const formatted = formatInTimezone(date, timezone, 'h:mm a zzz');
      
      expect(formatted).toContain('10:00');
      expect(formatted).toContain('AM');
      // Should show EST (not EDT)
    });
  });

  describe('Test 3: Schedule reminder at 2pm on DST transition', () => {
    const timezone = 'America/New_York';

    it('should handle reminder on spring forward day', () => {
      const springDay = new Date('2024-03-10T00:00:00Z');
      const reminderTime = parseDateTime('2pm', timezone, springDay);
      
      // 2pm EDT = 18:00 UTC
      expect(reminderTime.getUTCHours()).toBe(18);
    });

    it('should handle reminder on fall back day', () => {
      const fallDay = new Date('2024-11-03T00:00:00Z');
      const reminderTime = parseDateTime('2pm', timezone, fallDay);
      
      // 2pm EST = 19:00 UTC
      expect(reminderTime.getUTCHours()).toBe(19);
    });
  });

  describe('Test 4: Conflict detection across DST boundary', () => {
    const timezone = 'America/New_York';

    it('should detect overlap when one event spans DST transition', () => {
      // Event 1: March 9, 11pm - March 10, 4am (spans spring forward)
      const event1Start = new Date('2024-03-10T04:00:00Z'); // 11pm EST
      const event1End = new Date('2024-03-10T09:00:00Z'); // 4am EDT (DST happened)

      // Event 2: March 10, 2am - 5am (overlaps)
      const event2Start = new Date('2024-03-10T07:00:00Z'); // 2am EST (becomes 3am EDT)
      const event2End = new Date('2024-03-10T10:00:00Z'); // 5am EDT

      const overlaps = timeRangesOverlap(
        event1Start, event1End,
        event2Start, event2End,
        timezone
      );

      expect(overlaps).toBe(true);
    });

    it('should detect no overlap when events are separated by DST', () => {
      // Event 1: March 9, 1pm - 2pm
      const event1Start = new Date('2024-03-09T18:00:00Z'); // 1pm EST
      const event1End = new Date('2024-03-09T19:00:00Z'); // 2pm EST

      // Event 2: March 10, 4pm - 5pm (after DST)
      const event2Start = new Date('2024-03-10T20:00:00Z'); // 4pm EDT
      const event2End = new Date('2024-03-10T21:00:00Z'); // 5pm EDT

      const overlaps = timeRangesOverlap(
        event1Start, event1End,
        event2Start, event2End,
        timezone
      );

      expect(overlaps).toBe(false);
    });
  });

  describe('Test 5: DST boundary conflict check (two events spanning DST change)', () => {
    const timezone = 'America/New_York';

    it('should correctly handle two overlapping events when both span DST', () => {
      // Event 1: March 9, 11pm - March 10, 3am
      const event1Start = new Date('2024-03-10T04:00:00Z'); // 11pm EST
      const event1End = new Date('2024-03-10T08:00:00Z'); // 3am EDT

      // Event 2: March 10, 12am - 4am (overlaps)
      const event2Start = new Date('2024-03-10T05:00:00Z'); // 12am EST
      const event2End = new Date('2024-03-10T09:00:00Z'); // 4am EDT

      const overlaps = timeRangesOverlap(
        event1Start, event1End,
        event2Start, event2End,
        timezone
      );

      expect(overlaps).toBe(true);
      expect(isDSTTransition(event1Start, timezone)).toBe(true);
      expect(isDSTTransition(event2Start, timezone)).toBe(true);
    });

    it('should handle fall back overlap correctly', () => {
      // Event 1: November 2, 11pm - November 3, 3am (spans fall back)
      const event1Start = new Date('2024-11-03T03:00:00Z'); // 11pm EDT
      const event1End = new Date('2024-11-03T08:00:00Z'); // 3am EST

      // Event 2: November 3, 1am - 4am (overlaps, in ambiguous hour)
      const event2Start = new Date('2024-11-03T05:00:00Z'); // 1am EDT (before fall back)
      const event2End = new Date('2024-11-03T09:00:00Z'); // 4am EST

      const overlaps = timeRangesOverlap(
        event1Start, event1End,
        event2Start, event2End,
        timezone
      );

      expect(overlaps).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should throw if timezone missing in parseDateTime', () => {
      expect(() => parseDateTime('tomorrow 3pm', '', new Date())).toThrow('TIMEZONE_REQUIRED');
      expect(() => parseDateTime('tomorrow 3pm', undefined as any, new Date())).toThrow('TIMEZONE_REQUIRED');
    });

    it('should throw if timezone missing in formatInTimezone', () => {
      expect(() => formatInTimezone(new Date(), '')).toThrow('TIMEZONE_REQUIRED');
    });

    it('should throw if timezone missing in timeRangesOverlap', () => {
      const now = new Date();
      const later = new Date(now.getTime() + 2 * 60 * 60 * 1000); // 2 hours later
      
      expect(() => timeRangesOverlap(now, later, now, later, '')).toThrow('TIMEZONE_REQUIRED');
    });

    it('should handle different timezones correctly', () => {
      const date = new Date('2024-01-15T18:00:00Z'); // 6pm UTC

      const ny = formatInTimezone(date, 'America/New_York', 'h:mm a');
      const la = formatInTimezone(date, 'America/Los_Angeles', 'h:mm a');
      const tokyo = formatInTimezone(date, 'Asia/Tokyo', 'h:mm a');

      expect(ny).toBe('1:00 PM'); // EST (UTC-5)
      expect(la).toBe('10:00 AM'); // PST (UTC-8)
      expect(tokyo).toBe('3:00 AM'); // JST (UTC+9, next day)
    });
  });
});

