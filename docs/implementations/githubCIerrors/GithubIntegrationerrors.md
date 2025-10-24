Run cd app && pnpm test --passWithNoTests

> app@1.0.0 test /home/runner/work/MessageAI/MessageAI/app
> jest --runInBand --passWithNoTests

FAIL __tests__/services/urgencyClassifier.test.ts (8.518 s)
  ● Console

    console.log
      Urgency Classifier Performance:

      at Object.log (__tests__/services/urgencyClassifier.test.ts:423:13)

    console.log
      True Positives: 15/20

      at Object.log (__tests__/services/urgencyClassifier.test.ts:424:13)

    console.log
      False Positives: 0/20

      at Object.log (__tests__/services/urgencyClassifier.test.ts:425:13)

    console.log
      Precision: 100.0%

      at Object.log (__tests__/services/urgencyClassifier.test.ts:426:13)

  ● Urgency Classifier - Keyword Detection › Explicit Urgency Keywords › should detect URGENT keyword (high confidence)

    expect(received).toBe(expected) // Object.is equality

    Expected: "emergency"
    Received: "reschedule"

      110 |       expect(result?.isUrgent).toBe(true);
      111 |       expect(result?.confidence).toBeGreaterThanOrEqual(0.85);
    > 112 |       expect(result?.category).toBe('emergency');
          |                                ^
      113 |       expect(result?.shouldNotify).toBe(true);
      114 |     });
      115 |

      at Object.toBe (__tests__/services/urgencyClassifier.test.ts:112:32)

  ● Urgency Classifier - Keyword Detection › Explicit Urgency Keywords › should detect emergency keyword

    expect(received).toBe(expected) // Object.is equality

    Expected: "emergency"
    Received: "cancellation"

      126 |       expect(result).not.toBeNull();
      127 |       expect(result?.isUrgent).toBe(true);
    > 128 |       expect(result?.category).toBe('emergency');
          |                                ^
      129 |     });
      130 |   });
      131 |

      at Object.toBe (__tests__/services/urgencyClassifier.test.ts:128:32)

  ● Urgency Classifier - Keyword Detection › False Positive Prevention (High Precision) › should reduce confidence for hedging phrases

    expect(received).not.toBeNull()

    Received: null

      219 |     it('should reduce confidence for hedging phrases', () => {
      220 |       const result = detectUrgencyKeywords('Maybe we should cancel if possible, no rush');
    > 221 |       expect(result).not.toBeNull();
          |                          ^
      222 |       expect(result?.confidence).toBeLessThan(0.7); // Reduced by hedging
      223 |       expect(result?.isUrgent).toBe(false); // Below threshold
      224 |     });

      at Object.toBeNull (__tests__/services/urgencyClassifier.test.ts:221:26)

  ● Urgency Classifier - Real-World Examples › Ambiguous Cases (Conservative Handling) › should be conservative with general "urgent" in casual context

    expect(received).toBeLessThan(expected)

    Expected: < 0.7
    Received:   0.95

      342 |       // If detected, should have low confidence
      343 |       if (result) {
    > 344 |         expect(result.confidence).toBeLessThan(0.7);
          |                                   ^
      345 |         expect(result.shouldNotify).toBe(false);
      346 |       }
      347 |     });

      at Object.toBeLessThan (__tests__/services/urgencyClassifier.test.ts:344:35)

FAIL __tests__/services/conflictDetection.test.ts
  ● Conflict Detection › Edge Cases › should handle zero-duration events

    expect(received).toBe(expected) // Object.is equality

    Expected: false
    Received: true

      306 |
      307 |       // Zero-duration should not create conflicts
    > 308 |       expect(result.hasConflict).toBe(false);
          |                                  ^
      309 |     });
      310 |   });
      311 | });

      at Object.toBe (__tests__/services/conflictDetection.test.ts:308:34)

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

