import { SignUp } from '@clerk/clerk-react';
import { useTheme } from '../contexts/ThemeContext';
import { useLocation } from 'react-router-dom';

export default function SignupAdminPage() {
  const { theme } = useTheme();
  const location = useLocation();
  
  const isVerificationPage = location.pathname.includes('verify');

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
          afterSignUpUrl="/admin/dashboard"
          unsafeMetadata={{
            role: 'ADMIN',
          }}
        />
      </div>
    </div>
  );
}
