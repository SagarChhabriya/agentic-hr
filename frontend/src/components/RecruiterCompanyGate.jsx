import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useUser } from '@clerk/clerk-react';
import { useQuery } from '@tanstack/react-query';
import { companiesApi } from '../services/api';

function normRole(user) {
  const r = user?.publicMetadata?.role ?? user?.unsafeMetadata?.role;
  return String(r || '').trim().toUpperCase();
}

/**
 * Recruiters must create a company profile before using the rest of the recruiter app.
 * Admins are unrestricted.
 */
export default function RecruiterCompanyGate() {
  const { user } = useUser();
  const location = useLocation();
  const r = normRole(user);
  const isAdmin = r === 'ADMIN';
  const isRecruiter = r === 'RECRUITER';

  const { data: company, isLoading } = useQuery({
    queryKey: ['company', 'me'],
    queryFn: companiesApi.me,
    enabled: isRecruiter,
  });

  if (isAdmin) {
    return <Outlet />;
  }

  if (!isRecruiter) {
    return <Outlet />;
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const path = location.pathname;
  const onCompanyPage = path === '/recruiter/company' || path.startsWith('/recruiter/company/');

  if (!company && !onCompanyPage) {
    return <Navigate to="/recruiter/company" replace />;
  }

  return <Outlet />;
}
