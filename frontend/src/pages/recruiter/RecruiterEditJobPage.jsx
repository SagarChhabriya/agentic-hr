import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTheme } from '../../contexts/ThemeContext';
import { jobsApi, assessmentsApi, aiApi } from '../../services/api';
import { showToast } from '../../components/Toast';
import DatePicker from '../../components/DatePicker';

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

  // Assessment state
  const [showAssessmentQuestions, setShowAssessmentQuestions] = useState(false);
  const [showAssessmentAiCountPrompt, setShowAssessmentAiCountPrompt] = useState(false);
  const [assessmentQuestionCount, setAssessmentQuestionCount] = useState(5);
  const [aiGeneratedQuestions, setAiGeneratedQuestions] = useState([]);
  const [manualQuestion, setManualQuestion] = useState({ question_text: '', options: ['', '', '', ''], correct_index: 0 });
  const [assessmentAiLoading, setAssessmentAiLoading] = useState(false);

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
        includeAssessment: false,
        assessmentName: '',
        assessmentDuration: 30,
        assessmentQuestions: [],
      });
    }
  }, [job, formData]);

  const updateMutation = useMutation({
    mutationFn: async (body) => {
      const updatedJob = await jobsApi.update(id, body);
      if (formData.includeAssessment && formData.assessmentName.trim()) {
        const assessment = await assessmentsApi.create({
          name: formData.assessmentName.trim(),
          duration_minutes: formData.assessmentDuration || 30,
          job_id: id,
        });
        const questions = formData.assessmentQuestions || [];
        if (questions.length > 0) {
          const mapped = questions
            .map((q) => ({
              question_text: q.question_text || q.question,
              options: q.options || [],
              correct_index: q.correct_index ?? 0,
            }))
            .filter((q) => q.question_text && (q.options || []).length >= 2);
          if (mapped.length > 0) await assessmentsApi.addQuestions(assessment.id, mapped);
        }
      }
      return updatedJob;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      queryClient.invalidateQueries({ queryKey: ['job', id] });
      showToast('Job updated successfully!', 'success');
      navigate(`/recruiter/jobs/${id}`);
    },
    onError: () => showToast('Failed to save changes. Please try again.', 'error'),
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

  // Shared styles
  const inputCls = `w-full rounded-lg border px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors ${
    isDark
      ? 'border-slate-600 bg-slate-900 text-slate-100 placeholder:text-slate-500'
      : 'border-gray-300 bg-white text-gray-900 placeholder:text-gray-400'
  }`;
  const sectionCls = `rounded-xl border p-5 ${isDark ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white shadow-sm'}`;
  const labelCls = `block text-xs font-medium mb-1.5 ${isDark ? 'text-slate-400' : 'text-gray-500'}`;
  const sectionHeadingCls = `text-xs font-semibold uppercase tracking-wide mb-4 ${isDark ? 'text-slate-400' : 'text-gray-500'}`;

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  if (error || !job) {
    return (
      <div className="text-center py-20">
        <p className="text-red-500 text-sm mb-3">Job not found.</p>
        <Link to="/recruiter/jobs" className="text-sm text-indigo-500 hover:underline">← Back to jobs</Link>
      </div>
    );
  }
  if (!formData) return null;

  return (
    <div className={`max-w-3xl mx-auto ${isDark ? 'text-slate-100' : 'text-gray-900'}`}>
      {/* Breadcrumb */}
      <Link to={`/recruiter/jobs/${id}`}
        className={`inline-flex items-center gap-1 text-xs mb-5 ${isDark ? 'text-slate-400 hover:text-slate-200' : 'text-gray-400 hover:text-gray-600'}`}>
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/>
        </svg>
        Back to job
      </Link>

      {/* Page header card */}
      <div className={`rounded-xl border mb-6 overflow-hidden ${isDark ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white shadow-sm'}`}>
        <div className="h-1 w-full bg-gradient-to-r from-indigo-500 to-violet-600" />
        <div className="px-6 py-5 flex items-center justify-between">
          <div>
            <h1 className={`text-lg font-bold ${isDark ? 'text-slate-100' : 'text-gray-900'}`}>Edit Job</h1>
            <p className={`text-sm mt-0.5 ${isDark ? 'text-indigo-300' : 'text-indigo-600'}`}>{job.title}</p>
          </div>
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border capitalize ${
            job.status === 'active'  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800'
            : job.status === 'draft' ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800'
            : 'bg-gray-100 text-gray-600 border-gray-200 dark:bg-slate-700 dark:text-slate-400 dark:border-slate-600'
          }`}>
            {job.status}
          </span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">

        {/* Basic Information */}
        <section className={sectionCls}>
          <p className={sectionHeadingCls}>Basic Information</p>
          <div className="space-y-4">
            <div>
              <label className={labelCls}>Job Title <span className="text-red-400">*</span></label>
              <input type="text" name="title" required value={formData.title} onChange={handleChange} className={inputCls} placeholder="e.g. Senior Backend Engineer" />
            </div>
            <div>
              <label className={labelCls}>Description <span className="text-red-400">*</span></label>
              <textarea name="description" required rows={7} value={formData.description} onChange={handleChange} className={`${inputCls} resize-none`} placeholder="Describe the role, responsibilities, and team…" />
            </div>
            <div>
              <label className={labelCls}>Requirements</label>
              <textarea name="requirements" rows={5} value={formData.requirements} onChange={handleChange} className={`${inputCls} resize-none`} placeholder="List qualifications, degrees, certifications…" />
            </div>
          </div>
        </section>

        {/* Details */}
        <section className={sectionCls}>
          <p className={sectionHeadingCls}>Details</p>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Location <span className="text-red-400">*</span></label>
              <input type="text" name="location" required value={formData.location} onChange={handleChange} className={inputCls} placeholder="Remote / City, Country" />
            </div>
            <div>
              <label className={labelCls}>Salary</label>
              <input type="text" name="salary" value={formData.salary} onChange={handleChange} className={inputCls} placeholder="e.g. $80,000 – $100,000" />
            </div>
            <div>
              <label className={labelCls}>Job Type</label>
              <select name="jobType" value={formData.jobType} onChange={handleChange} className={inputCls}>
                <option value="FULL_TIME">Full-time</option>
                <option value="PART_TIME">Part-time</option>
                <option value="CONTRACT">Contract</option>
                <option value="INTERNSHIP">Internship</option>
                <option value="REMOTE">Remote</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Employment Type</label>
              <select name="employmentType" value={formData.employmentType} onChange={handleChange} className={inputCls}>
                <option value="PERMANENT">Permanent</option>
                <option value="TEMPORARY">Temporary</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Experience Required</label>
              <input type="text" name="experienceRequired" value={formData.experienceRequired} onChange={handleChange} className={inputCls} placeholder="e.g. 3+ years" />
            </div>
            <div>
              <label className={labelCls}>Application Deadline</label>
              <DatePicker
                value={formData.applicationDeadline}
                onChange={(v) => setFormData((p) => ({ ...p, applicationDeadline: v }))}
                min={new Date().toISOString().slice(0, 10)}
                placeholder="Pick a deadline"
              />
            </div>
            <div>
              <label className={labelCls}>Status</label>
              <select name="status" value={formData.status} onChange={handleChange} className={inputCls}>
                <option value="draft">Draft</option>
                <option value="active">Active</option>
                <option value="closed">Closed</option>
              </select>
            </div>
          </div>

          {/* Cover letter checkbox */}
          <div className={`mt-4 flex items-center gap-3 p-3 rounded-lg border ${isDark ? 'border-slate-700 bg-slate-900/50' : 'border-gray-100 bg-gray-50'}`}>
            <input
              type="checkbox"
              id="coverLetterRequired"
              name="coverLetterRequired"
              checked={formData.coverLetterRequired}
              onChange={handleChange}
              className="w-4 h-4 accent-indigo-600 rounded"
            />
            <label htmlFor="coverLetterRequired" className={`text-sm cursor-pointer ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
              Require cover letter from applicants
            </label>
          </div>
        </section>

        {/* Skills */}
        <section className={sectionCls}>
          <p className={sectionHeadingCls}>Required Skills</p>
          <div className="flex gap-2 mb-3">
            <input
              type="text"
              value={newSkill}
              onChange={(e) => setNewSkill(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddSkill())}
              className={inputCls}
              placeholder="Type a skill and press Enter or Add"
            />
            <button type="button" onClick={handleAddSkill}
              className="shrink-0 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium transition-colors">
              Add
            </button>
          </div>
          {formData.requiredSkills.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {formData.requiredSkills.map((s) => (
                <span key={s} className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${
                  isDark ? 'bg-indigo-900/30 text-indigo-300 border-indigo-700/50' : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                }`}>
                  {s}
                  <button type="button" onClick={() => handleRemoveSkill(s)}
                    className="hover:text-red-500 font-bold leading-none transition-colors">×</button>
                </span>
              ))}
            </div>
          ) : (
            <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>No skills added yet.</p>
          )}
        </section>

        {/* Assessment (optional) */}
        <section className={sectionCls}>
          <p className={sectionHeadingCls}>Assessment (Optional)</p>
          <p className={`text-xs mb-4 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
            Attach a new MCQ assessment to this job. Existing assessments are not modified.
          </p>

          <div className={`flex items-center gap-3 p-3 rounded-lg border mb-4 cursor-pointer ${isDark ? 'border-slate-700 bg-slate-900/50' : 'border-gray-100 bg-gray-50'}`}>
            <input
              type="checkbox"
              id="includeAssessment"
              name="includeAssessment"
              checked={formData.includeAssessment}
              onChange={handleChange}
              className="w-4 h-4 accent-indigo-600"
            />
            <label htmlFor="includeAssessment" className={`text-sm cursor-pointer ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
              Add a new assessment for this job
            </label>
          </div>

          {formData.includeAssessment && (
            <div className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Assessment Name <span className="text-red-400">*</span></label>
                  <input type="text" name="assessmentName" value={formData.assessmentName} onChange={handleChange}
                    className={inputCls} placeholder="e.g. Technical Skills Test" />
                </div>
                <div>
                  <label className={labelCls}>Duration (minutes)</label>
                  <input type="number" name="assessmentDuration" min={5} max={180}
                    value={formData.assessmentDuration}
                    onChange={(e) => setFormData((p) => ({ ...p, assessmentDuration: Math.min(180, Math.max(5, parseInt(e.target.value, 10) || 30)) }))}
                    className={inputCls} />
                </div>
              </div>

              <div className={`rounded-lg border p-4 ${isDark ? 'border-slate-700 bg-slate-900/50' : 'border-gray-100 bg-gray-50'}`}>
                <div className="flex items-center justify-between mb-3">
                  <p className={`text-sm font-medium ${isDark ? 'text-slate-200' : 'text-gray-700'}`}>
                    Questions
                    {(formData.assessmentQuestions || []).length > 0 && (
                      <span className="ml-2 px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300">
                        {(formData.assessmentQuestions || []).length} added
                      </span>
                    )}
                  </p>
                  <button type="button" onClick={() => setShowAssessmentQuestions(!showAssessmentQuestions)}
                    className={`text-xs font-medium ${isDark ? 'text-indigo-400 hover:text-indigo-300' : 'text-indigo-600 hover:text-indigo-700'}`}>
                    {showAssessmentQuestions ? 'Hide' : 'Create / Design Questions'}
                  </button>
                </div>

                {showAssessmentQuestions && (
                  <div className="space-y-4 mt-2">
                    {/* AI Generate */}
                    <div className={`p-4 rounded-lg border ${isDark ? 'border-violet-700/50 bg-violet-900/10' : 'border-violet-200 bg-violet-50'}`}>
                      <h4 className={`text-xs font-semibold uppercase tracking-wide mb-3 flex items-center gap-2 ${isDark ? 'text-violet-300' : 'text-violet-700'}`}>
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z"/>
                        </svg>
                        AI Generate
                      </h4>
                      {!showAssessmentAiCountPrompt ? (
                        <button type="button" onClick={() => setShowAssessmentAiCountPrompt(true)}
                          className="px-4 py-2 text-sm rounded-lg bg-violet-600 hover:bg-violet-700 text-white font-medium transition-colors">
                          Generate with AI
                        </button>
                      ) : (
                        <div className="space-y-3">
                          <div className="flex items-center gap-3">
                            <label className={`text-xs font-medium ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>Questions (1–10):</label>
                            <input type="number" min={1} max={10} value={assessmentQuestionCount}
                              onChange={(e) => setAssessmentQuestionCount(Math.min(10, Math.max(1, parseInt(e.target.value, 10) || 5)))}
                              className={`w-20 ${inputCls}`} />
                          </div>
                          <div className="flex gap-2">
                            <button type="button" disabled={assessmentAiLoading}
                              onClick={async () => {
                                setAssessmentAiLoading(true);
                                try {
                                  const { questions } = await aiApi.generateQuestions({
                                    job_title: formData.title,
                                    job_description: formData.description,
                                    skills: formData.requiredSkills,
                                    count: assessmentQuestionCount,
                                  });
                                  setAiGeneratedQuestions((questions || []).map((q) => ({ ...q, accepted: true })));
                                } catch {
                                  showToast('AI generation failed. Please try again.', 'error');
                                } finally {
                                  setAssessmentAiLoading(false);
                                }
                              }}
                              className="px-4 py-2 text-sm rounded-lg bg-violet-600 hover:bg-violet-700 text-white font-medium disabled:opacity-50 transition-colors">
                              {assessmentAiLoading ? 'Generating…' : 'Generate'}
                            </button>
                            <button type="button" onClick={() => setShowAssessmentAiCountPrompt(false)}
                              className={`px-4 py-2 text-sm rounded-lg border transition-colors ${isDark ? 'border-slate-600 text-slate-300 hover:bg-slate-700' : 'border-gray-300 text-gray-600 hover:bg-gray-50'}`}>
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                      {aiGeneratedQuestions.length > 0 && (
                        <div className="mt-3 space-y-2">
                          {aiGeneratedQuestions.map((q, i) => (
                            <div key={i} className={`p-3 rounded-lg text-xs flex justify-between items-start gap-2 border ${
                              q.accepted
                                ? isDark ? 'border-emerald-700/50 bg-emerald-900/10' : 'border-emerald-200 bg-emerald-50'
                                : isDark ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white'
                            }`}>
                              <div>
                                <p className={`font-medium mb-1 ${isDark ? 'text-slate-200' : 'text-gray-800'}`}>{q.question || q.question_text}</p>
                                <p className={`${isDark ? 'text-slate-500' : 'text-gray-400'}`}>Answer: {(q.options || [])[q.correct_index ?? 0]}</p>
                              </div>
                              <button type="button"
                                onClick={() => setAiGeneratedQuestions((p) => { const n = [...p]; n[i] = { ...n[i], accepted: !n[i].accepted }; return n; })}
                                className={`shrink-0 px-2 py-1 rounded-md text-xs border transition-colors ${
                                  q.accepted
                                    ? 'border-red-300 text-red-600 hover:bg-red-50 dark:border-red-700 dark:text-red-400'
                                    : 'border-emerald-300 text-emerald-600 hover:bg-emerald-50 dark:border-emerald-700 dark:text-emerald-400'
                                }`}>
                                {q.accepted ? 'Remove' : 'Add'}
                              </button>
                            </div>
                          ))}
                          <button type="button"
                            onClick={() => {
                              const toAdd = aiGeneratedQuestions.filter((q) => q.accepted).map((q) => ({
                                question_text: q.question || q.question_text, options: q.options || [], correct_index: q.correct_index ?? 0,
                              })).filter((q) => q.question_text && (q.options || []).length >= 2);
                              setFormData((p) => ({ ...p, assessmentQuestions: [...(p.assessmentQuestions || []), ...toAdd] }));
                              setAiGeneratedQuestions([]);
                            }}
                            className="px-4 py-2 text-xs rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium transition-colors">
                            Add selected to assessment
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Manual add */}
                    <div className={`p-4 rounded-lg border ${isDark ? 'border-slate-600 bg-slate-800' : 'border-gray-200 bg-white'}`}>
                      <h4 className={`text-xs font-semibold uppercase tracking-wide mb-3 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Add Manually</h4>
                      <input type="text" value={manualQuestion.question_text}
                        onChange={(e) => setManualQuestion((p) => ({ ...p, question_text: e.target.value }))}
                        placeholder="Question text"
                        className={`${inputCls} mb-3`} />
                      {manualQuestion.options.map((opt, i) => (
                        <label key={i} className="flex items-center gap-2 mb-2">
                          <input type="radio" name="editCorrectOption" checked={manualQuestion.correct_index === i}
                            onChange={() => setManualQuestion((p) => ({ ...p, correct_index: i }))}
                            className="w-4 h-4 accent-indigo-600" />
                          <input type="text" value={opt}
                            onChange={(e) => { const next = [...manualQuestion.options]; next[i] = e.target.value; setManualQuestion((p) => ({ ...p, options: next })); }}
                            placeholder={`Option ${String.fromCharCode(65 + i)}`}
                            className={inputCls} />
                        </label>
                      ))}
                      <button type="button"
                        onClick={() => {
                          const q = { question_text: manualQuestion.question_text, options: manualQuestion.options.filter(Boolean), correct_index: manualQuestion.correct_index };
                          if (q.question_text && q.options.length >= 2) {
                            setFormData((p) => ({ ...p, assessmentQuestions: [...(p.assessmentQuestions || []), q] }));
                            setManualQuestion({ question_text: '', options: ['', '', '', ''], correct_index: 0 });
                          }
                        }}
                        className="mt-2 px-4 py-2 text-xs rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium transition-colors">
                        Add to assessment
                      </button>
                    </div>

                    {/* Added questions list */}
                    {(formData.assessmentQuestions || []).length > 0 && (
                      <div>
                        <p className={`text-xs font-semibold uppercase tracking-wide mb-2 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                          Added Questions ({(formData.assessmentQuestions || []).length})
                        </p>
                        <div className="space-y-2">
                          {(formData.assessmentQuestions || []).map((q, i) => (
                            <div key={i} className={`flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg border text-xs ${isDark ? 'border-slate-700 bg-slate-900/50' : 'border-gray-200 bg-gray-50'}`}>
                              <span className={`truncate ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>{q.question_text || q.question}</span>
                              <button type="button"
                                onClick={() => setFormData((p) => ({ ...p, assessmentQuestions: (p.assessmentQuestions || []).filter((_, j) => j !== i) }))}
                                className="shrink-0 text-red-500 hover:text-red-600 font-medium transition-colors">
                                Remove
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </section>

        {/* Sticky save bar */}
        <div className={`sticky bottom-0 z-10 -mx-4 px-4 py-3 border-t ${isDark ? 'bg-slate-900/95 border-slate-700' : 'bg-white/95 border-gray-200'} backdrop-blur`}>
          <div className="max-w-3xl mx-auto flex items-center gap-3">
            <button type="submit" disabled={updateMutation.isPending}
              className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg text-sm font-semibold bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white disabled:opacity-50 transition-all shadow-sm">
              {updateMutation.isPending ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                  </svg>
                  Saving…
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/>
                  </svg>
                  Save Changes
                </>
              )}
            </button>
            <button type="button" onClick={() => navigate(`/recruiter/jobs/${id}`)}
              className={`px-5 py-2.5 rounded-lg text-sm font-medium border transition-colors ${isDark ? 'border-slate-600 text-slate-300 hover:bg-slate-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
              Cancel
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
