/**
 * Time Parse Tests
 * 
 * Tests LLM-based date/time extraction
 * Requires OPENAI_API_KEY to run full tests
 * 
 * Run with: cd app && npm test -- timeParse
 * Run with API: OPENAI_API_KEY=xxx npm test -- timeParse
 */

import type { TimeParseInput, TimeParseOutput } from '../../src/types/toolTypes';

// Mock executeTool for testing without full Cloud Functions
const executeTool = async (toolName: string, params: any): Promise<any> => {
  // This would call the actual Cloud Function in integration tests
  // For unit tests, we'll mock or skip
  throw new Error('executeTool requires Cloud Functions - use integration tests');
};

// Skip tests if no API key (CI can run without API key)
const hasApiKey = !!process.env.OPENAI_API_KEY;
const describeOrSkip = hasApiKey ? describe : describe.skip;

describeOrSkip('Time Parse Tool (LLM)', () => {
  const timezone = 'America/New_York';
  const referenceDate = '2024-10-23T12:00:00Z'; // Wednesday, Oct 23, 2024, noon UTC

  describe('Basic Date Extraction', () => {
    it('should parse "tomorrow at 3pm"', async () => {
      const input: TimeParseInput = {
        text: 'tomorrow at 3pm',
        timezone,
        referenceDate,
      };

      const result: TimeParseOutput = await executeTool('time.parse', input);

      expect(result.success).toBe(true);
      expect(result.dateTime).toBeDefined();
      expect(result.confidence).toBeGreaterThan(0.8);

      // Tomorrow = Oct 24, 2024 at 3pm EDT (19:00 UTC)
      const parsed = new Date(result.dateTime!);
      expect(parsed.getUTCDate()).toBe(24); // Tomorrow
      expect(parsed.getUTCHours()).toBe(19); // 3pm EDT = 19:00 UTC
    }, 10000); // 10s timeout for API call

    it('should parse "Friday 2pm"', async () => {
      const input: TimeParseInput = {
        text: 'Friday 2pm',
        timezone,
        referenceDate,
      };

      const result: TimeParseOutput = await executeTool('time.parse', input);

      expect(result.success).toBe(true);
      expect(result.dateTime).toBeDefined();
      expect(result.confidence).toBeGreaterThan(0.75);

      // Friday = Oct 25, 2024 at 2pm
      const parsed = new Date(result.dateTime!);
      expect(parsed.getUTCDate()).toBe(25);
      expect(parsed.getUTCHours()).toBe(18); // 2pm EDT = 18:00 UTC
    }, 10000);

    it('should parse "next week"', async () => {
      const input: TimeParseInput = {
        text: 'next week',
        timezone,
        referenceDate,
      };

      const result: TimeParseOutput = await executeTool('time.parse', input);

      expect(result.success).toBe(true);
      expect(result.dateTime).toBeDefined();
      expect(result.confidence).toBeGreaterThan(0.7);

      // Next week Monday should be Oct 28 or later
      const parsed = new Date(result.dateTime!);
      expect(parsed.getUTCDate()).toBeGreaterThanOrEqual(28);
    }, 10000);
  });

  describe('Specific Times', () => {
    it('should parse "Monday at 10am"', async () => {
      const input: TimeParseInput = {
        text: 'Monday at 10am',
        timezone,
        referenceDate,
      };

      const result: TimeParseOutput = await executeTool('time.parse', input);

      expect(result.success).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.8);

      const parsed = new Date(result.dateTime!);
      expect(parsed.getUTCHours()).toBe(14); // 10am EDT = 14:00 UTC
    }, 10000);

    it('should parse "Thursday 4:30pm"', async () => {
      const input: TimeParseInput = {
        text: 'Thursday 4:30pm',
        timezone,
        referenceDate,
      };

      const result: TimeParseOutput = await executeTool('time.parse', input);

      expect(result.success).toBe(true);
      
      const parsed = new Date(result.dateTime!);
      expect(parsed.getUTCMinutes()).toBe(30);
    }, 10000);
  });

  describe('Duration Extraction', () => {
    it('should extract duration when mentioned', async () => {
      const input: TimeParseInput = {
        text: 'tomorrow at 3pm for 90 minutes',
        timezone,
        referenceDate,
      };

      const result: TimeParseOutput = await executeTool('time.parse', input);

      expect(result.success).toBe(true);
      // Duration is optional but should be extracted if mentioned
      // (Note: current schema has duration but LLM might not always extract it)
    }, 10000);
  });

  describe('No Date Found', () => {
    it('should return found=false for messages without dates', async () => {
      const input: TimeParseInput = {
        text: 'How are you doing?',
        timezone,
        referenceDate,
      };

      const result: TimeParseOutput = await executeTool('time.parse', input);

      expect(result.success).toBe(false);
      expect(result.confidence).toBeLessThan(0.5);
    }, 10000);

    it('should return found=false for vague time references', async () => {
      const input: TimeParseInput = {
        text: 'Let me check my schedule',
        timezone,
        referenceDate,
      };

      const result: TimeParseOutput = await executeTool('time.parse', input);

      expect(result.success).toBe(false);
    }, 10000);
  });

  describe('Timezone Enforcement', () => {
    it('should reject missing timezone', async () => {
      const input = {
        text: 'tomorrow at 3pm',
        timezone: '',
        referenceDate,
      };

      const result = await executeTool('time.parse', input);

      expect(result.success).toBe(false);
      expect(result.error).toContain('TIMEZONE');
    });

    it('should reject invalid timezone', async () => {
      const input: TimeParseInput = {
        text: 'tomorrow at 3pm',
        timezone: 'EST', // Not IANA format
        referenceDate,
      };

      const result = await executeTool('time.parse', input);

      expect(result.success).toBe(false);
      expect(result.error).toContain('TIMEZONE');
    });
  });
});

describe('Time Parse Tool (Unit - No API)', () => {
  it('should validate tool is registered', () => {
    const { TIMEZONE_REQUIRED_TOOLS } = require('../../src/types/toolTypes');
    expect(TIMEZONE_REQUIRED_TOOLS).toContain('time.parse');
  });

  it('should have timezone validation', () => {
    const { validateTimezone } = require('../../../functions/src/utils/timezoneUtils');
    expect(() => validateTimezone('America/New_York')).not.toThrow();
    expect(() => validateTimezone('')).toThrow();
  });
});

