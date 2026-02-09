import { Link } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';

export default function LandingPage() {
  const { theme } = useTheme();

  return (
    <div className="px-4 py-12 sm:py-16">
      {/* Hero section */}
      <section className="grid gap-12 lg:grid-cols-2 items-center">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-blue-600 mb-3">
            Modern HR Automation SaaS
          </p>
          <h1 className="text-4xl sm:text-5xl font-extrabold mb-4 leading-tight">
            Automate your HR workflow{' '}
            <span className="text-blue-600">effortlessly.</span>
          </h1>
          <p className="text-base sm:text-lg opacity-80 mb-8 max-w-xl">
            From job posting to AI-powered assessments and LiveKit interviews, streamline hiring with
            real-time analytics, emotion and cheating detection, and clear candidate insights.
          </p>
          <div className="flex flex-wrap gap-4 mb-10">
            <Link
              to="/login"
              className="inline-flex items-center justify-center rounded-md bg-blue-600 px-6 py-3 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Get Started
            </Link>
            <a
              href="#features"
              className={`inline-flex items-center justify-center rounded-md px-6 py-3 text-sm font-medium border ${
                theme === 'dark'
                  ? 'border-slate-600 bg-slate-900 hover:bg-slate-800'
                  : 'border-gray-300 bg-white hover:bg-gray-50'
              }`}
            >
              Learn More
            </a>
          </div>
          <div className="grid gap-4 sm:grid-cols-3 text-sm">
            <div>
              <div className="font-semibold mb-1">Smart assessments</div>
              <p className="opacity-70">
                Configure timed MCQs, enforce anti-cheating, and auto-score candidates.
              </p>
            </div>
            <div>
              <div className="font-semibold mb-1">AI-driven interviews</div>
              <p className="opacity-70">
                LiveKit-powered interviews with emotion and behavior analysis.
              </p>
            </div>
            <div>
              <div className="font-semibold mb-1">Actionable insights</div>
              <p className="opacity-70">
                Unified dashboards for recruiters and candidates with clear scoring.
              </p>
            </div>
          </div>
        </div>

        {/* Hero illustration placeholder */}
        <div className="relative h-64 sm:h-80 lg:h-96">
          <div
            className={`absolute inset-0 rounded-3xl border ${
              theme === 'dark'
                ? 'border-slate-700 bg-slate-900'
                : 'border-gray-200 bg-white'
            } shadow-lg flex flex-col justify-between p-6`}
          >
            <div className="flex justify-between items-center mb-4">
              <div>
                <p className="text-xs uppercase tracking-wide opacity-60">
                  Active pipeline
                </p>
                <p className="text-lg font-semibold">Senior Frontend Engineer</p>
              </div>
              <span className="inline-flex items-center rounded-full bg-green-100 text-green-800 text-xs px-3 py-1">
                Open
              </span>
            </div>
            <div className="grid grid-cols-3 gap-4 text-xs">
              <div>
                <p className="opacity-60">Candidates</p>
                <p className="text-lg font-bold">128</p>
              </div>
              <div>
                <p className="opacity-60">In assessment</p>
                <p className="text-lg font-bold text-blue-600">42</p>
              </div>
              <div>
                <p className="opacity-60">Interviews</p>
                <p className="text-lg font-bold">16</p>
              </div>
            </div>
            <div className="mt-4 text-xs opacity-70">
              Live AI interviews and proctored assessments are running now. Recruiters will see
              ranked results as soon as sessions complete.
            </div>
          </div>
        </div>
      </section>

      {/* Features section */}
      <section id="features" className="mt-16 sm:mt-20">
        <h2 className="text-2xl sm:text-3xl font-bold mb-4">Features</h2>
        <p className="text-sm sm:text-base opacity-80 mb-8 max-w-3xl">
          A single platform to manage job postings, candidate applications, assessments, interviews,
          and results. Built for modern, distributed teams.
        </p>
        {/* You can extend this section with detailed feature cards */}
      </section>

      {/* Pricing section placeholder */}
      <section id="pricing" className="mt-16 sm:mt-20">
        <h2 className="text-2xl sm:text-3xl font-bold mb-4">Pricing</h2>
        <p className="text-sm sm:text-base opacity-80 mb-4">
          Simple plans for teams of any size. (To be implemented as you define tiers.)
        </p>
      </section>

      {/* Contact section placeholder */}
      <section id="contact" className="mt-16 sm:mt-20">
        <h2 className="text-2xl sm:text-3xl font-bold mb-4">Contact</h2>
        <p className="text-sm sm:text-base opacity-80">
          Add your contact form or support details here to let companies reach out for demos and
          onboarding.
        </p>
      </section>

      {/* Footer anchors */}
      <section id="about" className="mt-16 sm:mt-20 text-sm opacity-80">
        <h3 className="font-semibold mb-2">About</h3>
        <p>
          Agentic HR Automation is a final-year project turned SaaS concept for automating the hiring
          lifecycle with AI and real-time collaboration.
        </p>
      </section>
      <section id="privacy" className="mt-8 text-sm opacity-80">
        <h3 className="font-semibold mb-2">Privacy</h3>
        <p>Describe your privacy practices and data retention policies here.</p>
      </section>
      <section id="terms" className="mt-8 text-sm opacity-80">
        <h3 className="font-semibold mb-2">Terms</h3>
        <p>Summarize the terms of service and usage conditions here.</p>
      </section>
    </div>
  );
}

