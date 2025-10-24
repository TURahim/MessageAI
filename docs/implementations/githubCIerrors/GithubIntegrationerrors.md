FAIL __tests__/services/rsvpInterpretation.test.ts
  ● RSVP Interpretation (Unit - No API) › RSVP Prompt Exists › should have RSVP interpretation prompt defined

    Cannot find module '../../../functions/lib/ai/promptTemplates.js' from '__tests__/services/rsvpInterpretation.test.ts'

      77 |   describe('RSVP Prompt Exists', () => {
      78 |     it('should have RSVP interpretation prompt defined', () => {
    > 79 |       const { RSVP_INTERPRETATION_PROMPT } = require('../../../functions/lib/ai/promptTemplates.js');
         |                                              ^
      80 |       expect(RSVP_INTERPRETATION_PROMPT).toBeDefined();
      81 |       expect(RSVP_INTERPRETATION_PROMPT).toContain('accept');
      82 |       expect(RSVP_INTERPRETATION_PROMPT).toContain('decline');

      at Resolver._throwModNotFoundError (node_modules/jest-resolve/build/resolver.js:427:11)
      at Object.require (__tests__/services/rsvpInterpretation.test.ts:79:46)


    console.error
      ❌ Image compression failed: Error: Image file not found
          at /home/runner/work/MessageAI/MessageAI/app/src/utils/imageCompression.ts:43:13
          at Generator.next (<anonymous>)
          at asyncGeneratorStep (/home/runner/work/MessageAI/MessageAI/app/node_modules/@babel/runtime/helpers/asyncToGenerator.js:3:17)
          at _next (/home/runner/work/MessageAI/MessageAI/app/node_modules/@babel/runtime/helpers/asyncToGenerator.js:17:9)

      111 |     };
      112 |   } catch (error: any) {
    > 113 |     console.error('❌ Image compression failed:', error);
          |             ^
      114 |     throw new Error(`Failed to compress image: ${error.message}`);
      115 |   }
      116 | }

      at error (src/utils/imageCompression.ts:113:13)
      at asyncGeneratorStep (node_modules/@babel/runtime/helpers/asyncToGenerator.js:3:17)
      at _next (node_modules/@babel/runtime/helpers/asyncToGenerator.js:17:9)

      FAIL __tests__/integration/dst-transitions.test.ts
  ● Test suite failed to run

    Cannot find module 'date-fns-tz' from '../functions/src/utils/timezoneUtils.ts'

    Require stack:
      /home/runner/work/MessageAI/MessageAI/functions/src/utils/timezoneUtils.ts
      __tests__/integration/dst-transitions.test.ts

       6 |  */
       7 |
    >  8 | import { toZonedTime, fromZonedTime, format } from 'date-fns-tz';
         | ^
       9 | import { addDays } from 'date-fns';
      10 |
      11 | /**

      at Resolver._throwModNotFoundError (node_modules/jest-resolve/build/resolver.js:427:11)
      at Object.require (../functions/src/utils/timezoneUtils.ts:8:1)
      at Object.require (__tests__/integration/dst-transitions.test.ts:29:17)
