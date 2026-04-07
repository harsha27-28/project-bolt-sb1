import { useEffect, useMemo, useState } from 'react';
import { CloudSun, Leaf, Loader2, Moon, ShieldCheck, Sun, UserCheck, Users } from 'lucide-react';
import { AdminOverview, getAdminOverview } from '../lib/adminAuth';

type Theme = 'light' | 'dark';
type AdminSection = 'admin' | 'verified_users' | 'google_verified_users' | 'diseases' | 'weather_searches';

interface AdminPanelProps {
  theme: Theme;
  onToggleTheme: () => void;
  onBackHome: () => void;
  onSignOut: () => void;
}

export function AdminPanel({ theme, onToggleTheme, onBackHome, onSignOut }: AdminPanelProps) {
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [activeSection, setActiveSection] = useState<AdminSection>('admin');

  const loadOverview = async (isBackground = false) => {
    if (isBackground) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError('');
    try {
      const data = await getAdminOverview();
      setOverview(data);
      setLastUpdated(new Date().toLocaleTimeString());
    } catch (err: unknown) {
      if (err instanceof Error && err.message) {
        if (err.message.includes('status 404')) {
          setError('Admin overview route not found. Restart backend to load latest admin routes.');
        } else {
          setError(err.message);
        }
      } else {
        setError('Unable to load admin data');
      }
    } finally {
      if (isBackground) {
        setRefreshing(false);
      } else {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    void loadOverview();
    const intervalId = window.setInterval(() => {
      void loadOverview(true);
    }, 15000);
    return () => window.clearInterval(intervalId);
  }, []);

  const summaryCards = useMemo(() => {
    if (!overview) return [];
    return [
      {
        key: 'google',
        title: 'Google Verified Users',
        value: overview.summary.google_verified_users,
        icon: UserCheck,
      },
      {
        key: 'verified',
        title: 'Verified Users',
        value: overview.summary.verified_users,
        icon: Users,
      },
      {
        key: 'diseases',
        title: 'Diseases',
        value: overview.summary.diseases,
        icon: Leaf,
      },
      {
        key: 'weather',
        title: 'Weather Searches',
        value: overview.summary.weather_searches,
        icon: CloudSun,
      },
    ];
  }, [overview]);

  const formatDate = (value: string) => {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '-';
    return date.toLocaleString();
  };

  const sections: Array<{ key: AdminSection; label: string }> = [
    { key: 'admin', label: 'Admin' },
    { key: 'verified_users', label: 'Verified Users' },
    { key: 'google_verified_users', label: 'Google Verified Users' },
    { key: 'diseases', label: 'Diseases' },
    { key: 'weather_searches', label: 'Weather Searches' },
  ];

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/85 backdrop-blur dark:border-slate-800 dark:bg-slate-900/80">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <button
            type="button"
            onClick={onBackHome}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-800 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
          >
            Home
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onSignOut}
              className="rounded-lg border border-red-300 bg-white px-3 py-1.5 text-sm font-medium text-red-700 transition-colors hover:bg-red-50 dark:border-red-800 dark:bg-slate-900 dark:text-red-300 dark:hover:bg-red-950/40"
            >
              Sign Out
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

      <main className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-xl dark:border-slate-800 dark:bg-slate-900">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300">
            <ShieldCheck className="h-4 w-4" />
            Admin Access
          </div>
          <h1 className="mt-4 text-3xl font-bold text-slate-900 dark:text-slate-100">Admin Session Active</h1>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void loadOverview(true)}
              disabled={refreshing}
              className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {refreshing ? 'Refreshing...' : 'Refresh Data'}
            </button>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {lastUpdated ? `Last updated: ${lastUpdated}` : ''}
            </p>
          </div>
        </div>

        {loading ? (
          <div className="mt-6 flex items-center justify-center rounded-2xl border border-slate-200 bg-white p-10 dark:border-slate-800 dark:bg-slate-900">
            <Loader2 className="h-7 w-7 animate-spin text-emerald-600" />
          </div>
        ) : error ? (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-5 dark:border-red-900/40 dark:bg-red-950/30">
            <p className="text-sm font-medium text-red-700 dark:text-red-300">{error}</p>
            <button
              type="button"
              onClick={() => void loadOverview()}
              className="mt-3 rounded-lg bg-red-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-red-500"
            >
              Retry
            </button>
          </div>
        ) : overview ? (
          <div className="mt-6 space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
              <div className="flex flex-wrap gap-2">
                {sections.map((section) => (
                  <button
                    key={section.key}
                    type="button"
                    onClick={() => setActiveSection(section.key)}
                    className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                      activeSection === section.key
                        ? 'bg-emerald-600 text-white'
                        : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-800'
                    }`}
                  >
                    {section.label}
                  </button>
                ))}
              </div>
            </div>

            {activeSection === 'admin' && (
              <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
                <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Admin</h2>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                  Admin overview includes verified users, Google verified users, diseases, and weather searches. Diary entries are not shown in this dashboard.
                </p>
                <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {summaryCards.map((card) => (
                    <div
                      key={card.key}
                      className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
                    >
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-slate-600 dark:text-slate-300">{card.title}</p>
                        <card.icon className="h-5 w-5 text-emerald-600" />
                      </div>
                      <p className="mt-3 text-3xl font-bold text-slate-900 dark:text-slate-100">{card.value}</p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {activeSection === 'verified_users' && (
              <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
                <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Verified Users</h2>
                <div className="mt-3 overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800">
                        <th className="px-2 py-2 text-left font-semibold">Name</th>
                        <th className="px-2 py-2 text-left font-semibold">Email</th>
                        <th className="px-2 py-2 text-left font-semibold">Joined</th>
                      </tr>
                    </thead>
                    <tbody>
                      {overview.verified_users.length === 0 ? (
                        <tr>
                          <td className="px-2 py-3 text-slate-500" colSpan={3}>No verified users yet.</td>
                        </tr>
                      ) : (
                        overview.verified_users.map((user) => (
                          <tr key={user.id} className="border-b border-slate-100 dark:border-slate-800/60">
                            <td className="px-2 py-2">{user.full_name || '-'}</td>
                            <td className="px-2 py-2">{user.email}</td>
                            <td className="px-2 py-2">{formatDate(user.created_at)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {activeSection === 'google_verified_users' && (
              <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
                <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Google Verified Users</h2>
                <div className="mt-3 overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800">
                        <th className="px-2 py-2 text-left font-semibold">Name</th>
                        <th className="px-2 py-2 text-left font-semibold">Email</th>
                        <th className="px-2 py-2 text-left font-semibold">Joined</th>
                      </tr>
                    </thead>
                    <tbody>
                      {overview.google_verified_users.length === 0 ? (
                        <tr>
                          <td className="px-2 py-3 text-slate-500" colSpan={3}>No Google verified users yet.</td>
                        </tr>
                      ) : (
                        overview.google_verified_users.map((user) => (
                          <tr key={user.id} className="border-b border-slate-100 dark:border-slate-800/60">
                            <td className="px-2 py-2">{user.full_name || '-'}</td>
                            <td className="px-2 py-2">{user.email}</td>
                            <td className="px-2 py-2">{formatDate(user.created_at)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {activeSection === 'diseases' && (
              <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
                <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Diseases</h2>
                <div className="mt-3 overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800">
                        <th className="px-2 py-2 text-left font-semibold">Crop</th>
                        <th className="px-2 py-2 text-left font-semibold">Disease</th>
                        <th className="px-2 py-2 text-left font-semibold">Type</th>
                      </tr>
                    </thead>
                    <tbody>
                      {overview.diseases.length === 0 ? (
                        <tr>
                          <td className="px-2 py-3 text-slate-500" colSpan={3}>No diseases found.</td>
                        </tr>
                      ) : (
                        overview.diseases.map((disease) => (
                          <tr key={disease.id} className="border-b border-slate-100 dark:border-slate-800/60">
                            <td className="px-2 py-2">{disease.crop_name}</td>
                            <td className="px-2 py-2">{disease.disease_name}</td>
                            <td className="px-2 py-2">{disease.disease_type}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {activeSection === 'weather_searches' && (
              <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
                <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Weather Searches</h2>
                <div className="mt-3 overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800">
                        <th className="px-2 py-2 text-left font-semibold">User</th>
                        <th className="px-2 py-2 text-left font-semibold">Provider</th>
                        <th className="px-2 py-2 text-left font-semibold">Location</th>
                        <th className="px-2 py-2 text-left font-semibold">Temp</th>
                        <th className="px-2 py-2 text-left font-semibold">Humidity</th>
                        <th className="px-2 py-2 text-left font-semibold">Risk</th>
                        <th className="px-2 py-2 text-left font-semibold">Searched At</th>
                      </tr>
                    </thead>
                    <tbody>
                      {overview.weather_searches.length === 0 ? (
                        <tr>
                          <td className="px-2 py-3 text-slate-500" colSpan={7}>No weather searches yet.</td>
                        </tr>
                      ) : (
                        overview.weather_searches.map((entry) => (
                          <tr key={entry.id} className="border-b border-slate-100 dark:border-slate-800/60">
                            <td className="px-2 py-2">{entry.user_email || '-'}</td>
                            <td className="px-2 py-2">{entry.auth_provider || '-'}</td>
                            <td className="px-2 py-2">{entry.location}</td>
                            <td className="px-2 py-2">{entry.temperature} C</td>
                            <td className="px-2 py-2">{entry.humidity}%</td>
                            <td className="px-2 py-2">{entry.risk_level || '-'}</td>
                            <td className="px-2 py-2">{formatDate(entry.fetched_at)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            )}
          </div>
        ) : null}
      </main>
    </div>
  );
}
