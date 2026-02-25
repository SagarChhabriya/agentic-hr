import { Link } from 'react-router-dom';
import { useAuth, UserButton, SignedIn, SignedOut, SignInButton, SignUpButton } from '@clerk/clerk-react';
import { useTheme } from '../contexts/ThemeContext';

export default function Header() {
  const { isSignedIn, isLoaded, user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  // Check both publicMetadata and unsafeMetadata for role
  const userRole = user?.publicMetadata?.role || user?.unsafeMetadata?.role;
  
  // Only show public nav if auth is loaded AND user is not signed in
  const showPublicNav = isLoaded && !isSignedIn;
  const showAuthNav = isLoaded && isSignedIn;

  const getRoleDashboardLink = () => {
    if (userRole === 'RECRUITER' || userRole === 'ADMIN') {
      return '/recruiter/dashboard';
    } else if (userRole === 'CANDIDATE') {
      return '/candidate/dashboard';
    }
    return '/dashboard';
  };

  const getRoleNavLinks = () => {
    if (userRole === 'RECRUITER' || userRole === 'ADMIN') {
      return (
        <>
          <Link to="/recruiter/dashboard" className="hover:text-blue-600">
            Dashboard
          </Link>
          <Link to="/recruiter/jobs" className="hover:text-blue-600">
            Jobs
          </Link>
          <Link to="/recruiter/candidates" className="hover:text-blue-600">
            Candidates
          </Link>
          <Link to="/recruiter/assessments" className="hover:text-blue-600">
            Assessments
          </Link>
          <Link to="/recruiter/questions" className="hover:text-blue-600">
            Questions
          </Link>
        </>
      );
    } else if (userRole === 'CANDIDATE') {
      return (
        <>
          <Link to="/candidate/dashboard" className="hover:text-blue-600">
            Dashboard
          </Link>
          <Link to="/jobs" className="hover:text-blue-600">
            Browse Jobs
          </Link>
          <Link to="/candidate/applications" className="hover:text-blue-600">
            My Applications
          </Link>
          <Link to="/candidate/profile" className="hover:text-blue-600">
            Profile
          </Link>
        </>
      );
    }
    return null;
  };

  return (
    <nav
      className={`sticky top-0 z-50 backdrop-blur-sm ${
        theme === 'dark'
          ? 'bg-slate-900/95 border-b border-slate-800'
          : 'bg-white/95 shadow-sm'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo + main nav */}
          <div className="flex items-center space-x-8">
            <Link
              to="/"
              className="flex items-center text-xl font-extrabold tracking-tight"
            >
              <span className="rounded bg-blue-600 text-white px-2 py-0.5 mr-2 text-sm">
                HR
              </span>
              <span>Agentic</span>
            </Link>
            {showAuthNav ? (
              <div className="hidden md:flex items-center space-x-6 text-sm font-medium">
                {getRoleNavLinks() || (
                  // Show default nav if role not set but user is signed in
                  <>
                    <Link to="/dashboard" className="hover:text-blue-600">
                      Dashboard
                    </Link>
                    <Link to="/recruiter/jobs" className="hover:text-blue-600">
                      Jobs
                    </Link>
                    <Link to="/recruiter/candidates" className="hover:text-blue-600">
                      Candidates
                    </Link>
                  </>
                )}
              </div>
            ) : showPublicNav ? (
              <div className="hidden md:flex items-center space-x-6 text-sm font-medium">
                <a href="/" className="hover:text-blue-600">
                  Home
                </a>
                <a href="#features" className="hover:text-blue-600">
                  Features
                </a>
                <a href="#pricing" className="hover:text-blue-600">
                  Pricing
                </a>
                <a href="#contact" className="hover:text-blue-600">
                  Contact
                </a>
              </div>
            ) : null}
          </div>

          {/* Theme + auth actions */}
          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={toggleTheme}
              className="rounded-full border p-2 transition-colors
                border-gray-300 bg-gray-100 text-gray-800 hover:bg-gray-200
                dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {theme === 'dark' ? (
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
                  />
                </svg>
              ) : (
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
                  />
                </svg>
              )}
            </button>

            {showAuthNav && (
              <>
                <span className={`inline-flex items-center text-xs px-3 py-1.5 rounded-full font-medium whitespace-nowrap ${
                  userRole 
                    ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                    : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                }`}>
                  {userRole 
                    ? (userRole === 'RECRUITER' ? 'Recruiter' : userRole === 'ADMIN' ? 'Admin' : userRole === 'CANDIDATE' ? 'Candidate' : userRole)
                    : 'Role Not Set'
                  }
                </span>
                <Link to={getRoleDashboardLink()} className="text-xs sm:text-sm hover:underline hidden sm:inline">
                  Dashboard
                </Link>
                <span className="hidden lg:inline text-xs opacity-80">
                  {user?.primaryEmailAddress?.emailAddress}
                </span>
                <UserButton afterSignOutUrl="/" />
              </>
            )}

            {showPublicNav && (
              <>
                <Link to="/login" className="text-xs sm:text-sm hover:underline">
                  Login
                </Link>
                <Link
                  to="/register"
                  className="bg-blue-600 text-white px-3 py-1.5 rounded-md text-xs sm:text-sm hover:bg-blue-700"
                >
                  Sign up
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}

