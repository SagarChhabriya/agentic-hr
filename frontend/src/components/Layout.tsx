import { Outlet, useLocation } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import { useUser } from '@clerk/clerk-react';
import Header from './Header';
import Footer from './Footer';
import { ToastContainer } from './Toast';
import RecruiterTour from './RecruiterTour';

export default function Layout() {
  const { theme } = useTheme();
  const { user } = useUser();
  const location = useLocation();

  const userRole = user?.publicMetadata?.role as string | undefined;
  const isRecruiterArea = location.pathname.startsWith('/recruiter');
  const showTour = isRecruiterArea && (userRole === 'RECRUITER' || userRole === 'ADMIN');

  return (
    <div className={`min-h-screen flex flex-col ${theme === 'dark' ? 'bg-slate-900 text-slate-100' : 'bg-gray-50 text-gray-900'}`}>
      <Header />
      <main className="flex-1 max-w-7xl w-full mx-auto py-6 sm:px-4 lg:px-8">
        <Outlet />
      </main>
      <Footer />
      <ToastContainer />
      {showTour && <RecruiterTour />}
    </div>
  );
}
