import React from 'react';
import { render } from '@testing-library/react-native';
import ConnectionBanner from '../ConnectionBanner';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';

// Mock the useNetworkStatus hook
jest.mock('@/hooks/useNetworkStatus');

const mockUseNetworkStatus = useNetworkStatus as jest.MockedFunction<typeof useNetworkStatus>;

describe('ConnectionBanner', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should not render when online', () => {
    mockUseNetworkStatus.mockReturnValue({
      isOnline: true,
      isConnected: true,
      isInternetReachable: true,
    });

    const { queryByTestId } = render(<ConnectionBanner />);
    expect(queryByTestId('offline-banner')).toBeNull();
  });

  it('should render "No internet connection" when not connected', () => {
    mockUseNetworkStatus.mockReturnValue({
      isOnline: false,
      isConnected: false,
      isInternetReachable: false,
    });

    const { getByText } = render(<ConnectionBanner />);
    expect(getByText('📡 No internet connection')).toBeTruthy();
  });

  it('should render "Connected but no internet access" when connected but unreachable', () => {
    mockUseNetworkStatus.mockReturnValue({
      isOnline: false,
      isConnected: true,
      isInternetReachable: false,
    });

    const { getByText } = render(<ConnectionBanner />);
    expect(getByText('📡 Connected but no internet access')).toBeTruthy();
  });

  it('should render "Connection issues" as fallback', () => {
    mockUseNetworkStatus.mockReturnValue({
      isOnline: false,
      isConnected: true,
      isInternetReachable: true,
    });

    const { getByText } = render(<ConnectionBanner />);
    expect(getByText('📡 Connection issues')).toBeTruthy();
  });

  it('should render helper message about queued messages', () => {
    mockUseNetworkStatus.mockReturnValue({
      isOnline: false,
      isConnected: false,
      isInternetReachable: false,
    });

    const { getByText } = render(<ConnectionBanner />);
    expect(getByText('Messages will send when connection is restored')).toBeTruthy();
  });
});

