import { useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { jobsApi, applicationsApi } from '../../services/api';
import axios from 'axios';

type CustomQuestion = { id: string; question: string; type: string; required: boolean };
type JobData = {
  id: string;
  title: string;
  description: string;
  location: string;
  cover_letter_required: boolean;
  custom_questions: CustomQuestion[];
};

function CustomQuestionInput({
  q,
  value,
  onChange,
}: {
  q: CustomQuestion;
  value: string;
  onChange: (val: string) => void;
}) {
  const baseInput =
    'w-full px-3 py-2 rounded-lg border bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-600 text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent';
  if (q.type === 'TEXT') {
    return (
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={q.question}
        required={q.required}
        className={baseInput}
      />
    );
  }
  if (q.type === 'TEXTAREA') {
    return (
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={q.question}
        required={q.required}
        rows={3}
        className={baseInput}
      />
    );
  }
  if (q.type === 'NUMBER') {
    return (
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={q.question}
        required={q.required}
        className={baseInput}
      />
    );
  }
  if (q.type === 'YES_NO') {
    return (
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={q.required}
        className={baseInput}
      >
        <option value="">Select...</option>
        <option value="yes">Yes</option>
        <option value="no">No</option>
      </select>
    );
  }
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e)}
      placeholder={q.question}
      required={q.required}
      className={baseInput}
    />
  );
}

export default function ApplyJobPage() {
  const params = useParams<{ job_id?: string; id?: string }>();
  const job_id = params.job_id ?? params.id;
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [coverLetter, setCoverLetter] = useState('');
  const [customAnswers, setCustomAnswers] = useState<Record<string, string>>({});

  const {
    data: job,
    isLoading: jobLoading,
    error: jobError,
  } = useQuery({
    queryKey: ['job-public', job_id],
    queryFn: () => jobsApi.getPublic(job_id!),
    enabled: !!job_id,
  });

  const applyMutation = useMutation({
    mutationFn: (body: { job_id: string; cover_letter?: string; custom_answers?: Record<string, string> }) =>
      applicationsApi.apply(body),
  });

  const updateAnswer = useCallback((questionId: string, value: string) => {
    setCustomAnswers((prev) => ({ ...prev, [questionId]: value }));
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!job_id || !job) return;
    const cover = job.cover_letter_required ? coverLetter : (coverLetter || undefined);
    applyMutation.mutate(
      {
        job_id,
        cover_letter: cover,
        custom_answers: Object.keys(customAnswers).length ? customAnswers : undefined,
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ['applications', 'mine'] });
          navigate('/candidate/applications', { state: { message: 'Application submitted successfully!' } });
        },
        onError: (err) => {
          if (axios.isAxiosError(err) && err.response?.status === 409) {
            applyMutation.reset();
          }
        },
      }
    );
  };

  const is409 = axios.isAxiosError(applyMutation.error) && applyMutation.error.response?.status === 409;

  if (jobLoading || !job_id) {
    return (
      <div className="flex justify-center items-center min-h-[40vh]">
        <div className="text-gray-600 dark:text-slate-400">Loading job...</div>
      </div>
    );
  }

  if (jobError || !job) {
    return (
      <div className="max-w-2xl mx-auto px-4">
        <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 p-6 text-red-700 dark:text-red-300">
          Job not found or no longer available.
        </div>
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="mt-4 text-blue-600 dark:text-blue-400 hover:underline"
        >
          Go back
        </button>
      </div>
    );
  }

  const jobData = job as JobData;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100 mb-2">
        Apply: {jobData.title}
      </h1>
      <p className="text-gray-600 dark:text-slate-400 mb-6">{jobData.location}</p>

      {is409 && (
        <div className="mb-6 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 p-4 text-amber-800 dark:text-amber-200">
          You have already applied to this job.
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label
            htmlFor="cover_letter"
            className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1"
          >
            Cover letter {jobData.cover_letter_required && <span className="text-red-500">*</span>}
          </label>
          <textarea
            id="cover_letter"
            value={coverLetter}
            onChange={(e) => setCoverLetter(e.target.value)}
            rows={4}
            required={jobData.cover_letter_required}
            placeholder="Introduce yourself and explain why you're a fit..."
            className="w-full px-3 py-2 rounded-lg border bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-600 text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {jobData.custom_questions?.map((q) => (
          <div key={q.id}>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
              {q.question} {q.required && <span className="text-red-500">*</span>}
            </label>
            <CustomQuestionInput
              q={q}
              value={customAnswers[q.id] ?? ''}
              onChange={(v) => updateAnswer(q.id, v)}
            />
          </div>
        ))}

        {applyMutation.isError && !is409 && (
          <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 p-4 text-red-700 dark:text-red-300 text-sm">
            Something went wrong. Please try again.
          </div>
        )}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={applyMutation.isPending}
            className="px-6 py-2.5 rounded-lg font-medium bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white transition-colors"
          >
            {applyMutation.isPending ? 'Submitting...' : 'Submit Application'}
          </button>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="px-6 py-2.5 rounded-lg font-medium border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-200 transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
