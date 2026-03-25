import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { jobsApi, applicationsApi } from '../../services/api';

const JOB_TYPE_FILTERS = [
  { value: '', label: 'All Types' },
  { value: 'FULL_TIME', label: 'Full Time' },
  { value: 'PART_TIME', label: 'Part Time' },
  { value: 'CONTRACT', label: 'Contract' },
  { value: 'INTERNSHIP', label: 'Internship' },
  { value: 'REMOTE', label: 'Remote' },
];

interface PublicJob {
  id: string;
  title: string;
  description: string;
  salary?: string;
  location: string;
  job_type: string;
  employment_type: string;
  required_skills: string[];
  application_deadline?: string;
  company_name?: string;
  company_logo_url?: string | null;
}

function SkeletonCard() {
  return (
    <div className="rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 animate-pulse">
      <div className="h-5 bg-gray-200 dark:bg-slate-700 rounded w-3/4 mb-3" />
      <div className="flex gap-2 mb-4">
        <div className="h-3.5 bg-gray-100 dark:bg-slate-700/50 rounded w-20" />
        <div className="h-3.5 bg-gray-100 dark:bg-slate-700/50 rounded w-16" />
      </div>
      <div className="h-3 bg-gray-100 dark:bg-slate-700/50 rounded w-full mb-1.5" />
      <div className="h-3 bg-gray-100 dark:bg-slate-700/50 rounded w-4/5 mb-4" />
      <div className="flex gap-1.5">
        <div className="h-5 bg-indigo-50 dark:bg-indigo-900/20 rounded-md w-14" />
        <div className="h-5 bg-indigo-50 dark:bg-indigo-900/20 rounded-md w-18" />
        <div className="h-5 bg-indigo-50 dark:bg-indigo-900/20 rounded-md w-12" />
      </div>
    </div>
  );
}

