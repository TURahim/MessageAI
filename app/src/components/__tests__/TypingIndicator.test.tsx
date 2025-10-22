import React from 'react';
import { render } from '@testing-library/react-native';
import TypingIndicator from '../TypingIndicator';

// Mock Firebase
jest.mock('@/lib/firebase', () => ({
  db: {},
  auth: {},
}));

// Mock the typing service
jest.mock('@/services/typingService', () => ({
  subscribeToTyping: jest.fn((conversationId, currentUserId, onUpdate) => {
    // Immediately call with empty array (no one typing)
    onUpdate([]);
    // Return mock unsubscribe function
    return jest.fn();
  }),
}));

// Mock Firestore
jest.mock('firebase/firestore', () => ({
  doc: jest.fn(),
  getDoc: jest.fn(() => Promise.resolve({
    exists: () => true,
    data: () => ({ displayName: 'Test User' })
  })),
}));

describe('TypingIndicator', () => {
  it('should not render when no one is typing', () => {
    const { queryByText } = render(
      <TypingIndicator conversationId="conv123" currentUserId="user1" />
    );
    
    expect(queryByText(/typing/i)).toBeNull();
  });

  it('should render typing text when someone is typing', async () => {
    const { subscribeToTyping } = require('@/services/typingService');
    
    // Mock to return typing users
    subscribeToTyping.mockImplementation((conversationId: string, currentUserId: string, onUpdate: (users: string[]) => void) => {
      onUpdate(['user2']); // user2 is typing
      return jest.fn();
    });

    const { findByText } = render(
      <TypingIndicator conversationId="conv123" currentUserId="user1" />
    );
    
    // Wait for the component to fetch user name and render
    const typingText = await findByText(/typing/i);
    expect(typingText).toBeTruthy();
  });
});

