System / Goal:
We’ve scaffolded the MessageAI app through Step G (navigation + placeholder screens).
Now, please implement Step H: Real-Time Firestore Messaging — connecting our optimistic local chat UI to Firestore for persistent, multi-device chat sync.

🧩 Context

Framework: Expo + React Native + Firebase

Backend: Firestore + Firebase Auth (anonymous) already initialized in src/lib/firebase.ts

Message type lives in src/types/message.ts

Local optimistic send UI already works in ChatRoomScreen.tsx

Firestore security rules already defined (firestore.rules)

🧱 Objectives (Cursor should implement)
1️⃣ Firestore Data Structure

Use this structure:

/conversations/{cid}/messages/{mid}


Each message document:

{
  mid: string;            // client-generated ID
  senderId: string;
  text: string;
  clientTs: number;       // Date.now()
  serverTs?: Timestamp;   // set by Firestore
  state: "sending"|"sent"|"delivered"|"read";
  readBy?: string[];
}

2️⃣ Modify ChatRoomScreen.tsx

Implement the following logic:

Optimistic send
When user taps “Send”:

Create message locally with state:"sending".

Immediately show in FlatList.

Write message to Firestore with same mid idempotently.

On success, update local message → state:"sent" and set serverTs.

Real-time listener

Subscribe to onSnapshot for messages under the current conversation (cid).

Order by serverTs descending.

Update the local messages state when new data arrives.

Use unsubscribe() cleanup on unmount.

Offline support

Enable Firestore offline persistence (see below).

Messages queued while offline auto-send when back online.

3️⃣ Firestore Persistence Setup

In src/lib/firebase.ts, enable local persistence (do this once globally):

import { initializeFirestore, persistentLocalCache, persistentSingleTabManager } from "firebase/firestore";
...
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentSingleTabManager() }),
});

4️⃣ Delivery & Read State Updates

Add a helper updateMessageState(cid, mid, newState) in a new file
src/lib/messageService.ts that updates the message’s state field.

When a user opens a chat, mark all messages not sent by them as read.

5️⃣ Cleanup

Ensure all onSnapshot subscriptions unsubscribe on unmount.

Handle errors gracefully (console.warn + UI fallback).

Add a single React Testing Library test confirming:

A new message appears immediately (optimistic).

State flips to “sent” after Firestore write resolves.

✅ Acceptance Criteria

Two simulators can chat in real time via Firestore.

Messages persist on reload.

Offline messages sync correctly on reconnect.

No duplicate messages on retries.

Test passes confirming optimistic UI behavior.

✅ Optional post-H cleanup (Cursor can handle)

After messages sync properly, Cursor can also:

Add a lightweight useMessages hook wrapping the Firestore listener.

Add a tiny messageService.test.ts using @firebase/rules-unit-testing.

Refactor ChatRoomScreen state management for clarity.