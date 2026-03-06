import { useEffect, useRef } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { useQueryClient } from '@tanstack/react-query';
import { setApiTokenGetter } from '../services/api';

/**
 * Bridges Clerk's getToken to the API client so requests include the auth token.
 * Clears React Query cache on sign-out so the next user doesn't see previous user's cached data.
 * Must be rendered inside ClerkProvider.
 */
export default function ApiTokenBridge({ children }: { children: React.ReactNode }) {
  const { getToken, isSignedIn } = useAuth();
  const queryClient = useQueryClient();
  const wasSignedIn = useRef(isSignedIn);

  useEffect(() => {
    if (isSignedIn && getToken) {
      setApiTokenGetter(() => getToken());
      wasSignedIn.current = true;
    } else {
      setApiTokenGetter(() => Promise.resolve(null));
      if (wasSignedIn.current) {
        queryClient.clear();
        wasSignedIn.current = false;
      }
    }
  }, [getToken, isSignedIn, queryClient]);

  return <>{children}</>;
}
