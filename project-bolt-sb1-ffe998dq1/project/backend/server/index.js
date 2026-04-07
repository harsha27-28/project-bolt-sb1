import 'dotenv/config';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import cors from 'cors';
import express from 'express';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';

const PORT = Number(process.env.API_PORT || 4000);
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/smart_crop_doctor';
const JWT_SECRET = process.env.JWT_SECRET || 'dev-only-secret-change-me';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || 'http://127.0.0.1:5173';
const OPENWEATHER_API_KEY = process.env.OPENWEATHER_API_KEY || '';
const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY || '';
const BREVO_API_KEY = process.env.BREVO_API_KEY || '';
const BREVO_FROM_EMAIL = process.env.BREVO_FROM_EMAIL || '';
const BREVO_FROM_NAME = process.env.BREVO_FROM_NAME || 'Smart Crop Doctor';
const ADMIN_EMAIL = String(process.env.ADMIN_EMAIL || '').trim().toLowerCase();
const ADMIN_PASSWORD = String(process.env.ADMIN_PASSWORD || '').trim();
const EMAIL_CODE_TTL_MS = 10 * 60 * 1000;
const EMAIL_CODE_RESEND_COOLDOWN_MS = 60 * 1000;
const EMAIL_CODE_MAX_ATTEMPTS = 5;
const allowedOrigins = new Set([
  ...FRONTEND_ORIGIN.split(',').map((origin) => origin.trim()).filter(Boolean),
  'http://127.0.0.1:5173',
  'http://localhost:5173',
]);

const app = express();
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.has(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error(`CORS blocked for origin: ${origin}`));
    },
  })
);
app.use(express.json({ limit: '2mb' }));

const toClientTransform = (_doc, ret) => {
  ret.id = ret._id.toString();
  delete ret._id;
  delete ret.__v;
  if (ret.user_id && typeof ret.user_id !== 'string') {
    ret.user_id = ret.user_id.toString();
  }
  return ret;
};

const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password_hash: { type: String, required: true },
    full_name: { type: String, default: '' },
    avatar_url: { type: String, default: '' },
    auth_provider: { type: String, enum: ['local', 'google'], default: 'local' },
    location: { type: String, default: '' },
    primary_crop: { type: String, enum: ['Tomato', "Lady's Finger", ''], default: '' },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    toJSON: { transform: toClientTransform },
  }
);

const diseaseSchema = new mongoose.Schema(
  {
    crop_name: { type: String, required: true, enum: ['Tomato', "Lady's Finger"] },
    disease_name: { type: String, required: true },
    disease_type: { type: String, required: true, enum: ['Fungal', 'Bacterial', 'Viral', 'Healthy'] },
    symptoms: { type: [String], default: [] },
    prevention: { type: String, default: '' },
    treatment_organic: { type: String, default: '' },
    treatment_chemical: { type: String, default: '' },
    image_indicators: { type: [String], default: [] },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: false },
    toJSON: { transform: toClientTransform },
  }
);
diseaseSchema.index({ crop_name: 1, disease_name: 1 }, { unique: true });

const diarySchema = new mongoose.Schema(
  {
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    crop_name: { type: String, required: true },
    disease_name: { type: String, required: true },
    confidence: { type: Number, required: true, min: 0, max: 100 },
    image_url: { type: String, default: null },
    notes: { type: String, default: '' },
    treatment_applied: { type: String, default: '' },
    observation_date: { type: String, default: () => new Date().toISOString().slice(0, 10) },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: false },
    toJSON: { transform: toClientTransform },
  }
);

const weatherCacheSchema = new mongoose.Schema(
  {
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    location: { type: String, required: true },
    temperature: { type: Number, required: true },
    humidity: { type: Number, required: true },
    rainfall: { type: Number, default: 0 },
    weather_condition: { type: String, default: '' },
    risk_level: { type: String, enum: ['Low', 'Medium', 'High'], required: true },
    risk_diseases: { type: [String], default: [] },
    fetched_at: { type: String, default: () => new Date().toISOString() },
  },
  {
    toJSON: { transform: toClientTransform },
  }
);

const verifiedUserSchema = new mongoose.Schema(
  {
    source_user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    full_name: { type: String, default: '' },
    avatar_url: { type: String, default: '' },
    auth_provider: { type: String, enum: ['local'], default: 'local' },
    location: { type: String, default: '' },
    primary_crop: { type: String, enum: ['Tomato', "Lady's Finger", ''], default: '' },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    toJSON: { transform: toClientTransform },
  }
);

const googleVerifiedUserSchema = new mongoose.Schema(
  {
    source_user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    full_name: { type: String, default: '' },
    avatar_url: { type: String, default: '' },
    auth_provider: { type: String, enum: ['google'], default: 'google' },
    location: { type: String, default: '' },
    primary_crop: { type: String, enum: ['Tomato', "Lady's Finger", ''], default: '' },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    toJSON: { transform: toClientTransform },
  }
);

const weatherSearchSchema = new mongoose.Schema(
  {
    source_cache_id: { type: mongoose.Schema.Types.ObjectId, ref: 'WeatherCache', unique: true, sparse: true, index: true },
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    user_email: { type: String, default: '' },
    user_name: { type: String, default: '' },
    auth_provider: { type: String, enum: ['local', 'google', ''], default: '' },
    location: { type: String, required: true },
    temperature: { type: Number, required: true },
    humidity: { type: Number, required: true },
    rainfall: { type: Number, default: 0 },
    weather_condition: { type: String, default: '' },
    risk_level: { type: String, enum: ['Low', 'Medium', 'High', ''], default: '' },
    risk_diseases: { type: [String], default: [] },
    fetched_at: { type: String, default: () => new Date().toISOString() },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: false },
    toJSON: { transform: toClientTransform },
  }
);

const emailVerificationSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    code_hash: { type: String, required: true },
    expires_at: { type: Date, required: true },
    sent_at: { type: Date, required: true, default: Date.now },
    verified: { type: Boolean, required: true, default: false },
    verified_at: { type: Date, default: null },
    attempts: { type: Number, required: true, default: 0 },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    toJSON: { transform: toClientTransform },
  }
);

