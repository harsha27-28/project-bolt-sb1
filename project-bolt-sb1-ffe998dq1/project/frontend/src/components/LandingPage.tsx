import {
  Activity,
  ArrowRight,
  ChevronDown,
  CloudSun,
  Moon,
  Sparkles,
  Sun,
} from 'lucide-react';
import cropLogo from '../assets/crop-logo.svg';
import smartFarmImage from '../assets/smart-farm.svg';
import aiCropBadge from '../assets/ai-crop-badge.svg';

type Theme = 'light' | 'dark';

interface LandingPageProps {
  theme: Theme;
  onToggleTheme: () => void;
  onOpenSignIn: () => void;
  onOpenAdmin: () => void;
}

const highlights = [
  {
    title: 'Crop Disease Detection',
    description: 'Upload a crop photo and get instant disease prediction guidance.',
    icon: Activity,
  },
  {
    title: 'Live Weather Risk',
    description: 'Track weather conditions that increase disease probability in your area.',
    icon: CloudSun,
  },
  {
    title: 'Smart Farm History',
    description: 'Save previous detections and treatment notes for better decisions.',
    icon: Sparkles,
    image: smartFarmImage,
  },
];

const steps = [
  'Select your crop and upload a clear image.',
  'AI analyzes visual symptoms and confidence score.',
  'Get disease details with prevention and treatment options.',
  'Store reports in your diary and monitor weather-based risk.',
];

export function LandingPage({ theme, onToggleTheme, onOpenSignIn, onOpenAdmin }: LandingPageProps) {
  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <div className="relative overflow-hidden">
        <div className="absolute -top-44 -left-24 h-80 w-80 rounded-full bg-emerald-300/35 blur-3xl dark:bg-emerald-500/25" />
        <div className="absolute top-24 -right-24 h-96 w-96 rounded-full bg-cyan-300/30 blur-3xl dark:bg-cyan-500/20" />

        <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/85 backdrop-blur dark:border-slate-800 dark:bg-slate-900/80">
          <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
            <button
              type="button"
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-sm font-semibold text-emerald-900 transition-colors hover:bg-emerald-100 dark:border-emerald-900/70 dark:bg-emerald-950/40 dark:text-emerald-200 dark:hover:bg-emerald-950/70"
            >
              <img src={cropLogo} alt="Smart Crop Prediction" className="h-5 w-5 rounded-full" />
              <span>Smart Crop Prediction</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onOpenSignIn}
                className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-800 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={onOpenAdmin}
                className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-800 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
              >
                Admin
              </button>
              <button
                type="button"
                onClick={onToggleTheme}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                aria-label="Toggle theme"
                title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </header>

        <main>
          <section className="mx-auto w-full max-w-7xl px-4 pb-16 pt-16 sm:px-6 lg:px-8 lg:pt-24">
            <div className="mx-auto max-w-4xl space-y-7 text-center">
              <div className="flex justify-center">
                <p className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300">
                  <img src={aiCropBadge} alt="AI Crop Protection" className="h-4 w-4 rounded-sm object-cover" />
                  AI Crop Protection
                </p>
              </div>
              <h1 className="text-3xl font-extrabold leading-[1.08] text-slate-900 dark:text-slate-50 sm:text-4xl lg:text-6xl">
                Predict crop risk early and protect yield with smarter decisions.
              </h1>
              <p className="mx-auto max-w-3xl text-base leading-8 text-slate-600 dark:text-slate-300 sm:text-lg">
                Smart Crop Prediction combines disease detection, weather-risk signals, and treatment guidance in one flow
                built for farmers and field teams.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={onOpenSignIn}
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-500"
                >
                  Start Now
                  <ArrowRight className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-800 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
                >
                  Explore
                  <ChevronDown className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="mx-auto mt-12 w-full max-w-5xl rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-xl shadow-emerald-100/70 dark:border-slate-800 dark:bg-slate-900/80 dark:shadow-none">
              <h2 className="text-center text-3xl font-extrabold text-slate-900 dark:text-slate-100">What You Get</h2>
              <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {highlights.map((item) => (
                  <article
                    key={item.title}
                    className="group aspect-square rounded-2xl border border-slate-200 bg-slate-50 p-5 transition-all duration-200 hover:-translate-y-1 hover:border-emerald-300 hover:bg-white hover:shadow-lg hover:shadow-emerald-100/70 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-emerald-700 dark:hover:bg-slate-800 dark:hover:shadow-none"
                  >
                    <div className="flex h-full flex-col items-center justify-center text-center">
                      <div className="rounded-2xl bg-emerald-100 p-4 text-emerald-700 transition-transform duration-200 group-hover:scale-105 dark:bg-emerald-950 dark:text-emerald-300">
                        {item.image ? (
                          <img src={item.image} alt={item.title} className="h-6 w-6 rounded-md object-cover" />
                        ) : (
                          <item.icon className="h-6 w-6" />
                        )}
                      </div>
                      <h3 className="mt-5 text-lg font-semibold text-slate-900 dark:text-slate-100">{item.title}</h3>
                      <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">{item.description}</p>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </section>

          <section id="how-it-works" className="mx-auto w-full max-w-7xl px-4 pb-20 sm:px-6 lg:px-8">
            <div className="rounded-3xl border border-slate-200 bg-white/85 p-6 dark:border-slate-800 dark:bg-slate-900/80 sm:p-8">
              <h2 className="text-center text-3xl font-extrabold text-slate-900 dark:text-slate-100">What Is What</h2>
              <p className="mx-auto mt-2 max-w-3xl text-center text-sm text-slate-600 dark:text-slate-400 sm:text-base">
                This platform is designed as a scroll-based workbench. You can understand disease risks, compare conditions,
                and then move to sign-in when you are ready to save predictions.
              </p>
              <div className="mx-auto mt-6 grid max-w-5xl gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {steps.map((step, index) => (
                  <div
                    key={step}
                    className="group aspect-square rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700 transition-all duration-200 hover:-translate-y-1 hover:border-emerald-300 hover:bg-white hover:shadow-lg hover:shadow-emerald-100/70 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-emerald-700 dark:hover:bg-slate-800 dark:hover:shadow-none"
                  >
                    <div className="flex h-full flex-col items-center justify-center text-center">
                      <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-emerald-600 text-sm font-bold text-white transition-transform duration-200 group-hover:scale-105">
                        {index + 1}
                      </span>
                      <p className="mt-4 text-sm leading-6">{step}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
