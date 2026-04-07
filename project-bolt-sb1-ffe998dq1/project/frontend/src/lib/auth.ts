import {
  apiRequest,
  clearAuthToken,
  clearCachedUser,
  emitAuthChanged,
  getAuthToken,
  setAuthToken,
  setCachedUser,
} from './api';
import { requireSupabase, supabase } from './supabaseClient';

export interface AppUser {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string;
  auth_provider: 'local' | 'google';
  location: string;
  primary_crop: 'Tomato' | "Lady's Finger" | '';
  created_at: string;
  updated_at: string;
}

interface AuthResponse {
  token: string;
  user: AppUser;
}

interface MessageResponse {
  ok: boolean;
  message: string;
}

interface SupabaseStatusResponse {
  ok: boolean;
  status: 'ready' | 'misconfigured' | 'unreachable';
  message: string;
}

function readSupabaseAvatarFromSessionUser(sessionUser: unknown): string {
  if (!sessionUser || typeof sessionUser !== 'object') return '';
  const record = sessionUser as Record<string, unknown>;
  const metadataRaw = record.user_metadata;
  if (!metadataRaw || typeof metadataRaw !== 'object') return '';
  const metadata = metadataRaw as Record<string, unknown>;

  const avatarCandidates = [
    metadata.avatar_url,
    metadata.picture,
    metadata.photo_url,
    metadata.photoURL,
  ];

  for (const candidate of avatarCandidates) {
    if (typeof candidate === 'string' && candidate.trim()) {
      return candidate.trim();
    }
  }
  return '';
}

function parseErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === 'string') return error;
  return 'Authentication error';
}

function saveAuth(token: string, user?: AppUser) {
  setAuthToken(token);
  if (user) {
    setCachedUser(user);
  }
  emitAuthChanged();
}

export async function signUp(email: string, password: string, fullName: string) {
  const data = await apiRequest<AuthResponse, { email: string; password: string; fullName: string }>(
    '/api/auth/signup',
    {
      method: 'POST',
      withAuth: false,
      body: { email, password, fullName },
    }
  );
  saveAuth(data.token, data.user);
  return data;
}

export async function signUpAndLogin(email: string, password: string, fullName: string) {
  try {
    return await signUp(email, password, fullName);
  } catch (error: unknown) {
    const message = parseErrorMessage(error);
    if (message.toLowerCase().includes('already')) {
      return await signIn(email, password);
    }
    throw error;
  }
}

export async function signIn(email: string, password: string) {
  const data = await apiRequest<AuthResponse, { email: string; password: string }>(
    '/api/auth/signin',
    {
      method: 'POST',
      withAuth: false,
      body: { email, password },
    }
  );
  saveAuth(data.token, data.user);
  return data;
}

export async function sendSignUpVerificationCode(email: string) {
  return apiRequest<MessageResponse, { email: string }>(
    '/api/auth/email/send-code',
    {
      method: 'POST',
      withAuth: false,
      body: { email },
    }
  );
}

export async function verifySignUpEmailCode(email: string, code: string) {
  return apiRequest<MessageResponse, { email: string; code: string }>(
    '/api/auth/email/verify-code',
    {
      method: 'POST',
      withAuth: false,
      body: { email, code },
    }
  );
}

export async function signOut() {
  try {
    await apiRequest<{ ok: boolean }, undefined>('/api/auth/signout', { method: 'POST' });
  } finally {
    await supabase?.auth.signOut({ scope: 'global' }).catch(() => {});
    clearAuthToken();
    clearCachedUser();
    emitAuthChanged();
  }
}

async function ensureSupabaseReady() {
  return apiRequest<SupabaseStatusResponse, undefined>('/api/auth/supabase/status', {
    withAuth: false,
  });
}

export async function signInWithGoogle() {
  const supabaseClient = requireSupabase();
  await ensureSupabaseReady();
  const redirectTo = window.location.origin;
  const { error } = await supabaseClient.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
      queryParams: {
        prompt: 'select_account consent',
      },
    },
  });
  if (error) {
    throw new Error(error.message);
  }
}

export async function signInWithSupabaseSession() {
  const supabaseClient = requireSupabase();
  await ensureSupabaseReady();

  const { data, error } = await supabaseClient.auth.getSession();
  if (error) {
    throw new Error(error.message);
  }

  const accessToken = data.session?.access_token;
  if (!accessToken) {
    return null;
  }

  const authData = await apiRequest<AuthResponse, { accessToken: string }>(
    '/api/auth/supabase',
    {
      method: 'POST',
      withAuth: false,
      body: { accessToken },
    }
  );
  const sessionAvatar = readSupabaseAvatarFromSessionUser(data.session?.user ?? null);
  const mergedUser: AppUser = {
    ...authData.user,
    avatar_url: authData.user.avatar_url?.trim() || sessionAvatar || '',
  };

  saveAuth(authData.token, mergedUser);
  return { ...authData, user: mergedUser };
}

export async function getCurrentUser() {
  const token = getAuthToken();
  if (!token) {
    clearCachedUser();
    return null;
  }
  try {
    const data = await apiRequest<{ user: AppUser }, undefined>('/api/auth/me');
    let nextUser = data.user;
    if (nextUser.auth_provider === 'google' && !nextUser.avatar_url?.trim()) {
      const supabaseUserData = supabase
        ? await supabase.auth.getUser().catch(() => ({ data: { user: null } }))
        : { data: { user: null } };
      const sessionAvatar = readSupabaseAvatarFromSessionUser(supabaseUserData.data?.user ?? null);
      if (sessionAvatar) {
        nextUser = { ...nextUser, avatar_url: sessionAvatar };
      }
    }
    setCachedUser(nextUser);
    return nextUser;
  } catch {
    clearAuthToken();
    clearCachedUser();
    emitAuthChanged();
    return null;
  }
}

export async function getUserProfile(userId: string) {
  void userId;
  return apiRequest<AppUser, undefined>('/api/profile');
}

export async function updateUserProfile(
  userId: string,
  updates: {
    full_name?: string;
    location?: string;
    primary_crop?: string;
  }
) {
  void userId;
  return apiRequest<AppUser, typeof updates>('/api/profile', {
    method: 'PATCH',
    body: updates,
  });
}
