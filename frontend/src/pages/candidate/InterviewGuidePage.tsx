import { useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTheme } from '../../contexts/ThemeContext';
import { jobsApi } from '../../services/api';

type Section = {
  id: string;
  title: string;
  icon: React.ReactNode;
  color: string;
  items: { heading: string; body: string }[];
};

const GENERIC_SECTIONS: Section[] = [
  {
    id: 'prepare',
    title: 'Before the Interview',
    color: 'indigo',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
      </svg>
    ),
    items: [
      { heading: 'Research the role', body: 'Read the job description carefully. Know the key responsibilities, required skills, and how they match your experience.' },
      { heading: 'Prepare your STAR stories', body: 'For each key skill listed, prepare a real example using Situation → Task → Action → Result. Aim for 3–5 solid stories.' },
      { heading: 'Test your tech', body: 'Check your microphone, camera, and internet connection at least 30 minutes before the interview. Use headphones to avoid echo.' },
      { heading: 'Have your resume ready', body: 'Keep a printed or digital copy of your resume handy. Be ready to walk through it confidently.' },
      { heading: 'Prepare questions to ask', body: 'Have 2–3 thoughtful questions ready. This shows genuine interest and helps you evaluate the role too.' },
    ],
  },
  {
    id: 'during',
    title: 'During the Interview',
    color: 'violet',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.069A1 1 0 0121 8.87v6.26a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
      </svg>
    ),
    items: [
        { heading: 'Listen carefully before answering', body: "If you're unsure about a question, it's perfectly fine to say \"That's a great question, let me take a moment to think.\" Avoid rushing." },
      { heading: 'Be concise and specific', body: 'Avoid vague answers. Use concrete examples with numbers and outcomes when possible (e.g., "I reduced load time by 40%").' },
      { heading: 'Maintain eye contact', body: 'Look at the camera, not the screen. Smile naturally. Sit up straight — body language communicates confidence.' },
      { heading: 'Show enthusiasm', body: 'Express genuine interest in the role and company. Interviewers hire people they believe are excited about the opportunity.' },
      { heading: 'Avoid negative talk', body: 'Never badmouth a previous employer. Reframe challenges as learning experiences.' },
    ],
  },
  {
    id: 'questions',
    title: 'Common Interview Questions',
    color: 'cyan',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    items: [
      { heading: '"Tell me about yourself."', body: "Structure: Present role/background \u2192 Key strengths/achievements \u2192 Why you're here now. Keep it under 90 seconds." },
      { heading: '"What is your greatest strength?"', body: 'Pick a strength directly relevant to the role. Back it with a specific example of how it led to a positive outcome.' },
      { heading: '"Describe a challenge you faced."', body: "Use STAR. Focus on what YOU did (not 'we'), and end on what you learned or the positive result." },
      { heading: '"Where do you see yourself in 5 years?"', body: "Show ambition that aligns with the role. Interviewers want to know you're growth-oriented and will stay engaged." },
      { heading: '"Why do you want this role?"', body: 'Tie your answer to specific aspects of the job and company (mission, products, team culture). Research beforehand.' },
      { heading: '"Do you have any questions for us?"', body: "Great options: 'What does success look like in the first 90 days?', 'How does the team collaborate?', 'What's the biggest challenge the team is facing right now?'" },
    ],
  },
  {
    id: 'ai',
    title: 'AI Interview Specifics',
    color: 'violet',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17H3a2 2 0 01-2-2V5a2 2 0 012-2h14a2 2 0 012 2v10a2 2 0 01-2 2h-2" />
      </svg>
    ),
    items: [
      { heading: 'Speak clearly and at a natural pace', body: 'The AI transcribes everything you say. Avoid mumbling, excessive filler words ("um", "uh"), or speaking too fast.' },
      { heading: 'Answer completely before pausing', body: 'The AI detects when you\'ve finished speaking to ask the next question. Signal you\'re done by ending with a confident, clear statement.' },
      { heading: 'Stay on topic', body: 'The AI evaluates relevance, depth, and communication. Keep answers focused on the question asked.' },
      { heading: 'Treat it like a real interview', body: 'Dress professionally, sit in a quiet well-lit space, and take it seriously. Your recording is reviewed by the recruiter.' },
      { heading: 'Your video is recorded', body: 'The session is recorded for recruiter review. Ensure your background is clean and you\'re looking at the camera.' },
    ],
  },
  {
    id: 'after',
    title: 'After the Interview',
    color: 'emerald',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    items: [
      { heading: 'Send a thank-you note', body: 'If you have the interviewer\'s contact, send a brief thank-you email within 24 hours. Reaffirm your interest in the role.' },
      { heading: 'Reflect and document', body: 'Write down questions you were asked and how you answered. This helps you improve for future interviews.' },
      { heading: 'Follow up if needed', body: 'If you haven\'t heard back within the stated timeline, a polite follow-up email is appropriate and shows initiative.' },
      { heading: 'Stay positive', body: 'Every interview — good or bad — is a learning experience. Identify what went well and what to improve.' },
    ],
  },
];

