import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import { jobsApi, customQuestionsApi, assessmentsApi, aiApi } from '../../services/api';

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
    assessmentQuestions: [], // [{ question_text, options: string[], correct_index }]
  };

  const [formData, setFormData] = useState(() => loadDraft() || defaultForm);

  // Persist form data to sessionStorage on every change
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
    if (!formData.title.trim()) {
      setAiError('Enter a job title first');
      return;
    }
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
      if (result.skills && Array.isArray(result.skills)) {
        aiSkills = result.skills;
      }

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
    } catch (err) {
      setAiError(err?.response?.data?.detail || 'AI generation failed. Check GROQ_API_KEY.');
    } finally {
      setAiLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleAddSkill = () => {
    if (newSkill.trim() && !formData.requiredSkills.includes(newSkill.trim())) {
      setFormData((prev) => ({
        ...prev,
        requiredSkills: [...prev.requiredSkills, newSkill.trim()],
      }));
      setNewSkill('');
    }
  };

  const handleRemoveSkill = (skill) => {
    setFormData((prev) => ({
      ...prev,
      requiredSkills: prev.requiredSkills.filter((s) => s !== skill),
    }));
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
          if (mapped.length > 0) {
            await assessmentsApi.addQuestions(assessment.id, mapped);
          }
        }
      }
      sessionStorage.removeItem(STORAGE_KEY);
      sessionStorage.removeItem(STORAGE_KEY + '_questions');
      navigate('/recruiter/jobs');
    } catch (err) {
      console.error(err);
      setIsSubmitting(false);
    }
  };

  return (
    <div className={`px-4 py-8 max-w-4xl mx-auto ${isDark ? 'text-slate-100' : 'text-gray-900'}`}>
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Create New Job Posting</h1>
            <p className="text-sm opacity-75">Fill in the details to post a new job</p>
          </div>
          <button
            type="button"
            onClick={handleAiGenerateJD}
            disabled={aiLoading}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium text-sm transition-colors ${
              isDark
                ? 'bg-purple-600 hover:bg-purple-700 text-white'
                : 'bg-purple-600 hover:bg-purple-700 text-white'
            } disabled:opacity-50`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            {aiLoading ? 'Generating...' : 'AI Generate Description'}
          </button>
        </div>
        {aiError && <p className="mt-2 text-sm text-red-500">{aiError}</p>}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <section
          className={`rounded-lg border p-6 ${isDark ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white'}`}
        >
          <h2 className="text-xl font-semibold mb-4">Basic Information</h2>

          <div className="space-y-4">
            <div>
              <label htmlFor="title" className="block text-sm font-medium mb-1">
                Job Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="title"
                name="title"
                required
                value={formData.title}
                onChange={handleChange}
                className={`w-full rounded-md border px-3 py-2 ${
                  isDark
                    ? 'border-slate-600 bg-slate-900 text-slate-100'
                    : 'border-gray-300 bg-white text-gray-900'
                }`}
                placeholder="e.g., Senior Frontend Engineer"
              />
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium mb-1">
                Job Description <span className="text-red-500">*</span>
              </label>
              <textarea
                id="description"
                name="description"
                required
                rows={8}
                value={formData.description}
                onChange={handleChange}
                className={`w-full rounded-md border px-3 py-2 ${
                  isDark
                    ? 'border-slate-600 bg-slate-900 text-slate-100'
                    : 'border-gray-300 bg-white text-gray-900'
                }`}
                placeholder="Describe the role, responsibilities, and what you're looking for..."
              />
            </div>
          </div>
        </section>

        {/* Job Details */}
        <section
          className={`rounded-lg border p-6 ${isDark ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white'}`}
        >
          <h2 className="text-xl font-semibold mb-4">Job Details</h2>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="salary" className="block text-sm font-medium mb-1">
                Salary Range
              </label>
              <input
                type="text"
                id="salary"
                name="salary"
                value={formData.salary}
                onChange={handleChange}
                className={`w-full rounded-md border px-3 py-2 ${
                  isDark
                    ? 'border-slate-600 bg-slate-900 text-slate-100'
                    : 'border-gray-300 bg-white text-gray-900'
                }`}
                placeholder="e.g., PKR 80,000 - PKR 150,000 / month"
              />
            </div>

            <div>
              <label htmlFor="location" className="block text-sm font-medium mb-1">
                Location <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="location"
                name="location"
                required
                value={formData.location}
                onChange={handleChange}
                className={`w-full rounded-md border px-3 py-2 ${
                  isDark
                    ? 'border-slate-600 bg-slate-900 text-slate-100'
                    : 'border-gray-300 bg-white text-gray-900'
                }`}
                placeholder="e.g., Remote, New York, NY"
              />
            </div>

            <div>
              <label htmlFor="jobType" className="block text-sm font-medium mb-1">
                Job Type <span className="text-red-500">*</span>
              </label>
              <select
                id="jobType"
                name="jobType"
                required
                value={formData.jobType}
                onChange={handleChange}
                className={`w-full rounded-md border px-3 py-2 ${
                  isDark
                    ? 'border-slate-600 bg-slate-900 text-slate-100'
                    : 'border-gray-300 bg-white text-gray-900'
                }`}
              >
                <option value="FULL_TIME">Full-time</option>
                <option value="PART_TIME">Part-time</option>
                <option value="CONTRACT">Contract</option>
                <option value="INTERNSHIP">Internship</option>
              </select>
            </div>

            <div>
              <label htmlFor="employmentType" className="block text-sm font-medium mb-1">
                Employment Type <span className="text-red-500">*</span>
              </label>
              <select
                id="employmentType"
                name="employmentType"
                required
                value={formData.employmentType}
                onChange={handleChange}
                className={`w-full rounded-md border px-3 py-2 ${
                  isDark
                    ? 'border-slate-600 bg-slate-900 text-slate-100'
                    : 'border-gray-300 bg-white text-gray-900'
                }`}
              >
                <option value="PERMANENT">Permanent</option>
                <option value="TEMPORARY">Temporary</option>
              </select>
            </div>

            <div>
              <label htmlFor="experienceRequired" className="block text-sm font-medium mb-1">
                Experience Required
              </label>
              <input
                type="text"
                id="experienceRequired"
                name="experienceRequired"
                value={formData.experienceRequired}
                onChange={handleChange}
                className={`w-full rounded-md border px-3 py-2 ${
                  isDark
                    ? 'border-slate-600 bg-slate-900 text-slate-100'
                    : 'border-gray-300 bg-white text-gray-900'
                }`}
                placeholder="e.g., 3-5 years"
              />
            </div>

            <div>
              <label htmlFor="applicationDeadline" className="block text-sm font-medium mb-1">
                Application Deadline
              </label>
              <div className="relative">
                <input
                  type="date"
                  id="applicationDeadline"
                  name="applicationDeadline"
                  value={formData.applicationDeadline}
                  onChange={handleChange}
                  className={`w-full rounded-md border px-3 py-2 pl-10 ${
                    isDark
                      ? 'border-slate-600 bg-slate-900 text-slate-100'
                      : 'border-gray-300 bg-white text-gray-900'
                  }`}
                />
                <svg
                  className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 ${
                    isDark ? 'text-slate-400' : 'text-gray-500'
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              </div>
            </div>
          </div>
        </section>

        {/* Required Skills */}
        <section
          className={`rounded-lg border p-6 ${isDark ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white'}`}
        >
          <h2 className="text-xl font-semibold mb-4">Required Skills</h2>
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={newSkill}
              onChange={(e) => setNewSkill(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddSkill())}
              className={`flex-1 rounded-md border px-3 py-2 ${
                isDark
                  ? 'border-slate-600 bg-slate-900 text-slate-100'
                  : 'border-gray-300 bg-white text-gray-900'
              }`}
              placeholder="Add a skill (e.g., React, Python)"
            />
            <button
              type="button"
              onClick={handleAddSkill}
              className={`px-4 py-2 rounded-md font-medium ${
                isDark
                  ? 'bg-blue-600 hover:bg-blue-700 text-white'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              Add
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {formData.requiredSkills.map((skill) => (
              <span
                key={skill}
                className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm ${
                  isDark
                    ? 'bg-slate-700 text-slate-200'
                    : 'bg-gray-100 text-gray-800'
                }`}
              >
                {skill}
                <button
                  type="button"
                  onClick={() => handleRemoveSkill(skill)}
                  className="hover:text-red-500"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </section>

        {/* Requirements */}
        <section
          className={`rounded-lg border p-6 ${isDark ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white'}`}
        >
          <h2 className="text-xl font-semibold mb-4">Requirements</h2>
          <textarea
            id="requirements"
            name="requirements"
            rows={6}
            value={formData.requirements}
            onChange={handleChange}
            className={`w-full rounded-md border px-3 py-2 ${
              isDark
                ? 'border-slate-600 bg-slate-900 text-slate-100'
                : 'border-gray-300 bg-white text-gray-900'
            }`}
            placeholder="List specific requirements, qualifications, certifications, etc."
          />
        </section>

        {/* Application Options */}
        <section
          className={`rounded-lg border p-6 ${isDark ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white'}`}
        >
          <h2 className="text-xl font-semibold mb-4">Application Options</h2>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              name="coverLetterRequired"
              checked={formData.coverLetterRequired}
              onChange={handleChange}
              className="w-4 h-4"
            />
            <span>Require cover letter</span>
          </label>
        </section>

        {/* Custom Questions */}
        <section
          className={`rounded-lg border p-6 ${isDark ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white'}`}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Custom Questions</h2>
            <button
              type="button"
              onClick={() => setShowCustomQuestions(!showCustomQuestions)}
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
            >
              {showCustomQuestions ? 'Hide' : 'Select Questions'}
            </button>
          </div>
          {selectedQuestionIds.length > 0 && (
            <p className="text-sm mb-2 text-green-600 dark:text-green-400">
              {selectedQuestionIds.length} question{selectedQuestionIds.length > 1 ? 's' : ''} selected
            </p>
          )}
          {showCustomQuestions && (
            <div className="mt-2 space-y-3">
              {availableQuestions.length === 0 ? (
                <div className="text-sm opacity-75">
                  No saved questions yet.{' '}
                  <Link to="/recruiter/questions" className="text-blue-600 dark:text-blue-400 hover:underline">
                    Create questions first
                  </Link>
                </div>
              ) : (
                <>
                  {availableQuestions.map((q) => (
                    <label
                      key={q.id}
                      className={`flex items-start gap-3 p-3 rounded-md border cursor-pointer transition-colors ${
                        selectedQuestionIds.includes(q.id)
                          ? isDark ? 'border-blue-500 bg-blue-900/20' : 'border-blue-500 bg-blue-50'
                          : isDark ? 'border-slate-600 hover:border-slate-500' : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedQuestionIds.includes(q.id)}
                        onChange={() => toggleQuestion(q.id)}
                        className="mt-0.5 w-4 h-4"
                      />
                      <div>
                        <span className="text-sm font-medium">{q.question}</span>
                        <span className={`ml-2 text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                          ({q.type}{q.required ? ', required' : ''})
                        </span>
                      </div>
                    </label>
                  ))}
                </>
              )}
              <Link
                to="/recruiter/questions"
                className="inline-flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:underline mt-2"
              >
                + Create / Add More Questions
              </Link>
            </div>
          )}
        </section>

        {/* Assessment (optional) */}
        <section
          className={`rounded-lg border p-6 ${isDark ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white'}`}
        >
          <h2 className="text-xl font-semibold mb-4">Assessment (Optional)</h2>
          <p className="text-sm opacity-75 mb-4">
            Attach an MCQ assessment to this job. Candidates who apply will receive an email with a link to take the assessment.
          </p>
          <label className="flex items-center gap-2 mb-4">
            <input
              type="checkbox"
              name="includeAssessment"
              checked={formData.includeAssessment}
              onChange={handleChange}
              className="w-4 h-4"
            />
            <span>Include assessment for this job</span>
          </label>
          {formData.includeAssessment && (
            <div className="space-y-4 mt-4 pl-0">
              <div>
                <label htmlFor="assessmentName" className="block text-sm font-medium mb-1">
                  Assessment Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="assessmentName"
                  name="assessmentName"
                  value={formData.assessmentName}
                  onChange={handleChange}
                  className={`w-full rounded-md border px-3 py-2 ${
                    isDark
                      ? 'border-slate-600 bg-slate-900 text-slate-100'
                      : 'border-gray-300 bg-white text-gray-900'
                  }`}
                  placeholder="e.g., Technical Skills Assessment"
                />
              </div>
              <div>
                <label htmlFor="assessmentDuration" className="block text-sm font-medium mb-1">
                  Duration (minutes)
                </label>
                <input
                  type="number"
                  id="assessmentDuration"
                  name="assessmentDuration"
                  min={5}
                  max={180}
                  value={formData.assessmentDuration}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      assessmentDuration: Math.min(180, Math.max(5, parseInt(e.target.value, 10) || 30)),
                    }))
                  }
                  className={`w-full rounded-md border px-3 py-2 max-w-[120px] ${
                    isDark
                      ? 'border-slate-600 bg-slate-900 text-slate-100'
                      : 'border-gray-300 bg-white text-gray-900'
                  }`}
                />
              </div>

              <div className="pt-4 border-t border-slate-600 dark:border-slate-600">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-medium">Design Questions</h3>
                  <button
                    type="button"
                    onClick={() => setShowAssessmentQuestions(!showAssessmentQuestions)}
                    className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    {showAssessmentQuestions ? 'Hide' : 'Create / Design Questions'}
                  </button>
                </div>
                {(formData.assessmentQuestions || []).length > 0 && (
                  <p className="text-sm mb-2 text-green-600 dark:text-green-400">
                    {(formData.assessmentQuestions || []).length} question{(formData.assessmentQuestions || []).length !== 1 ? 's' : ''} added
                  </p>
                )}
                {showAssessmentQuestions && (
                  <div className="mt-3 space-y-4">
                    {/* Manual add */}
                    <div className={`p-4 rounded border ${isDark ? 'border-slate-600 bg-slate-900' : 'border-gray-200 bg-gray-50'}`}>
                      <h4 className="text-sm font-medium mb-3">Add question manually</h4>
                      <input
                        type="text"
                        value={manualQuestion.question_text}
                        onChange={(e) => setManualQuestion((p) => ({ ...p, question_text: e.target.value }))}
                        placeholder="Question text"
                        className={`w-full rounded border px-3 py-2 mb-3 text-sm ${
                          isDark ? 'border-slate-600 bg-slate-800' : 'border-gray-300 bg-white'
                        }`}
                      />
                      {manualQuestion.options.map((opt, i) => (
                        <label key={i} className="flex items-center gap-2 mb-2">
                          <input
                            type="radio"
                            name="correctOption"
                            checked={manualQuestion.correct_index === i}
                            onChange={() => setManualQuestion((p) => ({ ...p, correct_index: i }))}
                            className="w-4 h-4"
                          />
                          <input
                            type="text"
                            value={opt}
                            onChange={(e) => {
                              const next = [...manualQuestion.options];
                              next[i] = e.target.value;
                              setManualQuestion((p) => ({ ...p, options: next }));
                            }}
                            placeholder={`Option ${i + 1}`}
                            className={`flex-1 rounded border px-2 py-1.5 text-sm ${
                              isDark ? 'border-slate-600 bg-slate-800' : 'border-gray-300 bg-white'
                            }`}
                          />
                        </label>
                      ))}
                      <button
                        type="button"
                        onClick={() => {
                          const q = { question_text: manualQuestion.question_text, options: manualQuestion.options.filter(Boolean), correct_index: manualQuestion.correct_index };
                          if (q.question_text && q.options.length >= 2) {
                            setFormData((p) => ({ ...p, assessmentQuestions: [...(p.assessmentQuestions || []), q] }));
                            setManualQuestion({ question_text: '', options: ['', '', '', ''], correct_index: 0 });
                          }
                        }}
                        className="mt-2 px-3 py-1.5 text-sm rounded bg-blue-600 text-white hover:bg-blue-700"
                      >
                        Add to assessment
                      </button>
                    </div>

                    {/* AI generate */}
                    <div className={`p-4 rounded border ${isDark ? 'border-slate-600 bg-slate-900' : 'border-gray-200 bg-gray-50'}`}>
                      <h4 className="text-sm font-medium mb-3">AI generate questions</h4>
                      {!showAssessmentAiCountPrompt ? (
                        <button
                          type="button"
                          onClick={() => setShowAssessmentAiCountPrompt(true)}
                          className="px-3 py-1.5 text-sm rounded bg-purple-600 text-white hover:bg-purple-700"
                        >
                          Generate with AI
                        </button>
                      ) : (
                        <div className="space-y-2">
                          <label className="block text-sm">Number of questions (1–10)</label>
                          <input
                            type="number"
                            min={1}
                            max={10}
                            value={assessmentQuestionCount}
                            onChange={(e) => setAssessmentQuestionCount(Math.min(10, Math.max(1, parseInt(e.target.value, 10) || 5)))}
                            className={`w-24 rounded border px-2 py-1.5 text-sm ${
                              isDark ? 'border-slate-600 bg-slate-800' : 'border-gray-300 bg-white'
                            }`}
                          />
                          <div className="flex gap-2">
                            <button
                              type="button"
                              disabled={assessmentAiLoading}
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
                                } finally {
                                  setAssessmentAiLoading(false);
                                }
                              }}
                              className="px-3 py-1.5 text-sm rounded bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50"
                            >
                              {assessmentAiLoading ? 'Generating...' : 'Generate'}
                            </button>
                            <button
                              type="button"
                              onClick={() => setShowAssessmentAiCountPrompt(false)}
                              className="px-3 py-1.5 text-sm rounded border border-gray-400 dark:border-slate-500"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                      {aiGeneratedQuestions.length > 0 && (
                        <div className="mt-3 space-y-2">
                          {aiGeneratedQuestions.map((q, i) => (
                            <div key={i} className={`p-2 rounded text-sm flex justify-between items-start gap-2 ${
                              q.accepted ? (isDark ? 'bg-green-900/30' : 'bg-green-50') : (isDark ? 'bg-slate-800' : 'bg-gray-100')
                            }`}>
                              <div>
                                <p className="font-medium">{q.question || q.question_text}</p>
                                <p className="text-xs opacity-75 mt-1">
                                  Correct: {(q.options || [])[q.correct_index ?? 0]}
                                </p>
                              </div>
                              <div className="flex gap-1 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => setAiGeneratedQuestions((p) => {
                                    const next = [...p];
                                    next[i] = { ...next[i], accepted: !next[i].accepted };
                                    return next;
                                  })}
                                  className="text-xs px-2 py-0.5 rounded border"
                                >
                                  {q.accepted ? 'Remove' : 'Add'}
                                </button>
                              </div>
                            </div>
                          ))}
                          <button
                            type="button"
                            onClick={() => {
                              const toAdd = aiGeneratedQuestions.filter((q) => q.accepted).map((q) => ({
                                question_text: q.question || q.question_text,
                                options: q.options || [],
                                correct_index: q.correct_index ?? 0,
                              })).filter((q) => q.question_text && (q.options || []).length >= 2);
                              setFormData((p) => ({ ...p, assessmentQuestions: [...(p.assessmentQuestions || []), ...toAdd] }));
                              setAiGeneratedQuestions([]);
                            }}
                            className="mt-2 px-3 py-1.5 text-sm rounded bg-green-600 text-white hover:bg-green-700"
                          >
                            Add selected to assessment
                          </button>
                        </div>
                      )}
                    </div>

                    {/* List of added questions */}
                    {(formData.assessmentQuestions || []).length > 0 && (
                      <div className="mt-2">
                        <h4 className="text-sm font-medium mb-2">Added questions</h4>
                        {(formData.assessmentQuestions || []).map((q, i) => (
                          <div key={i} className={`p-2 rounded text-sm mb-2 flex justify-between ${
                            isDark ? 'bg-slate-800' : 'bg-gray-100'
                          }`}>
                            <span>{q.question_text || q.question}</span>
                            <button
                              type="button"
                              onClick={() => setFormData((p) => ({
                                ...p,
                                assessmentQuestions: (p.assessmentQuestions || []).filter((_, j) => j !== i),
                              }))}
                              className="text-red-500 hover:underline text-xs"
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </section>

        {/* Submit Buttons */}
        <div className="flex gap-4">
          <button
            type="submit"
            disabled={isSubmitting}
            className={`flex-1 px-6 py-3 rounded-lg font-medium transition-colors ${
              isDark
                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            } disabled:opacity-50`}
          >
            {isSubmitting ? 'Creating...' : 'Create Job Posting'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/recruiter/jobs')}
            className={`px-6 py-3 rounded-lg font-medium border transition-colors ${
              isDark
                ? 'border-slate-600 bg-slate-800 hover:bg-slate-700'
                : 'border-gray-300 bg-white hover:bg-gray-50'
            }`}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
