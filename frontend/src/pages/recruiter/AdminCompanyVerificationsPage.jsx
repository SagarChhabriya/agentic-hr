import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useUser } from '@clerk/clerk-react';
import { useTheme } from '../../contexts/ThemeContext';
import { companiesApi } from '../../services/api';
import { showToast } from '../../components/Toast';

export default function AdminCompanyVerificationsPage() {
  const { user } = useUser();
  const rawRole = user?.publicMetadata?.role || user?.unsafeMetadata?.role;
  const role = String(rawRole || '').trim().toUpperCase();
  const ownerEmail = (import.meta.env.VITE_ADMIN_OWNER_EMAIL || '').trim().toLowerCase();
  const userEmail = user?.primaryEmailAddress?.emailAddress?.trim().toLowerCase() || '';
  const canVerifyCompanies = role === 'ADMIN' && (!ownerEmail || userEmail === ownerEmail);
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const queryClient = useQueryClient();
  const [rejectId, setRejectId] = useState(null);
  const [rejectReason, setRejectReason] = useState('');

  const { data: pending = [], isLoading } = useQuery({
    queryKey: ['companies', 'pending'],
    queryFn: () => companiesApi.listPending(),
    enabled: canVerifyCompanies,
  });

  const verifyMutation = useMutation({
    mutationFn: (id) => companiesApi.verify(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies', 'pending'] });
      showToast('Company verified.', 'success');
    },
    onError: (err) => showToast(err?.response?.data?.detail || 'Failed', 'error'),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }) => companiesApi.reject(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies', 'pending'] });
      setRejectId(null);
      setRejectReason('');
      showToast('Company rejected.', 'info');
    },
    onError: (err) => showToast(err?.response?.data?.detail || 'Failed', 'error'),
  });

  if (role !== 'ADMIN') {
    return (
      <div className="text-center py-16 text-slate-500">
        <p>Admin access only.</p>
        <Link to="/recruiter/dashboard" className="text-indigo-500 hover:underline text-sm mt-2 inline-block">
          Back
        </Link>
      </div>
    );
  }

  if (!canVerifyCompanies) {
    return (
      <div className="text-center py-16 text-slate-500 max-w-md mx-auto">
        <p className="mb-2">Only the platform owner can verify companies.</p>
        <Link to="/recruiter/dashboard" className="text-indigo-500 hover:underline text-sm inline-block">
          Back to dashboard
        </Link>
      </div>
    );
  }

  const card = isDark ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white shadow-sm';

  return (
    <div className={`max-w-3xl mx-auto ${isDark ? 'text-slate-100' : 'text-gray-900'}`}>
      <Link
        to="/recruiter/dashboard"
        className={`inline-flex items-center gap-1 text-xs mb-5 ${isDark ? 'text-slate-400 hover:text-slate-200' : 'text-gray-400 hover:text-gray-600'}`}
      >
        Dashboard
      </Link>
      <h1 className="text-xl font-bold mb-2">Company verifications</h1>
      <p className={`text-sm mb-6 ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>
        Approve employer profiles so recruiters can post jobs.
      </p>

      {isLoading && (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {!isLoading && pending.length === 0 && (
        <p className={`text-sm ${isDark ? 'text-slate-500' : 'text-gray-500'}`}>No companies pending review.</p>
      )}

      <ul className="space-y-4">
        {pending.map((c) => (
          <li key={c.id} className={`rounded-xl border p-5 ${card}`}>
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div>
                <p className="font-semibold">{c.name}</p>
                <p className="text-xs text-slate-500 mt-1">{c.headquarters || '—'} · {c.industry || '—'}</p>
                {c.description && (
                  <p className="text-sm text-slate-600 dark:text-slate-300 mt-3 line-clamp-4">{c.description}</p>
                )}
                {c.website && (
                  <a href={c.website.startsWith('http') ? c.website : `https://${c.website}`} className="text-xs text-indigo-500 hover:underline mt-2 inline-block" target="_blank" rel="noopener noreferrer">
                    {c.website}
                  </a>
                )}
              </div>
              <div className="flex flex-wrap gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => verifyMutation.mutate(c.id)}
                  disabled={verifyMutation.isPending}
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50"
                >
                  Verify
                </button>
                <button
                  type="button"
                  onClick={() => setRejectId(c.id)}
                  className="px-4 py-2 rounded-lg text-sm font-medium border border-red-300 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20"
                >
                  Reject
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>

      {rejectId && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setRejectId(null)} aria-hidden="true" />
          <div
            className={`fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 p-6 rounded-xl w-full max-w-md border shadow-xl ${card}`}
          >
            <h3 className="font-semibold mb-2">Reject company</h3>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Reason (shown to recruiter)"
              rows={4}
              className={`w-full px-3 py-2 rounded-lg border text-sm mb-4 ${
                isDark ? 'bg-slate-900 border-slate-600' : 'bg-white border-gray-300'
              }`}
            />
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setRejectId(null)} className="px-4 py-2 text-sm border rounded-lg">
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!rejectReason.trim()) {
                    showToast('Enter a reason', 'error');
                    return;
                  }
                  rejectMutation.mutate({ id: rejectId, reason: rejectReason.trim() });
                }}
                disabled={rejectMutation.isPending}
                className="px-4 py-2 text-sm rounded-lg bg-red-600 text-white"
              >
                Submit rejection
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
