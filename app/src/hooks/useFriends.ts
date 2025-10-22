import { useEffect, useState } from 'react';
import { subscribeFriends } from '@/services/friendService';
import { User } from '@/types/index';

/**
 * Hook to get user's friends in real-time
 */
export function useFriends(userId: string | undefined) {
  const [friends, setFriends] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    setLoading(true);

    const unsubscribe = subscribeFriends(
      userId,
      (updatedFriends) => {
        setFriends(updatedFriends);
        setLoading(false);
        setError(null);
      },
      (err) => {
        setError(err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [userId]);

  return { friends, loading, error };
}

