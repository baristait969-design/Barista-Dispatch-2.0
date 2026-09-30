import React from 'react';
import { Trash2, X, Loader2 } from 'lucide-react';

interface ConfirmDeleteModalProps {
  isOpen: boolean;
  title: string;
  itemName: string;
  itemType?: string;
  description?: string;
  isDeleting?: boolean;
  onConfirm: () => void | Promise<void>;
  onClose: () => void;
}

export const ConfirmDeleteModal: React.FC<ConfirmDeleteModalProps> = ({
  isOpen,
  title,
  itemName,
  itemType = 'Record',
  description,
  isDeleting = false,
  onConfirm,
  onClose
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="relative w-full max-w-md bg-[#171311] border border-red-900/50 rounded-2xl shadow-2xl p-6 text-stone-100 animate-in fade-in zoom-in-95 duration-150">
        
        {/* Top close button */}
        <button
          onClick={onClose}
          disabled={isDeleting}
          className="absolute top-4 right-4 text-stone-400 hover:text-white p-1.5 rounded-lg hover:bg-[#251D1A] transition cursor-pointer disabled:opacity-50"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Warning Icon & Header */}
        <div className="flex items-start space-x-3.5 mb-4">
          <div className="w-12 h-12 rounded-xl bg-red-950/80 border border-red-800 flex items-center justify-center text-red-400 shrink-0 shadow-inner">
            <Trash2 className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white leading-snug">
              {title}
            </h3>
            <p className="text-xs text-stone-400 mt-1">
              {description || `Are you sure you want to permanently delete this ${itemType.toLowerCase()}? This action cannot be undone.`}
            </p>
          </div>
        </div>

        {/* Item badge */}
        <div className="p-3 bg-[#120E0D] border border-[#2E221E] rounded-xl mb-6">
          <div className="text-[10px] font-mono text-stone-500 uppercase tracking-wider">
            {itemType} to be deleted
          </div>
          <div className="text-sm font-bold text-[#FFA594] font-mono mt-0.5 break-all">
            {itemName}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end space-x-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="px-4 py-2 bg-[#221B18] hover:bg-[#2C211D] text-stone-300 hover:text-white rounded-xl text-xs font-semibold border border-[#382B25] transition cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>
          
          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            className="px-4 py-2 bg-red-700 hover:bg-red-600 text-white rounded-xl text-xs font-bold transition flex items-center space-x-1.5 shadow-lg shadow-red-950/50 cursor-pointer disabled:opacity-60"
          >
            {isDeleting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Deleting...</span>
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4" />
                <span>Delete Permanently</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
