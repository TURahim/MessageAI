Run cd app && pnpm test --passWithNoTests

> app@1.0.0 test /home/runner/work/MessageAI/MessageAI/app
> jest --runInBand --passWithNoTests

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
      at Object.<anonymous> (__tests__/integration/dst-transitions.test.ts:10:1)

FAIL __tests__/emulator/firestore-events-rules.test.ts
  ● Events Collection Security Rules › Read Access › Test 1: Participant CAN read event

    TypeError: fetch failed



    Cause:
    connect ECONNREFUSED ::1:8080



  ● Events Collection Security Rules › Read Access › Test 1: Participant CAN read event

    TypeError: Cannot read properties of undefined (reading 'clearFirestore')

      44 |
      45 | afterEach(async () => {
    > 46 |   await testEnv.clearFirestore();
         |                 ^
      47 | });
      48 |
      49 | describe('Events Collection Security Rules', () => {

      at Object.clearFirestore (__tests__/emulator/firestore-events-rules.test.ts:46:17)
      at asyncGeneratorStep (node_modules/@babel/runtime/helpers/asyncToGenerator.js:3:17)
      at _next (node_modules/@babel/runtime/helpers/asyncToGenerator.js:17:9)
      at node_modules/@babel/runtime/helpers/asyncToGenerator.js:22:7
      at Object.<anonymous> (node_modules/@babel/runtime/helpers/asyncToGenerator.js:14:12)

  ● Events Collection Security Rules › Read Access › Test 2: Non-participant CANNOT read event

    TypeError: fetch failed



    Cause:
    connect ECONNREFUSED ::1:8080



  ● Events Collection Security Rules › Read Access › Test 2: Non-participant CANNOT read event

    TypeError: Cannot read properties of undefined (reading 'clearFirestore')

      44 |
      45 | afterEach(async () => {
    > 46 |   await testEnv.clearFirestore();
         |                 ^
      47 | });
      48 |
      49 | describe('Events Collection Security Rules', () => {

      at Object.clearFirestore (__tests__/emulator/firestore-events-rules.test.ts:46:17)
      at asyncGeneratorStep (node_modules/@babel/runtime/helpers/asyncToGenerator.js:3:17)
      at _next (node_modules/@babel/runtime/helpers/asyncToGenerator.js:17:9)
      at node_modules/@babel/runtime/helpers/asyncToGenerator.js:22:7
      at Object.<anonymous> (node_modules/@babel/runtime/helpers/asyncToGenerator.js:14:12)

  ● Events Collection Security Rules › Read Access › Unauthenticated user CANNOT read event

    TypeError: fetch failed



    Cause:
    connect ECONNREFUSED ::1:8080



  ● Events Collection Security Rules › Read Access › Unauthenticated user CANNOT read event

    TypeError: Cannot read properties of undefined (reading 'clearFirestore')

      44 |
      45 | afterEach(async () => {
    > 46 |   await testEnv.clearFirestore();
         |                 ^
      47 | });
      48 |
      49 | describe('Events Collection Security Rules', () => {

      at Object.clearFirestore (__tests__/emulator/firestore-events-rules.test.ts:46:17)
      at asyncGeneratorStep (node_modules/@babel/runtime/helpers/asyncToGenerator.js:3:17)
      at _next (node_modules/@babel/runtime/helpers/asyncToGenerator.js:17:9)
      at node_modules/@babel/runtime/helpers/asyncToGenerator.js:22:7
      at Object.<anonymous> (node_modules/@babel/runtime/helpers/asyncToGenerator.js:14:12)

  ● Events Collection Security Rules › Create Access › User CAN create event if they are participant and creator

    TypeError: fetch failed



    Cause:
    connect ECONNREFUSED ::1:8080



  ● Events Collection Security Rules › Create Access › User CAN create event if they are participant and creator

    TypeError: Cannot read properties of undefined (reading 'clearFirestore')

      44 |
      45 | afterEach(async () => {
    > 46 |   await testEnv.clearFirestore();
         |                 ^
      47 | });
      48 |
      49 | describe('Events Collection Security Rules', () => {

      at Object.clearFirestore (__tests__/emulator/firestore-events-rules.test.ts:46:17)
      at asyncGeneratorStep (node_modules/@babel/runtime/helpers/asyncToGenerator.js:3:17)
      at _next (node_modules/@babel/runtime/helpers/asyncToGenerator.js:17:9)
      at node_modules/@babel/runtime/helpers/asyncToGenerator.js:22:7
      at Object.<anonymous> (node_modules/@babel/runtime/helpers/asyncToGenerator.js:14:12)

  ● Events Collection Security Rules › Create Access › User CANNOT create event if they are not in participants

    TypeError: fetch failed



    Cause:
    connect ECONNREFUSED ::1:8080



  ● Events Collection Security Rules › Create Access › User CANNOT create event if they are not in participants

    TypeError: Cannot read properties of undefined (reading 'clearFirestore')

      44 |
      45 | afterEach(async () => {
    > 46 |   await testEnv.clearFirestore();
         |                 ^
      47 | });
      48 |
      49 | describe('Events Collection Security Rules', () => {

      at Object.clearFirestore (__tests__/emulator/firestore-events-rules.test.ts:46:17)
      at asyncGeneratorStep (node_modules/@babel/runtime/helpers/asyncToGenerator.js:3:17)
      at _next (node_modules/@babel/runtime/helpers/asyncToGenerator.js:17:9)
      at node_modules/@babel/runtime/helpers/asyncToGenerator.js:22:7
      at Object.<anonymous> (node_modules/@babel/runtime/helpers/asyncToGenerator.js:14:12)

  ● Events Collection Security Rules › Create Access › User CANNOT create event if createdBy does not match auth

    TypeError: fetch failed



    Cause:
    connect ECONNREFUSED ::1:8080



  ● Events Collection Security Rules › Create Access › User CANNOT create event if createdBy does not match auth

    TypeError: Cannot read properties of undefined (reading 'clearFirestore')

      44 |
      45 | afterEach(async () => {
    > 46 |   await testEnv.clearFirestore();
         |                 ^
      47 | });
      48 |
      49 | describe('Events Collection Security Rules', () => {

      at Object.clearFirestore (__tests__/emulator/firestore-events-rules.test.ts:46:17)
      at asyncGeneratorStep (node_modules/@babel/runtime/helpers/asyncToGenerator.js:3:17)
      at _next (node_modules/@babel/runtime/helpers/asyncToGenerator.js:17:9)
      at node_modules/@babel/runtime/helpers/asyncToGenerator.js:22:7
      at Object.<anonymous> (node_modules/@babel/runtime/helpers/asyncToGenerator.js:14:12)

  ● Events Collection Security Rules › Update Access › Test 3: Creator CAN update event

    TypeError: fetch failed



    Cause:
    connect ECONNREFUSED ::1:8080



  ● Events Collection Security Rules › Update Access › Test 3: Creator CAN update event

    TypeError: Cannot read properties of undefined (reading 'clearFirestore')

      44 |
      45 | afterEach(async () => {
    > 46 |   await testEnv.clearFirestore();
         |                 ^
      47 | });
      48 |
      49 | describe('Events Collection Security Rules', () => {

      at Object.clearFirestore (__tests__/emulator/firestore-events-rules.test.ts:46:17)
      at asyncGeneratorStep (node_modules/@babel/runtime/helpers/asyncToGenerator.js:3:17)
      at _next (node_modules/@babel/runtime/helpers/asyncToGenerator.js:17:9)
      at node_modules/@babel/runtime/helpers/asyncToGenerator.js:22:7
      at Object.<anonymous> (node_modules/@babel/runtime/helpers/asyncToGenerator.js:14:12)

  ● Events Collection Security Rules › Update Access › Test 4: Non-creator CANNOT update event

    TypeError: fetch failed



    Cause:
    connect ECONNREFUSED ::1:8080



  ● Events Collection Security Rules › Update Access › Test 4: Non-creator CANNOT update event

    TypeError: Cannot read properties of undefined (reading 'clearFirestore')

      44 |
      45 | afterEach(async () => {
    > 46 |   await testEnv.clearFirestore();
         |                 ^
      47 | });
      48 |
      49 | describe('Events Collection Security Rules', () => {

      at Object.clearFirestore (__tests__/emulator/firestore-events-rules.test.ts:46:17)
      at asyncGeneratorStep (node_modules/@babel/runtime/helpers/asyncToGenerator.js:3:17)
      at _next (node_modules/@babel/runtime/helpers/asyncToGenerator.js:17:9)
      at node_modules/@babel/runtime/helpers/asyncToGenerator.js:22:7
      at Object.<anonymous> (node_modules/@babel/runtime/helpers/asyncToGenerator.js:14:12)

  ● Events Collection Security Rules › Delete Access › Creator CAN delete event

    TypeError: fetch failed



    Cause:
    connect ECONNREFUSED ::1:8080



  ● Events Collection Security Rules › Delete Access › Creator CAN delete event

    TypeError: Cannot read properties of undefined (reading 'clearFirestore')

      44 |
      45 | afterEach(async () => {
    > 46 |   await testEnv.clearFirestore();
         |                 ^
      47 | });
      48 |
      49 | describe('Events Collection Security Rules', () => {

      at Object.clearFirestore (__tests__/emulator/firestore-events-rules.test.ts:46:17)
      at asyncGeneratorStep (node_modules/@babel/runtime/helpers/asyncToGenerator.js:3:17)
      at _next (node_modules/@babel/runtime/helpers/asyncToGenerator.js:17:9)
      at node_modules/@babel/runtime/helpers/asyncToGenerator.js:22:7
      at Object.<anonymous> (node_modules/@babel/runtime/helpers/asyncToGenerator.js:14:12)

  ● Events Collection Security Rules › Delete Access › Non-creator CANNOT delete event

    TypeError: fetch failed



    Cause:
    connect ECONNREFUSED ::1:8080



  ● Events Collection Security Rules › Delete Access › Non-creator CANNOT delete event

    TypeError: Cannot read properties of undefined (reading 'clearFirestore')

      44 |
      45 | afterEach(async () => {
    > 46 |   await testEnv.clearFirestore();
         |                 ^
      47 | });
      48 |
      49 | describe('Events Collection Security Rules', () => {

      at Object.clearFirestore (__tests__/emulator/firestore-events-rules.test.ts:46:17)
      at asyncGeneratorStep (node_modules/@babel/runtime/helpers/asyncToGenerator.js:3:17)
      at _next (node_modules/@babel/runtime/helpers/asyncToGenerator.js:17:9)
      at node_modules/@babel/runtime/helpers/asyncToGenerator.js:22:7
      at Object.<anonymous> (node_modules/@babel/runtime/helpers/asyncToGenerator.js:14:12)

  ● Events Collection Security Rules › Cloud Functions Access › Test 5: Cloud Function CAN write event (via admin SDK)

    TypeError: fetch failed



    Cause:
    connect ECONNREFUSED ::1:8080



  ● Events Collection Security Rules › Cloud Functions Access › Test 5: Cloud Function CAN write event (via admin SDK)

    TypeError: Cannot read properties of undefined (reading 'clearFirestore')

      44 |
      45 | afterEach(async () => {
    > 46 |   await testEnv.clearFirestore();
         |                 ^
      47 | });
      48 |
      49 | describe('Events Collection Security Rules', () => {

      at Object.clearFirestore (__tests__/emulator/firestore-events-rules.test.ts:46:17)
      at asyncGeneratorStep (node_modules/@babel/runtime/helpers/asyncToGenerator.js:3:17)
      at _next (node_modules/@babel/runtime/helpers/asyncToGenerator.js:17:9)
      at node_modules/@babel/runtime/helpers/asyncToGenerator.js:22:7
      at Object.<anonymous> (node_modules/@babel/runtime/helpers/asyncToGenerator.js:14:12)


  ● Test suite failed to run

    TypeError: Cannot read properties of undefined (reading 'cleanup')

      40 |
      41 | afterAll(async () => {
    > 42 |   await testEnv.cleanup();
         |                 ^
      43 | });
      44 |
      45 | afterEach(async () => {

      at Object.cleanup (__tests__/emulator/firestore-events-rules.test.ts:42:17)
      at asyncGeneratorStep (node_modules/@babel/runtime/helpers/asyncToGenerator.js:3:17)
      at _next (node_modules/@babel/runtime/helpers/asyncToGenerator.js:17:9)
      at node_modules/@babel/runtime/helpers/asyncToGenerator.js:22:7
      at Object.<anonymous> (node_modules/@babel/runtime/helpers/asyncToGenerator.js:14:12)

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

FAIL __tests__/integration/rag-pipeline.test.ts
  ● Test suite failed to run

    Cannot find module '@babel/runtime/helpers/interopRequireWildcard' from '../functions/src/rag/contextBuilder.ts'

    Require stack:
      /home/runner/work/MessageAI/MessageAI/functions/src/rag/contextBuilder.ts
      __tests__/integration/rag-pipeline.test.ts

    > 1 | /**
        |              ^
      2 |  * RAG Context Builder
      3 |  * 
      4 |  * Retrieves relevant context from vector store for LLM prompts

      at Resolver._throwModNotFoundError (node_modules/jest-resolve/build/resolver.js:427:11)
      at Object.<anonymous> (../functions/src/rag/contextBuilder.ts:1:133)
      at Object.require (__tests__/integration/rag-pipeline.test.ts:11:1)

FAIL __tests__/services/timeParse.test.ts
  ● Time Parse Tool (Unit - No API) › should validate tool is registered

    expect(received).toContain(expected) // indexOf

    Matcher error: received value must not be null nor undefined

    Received has value: undefined

      192 |   it('should validate tool is registered', () => {
      193 |     const { TIMEZONE_REQUIRED_TOOLS } = require('../../src/types/toolTypes');
    > 194 |     expect(TIMEZONE_REQUIRED_TOOLS).toContain('time.parse');
          |                                     ^
      195 |   });
      196 |
      197 |   it('should have timezone validation', () => {

      at Object.toContain (__tests__/services/timeParse.test.ts:194:37)

  ● Time Parse Tool (Unit - No API) › should have timezone validation

    Cannot find module 'date-fns-tz' from '../functions/src/utils/timezoneUtils.ts'

    Require stack:
      /home/runner/work/MessageAI/MessageAI/functions/src/utils/timezoneUtils.ts
      __tests__/services/timeParse.test.ts

       6 |  */
       7 |
    >  8 | import { toZonedTime, fromZonedTime, format } from 'date-fns-tz';
         | ^
       9 | import { addDays } from 'date-fns';
      10 |
      11 | /**

      at Resolver._throwModNotFoundError (node_modules/jest-resolve/build/resolver.js:427:11)
      at Object.require (../functions/src/utils/timezoneUtils.ts:8:1)
      at Object.require (__tests__/services/timeParse.test.ts:198:34)

FAIL __tests__/services/vectorRetriever.test.ts
  ● Console

    console.error
      ❌ Firebase env vars not loaded! Check your .env file.

      1 | // Debug: Check if env vars are loaded
      2 | if (!process.env.EXPO_PUBLIC_FIREBASE_API_KEY) {
    > 3 |   console.error('❌ Firebase env vars not loaded! Check your .env file.');
        |           ^
      4 |   console.log('Expected: EXPO_PUBLIC_FIREBASE_API_KEY');
      5 | }
      6 |

      at Object.error (src/lib/firebaseConfig.ts:3:11)
      at Object.require (src/lib/firebase.ts:6:1)
      at Object.require (src/services/vector/firebaseRetriever.ts:31:1)
      at Object.require (src/services/ai/ragService.ts:17:1)
      at Object.require (__tests__/services/vectorRetriever.test.ts:185:38)

    console.log
      Expected: EXPO_PUBLIC_FIREBASE_API_KEY

      at Object.log (src/lib/firebaseConfig.ts:4:11)

  ● VectorRetriever Interface › MockVectorRetriever › should search documents with simple matching

    expect(received).toBe(expected) // Object.is equality

    Expected: 2
    Received: 3

      73 |       const results = await retriever.search({ query: 'math' });
      74 |       
    > 75 |       expect(results.length).toBe(2);
         |                              ^
      76 |       expect(results[0].content).toContain('Math');
      77 |     });
      78 |

      at Object.toBe (__tests__/services/vectorRetriever.test.ts:75:30)
      at asyncGeneratorStep (node_modules/@babel/runtime/helpers/asyncToGenerator.js:3:17)
      at _next (node_modules/@babel/runtime/helpers/asyncToGenerator.js:17:9)

  ● VectorRetriever Interface › Retriever Abstraction › should allow env-based retriever swap

    FirebaseError: Firebase: Error (auth/invalid-api-key).

      14 | // and use initializeAuth with getReactNativePersistence. 
      15 | // For MVP, memory persistence is acceptable (users log in once per session).
    > 16 | export const auth = getAuth(app);
         |                            ^
      17 |
      18 | // Use getFirestore for React Native compatibility
      19 | // Note: Firestore automatically enables offline persistence in React Native

      at apply (node_modules/@firebase/auth/src/core/util/assert.ts:152:44)
      at apply (node_modules/@firebase/auth/src/core/util/assert.ts:177:30)
      at Component._assert [as instanceFactory] (node_modules/@firebase/auth/src/core/auth/register.ts:72:9)
      at Provider.instanceFactory [as getOrInitializeService] (node_modules/@firebase/component/src/provider.ts:318:33)
      at Provider.getOrInitializeService [as initialize] (node_modules/@firebase/component/src/provider.ts:242:27)
      at initialize (node_modules/@firebase/auth/src/core/auth/initialize.ts:66:25)
      at initializeAuth (node_modules/@firebase/auth/src/platform_node/index.ts:45:16)
      at Object.<anonymous> (src/lib/firebase.ts:16:28)
      at Object.require (src/services/vector/firebaseRetriever.ts:31:1)
      at Object.require (src/services/ai/ragService.ts:17:1)
      at Object.require (__tests__/services/vectorRetriever.test.ts:185:38)

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

Test Suites: 5 failed, 2 skipped, 12 passed, 17 of 19 total
Tests:       15 failed, 20 skipped, 81 passed, 116 total
Snapshots:   0 total
Time:        16.905 s
Ran all test suites.
 ELIFECYCLE  Test failed. See above for more details.
Error: Process completed with exit code 1.