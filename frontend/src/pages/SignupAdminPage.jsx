import { Link, useLocation } from 'react-router-dom';
import { SignUp } from '@clerk/clerk-react';
import { useTheme } from '../contexts/ThemeContext';

const adminSignupEnabled = import.meta.env.VITE_ENABLE_ADMIN_SIGNUP === 'true';

export default function SignupAdminPage() {
  const { theme } = useTheme();
  const location = useLocation();

  const isVerificationPage = location.pathname.includes('verify');

  if (!adminSignupEnabled) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md text-center">
          <h1 className="text-2xl font-bold mb-2">Admin access</h1>
          <p className="text-sm opacity-75 mb-6">
            Platform admin accounts are not self-serve. The owner provisions admin access directly (for example via Clerk or your identity provider).
          </p>
          <Link to="/register" className="text-blue-600 dark:text-blue-400 hover:underline text-sm font-medium">
            ← Back to role selection
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        {!isVerificationPage && (
          <div className="mb-6 text-center">
            <h1 className="text-2xl font-bold mb-2">Sign Up as Admin</h1>
            <p className="text-sm opacity-75">
              Create an admin account to manage the platform and system settings
            </p>
          </div>
        )}
        <SignUp
          appearance={{
            baseTheme: theme === 'dark' ? 'dark' : 'light',
            elements: {
              rootBox: 'mx-auto',
              card: 'shadow-lg',
            },
          }}
          routing="path"
          path="/register/admin"
          signInUrl="/login"
          afterSignUpUrl="/recruiter/dashboard"
          unsafeMetadata={{
            role: 'ADMIN',
          }}
        />
      </div>
    </div>
  );
}
