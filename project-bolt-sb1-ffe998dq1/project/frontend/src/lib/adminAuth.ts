import { apiRequest } from './api';

const ADMIN_TOKEN_STORAGE_KEY = 'scd_admin_token';

export interface AdminUser {
  email: string;
  role: 'admin';
}

export interface AdminOverviewUser {
  id: string;
  email: string;
  full_name: string;
  auth_provider: 'local' | 'google';
  location: string;
  primary_crop: string;
  created_at: string;
  updated_at: string;
}

export interface AdminOverviewDisease {
  id: string;
  crop_name: string;
  disease_name: string;
  disease_type: string;
  created_at: string;
}

export interface AdminOverviewWeatherSearch {
  id: string;
  user_id: string;
  user_email: string;
  user_name: string;
  auth_provider: 'local' | 'google' | '';
  location: string;
  temperature: number;
  humidity: number;
  rainfall: number;
  weather_condition: string;
  risk_level: string;
  risk_diseases: string[];
  fetched_at: string;
}

export interface AdminOverview {
  summary: {
    google_verified_users: number;
    verified_users: number;
    total_users: number;
    diseases: number;
    weather_searches: number;
  };
  google_verified_users: AdminOverviewUser[];
  verified_users: AdminOverviewUser[];
  diseases: AdminOverviewDisease[];
  weather_searches: AdminOverviewWeatherSearch[];
}

interface AdminAuthResponse {
  token: string;
  admin: AdminUser;
}

export function getAdminToken() {
  return localStorage.getItem(ADMIN_TOKEN_STORAGE_KEY);
}

function setAdminToken(token: string) {
  localStorage.setItem(ADMIN_TOKEN_STORAGE_KEY, token);
}

function clearAdminToken() {
  localStorage.removeItem(ADMIN_TOKEN_STORAGE_KEY);
}

export async function signInAdmin(email: string, password: string) {
  const response = await apiRequest<AdminAuthResponse, { email: string; password: string }>(
    '/api/admin/login',
    {
      method: 'POST',
      withAuth: false,
      body: { email, password },
    }
  );
  setAdminToken(response.token);
  return response.admin;
}

export async function getCurrentAdmin() {
  const token = getAdminToken();
  if (!token) return null;

  try {
    const response = await apiRequest<{ admin: AdminUser }, undefined>('/api/admin/me', {
      withAuth: false,
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.admin;
  } catch {
    clearAdminToken();
    return null;
  }
}

export async function signOutAdmin() {
  const token = getAdminToken();
  try {
    if (token) {
      await apiRequest<{ ok: boolean }, undefined>('/api/admin/signout', {
        method: 'POST',
        withAuth: false,
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
    }
  } finally {
    clearAdminToken();
  }
}

export async function getAdminOverview() {
  const token = getAdminToken();
  if (!token) {
    throw new Error('Admin session not found');
  }
  return apiRequest<AdminOverview, undefined>('/api/admin/overview', {
    withAuth: false,
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}
