import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTheme } from '../../contexts/ThemeContext';
import { jobsApi } from '../../services/api';

export default function RecruiterEditJobPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const queryClient = useQueryClient();

  const { data: job, isLoading, error } = useQuery({
    queryKey: ['job', id],
    queryFn: () => jobsApi.get(id),
    enabled: !!id,
  });

  const [formData, setFormData] = useState(null);
  const [newSkill, setNewSkill] = useState('');

  useEffect(() => {
    if (job && !formData) {
      setFormData({
        title: job.title || '',
        description: job.description || '',
        salary: job.salary || '',
        location: job.location || '',
        jobType: job.job_type || 'FULL_TIME',
        employmentType: job.employment_type || 'PERMANENT',
        experienceRequired: job.experience_required || '',
        requiredSkills: job.required_skills || [],
        requirements: job.requirements || '',
        applicationDeadline: job.application_deadline || '',
        coverLetterRequired: job.cover_letter_required || false,
        status: job.status || 'draft',
      });
    }
  }, [job, formData]);

  const updateMutation = useMutation({
    mutationFn: (body) => jobsApi.update(id, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      queryClient.invalidateQueries({ queryKey: ['job', id] });
      navigate(`/recruiter/jobs/${id}`);
    },
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleAddSkill = () => {
    if (newSkill.trim() && !formData.requiredSkills.includes(newSkill.trim())) {
      setFormData((prev) => ({ ...prev, requiredSkills: [...prev.requiredSkills, newSkill.trim()] }));
      setNewSkill('');
    }
  };

  const handleRemoveSkill = (skill) => {
    setFormData((prev) => ({ ...prev, requiredSkills: prev.requiredSkills.filter((s) => s !== skill) }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    updateMutation.mutate({
      title: formData.title,
      description: formData.description,
      salary: formData.salary || undefined,
      location: formData.location,
      job_type: formData.jobType,
      employment_type: formData.employmentType,
      experience_required: formData.experienceRequired || undefined,
      required_skills: formData.requiredSkills,
      requirements: formData.requirements || undefined,
      application_deadline: formData.applicationDeadline || undefined,
      cover_letter_required: formData.coverLetterRequired,
      status: formData.status,
    });
  };

  const inputCls = `w-full rounded-md border px-3 py-2 ${isDark ? 'border-slate-600 bg-slate-900 text-slate-100' : 'border-gray-300 bg-white text-gray-900'}`;

  if (isLoading) {
    return <div className={`px-4 py-8 text-center ${isDark ? 'text-slate-100' : 'text-gray-900'}`}>Loading...</div>;
  }
  if (error || !job) {
    return (
      <div className={`px-4 py-8 text-center ${isDark ? 'text-slate-100' : 'text-gray-900'}`}>
        <p className="text-red-500 mb-4">Job not found.</p>
        <Link to="/recruiter/jobs" className="text-blue-600 dark:text-blue-400 hover:underline">← Back to jobs</Link>
      </div>
    );
  }
  if (!formData) return null;

  return (
    <div className={`px-4 py-8 max-w-4xl mx-auto ${isDark ? 'text-slate-100' : 'text-gray-900'}`}>
      <Link to={`/recruiter/jobs/${id}`} className="inline-flex items-center text-sm text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 mb-6">
        ← Back to job details
      </Link>
      <h1 className="text-3xl font-bold mb-6">Edit Job: {job.title}</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        <section className={`rounded-lg border p-6 ${isDark ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white'}`}>
          <h2 className="text-xl font-semibold mb-4">Basic Information</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Job Title *</label>
              <input type="text" name="title" required value={formData.title} onChange={handleChange} className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Description *</label>
              <textarea name="description" required rows={8} value={formData.description} onChange={handleChange} className={inputCls} />
            </div>
          </div>
        </section>

        <section className={`rounded-lg border p-6 ${isDark ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white'}`}>
          <h2 className="text-xl font-semibold mb-4">Details</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Salary</label>
              <input type="text" name="salary" value={formData.salary} onChange={handleChange} className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Location *</label>
              <input type="text" name="location" required value={formData.location} onChange={handleChange} className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Job Type</label>
              <select name="jobType" value={formData.jobType} onChange={handleChange} className={inputCls}>
                <option value="FULL_TIME">Full-time</option>
                <option value="PART_TIME">Part-time</option>
                <option value="CONTRACT">Contract</option>
                <option value="INTERNSHIP">Internship</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Employment Type</label>
              <select name="employmentType" value={formData.employmentType} onChange={handleChange} className={inputCls}>
                <option value="PERMANENT">Permanent</option>
                <option value="TEMPORARY">Temporary</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Experience</label>
              <input type="text" name="experienceRequired" value={formData.experienceRequired} onChange={handleChange} className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Deadline</label>
              <input type="date" name="applicationDeadline" value={formData.applicationDeadline} onChange={handleChange} className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Status</label>
              <select name="status" value={formData.status} onChange={handleChange} className={inputCls}>
                <option value="draft">Draft</option>
                <option value="active">Active</option>
                <option value="closed">Closed</option>
              </select>
            </div>
          </div>
        </section>

        <section className={`rounded-lg border p-6 ${isDark ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white'}`}>
          <h2 className="text-xl font-semibold mb-4">Skills</h2>
          <div className="flex gap-2 mb-4">
            <input type="text" value={newSkill} onChange={(e) => setNewSkill(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddSkill())}
              className={`flex-1 ${inputCls}`} placeholder="Add skill" />
            <button type="button" onClick={handleAddSkill} className="px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white font-medium">Add</button>
          </div>
          <div className="flex flex-wrap gap-2">
            {formData.requiredSkills.map((s) => (
              <span key={s} className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm ${isDark ? 'bg-slate-700 text-slate-200' : 'bg-gray-100 text-gray-800'}`}>
                {s}
                <button type="button" onClick={() => handleRemoveSkill(s)} className="hover:text-red-500">×</button>
              </span>
            ))}
          </div>
        </section>

        <section className={`rounded-lg border p-6 ${isDark ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white'}`}>
          <h2 className="text-xl font-semibold mb-4">Requirements</h2>
          <textarea name="requirements" rows={6} value={formData.requirements} onChange={handleChange} className={inputCls} placeholder="Requirements..." />
        </section>

        <section className={`rounded-lg border p-6 ${isDark ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white'}`}>
          <label className="flex items-center gap-2">
            <input type="checkbox" name="coverLetterRequired" checked={formData.coverLetterRequired} onChange={handleChange} className="w-4 h-4" />
            <span>Require cover letter</span>
          </label>
        </section>

        <div className="flex gap-4">
          <button type="submit" disabled={updateMutation.isPending}
            className="flex-1 px-6 py-3 rounded-lg font-medium bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50">
            {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
          </button>
          <button type="button" onClick={() => navigate(`/recruiter/jobs/${id}`)}
            className={`px-6 py-3 rounded-lg font-medium border ${isDark ? 'border-slate-600 bg-slate-800 hover:bg-slate-700' : 'border-gray-300 bg-white hover:bg-gray-50'}`}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
