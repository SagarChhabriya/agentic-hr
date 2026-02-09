import { Navigate } from 'react-router-dom';
import { useAuth, useUser } from '@clerk/clerk-react';

interface RoleProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles: string[];
}

export default function RoleProtectedRoute({ children, allowedRoles }: RoleProtectedRouteProps) {
  const { isLoaded, isSignedIn } = useAuth();
  const { user } = useUser();

  if (!isLoaded) {
    return <div className="flex justify-center items-center min-h-screen">Loading...</div>;
  }

  if (!isSignedIn) {
    return <Navigate to="/login" replace />;
  }

  // Check both publicMetadata and unsafeMetadata for role
  const userRole = (user?.publicMetadata?.role || user?.unsafeMetadata?.role) as string;
  
  // If role is not set but user is signed in, allow access (role might be set later)
  // This is a temporary measure until Clerk metadata is properly synced
  if (!userRole) {
    // Allow access if no role is set (user might have just signed up)
    // In production, you might want to be more strict here
    return <>{children}</>;
  }
  
  if (!allowedRoles.includes(userRole)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