const User = mongoose.model('User', userSchema);
const Disease = mongoose.model('Disease', diseaseSchema);
const DiaryEntry = mongoose.model('DiaryEntry', diarySchema);
const WeatherCache = mongoose.model('WeatherCache', weatherCacheSchema);
const VerifiedUser = mongoose.model('VerifiedUser', verifiedUserSchema, 'verifiedusers');
const GoogleVerifiedUser = mongoose.model('GoogleVerifiedUser', googleVerifiedUserSchema, 'googleverifiedusers');
const WeatherSearch = mongoose.model('WeatherSearch', weatherSearchSchema, 'weathersearches');
const EmailVerification = mongoose.model('EmailVerification', emailVerificationSchema);
const brevoConfigured = Boolean(BREVO_API_KEY && BREVO_FROM_EMAIL);

function sanitizeUser(userDoc) {
  const user = userDoc.toJSON();
  delete user.password_hash;
  return user;
}

function mapAdminUser(userDoc) {
  return {
    id: userDoc?._id ? String(userDoc._id) : '',
    email: typeof userDoc?.email === 'string' ? userDoc.email : '',
    full_name: typeof userDoc?.full_name === 'string' ? userDoc.full_name : '',
    auth_provider: typeof userDoc?.auth_provider === 'string' ? userDoc.auth_provider : 'local',
    location: typeof userDoc?.location === 'string' ? userDoc.location : '',
    primary_crop: typeof userDoc?.primary_crop === 'string' ? userDoc.primary_crop : '',
    created_at: userDoc?.created_at ? new Date(userDoc.created_at).toISOString() : '',
    updated_at: userDoc?.updated_at ? new Date(userDoc.updated_at).toISOString() : '',
  };
}

function issueAuthToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

function issueAdminToken(email) {
  return jwt.sign(
    {
      sub: `admin:${email}`,
      email,
      role: 'admin',
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function isValidEmail(value) {
  if (typeof value !== 'string') return false;
  const trimmed = value.trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
}

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function buildMirrorUserPayload(userDoc, provider) {
  return {
    source_user_id: userDoc._id,
    email: normalizeEmail(userDoc.email),
    full_name: typeof userDoc.full_name === 'string' ? userDoc.full_name : '',
    avatar_url: typeof userDoc.avatar_url === 'string' ? userDoc.avatar_url : '',
    auth_provider: provider,
    location: typeof userDoc.location === 'string' ? userDoc.location : '',
    primary_crop: typeof userDoc.primary_crop === 'string' ? userDoc.primary_crop : '',
    created_at: userDoc.created_at ? new Date(userDoc.created_at) : new Date(),
    updated_at: userDoc.updated_at ? new Date(userDoc.updated_at) : new Date(),
  };
}

async function syncUserMirrorCollectionsFromUserDoc(userDoc) {
  if (!userDoc?._id || !userDoc?.email) return;
  const provider = userDoc.auth_provider === 'google' ? 'google' : 'local';
  const payload = buildMirrorUserPayload(userDoc, provider);
  const email = normalizeEmail(userDoc.email);
  if (!email) return;

  if (provider === 'google') {
    await VerifiedUser.deleteMany({ email });
    await GoogleVerifiedUser.findOneAndUpdate(
      { email },
      { $set: payload },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    await VerifiedUser.deleteMany({ source_user_id: userDoc._id });
  } else {
    await GoogleVerifiedUser.deleteMany({ email });
    await VerifiedUser.findOneAndUpdate(
      { email },
      { $set: payload },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    await GoogleVerifiedUser.deleteMany({ source_user_id: userDoc._id });
  }
}

async function syncAllUsersToMirrorCollections() {
  const users = await User.find({}).lean();
  const usersByEmail = new Map();

  for (const user of users) {
    const email = normalizeEmail(user.email);
    if (!email) continue;
    const existing = usersByEmail.get(email);
    const existingTime = existing?.updated_at ? new Date(existing.updated_at).getTime() : 0;
    const nextTime = user?.updated_at ? new Date(user.updated_at).getTime() : 0;
    if (!existing || nextTime >= existingTime) {
      usersByEmail.set(email, user);
    }
  }

  const localDocs = [];
  const googleDocs = [];

  for (const user of usersByEmail.values()) {
    const provider = user.auth_provider === 'google' ? 'google' : 'local';
    const payload = buildMirrorUserPayload(user, provider);
    if (provider === 'google') {
      googleDocs.push(payload);
    } else {
      localDocs.push(payload);
    }
  }

  await VerifiedUser.deleteMany({});
  await GoogleVerifiedUser.deleteMany({});

  if (localDocs.length > 0) {
    await VerifiedUser.insertMany(localDocs, { ordered: false });
  }
  if (googleDocs.length > 0) {
    await GoogleVerifiedUser.insertMany(googleDocs, { ordered: false });
  }
}

function buildWeatherSearchPayload(record, userDoc) {
  return {
    source_cache_id: record._id,
    user_id: record.user_id,
    user_email: typeof userDoc?.email === 'string' ? userDoc.email : '',
    user_name: typeof userDoc?.full_name === 'string' ? userDoc.full_name : '',
    auth_provider: typeof userDoc?.auth_provider === 'string' ? userDoc.auth_provider : '',
    location: typeof record.location === 'string' ? record.location : '',
    temperature: Number(record.temperature ?? 0),
    humidity: Number(record.humidity ?? 0),
    rainfall: Number(record.rainfall ?? 0),
    weather_condition: typeof record.weather_condition === 'string' ? record.weather_condition : '',
    risk_level: typeof record.risk_level === 'string' ? record.risk_level : '',
    risk_diseases: Array.isArray(record.risk_diseases) ? record.risk_diseases : [],
    fetched_at: typeof record.fetched_at === 'string' ? record.fetched_at : new Date().toISOString(),
  };
}

async function backfillWeatherSearchesIfEmpty() {
  const existingCount = await WeatherSearch.countDocuments();
  if (existingCount > 0) return;

  const caches = await WeatherCache.find({}).sort({ fetched_at: -1 }).lean();
  if (caches.length === 0) return;

  const userIds = [...new Set(caches.map((item) => String(item.user_id)).filter(Boolean))];
  const users = userIds.length > 0
    ? await User.find({ _id: { $in: userIds } }).select('_id email full_name auth_provider').lean()
    : [];
  const usersById = new Map(users.map((item) => [String(item._id), item]));

  const docs = caches.map((record) => {
    const userDoc = usersById.get(String(record.user_id));
    return buildWeatherSearchPayload(record, userDoc);
  });

  if (docs.length > 0) {
    await WeatherSearch.insertMany(docs, { ordered: false });
  }
}

function generateVerificationCode() {
  return String(crypto.randomInt(100000, 1000000));
}

function hashVerificationCode(code) {
  return crypto.createHash('sha256').update(code).digest('hex');
}

async function sendVerificationEmail(email, code) {
  if (!brevoConfigured) {
    throw new Error('Brevo is not configured');
  }

  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': BREVO_API_KEY,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      sender: {
        name: BREVO_FROM_NAME,
        email: BREVO_FROM_EMAIL,
      },
      to: [{ email }],
      subject: 'Your Smart Crop Doctor verification code',
      textContent: `Your verification code is ${code}. It expires in 10 minutes.`,
      htmlContent: `<p>Your verification code is <b>${code}</b>.</p><p>It expires in 10 minutes.</p>`,
    }),
  });

  if (!response.ok) {
    const details = await response.text();
    let message = details;
    try {
      const parsed = JSON.parse(details);
      message = typeof parsed?.message === 'string' ? parsed.message : details;
    } catch {
      // Keep raw body if provider response isn't JSON.
    }
    throw new Error(`Brevo send failed (${response.status}): ${message}`);
  }
}

