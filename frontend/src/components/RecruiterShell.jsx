import { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useUser, UserButton } from '@clerk/clerk-react';
import { useQuery } from '@tanstack/react-query';
import { useTheme } from '../contexts/ThemeContext';
import { ToastContainer } from './Toast';
import RecruiterTour from './RecruiterTour';
import RecruiterCompanyGate from './RecruiterCompanyGate';
import { companiesApi } from '../services/api';

const NAV_ITEMS = [
  {
    to: '/recruiter/dashboard',
    label: 'Dashboard',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
          d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
  },
  {
    to: '/recruiter/jobs',
    label: 'Jobs',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
          d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    to: '/recruiter/candidates',
    label: 'Candidates',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
          d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
  {
    to: '/recruiter/assessments',
    label: 'Assessments',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
      </svg>
    ),
  },
  {
    to: '/recruiter/questions',
    label: 'Questions',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
          d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    to: '/recruiter/analytics',
    label: 'Analytics',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
];

const COMPANY_NAV_ITEM = {
  to: '/recruiter/company',
  label: 'Company',
  icon: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
        d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
  ),
};

const ADMIN_COMPANIES_NAV = {
  to: '/recruiter/admin/companies',
  label: 'Verify companies',
  icon: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
        d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  ),
};

/** Normalize Clerk role (metadata can be any casing). */
function recruiterRoleFromUser(user) {
  const r = user?.publicMetadata?.role ?? user?.unsafeMetadata?.role;
  return String(r || '').trim().toUpperCase();
}

