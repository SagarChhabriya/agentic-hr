import { useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTheme } from '../../contexts/ThemeContext';
import { assessmentsApi } from '../../services/api';

function fmt(secs: number) {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function AssessmentAttemptPage() {
  const { assessmentId } = useParams<{ assessmentId: string }>();
  const [searchParams] = useSearchParams();
  const applicationId = searchParams.get('application_id');
  const navigate = useNavigate();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const queryClient = useQueryClient();

  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [submitted, setSubmitted] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [started, setStarted] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoSubmitRef = useRef(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ['assessment-for-attempt', assessmentId, applicationId],
    queryFn: () => assessmentsApi.getForAttempt(assessmentId!, applicationId!),
    enabled: !!assessmentId && !!applicationId,
  });

  const submitMutation = useMutation({
    mutationFn: (body: { application_id: string; assessment_id: string; answers: { question_id: string; selected_index: number }[] }) =>
      assessmentsApi.submitAttempt(body),
    onSuccess: () => {
      setSubmitted(true);
      queryClient.invalidateQueries({ queryKey: ['applications', 'mine'] });
    },
  });

  // Initialise timer once data arrives
  useEffect(() => {
    if (data?.duration_minutes && timeLeft === null) {
      setTimeLeft(data.duration_minutes * 60);
    }
  }, [data, timeLeft]);

  // Countdown
  useEffect(() => {
    if (!started || timeLeft === null) return;
    if (timeLeft <= 0) {
      if (!autoSubmitRef.current) {
        autoSubmitRef.current = true;
        doSubmit();
      }
      return;
    }
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t === null) return null;
        if (t <= 1) {
          clearInterval(timerRef.current!);
          if (!autoSubmitRef.current) {
            autoSubmitRef.current = true;
            doSubmit();
          }
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current!);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [started]);

  const doSubmit = () => {
    if (!applicationId || !assessmentId || !data?.questions) return;
    const answersList = Object.entries(answers).map(([question_id, selected_index]) => ({
      question_id,
      selected_index,
    }));
    submitMutation.mutate({ application_id: applicationId, assessment_id: assessmentId, answers: answersList });
  };

  if (!applicationId) {
    return (
      <div className={`px-4 py-16 text-center ${isDark ? 'text-slate-100' : 'text-gray-900'}`}>
        <p className="text-red-500 mb-4">Invalid assessment link. Please use the link from your email.</p>
        <button onClick={() => navigate('/candidate/dashboard')} className="text-indigo-500 hover:underline text-sm">
          ← Go to Dashboard
        </button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[40vh]">
        <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className={`px-4 py-16 text-center ${isDark ? 'text-slate-100' : 'text-gray-900'}`}>
        <p className="text-red-500 mb-4">Failed to load assessment. You may need to log in first.</p>
        <button onClick={() => navigate('/login')} className="text-indigo-500 hover:underline text-sm">Log in</button>
      </div>
    );
  }

  if (submitted || submitMutation.isSuccess) {
    const result = submitMutation.data;
    const pct = result?.score_percent ?? 0;
    const passed = pct >= 60;
    return (
      <div className={`max-w-xl mx-auto px-4 py-16 text-center ${isDark ? 'text-slate-100' : 'text-gray-900'}`}>
        <div className={`w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center ${passed ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-amber-100 dark:bg-amber-900/30'}`}>
          {passed ? (
            <svg className="w-10 h-10 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ) : (
            <svg className="w-10 h-10 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )}
        </div>
        <h1 className="text-2xl font-bold mb-2">Assessment Submitted</h1>
        <p className={`text-sm mb-8 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Your answers have been recorded.</p>
        {result && (
          <div className={`rounded-xl border p-6 mb-6 text-left ${isDark ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white shadow-sm'}`}>
            <div className="flex items-center justify-between mb-4">
              <p className={`text-xs font-semibold uppercase tracking-wide ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Your result</p>
              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${passed ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'}`}>
                {passed ? 'Passed' : 'Needs Improvement'}
              </span>
            </div>
            <div className="flex items-end gap-2 mb-3">
              <p className={`text-5xl font-bold ${passed ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>{pct.toFixed(0)}</p>
              <p className={`text-lg mb-1 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>%</p>
            </div>
            <div className={`w-full h-2 rounded-full overflow-hidden mb-3 ${isDark ? 'bg-slate-700' : 'bg-gray-100'}`}>
              <div className={`h-full rounded-full transition-all ${passed ? 'bg-emerald-500' : 'bg-amber-500'}`} style={{ width: `${pct}%` }} />
            </div>
            <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
              {result.correct_count} correct out of {result.total_questions} questions
            </p>
          </div>
        )}
        <button onClick={() => navigate('/candidate/applications')}
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-medium text-sm hover:opacity-90 transition-opacity">
          View My Applications →
        </button>
      </div>
    );
  }

  const questions = data.questions || [];
  const answeredCount = Object.keys(answers).length;
  const totalQuestions = questions.length;
  const progressPct = totalQuestions > 0 ? (answeredCount / totalQuestions) * 100 : 0;
  const isWarning = timeLeft !== null && timeLeft <= 300 && timeLeft > 0;
  const isDanger = timeLeft !== null && timeLeft <= 60;

  // Pre-start screen
  if (!started) {
    return (
      <div className={`max-w-xl mx-auto px-4 py-16 ${isDark ? 'text-slate-100' : 'text-gray-900'}`}>
        <div className={`rounded-xl border overflow-hidden ${isDark ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white shadow-sm'}`}>
          <div className="h-1 bg-gradient-to-r from-indigo-500 to-violet-600" />
          <div className="p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-5 rounded-full bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center">
              <svg className="w-8 h-8 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/>
              </svg>
            </div>
            <h1 className="text-2xl font-bold mb-2">{data.name || data.assessment_name}</h1>
            {data.job_title && <p className={`text-sm mb-6 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>{data.job_title}</p>}

            <div className={`grid grid-cols-2 gap-4 mb-8 text-left rounded-lg p-4 ${isDark ? 'bg-slate-900/60' : 'bg-gray-50'}`}>
              <div>
                <p className={`text-xs font-medium mb-1 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>Questions</p>
                <p className="text-lg font-bold">{totalQuestions}</p>
              </div>
              <div>
                <p className={`text-xs font-medium mb-1 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>Time Limit</p>
                <p className="text-lg font-bold">{data.duration_minutes} min</p>
              </div>
            </div>

            <div className={`text-sm text-left space-y-2 mb-8 p-4 rounded-lg border ${isDark ? 'border-amber-800/50 bg-amber-900/10 text-amber-300' : 'border-amber-200 bg-amber-50 text-amber-800'}`}>
              <p className="font-semibold flex items-center gap-1.5">
                <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                </svg>
                Instructions
              </p>
              <ul className="space-y-1 list-disc list-inside">
                <li>Timer starts as soon as you click Begin.</li>
                <li>Assessment auto-submits when time runs out.</li>
                <li>You can only submit once — answers cannot be changed after submission.</li>
                <li>Ensure a stable internet connection throughout.</li>
              </ul>
            </div>

            <button onClick={() => setStarted(true)}
              className="w-full py-3 rounded-lg bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-semibold text-sm transition-all shadow-sm">
              Begin Assessment →
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`${isDark ? 'text-slate-100' : 'text-gray-900'}`}>
      {/* Sticky header bar */}
      <div className={`sticky top-0 z-30 border-b ${isDark ? 'bg-slate-900/98 border-slate-800' : 'bg-white/98 border-gray-200'} backdrop-blur shadow-sm`}>
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex-1 min-w-0">
            <p className={`text-xs font-medium truncate ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>{data.name || data.assessment_name}</p>
            <div className="flex items-center gap-3 mt-1">
              <div className={`flex-1 h-1.5 rounded-full overflow-hidden ${isDark ? 'bg-slate-700' : 'bg-gray-100'}`}>
                <div className="h-full rounded-full bg-indigo-500 transition-all" style={{ width: `${progressPct}%` }} />
              </div>
              <p className={`text-xs shrink-0 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>{answeredCount}/{totalQuestions} answered</p>
            </div>
          </div>

          {/* Countdown */}
          <div className={`shrink-0 flex items-center gap-2 px-4 py-2 rounded-lg border font-mono text-lg font-bold tabular-nums ${
            isDanger
              ? 'border-red-300 bg-red-50 text-red-600 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400 animate-pulse'
              : isWarning
                ? 'border-amber-300 bg-amber-50 text-amber-600 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-400'
                : isDark ? 'border-slate-700 bg-slate-800 text-slate-200' : 'border-gray-200 bg-gray-50 text-gray-800'
          }`}>
            <svg className="w-4 h-4 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            {timeLeft !== null ? fmt(timeLeft) : `${data.duration_minutes}:00`}
          </div>
        </div>
        {isWarning && (
          <div className={`px-4 py-1.5 text-center text-xs font-medium ${isDanger ? 'bg-red-500 text-white' : 'bg-amber-400 text-amber-900'}`}>
            {isDanger ? '⚡ Less than 1 minute remaining — submit now!' : '⏰ Less than 5 minutes remaining'}
          </div>
        )}
      </div>

      {/* Questions */}
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-5">
        {questions.map((q: { id: string; question_text: string; options: string[] }, idx: number) => {
          const isAnswered = answers[q.id] !== undefined;
          return (
            <div key={q.id} className={`rounded-xl border transition-all ${
              isAnswered
                ? isDark ? 'border-indigo-700/60 bg-indigo-900/10' : 'border-indigo-200 bg-indigo-50/50'
                : isDark ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white shadow-sm'
            }`}>
              <div className="p-5">
                <div className="flex items-start gap-3 mb-4">
                  <span className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                    isAnswered
                      ? 'bg-indigo-600 text-white'
                      : isDark ? 'bg-slate-700 text-slate-400' : 'bg-gray-100 text-gray-500'
                  }`}>{idx + 1}</span>
                  <p className={`text-sm font-medium leading-relaxed pt-0.5 ${isDark ? 'text-slate-100' : 'text-gray-800'}`}>
                    {q.question_text}
                  </p>
                </div>
                <div className="space-y-2 pl-10">
                  {q.options?.map((opt: string, oi: number) => (
                    <label key={oi} className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer border transition-colors ${
                      answers[q.id] === oi
                        ? isDark ? 'border-indigo-500 bg-indigo-900/30 text-indigo-200' : 'border-indigo-500 bg-indigo-50 text-indigo-800'
                        : isDark ? 'border-slate-700 hover:border-slate-500 hover:bg-slate-700/50' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}>
                      <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                        answers[q.id] === oi
                          ? 'border-indigo-500 bg-indigo-500'
                          : isDark ? 'border-slate-600' : 'border-gray-300'
                      }`}>
                        {answers[q.id] === oi && (
                          <span className="w-2 h-2 rounded-full bg-white" />
                        )}
                      </span>
                      <input type="radio" name={q.id} checked={answers[q.id] === oi}
                        onChange={() => setAnswers((prev) => ({ ...prev, [q.id]: oi }))} className="sr-only" />
                      <span className="text-sm">{String.fromCharCode(65 + oi)}. {opt}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          );
        })}

        {/* Submit */}
        <div className={`sticky bottom-0 z-10 -mx-4 px-4 py-3 border-t mt-4 ${isDark ? 'bg-slate-900/95 border-slate-800' : 'bg-white/95 border-gray-200'} backdrop-blur`}>
          <div className="max-w-3xl mx-auto flex items-center justify-between gap-4">
            <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
              {answeredCount < totalQuestions
                ? <span className="text-amber-500 font-medium">{totalQuestions - answeredCount} question{totalQuestions - answeredCount !== 1 ? 's' : ''} unanswered</span>
                : <span className="text-emerald-500 font-medium">All questions answered ✓</span>
              }
            </p>
            <button onClick={doSubmit}
              disabled={submitMutation.isPending}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-semibold bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white disabled:opacity-50 transition-all shadow-sm">
              {submitMutation.isPending ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                  </svg>
                  Submitting…
                </>
              ) : 'Submit Assessment'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
