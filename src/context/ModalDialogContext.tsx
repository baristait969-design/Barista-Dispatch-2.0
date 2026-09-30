import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { 
  AlertCircle, 
  AlertTriangle, 
  CheckCircle2, 
  Info, 
  ShieldAlert, 
  X, 
  Trash2
} from 'lucide-react';

export type ModalType = 'info' | 'warning' | 'error' | 'success' | 'security' | 'danger';

export interface AlertOptions {
  title?: string;
  type?: ModalType;
  confirmText?: string;
  onConfirm?: () => void;
}

export interface ConfirmOptions {
  title?: string;
  type?: ModalType;
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
}

interface ModalState {
  isOpen: boolean;
  isConfirm: boolean;
  title: string;
  message: React.ReactNode;
  type: ModalType;
  confirmText: string;
  cancelText: string;
  onConfirmCallback?: () => void;
  onCancelCallback?: () => void;
  resolvePromise?: (val: boolean) => void;
}

interface ModalDialogContextType {
  showAlert: (message: React.ReactNode, options?: AlertOptions) => Promise<void>;
  showConfirm: (message: React.ReactNode, options?: ConfirmOptions) => Promise<boolean>;
  closeModal: () => void;
}

const ModalDialogContext = createContext<ModalDialogContextType | undefined>(undefined);

