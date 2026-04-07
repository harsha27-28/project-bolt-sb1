import { createContext, ReactNode, useCallback, useEffect, useState } from 'react';
import { AppUser, getCurrentUser } from '../lib/auth';
import { getAuthToken, getCachedUser } from '../lib/api';

interface AuthContextType {
  user: AppUser | null;
  loading: boolean;
  refreshUser: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  refreshUser: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(() => getCachedUser<AppUser>());
  const [loading, setLoading] = useState<boolean>(() => Boolean(getAuthToken()) && !getCachedUser<AppUser>());

  const refreshUser = useCallback(async (showLoading = false) => {
    if (showLoading) {
      setLoading(true);
    }
    try {
      const currentUser = await getCurrentUser();
      setUser(currentUser);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const hasToken = Boolean(getAuthToken());
    const hasCachedUser = Boolean(getCachedUser<AppUser>());
    if (!hasToken) {
      setLoading(false);
    } else {
      void refreshUser(!hasCachedUser);
    }

    const handleAuthChange = () => {
      void refreshUser(false);
    };

    window.addEventListener('auth-changed', handleAuthChange);
    window.addEventListener('storage', handleAuthChange);

    return () => {
      window.removeEventListener('auth-changed', handleAuthChange);
      window.removeEventListener('storage', handleAuthChange);
    };
  }, [refreshUser]);

  return (
    <AuthContext.Provider value={{ user, loading, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}
