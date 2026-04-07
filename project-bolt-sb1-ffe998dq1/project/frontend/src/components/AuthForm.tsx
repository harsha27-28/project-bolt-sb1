import { useEffect, useState } from 'react';
import { LogIn, UserPlus, Loader2 } from 'lucide-react';
import {
  sendSignUpVerificationCode,
  signIn,
  signInWithGoogle,
  signInWithSupabaseSession,
  signUpAndLogin,
  verifySignUpEmailCode,
} from '../lib/auth';
import { supabase, supabaseConfigError } from '../lib/supabaseClient';

export function AuthForm() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);
  const [verificationMessage, setVerificationMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [verifyingCode, setVerifyingCode] = useState(false);
  const [error, setError] = useState('');
  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const getErrorMessage = (err: unknown) => {
    if (err instanceof Error && err.message) return err.message;
    if (typeof err === 'string') return err;
    if (err && typeof err === 'object') {
      const maybeError = err as Record<string, unknown>;
      if (typeof maybeError.message === 'string') return maybeError.message;
      if (typeof maybeError.msg === 'string') return maybeError.msg;
      if (typeof maybeError.error_description === 'string') return maybeError.error_description;
      if (typeof maybeError.error === 'string') return maybeError.error;
    }
    return 'An error occurred';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        await signIn(email, password);
      } else {
        if (!emailVerified) {
          throw new Error('Please verify your email before signing up');
        }
        await signUpAndLogin(email, password, fullName);
      }
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleSendCode = async () => {
    setError('');
    setVerificationMessage('');
    if (!isEmailValid) {
      setError('Enter a valid email first');
      return;
    }
    setSendingCode(true);
    try {
      const result = await sendSignUpVerificationCode(email.trim());
      setCodeSent(true);
      setEmailVerified(false);
      setVerificationCode('');
      setVerificationMessage(result.message || 'Verification code sent');
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setSendingCode(false);
    }
  };

  const handleVerifyCode = async () => {
    setError('');
    setVerificationMessage('');
    if (!/^\d{6}$/.test(verificationCode.trim())) {
      setError('Enter the 6-digit verification code');
      return;
    }
    setVerifyingCode(true);
    try {
      const result = await verifySignUpEmailCode(email.trim(), verificationCode.trim());
      setEmailVerified(true);
      setVerificationMessage(result.message || 'Email verified successfully');
    } catch (err: unknown) {
      setEmailVerified(false);
      setError(getErrorMessage(err));
    } finally {
      setVerifyingCode(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setGoogleLoading(true);
    try {
      await signInWithGoogle();
    } catch (err: unknown) {
      setError(getErrorMessage(err));
      setGoogleLoading(false);
    }
  };

  useEffect(() => {
    let active = true;

    const syncSupabaseSession = async (cleanupUrl: boolean) => {
      try {
        setLoading(true);

        let authData = await signInWithSupabaseSession();

        // Supabase can finish URL/session processing slightly after first paint.
        if (!authData) {
          await new Promise((resolve) => window.setTimeout(resolve, 500));
          authData = await signInWithSupabaseSession();
        }

        if (active && cleanupUrl && authData) {
          window.history.replaceState({}, document.title, window.location.pathname);
        }
      } catch (err: unknown) {
        if (active) {
          setError(getErrorMessage(err));
        }
      } finally {
        if (active) {
          setLoading(false);
          setGoogleLoading(false);
        }
      }
    };

    const hasOAuthCode = new URLSearchParams(window.location.search).has('code');
    const hasOAuthTokenHash = /access_token=|refresh_token=/.test(window.location.hash);
    const hasOAuthError = new URLSearchParams(window.location.search).has('error') || /error=/.test(window.location.hash);
    const hasOAuthCallbackParams = hasOAuthCode || hasOAuthTokenHash || hasOAuthError;

    if (hasOAuthCallbackParams && supabaseConfigError) {
      setError(supabaseConfigError);
      return () => {
        active = false;
      };
    }

    if (hasOAuthCallbackParams) {
      void syncSupabaseSession(true);
    }

    if (!supabase) {
      return () => {
        active = false;
      };
    }

    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') {
        void syncSupabaseSession(true);
      }
    });

    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, []);

  const resetSignUpVerification = () => {
    setVerificationCode('');
    setCodeSent(false);
    setEmailVerified(false);
    setVerificationMessage('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md p-8 border border-transparent dark:border-gray-700">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-600 rounded-full mb-4">
            <span className="text-3xl">🌿</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">Smart Crop Doctor</h1>
          <p className="text-gray-600 dark:text-gray-300">AI-powered crop disease detection</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Email
            </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => {
                  const nextEmail = e.target.value;
                if (!isLogin && nextEmail.trim().toLowerCase() !== email.trim().toLowerCase()) {
                  resetSignUpVerification();
                }
                setEmail(nextEmail);
              }}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              required
            />
          </div>

          {isLogin ? (
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Password
              </label>
              <input
                id="login-password"
                name="loginPassword"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                required
                minLength={6}
              />
            </div>
          ) : (
            <>
              <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3 bg-gray-50 dark:bg-gray-900/40 space-y-3">
                <p className="text-sm font-medium text-gray-800 dark:text-gray-200">Step 1: Verify your email</p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="\d{6}"
                    placeholder="Enter 6-digit code"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    disabled={!codeSent || emailVerified}
                  />
                  <button
                    type="button"
                    onClick={handleSendCode}
                    disabled={sendingCode || !isEmailValid}
                    className="px-3 py-2 text-sm rounded-lg border border-green-600 text-green-700 hover:bg-green-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {sendingCode ? 'Sending...' : codeSent ? 'Resend' : 'Send Code'}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={handleVerifyCode}
                  disabled={!codeSent || verifyingCode || verificationCode.trim().length !== 6 || emailVerified}
                  className="w-full py-2 text-sm rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {verifyingCode ? 'Verifying...' : emailVerified ? 'Email Verified' : 'Verify Code'}
                </button>
                {verificationMessage && (
                  <p className={`text-sm ${emailVerified ? 'text-green-700' : 'text-gray-700'}`}>
                    {verificationMessage}
                  </p>
                )}
              </div>

              {emailVerified && (
                <>
                  <div>
                    <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Full Name
                    </label>
                    <input
                      id="fullName"
                      type="text"
                      autoComplete="name"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Password
                    </label>
                    <input
                      id="signup-password"
                      name="signupPassword"
                      type="password"
                      autoComplete="new-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      required
                      minLength={6}
                    />
                  </div>
                </>
              )}
            </>
          )}

          {error && (
            <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || (!isLogin && !emailVerified)}
            className="w-full bg-green-600 text-white py-3 rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Please wait...
              </>
            ) : (
              <>
                {isLogin ? <LogIn className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />}
                {isLogin ? 'Sign In' : 'Sign Up'}
              </>
            )}
          </button>

          {isLogin && (
            <>
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white dark:bg-gray-800 px-2 text-gray-500 dark:text-gray-400">Or</span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={loading || googleLoading}
                className="w-full border border-gray-300 dark:border-gray-600 text-gray-800 dark:text-gray-100 py-3 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {googleLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Redirecting...
                  </>
                ) : (
                  'Sign In with Google'
                )}
              </button>
            </>
          )}
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => {
              setIsLogin(!isLogin);
              setError('');
              setVerificationMessage('');
              setPassword('');
              if (isLogin) {
                resetSignUpVerification();
              }
            }}
            className="text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300 font-medium"
          >
            {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
          </button>
        </div>
      </div>
    </div>
  );
}
