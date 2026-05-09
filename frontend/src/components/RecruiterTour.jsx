import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const TOUR_KEY = 'recruiterTourDone';

const STEPS = [
  {
    title: '👋 Welcome to Hirebase!',
    body: "Let's take a quick tour of your recruiter dashboard. This will only take 60 seconds.",
    emoji: '🚀',
  },
  {
    title: '📋 Create a Job',
    body: 'Go to Jobs → Create Job. Type a job title and click "AI Generate Description" to auto-fill the description, requirements, skills, and salary using AI.',
    emoji: '✨',
  },
  {
    title: '📝 Assessments',
    body: 'While creating a job, enable the Assessment section to attach an MCQ test. Use "Generate with AI" to instantly create questions based on the job description.',
    emoji: '🤖',
  },
  {
    title: '❓ Custom Questions',
    body: 'Under Questions, create your own application questions (text, yes/no, multiple choice). Attach them to any job to screen candidates before they apply.',
    emoji: '💬',
  },
  {
    title: '👥 Manage Candidates',
    body: "Under Candidates, see all applicants. Move them through stages: Applied → Assessment → Interview → Selected. Each stage change sends the candidate an email automatically.",
    emoji: '📧',
  },
  {
    title: '🎥 AI Video Interviews',
    body: 'Schedule an AI-powered video interview from a candidate\'s profile. The AI interviewer conducts the interview, records it, and gives you a full transcript and analysis.',
    emoji: '🎯',
  },
  {
    title: "🎉 You're all set!",
    body: "Start by creating your first job. Use the AI features to save time; descriptions, questions, and interview analysis are all powered by AI.",
    emoji: '🏆',
  },
];

export default function RecruiterTour() {
  const [step, setStep] = useState(0);
  const [visible, setVisible] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const done = localStorage.getItem(TOUR_KEY);
    if (!done) {
      const timer = setTimeout(() => setVisible(true), 800);
      return () => clearTimeout(timer);
    }
  }, []);

  const dismiss = () => {
    setVisible(false);
    localStorage.setItem(TOUR_KEY, 'true');
  };

  const next = () => {
    if (step < STEPS.length - 1) {
      setStep((s) => s + 1);
    } else {
      dismiss();
    }
  };

  const prev = () => setStep((s) => Math.max(0, s - 1));

  if (!visible) return null;

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  return (
    <div className="fixed inset-0 z-[9998] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={dismiss} />

      {/* Card */}
      <div className="relative z-10 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl max-w-md w-full p-6 text-white">
        {/* Progress dots */}
        <div className="flex gap-1.5 mb-5">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === step ? 'bg-blue-500 w-6' : i < step ? 'bg-green-500 w-3' : 'bg-slate-600 w-3'
              }`}
            />
          ))}
        </div>

        {/* Content */}
        <div className="text-4xl mb-3">{current.emoji}</div>
        <h3 className="text-xl font-bold mb-2">{current.title}</h3>
        <p className="text-slate-300 text-sm leading-relaxed mb-6">{current.body}</p>

        {/* Step counter */}
        <p className="text-xs text-slate-500 mb-4">Step {step + 1} of {STEPS.length}</p>

        {/* Buttons */}
        <div className="flex items-center justify-between gap-3">
          <button
            onClick={dismiss}
            className="text-sm text-slate-400 hover:text-slate-200 transition-colors"
          >
            Skip tour
          </button>
          <div className="flex gap-2">
            {step > 0 && (
              <button
                onClick={prev}
                className="px-4 py-2 rounded-lg text-sm border border-slate-600 hover:bg-slate-800 transition-colors"
              >
                Back
              </button>
            )}
            <button
              onClick={next}
              className="px-5 py-2 rounded-lg text-sm bg-blue-600 hover:bg-blue-700 font-medium transition-colors"
            >
              {isLast ? "Let's go!" : 'Next →'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Call this to reset the tour (e.g. from a Help menu) */
export function resetTour() {
  localStorage.removeItem(TOUR_KEY);
}