function authRequired(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : '';
  if (!token) {
    return res.status(401).json({ message: 'Authentication required' });
  }
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.auth = { userId: payload.sub };
    return next();
  } catch (_error) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
}

function adminAuthRequired(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : '';
  if (!token) {
    return res.status(401).json({ message: 'Admin authentication required' });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    if (payload?.role !== 'admin' || typeof payload?.email !== 'string') {
      return res.status(403).json({ message: 'Admin access denied' });
    }
    req.admin = { email: payload.email, role: 'admin' };
    return next();
  } catch (_error) {
    return res.status(401).json({ message: 'Invalid or expired admin token' });
  }
}

async function fetchWithJson(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Upstream weather API failed with status ${response.status}`);
  }
  return response.json();
}

function getSupabaseBaseUrl() {
  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
    throw new Error('Supabase auth is not configured. Set SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY in backend/.env.');
  }

  let parsedUrl;
  try {
    parsedUrl = new URL(SUPABASE_URL);
  } catch {
    throw new Error('SUPABASE_URL is invalid. Use your https://<project-ref>.supabase.co project URL.');
  }

  return parsedUrl.toString().replace(/\/+$/, '');
}

function getSupabaseConnectionMessage(error) {
  if (error instanceof Error && error.name === 'AbortError') {
    return 'Timed out while contacting Supabase. Check whether the project is active and reachable.';
  }

  const cause = error && typeof error === 'object' && 'cause' in error ? error.cause : null;
  const code = typeof cause?.code === 'string' ? cause.code : '';

  if (code === 'ENOTFOUND') {
    const host = SUPABASE_URL
      ? (() => {
        try {
          return new URL(SUPABASE_URL).hostname;
        } catch {
          return SUPABASE_URL;
        }
      })()
      : 'unknown-host';

    return `Supabase host could not be resolved: ${host}. Check SUPABASE_URL in backend/.env and VITE_SUPABASE_URL in frontend/.env, or confirm the Supabase project still exists.`;
  }

  if (error instanceof Error && error.message) {
    return `Unable to reach Supabase: ${error.message}`;
  }

  return 'Unable to reach Supabase. Check the configured project URL and whether the project is active.';
}

async function fetchWithTimeout(url, options = {}, timeoutMs = 8000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
}

async function getSupabaseStatus() {
  try {
    const baseUrl = getSupabaseBaseUrl();
    const response = await fetchWithTimeout(`${baseUrl}/auth/v1/settings`, {
      headers: {
        apikey: SUPABASE_PUBLISHABLE_KEY,
      },
    });

    if (!response.ok) {
      return {
        httpStatus: 503,
        payload: {
          ok: false,
          status: 'unreachable',
          message: `Supabase auth endpoint responded with status ${response.status}. Check the project state and publishable key.`,
        },
      };
    }

    return {
      httpStatus: 200,
      payload: {
        ok: true,
        status: 'ready',
        message: 'Supabase auth endpoint is reachable.',
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown Supabase configuration error';
    const isConfigurationError = message.includes('Supabase auth is not configured') || message.includes('SUPABASE_URL is invalid');

    return {
      httpStatus: isConfigurationError ? 500 : 503,
      payload: {
        ok: false,
        status: isConfigurationError ? 'misconfigured' : 'unreachable',
        message: isConfigurationError ? message : getSupabaseConnectionMessage(error),
      },
    };
  }
}

async function fetchSupabaseUser(accessToken) {
  const userUrl = `${getSupabaseBaseUrl()}/auth/v1/user`;
  let response;

  try {
    response = await fetchWithTimeout(userUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        apikey: SUPABASE_PUBLISHABLE_KEY,
      },
    });
  } catch (error) {
    throw new Error(getSupabaseConnectionMessage(error));
  }

  if (!response.ok) {
    throw new Error(`Supabase auth failed with status ${response.status}`);
  }

  return response.json();
}

function getSupabaseDisplayName(supabaseUser, fallback = '') {
  const metadata = supabaseUser?.user_metadata ?? {};
  if (typeof metadata.full_name === 'string' && metadata.full_name.trim()) {
    return metadata.full_name.trim();
  }
  if (typeof metadata.name === 'string' && metadata.name.trim()) {
    return metadata.name.trim();
  }
  const identityData = Array.isArray(supabaseUser?.identities) ? supabaseUser.identities[0]?.identity_data : null;
  if (identityData) {
    if (typeof identityData.full_name === 'string' && identityData.full_name.trim()) {
      return identityData.full_name.trim();
    }
    if (typeof identityData.name === 'string' && identityData.name.trim()) {
      return identityData.name.trim();
    }
    const givenName = typeof identityData.given_name === 'string' ? identityData.given_name.trim() : '';
    const familyName = typeof identityData.family_name === 'string' ? identityData.family_name.trim() : '';
    const combined = `${givenName} ${familyName}`.trim();
    if (combined) {
      return combined;
    }
  }
  return fallback;
}

function getSupabaseAvatarUrl(supabaseUser, fallback = '') {
  const metadata = supabaseUser?.user_metadata ?? {};
  if (typeof metadata.avatar_url === 'string' && metadata.avatar_url.trim()) {
    return metadata.avatar_url.trim();
  }
  if (typeof metadata.picture === 'string' && metadata.picture.trim()) {
    return metadata.picture.trim();
  }
  const identities = Array.isArray(supabaseUser?.identities) ? supabaseUser.identities : [];
  for (const identity of identities) {
    const identityData = identity?.identity_data ?? {};
    if (typeof identityData.avatar_url === 'string' && identityData.avatar_url.trim()) {
      return identityData.avatar_url.trim();
    }
    if (typeof identityData.picture === 'string' && identityData.picture.trim()) {
      return identityData.picture.trim();
    }
    if (typeof identityData.photo_url === 'string' && identityData.photo_url.trim()) {
      return identityData.photo_url.trim();
    }
    if (typeof identityData.photoURL === 'string' && identityData.photoURL.trim()) {
      return identityData.photoURL.trim();
    }
  }
  return fallback;
}

async function fetchWeatherFromOpenWeather(location) {
  if (!OPENWEATHER_API_KEY) {
    throw new Error('OPENWEATHER_API_KEY is not configured');
  }

  const geoUrl =
    `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(location)}&limit=1&appid=${encodeURIComponent(OPENWEATHER_API_KEY)}`;
  const geoData = await fetchWithJson(geoUrl);
  if (!Array.isArray(geoData) || geoData.length === 0) {
    throw new Error('Location not found');
  }

  const place = geoData[0];
  const weatherUrl =
    `https://api.openweathermap.org/data/2.5/weather?lat=${place.lat}&lon=${place.lon}&units=metric&appid=${encodeURIComponent(OPENWEATHER_API_KEY)}`;
  const weather = await fetchWithJson(weatherUrl);

  const rain1h = typeof weather?.rain?.['1h'] === 'number' ? weather.rain['1h'] : null;
  const rain3h = typeof weather?.rain?.['3h'] === 'number' ? weather.rain['3h'] / 3 : null;
  const rainfall = rain1h ?? rain3h ?? 0;

  return {
    location: `${place.name}${place.state ? `, ${place.state}` : ''}${place.country ? `, ${place.country}` : ''}`,
    temperature: Number(weather?.main?.temp ?? 0),
    humidity: Number(weather?.main?.humidity ?? 0),
    rainfall: Number(rainfall),
    weather_condition: String(weather?.weather?.[0]?.main ?? 'Unknown'),
  };
}

