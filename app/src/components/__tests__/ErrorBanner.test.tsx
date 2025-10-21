import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import ErrorBanner from '../ErrorBanner';

describe('ErrorBanner', () => {
  it('should render error message', () => {
    const { getByText } = render(
      <ErrorBanner message="Something went wrong" />
    );
    expect(getByText('Something went wrong')).toBeTruthy();
  });

  it('should render with error type by default', () => {
    const { getByText } = render(
      <ErrorBanner message="Error occurred" />
    );
    expect(getByText('⚠️')).toBeTruthy();
  });

  it('should render warning icon for warning type', () => {
    const { getByText } = render(
      <ErrorBanner message="Warning message" type="warning" />
    );
    expect(getByText('⚡')).toBeTruthy();
  });

  it('should render info icon for info type', () => {
    const { getByText } = render(
      <ErrorBanner message="Info message" type="info" />
    );
    expect(getByText('ℹ️')).toBeTruthy();
  });

  it('should show retry button when onRetry provided', () => {
    const mockRetry = jest.fn();
    const { getByText } = render(
      <ErrorBanner message="Error" onRetry={mockRetry} />
    );
    
    expect(getByText(/retry/i)).toBeTruthy();
  });

  it('should not show retry button when onRetry not provided', () => {
    const { queryByText } = render(
      <ErrorBanner message="Error" />
    );
    
    expect(queryByText(/retry/i)).toBeNull();
  });

  it('should call onRetry when retry button pressed', () => {
    const mockRetry = jest.fn();
    const { getByTestId } = render(
      <ErrorBanner message="Error" onRetry={mockRetry} />
    );
    
    fireEvent.press(getByTestId('retry-button'));
    expect(mockRetry).toHaveBeenCalledTimes(1);
  });

  it('should show dismiss button when onDismiss provided', () => {
    const mockDismiss = jest.fn();
    const { getByText } = render(
      <ErrorBanner message="Error" onDismiss={mockDismiss} />
    );
    
    expect(getByText('✕')).toBeTruthy();
  });

  it('should call onDismiss when dismiss button pressed', () => {
    const mockDismiss = jest.fn();
    const { getByTestId } = render(
      <ErrorBanner message="Error" onDismiss={mockDismiss} />
    );
    
    fireEvent.press(getByTestId('dismiss-button'));
    expect(mockDismiss).toHaveBeenCalledTimes(1);
  });

  it('should show both retry and dismiss buttons when both provided', () => {
    const mockRetry = jest.fn();
    const mockDismiss = jest.fn();
    const { getByTestId } = render(
      <ErrorBanner 
        message="Error" 
        onRetry={mockRetry} 
        onDismiss={mockDismiss} 
      />
    );
    
    expect(getByTestId('retry-button')).toBeTruthy();
    expect(getByTestId('dismiss-button')).toBeTruthy();
  });
});

