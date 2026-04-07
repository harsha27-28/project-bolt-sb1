import { useEffect, useMemo, useRef, useState } from 'react';
import { Leaf, BookOpen, LogOut, Camera, FileText, Moon, Sun } from 'lucide-react';
import { signOut } from '../lib/auth';
import { useAuth } from '../contexts/useAuth';
import { CropSelection } from './CropSelection';
import { DiseaseDetection } from './DiseaseDetection';
import { DiseaseLibrary } from './DiseaseLibrary';
import { FarmDiary } from './FarmDiary';
import { WeatherAlert } from './WeatherAlert';

type View = 'crop-select' | 'detect' | 'library' | 'diary';

interface DashboardProps {
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
}

export function Dashboard({ theme, onToggleTheme }: DashboardProps) {
  const { user } = useAuth();
  const [currentView, setCurrentView] = useState<View>('crop-select');
  const [selectedCrop, setSelectedCrop] = useState<'Tomato' | "Lady's Finger" | null>(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [avatarLoadError, setAvatarLoadError] = useState(false);
  const userMenuRef = useRef<HTMLDivElement | null>(null);

  const handleCropSelect = (crop: 'Tomato' | "Lady's Finger") => {
    setSelectedCrop(crop);
    setCurrentView('detect');
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  const userDisplayName =
    user?.full_name?.trim() ||
    user?.email?.split('@')[0] ||
    'User';
  const userAvatarUrl = typeof user?.avatar_url === 'string' ? user.avatar_url.trim() : '';
  const userBadgeText = user?.auth_provider === 'google' ? 'Verified Google User' : 'Verified User';
  const userInitials = useMemo(() => {
    const source = userDisplayName.trim();
    if (!source) return 'U';
    const parts = source.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return source.slice(0, 2).toUpperCase();
  }, [userDisplayName]);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (!userMenuRef.current) return;
      if (!userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    };
    window.addEventListener('mousedown', handlePointerDown);
    return () => window.removeEventListener('mousedown', handlePointerDown);
  }, []);

  useEffect(() => {
    setAvatarLoadError(false);
  }, [userAvatarUrl]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <nav className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center">
                <span className="text-2xl">🌿</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Smart Crop Doctor</h1>
                <p className="text-xs text-gray-500 dark:text-gray-400">AI Disease Detection</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onToggleTheme}
                className="w-9 h-9 inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-700 shadow-sm transition-colors hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700"
                aria-label="Toggle theme"
                title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </button>

              <div className="relative" ref={userMenuRef}>
                <button
                  type="button"
                  onClick={() => setShowUserMenu((prev) => !prev)}
                  className="w-9 h-9 rounded-full bg-gray-200 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-800 dark:text-gray-100 text-sm font-semibold flex items-center justify-center hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                  aria-label="User menu"
                >
                  {userAvatarUrl && !avatarLoadError ? (
                    <img
                      src={userAvatarUrl}
                      alt={userDisplayName}
                      className="w-full h-full rounded-full object-cover"
                      onError={() => setAvatarLoadError(true)}
                    />
                  ) : (
                    userInitials
                  )}
                </button>

                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-64 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg ring-1 ring-black/5 dark:ring-white/10 p-3 z-40 origin-top-right">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100 font-semibold flex items-center justify-center text-lg">
                        {userAvatarUrl && !avatarLoadError ? (
                          <img
                            src={userAvatarUrl}
                            alt={userDisplayName}
                            className="w-full h-full rounded-full object-cover"
                            onError={() => setAvatarLoadError(true)}
                          />
                        ) : (
                          userInitials
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-base font-semibold leading-5 text-gray-900 dark:text-gray-100 truncate">{userDisplayName}</p>
                        <p className="text-sm leading-5 text-gray-500 dark:text-gray-400 truncate">{user?.email || ''}</p>
                        <p className="text-xs leading-5 text-green-700 dark:text-green-400 truncate">{userBadgeText}</p>
                      </div>
                    </div>
                    <button
                      onClick={handleSignOut}
                      className="mt-3 w-full inline-flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Sign out</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <WeatherAlert />

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 mb-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-2">
            <button
              onClick={() => setCurrentView('crop-select')}
              className={`flex flex-col items-center gap-2 p-4 rounded-lg transition-colors ${
                currentView === 'crop-select'
                  ? 'bg-green-50 text-green-700'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              <Leaf className="w-6 h-6" />
              <span className="text-sm font-medium">Select Crop</span>
            </button>

            <button
              onClick={() => selectedCrop && setCurrentView('detect')}
              disabled={!selectedCrop}
              className={`flex flex-col items-center gap-2 p-4 rounded-lg transition-colors ${
                currentView === 'detect'
                  ? 'bg-green-50 text-green-700'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <Camera className="w-6 h-6" />
              <span className="text-sm font-medium">Detect</span>
            </button>

            <button
              onClick={() => setCurrentView('library')}
              className={`flex flex-col items-center gap-2 p-4 rounded-lg transition-colors ${
                currentView === 'library'
                  ? 'bg-green-50 text-green-700'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              <BookOpen className="w-6 h-6" />
              <span className="text-sm font-medium">Library</span>
            </button>

            <button
              onClick={() => setCurrentView('diary')}
              className={`flex flex-col items-center gap-2 p-4 rounded-lg transition-colors ${
                currentView === 'diary'
                  ? 'bg-green-50 text-green-700'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              <FileText className="w-6 h-6" />
              <span className="text-sm font-medium">Farm Diary</span>
            </button>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          {currentView === 'crop-select' && (
            <CropSelection onSelect={handleCropSelect} />
          )}

          {currentView === 'detect' && selectedCrop && (
            <DiseaseDetection
              cropName={selectedCrop}
              onBack={() => setCurrentView('crop-select')}
            />
          )}

          {currentView === 'library' && <DiseaseLibrary />}

          {currentView === 'diary' && <FarmDiary />}
        </div>
      </div>
    </div>
  );
}
