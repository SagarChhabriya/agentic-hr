import { Link } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import {
  JobsIcon,
  CandidatesIcon,
  AssessmentIcon,
  InterviewIcon,
  CheckIcon,
} from '../components/icons/IconComponents';

export default function LandingPage() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const cardBase = `rounded-xl border p-6 transition-all duration-200 ${
    isDark
      ? 'border-slate-700 bg-slate-800/50 hover:border-blue-500/50 hover:shadow-lg hover:shadow-blue-500/5'
      : 'border-gray-200 bg-white hover:border-blue-400 hover:shadow-lg hover:shadow-blue-500/10'
  }`;

  const features = [
    {
      icon: JobsIcon,
      title: 'Smart Job Management',
      description:
        'Post jobs, track applications, and manage pipelines in one place. Built for distributed teams.',
      color: 'blue',
    },
    {
      icon: AssessmentIcon,
      title: 'AI-Powered Assessments',
      description:
        'Configure timed MCQs, enforce anti-cheating, and auto-score candidates with actionable insights.',
      color: 'blue',
    },
    {
      icon: InterviewIcon,
      title: 'Live AI Interviews',
      description:
        'LiveKit voice interviews conducted by a Groq LLM agent with job-specific questions, legal guardrails, and an AI-generated summary with score.',
      color: 'blue',
    },
    {
      icon: CandidatesIcon,
      title: 'Unified Candidate View',
      description:
        'Single dashboard for recruiters and candidates with clear scoring, timelines, and next steps.',
      color: 'blue',
    },
  ];

  const testimonials = [
    {
      quote:
        'Hirebase cut our time-to-hire by 40%. The AI assessments and interview insights are game-changers.',
      author: 'Sarah Chen',
      role: 'Head of Talent, TechCorp',
      avatar: null,
    },
    {
      quote:
        'Finally, a platform that handles assessments, interviews, and analytics in one place. Highly recommend.',
      author: 'Marcus Johnson',
      role: 'Recruiting Lead, ScaleUp',
      avatar: null,
    },
    {
      quote:
        'The candidate experience is smooth, and recruiters get clear, actionable data. Exactly what we needed.',
      author: 'Elena Rodriguez',
      role: 'HR Director, InnovateCo',
      avatar: null,
    },
  ];

  const stats = [
    { value: '10K+', label: 'Candidates Assessed' },
    { value: '500+', label: 'Companies Trust Us' },
    { value: '40%', label: 'Faster Hiring' },
  ];
  const trustChips = ['FastAPI backend', 'LiveKit interviews', 'Groq AI scoring', 'Supabase storage'];

  const pricingPlans = [
    {
      name: 'Starter',
      price: 'Free',
      period: 'forever',
      description: 'Perfect for small teams getting started',
      features: ['Up to 5 job postings', 'Basic assessments', '10 candidates/month'],
      cta: 'Get Started Free',
      href: '/register',
      highlighted: false,
    },
    {
      name: 'Professional',
      price: '$49',
      period: '/month',
      description: 'For growing teams that need more',
      features: [
        'Unlimited job postings',
        'AI assessments & interviews',
        'Unlimited candidates',
        'Analytics & insights',
      ],
      cta: 'Start Free Trial',
      href: '/register',
      highlighted: true,
    },
    {
      name: 'Enterprise',
      price: 'Custom',
      period: '',
      description: 'For large organizations',
      features: ['Everything in Pro', 'SSO & custom integrations', 'Dedicated support', 'SLA guarantee'],
      cta: 'Contact Sales',
      href: '#contact',
      highlighted: false,
    },
  ];

  return (
    <div className="overflow-hidden">
      {/* Hero Section */}
      <section className="relative px-4 pt-12 pb-16 sm:pt-16 sm:pb-24 lg:pt-20 lg:pb-28">
        <div
          className={`absolute inset-0 -z-10 ${
            isDark
              ? 'bg-gradient-to-b from-slate-900 via-slate-900 to-slate-900'
              : 'bg-gradient-to-b from-blue-50/50 via-gray-50 to-gray-50'
          }`}
        />
        <div className="max-w-7xl mx-auto">
          <div className="grid gap-12 lg:grid-cols-2 items-center">
            <div className="max-w-xl">
              <p className="text-sm font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400 mb-4">
                Modern HR Automation
              </p>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.1] mb-6">
                Automate your hiring{' '}
                <span className="text-blue-600 dark:text-blue-400">from start to finish</span>
              </h1>
              <p className="text-lg sm:text-xl opacity-80 mb-8 leading-relaxed">
                From job posting to AI voice interviews, automatically score resumes, run MCQ assessments,
                conduct structured voice interviews, and send offers all in one platform.
              </p>
              <div className="flex flex-wrap gap-4 mb-12">
                <Link
                  to="/login"
                  className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-6 py-3.5 text-base font-semibold text-white shadow-lg shadow-blue-600/25 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900 transition-colors"
                >
                  Get Started
                </Link>
                <a
                  href="#features"
                  className={`inline-flex items-center justify-center rounded-lg px-6 py-3.5 text-base font-semibold border-2 transition-colors ${
                    isDark
                      ? 'border-slate-600 hover:border-slate-500 hover:bg-slate-800/50'
                      : 'border-gray-300 hover:border-gray-400 hover:bg-gray-100'
                  }`}
                >
                  See Features
                </a>
              </div>
              <div className="grid gap-6 sm:grid-cols-3 text-sm">
                <div>
                  <div className="flex items-center gap-2 font-semibold mb-1">
                    <CheckIcon className="w-5 h-5 text-green-500 shrink-0" />
                    AI Assessments
                  </div>
                  <p className="opacity-70 pl-7">Timed MCQs auto-scored with per-question analytics</p>
                </div>
                <div>
                  <div className="flex items-center gap-2 font-semibold mb-1">
                    <CheckIcon className="w-5 h-5 text-green-500 shrink-0" />
                    Voice AI Interviews
                  </div>
                  <p className="opacity-70 pl-7">LiveKit-powered agent with Groq LLM + Deepgram</p>
                </div>
                <div>
                  <div className="flex items-center gap-2 font-semibold mb-1">
                    <CheckIcon className="w-5 h-5 text-green-500 shrink-0" />
                    Full hiring pipeline
                  </div>
                  <p className="opacity-70 pl-7">Apply → assess → interview → offer in one platform</p>
                </div>
              </div>
              <div className="mt-8 flex flex-wrap gap-2">
                {trustChips.map((chip) => (
                  <span
                    key={chip}
                    className={`text-xs font-medium px-2.5 py-1 rounded-full border ${
                      isDark ? 'border-slate-700 bg-slate-800/70 text-slate-300' : 'border-gray-200 bg-white text-gray-600'
                    }`}
                  >
                    {chip}
                  </span>
                ))}
              </div>
            </div>

            {/* Hero live pipeline mockup */}
            <div className="relative order-first lg:order-last">
              <div className={`rounded-2xl border-2 shadow-2xl overflow-hidden ${isDark ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white'}`}>
                {/* Card header */}
                <div className={`px-6 py-4 border-b ${isDark ? 'border-slate-700' : 'border-gray-100'}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-wider opacity-50 mb-0.5">Hiring pipeline</p>
                      <p className="font-semibold">Senior Frontend Engineer</p>
                    </div>
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400">Active</span>
                  </div>
                </div>
                {/* Pipeline stages */}
                <div className="px-6 pt-5 pb-3">
                  <div className="space-y-3">
                    {[
                      { label: 'Applied', count: 128, pct: 100, color: 'bg-blue-500' },
                      { label: 'Assessment', count: 74, pct: 58, color: 'bg-amber-500' },
                      { label: 'AI Interview', count: 31, pct: 24, color: 'bg-purple-500' },
                      { label: 'Offer Sent', count: 9, pct: 7, color: 'bg-emerald-500' },
                      { label: 'Hired', count: 4, pct: 3, color: 'bg-green-600' },
                    ].map(({ label, count, pct, color }) => (
                      <div key={label} className="flex items-center gap-3">
                        <p className="text-xs w-24 opacity-70 flex-shrink-0">{label}</p>
                        <div className={`flex-1 h-2 rounded-full ${isDark ? 'bg-slate-700' : 'bg-gray-100'}`}>
                          <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
                        </div>
                        <p className="text-xs font-semibold w-6 text-right">{count}</p>
                      </div>
                    ))}
                  </div>
                </div>
                {/* Live interview indicator */}
                <div className={`mx-6 mb-5 mt-3 rounded-lg p-3 flex items-center gap-3 ${isDark ? 'bg-purple-950/30 border border-purple-800' : 'bg-purple-50 border border-purple-100'}`}>
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-purple-500" />
                  </span>
                  <p className="text-xs text-purple-700 dark:text-purple-300 font-medium">
                    3 AI interviews in progress right now
                  </p>
                </div>
                {/* Score row */}
                <div className={`grid grid-cols-3 gap-px border-t ${isDark ? 'border-slate-700 bg-slate-700' : 'border-gray-100 bg-gray-100'}`}>
                  {[
                    { label: 'Avg. assessment', value: '72%' },
                    { label: 'Avg. interview', value: '68%' },
                    { label: 'Time to hire', value: '8 days' },
                  ].map(({ label, value }) => (
                    <div key={label} className={`px-4 py-3 text-center ${isDark ? 'bg-slate-800' : 'bg-white'}`}>
                      <p className="text-base font-bold">{value}</p>
                      <p className="text-xs opacity-55 mt-0.5">{label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 sm:py-16 border-y border-gray-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 sm:gap-12 text-center">
            {stats.map((stat) => (
              <div key={stat.label}>
                <p className="text-3xl sm:text-4xl font-extrabold text-blue-600 dark:text-blue-400 mb-1">
                  {stat.value}
                </p>
                <p className="text-sm sm:text-base font-medium opacity-70">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-16 sm:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12 sm:mb-16">
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-4">
              Everything you need to hire smarter
            </h2>
            <p className="text-lg opacity-80">
              A single platform to manage job postings, assessments, interviews, and results. Built
              for modern, distributed teams.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map(({ icon: Icon, title, description }) => (
              <div key={title} className={cardBase}>
                <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 mb-4">
                  <Icon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{title}</h3>
                <p className="text-sm opacity-75 leading-relaxed">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className={`py-16 sm:py-24 ${isDark ? 'bg-slate-800/30' : 'bg-gray-50'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-4">How it works</h2>
            <p className="text-lg opacity-80">From first click to hired, the full workflow is automated.</p>
          </div>
          <div className="grid md:grid-cols-2 gap-16 items-start">
            {/* Recruiter flow */}
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-blue-500 mb-6">Recruiter</p>
              <ol className="space-y-6">
                {[
                  { n: '1', title: 'Post a job', body: 'Create a job posting with description, required skills, and attach an AI-generated assessment.' },
                  { n: '2', title: 'Review scored applicants', body: 'Candidates are ranked by resume relevance, format score, and assessment results automatically.' },
                  { n: '3', title: 'Schedule an AI interview', body: 'One click schedules a LiveKit voice interview; the AI agent conducts it and emails results.' },
                  { n: '4', title: 'Send offer or reject', body: 'Review the AI summary, combined score, and hire, schedule in-person, or reject with one action.' },
                ].map(({ n, title, body }) => (
                  <li key={n} className="flex gap-4">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-600 text-white text-sm font-bold flex items-center justify-center">{n}</div>
                    <div>
                      <p className="font-semibold mb-1">{title}</p>
                      <p className="text-sm opacity-70 leading-relaxed">{body}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
            {/* Candidate flow */}
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-purple-500 mb-6">Candidate</p>
              <ol className="space-y-6">
                {[
                  { n: '1', title: 'Apply with your profile', body: 'Upload your CV and fill in your profile. The system parses and scores your resume against the job.' },
                  { n: '2', title: 'Complete the assessment', body: 'Receive a timed MCQ assessment via email. Results are stored and factored into your ranking.' },
                  { n: '3', title: 'Join the AI interview', body: 'Click a link to join a LiveKit room. A voice AI agent interviews you on the job description and your assessment performance.' },
                  { n: '4', title: 'Track your application', body: 'See your interview summary, in-person schedule, and offer letter in one dashboard.' },
                ].map(({ n, title, body }) => (
                  <li key={n} className="flex gap-4">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-600 text-white text-sm font-bold flex items-center justify-center">{n}</div>
                    <div>
                      <p className="font-semibold mb-1">{title}</p>
                      <p className="text-sm opacity-70 leading-relaxed">{body}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-16 sm:py-24 bg-gray-100/50 dark:bg-slate-800/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12 sm:mb-16">
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-4">
              Trusted by hiring teams
            </h2>
            <p className="text-lg opacity-80">
              See what recruiters and HR leaders say about Hirebase.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map(({ quote, author, role }) => (
              <div
                key={author}
                className={`rounded-xl border p-6 ${
                  isDark ? 'border-slate-700 bg-slate-800/50' : 'border-gray-200 bg-white'
                }`}
              >
                <p className="text-slate-600 dark:text-slate-300 mb-6 leading-relaxed">&ldquo;{quote}&rdquo;</p>
                <div>
                  <p className="font-semibold">{author}</p>
                  <p className="text-sm opacity-70">{role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-16 sm:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12 sm:mb-16">
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-4">
              Simple, transparent pricing
            </h2>
            <p className="text-lg opacity-80">
              Choose the plan that fits your team. No hidden fees.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {pricingPlans.map((plan) => (
              <div
                key={plan.name}
                className={`rounded-2xl border-2 p-6 sm:p-8 transition-all ${
                  plan.highlighted
                    ? isDark
                      ? 'border-blue-500 bg-blue-500/10 shadow-lg shadow-blue-500/10'
                      : 'border-blue-500 bg-blue-50/50 shadow-lg shadow-blue-500/10'
                    : isDark
                      ? 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <h3 className="text-xl font-bold mb-2">{plan.name}</h3>
                <div className="flex items-baseline gap-1 mb-2">
                  <span className="text-3xl font-extrabold">{plan.price}</span>
                  <span className="opacity-70">{plan.period}</span>
                </div>
                <p className="text-sm opacity-75 mb-6">{plan.description}</p>
                <ul className="space-y-3 mb-8">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm">
                      <CheckIcon className="w-5 h-5 text-green-500 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                {plan.href.startsWith('/') ? (
                  <Link
                    to={plan.href}
                    className={`block w-full text-center rounded-lg py-3 font-semibold transition-colors ${
                      plan.highlighted
                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                        : isDark
                          ? 'bg-slate-700 text-slate-100 hover:bg-slate-600'
                          : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                    }`}
                  >
                    {plan.cta}
                  </Link>
                ) : (
                  <a
                    href={plan.href}
                    className={`block w-full text-center rounded-lg py-3 font-semibold transition-colors ${
                      plan.highlighted
                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                        : isDark
                          ? 'bg-slate-700 text-slate-100 hover:bg-slate-600'
                          : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                    }`}
                  >
                    {plan.cta}
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 sm:py-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div
            className={`rounded-3xl border-2 p-12 sm:p-16 ${
              isDark ? 'border-blue-500/50 bg-blue-500/10' : 'border-blue-200 bg-blue-50/50'
            }`}
          >
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-4">
              Ready to transform your hiring?
            </h2>
            <p className="text-lg opacity-80 mb-8 max-w-xl mx-auto">
              Join hundreds of teams already using Hirebase to hire faster and smarter.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link
                to="/register"
                className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-8 py-3.5 text-base font-semibold text-white shadow-lg shadow-blue-600/25 hover:bg-blue-700 transition-colors"
              >
                Start Free Trial
              </Link>
              <a
                href="#contact"
                className={`inline-flex items-center justify-center rounded-lg px-8 py-3.5 text-base font-semibold border-2 ${
                  isDark
                    ? 'border-slate-600 hover:border-slate-500 hover:bg-slate-800/50'
                    : 'border-gray-300 hover:border-gray-400 hover:bg-white'
                }`}
              >
                Contact Sales
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Contact / Get in touch */}
      <section id="contact" className="py-16 sm:py-24 border-t border-gray-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-xl">
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-4">
              Get in touch
            </h2>
            <p className="text-base opacity-75 mb-6">
              Have questions about Hirebase, demos, or enterprise plans? Contact details are coming soon. In the meantime, create a free account and explore the platform.
            </p>
            <Link
              to="/register"
              className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-6 py-3 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors"
            >
              Create an account
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
