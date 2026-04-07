import { useEffect, useState } from 'react';
import { useAuth } from './contexts/useAuth';
import { AuthForm } from './components/AuthForm';
import { Dashboard } from './components/Dashboard';
import { Loader2, Moon, Sun } from 'lucide-react';
import { LandingPage } from './components/LandingPage';
import { AdminLogin } from './components/AdminLogin';
import { AdminPanel } from './components/AdminPanel';
import { AdminUser, getCurrentAdmin, signOutAdmin } from './lib/adminAuth';

const THEME_STORAGE_KEY = 'scd_theme';

type Theme = 'light' | 'dark';
type PublicView = 'landing' | 'signin' | 'admin';

function hasOAuthCallbackParams() {
  const query = new URLSearchParams(window.location.search);
  return query.has('code') || query.has('error') || /access_token=|refresh_token=|error=/.test(window.location.hash);
}

function getViewFromHash(): PublicView {
  const rawHash = window.location.hash.replace('#', '').toLowerCase();
  if (rawHash === 'signin') return 'signin';
  if (rawHash === 'admin') return 'admin';
  return 'landing';
}

function setHashForView(view: PublicView) {
  const base = `${window.location.pathname}${window.location.search}`;
  const nextUrl = view === 'landing' ? base : `${base}#${view}`;
  window.history.replaceState({}, document.title, nextUrl);
}

function App() {
  const { user, loading } = useAuth();
  const [theme, setTheme] = useState<Theme>(() => {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === 'light' || stored === 'dark') {
      return stored;
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });
  const [publicView, setPublicView] = useState<PublicView>(() => {
    if (hasOAuthCallbackParams()) {
      return 'signin';
    }
    return getViewFromHash();
  });
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [adminLoading, setAdminLoading] = useState(true);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('dark', theme === 'dark');
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  useEffect(() => {
    const handleHashChange = () => {
      if (hasOAuthCallbackParams()) {
        setPublicView('signin');
        return;
      }
      setPublicView(getViewFromHash());
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  useEffect(() => {
    let active = true;
    const syncAdmin = async () => {
      const admin = await getCurrentAdmin();
      if (!active) return;
      setAdminUser(admin);
      setAdminLoading(false);
    };
    void syncAdmin();
    return () => {
      active = false;
    };
  }, []);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const openPublicView = (view: PublicView) => {
    setPublicView(view);
    setHashForView(view);
  };

  const handleAdminSignOut = async () => {
    await signOutAdmin();
    setAdminUser(null);
  };

  if (loading) {
    return (
      <>
        <button
          onClick={toggleTheme}
          className="fixed top-4 right-4 z-50 inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white p-2 text-gray-700 shadow-sm transition-colors hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700"
          aria-label="Toggle theme"
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>
        <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-green-600" />
        </div>
      </>
    );
  }

  return (
    <>
      {user ? (
        <Dashboard theme={theme} onToggleTheme={toggleTheme} />
      ) : publicView === 'landing' ? (
        <LandingPage
          theme={theme}
          onToggleTheme={toggleTheme}
          onOpenSignIn={() => openPublicView('signin')}
          onOpenAdmin={() => openPublicView('admin')}
        />
      ) : publicView === 'admin' ? (
        adminLoading ? (
          <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-green-600" />
          </div>
        ) : adminUser ? (
          <AdminPanel
            theme={theme}
            onToggleTheme={toggleTheme}
            onBackHome={() => openPublicView('landing')}
            onSignOut={handleAdminSignOut}
          />
        ) : (
          <AdminLogin
            theme={theme}
            onToggleTheme={toggleTheme}
            onBackHome={() => openPublicView('landing')}
            onOpenSignIn={() => openPublicView('signin')}
            onSignedIn={(admin) => setAdminUser(admin)}
          />
        )
      ) : (
        <>
          <button
            type="button"
            onClick={() => openPublicView('landing')}
            className="fixed top-4 left-4 z-50 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800 shadow-sm transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
          >
            Home
          </button>
          <button
            onClick={toggleTheme}
            className="fixed top-4 right-4 z-50 inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white p-2 text-gray-700 shadow-sm transition-colors hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700"
            aria-label="Toggle theme"
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
          <AuthForm />
        </>
      )}
    </>
  );
}

export default App;
