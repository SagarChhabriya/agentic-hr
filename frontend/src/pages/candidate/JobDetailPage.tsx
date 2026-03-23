import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { jobsApi } from '../../services/api';

interface CustomQuestion {
  id: string;
  question: string;
  type: string;
  required: boolean;
}

interface PublicJob {
  id: string;
  title: string;
  description: string;
  salary?: string;
  location: string;
  job_type: string;
  employment_type: string;
  experience_required?: string;
  required_skills: string[];
  requirements?: string;
  application_deadline?: string;
  cover_letter_required: boolean;
  company_name?: string;
  custom_questions: CustomQuestion[];
}

function ShareButtons({ title, jobId }: { title: string; jobId: string }) {
  const [copied, setCopied] = useState(false);
  const jobUrl = `${window.location.origin}/jobs/${jobId}`;
  const encodedUrl = encodeURIComponent(jobUrl);
  const encodedTitle = encodeURIComponent(`${title} - Apply now!`);

  const copy = async () => {
    await navigator.clipboard.writeText(jobUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const btnClass = "inline-flex items-center gap-1.5 rounded-md border border-slate-300 dark:border-slate-600 px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors";

  return (
    <div className="flex flex-wrap gap-2">
      <a href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`} target="_blank" rel="noopener noreferrer" className={btnClass}>LinkedIn</a>
      <a href={`https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`} target="_blank" rel="noopener noreferrer" className={btnClass}>Twitter</a>
      <a href={`mailto:?subject=${encodedTitle}&body=Check out this job: ${encodedUrl}`} className={btnClass}>Email</a>
      <button onClick={copy} className={btnClass}>{copied ? 'Copied!' : 'Copy Link'}</button>
    </div>
  );
}

export default function JobDetailPage() {
  const { id } = useParams<{ id: string }>();

  const { data: job, isLoading, isError } = useQuery({
    queryKey: ['jobs', 'public', id],
    queryFn: () => jobsApi.getPublic(id!),
    enabled: !!id,
  });

  if (!id) {
    return (
      <div className="px-4 py-8 text-center text-slate-600 dark:text-slate-400">
        Invalid job ID.
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="px-4 py-8 flex justify-center">
        <div className="text-slate-500 dark:text-slate-400">Loading job details...</div>
      </div>
    );
  }

  if (isError || !job) {
    return (
      <div className="px-4 py-8 text-center">
        <p className="text-slate-600 dark:text-slate-400 mb-4">Job not found.</p>
        <Link
          to="/jobs"
          className="text-blue-600 dark:text-blue-400 hover:underline"
        >
          ← Back to jobs
        </Link>
      </div>
    );
  }

  const typedJob = job as PublicJob;
  const deadline = typedJob.application_deadline
    ? new Date(typedJob.application_deadline)
    : null;
  const isClosed = deadline ? deadline < new Date() : false;

  if (typedJob.title) {
    document.title = `${typedJob.title} - Hirebase`;
  }

  return (
    <div className="px-4 py-8">
      <div className="max-w-3xl mx-auto">
        <Link
          to="/jobs"
          className="inline-flex items-center text-sm text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 mb-6"
        >
          ← Back to jobs
        </Link>

        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden">
          <div className="p-6 sm:p-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100 mb-4">
              {typedJob.title}
            </h1>

            <div className="flex flex-wrap gap-x-6 gap-y-2 text-slate-600 dark:text-slate-400 mb-6">
              <span>{typedJob.location}</span>
              {typedJob.salary && <span>{typedJob.salary}</span>}
              <span>{typedJob.job_type.replace('_', ' ')}</span>
              <span>{typedJob.employment_type}</span>
              {typedJob.company_name && (
                <span className="text-slate-700 dark:text-slate-300">
                  {typedJob.company_name}
                </span>
              )}
              {deadline && (
                <span>
                  Deadline: {deadline.toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </span>
              )}
            </div>

            {typedJob.required_skills?.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-6">
                {typedJob.required_skills.map((skill) => (
                  <span
                    key={skill}
                    className="inline-flex items-center rounded-md bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-3 py-1 text-sm font-medium"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            )}

            <div className="space-y-3 mb-6 text-slate-700 dark:text-slate-300 leading-relaxed">
              {typedJob.description.split('\n').filter((p) => p.trim()).map((p, i) => (
                <p key={i}>{p.trim()}</p>
              ))}
            </div>

            {typedJob.requirements && (
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
                  Requirements
                </h2>
                <div className="space-y-2 text-slate-700 dark:text-slate-300 text-sm leading-relaxed">
                  {typedJob.requirements.split('\n').filter((p) => p.trim()).map((p, i) => (
                    <p key={i}>{p.trim()}</p>
                  ))}
                </div>
              </div>
            )}

            {typedJob.experience_required && (
              <p className="mb-6 text-slate-600 dark:text-slate-400">
                <span className="font-medium text-slate-900 dark:text-slate-100">
                  Experience:
                </span>{' '}
                {typedJob.experience_required}
              </p>
            )}

            {typedJob.custom_questions?.length > 0 && (
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-3">
                  Application questions
                </h2>
                <ul className="space-y-2">
                  {typedJob.custom_questions.map((q) => (
                    <li
                      key={q.id}
                      className="flex items-start gap-2 text-slate-600 dark:text-slate-400"
                    >
                      <span>{q.question}</span>
                      {q.required && (
                        <span className="text-red-500 text-xs">*required</span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="pt-6 border-t border-slate-200 dark:border-slate-700 flex flex-wrap items-center gap-3">
              {isClosed ? (
                <div className="inline-flex items-center rounded-lg bg-slate-100 dark:bg-slate-700 px-4 py-2.5 text-slate-700 dark:text-slate-300 font-medium">
                  Applications Closed
                </div>
              ) : (
                <Link
                  to={`/jobs/${typedJob.id}/apply`}
                  className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-6 py-3 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
                >
                  Apply Now
                </Link>
              )}
              <ShareButtons title={typedJob.title} jobId={typedJob.id} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