async function fetchWeatherFromOpenMeteo(location) {
  const geoUrl =
    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(location)}&count=1&language=en&format=json`;
  const geoData = await fetchWithJson(geoUrl);
  const place = geoData?.results?.[0];
  if (!place || typeof place.latitude !== 'number' || typeof place.longitude !== 'number') {
    throw new Error('Location not found');
  }

  const weatherUrl =
    `https://api.open-meteo.com/v1/forecast?latitude=${place.latitude}&longitude=${place.longitude}&current=temperature_2m,relative_humidity_2m,precipitation,weather_code`;
  const weatherData = await fetchWithJson(weatherUrl);
  const current = weatherData?.current;
  if (!current) {
    throw new Error('Weather data unavailable');
  }

  return {
    location: `${place.name}${place.admin1 ? `, ${place.admin1}` : ''}${place.country ? `, ${place.country}` : ''}`,
    temperature: Number(current.temperature_2m ?? 0),
    humidity: Number(current.relative_humidity_2m ?? 0),
    rainfall: Number(current.precipitation ?? 0),
    weather_condition: `Code ${String(current.weather_code ?? 'N/A')}`,
  };
}

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
  });
});

app.get('/api/auth/supabase/status', async (_req, res) => {
  const status = await getSupabaseStatus();
  return res.status(status.httpStatus).json(status.payload);
});

app.post('/api/admin/login', async (req, res) => {
  const email = normalizeEmail(req.body?.email);
  const password = typeof req.body?.password === 'string' ? req.body.password.trim() : '';

  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    return res.status(500).json({ message: 'Admin credentials are not configured on server' });
  }

  if (!email || !password) {
    return res.status(400).json({ message: 'Admin email and password are required' });
  }

  if (email !== ADMIN_EMAIL || password !== ADMIN_PASSWORD) {
    return res.status(401).json({ message: 'Only admin can login' });
  }

  const token = issueAdminToken(email);
  return res.json({
    token,
    admin: {
      email,
      role: 'admin',
    },
  });
});

app.get('/api/admin/me', adminAuthRequired, (req, res) => {
  res.json({ admin: req.admin });
});

