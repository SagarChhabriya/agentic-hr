import { Link } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';

export default function HomePage() {
  const { theme } = useTheme();

  return (
    <div className="px-4 py-12 sm:py-16">
      <section className="grid gap-10 lg:grid-cols-2 items-center">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-blue-600 mb-3">
            AI-first hiring platform
          </p>
          <h1 className="text-4xl sm:text-5xl font-extrabold mb-4 leading-tight">
            Automate your hiring with{" "}
            <span className="text-blue-600">
              assessments, AI interviews, and insights.
            </span>
          </h1>
          <p className="text-base sm:text-lg opacity-80 mb-8 max-w-xl">
            A cloud-ready HR automation platform for end-to-end hiring: job posting, assessments,
            AI-powered interviews with LiveKit, emotion and cheating detection, and results dashboards.
          </p>
          <div className="flex flex-wrap gap-4 mb-8">
            <Link
              to="/register"
              className="inline-flex items-center justify-center rounded-md bg-blue-600 px-6 py-3 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Get started as recruiter
            </Link>
            <Link
              to="/jobs"
              className={`inline-flex items-center justify-center rounded-md px-6 py-3 text-sm font-medium border ${
                theme === 'dark'
                  ? 'border-slate-600 bg-slate-900 hover:bg-slate-800'
                  : 'border-gray-300 bg-white hover:bg-gray-50'
              }`}
            >
              Browse jobs as candidate
            </Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-3 text-sm">
            <div>
              <div className="font-semibold">AI assessments</div>
              <p className="opacity-70">
                Timed MCQs, auto-scoring, and browser-based anti-cheating.
              </p>
            </div>
            <div>
              <div className="font-semibold">LiveKit interviews</div>
              <p className="opacity-70">
                Real-time video, audio, and chat with AI interviewer and recording.
              </p>
            </div>
            <div>
              <div className="font-semibold">Actionable reports</div>
              <p className="opacity-70">
                Candidate ranking, emotion and behavior analysis, and cheat flags.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-dashed border-gray-300 dark:border-slate-700 p-6 sm:p-8">
            <h2 className="text-lg font-semibold mb-4">Choose your journey</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-gray-200 dark:border-slate-700 p-4 flex flex-col justify-between">
                <div>
                  <h3 className="font-semibold mb-1">Recruiter / Admin</h3>
                  <p className="text-sm opacity-75 mb-3">
                    Post jobs, configure assessments and interviews, and review AI-powered results.
                  </p>
                </div>
                <div className="flex gap-2">
                  <Link
                    to="/login"
                    className="text-xs font-medium underline"
                  >
                    Login
                  </Link>
                  <Link
                    to="/register"
                    className="text-xs font-medium underline"
                  >
                    Sign up
                  </Link>
                </div>
              </div>
              <div className="rounded-xl border border-gray-200 dark:border-slate-700 p-4 flex flex-col justify-between">
                <div>
                  <h3 className="font-semibold mb-1">Candidate</h3>
                  <p className="text-sm opacity-75 mb-3">
                    Discover open roles, complete assessments, join AI interviews, and track results.
                  </p>
                </div>
                <div className="flex gap-2">
                  <Link
                    to="/jobs"
                    className="text-xs font-medium underline"
                  >
                    View jobs
                  </Link>
                  <Link
                    to="/login"
                    className="text-xs font-medium underline"
                  >
                    Candidate login
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
