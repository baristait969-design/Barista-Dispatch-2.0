import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useModal } from '../context/ModalDialogContext';
import { 
  Lock, 
  User, 
  AlertCircle,
  ThermometerSnowflake,
  ArrowRight,
  Eye,
  EyeOff,
  ShieldCheck,
  Timer
} from 'lucide-react';
import { BaristaLogo } from './BaristaLogo';

const MAX_ATTEMPTS = 5;

export const LoginPage: React.FC = () => {
  const { loginWithUsername } = useAuth();
  const { showAlert } = useModal();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [isShaking, setIsShaking] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState<number>(0);
  const [lockoutRemaining, setLockoutRemaining] = useState<number>(0);

  useEffect(() => {
    const attempts = parseInt(localStorage.getItem('barista_security_failed_attempts') || '0', 10);
    setFailedAttempts(isNaN(attempts) ? 0 : attempts);

    const updateTimer = () => {
      const lockoutUntilStr = localStorage.getItem('barista_security_lockout_until');
      if (lockoutUntilStr) {
        const lockoutUntil = parseInt(lockoutUntilStr, 10);
        const now = Date.now();
        if (!isNaN(lockoutUntil) && now < lockoutUntil) {
          setLockoutRemaining(Math.ceil((lockoutUntil - now) / 1000));
        } else {
          setLockoutRemaining(0);
          localStorage.removeItem('barista_security_lockout_until');
        }
      } else {
        setLockoutRemaining(0);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    const handleSuspended = () => {
      setError('Your staff account has been suspended by an Administrator. Access is revoked.');
      showAlert('Your staff account has been suspended by a Barista Administrator. Please contact your manager or QA Executive.', {
        title: 'Account Suspended',
        type: 'warning'
      });
    };

    const handleDeleted = () => {
      setError('Your staff account has been removed or deactivated.');
      showAlert('Your staff account has been deactivated. Please contact your System Administrator.', {
        title: 'Account Deactivated',
        type: 'warning'
      });
    };

    const handleSessionTerminated = (e: any) => {
      const uName = e?.detail?.username ? `Staff account "${e.detail.username}"` : 'This account';
      const msg = `${uName} has signed in from another window or device. Your previous session has been automatically terminated.`;
      setError(msg);
      showAlert(msg, {
        title: 'Session Terminated (Concurrent Login)',
        type: 'warning'
      });
    };

    window.addEventListener('barista-account-suspended', handleSuspended);
    window.addEventListener('barista-account-deleted', handleDeleted);
    window.addEventListener('barista-session-terminated', handleSessionTerminated);

    return () => {
      clearInterval(interval);
      window.removeEventListener('barista-account-suspended', handleSuspended);
      window.removeEventListener('barista-account-deleted', handleDeleted);
      window.removeEventListener('barista-session-terminated', handleSessionTerminated);
    };
  }, [showAlert]);

  const triggerShake = () => {
    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 600);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (lockoutRemaining > 0) {
      await showAlert(
        `Too many failed attempts. Please wait ${lockoutRemaining} seconds before trying again.`,
        { title: 'Access Locked', type: 'warning' }
      );
      return;
    }

    setError(null);
    setSubmitting(true);
    const cleanUser = username.trim();
    const cleanPass = password.trim();

    try {
      const result = await loginWithUsername(cleanUser, cleanPass);
      if (!result.success) {
        triggerShake();
        const newAttempts = failedAttempts + 1;
        setFailedAttempts(newAttempts);
        localStorage.setItem('barista_security_failed_attempts', newAttempts.toString());

        const commonErrorMessage = 'Invalid username or password. Please try again.';
        setError(commonErrorMessage);

        if (newAttempts >= MAX_ATTEMPTS) {
          const lockUntil = Date.now() + 60000;
          localStorage.setItem('barista_security_lockout_until', lockUntil.toString());
          setLockoutRemaining(60);
          await showAlert(
            'Too many failed sign-in attempts. Please try again later.',
            { title: 'Authentication Failed', type: 'error' }
          );
        } else {
          await showAlert(
            commonErrorMessage,
            { title: 'Authentication Failed', type: 'error' }
          );
        }
        return;
      }

      setFailedAttempts(0);
      localStorage.removeItem('barista_security_failed_attempts');
      localStorage.removeItem('barista_security_lockout_until');
    } catch {
      setError('Invalid username or password. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0D0B0A] text-stone-100 flex flex-col justify-center items-center p-4 sm:p-6 lg:p-8 relative overflow-hidden">
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-[#ED5338]/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-[#3E1812]/30 rounded-full blur-3xl pointer-events-none" />

      <div className="text-center mb-6 z-10">
        <div className="inline-flex items-center justify-center space-x-2 bg-[#1A1412] border border-[#2E221E] px-4 py-1.5 rounded-full mb-4 text-xs text-[#FFA594] shadow-sm">
          <ThermometerSnowflake className="w-4 h-4 text-[#ED5338] animate-pulse" />
          <span>HACCP BCL/REC/HACCP/32 Compliance System</span>
        </div>
        
        <div className="flex items-center justify-center space-x-3.5">
          <BaristaLogo className="w-14 h-14 shadow-xl ring-2 ring-[#ED5338]/40" />
          <div className="text-left">
            <h1 className="text-2xl sm:text-3xl font-extrabold font-serif tracking-widest text-[#ED5338]">
              BARISTA
            </h1>
            <p className="text-xs text-[#FFA594] font-semibold uppercase tracking-wider">
              Sri Lanka - Central Kitchen Dispatch & Inventory
            </p>
          </div>
        </div>
      </div>

      <div className={`w-full max-w-md bg-[#171311] border border-[#2E221E] rounded-3xl shadow-2xl p-6 sm:p-8 z-10 backdrop-blur-md transition-all duration-300 ${
        isShaking ? 'animate-bounce ring-2 ring-red-500/80 shadow-red-950/50' : ''
      }`}>
        <div className="mb-6 text-center">
          <h2 className="text-xl font-bold text-white tracking-wide">
            Staff Portal Sign In
          </h2>
          <p className="text-xs text-stone-400 mt-1">
            Sign in with your staff username and password
          </p>
        </div>

        {lockoutRemaining > 0 && (
          <div className="mb-5 p-4 bg-red-950/90 border border-red-700 rounded-2xl text-red-100 text-xs shadow-xl animate-pulse">
            <div className="flex items-center space-x-2 font-bold text-red-200 mb-1">
              <Timer className="w-4 h-4 text-red-400" />
              <span>Access Temporarily Locked</span>
            </div>
            <p className="text-[11px] text-red-300">
              Too many failed sign-in attempts. Please wait before trying again.
            </p>
            <div className="mt-2.5 flex items-center justify-between bg-black/40 p-2 rounded-xl border border-red-900/60 font-mono text-xs">
              <span>Time Remaining:</span>
              <span className="text-red-400 font-extrabold text-sm">{lockoutRemaining} seconds</span>
            </div>
          </div>
        )}

        {error && lockoutRemaining === 0 && (
          <div className="mb-5 p-3.5 bg-red-950/70 border border-red-800/80 rounded-xl text-red-200 text-xs flex items-start space-x-2.5 shadow-sm">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <span className="leading-snug">{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
          <div>
            <div className="relative">
              <User className="w-4 h-4 text-stone-500 absolute left-3 top-3" />
              <input
                type="text"
                required
                disabled={lockoutRemaining > 0 || submitting}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                placeholder="Username"
                aria-label="Username"
                className="w-full pl-9 pr-3 py-2.5 bg-[#1C1614] border border-[#382B25] rounded-xl text-sm text-stone-100 placeholder-stone-500 focus:outline-none focus:border-[#ED5338] focus:ring-1 focus:ring-[#ED5338] font-mono transition disabled:opacity-40"
              />
            </div>
          </div>

          <div>
            <div className="relative">
              <Lock className="w-4 h-4 text-stone-500 absolute left-3 top-3" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                disabled={lockoutRemaining > 0 || submitting}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                placeholder="Password"
                aria-label="Password"
                className="w-full pl-9 pr-10 py-2.5 bg-[#1C1614] border border-[#382B25] rounded-xl text-sm text-stone-100 placeholder-stone-500 focus:outline-none focus:border-[#ED5338] focus:ring-1 focus:ring-[#ED5338] font-mono transition disabled:opacity-40"
              />
              <button
                type="button"
                disabled={lockoutRemaining > 0}
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3 text-stone-400 hover:text-stone-200 cursor-pointer disabled:opacity-40"
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting || lockoutRemaining > 0}
            className="w-full py-3 px-4 bg-[#ED5338] hover:bg-[#D84228] text-white font-bold rounded-xl shadow-lg shadow-[#ED5338]/25 transition cursor-pointer flex items-center justify-center space-x-2 disabled:opacity-50 mt-3"
          >
            {submitting ? (
              <span>Authenticating...</span>
            ) : lockoutRemaining > 0 ? (
              <span>Locked ({lockoutRemaining}s)</span>
            ) : (
              <>
                <span>Sign In to Central Kitchen</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-[#2E221E] text-center text-xs text-stone-500">
          <div className="flex items-center justify-center space-x-1.5">
            <ShieldCheck className="w-4 h-4 text-[#ED5338]" />
            <span>Secure Enterprise Access Control - Barista QA Portal</span>
          </div>
        </div>
      </div>

      <div className="text-center mt-6 text-stone-500 text-xs">
        <p>HACCP Quality Assurance System - Barista Coffee Lanka (Pvt) Ltd</p>
      </div>
    </div>
  );
};