FAIL __tests__/services/reminderScheduler.test.ts
  ● Reminder Scheduler › Composite Key Generation › should have predictable format

    expect(received).toBe(expected) // Object.is equality

    Expected: 4
    Received: 5

      73 |
      74 |       expect(key).toBe('event_evt123_user456_24h_before');
    > 75 |       expect(key.split('_').length).toBe(4);
         |                                     ^
      76 |     });
      77 |   });
      78 |

      at Object.toBe (__tests__/services/reminderScheduler.test.ts:75:37)

PASS src/hooks/__tests__/useMessages.test.ts
  ● Console

    console.log
      👂 Subscribing to messages (paginated) for: conv-123

      at log (src/hooks/useMessages.ts:42:13)

    console.log
      👂 Subscribing to messages (paginated) for: conv-123

      at log (src/hooks/useMessages.ts:42:13)

    console.log
      📥 Received 2 messages (initial/realtime) { fromCache: false, source: '☁️ SERVER' }

      at log (src/hooks/useMessages.ts:56:17)

    console.log
      👂 Subscribing to messages (paginated) for: conv-123

      at log (src/hooks/useMessages.ts:42:13)

    console.log
      📥 Received 50 messages (initial/realtime) { fromCache: false, source: '☁️ SERVER' }

      at log (src/hooks/useMessages.ts:56:17)

    console.log
      👂 Subscribing to messages (paginated) for: conv-123

      at log (src/hooks/useMessages.ts:42:13)

    console.log
      📥 Received 20 messages (initial/realtime) { fromCache: false, source: '☁️ SERVER' }

      at log (src/hooks/useMessages.ts:56:17)

    console.log
      👂 Subscribing to messages (paginated) for: conv-123

      at log (src/hooks/useMessages.ts:42:13)

    console.log
      👂 Subscribing to messages (paginated) for: conv-123

      at log (src/hooks/useMessages.ts:42:13)

    console.log
      👂 Subscribing to messages (paginated) for: conv-123

      at log (src/hooks/useMessages.ts:42:13)

    console.log
      📥 Received 50 messages (initial/realtime) { fromCache: false, source: '☁️ SERVER' }

      at log (src/hooks/useMessages.ts:56:17)

    console.log
      👂 Subscribing to messages (paginated) for: conv-123

      at log (src/hooks/useMessages.ts:42:13)

    console.log
      📥 Received 20 messages (initial/realtime) { fromCache: false, source: '☁️ SERVER' }

      at log (src/hooks/useMessages.ts:56:17)

    console.log
      ⏭️ Skipping loadMore: { loadingMore: false, hasMore: false, hasLastVisible: true }

      at Object.log (src/hooks/useMessages.ts:108:15)

PASS __tests__/services/timeParse.test.ts
  ● Console

    console.log
      TIMEZONE_REQUIRED_TOOLS not available - skipping validation

      at Object.log (__tests__/services/timeParse.test.ts:202:15)

PASS __tests__/services/vectorRetriever.test.ts
  ● Console

    console.log
      ✅ Firestore initialized with automatic offline persistence

      at Object.log (src/lib/firebase.ts:28:9)

    console.log
      📦 Offline features: Document cache, queued writes, offline queries

      at Object.log (src/lib/firebase.ts:29:9)

    console.log
      📦 Using MockVectorRetriever (test mode)

      at log (src/services/ai/ragService.ts:36:15)

