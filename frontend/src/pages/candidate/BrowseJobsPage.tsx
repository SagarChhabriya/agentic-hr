import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { jobsApi, applicationsApi } from '../../services/api';

const JOB_TYPES = ['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERNSHIP', 'REMOTE'];

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
}

function JobCard({ job, isApplied }: { job: PublicJob; isApplied: boolean }) {
  const deadline = job.application_deadline
    ? new Date(job.application_deadline).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : null;

  return (
    <Link
      to={isApplied ? '#' : `/jobs/${job.id}`}
      onClick={isApplied ? (e: React.MouseEvent) => e.preventDefault() : undefined}
      className={`block rounded-xl border p-5 transition-colors shadow-sm ${
        isApplied
          ? 'border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-900/10 cursor-default'
          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-blue-500 dark:hover:border-blue-500 hover:shadow-md'
      }`}
    >
      <div className="flex items-start justify-between">
        <h3 className="font-semibold text-lg text-slate-900 dark:text-slate-100 mb-2 line-clamp-1">
          {job.title}
        </h3>
        {isApplied && (
          <span className="shrink-0 ml-2 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-400">
            Applied
          </span>
        )}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-600 dark:text-slate-400 mb-3">
        <span>{job.location}</span>
        {job.salary && <span>{job.salary}</span>}
        <span>{job.job_type.replace('_', ' ')}</span>
        <span>{job.employment_type}</span>
      </div>
      {job.required_skills?.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {job.required_skills.slice(0, 5).map((skill) => (
            <span
              key={skill}
              className="inline-flex items-center rounded-md bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-0.5 text-xs font-medium"
            >
              {skill}
            </span>
          ))}
          {job.required_skills.length > 5 && (
            <span className="text-xs text-slate-500 dark:text-slate-400">+{job.required_skills.length - 5}</span>
          )}
        </div>
      )}
      {deadline && (
        <p className="text-xs text-slate-500 dark:text-slate-400">Deadline: {deadline}</p>
      )}
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

  const { data: jobs = [], isLoading, isFetching } = useQuery({
    queryKey: ['jobs', 'public', params],
    queryFn: () => jobsApi.listPublic(params),
  });

  const { data: myApplications = [] } = useQuery({
    queryKey: ['myApplications'],
    queryFn: applicationsApi.mine,
  });

  const appliedJobIds = new Set(
    myApplications.map((app: { job_id: string }) => app.job_id)
  );

  return (
    <div className="px-4 py-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-8">
          Browse Jobs
        </h1>

        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <input
            type="search"
            placeholder="Search by job title..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-4 py-2.5 text-slate-900 dark:text-slate-100 placeholder:text-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <input
            type="text"
            placeholder="Location"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-4 py-2.5 text-slate-900 dark:text-slate-100 placeholder:text-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <select
            value={jobType}
            onChange={(e) => setJobType(e.target.value)}
            className="rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-4 py-2.5 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All types</option>
            {JOB_TYPES.map((t) => (
              <option key={t} value={t}>
                {t.replace('_', ' ')}
              </option>
            ))}
          </select>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-slate-500 dark:text-slate-400">Loading jobs...</div>
          </div>
        ) : (
          <>
            {isFetching && !isLoading && (
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">Updating...</p>
            )}
            {jobs.length === 0 ? (
              <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-12 text-center">
                <p className="text-slate-600 dark:text-slate-400 mb-2">No jobs found</p>
                <p className="text-sm text-slate-500 dark:text-slate-500">
                  Try adjusting your search or filters.
                </p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {jobs.map((job: PublicJob) => (
                  <JobCard key={job.id} job={job} isApplied={appliedJobIds.has(job.id)} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
