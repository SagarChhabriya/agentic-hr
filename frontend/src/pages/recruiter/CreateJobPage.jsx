import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import { jobsApi, customQuestionsApi, assessmentsApi, aiApi } from '../../services/api';
import { showToast } from '../../components/Toast';
import DatePicker from '../../components/DatePicker';

export default function CreateJobPage() {
  const { theme } = useTheme();
  const navigate = useNavigate();
  const isDark = theme === 'dark';

  const STORAGE_KEY = 'createJobFormDraft';

  const loadDraft = () => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    return null;
  };

  const defaultForm = {
    title: '',
    description: '',
    salary: '',
    location: '',
    jobType: 'FULL_TIME',
    employmentType: 'PERMANENT',
    experienceRequired: '',
    requiredSkills: [],
    requirements: '',
    applicationDeadline: '',
    coverLetterRequired: false,
    customQuestions: [],
    includeAssessment: false,
    assessmentName: '',
    assessmentDuration: 30,
    assessmentQuestions: [],
  };

  const [formData, setFormData] = useState(() => loadDraft() || defaultForm);

  useEffect(() => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(formData));
  }, [formData]);

  const [newSkill, setNewSkill] = useState('');
  const [showCustomQuestions, setShowCustomQuestions] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [availableQuestions, setAvailableQuestions] = useState([]);
  const [selectedQuestionIds, setSelectedQuestionIds] = useState(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY + '_questions');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');
  const [showAssessmentQuestions, setShowAssessmentQuestions] = useState(false);
  const [assessmentQuestionCount, setAssessmentQuestionCount] = useState(5);
  const [showAssessmentAiCountPrompt, setShowAssessmentAiCountPrompt] = useState(false);
  const [aiGeneratedQuestions, setAiGeneratedQuestions] = useState([]);
  const [manualQuestion, setManualQuestion] = useState({ question_text: '', options: ['', '', '', ''], correct_index: 0 });
  const [assessmentAiLoading, setAssessmentAiLoading] = useState(false);

  useEffect(() => {
    customQuestionsApi.list().then(setAvailableQuestions).catch(() => {});
  }, []);

  const handleAiGenerateJD = async () => {
    if (!formData.title.trim()) { setAiError('Enter a job title first'); return; }
    setAiLoading(true);
    setAiError('');
    try {
      const twoWeeks = new Date();
      twoWeeks.setDate(twoWeeks.getDate() + 14);
      const deadlineStr = twoWeeks.toISOString().split('T')[0];

      const result = await aiApi.generateJD({
        title: formData.title,
        location: formData.location || 'Remote',
        job_type: formData.jobType || 'PART_TIME',
        skills: formData.requiredSkills,
        experience: formData.experienceRequired || '1-2 years',
        extra_context: 'Also return a key "skills" as a JSON array of at least 10 relevant required skills for this job.',
      });

      let requirements = result.requirements || '';
      if (requirements) {
        const lines = requirements.split('\n').map((l) => l.trim()).filter(Boolean);
        requirements = lines.map((l) => {
          const cleaned = l.replace(/^[-•*●◦▪]\s*/, '').replace(/^\d+\.\s*/, '');
          return `● ${cleaned}`;
        }).join('\n');
      }

      let aiSkills = [];
      if (result.skills && Array.isArray(result.skills)) aiSkills = result.skills;

      setFormData((prev) => ({
        ...prev,
        description: result.description || prev.description,
        requirements: requirements || prev.requirements,
        salary: result.salary_suggestion || prev.salary,
        location: prev.location || 'Remote',
        jobType: prev.jobType || 'PART_TIME',
        employmentType: prev.employmentType || 'PERMANENT',
        experienceRequired: prev.experienceRequired || '1-2 years',
        applicationDeadline: prev.applicationDeadline || deadlineStr,
        requiredSkills: aiSkills.length > 0
          ? [...new Set([...prev.requiredSkills, ...aiSkills])].slice(0, 15)
          : prev.requiredSkills,
      }));
      showToast('AI generated the job description!', 'success');
    } catch (err) {
      setAiError(err?.response?.data?.detail || 'AI generation failed. Check GROQ_API_KEY.');
    } finally {
      setAiLoading(false);
    }
  };

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

  useEffect(() => {
    sessionStorage.setItem(STORAGE_KEY + '_questions', JSON.stringify(selectedQuestionIds));
  }, [selectedQuestionIds]);

  const toggleQuestion = (qid) => {
    setSelectedQuestionIds((prev) =>
      prev.includes(qid) ? prev.filter((id) => id !== qid) : [...prev, qid]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const job = await jobsApi.create({
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
        status: 'draft',
      });
      if (selectedQuestionIds.length > 0) {
        await jobsApi.setQuestions(job.id, selectedQuestionIds);
      }
      if (formData.includeAssessment && formData.assessmentName.trim()) {
        const assessment = await assessmentsApi.create({
          name: formData.assessmentName.trim(),
          duration_minutes: formData.assessmentDuration || 30,
          job_id: job.id,
        });
        const questions = formData.assessmentQuestions || [];
        if (questions.length > 0) {
          const mapped = questions.map((q) => ({
            question_text: q.question_text || q.question,
            options: q.options || [],
            correct_index: q.correct_index ?? 0,
          })).filter((q) => (q.question_text || q.question) && (q.options || []).length >= 2);
          if (mapped.length > 0) await assessmentsApi.addQuestions(assessment.id, mapped);
        }
      }
      sessionStorage.removeItem(STORAGE_KEY);
      sessionStorage.removeItem(STORAGE_KEY + '_questions');
      showToast('Job created! Publish it to make it visible to candidates.', 'success', 6000);
      navigate(`/recruiter/jobs/${job.id}`);
    } catch (err) {
      console.error(err);
      showToast(err?.response?.data?.detail || 'Failed to create job. Please try again.', 'error');
      setIsSubmitting(false);
    }
  };

  // Shared styles
  const inputCls = `w-full rounded-lg border px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors ${
    isDark
      ? 'border-slate-600 bg-slate-900 text-slate-100 placeholder:text-slate-500'
      : 'border-gray-300 bg-white text-gray-900 placeholder:text-gray-400'
  }`;
  const sectionCls = `rounded-xl border ${isDark ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white shadow-sm'}`;
  const labelCls = `block text-xs font-medium mb-1.5 ${isDark ? 'text-slate-400' : 'text-gray-500'}`;
  const sectionHeadingCls = `text-xs font-semibold uppercase tracking-wide ${isDark ? 'text-slate-400' : 'text-gray-500'}`;

  return (
    <div className={`max-w-3xl mx-auto ${isDark ? 'text-slate-100' : 'text-gray-900'}`}>

      {/* Page header card */}
      <div className={`rounded-xl border mb-6 overflow-hidden ${isDark ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white shadow-sm'}`}>
        <div className="h-1 w-full bg-gradient-to-r from-indigo-500 to-violet-600" />
        <div className="px-6 py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className={`text-lg font-bold ${isDark ? 'text-slate-100' : 'text-gray-900'}`}>Create Job</h1>
            <p className={`text-sm mt-0.5 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Fill in the details to post a new job posting.</p>
          </div>
          <button type="button" onClick={handleAiGenerateJD} disabled={aiLoading}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white disabled:opacity-50 transition-all shadow-sm shrink-0">
            {aiLoading ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                </svg>
                Generating…
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z"/>
                </svg>
                AI Generate JD
              </>
            )}
          </button>
        </div>

        {/* AI hint */}
        <div className={`mx-5 mb-5 flex items-start gap-3 rounded-lg border px-4 py-3 text-xs ${
          isDark ? 'border-violet-700/50 bg-violet-900/15 text-violet-300' : 'border-violet-200 bg-violet-50 text-violet-800'
        }`}>
          <svg className="w-4 h-4 mt-0.5 shrink-0 text-violet-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z"/>
          </svg>
          <span>
            <span className="font-semibold">Save time with AI:</span> Enter the <strong>Job Title</strong> first, then click{' '}
            <em>AI Generate JD</em> to auto-fill description, requirements, skills, and salary. You can also use{' '}
            <em>Generate with AI</em> inside the Assessment section to auto-create MCQ questions.
          </span>
        </div>

        {aiError && (
          <div className="mx-5 mb-5 flex items-center gap-2 text-xs text-red-500">
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
            </svg>
            {aiError}
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">

        {/* Basic Information */}
        <section className={sectionCls}>
          <div className={`px-5 py-4 border-b flex items-center gap-2 ${isDark ? 'border-slate-700' : 'border-gray-100'}`}>
            <svg className="w-4 h-4 text-indigo-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
            </svg>
            <p className={sectionHeadingCls}>Basic Information</p>
          </div>
          <div className="px-5 py-4 space-y-4">
            <div>
              <label className={labelCls}>Job Title <span className="text-red-400">*</span></label>
              <input type="text" name="title" required value={formData.title} onChange={handleChange}
                className={inputCls} placeholder="e.g. Senior Frontend Engineer" />
            </div>
            <div>
              <label className={labelCls}>Job Description <span className="text-red-400">*</span></label>
              <textarea name="description" required rows={8} value={formData.description} onChange={handleChange}
                className={`${inputCls} resize-none`}
                placeholder="Describe the role, responsibilities, and what you're looking for…" />
            </div>
            <div>
              <label className={labelCls}>Requirements</label>
              <textarea name="requirements" rows={5} value={formData.requirements} onChange={handleChange}
                className={`${inputCls} resize-none`}
                placeholder="List qualifications, certifications, degrees…" />
            </div>
          </div>
        </section>

        {/* Job Details */}
        <section className={sectionCls}>
          <div className={`px-5 py-4 border-b flex items-center gap-2 ${isDark ? 'border-slate-700' : 'border-gray-100'}`}>
            <svg className="w-4 h-4 text-indigo-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
            </svg>
            <p className={sectionHeadingCls}>Job Details</p>
          </div>
          <div className="px-5 py-4 grid sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Location <span className="text-red-400">*</span></label>
              <input type="text" name="location" required value={formData.location} onChange={handleChange}
                className={inputCls} placeholder="Remote / City, Country" />
            </div>
            <div>
              <label className={labelCls}>Salary Range</label>
              <input type="text" name="salary" value={formData.salary} onChange={handleChange}
                className={inputCls} placeholder="e.g. PKR 80,000 – 150,000/mo" />
            </div>
            <div>
              <label className={labelCls}>Job Type <span className="text-red-400">*</span></label>
              <select name="jobType" required value={formData.jobType} onChange={handleChange} className={inputCls}>
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
              <input type="text" name="experienceRequired" value={formData.experienceRequired} onChange={handleChange}
                className={inputCls} placeholder="e.g. 3–5 years" />
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
          </div>

          {/* Cover letter toggle */}
          <div className={`mx-5 mb-5 flex items-center gap-3 p-3 rounded-lg border ${isDark ? 'border-slate-700 bg-slate-900/50' : 'border-gray-100 bg-gray-50'}`}>
            <input type="checkbox" id="coverLetterRequired" name="coverLetterRequired"
              checked={formData.coverLetterRequired} onChange={handleChange}
              className="w-4 h-4 accent-indigo-600 rounded" />
            <label htmlFor="coverLetterRequired" className={`text-sm cursor-pointer ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
              Require cover letter from applicants
            </label>
          </div>
        </section>

        {/* Required Skills */}
        <section className={sectionCls}>
          <div className={`px-5 py-4 border-b flex items-center gap-2 ${isDark ? 'border-slate-700' : 'border-gray-100'}`}>
            <svg className="w-4 h-4 text-indigo-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
            </svg>
            <p className={sectionHeadingCls}>Required Skills</p>
          </div>
          <div className="px-5 py-4">
            <div className="flex gap-2 mb-3">
              <input type="text" value={newSkill} onChange={(e) => setNewSkill(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddSkill())}
                className={inputCls} placeholder="Type a skill and press Enter or Add" />
              <button type="button" onClick={handleAddSkill}
                className="shrink-0 px-4 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium transition-colors">
                Add
              </button>
            </div>
            {formData.requiredSkills.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {formData.requiredSkills.map((skill) => (
                  <span key={skill} className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${
                    isDark ? 'bg-indigo-900/30 text-indigo-300 border-indigo-700/50' : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                  }`}>
                    {skill}
                    <button type="button" onClick={() => handleRemoveSkill(skill)}
                      className="hover:text-red-500 font-bold leading-none transition-colors">×</button>
                  </span>
                ))}
              </div>
            ) : (
              <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>No skills added yet. Use AI Generate to auto-fill.</p>
            )}
          </div>
        </section>

        {/* Custom Questions */}
        <section className={sectionCls}>
          <div className={`px-5 py-4 border-b flex items-center justify-between ${isDark ? 'border-slate-700' : 'border-gray-100'}`}>
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-indigo-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              <p className={sectionHeadingCls}>
                Custom Questions
                {selectedQuestionIds.length > 0 && (
                  <span className="ml-2 px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300 normal-case tracking-normal">
                    {selectedQuestionIds.length} selected
                  </span>
                )}
              </p>
            </div>
            <button type="button" onClick={() => setShowCustomQuestions(!showCustomQuestions)}
              className={`text-xs font-medium ${isDark ? 'text-indigo-400 hover:text-indigo-300' : 'text-indigo-600 hover:text-indigo-700'}`}>
              {showCustomQuestions ? 'Hide' : 'Select Questions'}
            </button>
          </div>

          {showCustomQuestions && (
            <div className="px-5 py-4 space-y-2">
              {availableQuestions.length === 0 ? (
                <div className={`flex items-center gap-3 p-3 rounded-lg border ${isDark ? 'border-slate-700 bg-slate-900/50' : 'border-gray-100 bg-gray-50'}`}>
                  <p className={`text-xs flex-1 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>No saved questions yet.</p>
                  <Link to="/recruiter/questions" className="text-xs font-medium text-indigo-500 hover:underline shrink-0">Create questions →</Link>
                </div>
              ) : (
                <>
                  {availableQuestions.map((q) => (
                    <label key={q.id} className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer border transition-colors ${
                      selectedQuestionIds.includes(q.id)
                        ? isDark ? 'border-indigo-600/60 bg-indigo-900/20' : 'border-indigo-300 bg-indigo-50'
                        : isDark ? 'border-slate-700 hover:border-slate-600' : 'border-gray-200 hover:border-gray-300'
                    }`}>
                      <input type="checkbox" checked={selectedQuestionIds.includes(q.id)}
                        onChange={() => toggleQuestion(q.id)}
                        className="mt-0.5 w-4 h-4 accent-indigo-600" />
                      <div>
                        <p className="text-sm font-medium">{q.question}</p>
                        <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                          {q.type}{q.required ? ' · required' : ''}
                        </p>
                      </div>
                    </label>
                  ))}
                  <Link to="/recruiter/questions"
                    className="inline-flex items-center gap-1 text-xs font-medium text-indigo-500 hover:text-indigo-600 mt-1">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/>
                    </svg>
                    Create / Add More Questions
                  </Link>
                </>
              )}
            </div>
          )}
        </section>

        {/* Assessment */}
        <section className={sectionCls}>
          <div className={`px-5 py-4 border-b flex items-center gap-2 ${isDark ? 'border-slate-700' : 'border-gray-100'}`}>
            <svg className="w-4 h-4 text-indigo-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/>
            </svg>
            <p className={sectionHeadingCls}>Assessment (Optional)</p>
          </div>
          <div className="px-5 py-4">
            <p className={`text-xs mb-4 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
              Attach an MCQ assessment — applicants receive an email link to complete it.
            </p>

            <div className={`flex items-center gap-3 p-3 rounded-lg border mb-4 ${isDark ? 'border-slate-700 bg-slate-900/50' : 'border-gray-100 bg-gray-50'}`}>
              <input type="checkbox" id="includeAssessment" name="includeAssessment"
                checked={formData.includeAssessment} onChange={handleChange}
                className="w-4 h-4 accent-indigo-600" />
              <label htmlFor="includeAssessment" className={`text-sm cursor-pointer ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                Include assessment for this job
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
                                  } catch (err) {
                                    console.warn('AI generation failed:', err);
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
                          placeholder="Question text" className={`${inputCls} mb-3`} />
                        {manualQuestion.options.map((opt, i) => (
                          <label key={i} className="flex items-center gap-2 mb-2">
                            <input type="radio" name="correctOption" checked={manualQuestion.correct_index === i}
                              onChange={() => setManualQuestion((p) => ({ ...p, correct_index: i }))}
                              className="w-4 h-4 accent-indigo-600" />
                            <input type="text" value={opt}
                              onChange={(e) => { const next = [...manualQuestion.options]; next[i] = e.target.value; setManualQuestion((p) => ({ ...p, options: next })); }}
                              placeholder={`Option ${String.fromCharCode(65 + i)}`} className={inputCls} />
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
          </div>
        </section>

        {/* Submit bar */}
        <div className="flex items-center gap-3 pt-2">
            <button type="submit" disabled={isSubmitting}
              className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg text-sm font-semibold bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white disabled:opacity-50 transition-all shadow-sm">
              {isSubmitting ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                  </svg>
                  Creating…
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/>
                  </svg>
                  Create Job
                </>
              )}
            </button>
            <button type="button" onClick={() => navigate('/recruiter/jobs')}
              className={`px-5 py-2.5 rounded-lg text-sm font-medium border transition-colors ${isDark ? 'border-slate-600 text-slate-300 hover:bg-slate-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
              Cancel
            </button>
        </div>
      </form>
    </div>
  );
}