PASS __tests__/services/taskExtraction.test.ts
PASS src/utils/__tests__/imageCompression.test.ts
  ● Console

    console.log
      🖼️ Compressing image: file://large.jpg

      at log (src/utils/imageCompression.ts:37:11)

    console.log
      📏 Original size: 5.00MB

      at log (src/utils/imageCompression.ts:47:13)

    console.log
      ✅ Compressed size: 1.50MB

      at log (src/utils/imageCompression.ts:70:13)

    console.log
      📐 Dimensions: 1920x1080

      at log (src/utils/imageCompression.ts:71:13)

    console.log
      🖼️ Compressing image: file://test.jpg

      at log (src/utils/imageCompression.ts:37:11)

    console.log
      📏 Original size: 3.00MB

      at log (src/utils/imageCompression.ts:47:13)

    console.log
      ✅ Compressed size: 0.48MB

      at log (src/utils/imageCompression.ts:70:13)

    console.log
      📐 Dimensions: 1920x1080

      at log (src/utils/imageCompression.ts:71:13)

    console.log
      🖼️ Compressing image: file://missing.jpg

      at log (src/utils/imageCompression.ts:37:11)

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

    console.log
      🖼️ Compressing image: file://huge.jpg

      at log (src/utils/imageCompression.ts:37:11)

    console.log
      📏 Original size: 10.00MB

      at log (src/utils/imageCompression.ts:47:13)

    console.log
      ✅ Compressed size: 3.00MB

      at log (src/utils/imageCompression.ts:70:13)

    console.log
      📐 Dimensions: 1920x1080

      at log (src/utils/imageCompression.ts:71:13)

    console.log
      ⚠️ Still too large, compressing more...

      at log (src/utils/imageCompression.ts:75:15)

    console.log
      ✅ Final size: 1.20MB

      at log (src/utils/imageCompression.ts:96:15)

PASS src/services/__tests__/authService.test.ts
  ● Console

    console.log
      ✅ Created user document for: test-uid-123

      at log (src/services/authService.ts:78:13)

    console.log
      🚪 Signing out...

      at log (src/services/authService.ts:194:13)

    console.log
      ✅ Sign out successful

      at log (src/services/authService.ts:196:13)

PASS src/services/__tests__/conversationService.test.ts
  ● Console

    console.log
      👥 Group "Test Group" created with 3 members

      at log (src/services/conversationService.ts:238:11)

    console.log
      👥 Group "  Test Group  " created with 3 members

      at log (src/services/conversationService.ts:238:11)

    console.log
      👥 Group "Test Group" created with 3 members

      at log (src/services/conversationService.ts:238:11)

    console.log
      👥 Group "Large Group" created with 20 members

      at log (src/services/conversationService.ts:238:11)

PASS __tests__/services/rsvpInterpretation.test.ts
PASS src/components/__tests__/EmptyState.test.tsx
PASS src/components/__tests__/ErrorBanner.test.tsx
PASS src/components/__tests__/ConnectionBanner.test.tsx
PASS src/services/__tests__/presenceService.test.ts
PASS src/components/__tests__/TypingIndicator.test.tsx
  ● Console

    console.log
      💬 TypingIndicator received update: 0 users

      at log (src/components/TypingIndicator.tsx:25:17)

    console.log
      💬 Clearing typing indicator (no users)

      at log (src/components/TypingIndicator.tsx:44:17)

    console.log
      💬 Clearing typing indicator (no users)

      at log (src/components/TypingIndicator.tsx:44:17)

    console.log
      💬 TypingIndicator received update: 1 users

      at log (src/components/TypingIndicator.tsx:25:17)

    console.log
      💬 Clearing typing indicator (no users)

      at log (src/components/TypingIndicator.tsx:44:17)

    console.log
      💬 Fetching names for 1 typing users

      at log (src/components/TypingIndicator.tsx:49:15)

    console.log
      💬 Showing typing indicator: [ 'Test User' ]

      at log (src/components/TypingIndicator.tsx:65:15)

PASS src/services/__tests__/readReceiptService.test.ts
PASS src/lib/__tests__/firebase.test.ts
  ● Console

    console.log
      ✅ Firestore initialized with automatic offline persistence

      at Object.log (src/lib/firebase.ts:28:9)

    console.log
      📦 Offline features: Document cache, queued writes, offline queries

      at Object.log (src/lib/firebase.ts:29:9)

PASS src/utils/messageId.test.ts

