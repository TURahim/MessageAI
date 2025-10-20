import React from "react";
import { render, fireEvent, waitFor } from "@testing-library/react-native";
import ChatRoomScreen from "./ChatRoomScreen";
import * as messageService from "../../lib/messageService";

// Mock the message service
jest.mock("../../lib/messageService");
jest.mock("../../lib/firebase", () => ({
  auth: { currentUser: { uid: "test-user-123" } },
  db: {},
}));
jest.mock("../../utils/messageId", () => ({
  newMessageId: jest.fn(() => "test-message-id-123"),
}));

describe("ChatRoomScreen - Optimistic Send", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock subscribeToMessages to return an unsubscribe function
    (messageService.subscribeToMessages as jest.Mock).mockReturnValue(() => {});
    
    // Mock sendMessage to resolve successfully
    (messageService.sendMessage as jest.Mock).mockResolvedValue(undefined);
  });

  it("should show message immediately (optimistic) and update to sent after Firestore write", async () => {
    const { getByPlaceholderText, getByText, queryByText } = render(
      <ChatRoomScreen />
    );

    const input = getByPlaceholderText("Type a message");
    const sendButton = getByText("Send");

    // Type a message
    fireEvent.changeText(input, "Hello, World!");

    // Send the message
    fireEvent.press(sendButton);

    // Message should appear immediately with "sending" state (optimistic)
    await waitFor(() => {
      expect(queryByText(/sending/i)).toBeTruthy();
    });

    // Verify message text is displayed
    expect(queryByText("Hello, World!")).toBeTruthy();

    // Wait for the state to flip to "sent" after Firestore write
    await waitFor(
      () => {
        expect(queryByText(/sent/i)).toBeTruthy();
      },
      { timeout: 2000 }
    );

    // Verify sendMessage was called
    expect(messageService.sendMessage).toHaveBeenCalledWith(
      "demo-conversation-1",
      expect.objectContaining({
        text: "Hello, World!",
        state: "sending",
        senderId: "test-user-123",
      })
    );
  });

  it("should clear input after sending", async () => {
    const { getByPlaceholderText, getByText } = render(<ChatRoomScreen />);

    const input = getByPlaceholderText("Type a message");
    const sendButton = getByText("Send");

    fireEvent.changeText(input, "Test message");
    fireEvent.press(sendButton);

    // Input should be cleared
    await waitFor(() => {
      expect(input.props.value).toBe("");
    });
  });

  it("should not send empty messages", () => {
    const { getByText } = render(<ChatRoomScreen />);
    const sendButton = getByText("Send");

    // Button should be disabled when input is empty
    expect(sendButton.props.disabled).toBe(true);
    
    // Pressing shouldn't call sendMessage
    fireEvent.press(sendButton);
    expect(messageService.sendMessage).not.toHaveBeenCalled();
  });

  it("should unsubscribe on unmount", () => {
    const mockUnsubscribe = jest.fn();
    (messageService.subscribeToMessages as jest.Mock).mockReturnValue(
      mockUnsubscribe
    );

    const { unmount } = render(<ChatRoomScreen />);

    // Unmount the component
    unmount();

    // Verify unsubscribe was called
    expect(mockUnsubscribe).toHaveBeenCalled();
  });
});

