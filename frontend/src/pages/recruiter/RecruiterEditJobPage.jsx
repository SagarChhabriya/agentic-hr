import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTheme } from '../../contexts/ThemeContext';
import { jobsApi, assessmentsApi, aiApi } from '../../services/api';
import { showToast } from '../../components/Toast';

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
          const mapped = questions.map((q) => ({
            question_text: q.question_text || q.question,
            options: q.options || [],
            correct_index: q.correct_index ?? 0,
          })).filter((q) => q.question_text && (q.options || []).length >= 2);
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

        {/* Assessment (optional) */}
        <section className={`rounded-lg border p-6 ${isDark ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white'}`}>
          <h2 className="text-xl font-semibold mb-4">Add / Update Assessment (Optional)</h2>
          <p className="text-sm opacity-75 mb-4">
            Attach a new MCQ assessment to this job. Existing assessments are not removed.
          </p>
          <label className="flex items-center gap-2 mb-4">
            <input type="checkbox" name="includeAssessment" checked={formData.includeAssessment} onChange={handleChange} className="w-4 h-4" />
            <span>Add a new assessment for this job</span>
          </label>
          {formData.includeAssessment && (
            <div className="space-y-4 mt-4">
              <div>
                <label className="block text-sm font-medium mb-1">Assessment Name <span className="text-red-500">*</span></label>
                <input type="text" name="assessmentName" value={formData.assessmentName} onChange={handleChange}
                  className={inputCls} placeholder="e.g., Technical Skills Assessment" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Duration (minutes)</label>
                <input type="number" name="assessmentDuration" min={5} max={180}
                  value={formData.assessmentDuration}
                  onChange={(e) => setFormData((p) => ({ ...p, assessmentDuration: Math.min(180, Math.max(5, parseInt(e.target.value, 10) || 30)) }))}
                  className={`${inputCls} max-w-[120px]`} />
              </div>
              <div className="pt-4 border-t border-slate-600 dark:border-slate-600">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-medium">Design Questions</h3>
                  <button type="button" onClick={() => setShowAssessmentQuestions(!showAssessmentQuestions)}
                    className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
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
                    {/* AI generate */}
                    <div className={`p-4 rounded border ${isDark ? 'border-purple-600/50 bg-slate-900' : 'border-purple-200 bg-purple-50'}`}>
                      <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                        <svg className="w-4 h-4 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        AI generate questions
                      </h4>
                      {!showAssessmentAiCountPrompt ? (
                        <button type="button" onClick={() => setShowAssessmentAiCountPrompt(true)}
                          className="px-3 py-1.5 text-sm rounded bg-purple-600 text-white hover:bg-purple-700">
                          Generate with AI
                        </button>
                      ) : (
                        <div className="space-y-2">
                          <label className="block text-sm">Number of questions (1–10)</label>
                          <input type="number" min={1} max={10} value={assessmentQuestionCount}
                            onChange={(e) => setAssessmentQuestionCount(Math.min(10, Math.max(1, parseInt(e.target.value, 10) || 5)))}
                            className={`w-24 rounded border px-2 py-1.5 text-sm ${isDark ? 'border-slate-600 bg-slate-800' : 'border-gray-300 bg-white'}`} />
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
                              className="px-3 py-1.5 text-sm rounded bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50">
                              {assessmentAiLoading ? 'Generating...' : 'Generate'}
                            </button>
                            <button type="button" onClick={() => setShowAssessmentAiCountPrompt(false)}
                              className="px-3 py-1.5 text-sm rounded border border-gray-400 dark:border-slate-500">
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                      {aiGeneratedQuestions.length > 0 && (
                        <div className="mt-3 space-y-2">
                          {aiGeneratedQuestions.map((q, i) => (
                            <div key={i} className={`p-2 rounded text-sm flex justify-between items-start gap-2 ${q.accepted ? (isDark ? 'bg-green-900/30' : 'bg-green-50') : (isDark ? 'bg-slate-800' : 'bg-gray-100')}`}>
                              <div>
                                <p className="font-medium">{q.question || q.question_text}</p>
                                <p className="text-xs opacity-75 mt-1">Correct: {(q.options || [])[q.correct_index ?? 0]}</p>
                              </div>
                              <button type="button"
                                onClick={() => setAiGeneratedQuestions((p) => { const n = [...p]; n[i] = { ...n[i], accepted: !n[i].accepted }; return n; })}
                                className="text-xs px-2 py-0.5 rounded border">
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
                            className="mt-2 px-3 py-1.5 text-sm rounded bg-green-600 text-white hover:bg-green-700">
                            Add selected to assessment
                          </button>
                        </div>
                      )}
                    </div>
                    {/* Manual add */}
                    <div className={`p-4 rounded border ${isDark ? 'border-slate-600 bg-slate-900' : 'border-gray-200 bg-gray-50'}`}>
                      <h4 className="text-sm font-medium mb-3">Add question manually</h4>
                      <input type="text" value={manualQuestion.question_text}
                        onChange={(e) => setManualQuestion((p) => ({ ...p, question_text: e.target.value }))}
                        placeholder="Question text"
                        className={`w-full rounded border px-3 py-2 mb-3 text-sm ${isDark ? 'border-slate-600 bg-slate-800' : 'border-gray-300 bg-white'}`} />
                      {manualQuestion.options.map((opt, i) => (
                        <label key={i} className="flex items-center gap-2 mb-2">
                          <input type="radio" name="editCorrectOption" checked={manualQuestion.correct_index === i}
                            onChange={() => setManualQuestion((p) => ({ ...p, correct_index: i }))} className="w-4 h-4" />
                          <input type="text" value={opt}
                            onChange={(e) => { const next = [...manualQuestion.options]; next[i] = e.target.value; setManualQuestion((p) => ({ ...p, options: next })); }}
                            placeholder={`Option ${i + 1}`}
                            className={`flex-1 rounded border px-2 py-1.5 text-sm ${isDark ? 'border-slate-600 bg-slate-800' : 'border-gray-300 bg-white'}`} />
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
                        className="mt-2 px-3 py-1.5 text-sm rounded bg-blue-600 text-white hover:bg-blue-700">
                        Add to assessment
                      </button>
                    </div>
                    {/* Added questions list */}
                    {(formData.assessmentQuestions || []).length > 0 && (
                      <div className="mt-2">
                        <h4 className="text-sm font-medium mb-2">Added questions</h4>
                        {(formData.assessmentQuestions || []).map((q, i) => (
                          <div key={i} className={`p-2 rounded text-sm mb-2 flex justify-between ${isDark ? 'bg-slate-800' : 'bg-gray-100'}`}>
                            <span>{q.question_text || q.question}</span>
                            <button type="button"
                              onClick={() => setFormData((p) => ({ ...p, assessmentQuestions: (p.assessmentQuestions || []).filter((_, j) => j !== i) }))}
                              className="text-red-500 hover:underline text-xs">Remove</button>
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