export const ModalDialogProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [modal, setModal] = useState<ModalState>({
    isOpen: false,
    isConfirm: false,
    title: '',
    message: '',
    type: 'info',
    confirmText: 'OK',
    cancelText: 'Cancel',
  });

  const closeModal = useCallback(() => {
    setModal(prev => {
      if (prev.resolvePromise) {
        prev.resolvePromise(false);
      }
      return { ...prev, isOpen: false };
    });
  }, []);

  const showAlert = useCallback((message: React.ReactNode, options?: AlertOptions): Promise<void> => {
    return new Promise((resolve) => {
      let defaultTitle = 'Notice';
      const type = options?.type || 'info';
      if (type === 'error') defaultTitle = 'Error';
      else if (type === 'warning') defaultTitle = 'Warning';
      else if (type === 'success') defaultTitle = 'Success';
      else if (type === 'security') defaultTitle = 'Security Alert';
      else if (type === 'danger') defaultTitle = 'Action Required';

      setModal({
        isOpen: true,
        isConfirm: false,
        title: options?.title || defaultTitle,
        message,
        type,
        confirmText: options?.confirmText || 'Acknowledge',
        cancelText: '',
        onConfirmCallback: options?.onConfirm,
        resolvePromise: () => resolve(),
      });
    });
  }, []);

  const showConfirm = useCallback((message: React.ReactNode, options?: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      let defaultTitle = 'Confirmation';
      const type = options?.type || 'warning';
      if (type === 'danger') defaultTitle = 'Confirm Action';
      else if (type === 'security') defaultTitle = 'Security Confirmation';

      setModal({
        isOpen: true,
        isConfirm: true,
        title: options?.title || defaultTitle,
        message,
        type,
        confirmText: options?.confirmText || 'Confirm',
        cancelText: options?.cancelText || 'Cancel',
        onConfirmCallback: options?.onConfirm,
        onCancelCallback: options?.onCancel,
        resolvePromise: resolve,
      });
    });
  }, []);

  // Intercept native window.alert so no unstyled browser popup can ever appear
  useEffect(() => {
    const originalAlert = window.alert;
    window.alert = (msg?: any) => {
      showAlert(String(msg || ''), { title: 'System Notice', type: 'info' });
    };
    return () => {
      window.alert = originalAlert;
    };
  }, [showAlert]);

  // Listen for real-time account suspension and deletion events
  useEffect(() => {
    const handleSuspended = () => {
      showAlert('Your user account has been suspended by an Administrator. Access has been revoked and you have been signed out.', {
        title: 'Account Suspended',
        type: 'security'
      });
    };
    const handleDeleted = () => {
      showAlert('Your user account has been permanently removed by an Administrator. Access has been terminated and you have been signed out.', {
        title: 'Account Deleted',
        type: 'security'
      });
    };
    window.addEventListener('barista-account-suspended', handleSuspended);
    window.addEventListener('barista-account-deleted', handleDeleted);
    return () => {
      window.removeEventListener('barista-account-suspended', handleSuspended);
      window.removeEventListener('barista-account-deleted', handleDeleted);
    };
  }, [showAlert]);

  // Keyboard navigation: Escape closes or cancels, Enter confirms
  useEffect(() => {
    if (!modal.isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        if (modal.onCancelCallback) modal.onCancelCallback();
        closeModal();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        handleConfirm();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [modal.isOpen, modal.onCancelCallback]);

  const handleConfirm = () => {
    if (modal.onConfirmCallback) {
      modal.onConfirmCallback();
    }
    if (modal.resolvePromise) {
      modal.resolvePromise(true);
    }
    setModal(prev => ({ ...prev, isOpen: false }));
  };

  const handleCancel = () => {
    if (modal.onCancelCallback) {
      modal.onCancelCallback();
    }
    if (modal.resolvePromise) {
      modal.resolvePromise(false);
    }
    setModal(prev => ({ ...prev, isOpen: false }));
  };

  const renderIcon = () => {
    switch (modal.type) {
      case 'security':
        return (
          <div className="w-12 h-12 rounded-2xl bg-red-950/80 border border-red-700/80 text-[#ED5338] flex items-center justify-center shadow-lg shadow-red-950/50">
            <ShieldAlert className="w-6 h-6 animate-pulse" />
          </div>
        );
      case 'error':
        return (
          <div className="w-12 h-12 rounded-2xl bg-red-950/80 border border-red-700/80 text-red-400 flex items-center justify-center shadow-lg shadow-red-950/50">
            <AlertCircle className="w-6 h-6" />
          </div>
        );
      case 'danger':
        return (
          <div className="w-12 h-12 rounded-2xl bg-red-950/80 border border-red-700/80 text-red-400 flex items-center justify-center shadow-lg shadow-red-950/50">
            <Trash2 className="w-6 h-6" />
          </div>
        );
      case 'warning':
        return (
          <div className="w-12 h-12 rounded-2xl bg-amber-950/80 border border-amber-700/80 text-amber-400 flex items-center justify-center shadow-lg shadow-amber-950/50">
            <AlertTriangle className="w-6 h-6" />
          </div>
        );
      case 'success':
        return (
          <div className="w-12 h-12 rounded-2xl bg-emerald-950/80 border border-emerald-700/80 text-emerald-400 flex items-center justify-center shadow-lg shadow-emerald-950/50">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        );
      case 'info':
      default:
        return (
          <div className="w-12 h-12 rounded-2xl bg-[#261E1A] border border-[#42332C] text-[#ED5338] flex items-center justify-center shadow-lg">
            <Info className="w-6 h-6" />
          </div>
        );
    }
  };

  const getConfirmBtnClass = () => {
    if (modal.type === 'danger' || modal.type === 'error' || modal.type === 'security') {
      return 'bg-gradient-to-r from-red-600 to-[#ED5338] hover:from-red-500 hover:to-[#FF684D] text-white shadow-lg shadow-red-950/50';
    }
    if (modal.type === 'success') {
      return 'bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white shadow-lg shadow-emerald-950/50';
    }
    if (modal.type === 'warning') {
      return 'bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-stone-950 shadow-lg shadow-amber-950/50 font-black';
    }
    return 'bg-[#ED5338] hover:bg-[#D84228] text-white shadow-lg shadow-[#ED5338]/25';
  };

  return (
    <ModalDialogContext.Provider value={{ showAlert, showConfirm, closeModal }}>
      {children}
      {/* POPUP MODAL DIALOG WINDOW */}
      {modal.isOpen && (
        <div 
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
          role="dialog"
          aria-modal="true"
        >
          <div 
            className="w-full max-w-md bg-[#1C1614] border border-[#382B25] rounded-3xl shadow-2xl p-6 sm:p-7 relative text-stone-100 animate-in zoom-in-95 duration-200 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top ambient glow */}
            <div className={`absolute -top-24 left-1/2 -translate-x-1/2 w-48 h-48 rounded-full blur-3xl pointer-events-none opacity-20 ${
              modal.type === 'security' || modal.type === 'error' || modal.type === 'danger' 
                ? 'bg-red-500' 
                : modal.type === 'warning' 
                ? 'bg-amber-500' 
                : modal.type === 'success' 
                ? 'bg-emerald-500' 
                : 'bg-[#ED5338]'
            }`} />

            {/* Close button in top-right */}
            <button
              onClick={handleCancel}
              className="absolute top-4 right-4 p-2 text-stone-400 hover:text-white rounded-full hover:bg-[#2A201C] transition cursor-pointer"
              title="Close Dialog"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-start space-x-4 mb-4">
              <div className="shrink-0 mt-0.5">
                {renderIcon()}
              </div>
              <div className="flex-1 min-w-0 pr-6">
                <h3 className="text-lg font-bold text-white tracking-wide leading-tight">
                  {modal.title}
                </h3>
                <span className="text-[10px] text-stone-500 font-mono uppercase tracking-wider block mt-0.5">
                  Barista QA Control System
                </span>
              </div>
            </div>

            {/* Message Body */}
            <div className="text-stone-300 text-xs sm:text-sm leading-relaxed mb-6 pl-1 pr-1 bg-[#171210] p-4 rounded-2xl border border-[#2E221E]/80">
              {typeof modal.message === 'string' ? (
                <p className="whitespace-pre-line">{modal.message}</p>
              ) : (
                modal.message
              )}
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-end space-x-3 pt-2">
              {modal.isConfirm && (
                <button
                  type="button"
                  onClick={handleCancel}
                  className="px-4 py-2.5 rounded-xl border border-[#382B25] text-stone-300 hover:text-white hover:bg-[#2A201C] text-xs font-semibold transition cursor-pointer"
                >
                  {modal.cancelText || 'Cancel'}
                </button>
              )}
              <button
                type="button"
                onClick={handleConfirm}
                autoFocus
                className={`px-5 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${getConfirmBtnClass()}`}
              >
                {modal.confirmText || (modal.isConfirm ? 'Confirm' : 'Acknowledge')}
              </button>
            </div>
          </div>
        </div>
      )}
    </ModalDialogContext.Provider>
  );
};

export const useModal = () => {
  const context = useContext(ModalDialogContext);
  if (!context) {
    throw new Error('useModal must be used within a ModalDialogProvider');
  }
  return context;
};
