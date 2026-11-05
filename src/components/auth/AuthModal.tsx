import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { LumaLogo } from '../ui/LumaLogo';
import { X, Mail, Lock, User as UserIcon, AlertCircle, Loader2 } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'signin' | 'signup';
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  initialMode = 'signin'
}) => {
  const { signInWithGoogle, signInWithEmail, signUpWithEmail, resetPassword, authError, setAuthError } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup' | 'forgot'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  if (!isOpen) return null;

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      await signInWithGoogle();
      onClose();
    } catch {
      // Error handled by hook
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || loading) return;

    setLoading(true);
    setResetSent(false);

    try {
      if (mode === 'signin') {
        await signInWithEmail(email.trim(), password);
        onClose();
      } else if (mode === 'signup') {
        await signUpWithEmail(email.trim(), password, name.trim());
        onClose();
      } else if (mode === 'forgot') {
        await resetPassword(email.trim());
        setResetSent(true);
      }
    } catch {
      // Error handled by hook
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-xs animate-in fade-in">
      <div
        className="w-full max-w-md rounded-2xl border border-[#383838] p-6 shadow-2xl relative"
        style={{ backgroundColor: '#202020' }}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-[#A5A29F] hover:text-[#F2F0ED] p-1 rounded-lg"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex flex-col items-center text-center mb-6">
          <LumaLogo size="md" showWordmark={true} showCreator={false} />
          <h2 className="text-base font-semibold text-[#F2F0ED] mt-3">
            {mode === 'signin' && 'Sign in to LUMA AI'}
            {mode === 'signup' && 'Create your LUMA AI account'}
            {mode === 'forgot' && 'Reset your password'}
          </h2>
          <p className="text-xs text-[#A5A29F] mt-1">
            Access your conversations, documents, and library anywhere
          </p>
        </div>

        {/* Google One-Click Login */}
        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2.5 px-4 py-2.5 rounded-xl border border-[#383838] hover:border-[#DA4B2A] transition-all text-xs font-semibold text-[#F2F0ED] hover:bg-[#292929] mb-4 disabled:opacity-50"
          style={{ backgroundColor: '#242424' }}
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path
              fill="#EA4335"
              d="M12 5c1.6 0 3 .6 4.1 1.7l3.1-3.1C17.3 1.8 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.4 9 5 12 5z"
            />
            <path
              fill="#4285F4"
              d="M23.5 12.3c0-.8-.1-1.7-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z"
            />
            <path
              fill="#FBBC05"
              d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3 0-.8.2-1.6.4-2.3L1.9 7.3C.7 9.7 0 12.3 0 15.2c0 2.8.7 5.5 1.9 7.9l3.7-2.9z"
            />
            <path
              fill="#34A853"
              d="M12 23.5c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.4-6.4-5.2L1.9 16.5C3.7 20.3 7.5 23.5 12 23.5z"
            />
          </svg>
          <span>Continue with Google</span>
        </button>

        <div className="flex items-center gap-3 my-4">
          <div className="flex-1 h-px bg-[#383838]" />
          <span className="text-[11px] text-[#77736F] uppercase">or with email</span>
          <div className="flex-1 h-px bg-[#383838]" />
        </div>

        {/* Error / Success alert */}
        {authError && (
          <div className="mb-4 p-2.5 rounded-lg bg-[#292929] border border-[#DA4B2A]/50 flex items-start gap-2 text-xs text-[#F2F0ED]">
            <AlertCircle className="w-3.5 h-3.5 text-[#DA4B2A] shrink-0 mt-0.5" />
            <span>{authError}</span>
          </div>
        )}

        {resetSent && (
          <div className="mb-4 p-2.5 rounded-lg bg-[#292929] border border-[#DA4B2A]/50 text-xs text-[#F2F0ED]">
            Password reset link sent to your email. Check your inbox.
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3">
          {mode === 'signup' && (
            <div>
              <label className="block text-xs font-medium text-[#F2F0ED] mb-1">Your Name</label>
              <div className="relative">
                <UserIcon className="w-3.5 h-3.5 text-[#77736F] absolute left-3 top-3" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Annabil"
                  className="w-full pl-9 pr-3 py-2 rounded-xl text-xs bg-[#292929] border border-[#383838] text-[#F2F0ED] placeholder-[#77736F] focus:outline-none focus:border-[#DA4B2A]"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-[#F2F0ED] mb-1">Email Address</label>
            <div className="relative">
              <Mail className="w-3.5 h-3.5 text-[#77736F] absolute left-3 top-3" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full pl-9 pr-3 py-2 rounded-xl text-xs bg-[#292929] border border-[#383838] text-[#F2F0ED] placeholder-[#77736F] focus:outline-none focus:border-[#DA4B2A]"
              />
            </div>
          </div>

          {mode !== 'forgot' && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium text-[#F2F0ED]">Password</label>
                {mode === 'signin' && (
                  <button
                    type="button"
                    onClick={() => {
                      setMode('forgot');
                      setAuthError(null);
                    }}
                    className="text-[11px] text-[#A5A29F] hover:text-[#DA4B2A]"
                  >
                    Forgot?
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="w-3.5 h-3.5 text-[#77736F] absolute left-3 top-3" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3 py-2 rounded-xl text-xs bg-[#292929] border border-[#383838] text-[#F2F0ED] placeholder-[#77736F] focus:outline-none focus:border-[#DA4B2A]"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-2.5 rounded-xl text-xs font-semibold text-white shadow-sm hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
            style={{ backgroundColor: '#DA4B2A' }}
          >
            {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            <span>
              {mode === 'signin' && 'Sign In'}
              {mode === 'signup' && 'Create Account'}
              {mode === 'forgot' && 'Send Reset Link'}
            </span>
          </button>
        </form>

        {/* Mode switcher */}
        <div className="mt-5 text-center text-xs text-[#A5A29F]">
          {mode === 'signin' && (
            <span>
              Don't have an account?{' '}
              <button
                type="button"
                onClick={() => {
                  setMode('signup');
                  setAuthError(null);
                }}
                className="text-[#DA4B2A] font-medium hover:underline"
              >
                Sign up
              </button>
            </span>
          )}
          {mode === 'signup' && (
            <span>
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => {
                  setMode('signin');
                  setAuthError(null);
                }}
                className="text-[#DA4B2A] font-medium hover:underline"
              >
                Sign in
              </button>
            </span>
          )}
          {mode === 'forgot' && (
            <button
              type="button"
              onClick={() => {
                setMode('signin');
                setAuthError(null);
              }}
              className="text-[#DA4B2A] font-medium hover:underline"
            >
              Back to Sign In
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
