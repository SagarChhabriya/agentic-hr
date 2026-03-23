import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="mt-auto border-t border-gray-200 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-900/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 sm:gap-12">
          {/* Brand */}
          <div className="sm:col-span-2 lg:col-span-1">
            <Link to="/" className="flex items-center gap-2.5 mb-4">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
                <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <span className="text-lg font-bold tracking-tight">Hirebase</span>
            </Link>
            <p className="text-sm opacity-75 max-w-xs">
              Modern HR automation for job posting, AI assessments, and LiveKit interviews.
            </p>
          </div>

          {/* Product */}
          <div>
            <h4 className="font-semibold mb-4">Product</h4>
            <ul className="space-y-3 text-sm">
              <li>
                <a href="#features" className="opacity-75 hover:opacity-100 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                  Features
                </a>
              </li>
              <li>
                <a href="#pricing" className="opacity-75 hover:opacity-100 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                  Pricing
                </a>
              </li>
              <li>
                <a href="#contact" className="opacity-75 hover:opacity-100 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                  Contact
                </a>
              </li>
              <li>
                <Link to="/jobs" className="opacity-75 hover:opacity-100 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                  Browse Jobs
                </Link>
              </li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="font-semibold mb-4">Company</h4>
            <ul className="space-y-3 text-sm">
              <li>
                <a href="#contact" className="opacity-75 hover:opacity-100 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                  Contact
                </a>
              </li>
              <li>
                <span className="opacity-40 cursor-default text-sm">Privacy Policy — coming soon</span>
              </li>
              <li>
                <span className="opacity-40 cursor-default text-sm">Terms of Service — coming soon</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-gray-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm">
          <p className="opacity-70">
            © {new Date().getFullYear()} Hirebase. All rights reserved.
          </p>
          <div className="flex items-center gap-6 text-sm opacity-50">
            <span>Privacy Policy — coming soon</span>
            <span>Terms of Service — coming soon</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
