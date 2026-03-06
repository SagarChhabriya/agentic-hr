import { useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTheme } from '../../contexts/ThemeContext';
import { jobsApi } from '../../services/api';

const SITE_URL = 'https://hire-base.vercel.app';

export default function RecruiterJobDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const queryClient = useQueryClient();
  const [copied, setCopied] = useState(false);

  const { data: job, isLoading, error } = useQuery({
    queryKey: ['job', id],
    queryFn: () => jobsApi.get(id),
    enabled: !!id,
  });

  const deleteMutation = useMutation({
    mutationFn: () => jobsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      navigate('/recruiter/jobs');
    },
  });

  const statusMutation = useMutation({
    mutationFn: (status) => jobsApi.update(id, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['job', id] }),
  });

  const copyLink = () => {
    navigator.clipboard.writeText(`${SITE_URL}/jobs/${id}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isLoading) {
    return (
      <div className={`px-4 py-8 ${isDark ? 'text-slate-100' : 'text-gray-900'}`}>
        <div className="flex justify-center py-12">Loading job details...</div>
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className={`px-4 py-8 ${isDark ? 'text-slate-100' : 'text-gray-900'}`}>
        <div className="text-center py-12">
          <p className="text-red-500 mb-4">Job not found or failed to load.</p>
          <Link to="/recruiter/jobs" className="text-blue-600 dark:text-blue-400 hover:underline">
            ← Back to jobs
          </Link>
        </div>
      </div>
    );
  }

  const jobUrl = `${SITE_URL}/jobs/${id}`;
  const shareText = encodeURIComponent(`We're hiring: ${job.title}! Apply now:`);

  return (
    <div className={`px-4 py-8 max-w-4xl mx-auto ${isDark ? 'text-slate-100' : 'text-gray-900'}`}>
      <Link
        to="/recruiter/jobs"
        className="inline-flex items-center text-sm text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 mb-6"
      >
        ← Back to jobs
      </Link>

      {/* Header */}
      <div className={`rounded-lg border p-6 mb-6 ${isDark ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white'}`}>
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold mb-2">{job.title}</h1>
            <div className="flex flex-wrap gap-3 text-sm opacity-75">
              <span>📍 {job.location}</span>
              <span>💼 {job.job_type?.replace('_', ' ')}</span>
              {job.salary && <span>💰 {job.salary}</span>}
              {job.application_deadline && <span>⏰ Deadline: {job.application_deadline}</span>}
              <span>👥 {job.candidates_count ?? 0} candidates</span>
            </div>
          </div>
          <span className={`px-3 py-1 rounded text-sm font-medium ${
            job.status === 'active' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
            : job.status === 'draft' ? 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
            : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
          }`}>
            {job.status}
          </span>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-3">
          <Link
            to={`/recruiter/jobs/${id}/edit`}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white"
          >
            Edit Job
          </Link>
          {job.status === 'draft' && (
            <button
              onClick={() => statusMutation.mutate('active')}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-green-600 hover:bg-green-700 text-white"
            >
              Publish
            </button>
          )}
          {job.status === 'active' && (
            <button
              onClick={() => statusMutation.mutate('closed')}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-yellow-600 hover:bg-yellow-700 text-white"
            >
              Close Job
            </button>
          )}
          <button
            onClick={() => {
              if (window.confirm('Are you sure you want to delete this job?')) {
                deleteMutation.mutate();
              }
            }}
            className="px-4 py-2 rounded-lg text-sm font-medium border border-red-500 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
          >
            Delete
          </button>
        </div>
      </div>

      {/* Share */}
      <div className={`rounded-lg border p-6 mb-6 ${isDark ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white'}`}>
        <h2 className="text-lg font-semibold mb-3">Share This Job</h2>
        <div className="flex flex-wrap gap-3">
          <button onClick={() => {
              const details = `🚀 We're Hiring: ${job.title}\n\n📍 Location: ${job.location || 'Remote'}\n💼 Type: ${(job.job_type || '').replace('_', ' ')}\n💰 Salary: ${job.salary || 'Competitive'}\n📋 Skills: ${(job.required_skills || []).join(', ')}\n\nApply now: ${jobUrl}\n\n#hiring #jobs #careers`;
              navigator.clipboard.writeText(details).then(() => {
                window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(jobUrl)}`, '_blank');
              });
            }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-[#0077B5] text-white hover:opacity-90">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
            LinkedIn (copies details)
          </button>
          <a href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(jobUrl)}&text=${shareText}`} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-black text-white hover:opacity-90">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
            Twitter / X
          </a>
          <a href={`https://wa.me/?text=${shareText}%20${encodeURIComponent(jobUrl)}`} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-[#25D366] text-white hover:opacity-90">
            WhatsApp
          </a>
          <a href={`mailto:?subject=${encodeURIComponent(`Job Opportunity: ${job.title}`)}&body=${encodeURIComponent(`Hi,\n\nI'd like to share this job opportunity with you:\n\n${job.title}\nLocation: ${job.location}\n\nApply here: ${jobUrl}\n\nBest regards`)}`}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border ${isDark ? 'border-slate-600 hover:bg-slate-700' : 'border-gray-300 hover:bg-gray-50'}`}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
            Email
          </a>
          <button onClick={copyLink}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border ${isDark ? 'border-slate-600 hover:bg-slate-700' : 'border-gray-300 hover:bg-gray-50'}`}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" /></svg>
            {copied ? 'Copied!' : 'Copy Link'}
          </button>
        </div>
      </div>

      {/* Description */}
      <div className={`rounded-lg border p-6 mb-6 ${isDark ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white'}`}>
        <h2 className="text-lg font-semibold mb-3">Job Description</h2>
        <div className="prose dark:prose-invert max-w-none text-sm leading-relaxed whitespace-pre-wrap">
          {job.description}
        </div>
      </div>

      {/* Skills */}
      {job.required_skills?.length > 0 && (
        <div className={`rounded-lg border p-6 mb-6 ${isDark ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white'}`}>
          <h2 className="text-lg font-semibold mb-3">Required Skills</h2>
          <div className="flex flex-wrap gap-2">
            {job.required_skills.map((skill) => (
              <span key={skill} className="px-3 py-1 rounded-full text-sm bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 font-medium">
                {skill}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Requirements */}
      {job.requirements && (
        <div className={`rounded-lg border p-6 mb-6 ${isDark ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white'}`}>
          <h2 className="text-lg font-semibold mb-3">Requirements</h2>
          <div className="text-sm leading-relaxed whitespace-pre-wrap">{job.requirements}</div>
        </div>
      )}
    </div>
  );
}
