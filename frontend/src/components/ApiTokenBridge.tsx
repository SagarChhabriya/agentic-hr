import { useEffect } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { setApiTokenGetter } from '../services/api';

/**
 * Bridges Clerk's getToken to the API client so requests include the auth token.
 * Must be rendered inside ClerkProvider.
 */
export default function ApiTokenBridge({ children }: { children: React.ReactNode }) {
  const { getToken, isSignedIn } = useAuth();

  useEffect(() => {
    if (isSignedIn && getToken) {
      setApiTokenGetter(() => getToken);
    } else {
      setApiTokenGetter(() => Promise.resolve(null));
    }
  }, [getToken, isSignedIn]);

  return <>{children}</>;
}
