import { Outlet } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import Header from './Header';
import Footer from './Footer';

export default function Layout() {
  const { theme } = useTheme();

  return (
    <div className={`min-h-screen flex flex-col ${theme === 'dark' ? 'bg-slate-900 text-slate-100' : 'bg-gray-50 text-gray-900'}`}>
      <Header />
      <main className="flex-1 max-w-7xl w-full mx-auto py-6 sm:px-4 lg:px-8">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
