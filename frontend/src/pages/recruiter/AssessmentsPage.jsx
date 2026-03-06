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
    },
  });

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    questions: [],
    duration: 30,
    jobId: '',
  });
  const [showAiQuestions, setShowAiQuestions] = useState(false);
  const [aiQuestions, setAiQuestions] = useState([]);
  const [selectedAiQuestions, setSelectedAiQuestions] = useState([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');

  const handleGenerateQuestions = async () => {
    const selectedJob = jobs.find((j) => j.id === formData.jobId);
    if (!selectedJob && !formData.name) {
      setAiError('Select a job or enter a name first');
      return;
    }
    setAiLoading(true);
    setAiError('');
    try {
      const result = await aiApi.generateQuestions({
        job_title: selectedJob?.title || formData.name,
        job_description: selectedJob?.description || '',
        skills: selectedJob?.required_skills || [],
        count: 10,
      });
      setAiQuestions(result.questions || []);
      setSelectedAiQuestions([]);
      setShowAiQuestions(true);
    } catch (err) {
      setAiError(err?.response?.data?.detail || 'AI generation failed');
    } finally {
      setAiLoading(false);
    }
  };

  const toggleAiQuestion = (idx) => {
    setSelectedAiQuestions((prev) =>
      prev.includes(idx) ? prev.filter((i) => i !== idx) : [...prev, idx]
    );
  };

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
          className={`px-6 py-3 rounded-lg font-medium transition-colors ${
            isDark
              ? 'bg-blue-600 hover:bg-blue-700 text-white'
              : 'bg-blue-600 hover:bg-blue-700 text-white'
          }`}
        >
          + Create Assessment
        </button>
      </div>

      {/* Create Form */}
      {showCreateForm && (
        <div
          className={`rounded-lg border p-6 mb-6 ${
            isDark ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white'
          }`}
        >
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
                className={`w-full rounded-md border px-3 py-2 ${
                  isDark
                    ? 'border-slate-600 bg-slate-900 text-slate-100'
                    : 'border-gray-300 bg-white text-gray-900'
                }`}
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
                  onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) })}
                  className={`w-full rounded-md border px-3 py-2 ${
                    isDark
                      ? 'border-slate-600 bg-slate-900 text-slate-100'
                      : 'border-gray-300 bg-white text-gray-900'
                  }`}
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
                  className={`w-full rounded-md border px-3 py-2 ${
                    isDark
                      ? 'border-slate-600 bg-slate-900 text-slate-100'
                      : 'border-gray-300 bg-white text-gray-900'
                  }`}
                >
                  <option value="">Select a job</option>
                  {jobs.map((j) => (
                    <option key={j.id} value={j.id}>{j.title}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={handleCreate}
                className={`px-4 py-2 rounded-lg font-medium ${
                  isDark
                    ? 'bg-blue-600 hover:bg-blue-700 text-white'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                Create Assessment
              </button>
              <button
                type="button"
                onClick={handleGenerateQuestions}
                disabled={aiLoading}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium ${
                  isDark
                    ? 'bg-purple-600 hover:bg-purple-700 text-white'
                    : 'bg-purple-600 hover:bg-purple-700 text-white'
                } disabled:opacity-50`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                {aiLoading ? 'Generating...' : 'AI Generate Questions'}
              </button>
              <button
                onClick={() => setShowCreateForm(false)}
                className={`px-4 py-2 rounded-lg font-medium border ${
                  isDark
                    ? 'border-slate-600 bg-slate-800 hover:bg-slate-700'
                    : 'border-gray-300 bg-white hover:bg-gray-50'
                }`}
              >
                Cancel
              </button>
            </div>
            {aiError && <p className="mt-2 text-sm text-red-500">{aiError}</p>}

            {/* AI Generated Questions */}
            {showAiQuestions && aiQuestions.length > 0 && (
              <div className={`mt-4 rounded-lg border p-4 ${isDark ? 'border-slate-600 bg-slate-900' : 'border-gray-200 bg-gray-50'}`}>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-sm">AI-Generated Questions ({aiQuestions.length})</h3>
                  <span className="text-xs opacity-60">
                    {selectedAiQuestions.length} selected
                  </span>
                </div>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {aiQuestions.map((q, idx) => (
                    <label
                      key={idx}
                      className={`flex items-start gap-3 p-3 rounded-md border cursor-pointer transition-colors ${
                        selectedAiQuestions.includes(idx)
                          ? isDark ? 'border-purple-500 bg-purple-900/20' : 'border-purple-500 bg-purple-50'
                          : isDark ? 'border-slate-600 hover:border-slate-500' : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedAiQuestions.includes(idx)}
                        onChange={() => toggleAiQuestion(idx)}
                        className="mt-1 w-4 h-4"
                      />
                      <div className="flex-1">
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
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Assessments List */}
      <div className="space-y-4">
        {assessments.length === 0 ? (
          <div
            className={`rounded-lg border p-12 text-center ${
              isDark ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white'
            }`}
          >
            <p className="text-lg opacity-75 mb-4">No assessments yet</p>
            <p className="text-sm opacity-60">
              Create assessments to test candidates with MCQ questions
            </p>
          </div>
        ) : (
          assessments.map((assessment) => (
            <div
              key={assessment.id}
              className={`rounded-lg border p-6 transition-all hover:shadow-lg ${
                isDark ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white'
              }`}
            >
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
                      isDark
                        ? 'border-slate-600 bg-slate-700 hover:bg-slate-600'
                        : 'border-gray-300 bg-white hover:bg-gray-50'
                    }`}
                  >
                    Manage Questions
                  </Link>
                  <button
                    className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                      isDark
                        ? 'border-slate-600 bg-slate-700 hover:bg-slate-600'
                        : 'border-gray-300 bg-white hover:bg-gray-50'
                    }`}
                  >
                    Edit
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
