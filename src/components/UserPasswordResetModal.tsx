import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  KeyRound, 
  X, 
  Eye, 
  EyeOff, 
  AlertCircle, 
  Sparkles,
  ShieldCheck
} from 'lucide-react';
import { UserProfile } from '../types';
import { adminResetUserPassword } from '../services/dataService';

interface UserPasswordResetModalProps {
  user: UserProfile;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (msg: string) => void;
}

export const UserPasswordResetModal: React.FC<UserPasswordResetModalProps> = ({
  user,
  isOpen,
  onClose,
  onSuccess
}) => {
  const { role } = useAuth();
  const isAdmin = role === 'admin';

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [requireResetOnLogin, setRequireResetOnLogin] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleGeneratePassword = () => {
    const randomDigits = Math.floor(1000 + Math.random() * 9000);
    const generated = `Barista#${randomDigits}`;
    setNewPassword(generated);
    setConfirmPassword(generated);
    setShowPassword(true);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!isAdmin) {
      setError('Security violation: Only Administrators have the authority to reset staff passwords.');
      return;
    }

    const cleanPass = newPassword.trim();
    if (!cleanPass) {
      setError('Password cannot be empty.');
      return;
    }
    if (cleanPass.length < 3) {
      setError('Password must be at least 3 characters.');
      return;
    }
    if (cleanPass !== confirmPassword.trim()) {
      setError('Passwords do not match. Please verify.');
      return;
    }

    setSubmitting(true);
    try {
      await adminResetUserPassword(user.id, cleanPass, requireResetOnLogin);
      if (onSuccess) {
        onSuccess(`Password successfully reset for ${user.displayName} (${user.username || user.userIdCode}) to "${cleanPass}".`);
      }
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to update password.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
      <div className="bg-[#171311] border border-[#382B25] rounded-2xl w-full max-w-md p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-3 border-b border-[#2C211C] mb-4">
          <div className="flex items-center space-x-2">
            <KeyRound className="w-5 h-5 text-[#ED5338]" />
            <div>
              <h3 className="font-bold text-white text-base">
                Reset Staff Password
              </h3>
              <p className="text-[11px] text-stone-400">
                Target User: <strong className="text-[#FFA594]">{user.displayName}</strong> ({user.username || user.userIdCode})
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-stone-400 hover:text-white p-1 rounded-lg hover:bg-[#251D1A] transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-950/70 border border-red-800 rounded-xl text-red-200 text-xs flex items-start space-x-2">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <div className="mb-4 p-3 bg-[#1C1614] border border-[#382B25] rounded-xl text-xs text-stone-300 flex items-start space-x-2.5">
          <ShieldCheck className="w-4 h-4 text-[#ED5338] shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <strong className="text-[#FFA594]">Administrator Authority:</strong> Only administrators can reset or issue passwords for staff accounts. The new password set here will become the staff member's active login password immediately.
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-stone-300">
                New Password
              </label>
              <button
                type="button"
                onClick={handleGeneratePassword}
                className="text-[11px] text-[#FFA594] hover:text-[#ED5338] font-medium flex items-center space-x-1 cursor-pointer transition"
              >
                <Sparkles className="w-3 h-3" />
                <span>Generate Password</span>
              </button>
            </div>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
                className="w-full px-3.5 py-2.5 pr-10 bg-[#1C1614] border border-[#382B25] rounded-xl text-xs text-stone-100 placeholder-stone-500 font-mono focus:outline-none focus:border-[#ED5338] focus:ring-1 focus:ring-[#ED5338]"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-2.5 text-stone-400 hover:text-stone-200 cursor-pointer"
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
              placeholder="Re-enter new password"
              className="w-full px-3.5 py-2.5 bg-[#1C1614] border border-[#382B25] rounded-xl text-xs text-stone-100 placeholder-stone-500 font-mono focus:outline-none focus:border-[#ED5338] focus:ring-1 focus:ring-[#ED5338]"
            />
          </div>

          <div className="p-3 bg-[#1C1614] border border-[#382B25] rounded-xl flex items-center space-x-2.5">
            <input
              type="checkbox"
              id="requireResetCheck"
              checked={requireResetOnLogin}
              onChange={(e) => setRequireResetOnLogin(e.target.checked)}
              className="w-4 h-4 rounded text-[#ED5338] bg-stone-900 border-[#382B25] focus:ring-[#ED5338] cursor-pointer"
            />
            <label htmlFor="requireResetCheck" className="text-xs text-stone-300 cursor-pointer select-none">
              Require staff member to create their own new password on next login
            </label>
          </div>

          <div className="pt-3 border-t border-[#2C211C] flex justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-[#221B18] hover:bg-[#2C211D] text-stone-300 hover:text-white rounded-xl text-xs font-semibold border border-[#382B25] transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-[#ED5338] hover:bg-[#D84228] text-white font-bold rounded-xl text-xs shadow-md shadow-[#ED5338]/25 transition cursor-pointer disabled:opacity-50 flex items-center space-x-1.5"
            >
              {submitting ? 'Saving Password...' : 'Save New Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
