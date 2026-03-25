import { Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { companiesApi } from '../services/api';

/**
 * Used from /dashboard for RECRUITER users: company setup first, then recruiter home.
 */
export default function RecruiterHomeRedirect() {
  const { data: company, isLoading } = useQuery({
    queryKey: ['company', 'me'],
    queryFn: companiesApi.me,
  });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[40vh]">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!company) {
    return <Navigate to="/recruiter/company" replace />;
  }

  return <Navigate to="/recruiter/dashboard" replace />;
}