app.get('/api/admin/overview', adminAuthRequired, async (_req, res) => {
  const [googleUsersRaw, verifiedUsersRaw, diseasesRaw, weatherRaw, weatherSearchesTotal] = await Promise.all([
    GoogleVerifiedUser.find({})
      .select('_id email full_name auth_provider location primary_crop created_at updated_at')
      .sort({ created_at: -1 })
      .lean(),
    VerifiedUser.find({})
      .select('_id email full_name auth_provider location primary_crop created_at updated_at')
      .sort({ created_at: -1 })
      .lean(),
    Disease.find({})
      .select('_id crop_name disease_name disease_type created_at')
      .sort({ crop_name: 1, disease_name: 1 })
      .lean(),
    WeatherSearch.find({})
      .select('_id user_id user_email user_name auth_provider location temperature humidity rainfall weather_condition risk_level risk_diseases fetched_at')
      .sort({ fetched_at: -1 })
      .limit(200)
      .lean(),
    WeatherSearch.countDocuments({}),
  ]);

  const googleVerifiedUsers = googleUsersRaw.map(mapAdminUser);
  const verifiedUsers = verifiedUsersRaw.map(mapAdminUser);
  const diseases = diseasesRaw.map((disease) => ({
    id: disease?._id ? String(disease._id) : '',
    crop_name: typeof disease?.crop_name === 'string' ? disease.crop_name : '',
    disease_name: typeof disease?.disease_name === 'string' ? disease.disease_name : '',
    disease_type: typeof disease?.disease_type === 'string' ? disease.disease_type : '',
    created_at: disease?.created_at ? new Date(disease.created_at).toISOString() : '',
  }));

  const weatherSearches = weatherRaw.map((entry) => ({
    id: entry?._id ? String(entry._id) : '',
    user_id: entry?.user_id ? String(entry.user_id) : '',
    user_email: typeof entry?.user_email === 'string' ? entry.user_email : '',
    user_name: typeof entry?.user_name === 'string' ? entry.user_name : '',
    auth_provider: typeof entry?.auth_provider === 'string' ? entry.auth_provider : '',
    location: typeof entry?.location === 'string' ? entry.location : '',
    temperature: Number(entry?.temperature ?? 0),
    humidity: Number(entry?.humidity ?? 0),
    rainfall: Number(entry?.rainfall ?? 0),
    weather_condition: typeof entry?.weather_condition === 'string' ? entry.weather_condition : '',
    risk_level: typeof entry?.risk_level === 'string' ? entry.risk_level : '',
    risk_diseases: Array.isArray(entry?.risk_diseases) ? entry.risk_diseases : [],
    fetched_at: entry?.fetched_at ? String(entry.fetched_at) : '',
  }));

  return res.json({
    summary: {
      google_verified_users: googleVerifiedUsers.length,
      verified_users: verifiedUsers.length,
      total_users: googleVerifiedUsers.length + verifiedUsers.length,
      diseases: diseases.length,
      weather_searches: weatherSearchesTotal,
    },
    google_verified_users: googleVerifiedUsers,
    verified_users: verifiedUsers,
    diseases,
    weather_searches: weatherSearches,
  });
});

app.post('/api/admin/signout', (_req, res) => {
  res.json({ ok: true });
});

