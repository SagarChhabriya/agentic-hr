import { Navigate } from 'react-router-dom';
import { useAuth, useUser } from '@clerk/clerk-react';
import RecruiterHomeRedirect from './RecruiterHomeRedirect';

export default function DashboardPage() {
  const { isLoaded } = useAuth();
  const { user } = useUser();

  if (!isLoaded) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  const rawRole = user?.publicMetadata?.role || user?.unsafeMetadata?.role;
  const userRole = String(rawRole || '').trim().toUpperCase();

  if (userRole === 'ADMIN') {
    return <Navigate to="/recruiter/dashboard" replace />;
  }
  if (userRole === 'RECRUITER') {
    return <RecruiterHomeRedirect />;
  }
  if (userRole === 'CANDIDATE') {
    return <Navigate to="/candidate/dashboard" replace />;
  }

  // Fallback for users without role set - try to redirect to recruiter dashboard as default
  // This allows users who signed up as recruiter but role isn't set yet to still access features
  return (
    <div className="px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Dashboard</h1>
        <div className="bg-white dark:bg-slate-800 shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">
            Welcome, {user?.firstName || user?.fullName || user?.primaryEmailAddress?.emailAddress}!
          </h2>
          <p className="text-gray-600 dark:text-slate-300 mb-4">
            Role: {userRole || 'Not set'}
          </p>
          <div className="flex flex-wrap gap-4 mt-6">
            <a
              href="/recruiter/company"
              className="px-6 py-3 rounded-lg font-medium bg-blue-600 hover:bg-blue-700 text-white transition-colors"
            >
              Set up company profile
            </a>
          </div>
          <p className="text-gray-600 dark:text-slate-300 mt-4 text-sm">
            Recruiters must create a company profile before posting jobs. If your role is not set yet,
            complete company setup and your role will sync when you sign in again.
          </p>
        </div>
      </div>
    </div>
  );
}
