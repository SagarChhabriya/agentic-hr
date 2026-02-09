import { SignUp } from '@clerk/clerk-react';
import { useTheme } from '../contexts/ThemeContext';

export default function SignupPage() {
  const { theme } = useTheme();

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        <SignUp
          appearance={{
            baseTheme: theme === 'dark' ? 'dark' : 'light',
            elements: {
              rootBox: 'mx-auto',
              card: 'shadow-lg',
            },
          }}
          routing="path"
          path="/register"
          signInUrl="/login"
          afterSignUpUrl="/dashboard"
        />
      </div>
    </div>
  );
}