export default function RecruiterShell() {
  const { theme, toggleTheme } = useTheme();
  const { user } = useUser();
  const location = useLocation();
  const isDark = theme === 'dark';
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const isActive = (path) =>
    path === '/recruiter/dashboard'
      ? location.pathname === path
      : location.pathname.startsWith(path);

  const r = recruiterRoleFromUser(user);
  const isAdmin = r === 'ADMIN';
  const isRecruiter = r === 'RECRUITER';

  const ownerEmail = (import.meta.env.VITE_ADMIN_OWNER_EMAIL || '').trim().toLowerCase();
  const userEmail = user?.primaryEmailAddress?.emailAddress?.trim().toLowerCase() || '';
  const showPlatformAdminNav = isAdmin && (!ownerEmail || userEmail === ownerEmail);

  const { data: company } = useQuery({
    queryKey: ['company', 'me'],
    queryFn: companiesApi.me,
    enabled: isRecruiter,
  });

  const recruiterHasCompany = !isRecruiter || !!company;

  const pageTitle =
    location.pathname.startsWith('/recruiter/company')
      ? 'Company'
      : location.pathname.startsWith('/recruiter/admin/companies')
        ? 'Verify companies'
        : NAV_ITEMS.find((n) => isActive(n.to))?.label ?? 'Recruiter';

  /** Main menu: no Company / Verify here — those live in the footer below Quick Create. */
  const navItems = isRecruiter && !recruiterHasCompany ? [] : NAV_ITEMS;

  const showFooterNav = showPlatformAdminNav || !isAdmin;

  const sidebarBg = isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-200';
  const activeCls = isDark
    ? 'bg-indigo-500/15 text-indigo-400 border-l-2 border-indigo-500'
    : 'bg-indigo-50 text-indigo-700 border-l-2 border-indigo-600';
  const inactiveCls = isDark
    ? 'text-slate-400 hover:bg-slate-800 hover:text-slate-100 border-l-2 border-transparent'
    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 border-l-2 border-transparent';

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className={`flex items-center gap-2.5 px-5 h-16 border-b shrink-0 ${isDark ? 'border-slate-800' : 'border-gray-200'}`}>
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-md shrink-0">
          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5}
              d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <span className={`text-lg font-bold tracking-tight ${isDark ? 'text-slate-100' : 'text-gray-900'}`}>
          Hirebase
        </span>
      </div>

      {/* Scrollable menu + Quick Create — Workspace stays pinned above profile */}
      <nav className="flex-1 min-h-0 overflow-y-auto py-4">
        {navItems.length > 0 && (
          <>
            <p className={`px-5 mb-2 text-xs font-semibold uppercase tracking-widest ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
              Menu
            </p>
            <ul className="space-y-0.5">
              {navItems.map((item) => (
                <li key={item.to}>
                  <Link
                    to={item.to}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-3 px-5 py-2.5 text-sm font-medium transition-all ${
                      isActive(item.to) ? activeCls : inactiveCls
                    }`}
                  >
                    {item.icon}
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}

        {isRecruiter && !recruiterHasCompany && (
          <p className={`px-5 mt-3 text-xs leading-relaxed ${isDark ? 'text-amber-400/90' : 'text-amber-800'}`}>
            Save your company profile below to unlock jobs, candidates, and the rest of the menu.
          </p>
        )}

        {recruiterHasCompany && (
          <>
            <div className={`mx-4 my-4 h-px shrink-0 ${isDark ? 'bg-slate-800' : 'bg-gray-100'}`} />

            <p className={`px-5 mb-2 text-xs font-semibold uppercase tracking-widest ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
              Quick Create
            </p>
            <div className="px-4">
              <Link
                to="/recruiter/jobs/new"
                onClick={() => setMobileOpen(false)}
                className="flex items-center justify-center gap-2 w-full px-3 py-2 rounded-lg text-sm font-medium bg-gradient-to-r from-indigo-500 to-violet-600 text-white hover:opacity-90 transition-opacity shadow-sm"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                </svg>
                New Job
              </Link>
            </div>
          </>
        )}
      </nav>

      {showFooterNav && (
        <div className={`shrink-0 border-t py-3 ${isDark ? 'border-slate-800' : 'border-gray-200'}`}>
          <p className={`px-5 mb-2 text-xs font-semibold uppercase tracking-widest ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
            Workspace
          </p>
          <ul className="space-y-0.5">
            {showPlatformAdminNav && (
              <li key={ADMIN_COMPANIES_NAV.to}>
                <Link
                  to={ADMIN_COMPANIES_NAV.to}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-3 px-5 py-2.5 text-sm font-medium transition-all ${
                    isActive(ADMIN_COMPANIES_NAV.to) ? activeCls : inactiveCls
                  }`}
                >
                  {ADMIN_COMPANIES_NAV.icon}
                  {ADMIN_COMPANIES_NAV.label}
                </Link>
              </li>
            )}
            {!isAdmin && (
              <li key={COMPANY_NAV_ITEM.to}>
                <Link
                  to={COMPANY_NAV_ITEM.to}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-3 px-5 py-2.5 text-sm font-medium transition-all ${
                    isActive(COMPANY_NAV_ITEM.to) ? activeCls : inactiveCls
                  }`}
                >
                  {COMPANY_NAV_ITEM.icon}
                  {COMPANY_NAV_ITEM.label}
                </Link>
              </li>
            )}
          </ul>
        </div>
      )}

      {/* Bottom user section */}
      <div className={`shrink-0 border-t p-4 ${isDark ? 'border-slate-800' : 'border-gray-200'}`}>
        <div className="flex items-center gap-3">
          <UserButton afterSignOutUrl="/" />
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-medium truncate ${isDark ? 'text-slate-200' : 'text-gray-900'}`}>
              {user?.fullName || user?.firstName || 'Recruiter'}
            </p>
            <p className={`text-xs truncate ${isDark ? 'text-slate-500' : 'text-gray-500'}`}>
              {user?.primaryEmailAddress?.emailAddress}
            </p>
          </div>
          <button
            onClick={toggleTheme}
            className={`p-1.5 rounded-lg transition-colors shrink-0 ${isDark ? 'text-slate-400 hover:text-slate-100 hover:bg-slate-800' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'}`}
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
        </div>
      </div>
    </div>
  );

  return (
    <div className={`flex min-h-screen ${isDark ? 'bg-slate-950 text-slate-100' : 'bg-gray-50 text-gray-900'}`}>

      {/* Desktop sidebar — collapsible, sticky */}
      {!sidebarCollapsed && (
        <aside className={`hidden md:flex flex-col w-60 shrink-0 border-r sticky top-0 h-screen ${sidebarBg}`}>
          <SidebarContent />
        </aside>
      )}

      {/* Mobile sidebar drawer */}
      {mobileOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/50 md:hidden"
            onClick={() => setMobileOpen(false)}
          />
          <aside className={`fixed inset-y-0 left-0 z-50 flex flex-col w-60 border-r md:hidden ${sidebarBg}`}>
            <SidebarContent />
          </aside>
        </>
      )}

      {/* Main area */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* Top bar — sticky */}
        <header className={`sticky top-0 z-30 flex items-center justify-between h-14 px-4 sm:px-6 border-b ${isDark ? 'bg-slate-900/95 border-slate-800 backdrop-blur-md' : 'bg-white/95 border-gray-200 backdrop-blur-md'}`}>
          <div className="flex items-center gap-3">
            {/* Burger — mobile opens drawer, desktop toggles sidebar */}
            <button
              onClick={() => (window.innerWidth >= 768 ? setSidebarCollapsed((v) => !v) : setMobileOpen(true))}
              className={`p-2 rounded-lg transition-colors ${isDark ? 'text-slate-400 hover:bg-slate-800 hover:text-slate-100' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'}`}
              aria-label="Toggle sidebar"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            {/* Logo shown only when sidebar is collapsed on desktop */}
            {sidebarCollapsed && (
              <div className="hidden md:flex items-center gap-2">
                <div className="w-7 h-7 rounded-md bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
                  <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <span className={`text-sm font-bold ${isDark ? 'text-slate-100' : 'text-gray-900'}`}>Hirebase</span>
              </div>
            )}

            {/* Current page label */}
            <span className={`text-sm font-medium ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
              {pageTitle}
            </span>
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-3">
            <span className={`hidden sm:inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
              isDark ? 'bg-indigo-900/40 text-indigo-300' : 'bg-indigo-50 text-indigo-700'
            }`}>
              {isAdmin ? 'Admin' : 'Recruiter'}
            </span>
            <Link
              to="/"
              className={`text-xs hidden sm:block ${isDark ? 'text-slate-500 hover:text-slate-300' : 'text-gray-400 hover:text-gray-600'}`}
            >
              ← Home
            </Link>
          </div>
        </header>

        {/* Page content — scrolls with the browser, no nested scrollbar */}
        <main className={`flex-1 ${isDark ? 'bg-slate-950' : 'bg-gray-50'}`}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <RecruiterCompanyGate>
              <Outlet />
            </RecruiterCompanyGate>
          </div>
        </main>
      </div>

      <ToastContainer />
      <RecruiterTour />
    </div>
  );
}
