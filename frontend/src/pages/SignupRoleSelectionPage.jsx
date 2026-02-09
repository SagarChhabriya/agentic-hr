import { Link } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';

export default function SignupRoleSelectionPage() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-4xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Choose Your Role</h1>
          <p className="text-sm opacity-75">Select how you want to use the platform</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Candidate Card */}
          <Link
            to="/register/candidate"
            className={`group rounded-xl border p-6 transition-all hover:shadow-lg hover:scale-105 ${
              isDark
                ? 'border-slate-700 bg-slate-800 hover:border-blue-500'
                : 'border-gray-200 bg-white hover:border-blue-500'
            }`}
          >
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 mb-4">
              <svg
                className="w-6 h-6 text-blue-600 dark:text-blue-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
            </div>
            <h2 className="text-xl font-semibold mb-2">Candidate</h2>
            <p className="text-sm opacity-75 mb-4">
              Browse jobs, apply for positions, take assessments, and participate in AI interviews
            </p>
            <span className="text-blue-600 dark:text-blue-400 text-sm font-medium group-hover:underline">
              Sign up as Candidate →
            </span>
          </Link>

          {/* Recruiter Card */}
          <Link
            to="/register/recruiter"
            className={`group rounded-xl border p-6 transition-all hover:shadow-lg hover:scale-105 ${
              isDark
                ? 'border-slate-700 bg-slate-800 hover:border-blue-500'
                : 'border-gray-200 bg-white hover:border-blue-500'
            }`}
          >
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 mb-4">
              <svg
                className="w-6 h-6 text-green-600 dark:text-green-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
            </div>
            <h2 className="text-xl font-semibold mb-2">Recruiter</h2>
            <p className="text-sm opacity-75 mb-4">
              Post jobs, create assessments, manage candidates, and review AI interview results
            </p>
            <span className="text-green-600 dark:text-green-400 text-sm font-medium group-hover:underline">
              Sign up as Recruiter →
            </span>
          </Link>

          {/* Admin Card */}
          <Link
            to="/register/admin"
            className={`group rounded-xl border p-6 transition-all hover:shadow-lg hover:scale-105 ${
              isDark
                ? 'border-slate-700 bg-slate-800 hover:border-blue-500'
                : 'border-gray-200 bg-white hover:border-blue-500'
            }`}
          >
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-900/30 mb-4">
              <svg
                className="w-6 h-6 text-purple-600 dark:text-purple-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            </div>
            <h2 className="text-xl font-semibold mb-2">Admin</h2>
            <p className="text-sm opacity-75 mb-4">
              Manage platform settings, users, and system-wide configurations
            </p>
            <span className="text-purple-600 dark:text-purple-400 text-sm font-medium group-hover:underline">
              Sign up as Admin →
            </span>
          </Link>
        </div>

        <div className="text-center mt-8">
          <p className="text-sm opacity-75">
            Already have an account?{' '}
            <Link to="/login" className="text-blue-600 dark:text-blue-400 hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
