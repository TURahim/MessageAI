import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import EmptyState from '../EmptyState';

describe('EmptyState', () => {
  it('should render title', () => {
    const { getByText } = render(
      <EmptyState title="No messages" />
    );
    expect(getByText('No messages')).toBeTruthy();
  });

  it('should render default icon', () => {
    const { getByText } = render(
      <EmptyState title="Empty" />
    );
    expect(getByText('📭')).toBeTruthy();
  });

  it('should render custom icon', () => {
    const { getByText } = render(
      <EmptyState title="Empty" icon="🚀" />
    );
    expect(getByText('🚀')).toBeTruthy();
  });

  it('should render subtitle when provided', () => {
    const { getByText } = render(
      <EmptyState 
        title="No conversations" 
        subtitle="Start a new chat to get going" 
      />
    );
    expect(getByText('Start a new chat to get going')).toBeTruthy();
  });

  it('should not render subtitle when not provided', () => {
    const { queryByText } = render(
      <EmptyState title="Empty" />
    );
    // Should only have title, no extra text
    expect(queryByText(/Start/i)).toBeNull();
  });

  it('should render action button when provided', () => {
    const mockAction = jest.fn();
    const { getByText } = render(
      <EmptyState 
        title="Empty" 
        actionLabel="Create New" 
        onAction={mockAction} 
      />
    );
    expect(getByText('Create New')).toBeTruthy();
  });

  it('should not render action button when actionLabel not provided', () => {
    const mockAction = jest.fn();
    const { queryByTestId } = render(
      <EmptyState title="Empty" onAction={mockAction} />
    );
    expect(queryByTestId('empty-state-action')).toBeNull();
  });

  it('should not render action button when onAction not provided', () => {
    const { queryByTestId } = render(
      <EmptyState title="Empty" actionLabel="Create" />
    );
    expect(queryByTestId('empty-state-action')).toBeNull();
  });

  it('should call onAction when button pressed', () => {
    const mockAction = jest.fn();
    const { getByTestId } = render(
      <EmptyState 
        title="Empty" 
        actionLabel="Create New" 
        onAction={mockAction} 
      />
    );
    
    fireEvent.press(getByTestId('empty-state-action'));
    expect(mockAction).toHaveBeenCalledTimes(1);
  });

  it('should render complete empty state with all props', () => {
    const mockAction = jest.fn();
    const { getByText } = render(
      <EmptyState 
        icon="💬"
        title="No Conversations"
        subtitle="Start chatting with someone"
        actionLabel="Start Chat"
        onAction={mockAction}
      />
    );
    
    expect(getByText('💬')).toBeTruthy();
    expect(getByText('No Conversations')).toBeTruthy();
    expect(getByText('Start chatting with someone')).toBeTruthy();
    expect(getByText('Start Chat')).toBeTruthy();
  });
});