Summary of all failing tests
FAIL __tests__/services/urgencyClassifier.test.ts (8.518 s)
  ● Urgency Classifier - Keyword Detection › Explicit Urgency Keywords › should detect URGENT keyword (high confidence)

    expect(received).toBe(expected) // Object.is equality

    Expected: "emergency"
    Received: "reschedule"

      110 |       expect(result?.isUrgent).toBe(true);
      111 |       expect(result?.confidence).toBeGreaterThanOrEqual(0.85);
    > 112 |       expect(result?.category).toBe('emergency');
          |                                ^
      113 |       expect(result?.shouldNotify).toBe(true);
      114 |     });
      115 |

      at Object.toBe (__tests__/services/urgencyClassifier.test.ts:112:32)

  ● Urgency Classifier - Keyword Detection › Explicit Urgency Keywords › should detect emergency keyword

    expect(received).toBe(expected) // Object.is equality

    Expected: "emergency"
    Received: "cancellation"

      126 |       expect(result).not.toBeNull();
      127 |       expect(result?.isUrgent).toBe(true);
    > 128 |       expect(result?.category).toBe('emergency');
          |                                ^
      129 |     });
      130 |   });
      131 |

      at Object.toBe (__tests__/services/urgencyClassifier.test.ts:128:32)

  ● Urgency Classifier - Keyword Detection › False Positive Prevention (High Precision) › should reduce confidence for hedging phrases

    expect(received).not.toBeNull()

    Received: null

      219 |     it('should reduce confidence for hedging phrases', () => {
      220 |       const result = detectUrgencyKeywords('Maybe we should cancel if possible, no rush');
    > 221 |       expect(result).not.toBeNull();
          |                          ^
      222 |       expect(result?.confidence).toBeLessThan(0.7); // Reduced by hedging
      223 |       expect(result?.isUrgent).toBe(false); // Below threshold
      224 |     });

      at Object.toBeNull (__tests__/services/urgencyClassifier.test.ts:221:26)

  ● Urgency Classifier - Real-World Examples › Ambiguous Cases (Conservative Handling) › should be conservative with general "urgent" in casual context

    expect(received).toBeLessThan(expected)

    Expected: < 0.7
    Received:   0.95

      342 |       // If detected, should have low confidence
      343 |       if (result) {
    > 344 |         expect(result.confidence).toBeLessThan(0.7);
          |                                   ^
      345 |         expect(result.shouldNotify).toBe(false);
      346 |       }
      347 |     });

      at Object.toBeLessThan (__tests__/services/urgencyClassifier.test.ts:344:35)

FAIL __tests__/services/conflictDetection.test.ts
  ● Conflict Detection › Edge Cases › should handle zero-duration events

    expect(received).toBe(expected) // Object.is equality

    Expected: false
    Received: true

      306 |
      307 |       // Zero-duration should not create conflicts
    > 308 |       expect(result.hasConflict).toBe(false);
          |                                  ^
      309 |     });
      310 |   });
      311 | });

      at Object.toBe (__tests__/services/conflictDetection.test.ts:308:34)

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

FAIL __tests__/services/reminderScheduler.test.ts
  ● Reminder Scheduler › Composite Key Generation › should have predictable format

    expect(received).toBe(expected) // Object.is equality

    Expected: 4
    Received: 5

      73 |
      74 |       expect(key).toBe('event_evt123_user456_24h_before');
    > 75 |       expect(key.split('_').length).toBe(4);
         |                                     ^
      76 |     });
      77 |   });
      78 |

      at Object.toBe (__tests__/services/reminderScheduler.test.ts:75:37)


Test Suites: 4 failed, 4 skipped, 16 passed, 20 of 24 total
Tests:       6 failed, 44 skipped, 195 passed, 245 total
Snapshots:   0 total
Time:        17.645 s
Ran all test suites.
 ELIFECYCLE  Test failed. See above for more details.
Error: Process completed with exit code 1.