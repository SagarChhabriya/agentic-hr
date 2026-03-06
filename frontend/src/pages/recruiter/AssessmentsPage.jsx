import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTheme } from '../../contexts/ThemeContext';
import { assessmentsApi, jobsApi, aiApi } from '../../services/api';

export default function AssessmentsPage() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const queryClient = useQueryClient();
  const { data: assessments = [], isLoading, error } = useQuery({
    queryKey: ['assessments'],
    queryFn: assessmentsApi.list,
  });
  const { data: jobs = [] } = useQuery({ queryKey: ['jobs'], queryFn: () => jobsApi.list() });
  const createMutation = useMutation({
    mutationFn: assessmentsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assessments'] });
      setShowCreateForm(false);
      setFormData({ name: '', questions: [], duration: 30, jobId: '' });
      setAiQuestions([]);
      setShowAiQuestions(false);
    },
  });

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    questions: [],
    duration: 30,
    jobId: '',
  });

  // AI question generation
  const [showCountPrompt, setShowCountPrompt] = useState(false);
  const [questionCount, setQuestionCount] = useState(10);
  const [showAiQuestions, setShowAiQuestions] = useState(false);
  const [aiQuestions, setAiQuestions] = useState([]); // { ...question, accepted: true/false }
  const [aiLoading, setAiLoading] = useState(false);
  const [replacingIdx, setReplacingIdx] = useState(null);
  const [aiError, setAiError] = useState('');

  const getJobContext = () => {
    const selectedJob = jobs.find((j) => j.id === formData.jobId);
    return {
      title: selectedJob?.title || formData.name,
      description: selectedJob?.description || '',
      skills: selectedJob?.required_skills || [],
    };
  };

  const handleAiButtonClick = () => {
    const ctx = getJobContext();
    if (!ctx.title) {
      setAiError('Select a job or enter a name first');
      return;
    }
    setAiError('');
    setShowCountPrompt(true);
  };

  const handleGenerateQuestions = async () => {
    setShowCountPrompt(false);
    setAiLoading(true);
    setAiError('');
    try {
      const ctx = getJobContext();
      const result = await aiApi.generateQuestions({
        job_title: ctx.title,
        job_description: ctx.description,
        skills: ctx.skills,
        count: questionCount,
      });
      const questions = (result.questions || []).map((q) => ({ ...q, accepted: true }));
      setAiQuestions(questions);
      setShowAiQuestions(true);
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
      const result = await aiApi.generateQuestions({
        job_title: ctx.title,
        job_description: ctx.description,
        skills: ctx.skills,
        count: 1,
      });
      const replacement = result.questions?.[0];
      if (replacement) {
        setAiQuestions((prev) => {
          const next = [...prev];
          next[idx] = { ...replacement, accepted: true };
          return next;
        });
      }
    } catch {
      setAiQuestions((prev) => prev.filter((_, i) => i !== idx));
    } finally {
      setReplacingIdx(null);
    }
  };

  const handleAcceptQuestion = (idx) => {
    setAiQuestions((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], accepted: !next[idx].accepted };
      return next;
    });
  };

  const acceptedCount = aiQuestions.filter((q) => q.accepted).length;

  const handleCreate = () => {
    if (formData.name.trim()) {
      createMutation.mutate({
        name: formData.name,
        duration_minutes: formData.duration,
        job_id: formData.jobId || undefined,
      });
    }
  };

  if (isLoading) {
    return (
      <div className={`px-4 py-8 ${isDark ? 'text-slate-100' : 'text-gray-900'}`}>
        <div className="flex justify-center items-center min-h-[200px]">Loading assessments...</div>
      </div>
    );
  }
  if (error) {
    return (
      <div className={`px-4 py-8 ${isDark ? 'text-slate-100' : 'text-gray-900'}`}>
        <div className="rounded-lg border p-6 border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800">
          <p className="text-red-600 dark:text-red-400">Failed to load assessments.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`px-4 py-8 ${isDark ? 'text-slate-100' : 'text-gray-900'}`}>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Assessments</h1>
          <p className="text-sm opacity-75">Manage MCQ assessments for your jobs</p>
        </div>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="px-6 py-3 rounded-lg font-medium transition-colors bg-blue-600 hover:bg-blue-700 text-white"
        >
          + Create Assessment
        </button>
      </div>

      {/* Create Form */}
      {showCreateForm && (
        <div className={`rounded-lg border p-6 mb-6 ${isDark ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white'}`}>
          <h2 className="text-xl font-semibold mb-4">Create New Assessment</h2>
          <div className="space-y-4">
            <div>
              <label htmlFor="assessmentName" className="block text-sm font-medium mb-1">
                Assessment Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="assessmentName"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className={`w-full rounded-md border px-3 py-2 ${isDark ? 'border-slate-600 bg-slate-900 text-slate-100' : 'border-gray-300 bg-white text-gray-900'}`}
                placeholder="e.g., Frontend Developer Assessment"
              />
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="duration" className="block text-sm font-medium mb-1">
                  Duration (minutes) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  id="duration"
                  value={formData.duration}
                  onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) || 30 })}
                  className={`w-full rounded-md border px-3 py-2 ${isDark ? 'border-slate-600 bg-slate-900 text-slate-100' : 'border-gray-300 bg-white text-gray-900'}`}
                  min="1"
                />
              </div>
              <div>
                <label htmlFor="jobId" className="block text-sm font-medium mb-1">
                  Associated Job
                </label>
                <select
                  id="jobId"
                  value={formData.jobId}
                  onChange={(e) => setFormData({ ...formData, jobId: e.target.value })}
                  className={`w-full rounded-md border px-3 py-2 ${isDark ? 'border-slate-600 bg-slate-900 text-slate-100' : 'border-gray-300 bg-white text-gray-900'}`}
                >
                  <option value="">Select a job</option>
                  {jobs.map((j) => (
                    <option key={j.id} value={j.id}>{j.title}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              <button onClick={handleCreate}
                className="px-4 py-2 rounded-lg font-medium bg-blue-600 hover:bg-blue-700 text-white">
                Create Assessment
              </button>
              <button type="button" onClick={handleAiButtonClick} disabled={aiLoading}
                className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium bg-purple-600 hover:bg-purple-700 text-white disabled:opacity-50">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                {aiLoading ? 'Generating...' : 'AI Generate Questions'}
              </button>
              <button onClick={() => { setShowCreateForm(false); setShowAiQuestions(false); setAiQuestions([]); }}
                className={`px-4 py-2 rounded-lg font-medium border ${isDark ? 'border-slate-600 bg-slate-800 hover:bg-slate-700' : 'border-gray-300 bg-white hover:bg-gray-50'}`}>
                Cancel
              </button>
            </div>
            {aiError && <p className="mt-2 text-sm text-red-500">{aiError}</p>}

            {/* Count Prompt Modal */}
            {showCountPrompt && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowCountPrompt(false)}>
                <div className={`rounded-xl p-6 w-80 shadow-xl ${isDark ? 'bg-slate-800 border border-slate-700' : 'bg-white border border-gray-200'}`}
                  onClick={(e) => e.stopPropagation()}>
                  <h3 className="text-lg font-semibold mb-3">How many questions?</h3>
                  <input
                    type="number"
                    value={questionCount}
                    onChange={(e) => setQuestionCount(Math.min(10, Math.max(1, parseInt(e.target.value) || 1)))}
                    min={1}
                    max={10}
                    className={`w-full rounded-md border px-3 py-2 mb-4 ${isDark ? 'border-slate-600 bg-slate-900 text-slate-100' : 'border-gray-300 bg-white text-gray-900'}`}
                  />
                  <p className="text-xs opacity-60 mb-4">Max 10 questions per generation</p>
                  <div className="flex gap-2">
                    <button onClick={handleGenerateQuestions}
                      className="flex-1 px-4 py-2 rounded-lg font-medium bg-purple-600 hover:bg-purple-700 text-white">
                      Generate
                    </button>
                    <button onClick={() => setShowCountPrompt(false)}
                      className={`px-4 py-2 rounded-lg font-medium border ${isDark ? 'border-slate-600' : 'border-gray-300'}`}>
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* AI Generated Questions with ✅ ❌ controls */}
            {showAiQuestions && aiQuestions.length > 0 && (
              <div className={`mt-4 rounded-lg border p-4 ${isDark ? 'border-slate-600 bg-slate-900' : 'border-gray-200 bg-gray-50'}`}>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-sm">AI-Generated Questions ({aiQuestions.length})</h3>
                  <span className="text-xs opacity-60">{acceptedCount} accepted</span>
                </div>
                <div className="space-y-3 max-h-[500px] overflow-y-auto">
                  {aiQuestions.map((q, idx) => (
                    <div
                      key={idx}
                      className={`flex items-start gap-3 p-3 rounded-md border transition-colors ${
                        replacingIdx === idx ? 'opacity-50' : ''
                      } ${
                        q.accepted
                          ? isDark ? 'border-green-700 bg-green-900/10' : 'border-green-300 bg-green-50'
                          : isDark ? 'border-slate-600' : 'border-gray-200'
                      }`}
                    >
                      <div className="flex flex-col gap-1 shrink-0 mt-0.5">
                        <button
                          type="button"
                          onClick={() => handleAcceptQuestion(idx)}
                          title={q.accepted ? 'Accepted — click to toggle' : 'Click to accept'}
                          className={`text-lg leading-none ${q.accepted ? '' : 'opacity-40 hover:opacity-100'}`}
                        >
                          ✅
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveQuestion(idx)}
                          disabled={replacingIdx !== null}
                          title="Remove and replace with new question"
                          className="text-lg leading-none opacity-60 hover:opacity-100 disabled:opacity-30"
                        >
                          ❌
                        </button>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{q.question}</p>
                        {q.options && (
                          <div className="mt-2 grid grid-cols-2 gap-1">
                            {q.options.map((opt, oi) => (
                              <span key={oi} className={`text-xs px-2 py-1 rounded ${
                                oi === q.correct_index
                                  ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 font-medium'
                                  : 'opacity-60'
                              }`}>
                                {String.fromCharCode(65 + oi)}. {opt}
                              </span>
                            ))}
                          </div>
                        )}
                        {q.difficulty && (
                          <span className={`mt-1 inline-block text-xs px-2 py-0.5 rounded ${
                            q.difficulty === 'hard' ? 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400'
                            : q.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400'
                            : 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                          }`}>
                            {q.difficulty}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                {replacingIdx !== null && (
                  <p className="mt-2 text-xs text-purple-500 animate-pulse">Generating replacement question...</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Assessments List */}
      <div className="space-y-4">
        {assessments.length === 0 ? (
          <div className={`rounded-lg border p-12 text-center ${isDark ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white'}`}>
            <p className="text-lg opacity-75 mb-4">No assessments yet</p>
            <p className="text-sm opacity-60">Create assessments to test candidates with MCQ questions</p>
          </div>
        ) : (
          assessments.map((assessment) => (
            <div key={assessment.id}
              className={`rounded-lg border p-6 transition-all hover:shadow-lg ${isDark ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white'}`}>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h2 className="text-xl font-semibold mb-2">{assessment.name}</h2>
                  <div className="flex flex-wrap gap-4 text-sm opacity-75 mb-4">
                    <span>📋 {assessment.questions_count ?? 0} questions</span>
                    <span>⏱️ {assessment.duration_minutes} minutes</span>
                    <span>💼 {assessment.job_title ?? '-'}</span>
                    <span>📅 Created: {assessment.created_at ? new Date(assessment.created_at).toLocaleDateString() : '-'}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Link
                    to={`/recruiter/assessments/${assessment.id}`}
                    className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                      isDark ? 'border-slate-600 bg-slate-700 hover:bg-slate-600' : 'border-gray-300 bg-white hover:bg-gray-50'
                    }`}
                  >
                    Manage Questions
                  </Link>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
