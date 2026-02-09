import { SignUp } from '@clerk/clerk-react';
import { useTheme } from '../contexts/ThemeContext';
import { useLocation } from 'react-router-dom';

export default function SignupRecruiterPage() {
  const { theme } = useTheme();
  const location = useLocation();
  
  // Don't show custom header on Clerk's verification pages
  const isVerificationPage = location.pathname.includes('verify');

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        {!isVerificationPage && (
          <div className="mb-6 text-center">
            <h1 className="text-2xl font-bold mb-2">Sign Up as Recruiter</h1>
            <p className="text-sm opacity-75">
              Create your account to post jobs, manage candidates, and conduct AI interviews
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
          path="/register/recruiter"
          signInUrl="/login"
          afterSignUpUrl="/recruiter/dashboard"
          unsafeMetadata={{
            role: 'RECRUITER',
          }}
        />
      </div>
    </div>
  );
}
