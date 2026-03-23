import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTheme } from '../../contexts/ThemeContext';
import { assessmentsApi, jobsApi, aiApi } from '../../services/api';
import PageHeader from '../../components/PageHeader';

const inputCls = (isDark) =>
  `w-full rounded-lg border px-3 py-2 text-sm outline-none transition-colors focus:ring-2 focus:ring-indigo-500/30 ${
    isDark
      ? 'border-slate-600 bg-slate-900 text-slate-100 placeholder-slate-500'
      : 'border-gray-200 bg-white text-gray-900 placeholder-gray-400'
  }`;

export default function AssessmentsPage() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const queryClient = useQueryClient();

  const { data: assessments = [], isLoading } = useQuery({
    queryKey: ['assessments'],
    queryFn: assessmentsApi.list,
  });
  const { data: jobs = [] } = useQuery({ queryKey: ['jobs'], queryFn: () => jobsApi.list() });

  const createMutation = useMutation({
    mutationFn: assessmentsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assessments'] });
      setShowForm(false);
      setFormData({ name: '', duration: 30, jobId: '' });
      setAiQuestions([]);
    },
  });

  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ name: '', duration: 30, jobId: '' });
  const [showCountPrompt, setShowCountPrompt] = useState(false);
  const [questionCount, setQuestionCount] = useState(10);
  const [aiQuestions, setAiQuestions] = useState([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [replacingIdx, setReplacingIdx] = useState(null);
  const [aiError, setAiError] = useState('');

  const getJobContext = () => {
    const job = jobs.find((j) => j.id === formData.jobId);
    return { title: job?.title || formData.name, description: job?.description || '', skills: job?.required_skills || [] };
  };

  const handleGenerateQuestions = async () => {
    setShowCountPrompt(false);
    setAiLoading(true);
    setAiError('');
    try {
      const ctx = getJobContext();
      const result = await aiApi.generateQuestions({ job_title: ctx.title, job_description: ctx.description, skills: ctx.skills, count: questionCount });
      setAiQuestions((result.questions || []).map((q) => ({ ...q, accepted: true })));
    } catch (err) {
      setAiError(err?.response?.data?.detail || 'AI generation failed');
    } finally {
      setAiLoading(false);
    }
  };

  const handleRemoveQuestion = async (idx) => {
    setReplacingIdx(idx);
    try {
      const ctx = getJobContext();
      const result = await aiApi.generateQuestions({ job_title: ctx.title, job_description: ctx.description, skills: ctx.skills, count: 1 });
      const replacement = result.questions?.[0];
      setAiQuestions((prev) => {
        const next = [...prev];
        next[idx] = replacement ? { ...replacement, accepted: true } : next[idx];
        return replacement ? next : prev.filter((_, i) => i !== idx);
      });
    } catch {
      setAiQuestions((prev) => prev.filter((_, i) => i !== idx));
    } finally {
      setReplacingIdx(null);
    }
  };

  const DIFF_CLS = {
    hard:   'bg-red-50    text-red-600   dark:bg-red-900/20   dark:text-red-400',
    medium: 'bg-amber-50  text-amber-600 dark:bg-amber-900/20 dark:text-amber-400',
    easy:   'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400',
  };

  return (
    <div>
      <PageHeader
        title="Assessments"
        subtitle="MCQ tests attached to your job postings"
        badge={assessments.length}
        actions={
          <button
            onClick={() => setShowForm((v) => !v)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-gradient-to-r from-indigo-500 to-violet-600 text-white hover:opacity-90 shadow-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
            New Assessment
          </button>
        }
      />

      {/* Create form — slides in */}
      {showForm && (
        <div className={`rounded-xl border mb-6 ${isDark ? 'border-slate-700 bg-slate-800/80' : 'border-gray-200 bg-white shadow-sm'}`}>
          <div className={`flex items-center justify-between px-5 py-4 border-b ${isDark ? 'border-slate-700' : 'border-gray-100'}`}>
            <h2 className="text-sm font-semibold">New Assessment</h2>
            <button onClick={() => { setShowForm(false); setAiQuestions([]); }}
              className={`p-1.5 rounded-lg ${isDark ? 'text-slate-400 hover:bg-slate-700' : 'text-gray-400 hover:bg-gray-100'}`}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="p-5 space-y-4">
            <div className="grid md:grid-cols-3 gap-4">
              <div className="md:col-span-1">
                <label className="block text-xs font-medium mb-1.5 text-gray-500 dark:text-slate-400">
                  Assessment Name <span className="text-red-400">*</span>
                </label>
                <input type="text" value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className={inputCls(isDark)} placeholder="e.g., Frontend Skills Test" />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5 text-gray-500 dark:text-slate-400">Duration (min)</label>
                <input type="number" value={formData.duration} min={5} max={180}
                  onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) || 30 })}
                  className={inputCls(isDark)} />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5 text-gray-500 dark:text-slate-400">Linked Job</label>
                <select value={formData.jobId}
                  onChange={(e) => setFormData({ ...formData, jobId: e.target.value })}
                  className={inputCls(isDark)}>
                  <option value="">No linked job</option>
                  {jobs.map((j) => <option key={j.id} value={j.id}>{j.title}</option>)}
                </select>
              </div>
            </div>

            <div className="flex gap-2 flex-wrap">
              <button onClick={() => { if (formData.name.trim()) createMutation.mutate({ name: formData.name, duration_minutes: formData.duration, job_id: formData.jobId || undefined }); }}
                disabled={createMutation.isPending || !formData.name.trim()}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50">
                {createMutation.isPending ? 'Creating…' : 'Create Assessment'}
              </button>
              <button onClick={() => { const ctx = getJobContext(); if (!ctx.title) { setAiError('Enter a name or select a job first'); return; } setAiError(''); setShowCountPrompt(true); }}
                disabled={aiLoading}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-violet-600 hover:bg-violet-700 text-white disabled:opacity-50">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                {aiLoading ? 'Generating…' : 'AI Generate Questions'}
              </button>
            </div>
            {aiError && <p className="text-xs text-red-500">{aiError}</p>}

            {/* AI question list */}
            {aiQuestions.length > 0 && (
              <div className={`rounded-lg border p-4 ${isDark ? 'border-slate-600 bg-slate-900' : 'border-gray-200 bg-gray-50'}`}>
                <p className={`text-xs font-semibold uppercase tracking-wide mb-3 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                  AI-Generated Questions — {aiQuestions.filter((q) => q.accepted).length} accepted
                </p>
                <div className="space-y-2">
                  {aiQuestions.map((q, idx) => (
                    <div key={idx} className={`flex items-start gap-3 p-3 rounded-lg border text-sm transition-colors ${
                      replacingIdx === idx ? 'opacity-40' :
                      q.accepted ? (isDark ? 'border-emerald-700/60 bg-emerald-900/10' : 'border-emerald-200 bg-emerald-50')
                                 : (isDark ? 'border-slate-700' : 'border-gray-200')
                    }`}>
                      <div className="flex gap-1 shrink-0 mt-0.5">
                        <button onClick={() => setAiQuestions((p) => { const n=[...p]; n[idx]={...n[idx],accepted:!n[idx].accepted}; return n; })}
                          className={`w-5 h-5 rounded flex items-center justify-center transition-colors ${q.accepted ? 'bg-emerald-500 text-white' : (isDark ? 'bg-slate-700 text-slate-400 hover:bg-slate-600' : 'bg-gray-200 text-gray-400 hover:bg-gray-300')}`}>
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        </button>
                        <button onClick={() => handleRemoveQuestion(idx)} disabled={replacingIdx !== null}
                          className={`w-5 h-5 rounded flex items-center justify-center transition-colors ${isDark ? 'text-slate-500 hover:bg-slate-700 hover:text-red-400' : 'text-gray-400 hover:bg-gray-200 hover:text-red-500'} disabled:opacity-30`}>
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4l16 16M4 20L20 4" />
                          </svg>
                        </button>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`font-medium ${isDark ? 'text-slate-200' : 'text-gray-800'}`}>{q.question}</p>
                        {q.options && (
                          <div className="mt-1.5 grid grid-cols-2 gap-1">
                            {q.options.map((opt, oi) => (
                              <span key={oi} className={`text-xs px-2 py-0.5 rounded ${oi === q.correct_index ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 font-medium' : 'opacity-60'}`}>
                                {String.fromCharCode(65 + oi)}. {opt}
                              </span>
                            ))}
                          </div>
                        )}
                        {q.difficulty && (
                          <span className={`mt-1 inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${DIFF_CLS[q.difficulty] || ''}`}>
                            {q.difficulty}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                {replacingIdx !== null && (
                  <p className="mt-2 text-xs text-violet-500 animate-pulse">Generating replacement…</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Count modal */}
      {showCountPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={() => setShowCountPrompt(false)}>
          <div className={`rounded-xl border p-6 w-72 shadow-xl ${isDark ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white'}`}
            onClick={(e) => e.stopPropagation()}>
            <h3 className="text-sm font-semibold mb-4">How many questions?</h3>
            <input type="number" value={questionCount} min={1} max={10}
              onChange={(e) => setQuestionCount(Math.min(10, Math.max(1, parseInt(e.target.value) || 1)))}
              className={`${inputCls(isDark)} mb-1`} />
            <p className="text-xs text-gray-400 dark:text-slate-500 mb-4">Max 10 per generation</p>
            <div className="flex gap-2">
              <button onClick={handleGenerateQuestions}
                className="flex-1 px-4 py-2 rounded-lg text-sm font-medium bg-violet-600 hover:bg-violet-700 text-white">
                Generate
              </button>
              <button onClick={() => setShowCountPrompt(false)}
                className={`px-4 py-2 rounded-lg text-sm font-medium border ${isDark ? 'border-slate-600' : 'border-gray-200'}`}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className={`rounded-xl border overflow-hidden ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
        <table className="w-full text-sm">
          <thead className={`${isDark ? 'bg-slate-800 border-b border-slate-700' : 'bg-gray-50 border-b border-gray-200'}`}>
            <tr>
              {['Name', 'Linked Job', 'Questions', 'Duration', 'Created', ''].map((h) => (
                <th key={h} className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className={`divide-y ${isDark ? 'divide-slate-700 bg-slate-800/50' : 'divide-gray-100 bg-white'}`}>
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 6 }).map((__, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-3 rounded animate-pulse bg-gray-200 dark:bg-slate-700" style={{ width: `${50 + Math.random() * 40}%` }} />
                    </td>
                  ))}
                </tr>
              ))
            ) : assessments.length === 0 ? (
              <tr>
                <td colSpan="6">
                  <div className="py-16 text-center">
                    <svg className="mx-auto w-10 h-10 mb-3 text-gray-300 dark:text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                    </svg>
                    <p className="text-sm text-gray-500 dark:text-slate-400 mb-3">No assessments yet</p>
                    <button onClick={() => setShowForm(true)}
                      className="text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:underline">
                      Create your first assessment →
                    </button>
                  </div>
                </td>
              </tr>
            ) : (
              assessments.map((a) => (
                <tr key={a.id} className={`group transition-colors ${isDark ? 'hover:bg-slate-800' : 'hover:bg-gray-50'}`}>
                  <td className={`px-4 py-3 font-medium ${isDark ? 'text-slate-100' : 'text-gray-900'}`}>
                    {a.name}
                  </td>
                  <td className={`px-4 py-3 ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>
                    {a.job_title ?? <span className="text-gray-300 dark:text-slate-600">—</span>}
                  </td>
                  <td className={`px-4 py-3 tabular-nums ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                    {a.questions_count ?? 0}
                  </td>
                  <td className={`px-4 py-3 tabular-nums ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>
                    {a.duration_minutes} min
                  </td>
                  <td className={`px-4 py-3 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                    {a.created_at ? new Date(a.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link to={`/recruiter/assessments/${a.id}`}
                      className={`inline-flex items-center gap-1 text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity ${isDark ? 'text-indigo-400 hover:text-indigo-300' : 'text-indigo-600 hover:text-indigo-700'}`}>
                      Manage
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