app.post('/api/auth/signup', async (req, res) => {
  const { email, password, fullName } = req.body ?? {};
  if (typeof email !== 'string' || typeof password !== 'string' || password.length < 6) {
    return res.status(400).json({ message: 'Valid email and password (6+ chars) are required' });
  }
  const normalizedEmail = normalizeEmail(email);
  const verification = await EmailVerification.findOne({ email: normalizedEmail });
  const now = Date.now();
  const verifiedAt = verification?.verified_at ? new Date(verification.verified_at).getTime() : 0;
  if (!verification || !verification.verified || !verifiedAt || verifiedAt + EMAIL_CODE_TTL_MS < now) {
    return res.status(403).json({ message: 'Please verify your email with the code before signing up' });
  }

  const existingUser = await User.findOne({ email: normalizedEmail });
  if (existingUser) {
    return res.status(409).json({ message: 'User already registered' });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const createdUser = await User.create({
    email: normalizedEmail,
    password_hash: passwordHash,
    full_name: typeof fullName === 'string' ? fullName : '',
    auth_provider: 'local',
  });

  const token = issueAuthToken(createdUser);
  await syncUserMirrorCollectionsFromUserDoc(createdUser);
  await EmailVerification.deleteOne({ email: normalizedEmail });
  res.status(201).json({
    token,
    user: sanitizeUser(createdUser),
  });
});

app.post('/api/auth/signin', async (req, res) => {
  const { email, password } = req.body ?? {};
  if (typeof email !== 'string' || typeof password !== 'string') {
    return res.status(400).json({ message: 'Email and password are required' });
  }
  const normalizedEmail = email.trim().toLowerCase();
  const user = await User.findOne({ email: normalizedEmail });
  if (!user) {
    return res.status(401).json({ message: 'Invalid email or password' });
  }
  const passwordOk = await bcrypt.compare(password, user.password_hash);
  if (!passwordOk) {
    return res.status(401).json({ message: 'Invalid email or password' });
  }
  if (user.auth_provider !== 'local') {
    user.auth_provider = 'local';
    await user.save();
  }
  await syncUserMirrorCollectionsFromUserDoc(user);

  const token = issueAuthToken(user);
  res.json({
    token,
    user: sanitizeUser(user),
  });
});

app.post('/api/auth/email/send-code', async (req, res) => {
  const email = normalizeEmail(req.body?.email);
  if (!isValidEmail(email)) {
    return res.status(400).json({ message: 'Valid email is required' });
  }
  if (!brevoConfigured) {
    return res.status(500).json({ message: 'Brevo is not configured on server' });
  }

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return res.status(409).json({ message: 'Email is already registered' });
  }

  const now = new Date();
  const existing = await EmailVerification.findOne({ email });
  if (existing?.sent_at && now.getTime() - new Date(existing.sent_at).getTime() < EMAIL_CODE_RESEND_COOLDOWN_MS) {
    return res.status(429).json({ message: 'Please wait before requesting another code' });
  }

  const code = generateVerificationCode();
  const codeHash = hashVerificationCode(code);
  const expiresAt = new Date(now.getTime() + EMAIL_CODE_TTL_MS);

  try {
    await sendVerificationEmail(email, code);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to send verification email';
    console.error('Email send failed:', error);
    return res.status(502).json({ message });
  }

  await EmailVerification.findOneAndUpdate(
    { email },
    {
      $set: {
        email,
        code_hash: codeHash,
        expires_at: expiresAt,
        sent_at: now,
        verified: false,
        verified_at: null,
        attempts: 0,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  return res.json({ ok: true, message: 'Verification code sent' });
});

app.post('/api/auth/email/verify-code', async (req, res) => {
  const email = normalizeEmail(req.body?.email);
  const code = typeof req.body?.code === 'string' ? req.body.code.trim() : '';

  if (!isValidEmail(email) || !/^\d{6}$/.test(code)) {
    return res.status(400).json({ message: 'Valid email and 6-digit code are required' });
  }

  const record = await EmailVerification.findOne({ email });
  if (!record) {
    return res.status(400).json({ message: 'Please request a code first' });
  }
  if (record.verified) {
    return res.json({ ok: true, message: 'Email already verified' });
  }
  if (record.attempts >= EMAIL_CODE_MAX_ATTEMPTS) {
    return res.status(429).json({ message: 'Too many attempts. Request a new code' });
  }
  if (!record.expires_at || new Date(record.expires_at).getTime() < Date.now()) {
    return res.status(400).json({ message: 'Code expired. Request a new code' });
  }

  const codeHash = hashVerificationCode(code);
  if (record.code_hash !== codeHash) {
    await EmailVerification.updateOne({ email }, { $inc: { attempts: 1 } });
    return res.status(400).json({ message: 'Invalid verification code' });
  }

  await EmailVerification.updateOne(
    { email },
    {
      $set: {
        verified: true,
        verified_at: new Date(),
      },
    }
  );

  return res.json({ ok: true, message: 'Email verified successfully' });
});

app.post('/api/auth/supabase', async (req, res) => {
  const accessToken = typeof req.body?.accessToken === 'string' ? req.body.accessToken.trim() : '';
  if (!accessToken) {
    return res.status(400).json({ message: 'accessToken is required' });
  }

  try {
    const supabaseUser = await fetchSupabaseUser(accessToken);
    const email = typeof supabaseUser?.email === 'string' ? supabaseUser.email.trim().toLowerCase() : '';
    if (!email) {
      return res.status(401).json({ message: 'Supabase account has no email' });
    }
    const fullNameFromGoogle = getSupabaseDisplayName(supabaseUser, '');
    const avatarUrlFromGoogle = getSupabaseAvatarUrl(supabaseUser, '');

    let user = await User.findOne({ email });
    if (!user) {
      const passwordHash = await bcrypt.hash(
        `oauth-${supabaseUser?.id ?? email}-${Math.random().toString(36).slice(2)}`,
        10
      );

      user = await User.create({
        email,
        password_hash: passwordHash,
        full_name: fullNameFromGoogle,
        avatar_url: avatarUrlFromGoogle,
        auth_provider: 'google',
      });
    } else {
      user.auth_provider = 'google';
      if (fullNameFromGoogle) {
        user.full_name = fullNameFromGoogle;
      }
      if (avatarUrlFromGoogle) {
        user.avatar_url = avatarUrlFromGoogle;
      }
      await user.save();
    }
    await syncUserMirrorCollectionsFromUserDoc(user);

    const token = issueAuthToken(user);
    return res.json({
      token,
      user: sanitizeUser(user),
    });
  } catch (error) {
    console.error('Supabase sign-in failed:', error);
    const message = error instanceof Error && error.message ? error.message : 'Unable to verify Supabase session';
    const statusCode = message.includes('Supabase host could not be resolved')
      || message.includes('Unable to reach Supabase')
      || message.includes('Timed out while contacting Supabase')
      ? 503
      : 401;

    return res.status(statusCode).json({ message });
  }
});

app.get('/api/auth/me', authRequired, async (req, res) => {
  const user = await User.findById(req.auth.userId);
  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }
  res.json({ user: sanitizeUser(user) });
});

app.post('/api/auth/signout', (_req, res) => {
  res.json({ ok: true });
});

app.get('/api/profile', authRequired, async (req, res) => {
  const user = await User.findById(req.auth.userId);
  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }
  res.json(sanitizeUser(user));
});

app.patch('/api/profile', authRequired, async (req, res) => {
  const { full_name, location, primary_crop } = req.body ?? {};
  const updates = {};
  if (typeof full_name === 'string') updates.full_name = full_name;
  if (typeof location === 'string') updates.location = location;
  if (typeof primary_crop === 'string') {
    if (!['Tomato', "Lady's Finger", ''].includes(primary_crop)) {
      return res.status(400).json({ message: 'Invalid primary_crop value' });
    }
    updates.primary_crop = primary_crop;
  }

  const user = await User.findByIdAndUpdate(req.auth.userId, { $set: updates }, { new: true, runValidators: true });
  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }
  await syncUserMirrorCollectionsFromUserDoc(user);
  res.json(sanitizeUser(user));
});

app.get('/api/diseases', async (req, res) => {
  const { cropName } = req.query;
  const filter = {};
  if (typeof cropName === 'string' && cropName.length > 0) {
    filter.crop_name = cropName;
  }
  const diseases = await Disease.find(filter).sort({ crop_name: 1, disease_name: 1 });
  res.json(diseases.map((disease) => disease.toJSON()));
});

app.get('/api/diseases/find', async (req, res) => {
  const { cropName, diseaseName } = req.query;
  if (typeof cropName !== 'string' || typeof diseaseName !== 'string') {
    return res.status(400).json({ message: 'cropName and diseaseName are required' });
  }
  const disease = await Disease.findOne({
    crop_name: cropName,
    disease_name: { $regex: `^${escapeRegex(diseaseName)}$`, $options: 'i' },
  });
  res.json(disease ? disease.toJSON() : null);
});

app.post('/api/diary', authRequired, async (req, res) => {
  const {
    crop_name,
    disease_name,
    confidence,
    image_url = null,
    notes = '',
    treatment_applied = '',
    observation_date = new Date().toISOString().slice(0, 10),
  } = req.body ?? {};

  if (typeof crop_name !== 'string' || typeof disease_name !== 'string' || typeof confidence !== 'number') {
    return res.status(400).json({ message: 'crop_name, disease_name, confidence are required' });
  }

  const entry = await DiaryEntry.create({
    user_id: req.auth.userId,
    crop_name,
    disease_name,
    confidence,
    image_url,
    notes,
    treatment_applied,
    observation_date,
  });
  res.status(201).json(entry.toJSON());
});

app.get('/api/diary', authRequired, async (req, res) => {
  const requestedLimit = Number(req.query.limit || 0);
  const limit = Number.isFinite(requestedLimit) && requestedLimit > 0 ? Math.min(requestedLimit, 200) : 0;
  const query = DiaryEntry.find({ user_id: req.auth.userId }).sort({ observation_date: -1, created_at: -1 });
  if (limit > 0) {
    query.limit(limit);
  }
  const entries = await query;
  res.json(entries.map((entry) => entry.toJSON()));
});

