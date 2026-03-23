import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTheme } from '../../contexts/ThemeContext';
import { assessmentsApi, aiApi } from '../../services/api';
import { showToast } from '../../components/Toast';

const DIFF_CLS = {
  hard:   'bg-red-50    text-red-600   dark:bg-red-900/20   dark:text-red-400',
  medium: 'bg-amber-50  text-amber-600 dark:bg-amber-900/20 dark:text-amber-400',
  easy:   'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400',
};

const inputCls = (isDark) =>
  `w-full rounded-lg border px-3 py-2 text-sm outline-none transition-colors focus:ring-2 focus:ring-indigo-500/30 ${
    isDark
      ? 'border-slate-600 bg-slate-900 text-slate-100 placeholder-slate-500'
      : 'border-gray-200 bg-white text-gray-900 placeholder-gray-400'
  }`;

const BLANK_Q = { question_text: '', options: ['', '', '', ''], correct_index: 0 };

export default function AssessmentDetailPage() {
  const { id } = useParams();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const queryClient = useQueryClient();

  const { data: assessment, isLoading, error } = useQuery({
    queryKey: ['assessment', id],
    queryFn: () => assessmentsApi.getById(id),
  });

  const addMutation = useMutation({
    mutationFn: (questions) => assessmentsApi.addQuestions(id, questions),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assessment', id] });
      queryClient.invalidateQueries({ queryKey: ['assessments'] });
      showToast('Questions saved successfully', 'success');
      setManualQuestions([{ ...BLANK_Q, options: ['', '', '', ''] }]);
      setAiQuestions([]);
      setTab('questions');
    },
    onError: () => showToast('Failed to save questions', 'error'),
  });

  const clearMutation = useMutation({
    mutationFn: () => assessmentsApi.clearQuestions(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assessment', id] });
      queryClient.invalidateQueries({ queryKey: ['assessments'] });
      showToast('All questions cleared', 'info');
    },
  });

  const [tab, setTab] = useState('questions'); // 'questions' | 'add_manual' | 'add_ai'
  const [manualQuestions, setManualQuestions] = useState([{ ...BLANK_Q, options: ['', '', '', ''] }]);
  const [aiQuestions, setAiQuestions] = useState([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');
  const [replacingIdx, setReplacingIdx] = useState(null);
  const [showCountPrompt, setShowCountPrompt] = useState(false);
  const [questionCount, setQuestionCount] = useState(5);

  const handleGenerateAi = async () => {
    setShowCountPrompt(false);
    setAiLoading(true);
    setAiError('');
    try {
      const result = await aiApi.generateQuestions({
        job_title: assessment?.job_title || assessment?.name || '',
        job_description: '',
        skills: [],
        count: questionCount,
      });
      setAiQuestions((result.questions || []).map((q) => ({ ...q, accepted: true })));
    } catch (err) {
      setAiError(err?.response?.data?.detail || 'AI generation failed');
    } finally {
      setAiLoading(false);
    }
  };

  const handleReplaceQuestion = async (idx) => {
    setReplacingIdx(idx);
    try {
      const result = await aiApi.generateQuestions({
        job_title: assessment?.job_title || assessment?.name || '',
        job_description: '',
        skills: [],
        count: 1,
      });
      const replacement = result.questions?.[0];
      setAiQuestions((prev) => {
        const next = [...prev];
        next[idx] = replacement ? { ...replacement, accepted: true } : next[idx];
        return next;
      });
    } catch {
      setAiQuestions((prev) => prev.filter((_, i) => i !== idx));
    } finally {
      setReplacingIdx(null);
    }
  };

  const handleSaveManual = () => {
    const valid = manualQuestions.filter(
      (q) => q.question_text.trim() && q.options.every((o) => o.trim())
    );
    if (!valid.length) { showToast('Fill in at least one complete question', 'error'); return; }
    addMutation.mutate(valid);
  };

  const handleSaveAi = () => {
    const accepted = aiQuestions
      .filter((q) => q.accepted)
      .map((q) => ({ question_text: q.question, options: q.options, correct_index: q.correct_index }));
    if (!accepted.length) { showToast('Accept at least one question', 'error'); return; }
    addMutation.mutate(accepted);
  };

  const updateManualQ = (idx, field, value) => {
    setManualQuestions((prev) => { const n = [...prev]; n[idx] = { ...n[idx], [field]: value }; return n; });
  };
  const updateManualOption = (qi, oi, value) => {
    setManualQuestions((prev) => {
      const n = [...prev];
      const opts = [...n[qi].options];
      opts[oi] = value;
      n[qi] = { ...n[qi], options: opts };
      return n;
    });
  };
  const addManualQuestion = () =>
    setManualQuestions((prev) => [...prev, { ...BLANK_Q, options: ['', '', '', ''] }]);
  const removeManualQuestion = (idx) =>
    setManualQuestions((prev) => prev.filter((_, i) => i !== idx));

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !assessment) {
    return (
      <div className={`rounded-xl border p-8 text-center ${isDark ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white'}`}>
        <p className="text-red-500 text-sm">Assessment not found or failed to load.</p>
        <Link to="/recruiter/assessments" className="mt-3 inline-block text-sm text-indigo-500 hover:underline">
          ← Back to Assessments
        </Link>
      </div>
    );
  }

  const TAB_ITEMS = [
    { id: 'questions', label: `Questions (${(assessment.questions || []).length})` },
    { id: 'add_ai', label: 'AI Generate' },
    { id: 'add_manual', label: 'Add Manually' },
  ];

  return (
    <div>
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
        <div>
          <Link to="/recruiter/assessments"
            className={`inline-flex items-center gap-1 text-xs mb-2 ${isDark ? 'text-slate-400 hover:text-slate-200' : 'text-gray-400 hover:text-gray-600'}`}>
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Assessments
          </Link>
          <h1 className={`text-2xl font-bold ${isDark ? 'text-slate-100' : 'text-gray-900'}`}>{assessment.name}</h1>
          <div className={`flex flex-wrap gap-3 mt-1.5 text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
            {assessment.job_title && <span>Linked to <span className="font-medium">{assessment.job_title}</span></span>}
            <span>{assessment.duration_minutes} min</span>
            {assessment.created_at && (
              <span>Created {new Date(assessment.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
            )}
          </div>
        </div>
        <button
          onClick={() => { if (confirm('Clear ALL questions from this assessment? This cannot be undone.')) clearMutation.mutate(); }}
          disabled={clearMutation.isPending || !(assessment.questions?.length)}
          className={`shrink-0 self-start px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors disabled:opacity-40 ${
            isDark ? 'border-red-700 text-red-400 hover:bg-red-900/20' : 'border-red-200 text-red-600 hover:bg-red-50'
          }`}>
          {clearMutation.isPending ? 'Clearing…' : 'Clear all questions'}
        </button>
      </div>

      {/* Tabs */}
      <div className={`flex items-center gap-0.5 border-b mb-6 ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
        {TAB_ITEMS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`relative px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors ${
              tab === t.id
                ? `text-indigo-600 dark:text-indigo-400 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-indigo-600 dark:after:bg-indigo-400`
                : `${isDark ? 'text-slate-400 hover:text-slate-100' : 'text-gray-500 hover:text-gray-800'}`
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* === TAB: existing questions === */}
      {tab === 'questions' && (
        <div>
          {!assessment.questions?.length ? (
            <div className={`rounded-xl border p-12 text-center ${isDark ? 'border-slate-700 bg-slate-800/50' : 'border-gray-200 bg-white'}`}>
              <svg className="mx-auto w-10 h-10 mb-3 text-gray-300 dark:text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className={`text-sm mb-3 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>No questions yet</p>
              <div className="flex items-center justify-center gap-3">
                <button onClick={() => setTab('add_ai')}
                  className="text-sm font-medium text-violet-600 dark:text-violet-400 hover:underline">
                  Generate with AI →
                </button>
                <span className={isDark ? 'text-slate-600' : 'text-gray-300'}>·</span>
                <button onClick={() => setTab('add_manual')}
                  className="text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:underline">
                  Add manually →
                </button>
              </div>
            </div>
          ) : (
            <div className={`rounded-xl border overflow-hidden ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
              <table className="w-full text-sm">
                <thead className={`${isDark ? 'bg-slate-800 border-b border-slate-700' : 'bg-gray-50 border-b border-gray-200'}`}>
                  <tr>
                    {['#', 'Question', 'Options', 'Answer'].map((h) => (
                      <th key={h} className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className={`divide-y ${isDark ? 'divide-slate-700 bg-slate-800/50' : 'divide-gray-100 bg-white'}`}>
                  {assessment.questions.map((q, i) => (
                    <tr key={q.id} className={isDark ? 'hover:bg-slate-800' : 'hover:bg-gray-50'}>
                      <td className={`px-4 py-3 tabular-nums text-xs ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>{i + 1}</td>
                      <td className={`px-4 py-3 font-medium max-w-sm ${isDark ? 'text-slate-200' : 'text-gray-800'}`}>{q.question_text}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {(q.options || []).map((opt, oi) => (
                            <span key={oi} className={`text-xs px-2 py-0.5 rounded ${
                              oi === q.correct_index
                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 font-medium'
                                : (isDark ? 'bg-slate-700 text-slate-400' : 'bg-gray-100 text-gray-500')
                            }`}>
                              {String.fromCharCode(65 + oi)}. {opt}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                          {String.fromCharCode(65 + (q.correct_index ?? 0))}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* === TAB: AI Generate === */}
      {tab === 'add_ai' && (
        <div>
          <div className={`rounded-xl border p-5 mb-4 ${isDark ? 'border-slate-700 bg-slate-800/50' : 'border-gray-100 bg-indigo-50/40'}`}>
            <p className={`text-sm mb-3 ${isDark ? 'text-slate-300' : 'text-gray-600'}`}>
              AI will generate MCQ questions based on the job <strong>{assessment.job_title || assessment.name}</strong>. Review each question, toggle acceptance, then save.
            </p>
            <div className="flex gap-2 flex-wrap">
              <button onClick={() => setShowCountPrompt(true)} disabled={aiLoading}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-violet-600 hover:bg-violet-700 text-white disabled:opacity-50">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                {aiLoading ? 'Generating…' : aiQuestions.length ? 'Regenerate' : 'Generate Questions'}
              </button>
              {aiQuestions.filter((q) => q.accepted).length > 0 && (
                <button onClick={handleSaveAi} disabled={addMutation.isPending}
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50">
                  {addMutation.isPending ? 'Saving…' : `Save ${aiQuestions.filter((q) => q.accepted).length} questions`}
                </button>
              )}
            </div>
            {aiError && <p className="mt-2 text-xs text-red-500">{aiError}</p>}
          </div>

          {aiQuestions.length > 0 && (
            <div className="space-y-2">
              {aiQuestions.map((q, idx) => (
                <div key={idx} className={`flex items-start gap-3 p-4 rounded-xl border text-sm transition-colors ${
                  replacingIdx === idx ? 'opacity-40' :
                  q.accepted ? (isDark ? 'border-emerald-700/60 bg-emerald-900/10' : 'border-emerald-200 bg-emerald-50/60')
                               : (isDark ? 'border-slate-700 bg-slate-800/50' : 'border-gray-200 bg-white')
                }`}>
                  <div className="flex gap-1 shrink-0 mt-0.5">
                    <button onClick={() => setAiQuestions((p) => { const n=[...p]; n[idx]={...n[idx],accepted:!n[idx].accepted}; return n; })}
                      className={`w-5 h-5 rounded flex items-center justify-center ${q.accepted ? 'bg-emerald-500 text-white' : (isDark ? 'bg-slate-700 text-slate-400 hover:bg-slate-600' : 'bg-gray-200 text-gray-400 hover:bg-gray-300')}`}>
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </button>
                    <button onClick={() => handleReplaceQuestion(idx)} disabled={replacingIdx !== null}
                      className={`w-5 h-5 rounded flex items-center justify-center ${isDark ? 'text-slate-500 hover:bg-slate-700 hover:text-red-400' : 'text-gray-400 hover:bg-gray-200 hover:text-red-500'} disabled:opacity-30`}>
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4l16 16M4 20L20 4" />
                      </svg>
                    </button>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`font-medium mb-2 ${isDark ? 'text-slate-200' : 'text-gray-800'}`}>{q.question}</p>
                    {q.options && (
                      <div className="grid grid-cols-2 gap-1">
                        {q.options.map((opt, oi) => (
                          <span key={oi} className={`text-xs px-2 py-1 rounded ${
                            oi === q.correct_index
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 font-medium'
                              : 'opacity-60'
                          }`}>
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
              {replacingIdx !== null && (
                <p className="text-xs text-violet-500 animate-pulse">Generating replacement…</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* === TAB: Manual === */}
      {tab === 'add_manual' && (
        <div>
          <div className="space-y-4 mb-4">
            {manualQuestions.map((q, qi) => (
              <div key={qi} className={`rounded-xl border p-4 ${isDark ? 'border-slate-700 bg-slate-800/50' : 'border-gray-200 bg-white'}`}>
                <div className="flex items-center justify-between mb-3">
                  <span className={`text-xs font-semibold ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Question {qi + 1}</span>
                  {manualQuestions.length > 1 && (
                    <button onClick={() => removeManualQuestion(qi)}
                      className="text-xs text-red-500 hover:text-red-600">Remove</button>
                  )}
                </div>
                <textarea value={q.question_text} rows={2}
                  onChange={(e) => updateManualQ(qi, 'question_text', e.target.value)}
                  className={`${inputCls(isDark)} resize-none mb-3`}
                  placeholder="Question text…" />
                <div className="grid sm:grid-cols-2 gap-2 mb-3">
                  {q.options.map((opt, oi) => (
                    <div key={oi} className="flex items-center gap-2">
                      <input type="radio" name={`correct-${qi}`} checked={q.correct_index === oi}
                        onChange={() => updateManualQ(qi, 'correct_index', oi)}
                        className="accent-indigo-600 shrink-0" title="Mark as correct answer" />
                      <input type="text" value={opt}
                        onChange={(e) => updateManualOption(qi, oi, e.target.value)}
                        className={inputCls(isDark)} placeholder={`Option ${String.fromCharCode(65 + oi)}`} />
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gray-400 dark:text-slate-500">
                  Select the radio button next to the correct answer.
                </p>
              </div>
            ))}
          </div>
          <div className="flex gap-2 flex-wrap">
            <button onClick={addManualQuestion}
              className={`px-4 py-2 rounded-lg text-sm font-medium border ${isDark ? 'border-slate-600 text-slate-300 hover:bg-slate-800' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
              + Add another question
            </button>
            <button onClick={handleSaveManual} disabled={addMutation.isPending}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50">
              {addMutation.isPending ? 'Saving…' : `Save ${manualQuestions.filter((q) => q.question_text.trim()).length} question(s)`}
            </button>
          </div>
        </div>
      )}

      {/* Count prompt modal */}
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
              <button onClick={handleGenerateAi}
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
    </div>
  );
}
