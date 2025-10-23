import { useState, useEffect } from 'react';
import { Message } from '@/types/index';
import { StatusVariant } from '@/components/StatusChip';

interface ThreadStatus {
  hasActiveInvite: boolean;
  status: StatusVariant | null;
  eventTitle: string | null;
}

/**
 * Hook to derive RSVP/confirmation state for a conversation thread
 * Scans recent messages for events and determines the overall thread status
 * 
 * @param messages - Array of messages in the conversation
 * @param currentUserId - Current user's ID to check their RSVP response
 * @returns ThreadStatus with invite state and status
 */
export function useThreadStatus(messages: Message[], currentUserId: string): ThreadStatus {
  const [status, setStatus] = useState<ThreadStatus>({
    hasActiveInvite: false,
    status: null,
    eventTitle: null,
  });

  useEffect(() => {
    // Find the most recent message with an event or RSVP
    const recentEventMessage = messages
      .filter((msg) => msg.meta?.event || msg.meta?.rsvp)
      .sort((a, b) => {
        const aTime = (a.serverTimestamp || a.clientTimestamp).toMillis();
        const bTime = (b.serverTimestamp || b.clientTimestamp).toMillis();
        return bTime - aTime; // Most recent first
      })[0];

    if (!recentEventMessage) {
      setStatus({
        hasActiveInvite: false,
        status: null,
        eventTitle: null,
      });
      return;
    }

    // Check if there's an event with a status
    if (recentEventMessage.meta?.event) {
      const event = recentEventMessage.meta.event;
      
      // If event has explicit status, use it
      if (event.status) {
        setStatus({
          hasActiveInvite: true,
          status: event.status,
          eventTitle: event.title,
        });
        return;
      }
    }

    // Check RSVP responses
    if (recentEventMessage.meta?.rsvp) {
      const rsvp = recentEventMessage.meta.rsvp;
      const userResponse = rsvp.responses?.[currentUserId];

      if (userResponse === 'accepted') {
        setStatus({
          hasActiveInvite: true,
          status: 'confirmed',
          eventTitle: recentEventMessage.meta.event?.title || 'Session',
        });
      } else if (userResponse === 'declined') {
        setStatus({
          hasActiveInvite: true,
          status: 'declined',
          eventTitle: recentEventMessage.meta.event?.title || 'Session',
        });
      } else {
        // No response yet - pending
        setStatus({
          hasActiveInvite: true,
          status: 'pending',
          eventTitle: recentEventMessage.meta.event?.title || 'Session',
        });
      }
      return;
    }

    // Check for conflicts
    if (recentEventMessage.meta?.conflict) {
      setStatus({
        hasActiveInvite: true,
        status: 'conflict',
        eventTitle: recentEventMessage.meta.event?.title || 'Session',
      });
      return;
    }

    // Default: no active invite
    setStatus({
      hasActiveInvite: false,
      status: null,
      eventTitle: null,
    });
  }, [messages, currentUserId]);

  return status;
}

