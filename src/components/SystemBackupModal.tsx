import React, { useState, useEffect } from 'react';
import { 
  Database, 
  Download, 
  Upload, 
  ShieldCheck, 
  FileJson, 
  CheckCircle2, 
  AlertTriangle, 
  RefreshCw, 
  X, 
  HardDrive, 
  Package, 
  Store, 
  UtensilsCrossed, 
  Truck, 
  ClipboardList, 
  Users, 
  Calendar, 
  Lock, 
  Clock, 
  Info, 
  Server,
  Trash2,
  History,
  Play
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { 
  fetchFullSystemBackupData, 
  downloadFullSystemBackup, 
  restoreFullSystemBackup,
  getAutoBackupScheduleConfig,
  saveAutoBackupScheduleConfig,
  getBackupHistory,
  deleteBackupHistoryItem,
  clearAllBackupHistory,
  executeAutoScheduledBackup,
  DEFAULT_AUTO_BACKUP_CONFIG
} from '../services/dataService';
import { SystemBackupPayload, AutoBackupScheduleConfig, BackupHistoryItem } from '../types';

interface SystemBackupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SystemBackupModal: React.FC<SystemBackupModalProps> = ({ isOpen, onClose }) => {
  const { userProfile } = useAuth();
  const [activeTab, setActiveTab] = useState<'create' | 'automated' | 'restore'>('create');
  
  // Create backup states
  const [loadingStats, setLoadingStats] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportSuccessMsg, setExportSuccessMsg] = useState<string | null>(null);
  const [liveSnapshot, setLiveSnapshot] = useState<SystemBackupPayload | null>(null);

  // Automated schedule states
  const [scheduleConfig, setScheduleConfig] = useState<AutoBackupScheduleConfig>(DEFAULT_AUTO_BACKUP_CONFIG);
  const [savingConfig, setSavingConfig] = useState<boolean>(false);
  const [configSuccessMsg, setConfigSuccessMsg] = useState<string | null>(null);
  const [triggeringSchedule, setTriggeringSchedule] = useState<'daily' | 'monthly' | null>(null);
  const [scheduleAlertMsg, setScheduleAlertMsg] = useState<string | null>(null);
  const [backupHistory, setBackupHistory] = useState<BackupHistoryItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState<boolean>(false);

  // Restore states
  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  const [parsedPayload, setParsedPayload] = useState<SystemBackupPayload | null>(null);
  const [restoreError, setRestoreError] = useState<string | null>(null);
  const [confirmText, setConfirmText] = useState<string>('');
  const [isRestoring, setIsRestoring] = useState<boolean>(false);
  const [restoreResult, setRestoreResult] = useState<{ restoredCount: number; details: Record<string, number> } | null>(null);
  const [selectedModules, setSelectedModules] = useState<Record<string, boolean>>({
    inventory: true,
    damaged_inventory: true,
    products: true,
    outlets: true,
    dispatch_logs: true,
    drivers: true,
    batch_logs: true,
    users: false // unchecked by default to protect current login sessions
  });

  // Load preview data & schedules when opening
  useEffect(() => {
    if (isOpen) {
      loadSystemStats();
      loadScheduleConfigAndHistory();
      setExportSuccessMsg(null);
      setRestoreResult(null);
      setRestoreError(null);
      setConfigSuccessMsg(null);
      setScheduleAlertMsg(null);
      setConfirmText('');
      setRestoreFile(null);
      setParsedPayload(null);
    }
  }, [isOpen]);

  // Auto-dismiss notification messages after a timeout
  useEffect(() => {
    if (exportSuccessMsg) {
      const timer = setTimeout(() => setExportSuccessMsg(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [exportSuccessMsg]);

  useEffect(() => {
    if (configSuccessMsg) {
      const timer = setTimeout(() => setConfigSuccessMsg(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [configSuccessMsg]);

  useEffect(() => {
    if (scheduleAlertMsg) {
      const timer = setTimeout(() => setScheduleAlertMsg(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [scheduleAlertMsg]);

  useEffect(() => {
    if (restoreResult) {
      const timer = setTimeout(() => setRestoreResult(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [restoreResult]);

  useEffect(() => {
    if (restoreError) {
      const timer = setTimeout(() => setRestoreError(null), 6000);
      return () => clearTimeout(timer);
    }
  }, [restoreError]);

  const loadSystemStats = async () => {
    setLoadingStats(true);
    try {
      const data = await fetchFullSystemBackupData(userProfile);
      setLiveSnapshot(data);
    } catch (err) {
      console.error('Failed to load system stats:', err);
    } finally {
      setLoadingStats(false);
    }
  };

  const loadScheduleConfigAndHistory = async () => {
    setLoadingHistory(true);
    try {
      const [cfg, history] = await Promise.all([
        getAutoBackupScheduleConfig(),
        getBackupHistory()
      ]);
      setScheduleConfig(cfg);
      setBackupHistory(history);
    } catch (err) {
      console.error('Failed to load schedule or history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleDownloadFullBackup = async () => {
    setIsExporting(true);
    setExportSuccessMsg(null);
    try {
      const freshData = await fetchFullSystemBackupData(userProfile);
      setLiveSnapshot(freshData);
      const filename = downloadFullSystemBackup(freshData);
      setExportSuccessMsg(`Full system backup saved successfully: ${filename}`);
      // Refresh history
      const updatedHistory = await getBackupHistory();
      setBackupHistory(updatedHistory);
    } catch (err: any) {
      console.error('Export failed:', err);
      alert('Failed to generate full backup: ' + (err?.message || 'Unknown error'));
    } finally {
      setIsExporting(false);
    }
  };

  const handleSaveScheduleConfig = async () => {
    setSavingConfig(true);
    setConfigSuccessMsg(null);
    try {
      await saveAutoBackupScheduleConfig(scheduleConfig);
      setConfigSuccessMsg('Automated backup schedule configuration saved successfully!');
      setTimeout(() => setConfigSuccessMsg(null), 4000);
    } catch (err: any) {
      alert('Failed to save schedule settings: ' + (err?.message || 'Unknown error'));
    } finally {
      setSavingConfig(false);
    }
  };

  const handleTriggerScheduledNow = async (type: 'daily' | 'monthly') => {
    setTriggeringSchedule(type);
    setScheduleAlertMsg(null);
    try {
      const res = await executeAutoScheduledBackup(type, userProfile, { autoDownloadOverride: scheduleConfig.autoDownload });
      setScheduleAlertMsg(`${type === 'daily' ? 'Daily' : 'Monthly'} automated backup executed successfully! Created ${res.filename} (${res.item.itemCount} records).`);
      // Refresh history and config timestamps
      const [updatedCfg, updatedHistory] = await Promise.all([
        getAutoBackupScheduleConfig(),
        getBackupHistory()
      ]);
      setScheduleConfig(updatedCfg);
      setBackupHistory(updatedHistory);
      // Also refresh live stats
      await loadSystemStats();
    } catch (err: any) {
      console.error('Scheduled backup execution failed:', err);
      alert(`Failed to trigger ${type} backup: ` + (err?.message || 'Unknown error'));
    } finally {
      setTriggeringSchedule(null);
    }
  };

  const handleDeleteHistoryItem = async (id: string) => {
    try {
      await deleteBackupHistoryItem(id);
      setBackupHistory(prev => prev.filter(item => item.id !== id));
    } catch (err) {
      console.error('Failed to delete history item:', err);
    }
  };

  const handleClearHistory = async () => {
    if (!window.confirm('Are you sure you want to clear all backup history records? (Saved file backups on your computer will not be deleted).')) {
      return;
    }
    try {
      await clearAllBackupHistory();
      setBackupHistory([]);
    } catch (err) {
      console.error('Failed to clear history:', err);
    }
  };

  const handleLoadHistoryIntoRestore = (item: BackupHistoryItem) => {
    if (item.payload) {
      setParsedPayload(item.payload);
      setActiveTab('restore');
      setRestoreError(null);
      setRestoreResult(null);
      setConfirmText('');
    } else {
      alert('This backup index does not have a cached payload in memory. Please select the downloaded .JSON file from your computer using the file selector in the Restore tab.');
      setActiveTab('restore');
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setRestoreError(null);
    setParsedPayload(null);
    setRestoreResult(null);
    const file = e.target.files?.[0];
    if (!file) return;

    setRestoreFile(file);
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const json = JSON.parse(text) as SystemBackupPayload;
        if (!json || !json.data || !json.summary) {
          throw new Error('File does not appear to be a valid Barista System Backup.');
        }
        setParsedPayload(json);
      } catch (err: any) {
        setRestoreError('Failed to parse backup file: ' + (err?.message || 'Invalid JSON'));
        setParsedPayload(null);
      }
    };
    reader.readAsText(file);
  };

  const handleExecuteRestore = async () => {
    if (!parsedPayload) return;
    if (confirmText.trim().toUpperCase() !== 'RESTORE') {
      alert('Please type "RESTORE" to confirm this operation.');
      return;
    }

    const modulesToRestore = Object.keys(selectedModules).filter(k => selectedModules[k]);
    if (modulesToRestore.length === 0) {
      alert('Please select at least one module to restore.');
      return;
    }

    setIsRestoring(true);
    setRestoreError(null);
    try {
      const res = await restoreFullSystemBackup(parsedPayload, {
        modulesToRestore,
        operatorUsername: userProfile?.username || 'admin'
      });
      setRestoreResult(res);
      await loadSystemStats();
    } catch (err: any) {
      console.error('Restore error:', err);
      setRestoreError(err?.message || 'An error occurred during restoration.');
    } finally {
      setIsRestoring(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="bg-[#181311] border border-[#3A2A23] rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-[#241713] via-[#1D1412] to-[#181311] px-5 py-4 border-b border-[#3A2A23] flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-[#ED5338]/15 border border-[#ED5338]/40 flex items-center justify-center text-[#ED5338] shadow-inner">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base sm:text-lg font-black text-white tracking-wide">
                  System Backup & Data Recovery
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#ED5338]/20 text-[#FF8570] border border-[#ED5338]/30 uppercase font-mono">
                  Doc BCL/REC/HACCP/32
                </span>
              </div>
              <p className="text-xs text-stone-400">
                Authoritative full-system archive, automated daily & monthly schedules, and disaster recovery
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-stone-400 hover:text-white hover:bg-[#251B17] rounded-xl border border-[#3A2A23] transition cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-[#2C211D] bg-[#140F0D] px-5 pt-2 gap-1 overflow-x-auto">
          <button
            onClick={() => setActiveTab('create')}
            className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition border-t border-x flex items-center space-x-2 cursor-pointer shrink-0 ${
              activeTab === 'create'
                ? 'bg-[#181311] text-[#ED5338] border-[#3A2A23] border-b-transparent'
                : 'text-stone-400 border-transparent hover:text-stone-200'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            <span>Create Full Backup</span>
          </button>

          <button
            onClick={() => setActiveTab('automated')}
            className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition border-t border-x flex items-center space-x-2 cursor-pointer shrink-0 ${
              activeTab === 'automated'
                ? 'bg-[#181311] text-[#ED5338] border-[#3A2A23] border-b-transparent'
                : 'text-stone-400 border-transparent hover:text-stone-200'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Automated Backup (Daily & Monthly)</span>
          </button>

          <button
            onClick={() => setActiveTab('restore')}
            className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition border-t border-x flex items-center space-x-2 cursor-pointer shrink-0 ${
              activeTab === 'restore'
                ? 'bg-[#181311] text-[#ED5338] border-[#3A2A23] border-b-transparent'
                : 'text-stone-400 border-transparent hover:text-stone-200'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Restore & Disaster Recovery</span>
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-5 overflow-y-auto flex-1 space-y-5 text-stone-200">

          {/* TAB 1: CREATE FULL BACKUP */}
          {activeTab === 'create' && (
            <div className="space-y-5 animate-in fade-in duration-150">
              {/* Top Banner / Live Database Status */}
              <div className="bg-[#1F1714] border border-[#3E2C24] rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-start space-x-3">
                  <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                    <Server className="w-4 h-4 animate-pulse" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-bold text-white uppercase tracking-wider">
                        Live Database State
                      </span>
                      <span className="inline-flex items-center space-x-1 px-2 py-0.2 rounded-full bg-emerald-500/15 text-emerald-400 text-[10px] font-mono border border-emerald-500/30">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                        <span>Online & Synchronized</span>
                      </span>
                    </div>
                    <p className="text-[11px] text-stone-400 mt-0.5">
                      Backs up all 8 Firestore collections, audit trails, and system configuration in one complete JSON package.
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2 shrink-0">
                  <button
                    onClick={loadSystemStats}
                    disabled={loadingStats}
                    className="p-2 text-stone-300 hover:text-white bg-[#281D18] hover:bg-[#34241F] rounded-lg border border-[#483329] transition text-xs flex items-center space-x-1 cursor-pointer"
                    title="Refresh Live Record Counts"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loadingStats ? 'animate-spin text-[#ED5338]' : ''}`} />
                    <span className="text-[11px]">Refresh Counts</span>
                  </button>

                  <button
                    onClick={handleDownloadFullBackup}
                    disabled={isExporting}
                    className="px-4 py-2 bg-gradient-to-r from-[#ED5338] to-[#D94126] hover:from-[#F0634B] hover:to-[#E0492E] text-white text-xs font-black rounded-lg shadow-lg shadow-[#ED5338]/20 flex items-center space-x-2 transition cursor-pointer active:scale-95 disabled:opacity-50"
                  >
                    {isExporting ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Generating Snapshot...</span>
                      </>
                    ) : (
                      <>
                        <Download className="w-3.5 h-3.5" />
                        <span>Download Full System Backup (.JSON)</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {exportSuccessMsg && (
                <div className="bg-emerald-950/40 border border-emerald-500/40 rounded-xl p-3 flex items-center justify-between space-x-2 text-emerald-300 text-xs animate-in fade-in duration-200">
                  <div className="flex items-center space-x-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>{exportSuccessMsg}</span>
                  </div>
                  <button 
                    onClick={() => setExportSuccessMsg(null)}
                    className="text-emerald-400 hover:text-emerald-200 p-0.5 rounded cursor-pointer transition"
                    title="Dismiss notification"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Live Collections Record Summary Grid */}
              <div>
                <h4 className="text-xs font-bold text-stone-300 uppercase tracking-wider mb-2.5 flex items-center space-x-1.5">
                  <HardDrive className="w-3.5 h-3.5 text-[#ED5338]" />
                  <span>Current System Modules & Record Counts</span>
                </h4>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div className="bg-[#1C1513] border border-[#342621] rounded-xl p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-stone-400">Inventory Batches</span>
                      <Package className="w-4 h-4 text-amber-500" />
                    </div>
                    <p className="text-xl font-black text-white mt-1">
                      {liveSnapshot?.summary.inventoryBatchesCount ?? '—'}
                    </p>
                    <span className="text-[10px] text-stone-500">Live active & archived batches</span>
                  </div>

                  <div className="bg-[#1C1513] border border-[#342621] rounded-xl p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-stone-400">Damaged Stock</span>
                      <AlertTriangle className="w-4 h-4 text-rose-500" />
                    </div>
                    <p className="text-xl font-black text-white mt-1">
                      {liveSnapshot?.summary.damagedItemsCount ?? '—'}
                    </p>
                    <span className="text-[10px] text-stone-500">Quarantine & damaged items</span>
                  </div>

                  <div className="bg-[#1C1513] border border-[#342621] rounded-xl p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-stone-400">Products Catalog</span>
                      <UtensilsCrossed className="w-4 h-4 text-orange-400" />
                    </div>
                    <p className="text-xl font-black text-white mt-1">
                      {liveSnapshot?.summary.productsCount ?? '—'}
                    </p>
                    <span className="text-[10px] text-stone-500">SKUs & temperature limits</span>
                  </div>

                  <div className="bg-[#1C1513] border border-[#342621] rounded-xl p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-stone-400">Retail Outlets</span>
                      <Store className="w-4 h-4 text-blue-400" />
                    </div>
                    <p className="text-xl font-black text-white mt-1">
                      {liveSnapshot?.summary.outletsCount ?? '—'}
                    </p>
                    <span className="text-[10px] text-stone-500">Barista branch stores</span>
                  </div>

                  <div className="bg-[#1C1513] border border-[#342621] rounded-xl p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-stone-400">HACCP Dispatch Logs</span>
                      <ClipboardList className="w-4 h-4 text-emerald-400" />
                    </div>
                    <p className="text-xl font-black text-white mt-1">
                      {liveSnapshot?.summary.dispatchLogsCount ?? '—'}
                    </p>
                    <span className="text-[10px] text-stone-500">Official dispatch sheets</span>
                  </div>

                  <div className="bg-[#1C1513] border border-[#342621] rounded-xl p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-stone-400">Drivers & Fleet</span>
                      <Truck className="w-4 h-4 text-cyan-400" />
                    </div>
                    <p className="text-xl font-black text-white mt-1">
                      {liveSnapshot?.summary.driversCount ?? '—'}
                    </p>
                    <span className="text-[10px] text-stone-500">Refrigerated vehicles</span>
                  </div>

                  <div className="bg-[#1C1513] border border-[#342621] rounded-xl p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-stone-400">Audit & Movement Logs</span>
                      <Calendar className="w-4 h-4 text-violet-400" />
                    </div>
                    <p className="text-xl font-black text-white mt-1">
                      {liveSnapshot?.summary.batchLogsCount ?? '—'}
                    </p>
                    <span className="text-[10px] text-stone-500">Stock change history</span>
                  </div>

                  <div className="bg-[#1C1513] border border-[#342621] rounded-xl p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-stone-400">System Users</span>
                      <Users className="w-4 h-4 text-fuchsia-400" />
                    </div>
                    <p className="text-xl font-black text-white mt-1">
                      {liveSnapshot?.summary.usersCount ?? '—'}
                    </p>
                    <span className="text-[10px] text-stone-500">Staff roles & permissions</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: AUTOMATED BACKUP (DAILY & MONTHLY) */}
          {activeTab === 'automated' && (
            <div className="space-y-5 animate-in fade-in duration-150">
              {configSuccessMsg && (
                <div className="bg-emerald-950/40 border border-emerald-500/40 rounded-xl p-3 flex items-center justify-between space-x-2 text-emerald-300 text-xs animate-in fade-in duration-200">
                  <div className="flex items-center space-x-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>{configSuccessMsg}</span>
                  </div>
                  <button 
                    onClick={() => setConfigSuccessMsg(null)}
                    className="text-emerald-400 hover:text-emerald-200 p-0.5 rounded cursor-pointer transition"
                    title="Dismiss notification"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {scheduleAlertMsg && (
                <div className="bg-blue-950/40 border border-blue-500/40 rounded-xl p-3 flex items-center justify-between space-x-2 text-blue-300 text-xs animate-in fade-in duration-200">
                  <div className="flex items-center space-x-2">
                    <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0" />
                    <span>{scheduleAlertMsg}</span>
                  </div>
                  <button 
                    onClick={() => setScheduleAlertMsg(null)}
                    className="text-blue-400 hover:text-blue-200 p-0.5 rounded cursor-pointer transition"
                    title="Dismiss notification"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Schedule Configuration Cards (Daily & Monthly) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                {/* 1. DAILY AUTOMATIC BACKUP */}
                <div className="bg-[#1B1412] border border-[#3E2C24] rounded-xl p-4 flex flex-col justify-between space-y-4">
                  <div>
                    <div className="flex items-center justify-between pb-3 border-b border-[#2D1F1A]">
                      <div className="flex items-center space-x-2.5">
                        <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
                          <Clock className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                            Daily Automatic Backup
                          </h4>
                          <span className="text-[10px] text-stone-400">End-of-day operational snapshot</span>
                        </div>
                      </div>

                      {/* Toggle */}
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={scheduleConfig.dailyEnabled}
                          onChange={(e) => setScheduleConfig({ ...scheduleConfig, dailyEnabled: e.target.checked })}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-stone-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#ED5338]"></div>
                      </label>
                    </div>

                    <div className="space-y-3 mt-3 text-xs">
                      <div>
                        <label className="text-[11px] text-stone-300 block mb-1 font-medium">
                          Execution Time (Daily):
                        </label>
                        <select
                          value={scheduleConfig.dailyTime}
                          onChange={(e) => setScheduleConfig({ ...scheduleConfig, dailyTime: e.target.value })}
                          disabled={!scheduleConfig.dailyEnabled}
                          className="w-full bg-[#120D0C] border border-[#35251F] rounded-lg px-3 py-1.5 text-xs text-white disabled:opacity-50 focus:outline-none focus:border-[#ED5338]"
                        >
                          <option value="23:59">23:59 (11:59 PM - End of Day Closing)</option>
                          <option value="00:00">00:00 (12:00 AM - Midnight Rollover)</option>
                          <option value="18:00">18:00 (06:00 PM - Afternoon Dispatch Wrap)</option>
                          <option value="08:00">08:00 (08:00 AM - Morning Kitchen Opening)</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-[11px] text-stone-300 block mb-1 font-medium">
                          Snapshot Retention Policy:
                        </label>
                        <select
                          value={scheduleConfig.dailyRetentionDays}
                          onChange={(e) => setScheduleConfig({ ...scheduleConfig, dailyRetentionDays: Number(e.target.value) })}
                          disabled={!scheduleConfig.dailyEnabled}
                          className="w-full bg-[#120D0C] border border-[#35251F] rounded-lg px-3 py-1.5 text-xs text-white disabled:opacity-50 focus:outline-none focus:border-[#ED5338]"
                        >
                          <option value={7}>Keep last 7 days of daily snapshots</option>
                          <option value={14}>Keep last 14 days of daily snapshots (Recommended)</option>
                          <option value={30}>Keep last 30 days of daily snapshots</option>
                        </select>
                      </div>

                      <div className="pt-2 border-t border-[#2A1E19] text-[11px] text-stone-400 space-y-1">
                        <div className="flex items-center justify-between">
                          <span>Status:</span>
                          <span className={`font-semibold ${scheduleConfig.dailyEnabled ? 'text-emerald-400' : 'text-stone-500'}`}>
                            {scheduleConfig.dailyEnabled ? 'Active & Scheduled' : 'Disabled'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Last Daily Run:</span>
                          <span className="font-mono text-stone-300">
                            {scheduleConfig.lastDailyRun ? new Date(scheduleConfig.lastDailyRun).toLocaleString() : 'Not run yet'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleTriggerScheduledNow('daily')}
                    disabled={triggeringSchedule !== null}
                    className="w-full py-2 bg-[#251B17] hover:bg-[#34241F] text-amber-300 border border-amber-600/40 rounded-lg text-xs font-bold flex items-center justify-center space-x-1.5 transition cursor-pointer disabled:opacity-50"
                  >
                    {triggeringSchedule === 'daily' ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Running Daily Backup...</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-3.5 h-3.5" />
                        <span>Run Daily Backup Now</span>
                      </>
                    )}
                  </button>
                </div>

                {/* 2. MONTHLY AUTOMATIC ARCHIVE */}
                <div className="bg-[#1B1412] border border-[#3E2C24] rounded-xl p-4 flex flex-col justify-between space-y-4">
                  <div>
                    <div className="flex items-center justify-between pb-3 border-b border-[#2D1F1A]">
                      <div className="flex items-center space-x-2.5">
                        <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                          <Calendar className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                            Monthly Automatic Backup
                          </h4>
                          <span className="text-[10px] text-stone-400">Audit-ready monthly cycle archive</span>
                        </div>
                      </div>

                      {/* Toggle */}
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={scheduleConfig.monthlyEnabled}
                          onChange={(e) => setScheduleConfig({ ...scheduleConfig, monthlyEnabled: e.target.checked })}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-stone-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#ED5338]"></div>
                      </label>
                    </div>

                    <div className="space-y-3 mt-3 text-xs">
                      <div>
                        <label className="text-[11px] text-stone-300 block mb-1 font-medium">
                          Execution Schedule (Monthly):
                        </label>
                        <select
                          value={scheduleConfig.monthlyDay}
                          onChange={(e) => setScheduleConfig({ ...scheduleConfig, monthlyDay: e.target.value as any })}
                          disabled={!scheduleConfig.monthlyEnabled}
                          className="w-full bg-[#120D0C] border border-[#35251F] rounded-lg px-3 py-1.5 text-xs text-white disabled:opacity-50 focus:outline-none focus:border-[#ED5338]"
                        >
                          <option value="1st">1st of Month at 00:00 (Sync with Monthly Cycle Reset)</option>
                          <option value="last_day">Last Day of Month at 23:59 (Month-End Close)</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-[11px] text-stone-300 block mb-1 font-medium">
                          Monthly Retention Policy:
                        </label>
                        <select
                          value={scheduleConfig.monthlyRetentionMonths}
                          onChange={(e) => setScheduleConfig({ ...scheduleConfig, monthlyRetentionMonths: Number(e.target.value) })}
                          disabled={!scheduleConfig.monthlyEnabled}
                          className="w-full bg-[#120D0C] border border-[#35251F] rounded-lg px-3 py-1.5 text-xs text-white disabled:opacity-50 focus:outline-none focus:border-[#ED5338]"
                        >
                          <option value={6}>Keep last 6 monthly cycle archives</option>
                          <option value={12}>Keep last 12 monthly cycle archives (1 Full Year)</option>
                          <option value={24}>Keep last 24 monthly cycle archives (2 Years QA)</option>
                        </select>
                      </div>

                      <div className="pt-2 border-t border-[#2A1E19] text-[11px] text-stone-400 space-y-1">
                        <div className="flex items-center justify-between">
                          <span>Status:</span>
                          <span className={`font-semibold ${scheduleConfig.monthlyEnabled ? 'text-emerald-400' : 'text-stone-500'}`}>
                            {scheduleConfig.monthlyEnabled ? 'Active & Scheduled' : 'Disabled'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Last Monthly Run:</span>
                          <span className="font-mono text-stone-300">
                            {scheduleConfig.lastMonthlyRun ? new Date(scheduleConfig.lastMonthlyRun).toLocaleString() : 'Not run yet'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleTriggerScheduledNow('monthly')}
                    disabled={triggeringSchedule !== null}
                    className="w-full py-2 bg-[#251B17] hover:bg-[#34241F] text-emerald-300 border border-emerald-600/40 rounded-lg text-xs font-bold flex items-center justify-center space-x-1.5 transition cursor-pointer disabled:opacity-50"
                  >
                    {triggeringSchedule === 'monthly' ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Running Monthly Archive...</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-3.5 h-3.5" />
                        <span>Run Monthly Archive Now</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Delivery Preferences & Save Button */}
              <div className="bg-[#150F0D] border border-[#2D1F1A] rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1 text-xs">
                  <div className="flex flex-wrap items-center gap-4">
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={scheduleConfig.autoDownload}
                        onChange={(e) => setScheduleConfig({ ...scheduleConfig, autoDownload: e.target.checked })}
                        className="rounded accent-[#ED5338]"
                      />
                      <span className="text-stone-300">Auto-download .JSON file to local disk on schedule</span>
                    </label>

                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={scheduleConfig.notifyOnSuccess}
                        onChange={(e) => setScheduleConfig({ ...scheduleConfig, notifyOnSuccess: e.target.checked })}
                        className="rounded accent-[#ED5338]"
                      />
                      <span className="text-stone-300">Show success confirmation banner</span>
                    </label>
                  </div>
                  <p className="text-[11px] text-stone-500">
                    Snapshots are automatically archived into the In-App Backup History table below.
                  </p>
                </div>

                <button
                  onClick={handleSaveScheduleConfig}
                  disabled={savingConfig}
                  className="px-5 py-2 bg-[#ED5338] hover:bg-[#D94126] text-white text-xs font-bold rounded-lg transition shadow-md shadow-[#ED5338]/20 flex items-center justify-center space-x-1.5 cursor-pointer shrink-0 disabled:opacity-50"
                >
                  {savingConfig ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>Save Schedule Preferences</span>
                  )}
                </button>
              </div>

              {/* Backup History & Archive Registry */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <History className="w-4 h-4 text-[#ED5338]" />
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                      Automated Backup History & Archives ({backupHistory.length})
                    </h4>
                  </div>

                  {backupHistory.length > 0 && (
                    <button
                      onClick={handleClearHistory}
                      className="text-[11px] text-stone-400 hover:text-rose-400 flex items-center space-x-1 transition cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Clear History</span>
                    </button>
                  )}
                </div>

                {loadingHistory ? (
                  <div className="text-center py-6 text-stone-400 text-xs">
                    <RefreshCw className="w-4 h-4 animate-spin mx-auto mb-1 text-[#ED5338]" />
                    <span>Loading backup history...</span>
                  </div>
                ) : backupHistory.length === 0 ? (
                  <div className="bg-[#150F0D] border border-[#2D1F1A] rounded-xl p-6 text-center text-xs text-stone-400">
                    <History className="w-8 h-8 mx-auto mb-2 text-stone-600 opacity-60" />
                    <p className="font-medium text-stone-300">No automated backup archives generated yet</p>
                    <p className="text-[11px] text-stone-500 mt-1">
                      Click "Run Daily Backup Now" or "Run Monthly Archive Now" above to trigger an immediate snapshot, or wait for the scheduled time.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                    {backupHistory.map((item) => (
                      <div
                        key={item.id}
                        className="bg-[#1C1513] border border-[#34241E] hover:border-[#ED5338]/40 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition"
                      >
                        <div className="flex items-start space-x-3">
                          <span
                            className={`text-[9px] font-black uppercase px-2 py-0.5 rounded border mt-0.5 font-mono ${
                              item.type === 'daily'
                                ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                                : item.type === 'monthly'
                                ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                                : 'bg-blue-500/15 text-blue-400 border-blue-500/30'
                            }`}
                          >
                            {item.type}
                          </span>
                          <div>
                            <div className="flex items-center space-x-2">
                              <span className="text-xs font-bold text-white font-mono">
                                {item.filename}
                              </span>
                            </div>
                            <div className="flex flex-wrap items-center gap-3 text-[10px] text-stone-400 mt-0.5">
                              <span>{new Date(item.createdAt).toLocaleString()}</span>
                              <span>•</span>
                              <span className="text-stone-300 font-semibold">{item.itemCount} records</span>
                              <span>•</span>
                              <span className="text-[#ED5338] font-mono">{item.haccpDocNo}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2 self-end sm:self-auto shrink-0">
                          {item.payload && (
                            <button
                              onClick={() => {
                                const jsonStr = JSON.stringify(item.payload, null, 2);
                                const blob = new Blob([jsonStr], { type: 'application/json' });
                                const url = URL.createObjectURL(blob);
                                const link = document.createElement('a');
                                link.href = url;
                                link.setAttribute('download', item.filename);
                                document.body.appendChild(link);
                                link.click();
                                document.body.removeChild(link);
                                URL.revokeObjectURL(url);
                              }}
                              className="p-1.5 bg-[#251B17] hover:bg-[#34241F] text-stone-300 hover:text-white rounded-lg border border-[#3E2C24] transition text-xs flex items-center space-x-1 cursor-pointer"
                              title="Download JSON Snapshot"
                            >
                              <Download className="w-3.5 h-3.5" />
                              <span className="text-[11px] hidden md:inline">Download</span>
                            </button>
                          )}

                          <button
                            onClick={() => handleLoadHistoryIntoRestore(item)}
                            className="p-1.5 bg-[#251B17] hover:bg-[#34241F] text-stone-300 hover:text-emerald-400 rounded-lg border border-[#3E2C24] transition text-xs flex items-center space-x-1 cursor-pointer"
                            title="Restore from this Snapshot"
                          >
                            <Upload className="w-3.5 h-3.5" />
                            <span className="text-[11px] hidden md:inline">Restore</span>
                          </button>

                          <button
                            onClick={() => handleDeleteHistoryItem(item.id)}
                            className="p-1.5 text-stone-500 hover:text-rose-400 hover:bg-rose-950/20 rounded-lg transition cursor-pointer"
                            title="Delete Archive Entry"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: RESTORE & DISASTER RECOVERY */}
          {activeTab === 'restore' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              {/* Upload Section */}
              <div className="border-2 border-dashed border-[#3A2A23] hover:border-[#ED5338]/50 rounded-xl p-6 text-center bg-[#15100E] transition">
                <input
                  type="file"
                  id="backup-file-input"
                  accept=".json,application/json"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <label 
                  htmlFor="backup-file-input"
                  className="cursor-pointer flex flex-col items-center space-y-2"
                >
                  <div className="w-12 h-12 rounded-xl bg-[#251B17] border border-[#3E2C24] flex items-center justify-center text-[#ED5338]">
                    <Upload className="w-6 h-6" />
                  </div>
                  <span className="text-xs font-bold text-white">
                    {restoreFile ? restoreFile.name : (parsedPayload ? 'Backup file loaded and verified' : 'Choose a Barista System Backup (.json) file')}
                  </span>
                  <span className="text-[11px] text-stone-400">
                    Click to select from your computer
                  </span>
                </label>
              </div>

              {restoreError && (
                <div className="bg-rose-950/40 border border-rose-500/40 rounded-xl p-3 flex items-center justify-between space-x-2 text-rose-300 text-xs animate-in fade-in duration-200">
                  <div className="flex items-center space-x-2">
                    <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                    <span>{restoreError}</span>
                  </div>
                  <button 
                    onClick={() => setRestoreError(null)}
                    className="text-rose-400 hover:text-rose-200 p-0.5 rounded cursor-pointer transition"
                    title="Dismiss error"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {parsedPayload && (
                <div className="bg-[#1C1513] border border-[#382822] rounded-xl p-4 space-y-4">
                  <div className="flex items-center justify-between border-b border-[#2C1F1A] pb-3">
                    <div>
                      <h4 className="text-xs font-bold text-white flex items-center space-x-1.5">
                        <FileJson className="w-4 h-4 text-[#ED5338]" />
                        <span>Backup File Inspection</span>
                      </h4>
                      <p className="text-[11px] text-stone-400">
                        Generated on {new Date(parsedPayload.generatedAt).toLocaleString()} by {parsedPayload.generatedBy.displayName || parsedPayload.generatedBy.username}
                      </p>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#2D1F1A] text-[#ED5338] border border-[#442D25]">
                      Version {parsedPayload.version}
                    </span>
                  </div>

                  {/* Modules selection */}
                  <div>
                    <span className="text-[11px] font-bold text-stone-300 block mb-2">
                      Select Modules to Restore:
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                      {[
                        { key: 'inventory', label: 'Batches', count: parsedPayload.summary.inventoryBatchesCount },
                        { key: 'damaged_inventory', label: 'Damaged Stock', count: parsedPayload.summary.damagedItemsCount },
                        { key: 'products', label: 'Products', count: parsedPayload.summary.productsCount },
                        { key: 'outlets', label: 'Outlets', count: parsedPayload.summary.outletsCount },
                        { key: 'dispatch_logs', label: 'Dispatches', count: parsedPayload.summary.dispatchLogsCount },
                        { key: 'drivers', label: 'Drivers', count: parsedPayload.summary.driversCount },
                        { key: 'batch_logs', label: 'Audit Logs', count: parsedPayload.summary.batchLogsCount },
                        { key: 'users', label: 'Users', count: parsedPayload.summary.usersCount },
                      ].map(item => (
                        <label 
                          key={item.key}
                          className={`flex items-center space-x-2 p-2 rounded-lg border transition cursor-pointer ${
                            selectedModules[item.key]
                              ? 'bg-[#2B1E19] border-[#ED5338]/40 text-white'
                              : 'bg-[#15100E] border-[#2A1E19] text-stone-400'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={!!selectedModules[item.key]}
                            onChange={(e) => setSelectedModules({ ...selectedModules, [item.key]: e.target.checked })}
                            className="rounded accent-[#ED5338]"
                          />
                          <span className="text-[11px] font-medium">{item.label} ({item.count})</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Confirmation text */}
                  <div className="pt-2 border-t border-[#2C1F1A] space-y-2">
                    <label className="text-[11px] text-stone-300 block font-medium">
                      Type <span className="font-mono font-bold text-[#ED5338]">RESTORE</span> to authorize database write:
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={confirmText}
                        onChange={(e) => setConfirmText(e.target.value)}
                        placeholder="RESTORE"
                        className="bg-[#120D0C] border border-[#3A2A23] rounded-lg px-3 py-2 text-xs text-white font-mono tracking-wider focus:outline-none focus:border-[#ED5338] flex-1"
                      />
                      <button
                        onClick={handleExecuteRestore}
                        disabled={isRestoring || confirmText.trim().toUpperCase() !== 'RESTORE'}
                        className="px-4 py-2 bg-[#ED5338] hover:bg-[#D94126] text-white text-xs font-bold rounded-lg transition disabled:opacity-40 cursor-pointer flex items-center space-x-1.5"
                      >
                        {isRestoring ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            <span>Restoring...</span>
                          </>
                        ) : (
                          <>
                            <ShieldCheck className="w-3.5 h-3.5" />
                            <span>Execute Restore</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {restoreResult && (
                <div className="bg-emerald-950/40 border border-emerald-500/40 rounded-xl p-4 text-emerald-200 text-xs space-y-2 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 font-bold text-emerald-400">
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      <span>System Successfully Restored!</span>
                    </div>
                    <button 
                      onClick={() => setRestoreResult(null)}
                      className="text-emerald-400 hover:text-emerald-200 p-0.5 rounded cursor-pointer transition"
                      title="Dismiss notification"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <p className="text-[11px]">
                    Total {restoreResult.restoredCount} records were written to live Firestore collections across selected modules.
                  </p>
                </div>
              )}
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="bg-[#140F0D] px-5 py-3 border-t border-[#2C211D] flex items-center justify-end text-xs">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-[#251B17] hover:bg-[#34241F] text-stone-300 hover:text-white rounded-lg border border-[#3E2C24] transition cursor-pointer font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
