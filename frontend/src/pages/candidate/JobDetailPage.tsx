import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { jobsApi, applicationsApi } from '../../services/api';

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
  company_description?: string | null;
  company_website?: string | null;
  company_logo_url?: string | null;
  company_industry?: string | null;
  company_headquarters?: string | null;
  custom_questions: CustomQuestion[];
}

function CopyLinkButton({ jobId }: { jobId: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(`${window.location.origin}/jobs/${jobId}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={copy}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-gray-200 dark:border-slate-600 text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors">
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/>
      </svg>
      {copied ? 'Copied!' : 'Copy Link'}
    </button>
  );
}

export default function JobDetailPage() {
  const { id } = useParams<{ id: string }>();

  const { data: job, isLoading, isError } = useQuery({
    queryKey: ['jobs', 'public', id],
    queryFn: () => jobsApi.getPublic(id!),
    enabled: !!id,
  });

  const { data: myApplications = [] } = useQuery({
    queryKey: ['myApplications'],
    queryFn: applicationsApi.mine,
  });

  if (!id) {
    return <div className="px-4 py-8 text-center text-slate-600 dark:text-slate-400">Invalid job ID.</div>;
  }

  if (isLoading) {
    return (
      <div className="px-4 py-8 max-w-5xl mx-auto">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-24 mb-6" />
          <div className="rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6">
            <div className="h-7 bg-gray-200 dark:bg-slate-700 rounded w-2/3 mb-4" />
            <div className="flex gap-2 mb-6">
              <div className="h-6 bg-gray-100 dark:bg-slate-700/50 rounded-lg w-24" />
              <div className="h-6 bg-gray-100 dark:bg-slate-700/50 rounded-lg w-20" />
              <div className="h-6 bg-gray-100 dark:bg-slate-700/50 rounded-lg w-16" />
            </div>
            <div className="space-y-2">
              <div className="h-3 bg-gray-100 dark:bg-slate-700/50 rounded w-full" />
              <div className="h-3 bg-gray-100 dark:bg-slate-700/50 rounded w-full" />
              <div className="h-3 bg-gray-100 dark:bg-slate-700/50 rounded w-4/5" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isError || !job) {
    return (
      <div className="px-4 py-8 text-center">
        <p className="text-slate-500 dark:text-slate-400 mb-3 text-sm">Job not found or no longer available.</p>
        <Link to="/jobs" className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline">← Back to jobs</Link>
      </div>
    );
  }

  const typedJob = job as PublicJob;
  if (typedJob.title) document.title = `${typedJob.title} — Hirebase`;

  const deadline = typedJob.application_deadline ? new Date(typedJob.application_deadline) : null;
  const isClosed = deadline ? deadline < new Date() : false;
  const daysLeft = deadline && !isClosed ? Math.ceil((deadline.getTime() - Date.now()) / 86400000) : null;
  const isAlreadyApplied = (myApplications as { job_id: string }[]).some(a => a.job_id === typedJob.id);

  const META_ITEMS = [
    typedJob.location && {
      icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>,
      label: typedJob.location,
    },
    typedJob.job_type && {
      icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>,
      label: typedJob.job_type.replace(/_/g, ' '),
    },
    typedJob.salary && {
      icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>,
      label: typedJob.salary,
    },
    typedJob.experience_required && {
      icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"/>,
      label: typedJob.experience_required,
    },
    typedJob.company_name && {
      icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-2 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>,
      label: typedJob.company_name,
    },
  ].filter(Boolean) as { icon: React.ReactNode; label: string }[];

  const requirementLines = typedJob.requirements
    ? typedJob.requirements.split('\n').map(l => l.replace(/^[\s\u2022\u25CF\u25AA\u25B8\u25BA\u25C6\u00B7\u2023\u2013\u2014\-*✓►]+/, '').trim()).filter(Boolean)
    : [];

  return (
    <div className="px-4 py-6">
      <div className="max-w-5xl mx-auto">
        {/* Breadcrumb */}
        <Link to="/jobs"
          className="inline-flex items-center gap-1 text-xs text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300 mb-5 transition-colors">
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/>
          </svg>
          Back to jobs
        </Link>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Main content */}
          <div className="flex-1 min-w-0">

            {/* Header card */}
            <div className="rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden mb-5 shadow-sm">
              <div className="h-1 w-full bg-gradient-to-r from-indigo-500 to-violet-600" />
              <div className="p-6">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100 mb-4">{typedJob.title}</h1>

                {/* Meta chips */}
                <div className="flex flex-wrap gap-2 mb-5">
                  {META_ITEMS.map((item, i) => (
                    <span key={i} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium bg-gray-100 dark:bg-slate-700/60 text-gray-600 dark:text-slate-300">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">{item.icon}</svg>
                      {item.label}
                    </span>
                  ))}
                  {deadline && !isClosed && (
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium ${
                      (daysLeft ?? 99) <= 3
                        ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400'
                        : 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400'
                    }`}>
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                      </svg>
                      {daysLeft != null && daysLeft <= 1 ? 'Closes tomorrow' : `${daysLeft}d left`}
                    </span>
                  )}
                  {isClosed && (
                    <span className="inline-flex items-center px-3 py-1 rounded-lg text-xs font-medium bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-slate-400">
                      Applications Closed
                    </span>
                  )}
                </div>

                {/* Skills */}
                {typedJob.required_skills?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {typedJob.required_skills.map(skill => (
                      <span key={skill} className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-800/50">
                        {skill}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Description */}
            <div className="rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 mb-5 shadow-sm">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400 mb-3">
                About this role
              </h2>
              <div className="space-y-2.5 text-sm text-gray-700 dark:text-slate-300 leading-7">
                {typedJob.description.split('\n').filter(p => p.trim()).map((p, i) => (
                  <p key={i}>{p.trim()}</p>
                ))}
              </div>
            </div>

            {/* Requirements */}
            {requirementLines.length > 0 && (
              <div className="rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 mb-5 shadow-sm">
                <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400 mb-3">
                  Requirements
                </h2>
                <ul className="space-y-2">
                  {requirementLines.map((line, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-700 dark:text-slate-300">
                      <svg className="w-4 h-4 mt-0.5 shrink-0 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                      </svg>
                      {line}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Company — verified employer info only (no screening questions on this page) */}
            {typedJob.company_name && typedJob.company_name !== 'Hirebase' && (
              <div className="rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 mb-5 shadow-sm">
                <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400 mb-3">
                  About the company
                </h2>
                <div className="flex flex-col sm:flex-row gap-4">
                  {typedJob.company_logo_url && (
                    <img
                      src={typedJob.company_logo_url}
                      alt=""
                      className="w-16 h-16 rounded-xl object-cover border border-gray-100 dark:border-slate-600 shrink-0 bg-white"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-gray-900 dark:text-slate-100">{typedJob.company_name}</p>
                    <div className="flex flex-wrap gap-2 mt-1 text-xs text-gray-500 dark:text-slate-400">
                      {typedJob.company_industry && <span>{typedJob.company_industry}</span>}
                      {typedJob.company_headquarters && (
                        <>
                          {typedJob.company_industry && <span>·</span>}
                          <span>{typedJob.company_headquarters}</span>
                        </>
                      )}
                    </div>
                    {typedJob.company_description && (
                      <p className="text-sm text-gray-600 dark:text-slate-300 mt-4 leading-relaxed whitespace-pre-wrap">
                        {typedJob.company_description}
                      </p>
                    )}
                    {typedJob.company_website && (
                      <a
                        href={typedJob.company_website.startsWith('http') ? typedJob.company_website : `https://${typedJob.company_website}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 mt-3 text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
                      >
                        Visit website
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg>
                      </a>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Share */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-gray-400 dark:text-slate-500">Share:</span>
              <a href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(`${window.location.origin}/jobs/${typedJob.id}`)}`}
                target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-gray-200 dark:border-slate-600 text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors">
                LinkedIn
              </a>
              <a href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(`${window.location.origin}/jobs/${typedJob.id}`)}&text=${encodeURIComponent(`${typedJob.title} — Apply now!`)}`}
                target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-gray-200 dark:border-slate-600 text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors">
                Twitter
              </a>
              <CopyLinkButton jobId={typedJob.id} />
            </div>
          </div>

          {/* Sticky apply sidebar */}
          <div className="lg:w-64 xl:w-72 shrink-0">
            <div className="lg:sticky lg:top-6">
              <div className="rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 shadow-sm">
                <h3 className="font-semibold text-gray-900 dark:text-slate-100 mb-1">{typedJob.title}</h3>
                <p className="text-xs text-gray-500 dark:text-slate-400 mb-4">
                  {typedJob.company_name || 'Hirebase'} · {typedJob.location}
                </p>

                {isAlreadyApplied ? (
                  <div className="rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/50 px-4 py-3 text-center mb-4">
                    <svg className="w-5 h-5 text-emerald-500 mx-auto mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                    <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">Application Submitted</p>
                    <Link to="/candidate/applications" className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline mt-1 block">
                      View my applications →
                    </Link>
                  </div>
                ) : isClosed ? (
                  <div className="w-full px-4 py-3 rounded-lg bg-gray-100 dark:bg-slate-700 text-center text-sm font-medium text-gray-500 dark:text-slate-400 mb-4">
                    Applications Closed
                  </div>
                ) : (
                  <Link to={`/jobs/${typedJob.id}/apply`}
                    className="flex items-center justify-center gap-2 w-full px-4 py-3 rounded-lg text-sm font-semibold bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white transition-all shadow-sm hover:shadow-md mb-4">
                    Apply Now
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/>
                    </svg>
                  </Link>
                )}

                {/* Checklist */}
                <div className="space-y-2">
                  {[
                    'Profile + resume required',
                    typedJob.cover_letter_required ? 'Cover letter required' : 'Cover letter optional',
                    'Screening questions appear only after you start the application',
                  ].filter(Boolean).map((item, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-gray-500 dark:text-slate-400">
                      <svg className="w-3.5 h-3.5 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                      </svg>
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
