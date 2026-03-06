import { SignIn } from '@clerk/clerk-react';
import { useTheme } from '../contexts/ThemeContext';
import { useLocation } from 'react-router-dom';

export default function LoginForm() {
  const { theme } = useTheme();
  const location = useLocation();
  
  // Don't show custom wrapper on Clerk's internal pages (like factor-one)
  const isClerkInternalPage = location.pathname.includes('/factor-one') || 
                               location.pathname.includes('/verify') ||
                               location.pathname !== '/login';

  return (
    <div className="flex items-center justify-center py-12 min-h-[calc(100vh-4rem)]">
      <div className="w-full max-w-md">
        {!isClerkInternalPage && (
          <div className="mb-6 text-center">
            <h1 className="text-2xl font-bold mb-2">Sign In</h1>
            <p className="text-sm opacity-75">
              Access your dashboard to manage jobs, assessments, and interviews
            </p>
          </div>
        )}
        <SignIn
          appearance={{
            baseTheme: theme === 'dark' ? 'dark' : 'light',
            elements: {
              rootBox: 'mx-auto',
              card: 'shadow-lg',
            },
          }}
          routing="path"
          path="/login"
          signUpUrl="/register"
          afterSignInUrl={location.state?.from || "/dashboard"}
        />
      </div>
    </div>
  );
}

