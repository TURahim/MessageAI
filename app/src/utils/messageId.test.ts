// Mock expo-crypto before importing messageId
jest.mock('expo-crypto', () => ({
  getRandomBytes: jest.fn((length: number) => {
    const array = new Uint8Array(length);
    for (let i = 0; i < length; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }
    return array;
  }),
}));

import newMessageId from "./messageId";

describe('messageId', () => {
  it('should generate unique message IDs', () => {
    const a = newMessageId();
    const b = newMessageId();
    expect(a).not.toBe(b);
  });

  it('should generate valid UUID v4 format', () => {
    const id = newMessageId();
    const uuidv4Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    expect(id).toMatch(uuidv4Regex);
  });

  it('should generate 100 unique IDs', () => {
    const ids = new Set([...Array(100)].map(() => newMessageId()));
    expect(ids.size).toBe(100);
  });
});
