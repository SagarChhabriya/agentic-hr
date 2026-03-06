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
        'LiveKit-powered interviews with real-time emotion and behavior analysis for better hiring decisions.',
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
        'Agentic HR cut our time-to-hire by 40%. The AI assessments and interview insights are game-changers.',
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
                From job posting to AI-powered assessments and LiveKit interviews—streamline hiring
                with real-time analytics, emotion detection, and clear candidate insights.
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
                    Smart assessments
                  </div>
                  <p className="opacity-70 pl-7">Timed MCQs, anti-cheating, auto-scoring</p>
                </div>
                <div>
                  <div className="flex items-center gap-2 font-semibold mb-1">
                    <CheckIcon className="w-5 h-5 text-green-500 shrink-0" />
                    AI interviews
                  </div>
                  <p className="opacity-70 pl-7">LiveKit + emotion & behavior analysis</p>
                </div>
                <div>
                  <div className="flex items-center gap-2 font-semibold mb-1">
                    <CheckIcon className="w-5 h-5 text-green-500 shrink-0" />
                    Actionable insights
                  </div>
                  <p className="opacity-70 pl-7">Unified dashboards for recruiters & candidates</p>
                </div>
              </div>
            </div>

            {/* Hero dashboard mockup */}
            <div className="relative order-first lg:order-last">
              <div
                className={`rounded-2xl border-2 shadow-2xl overflow-hidden ${
                  isDark ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white shadow-gray-200/50'
                }`}
              >
                <div className={`px-6 py-4 border-b ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-xs uppercase tracking-wide opacity-60">Active pipeline</p>
                      <p className="text-lg font-semibold">Senior Frontend Engineer</p>
                    </div>
                    <span className="inline-flex items-center rounded-full bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-400 text-xs font-semibold px-3 py-1">
                      Open
                    </span>
                  </div>
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-3 gap-6 mb-6">
                    <div>
                      <p className="text-xs opacity-60 mb-1">Candidates</p>
                      <p className="text-2xl font-bold">128</p>
                    </div>
                    <div>
                      <p className="text-xs opacity-60 mb-1">In assessment</p>
                      <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">42</p>
                    </div>
                    <div>
                      <p className="text-xs opacity-60 mb-1">Interviews</p>
                      <p className="text-2xl font-bold">16</p>
                    </div>
                  </div>
                  <div className="h-24 rounded-lg bg-slate-100 dark:bg-slate-700/50 flex items-center justify-center">
                    <p className="text-xs opacity-60">Live AI interviews & assessments running</p>
                  </div>
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

      {/* Testimonials Section */}
      <section className="py-16 sm:py-24 bg-gray-100/50 dark:bg-slate-800/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12 sm:mb-16">
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-4">
              Trusted by hiring teams
            </h2>
            <p className="text-lg opacity-80">
              See what recruiters and HR leaders say about Agentic HR.
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
              Join hundreds of teams already using Agentic HR to hire faster and smarter.
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

      {/* Legal / About sections (for footer anchor links) */}
      <section id="about" className="py-12 border-t border-gray-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h3 className="text-xl font-semibold mb-3">About</h3>
          <p className="text-sm opacity-80 max-w-2xl">
            Agentic HR Automation is a modern SaaS platform for automating the hiring lifecycle with
            AI-powered assessments, LiveKit interviews, and real-time analytics. Built for distributed
            teams who want to hire faster and smarter.
          </p>
        </div>
      </section>
      <section id="privacy" className="py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h3 className="text-xl font-semibold mb-3">Privacy</h3>
          <p className="text-sm opacity-80 max-w-2xl">
            We respect your privacy. Your data is encrypted, stored securely, and never shared with
            third parties for marketing. See our full privacy policy for details on data retention
            and your rights.
          </p>
        </div>
      </section>
      <section id="terms" className="py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h3 className="text-xl font-semibold mb-3">Terms</h3>
          <p className="text-sm opacity-80 max-w-2xl">
            By using Agentic HR, you agree to our terms of service. Usage is subject to fair use
            policies. Contact us for enterprise SLAs and custom agreements.
          </p>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-16 sm:py-24 border-t border-gray-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-4">
              Get in touch
            </h2>
            <p className="text-lg opacity-80 mb-8">
              Have questions about demos, onboarding, or enterprise plans? Reach out and we&apos;ll get
              back to you within 24 hours.
            </p>
            <div className="space-y-4">
              <p className="text-sm opacity-75">
                <strong>Email:</strong> support@agentichr.com
              </p>
              <p className="text-sm opacity-75">
                <strong>For enterprise:</strong> enterprise@agentichr.com
              </p>
              <Link
                to="/register"
                className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-700 transition-colors mt-4"
              >
                Create an account
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
