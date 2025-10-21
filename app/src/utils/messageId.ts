import { v4 as uuid } from "uuid";
import * as Crypto from 'expo-crypto';

// Polyfill crypto.getRandomValues for React Native
if (typeof crypto === 'undefined') {
  // @ts-ignore - Polyfill for React Native
  global.crypto = {
    // @ts-ignore
    getRandomValues: <T extends ArrayBufferView>(array: T): T => {
      const randomBytes = Crypto.getRandomBytes(array.byteLength);
      // @ts-ignore
      array.set(randomBytes);
      return array;
    },
  };
}

export const newMessageId = () => uuid();
export default newMessageId;
