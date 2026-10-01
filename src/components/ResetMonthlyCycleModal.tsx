import React, { useState } from 'react';
import { 
  RotateCcw, 
  X, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  Calendar, 
  ShieldCheck, 
  Trash2, 
  Loader2 
} from 'lucide-react';

interface ResetMonthlyCycleModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentMonthName: string;
  nextResetFormatted: string;
  lastResetAt?: string;
  lastResetBy?: string;
  lastResetReason?: string;
  currentCount: number;
  onConfirmReset: (purgeRecords: boolean, reason: string) => Promise<void>;
}

export const ResetMonthlyCycleModal: React.FC<ResetMonthlyCycleModalProps> = ({
  isOpen,
  onClose,
  currentMonthName,
  nextResetFormatted,
  lastResetAt,
  lastResetBy,
  lastResetReason,
  currentCount,
  onConfirmReset,
}) => {
  const [purgeRecords, setPurgeRecords] = useState<boolean>(false);
  const [reason, setReason] = useState<string>('Supervisor Monthly Cycle Reset');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    setIsSubmitting(true);
    try {
      await onConfirmReset(purgeRecords, reason.trim() || 'Manual Monthly Reset');
      onClose();
    } catch (err) {
      console.error('Reset error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formattedLastReset = lastResetAt
    ? new Date(lastResetAt).toLocaleString('default', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      })
    : '1st of current month @ 12:00 AM';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-[#181311] border border-[#382B25] rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-[#241916] via-[#1F1513] to-[#181311] p-5 border-b border-[#382B25] flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-[#ED5338]/15 border border-[#ED5338]/40 flex items-center justify-center text-[#ED5338]">
              <RotateCcw className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <span>Reset Monthly Dispatch Records</span>
              </h3>
              <p className="text-xs text-stone-400 font-mono mt-0.5">
                HACCP Dispatch Standard BCL/REC/HACCP/32
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1.5 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800/80 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 overflow-y-auto">
          {/* Policy Banner */}
          <div className="bg-[#241814] border border-[#ED5338]/30 rounded-xl p-4 flex items-start space-x-3 text-xs leading-relaxed text-stone-300">
            <Calendar className="w-5 h-5 text-[#ED5338] shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-white block mb-0.5">Official Reset Schedule</span>
              <p>
                Monthly dispatch records automatically reset on <strong>each and every month 1st at 12:00 A.M.</strong> (midnight).
                Performing a manual reset will start a fresh cycle immediately with <strong>0 monthly dispatch records</strong>.
              </p>
            </div>
          </div>

          {/* Current Cycle Metrics Summary */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="bg-stone-900/80 border border-stone-800 rounded-xl p-3">
              <span className="text-stone-400 block text-[11px] mb-1">Active Cycle Period</span>
              <span className="text-white font-bold font-mono text-sm">{currentMonthName}</span>
              <span className="text-stone-500 block text-[10px] mt-1 font-mono">
                {currentCount} active logs
              </span>
            </div>
            <div className="bg-stone-900/80 border border-stone-800 rounded-xl p-3">
              <span className="text-stone-400 block text-[11px] mb-1">Next Scheduled Auto Reset</span>
              <span className="text-amber-400 font-bold font-mono text-xs block">{nextResetFormatted}</span>
              <span className="text-stone-500 block text-[10px] mt-1">1st of month @ 12:00 AM</span>
            </div>
          </div>

          {/* Last Reset Metadata */}
          <div className="bg-[#1D1715] border border-[#352721] rounded-xl p-3 text-xs space-y-1 font-mono">
            <div className="flex items-center justify-between text-stone-400">
              <span>Last Reset Executed:</span>
              <span className="text-stone-200 font-semibold">{formattedLastReset}</span>
            </div>
            <div className="flex items-center justify-between text-stone-400">
              <span>Reset Triggered By:</span>
              <span className="text-amber-300 font-semibold">{lastResetBy || 'Automated System (1st 12:00 AM)'}</span>
            </div>
            {lastResetReason && (
              <div className="flex items-center justify-between text-stone-400 pt-1 border-t border-[#2A1E19]">
                <span>Reason:</span>
                <span className="text-stone-300 truncate max-w-[240px]">{lastResetReason}</span>
              </div>
            )}
          </div>

          {/* Reset Options */}
          <div className="space-y-3">
            <label className="text-xs font-bold uppercase tracking-wider text-stone-400 block">
              Select Reset Action
            </label>

            {/* Option 1: Start Fresh Cycle (Recommended) */}
            <div 
              onClick={() => setPurgeRecords(false)}
              className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-start space-x-3 ${
                !purgeRecords 
                  ? 'bg-[#ED5338]/10 border-[#ED5338] ring-1 ring-[#ED5338]' 
                  : 'bg-stone-900/60 border-stone-800 hover:border-stone-700'
              }`}
            >
              <input
                type="radio"
                name="resetOption"
                checked={!purgeRecords}
                onChange={() => setPurgeRecords(false)}
                className="mt-1 text-[#ED5338] focus:ring-[#ED5338]"
              />
              <div className="text-xs flex-1">
                <span className="font-bold text-white block text-sm flex items-center space-x-1.5">
                  <span>Start Fresh Monthly Cycle (Set Count to 0)</span>
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-1.5 py-0.2 rounded font-semibold uppercase">
                    Recommended
                  </span>
                </span>
                <p className="text-stone-400 mt-1 leading-relaxed">
                  Resets the Dashboard monthly dispatch count to <strong>0</strong> immediately. Existing logs are preserved in <strong>Reports & Audit Logs</strong> and historical archives for HACCP inspection.
                </p>
              </div>
            </div>

            {/* Option 2: Reset & Delete Dispatches */}
            <div 
              onClick={() => setPurgeRecords(true)}
              className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-start space-x-3 ${
                purgeRecords 
                  ? 'bg-rose-950/30 border-rose-600 ring-1 ring-rose-600' 
                  : 'bg-stone-900/60 border-stone-800 hover:border-stone-700'
              }`}
            >
              <input
                type="radio"
                name="resetOption"
                checked={purgeRecords}
                onChange={() => setPurgeRecords(true)}
                className="mt-1 text-rose-600 focus:ring-rose-600"
              />
              <div className="text-xs flex-1">
                <span className="font-bold text-rose-300 block text-sm flex items-center space-x-1.5">
                  <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                  <span>Reset &amp; Purge Dispatches Database</span>
                </span>
                <p className="text-stone-400 mt-1 leading-relaxed">
                  Permanently deletes existing dispatch documents from the database. Use this if you want to wipe test dispatches and start completely clean.
                </p>
              </div>
            </div>
          </div>

          {/* Reason Input */}
          <div>
            <label className="text-xs font-semibold text-stone-300 block mb-1">
              Reset Audit Note / Reason
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Monthly 1st 12:00 AM rollover, Kitchen supervisor reset"
              className="w-full bg-[#140F0E] border border-[#382B25] rounded-lg px-3 py-2 text-xs text-stone-200 placeholder-stone-600 focus:outline-none focus:border-[#ED5338]"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="bg-[#1F1714] p-4 border-t border-[#382B25] flex items-center justify-end space-x-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-semibold rounded-lg transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isSubmitting}
            className="px-5 py-2 bg-[#ED5338] hover:bg-[#D84228] text-white text-xs font-bold rounded-lg shadow-lg shadow-[#ED5338]/20 transition flex items-center space-x-2 cursor-pointer disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Resetting Records...</span>
              </>
            ) : (
              <>
                <RotateCcw className="w-4 h-4" />
                <span>Confirm Reset to 0</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
