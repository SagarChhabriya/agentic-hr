import { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTheme } from '../../contexts/ThemeContext';
import { assessmentsApi } from '../../services/api';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

export default function AssessmentAttemptPage() {
  const { assessmentId } = useParams<{ assessmentId: string }>();
  const [searchParams] = useSearchParams();
  const applicationId = searchParams.get('application_id');
  const navigate = useNavigate();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const queryClient = useQueryClient();

  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [submitted, setSubmitted] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ['assessment-for-attempt', assessmentId, applicationId],
    queryFn: () =>
      fetch(
        `${API_URL}/assessments/${assessmentId}/for-attempt?application_id=${applicationId}`,
        {
          headers: {
            Authorization: `Bearer ${await (window as any).__clerk_session?.getToken?.() || localStorage.getItem('accessToken')}`,
          },
        }
      ).then((r) => {
        if (!r.ok) throw new Error('Failed to load assessment');
        return r.json();
      }),
    enabled: !!assessmentId && !!applicationId,
  });

  const submitMutation = useMutation({
    mutationFn: (body: { application_id: string; assessment_id: string; answers: { question_id: string; selected_index: number }[] }) =>
      fetch(`${API_URL}/assessments/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
        body: JSON.stringify(body),
      }).then((r) => r.json()),
    onSuccess: () => {
      setSubmitted(true);
      queryClient.invalidateQueries({ queryKey: ['applications', 'mine'] });
    },
  });

  const handleSubmit = () => {
    if (!applicationId || !assessmentId || !data?.questions) return;
    const answersList = Object.entries(answers).map(([question_id, selected_index]) => ({
      question_id,
      selected_index,
    }));
    submitMutation.mutate({
      application_id: applicationId,
      assessment_id: assessmentId,
      answers: answersList,
    });
  };

  if (!applicationId) {
    return (
      <div className={`px-4 py-12 text-center ${isDark ? 'text-slate-100' : 'text-gray-900'}`}>
        <p className="text-red-500">Invalid assessment link. Please use the link from your email.</p>
        <button onClick={() => navigate('/candidate/dashboard')} className="mt-4 text-blue-600 underline">
          Go to Dashboard
        </button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[40vh]">
        <div className="text-slate-500">Loading assessment...</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className={`px-4 py-12 text-center ${isDark ? 'text-slate-100' : 'text-gray-900'}`}>
        <p className="text-red-500">Failed to load assessment. You may need to log in first.</p>
        <button onClick={() => navigate('/login')} className="mt-4 text-blue-600 underline">
          Log in
        </button>
      </div>
    );
  }

  if (submitted || submitMutation.isSuccess) {
    const result = submitMutation.data;
    return (
      <div className={`max-w-2xl mx-auto px-4 py-12 ${isDark ? 'text-slate-100' : 'text-gray-900'}`}>
        <h1 className="text-2xl font-bold mb-4">Assessment Submitted</h1>
        <div className={`rounded-lg border p-6 ${isDark ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white'}`}>
          <p className="text-green-600 dark:text-green-400 font-medium mb-4">Thank you! Your assessment has been submitted.</p>
          {result && (
            <div className="space-y-2 text-sm">
              <p>Score: {result.score_percent?.toFixed(1)}%</p>
              <p>Correct: {result.correct_count} / {result.total_questions}</p>
            </div>
          )}
        </div>
        <button
          onClick={() => navigate('/candidate/applications')}
          className="mt-6 px-6 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
        >
          View My Applications
        </button>
      </div>
    );
  }

  const questions = data.questions || [];

  return (
    <div className={`max-w-2xl mx-auto px-4 py-8 ${isDark ? 'text-slate-100' : 'text-gray-900'}`}>
      <h1 className="text-2xl font-bold mb-2">{data.name || data.assessment_name}</h1>
      <p className="text-sm opacity-75 mb-6">
        {data.job_title && `Job: ${data.job_title}`} · Duration: {data.duration_minutes} minutes
      </p>

      <div className="space-y-6">
        {questions.map((q: { id: string; question_text: string; options: string[] }, idx: number) => (
          <div
            key={q.id}
            className={`rounded-lg border p-6 ${isDark ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white'}`}
          >
            <p className="font-medium mb-4">
              {idx + 1}. {q.question_text}
            </p>
            <div className="space-y-2">
              {q.options?.map((opt: string, oi: number) => (
                <label
                  key={oi}
                  className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer border transition-colors ${
                    answers[q.id] === oi
                      ? isDark ? 'border-blue-500 bg-blue-900/20' : 'border-blue-500 bg-blue-50'
                      : isDark ? 'border-slate-600 hover:border-slate-500' : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    name={q.id}
                    checked={answers[q.id] === oi}
                    onChange={() => setAnswers((prev) => ({ ...prev, [q.id]: oi }))}
                    className="w-4 h-4"
                  />
                  <span>{String.fromCharCode(65 + oi)}. {opt}</span>
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 flex justify-between">
        <button onClick={() => navigate(-1)} className="px-6 py-2 rounded-lg border">
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={submitMutation.isPending || Object.keys(answers).length < questions.length}
          className="px-6 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {submitMutation.isPending ? 'Submitting...' : 'Submit Assessment'}
        </button>
      </div>
    </div>
  );
}
