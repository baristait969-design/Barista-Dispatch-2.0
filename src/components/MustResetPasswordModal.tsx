import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  KeyRound, 
  ShieldCheck, 
  Eye, 
  EyeOff, 
  AlertCircle, 
  ArrowRight,
  LogOut,
  CheckCircle2
} from 'lucide-react';
import { BaristaLogo } from './BaristaLogo';

export const MustResetPasswordModal: React.FC = () => {
  const { userProfile, updateCurrentUserPassword, logout } = useAuth();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (userProfile?.mustResetPassword || userProfile?.isFirstLogin) {
      setDismissed(false);
      setSuccess(false);
      setNewPassword('');
      setConfirmPassword('');
      setError(null);
    }
  }, [userProfile?.mustResetPassword, userProfile?.isFirstLogin]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanPass = newPassword.trim();
    if (!cleanPass) {
      setError('Please enter your new password.');
      return;
    }
    if (cleanPass.length < 3) {
      setError('Password must be at least 3 characters long.');
      return;
    }
    if (cleanPass !== confirmPassword.trim()) {
      setError('Passwords do not match. Please re-enter.');
      return;
    }

    setSubmitting(true);
    try {
      await updateCurrentUserPassword(cleanPass);
      setSuccess(true);
      setTimeout(() => {
        setDismissed(true);
      }, 1200);
    } catch (err: any) {
      setError(err?.message || 'Failed to update password. Please try again.');
      setSubmitting(false);
    }
  };

  if (dismissed || (!userProfile?.mustResetPassword && !userProfile?.isFirstLogin && !success)) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black/85 flex items-center justify-center p-4 z-50 backdrop-blur-md">
      <div className="bg-[#171311] border border-[#382B25] rounded-2xl w-full max-w-md p-6 sm:p-7 shadow-2xl relative overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="absolute -top-20 -right-20 w-44 h-44 bg-[#ED5338]/20 rounded-full blur-2xl pointer-events-none" />

        <div className="flex items-center space-x-3 mb-5">
          <BaristaLogo className="w-10 h-10 ring-2 ring-[#ED5338]/40" />
          <div>
            <h2 className="text-lg font-bold text-white flex items-center space-x-2">
              <span>First Login: Create Your Password</span>
            </h2>
            <p className="text-xs text-[#FFA594] font-mono">
              Welcome, {userProfile?.displayName} ({userProfile?.username || userProfile?.userIdCode})
            </p>
          </div>
        </div>

        <div className="mb-4 p-3 bg-[#1C1614] border border-[#382B25] rounded-xl text-xs text-stone-300 leading-relaxed flex items-start space-x-2.5">
          <KeyRound className="w-4 h-4 text-[#ED5338] shrink-0 mt-0.5" />
          <div>
            <strong className="text-[#FFA594] block mb-0.5">One-Time Password Setup Required</strong>
            Your account was initialized by an Administrator. On your first login, you must create your own personal permanent password. This setup is required once and cannot be repeated later.
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-950/70 border border-red-800 rounded-xl text-xs text-red-200 flex items-start space-x-2">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {success ? (
          <div className="p-4 bg-emerald-950/60 border border-emerald-800 rounded-xl text-center space-y-2">
            <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
            <h3 className="text-sm font-bold text-white">Password Successfully Saved!</h3>
            <p className="text-xs text-emerald-200">
              Your new password is now active. Entering the Barista Central Kitchen portal...
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-stone-300 mb-1.5">
                New Permanent Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter your new password"
                  autoFocus
                  className="w-full px-3.5 py-2.5 pr-10 bg-[#1C1614] border border-[#382B25] rounded-xl text-sm text-stone-100 placeholder-stone-500 focus:outline-none focus:border-[#ED5338] focus:ring-1 focus:ring-[#ED5338] font-mono transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-stone-400 hover:text-stone-200 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-300 mb-1.5">
                Confirm New Password
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repeat your new password"
                className="w-full px-3.5 py-2.5 bg-[#1C1614] border border-[#382B25] rounded-xl text-sm text-stone-100 placeholder-stone-500 focus:outline-none focus:border-[#ED5338] focus:ring-1 focus:ring-[#ED5338] font-mono transition"
              />
            </div>

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
              <button
                type="button"
                onClick={logout}
                className="w-full sm:w-auto px-3 py-2 text-stone-400 hover:text-stone-200 text-xs flex items-center justify-center space-x-1.5 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out Instead</span>
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="w-full sm:w-auto px-5 py-2.5 bg-[#ED5338] hover:bg-[#D84228] text-white font-bold rounded-xl text-xs shadow-lg shadow-[#ED5338]/25 transition cursor-pointer flex items-center justify-center space-x-1.5 disabled:opacity-50"
              >
                {submitting ? (
                  <span>Saving Password...</span>
                ) : (
                  <>
                    <span>Save & Proceed</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        <div className="mt-5 pt-3 border-t border-[#2C211C] text-center text-[10px] text-stone-500 flex items-center justify-center space-x-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-[#ED5338]" />
          <span>HACCP BCL/REC/HACCP/32 Secure Identity System</span>
        </div>
      </div>
    </div>
  );
};
