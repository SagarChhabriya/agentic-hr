import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTheme } from '../../contexts/ThemeContext';
import { companiesApi } from '../../services/api';
import { showToast } from '../../components/Toast';

const emptyForm = {
  name: '',
  website: '',
  description: '',
  industry: '',
  company_size: '',
  headquarters: '',
  logo_url: '',
};

export default function RecruiterCompanyPage() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const queryClient = useQueryClient();
  const [form, setForm] = useState(emptyForm);

  const { data: company, isLoading } = useQuery({
    queryKey: ['company', 'me'],
    queryFn: () => companiesApi.me(),
  });

  useEffect(() => {
    if (company) {
      setForm({
        name: company.name || '',
        website: company.website || '',
        description: company.description || '',
        industry: company.industry || '',
        company_size: company.company_size || '',
        headquarters: company.headquarters || '',
        logo_url: company.logo_url || '',
      });
    }
  }, [company]);

  const saveMutation = useMutation({
    mutationFn: () =>
      companiesApi.upsert({
        name: form.name.trim(),
        website: form.website.trim() || undefined,
        description: form.description.trim() || undefined,
        industry: form.industry.trim() || undefined,
        company_size: form.company_size.trim() || undefined,
        headquarters: form.headquarters.trim() || undefined,
        logo_url: form.logo_url.trim() || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company', 'me'] });
      showToast('Company profile saved. It will be reviewed by an admin.', 'success');
    },
    onError: (err) => {
      showToast(err?.response?.data?.detail || 'Failed to save', 'error');
    },
  });

  const card = isDark ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white shadow-sm';
  const inputCls = `w-full px-3 py-2 rounded-lg border text-sm ${
    isDark ? 'bg-slate-900 border-slate-600 text-slate-100' : 'bg-white border-gray-300 text-gray-900'
  }`;

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const status = company?.verification_status;
  const statusBadge =
    status === 'verified'
      ? isDark
        ? 'bg-emerald-900/30 text-emerald-300 border-emerald-800'
        : 'bg-emerald-50 text-emerald-800 border-emerald-200'
      : status === 'rejected'
      ? isDark
        ? 'bg-red-900/30 text-red-300 border-red-800'
        : 'bg-red-50 text-red-800 border-red-200'
      : isDark
      ? 'bg-amber-900/30 text-amber-300 border-amber-800'
      : 'bg-amber-50 text-amber-800 border-amber-200';

  return (
    <div className={`max-w-3xl mx-auto ${isDark ? 'text-slate-100' : 'text-gray-900'}`}>
      <Link
        to="/recruiter/dashboard"
        className={`inline-flex items-center gap-1 text-xs mb-5 ${isDark ? 'text-slate-400 hover:text-slate-200' : 'text-gray-400 hover:text-gray-600'}`}
      >
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Dashboard
      </Link>

      <div className="rounded-xl border overflow-hidden mb-6">
        <div className="h-1 w-full bg-gradient-to-r from-indigo-500 to-violet-600" />
        <div className={`p-6 ${card}`}>
          <div className="flex flex-wrap items-center gap-3 mb-2">
            <h1 className="text-xl font-bold">Company profile</h1>
            {status && (
              <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border capitalize ${statusBadge}`}>
                {status}
              </span>
            )}
          </div>
          <p className={`text-sm mb-6 ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>
            Complete your employer profile so it can be verified by an admin. Once verified, you can create and publish jobs.
          </p>

          {status === 'rejected' && company?.rejection_reason && (
            <div
              className={`mb-6 p-4 rounded-lg border text-sm ${
                isDark ? 'border-red-800 bg-red-950/20 text-red-200' : 'border-red-200 bg-red-50 text-red-600'
              }`}
            >
              <p className="font-semibold mb-1">Previous review</p>
              <p>{company.rejection_reason}</p>
            </div>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!form.name.trim()) {
                showToast('Company name is required', 'error');
                return;
              }
              saveMutation.mutate();
            }}
            className="space-y-4"
          >
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400 mb-1">
                Company name *
              </label>
              <input
                className={inputCls}
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                required
                placeholder="Acme Inc."
              />
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400 mb-1">
                  Website
                </label>
                <input
                  className={inputCls}
                  value={form.website}
                  onChange={(e) => setForm((f) => ({ ...f, website: e.target.value }))}
                  placeholder="https://example.com"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400 mb-1">
                  Industry
                </label>
                <input
                  className={inputCls}
                  value={form.industry}
                  onChange={(e) => setForm((f) => ({ ...f, industry: e.target.value }))}
                  placeholder="e.g. Software"
                />
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400 mb-1">
                  Company size
                </label>
                <input
                  className={inputCls}
                  value={form.company_size}
                  onChange={(e) => setForm((f) => ({ ...f, company_size: e.target.value }))}
                  placeholder="e.g. 51–200"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400 mb-1">
                  Headquarters
                </label>
                <input
                  className={inputCls}
                  value={form.headquarters}
                  onChange={(e) => setForm((f) => ({ ...f, headquarters: e.target.value }))}
                  placeholder="City, Country"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400 mb-1">
                Logo URL
              </label>
              <input
                className={inputCls}
                value={form.logo_url}
                onChange={(e) => setForm((f) => ({ ...f, logo_url: e.target.value }))}
                placeholder="https://…"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400 mb-1">
                About the company
              </label>
              <textarea
                className={`${inputCls} min-h-[120px]`}
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="What does your company do?"
              />
            </div>

            <button
              type="submit"
              disabled={saveMutation.isPending}
              className="px-6 py-2.5 rounded-lg text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50"
            >
              {saveMutation.isPending ? 'Saving…' : 'Save company profile'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