app.patch('/api/diary/:id', authRequired, async (req, res) => {
  const updates = {};
  const { notes, treatment_applied, observation_date } = req.body ?? {};
  if (typeof notes === 'string') updates.notes = notes;
  if (typeof treatment_applied === 'string') updates.treatment_applied = treatment_applied;
  if (typeof observation_date === 'string') updates.observation_date = observation_date;

  const updated = await DiaryEntry.findOneAndUpdate(
    { _id: req.params.id, user_id: req.auth.userId },
    { $set: updates },
    { new: true, runValidators: true }
  );

  if (!updated) {
    return res.status(404).json({ message: 'Diary entry not found' });
  }
  res.json(updated.toJSON());
});

app.delete('/api/diary/:id', authRequired, async (req, res) => {
  const deleted = await DiaryEntry.findOneAndDelete({ _id: req.params.id, user_id: req.auth.userId });
  if (!deleted) {
    return res.status(404).json({ message: 'Diary entry not found' });
  }
  res.json({ ok: true });
});

app.get('/api/weather/cache/latest', authRequired, async (req, res) => {
  const latest = await WeatherCache.findOne({ user_id: req.auth.userId }).sort({ fetched_at: -1 });
  res.json(latest ? latest.toJSON() : null);
});

app.get('/api/weather/live', authRequired, async (req, res) => {
  const location = typeof req.query.location === 'string' ? req.query.location.trim() : '';
  if (!location) {
    return res.status(400).json({ message: 'location is required' });
  }

  try {
    const openWeatherData = await fetchWeatherFromOpenWeather(location);
    return res.json(openWeatherData);
  } catch (primaryError) {
    console.warn('OpenWeather failed, trying Open-Meteo fallback:', primaryError);
    try {
      const fallbackData = await fetchWeatherFromOpenMeteo(location);
      return res.json(fallbackData);
    } catch (fallbackError) {
      console.error('Weather providers failed:', fallbackError);
      return res.status(502).json({ message: 'Unable to fetch live weather right now' });
    }
  }
});

