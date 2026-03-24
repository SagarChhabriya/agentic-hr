import { Link, useLocation } from 'react-router-dom';
import { useAuth, useUser, UserButton, SignedIn, SignedOut, SignInButton } from '@clerk/clerk-react';
import { useTheme } from '../contexts/ThemeContext';

const CANDIDATE_NAV = [
  { to: '/candidate/dashboard', label: 'Dashboard' },
  { to: '/jobs', label: 'Browse Jobs' },
  { to: '/candidate/applications', label: 'My Applications' },
  { to: '/candidate/interview-guide', label: 'Interview Guide' },
  { to: '/candidate/profile', label: 'Profile' },
];

export default function Header() {
  const { isSignedIn, isLoaded } = useAuth();
  const { user } = useUser();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const isDark = theme === 'dark';

  const userRole = user?.publicMetadata?.role || user?.unsafeMetadata?.role;
  const isCandidate = userRole === 'CANDIDATE';
  const showPublicNav = isLoaded && !isSignedIn;
  const showCandidateNav = isLoaded && isSignedIn && isCandidate;

  const isActive = (path) =>
    path === '/candidate/dashboard' || path === '/'
      ? location.pathname === path
      : location.pathname.startsWith(path);

  return (
    <nav className={`sticky top-0 z-40 ${
      isDark
        ? 'bg-slate-900/95 border-b border-slate-800 backdrop-blur-md'
        : 'bg-white/95 border-b border-gray-200 backdrop-blur-md shadow-sm'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* Logo */}
          <div className="flex items-center gap-8">
            <Link to="/" className="flex items-center gap-2.5 shrink-0">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-md">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5}
                    d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <span className={`text-lg font-bold tracking-tight ${isDark ? 'text-slate-100' : 'text-gray-900'}`}>
                Hirebase
              </span>
            </Link>

            {/* Candidate nav */}
            {showCandidateNav && (
              <div className="hidden md:flex items-center gap-1">
                {CANDIDATE_NAV.map((item) => (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      isActive(item.to)
                        ? isDark
                          ? 'bg-indigo-500/15 text-indigo-400'
                          : 'bg-indigo-50 text-indigo-700'
                        : isDark
                          ? 'text-slate-400 hover:text-slate-100 hover:bg-slate-800'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            )}

            {/* Public nav */}
            {showPublicNav && (
              <div className="hidden md:flex items-center gap-1">
                {[
                  { href: '/', label: 'Home' },
                  { href: '#features', label: 'Features' },
                  { href: '#pricing', label: 'Pricing' },
                  { href: '/jobs', label: 'Jobs' },
                ].map((item) => (
                  <a
                    key={item.href}
                    href={item.href}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      isDark
                        ? 'text-slate-400 hover:text-slate-100 hover:bg-slate-800'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                  >
                    {item.label}
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* Right side */}
          <div className="flex items-center gap-2">
            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              className={`p-2 rounded-lg transition-colors ${
                isDark
                  ? 'text-slate-400 hover:text-slate-100 hover:bg-slate-800'
                  : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
              }`}
              aria-label="Toggle theme"
            >
              {isDark ? (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              )}
            </button>

            <SignedIn>
              {isCandidate && (
                <span className={`hidden sm:inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                  isDark ? 'bg-emerald-900/40 text-emerald-300' : 'bg-emerald-50 text-emerald-700'
                }`}>
                  Candidate
                </span>
              )}
              <UserButton afterSignOutUrl="/" />
            </SignedIn>

            <SignedOut>
              <Link
                to="/login"
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  isDark
                    ? 'text-slate-300 hover:bg-slate-800'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                Log in
              </Link>
              <Link
                to="/register"
                className="px-4 py-1.5 rounded-lg text-sm font-medium bg-gradient-to-r from-indigo-500 to-violet-600 text-white hover:opacity-90 transition-opacity shadow-sm"
              >
                Get started
              </Link>
            </SignedOut>
          </div>
        </div>
      </div>
    </nav>
  );
}