function JobCard({ job, isApplied }: { job: PublicJob; isApplied: boolean }) {
  const deadline = job.application_deadline ? new Date(job.application_deadline) : null;
  const isExpired = deadline ? deadline < new Date() : false;
  const descSnippet = (job.description || '').slice(0, 130).trim() + ((job.description || '').length > 130 ? '…' : '');

  const daysUntilDeadline = deadline && !isExpired
    ? Math.ceil((deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  return (
    <Link
      to={isApplied || isExpired ? '#' : `/jobs/${job.id}`}
      onClick={isApplied || isExpired ? (e: React.MouseEvent) => e.preventDefault() : undefined}
      className={`group block rounded-xl border p-5 transition-all ${
        isApplied
          ? 'border-emerald-200 dark:border-emerald-800/50 bg-emerald-50/50 dark:bg-emerald-900/5 cursor-default'
          : isExpired
          ? 'border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/50 opacity-60 cursor-default'
          : 'border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-indigo-300 dark:hover:border-indigo-700 hover:shadow-md cursor-pointer'
      }`}
    >
      {/* Title row */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-start gap-3 min-w-0">
          {job.company_logo_url && job.company_name && job.company_name !== 'Hirebase' && (
            <img
              src={job.company_logo_url}
              alt=""
              className="w-10 h-10 rounded-lg object-cover border border-gray-100 dark:border-slate-600 shrink-0 bg-white mt-0.5"
            />
          )}
          <h3 className={`font-semibold leading-snug line-clamp-2 ${
            isApplied || isExpired
              ? 'text-gray-700 dark:text-slate-300'
              : 'text-gray-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors'
          }`}>
            {job.title}
          </h3>
        </div>
        {isApplied && (
          <span className="shrink-0 inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400">
            <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7"/>
            </svg>
            Applied
          </span>
        )}
        {isExpired && !isApplied && (
          <span className="shrink-0 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500 dark:bg-slate-700 dark:text-slate-400">
            Closed
          </span>
        )}
      </div>

      {job.company_name && job.company_name !== 'Hirebase' && (
        <p className="text-xs font-medium text-indigo-600 dark:text-indigo-400 mb-2">{job.company_name}</p>
      )}

      {/* Meta row */}
      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mb-3 text-xs text-gray-500 dark:text-slate-400">
        <span className="flex items-center gap-1">
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
          </svg>
          {job.location}
        </span>
        <span className="text-gray-300 dark:text-slate-600">·</span>
        <span>{job.job_type.replace(/_/g, ' ')}</span>
        {job.salary && (
          <>
            <span className="text-gray-300 dark:text-slate-600">·</span>
            <span className="font-medium text-gray-700 dark:text-slate-300">{job.salary}</span>
          </>
        )}
      </div>

      {/* Description snippet */}
      {descSnippet && (
        <p className="text-xs text-gray-500 dark:text-slate-400 leading-5 mb-3 line-clamp-2">{descSnippet}</p>
      )}

      {/* Skills */}
      {job.required_skills?.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {job.required_skills.slice(0, 4).map(skill => (
            <span key={skill} className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-800/50">
              {skill}
            </span>
          ))}
          {job.required_skills.length > 4 && (
            <span className="text-xs text-gray-400 dark:text-slate-500 self-center">+{job.required_skills.length - 4} more</span>
          )}
        </div>
      )}

      {/* Deadline / CTA */}
      <div className={`pt-3 border-t ${isApplied ? 'border-emerald-100 dark:border-emerald-800/30' : 'border-gray-100 dark:border-slate-700'} flex items-center justify-between`}>
        {daysUntilDeadline != null ? (
          <p className={`text-xs flex items-center gap-1 ${daysUntilDeadline <= 3 ? 'text-red-500 dark:text-red-400 font-medium' : 'text-amber-600 dark:text-amber-400'}`}>
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            {daysUntilDeadline <= 1 ? 'Closes tomorrow' : `${daysUntilDeadline}d left`}
          </p>
        ) : <span />}
        {!isApplied && !isExpired && (
          <span className="text-xs font-medium text-indigo-600 dark:text-indigo-400 group-hover:underline">
            View & Apply →
          </span>
        )}
      </div>
    </Link>
  );
}

export default function BrowseJobsPage() {
  const [search, setSearch] = useState('');
  const [location, setLocation] = useState('');
  const [jobType, setJobType] = useState('');

  const params = {
    ...(search && { search: search.trim() }),
    ...(location && { location: location.trim() }),
    ...(jobType && { job_type: jobType }),
  };

  const { data: jobs = [], isLoading } = useQuery({
    queryKey: ['jobs', 'public', params],
    queryFn: () => jobsApi.listPublic(params),
  });

  const { data: myApplications = [] } = useQuery({
    queryKey: ['myApplications'],
    queryFn: applicationsApi.mine,
  });

  const appliedJobIds = new Set(myApplications.map((app: { job_id: string }) => app.job_id));
  const hasActiveFilters = search || location || jobType;

  return (
    <div className="px-4 py-8">
      <div className="max-w-6xl mx-auto">

        {/* Page header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Browse Jobs</h1>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">
            Discover open positions and find your next opportunity
          </p>
        </div>

        {/* Search + filters card */}
        <div className="rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm p-4 mb-6">
          {/* Search inputs row */}
          <div className="flex flex-col sm:flex-row gap-3 mb-3">
            <div className="relative flex-1">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35m0 0A7.5 7.5 0 104.5 4.5a7.5 7.5 0 0012.15 12.15z"/>
              </svg>
              <input
                type="search"
                placeholder="Search by job title or skill…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 text-sm rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 placeholder:text-gray-400 dark:placeholder:text-slate-500 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
            <div className="relative sm:w-48">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
              </svg>
              <input
                type="text"
                placeholder="Location"
                value={location}
                onChange={e => setLocation(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 text-sm rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 placeholder:text-gray-400 dark:placeholder:text-slate-500 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Job type pill filters */}
          <div className="flex flex-wrap gap-2">
            {JOB_TYPE_FILTERS.map(t => (
              <button
                key={t.value}
                onClick={() => setJobType(t.value)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                  jobType === t.value
                    ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm'
                    : 'border-gray-200 dark:border-slate-600 text-gray-600 dark:text-slate-400 hover:border-indigo-400 dark:hover:border-indigo-600 hover:text-indigo-600 dark:hover:text-indigo-400 bg-white dark:bg-slate-800'
                }`}
              >
                {t.label}
              </button>
            ))}
            {hasActiveFilters && (
              <button
                onClick={() => { setSearch(''); setLocation(''); setJobType(''); }}
                className="px-3 py-1.5 rounded-full text-xs font-medium border border-dashed border-red-300 dark:border-red-700 text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              >
                Clear ✕
              </button>
            )}
          </div>
        </div>

        {/* Results summary */}
        {!isLoading && (
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-gray-500 dark:text-slate-400">
              {jobs.length > 0
                ? `${jobs.length} position${jobs.length !== 1 ? 's' : ''} found`
                : 'No positions found'}
            </p>
            {appliedJobIds.size > 0 && (
              <p className="text-xs text-emerald-600 dark:text-emerald-400">
                {appliedJobIds.size} already applied
              </p>
            )}
          </div>
        )}

        {/* Job grid */}
        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : jobs.length === 0 ? (
          <div className="rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 py-20 text-center">
            <svg className="mx-auto w-10 h-10 text-gray-300 dark:text-slate-600 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-4.35-4.35m0 0A7.5 7.5 0 104.5 4.5a7.5 7.5 0 0012.15 12.15z"/>
            </svg>
            <p className="text-sm text-gray-500 dark:text-slate-400 mb-2">No jobs found</p>
            {hasActiveFilters && (
              <button
                onClick={() => { setSearch(''); setLocation(''); setJobType(''); }}
                className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                Clear all filters
              </button>
            )}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {(jobs as PublicJob[]).map(job => (
              <JobCard key={job.id} job={job} isApplied={appliedJobIds.has(job.id)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