const COLOR_MAP: Record<string, { bg: string; border: string; icon: string; badge: string }> = {
  indigo: {
    bg:     'bg-indigo-50 dark:bg-indigo-900/20',
    border: 'border-indigo-200 dark:border-indigo-800/50',
    icon:   'text-indigo-600 dark:text-indigo-400',
    badge:  'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300',
  },
  violet: {
    bg:     'bg-violet-50 dark:bg-violet-900/20',
    border: 'border-violet-200 dark:border-violet-800/50',
    icon:   'text-violet-600 dark:text-violet-400',
    badge:  'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300',
  },
  cyan: {
    bg:     'bg-cyan-50 dark:bg-cyan-900/20',
    border: 'border-cyan-200 dark:border-cyan-800/50',
    icon:   'text-cyan-600 dark:text-cyan-400',
    badge:  'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300',
  },
  emerald: {
    bg:     'bg-emerald-50 dark:bg-emerald-900/20',
    border: 'border-emerald-200 dark:border-emerald-800/50',
    icon:   'text-emerald-600 dark:text-emerald-400',
    badge:  'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  },
};

export default function InterviewGuidePage() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [searchParams] = useSearchParams();
  const jobId = searchParams.get('job');
  const [openSection, setOpenSection] = useState<string | null>('prepare');

  const { data: job } = useQuery({
    queryKey: ['job-public', jobId],
    queryFn: () => jobsApi.getPublic(jobId!),
    enabled: !!jobId,
  });

  const cardCls = `rounded-xl border ${isDark ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white shadow-sm'}`;

  return (
    <div className={`max-w-3xl mx-auto px-4 py-6 ${isDark ? 'text-slate-100' : 'text-gray-900'}`}>

      {/* Breadcrumb */}
      <Link to="/candidate/applications"
        className={`inline-flex items-center gap-1 text-xs mb-5 ${isDark ? 'text-slate-400 hover:text-slate-200' : 'text-gray-400 hover:text-gray-600'}`}>
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/>
        </svg>
        My Applications
      </Link>

      {/* Hero */}
      <div className={`rounded-xl border mb-6 overflow-hidden ${isDark ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white shadow-sm'}`}>
        <div className="h-1 bg-gradient-to-r from-indigo-500 to-violet-600" />
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shrink-0 shadow-md">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.069A1 1 0 0121 8.87v6.26a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"/>
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-bold mb-1">Interview Preparation Guide</h1>
              <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                Tips, techniques, and common questions to help you ace your interview.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Job-specific banner */}
      {job && (
        <div className={`rounded-xl border p-4 mb-6 ${isDark ? 'border-indigo-800/50 bg-indigo-900/20' : 'border-indigo-200 bg-indigo-50'}`}>
          <p className={`text-xs font-semibold uppercase tracking-wide mb-2 ${isDark ? 'text-indigo-300' : 'text-indigo-600'}`}>
            Job-Specific Tips — {job.title}
          </p>
          <div className="space-y-2">
            {(job.required_skills || []).length > 0 && (
              <p className={`text-sm ${isDark ? 'text-indigo-200' : 'text-indigo-800'}`}>
                <span className="font-medium">Key skills to highlight:</span>{' '}
                {(job.required_skills || []).join(', ')}
              </p>
            )}
            {job.experience_required && (
              <p className={`text-sm ${isDark ? 'text-indigo-200' : 'text-indigo-800'}`}>
                <span className="font-medium">Experience level:</span> {job.experience_required} — prepare examples that demonstrate this depth.
              </p>
            )}
            {job.location && (
              <p className={`text-sm ${isDark ? 'text-indigo-200' : 'text-indigo-800'}`}>
                <span className="font-medium">Location:</span> {job.location} — be ready to discuss your availability/remote work preferences.
              </p>
            )}
            {job.description && (
              <details className="mt-2">
                <summary className={`text-xs cursor-pointer font-medium ${isDark ? 'text-indigo-300' : 'text-indigo-600'}`}>
                  View job description snippet
                </summary>
                <p className={`mt-2 text-xs leading-relaxed ${isDark ? 'text-indigo-200' : 'text-indigo-800'}`}>
                  {job.description.slice(0, 400)}{job.description.length > 400 ? '…' : ''}
                </p>
              </details>
            )}
          </div>
        </div>
      )}

      {/* Accordion sections */}
      <div className="space-y-3">
        {GENERIC_SECTIONS.map((section) => {
          const colors = COLOR_MAP[section.color] || COLOR_MAP.indigo;
          const isOpen = openSection === section.id;
          return (
            <div key={section.id} className={`rounded-xl border overflow-hidden transition-all ${isDark ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white shadow-sm'}`}>
              <button
                onClick={() => setOpenSection(isOpen ? null : section.id)}
                className={`w-full flex items-center justify-between px-5 py-4 text-left transition-colors ${
                  isOpen
                    ? isDark ? 'bg-slate-700/50' : 'bg-gray-50'
                    : 'hover:' + (isDark ? 'bg-slate-700/30' : 'bg-gray-50')
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${colors.bg} ${colors.icon}`}>
                    {section.icon}
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{section.title}</p>
                    <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>{section.items.length} tips</p>
                  </div>
                </div>
                <svg className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''} ${isDark ? 'text-slate-400' : 'text-gray-400'}`}
                  fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/>
                </svg>
              </button>

              {isOpen && (
                <div className={`px-5 pb-5 pt-1 border-t ${isDark ? 'border-slate-700' : 'border-gray-100'}`}>
                  <div className="space-y-4 mt-3">
                    {section.items.map((item, i) => (
                      <div key={i} className="flex gap-3">
                        <span className={`mt-0.5 text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${colors.badge}`}>{i + 1}</span>
                        <div>
                          <p className={`text-sm font-semibold mb-0.5 ${isDark ? 'text-slate-200' : 'text-gray-800'}`}>{item.heading}</p>
                          <p className={`text-sm leading-relaxed ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>{item.body}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* STAR method card */}
      <div className={`mt-6 rounded-xl border p-5 ${isDark ? 'border-violet-800/50 bg-violet-900/10' : 'border-violet-200 bg-violet-50'}`}>
        <p className={`text-xs font-semibold uppercase tracking-wide mb-3 ${isDark ? 'text-violet-300' : 'text-violet-700'}`}>
          The STAR Method — Quick Reference
        </p>
        <div className="grid sm:grid-cols-4 gap-3">
          {[
            { letter: 'S', word: 'Situation', desc: 'Set the scene. What was the context?' },
            { letter: 'T', word: 'Task', desc: 'What was your goal or responsibility?' },
            { letter: 'A', word: 'Action', desc: 'What did YOU specifically do?' },
            { letter: 'R', word: 'Result', desc: 'What was the outcome? Quantify if possible.' },
          ].map((s) => (
            <div key={s.letter} className={`rounded-lg p-3 text-center ${isDark ? 'bg-violet-900/20' : 'bg-white/80'}`}>
              <div className={`w-8 h-8 rounded-full mx-auto mb-2 flex items-center justify-center text-sm font-bold ${isDark ? 'bg-violet-700 text-violet-100' : 'bg-violet-600 text-white'}`}>
                {s.letter}
              </div>
              <p className={`text-xs font-semibold mb-1 ${isDark ? 'text-violet-200' : 'text-violet-800'}`}>{s.word}</p>
              <p className={`text-xs ${isDark ? 'text-violet-300' : 'text-violet-600'}`}>{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
