RUN TEST ERRORS:
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


Cache errors:
Run actions/setup-node@v4
Found in cache @ /opt/hostedtoolcache/node/20.19.5/x64
Environment details
/opt/hostedtoolcache/node/20.19.5/x64/bin/npm config get cache
/home/runner/.npm
Error: Some specified paths were not resolved, unable to cache dependencies.