app.post('/api/weather/cache', authRequired, async (req, res) => {
  const {
    location,
    temperature,
    humidity,
    rainfall = 0,
    weather_condition = '',
    risk_level,
    risk_diseases = [],
  } = req.body ?? {};

  if (
    typeof location !== 'string' ||
    typeof temperature !== 'number' ||
    typeof humidity !== 'number' ||
    typeof risk_level !== 'string'
  ) {
    return res.status(400).json({ message: 'Invalid weather payload' });
  }

  const record = await WeatherCache.create({
    user_id: req.auth.userId,
    location,
    temperature,
    humidity,
    rainfall: typeof rainfall === 'number' ? rainfall : 0,
    weather_condition,
    risk_level,
    risk_diseases: Array.isArray(risk_diseases) ? risk_diseases : [],
    fetched_at: new Date().toISOString(),
  });

  const authUser = await User.findById(req.auth.userId).select('_id email full_name auth_provider').lean();
  await WeatherSearch.findOneAndUpdate(
    { source_cache_id: record._id },
    { $set: buildWeatherSearchPayload(record, authUser) },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  res.status(201).json(record.toJSON());
});

const seedDiseases = [
  {
    crop_name: 'Tomato',
    disease_name: 'Early Blight',
    disease_type: 'Fungal',
    symptoms: ['Dark brown spots with concentric rings on older leaves', 'Yellowing around spots', 'Leaf drop in severe cases'],
    prevention: 'Remove infected leaves, ensure good air circulation, avoid overhead watering, crop rotation',
    treatment_organic: 'Apply neem oil spray weekly, use copper-based fungicides, remove plant debris',
    treatment_chemical: 'Use chlorothalonil or mancozeb fungicides, apply at first sign of disease',
    image_indicators: ['Concentric ring patterns', 'Brown lesions on leaves', 'Target-like spots'],
  },
  {
    crop_name: 'Tomato',
    disease_name: 'Late Blight',
    disease_type: 'Fungal',
    symptoms: ['Water-soaked gray-green spots on leaves', 'White fuzzy growth on leaf undersides', 'Brown lesions on stems and fruits'],
    prevention: 'Plant resistant varieties, avoid overhead irrigation, ensure proper spacing',
    treatment_organic: 'Remove and destroy infected plants immediately, apply copper sprays preventively',
    treatment_chemical: 'Use fungicides containing chlorothalonil or copper, apply before symptoms appear',
    image_indicators: ['Gray-green lesions', 'White mold on undersides', 'Rapid spreading'],
  },
  {
    crop_name: 'Tomato',
    disease_name: 'Bacterial Spot',
    disease_type: 'Bacterial',
    symptoms: ['Small dark brown spots on leaves with yellow halos', 'Raised spots on fruits', 'Leaf yellowing and drop'],
    prevention: 'Use disease-free seeds, avoid working with wet plants, practice crop rotation',
    treatment_organic: 'Apply copper-based sprays, remove infected leaves, improve air circulation',
    treatment_chemical: 'Use copper hydroxide or copper sulfate sprays, streptomycin in severe cases',
    image_indicators: ['Small dark spots with halos', 'Raised fruit lesions', 'Yellow borders'],
  },
  {
    crop_name: 'Tomato',
    disease_name: 'Leaf Mold',
    disease_type: 'Fungal',
    symptoms: ['Yellow spots on upper leaf surfaces', 'Grayish-white mold on leaf undersides', 'Leaf curling and distortion', 'Premature leaf drop'],
    prevention: 'Ensure good air circulation, avoid overhead watering, maintain proper plant spacing',
    treatment_organic: 'Remove infected leaves, apply neem oil spray, improve ventilation',
    treatment_chemical: 'Use copper-based fungicides or chlorothalonil, apply preventively',
    image_indicators: ['Yellow spots on leaves', 'White mold underneath', 'Leaf curling'],
  },
  {
    crop_name: 'Tomato',
    disease_name: 'Septoria Leaf Spot',
    disease_type: 'Fungal',
    symptoms: ['Small dark spots with gray centers', 'Yellow halos around spots', 'Spots may merge to form larger lesions', 'Leaf yellowing and drop'],
    prevention: 'Remove infected plant debris, avoid overhead watering, practice crop rotation',
    treatment_organic: 'Remove infected leaves, apply copper sprays, improve air circulation',
    treatment_chemical: 'Use chlorothalonil or mancozeb fungicides, apply at first sign of disease',
    image_indicators: ['Small dark spots', 'Gray centers', 'Yellow halos'],
  },
  {
    crop_name: 'Tomato',
    disease_name: 'Spider Mites',
    disease_type: 'Fungal',
    symptoms: ['Fine webbing on leaves and stems', 'Yellow or bronze stippling on leaves', 'Leaf curling and distortion', 'Reduced plant vigor'],
    prevention: 'Maintain adequate humidity, remove weeds, monitor regularly',
    treatment_organic: 'Spray with water to dislodge mites, apply neem oil, introduce beneficial insects',
    treatment_chemical: 'Use miticides like abamectin or spiromesifen, apply when mites are first detected',
    image_indicators: ['Fine webbing', 'Stippled leaves', 'Bronze discoloration'],
  },
  {
    crop_name: 'Tomato',
    disease_name: 'Target Spot',
    disease_type: 'Fungal',
    symptoms: ['Dark brown spots with concentric rings', 'Target-like appearance on leaves', 'Spots may appear on fruits', 'Leaf yellowing around spots'],
    prevention: 'Remove infected plant debris, ensure good air circulation, avoid overhead watering',
    treatment_organic: 'Remove infected leaves, apply copper sprays, improve growing conditions',
    treatment_chemical: 'Use chlorothalonil or azoxystrobin fungicides, apply preventively',
    image_indicators: ['Concentric rings', 'Target pattern', 'Brown lesions'],
  },
  {
    crop_name: 'Tomato',
    disease_name: 'Tomato Mosaic Virus',
    disease_type: 'Viral',
    symptoms: ['Mottled yellow and green patterns on leaves', 'Leaf distortion and curling', 'Stunted plant growth', 'Reduced fruit quality'],
    prevention: 'Use virus-free seeds, control aphid vectors, disinfect tools',
    treatment_organic: 'Remove infected plants immediately, control aphids with neem oil, use reflective mulches',
    treatment_chemical: 'No direct cure for viruses, focus on vector control with insecticides',
    image_indicators: ['Mosaic patterns', 'Leaf distortion', 'Mottled appearance'],
  },
  {
    crop_name: 'Tomato',
    disease_name: 'Tomato Yellow Leaf Curl Virus',
    disease_type: 'Viral',
    symptoms: ['Upward curling of leaves', 'Yellowing of leaf margins', 'Stunted plant growth', 'Reduced fruit production'],
    prevention: 'Use resistant varieties, control whitefly vectors, remove infected plants',
    treatment_organic: 'Remove infected plants, control whiteflies with neem oil, use yellow sticky traps',
    treatment_chemical: 'Apply imidacloprid for whitefly control, no direct viral cure available',
    image_indicators: ['Upward curling', 'Yellow margins', 'Stunted growth'],
  },
  {
    crop_name: 'Tomato',
    disease_name: 'Healthy',
    disease_type: 'Healthy',
    symptoms: ['Vibrant green leaves', 'No spots or discoloration', 'Uniform growth'],
    prevention: 'Maintain good cultural practices, monitor regularly, ensure proper nutrition',
    treatment_organic: 'Continue regular care, balanced fertilization, proper watering',
    treatment_chemical: 'Not applicable',
    image_indicators: ['Uniform green color', 'No lesions', 'Healthy appearance'],
  },
  {
    crop_name: "Lady's Finger",
    disease_name: 'Yellow Vein Mosaic',
    disease_type: 'Viral',
    symptoms: ['Yellow veins on leaves forming mosaic pattern', 'Stunted plant growth', 'Reduced fruit production and quality'],
    prevention: 'Control whitefly vectors, use resistant varieties, remove infected plants',
    treatment_organic: 'Remove infected plants, control whiteflies with neem oil, use reflective mulches',
    treatment_chemical: 'Apply imidacloprid for whitefly control, no direct viral cure available',
    image_indicators: ['Yellow vein patterns', 'Mosaic appearance', 'Leaf distortion'],
  },
  {
    crop_name: "Lady's Finger",
    disease_name: 'Powdery Mildew',
    disease_type: 'Fungal',
    symptoms: ['White powdery coating on leaves and stems', 'Leaf curling and distortion', 'Premature leaf drop'],
    prevention: 'Ensure good air circulation, avoid overhead watering, remove infected plant parts',
    treatment_organic: 'Spray with milk solution (1:9 with water), apply neem oil, use sulfur dust',
    treatment_chemical: 'Apply sulfur-based fungicides or potassium bicarbonate sprays',
    image_indicators: ['White powdery coating', 'Leaf surface coverage', 'Dusty appearance'],
  },
  {
    crop_name: "Lady's Finger",
    disease_name: 'Healthy',
    disease_type: 'Healthy',
    symptoms: ['Dark green leaves', 'Strong upright growth', 'No disease symptoms'],
    prevention: 'Maintain proper spacing, regular monitoring, balanced fertilization',
    treatment_organic: 'Continue good agricultural practices, organic compost application',
    treatment_chemical: 'Not applicable',
    image_indicators: ['Dark green color', 'Clean leaves', 'Vigorous growth'],
  },
];

async function ensureSeedDiseases() {
  const existingCount = await Disease.countDocuments();
  if (existingCount > 0) {
    return;
  }
  await Disease.insertMany(seedDiseases, { ordered: false });
  console.log(`Seeded ${seedDiseases.length} diseases into MongoDB`);
}

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({
    message: 'Internal server error',
  });
});

async function startServer() {
  await mongoose.connect(MONGODB_URI);
  console.log(`Connected to MongoDB: ${MONGODB_URI}`);
  await ensureSeedDiseases();
  await syncAllUsersToMirrorCollections();
  await backfillWeatherSearchesIfEmpty();
  app.listen(PORT, () => {
    console.log(`Mongo API listening at http://127.0.0.1:${PORT}`);
  });
}

startServer().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
