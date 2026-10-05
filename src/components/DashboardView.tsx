import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useModal } from '../context/ModalDialogContext';
import { 
  Package, 
  FileText, 
  Store, 
  Users, 
  BarChart3, 
  ThermometerSnowflake, 
  AlertTriangle, 
  Clock, 
  ArrowRight, 
  UtensilsCrossed, 
  RotateCcw, 
  Calendar,
  CheckCircle2,
  Trash2,
  ShieldCheck,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { InventoryBatch, DispatchLog, Outlet, Product, MonthlyDispatchCycle } from '../types';
import { 
  subscribeMonthlyCycle, 
  checkAndApplyAutomaticMonthlyReset,
  getDefaultMonthlyCycle
} from '../services/dataService';
import { getDispatchReportNo, getDispatchDocumentName } from '../utils/dispatchNumberUtils';

interface DashboardViewProps {
  batches: InventoryBatch[];
  dispatchLogs: DispatchLog[];
  outlets: Outlet[];
  products?: Product[];
  onNavigate: (tab: string) => void;
  dispatchCycle?: MonthlyDispatchCycle;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  batches,
  dispatchLogs,
  outlets,
  products,
  onNavigate,
  dispatchCycle: propDispatchCycle,
}) => {
  const { userProfile, role, hasAccess } = useAuth();
  const [dispatchFilterMode, setDispatchFilterMode] = useState<'monthly' | 'all'>('monthly');
  const [cycleState, setCycleState] = useState<MonthlyDispatchCycle>(
    propDispatchCycle || getDefaultMonthlyCycle()
  );

  // Subscribe to real-time cycle updates in Firestore & localStorage
  useEffect(() => {
    checkAndApplyAutomaticMonthlyReset().then((current) => {
      setCycleState(current);
    });

    const unsub = subscribeMonthlyCycle((cycle) => {
      if (cycle) {
        setCycleState(cycle);
      }
    });

    return () => {
      unsub();
    };
  }, []);

  // Update when prop changes
  useEffect(() => {
    if (propDispatchCycle) {
      setCycleState(propDispatchCycle);
    }
  }, [propDispatchCycle]);

  // Live timer for automatic cycle rollover countdown & check (updates every 1s in real-time)
  const [now, setNow] = useState<Date>(new Date());
  useEffect(() => {
    const timer = setInterval(() => {
      const current = new Date();
      setNow(current);

      // Check if current date has crossed the 1st of the month at 12:00 AM
      const currentYear = current.getFullYear();
      const currentMonthIndex = current.getMonth();
      const firstOfThisMonth = new Date(currentYear, currentMonthIndex, 1, 0, 0, 0, 0);

      if (cycleState?.lastResetAt) {
        const lastReset = new Date(cycleState.lastResetAt);
        if (current.getTime() >= firstOfThisMonth.getTime() && lastReset.getTime() < firstOfThisMonth.getTime()) {
          checkAndApplyAutomaticMonthlyReset().then(setCycleState);
        }
      }
    }, 1000); // 1-second real-time live tick

    return () => clearInterval(timer);
  }, [cycleState]);

  const totalStockUnits = batches.reduce((sum, b) => sum + (b.quantity || 0), 0);
  const lowStockCount = batches.filter(b => b.quantity <= 15).length;
  
  const today = now.toISOString().split('T')[0];

  // Current Month calculation (from 1st of month 12:00 AM to end of month)
  const currentYear = now.getFullYear();
  const currentMonthIndex = now.getMonth(); // 0-indexed
  const currentMonthPrefix = `${currentYear}-${String(currentMonthIndex + 1).padStart(2, '0')}`;
  const currentMonthName = now.toLocaleString('default', { month: 'long', year: 'numeric' });

  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthPrefix);

  const formatMonthLabel = (mStr: string) => {
    if (!mStr || mStr === 'all') return 'All Historical Records';
    try {
      const [year, month] = mStr.split('-');
      const date = new Date(parseInt(year, 10), parseInt(month, 10) - 1, 1);
      return date.toLocaleString('default', { month: 'long', year: 'numeric' });
    } catch {
      return mStr;
    }
  };

  const START_MONTH = '2026-09';

  const goToPreviousMonth = () => {
    if (selectedMonth <= START_MONTH) return;
    const [year, month] = selectedMonth.split('-').map(Number);
    const d = new Date(year, month - 2, 1);
    const prevStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (prevStr < START_MONTH) {
      setSelectedMonth(START_MONTH);
      return;
    }
    setSelectedMonth(prevStr);
  };

  const goToNextMonth = () => {
    if (selectedMonth >= currentMonthPrefix) return;
    const [year, month] = selectedMonth.split('-').map(Number);
    const d = new Date(year, month, 1);
    const nextStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (nextStr > currentMonthPrefix) return;
    setSelectedMonth(nextStr);
  };

  // 1st of the CURRENT month at 12:00 A.M.
  const firstOfCurrentMonth = useMemo(() => {
    return new Date(currentYear, currentMonthIndex, 1, 0, 0, 0, 0);
  }, [currentYear, currentMonthIndex]);

  // Next month 1st at 12:00 A.M.
  const nextMonthResetDate = useMemo(() => {
    return new Date(currentYear, currentMonthIndex + 1, 1, 0, 0, 0, 0);
  }, [currentYear, currentMonthIndex]);

  // Real-time automatic reset countdown format:
  // e.g. "5 days 5 hours left", or if lower than days: "23 hours 3 minutes left", or if lower than hours: "X minutes left"
  const timeLeftForReset = useMemo(() => {
    const msUntilReset = Math.max(0, nextMonthResetDate.getTime() - now.getTime());
    const totalMinutes = Math.floor(msUntilReset / (1000 * 60));
    const totalHours = Math.floor(totalMinutes / 60);
    const days = Math.floor(totalHours / 24);
    const hours = totalHours % 24;
    const minutes = totalMinutes % 60;

    if (days > 0) {
      const dUnit = days === 1 ? 'day' : 'days';
      const hUnit = hours === 1 ? 'hour' : 'hours';
      return `${days} ${dUnit} ${hours} ${hUnit} left`;
    }

    if (totalHours > 0) {
      const hUnit = totalHours === 1 ? 'hour' : 'hours';
      const mUnit = minutes === 1 ? 'minute' : 'minutes';
      return `${totalHours} ${hUnit} ${minutes} ${mUnit} left`;
    }

    const mUnit = minutes === 1 ? 'minute' : 'minutes';
    return `${Math.max(1, minutes)} ${mUnit} left`;
  }, [nextMonthResetDate, now]);

  const activeProductsCount = useMemo(() => {
    return (products || []).filter(p => p.active !== false).length;
  }, [products]);

  // Cycle cutoff point: whichever is later between the 1st of this month @ 12:00 AM and any manual reset in this month
  const cycleCutoffTime = useMemo(() => {
    const firstTime = firstOfCurrentMonth.getTime();
    if (!cycleState?.lastResetAt) return firstTime;
    const resetTime = new Date(cycleState.lastResetAt).getTime();
    // Only accept lastResetAt if it is within or after the start of this month
    if (resetTime >= firstTime) {
      return resetTime;
    }
    return firstTime;
  }, [firstOfCurrentMonth, cycleState?.lastResetAt]);

  // Filter logs for the ACTIVE/SELECTED MONTHLY CYCLE:
  const monthlyDispatches = useMemo(() => {
    return dispatchLogs.filter((d) => {
      // Exclude soft-deleted or superseded records
      if (d.deleted || (d as any).isDeleted || d.status === 'deleted') return false;
      if (d.supersededBy) return false;

      const dMonth = (d.date || d.createdAt || '').substring(0, 7);
      if (selectedMonth && dMonth !== selectedMonth) return false;

      // If viewing the current calendar month, also respect cycle reset cutoff if applicable
      if (selectedMonth === currentMonthPrefix && cycleCutoffTime) {
        const itemTime = new Date(d.createdAt || d.date).getTime();
        if (!isNaN(itemTime) && itemTime < cycleCutoffTime) {
          return false;
        }
      }

      return true;
    });
  }, [dispatchLogs, selectedMonth, currentMonthPrefix, cycleCutoffTime]);

  const monthlyUnitsDispatched = useMemo(() => {
    return monthlyDispatches.reduce((acc, log) => {
      return acc + log.items.reduce((s, i) => s + (i.quantity || 0), 0);
    }, 0);
  }, [monthlyDispatches]);

  const monthlyOutletsServed = useMemo(() => {
    const outletSet = new Set<string>();
    monthlyDispatches.forEach(d => {
      d.outletNames.forEach(name => outletSet.add(name));
    });
    return outletSet.size;
  }, [monthlyDispatches]);

  const monthlyProductsDispatched = useMemo(() => {
    const prodSet = new Set<string>();
    monthlyDispatches.forEach(d => {
      d.items.forEach(i => {
        if (i.quantity > 0) prodSet.add(i.productName);
      });
    });
    return prodSet.size;
  }, [monthlyDispatches]);

  const todayDispatches = useMemo(() => {
    return monthlyDispatches.filter(d => d.date === today || d.createdAt.startsWith(today)).length;
  }, [monthlyDispatches, today]);

  const expiringSoonCount = batches.filter(b => {
    if (!b.useByDate) return false;
    const diffDays = (new Date(b.useByDate).getTime() - new Date().getTime()) / (1000 * 3600 * 24);
    return diffDays <= 3;
  }).length;

  const quickNav = [
    {
      id: 'inventory',
      title: 'Inventory Management',
      desc: 'Batch tracking, quantities, prod & future expiration dates, dispatch temp (<=5 C), and CSV export.',
      icon: Package,
      badge: `${batches.length} Batches`,
      color: 'from-[#ED5338] to-[#B02812]',
      visible: hasAccess('inventory', 'view')
    },
    {
      id: 'forms',
      title: 'Dispatch Forms (BCL/REC/HACCP/32)',
      desc: 'Issue dispatches with multi-outlet selection, auto-time, FIFO batches, real-time inventory deduction & driver logs.',
      icon: FileText,
      badge: 'HACCP Standard',
      color: 'from-[#3E1812] to-[#200B07]',
      visible: hasAccess('forms', 'view')
    },
    {
      id: 'outlets',
      title: 'Retail Outlets',
      desc: 'Manage Barista branch locations, outlet IDs, contacts, and delivery destinations.',
      icon: Store,
      badge: `${outlets.length} Branches`,
      color: 'from-[#2D201C] to-[#1A1210]',
      visible: hasAccess('outlets', 'view')
    },
    {
      id: 'products',
      title: 'Products Master Catalog',
      desc: 'Master product catalog with system-generated IDs (PRD-XX), categories, and cold-chain dispatch temperatures.',
      icon: UtensilsCrossed,
      badge: `${(products || []).length} Products`,
      color: 'from-[#ED5338] to-[#99220E]',
      visible: hasAccess('products', 'view')
    },
    {
      id: 'users',
      title: 'Users & Access Control',
      desc: 'Create users with ID codes, assign roles (Admin, Editor, Driver, Viewer), and manage granular module visibility.',
      icon: Users,
      badge: 'User Settings',
      color: 'from-[#3E1812] to-[#1C0A06]',
      visible: hasAccess('users', 'view')
    },
    {
      id: 'reports',
      title: 'Reports & Audit Log',
      desc: 'View submitted dispatch logs, export archives, and print official QA compliance records.',
      icon: BarChart3,
      badge: 'QA Compliance',
      color: 'from-[#D84228] to-[#781807]',
      visible: hasAccess('reports', 'view')
    }
  ];

  return (
    <div className="space-y-6">
      {/* Personalized Welcome & Account Profile Card */}
      <div className="bg-gradient-to-r from-[#171311] via-[#1E1714] to-[#171311] border border-[#2E221E] rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-80 h-full bg-[#ED5338]/5 blur-2xl pointer-events-none" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="flex items-start space-x-4">
            <div className="w-16 h-16 rounded-2xl bg-[#ED5338] flex items-center justify-center text-white font-serif font-black text-2xl shadow-lg shrink-0">
              {userProfile?.displayName ? userProfile.displayName.charAt(0).toUpperCase() : 'B'}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-xl sm:text-2xl font-bold text-white">
                  Welcome, {userProfile?.displayName || userProfile?.email}!
                </h2>
                {role === 'admin' && (
                  <span className="px-2 py-0.5 text-xs font-bold rounded border uppercase bg-[#ED5338]/20 text-[#FFA594] border-[#ED5338]/40">
                    Admin
                  </span>
                )}
              </div>
              <p className="text-xs text-stone-400 mt-1">
                {userProfile?.designation || 'Central Kitchen Staff'} - {userProfile?.department || 'Quality Assurance & Kitchen Logistics'}
              </p>
              <div className="flex flex-wrap items-center gap-3 mt-3 text-xs text-stone-300">
                <span className="inline-flex items-center space-x-1 bg-[#1A1412] px-2.5 py-1 rounded-md border border-[#382B25] font-mono">
                  <span className="text-stone-400">User ID:</span>
                  <span className="text-[#FFA594] font-semibold">{userProfile?.userIdCode || 'USR-AUTH'}</span>
                </span>
                <span className="inline-flex items-center space-x-1 bg-[#1A1412] px-2.5 py-1 rounded-md border border-[#382B25]">
                  <span className="text-stone-400">Email:</span>
                  <span>{userProfile?.email}</span>
                </span>
                <span className="inline-flex items-center space-x-1 bg-[#1A1412] px-2.5 py-1 rounded-md border border-[#382B25]">
                  <ThermometerSnowflake className="w-3.5 h-3.5 text-[#ED5338]" />
                  <span>OPRP-2 Compliance: Active</span>
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 shrink-0">
            {hasAccess('forms', 'view') && (
              <button
                onClick={() => onNavigate('forms')}
                className="px-4 py-2 bg-[#ED5338] hover:bg-[#D84228] text-white font-bold rounded-lg text-sm shadow-md shadow-[#ED5338]/25 transition flex items-center justify-center space-x-2 cursor-pointer"
              >
                <FileText className="w-4 h-4" />
                <span>New Dispatch Log</span>
              </button>
            )}
            {hasAccess('inventory', 'view') && (
              <button
                onClick={() => onNavigate('inventory')}
                className="px-4 py-2 bg-[#221B18] hover:bg-[#2F2420] text-stone-200 border border-[#382B25] font-medium rounded-lg text-sm transition flex items-center justify-center space-x-2 cursor-pointer"
              >
                <Package className="w-4 h-4" />
                <span>Stock Overview</span>
              </button>
            )}
            {hasAccess('reports', 'view') && (
              <button
                onClick={() => onNavigate('reports')}
                className="px-4 py-2 bg-[#221B18] hover:bg-[#2F2420] text-stone-200 border border-[#382B25] font-medium rounded-lg text-sm transition flex items-center justify-center space-x-2 cursor-pointer"
              >
                <BarChart3 className="w-4 h-4 text-[#ED5338]" />
                <span>Audit Reports</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* MONTHLY QA & DISPATCH SUMMARY CONTROLLER (Monthly Changeable Front Dashboard) */}
      <div className="bg-[#181311] border border-[#2E221E] rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-md">
        <div className="flex items-center space-x-3 self-start sm:self-auto">
          <div className="w-10 h-10 rounded-xl bg-[#ED5338]/15 border border-[#ED5338]/30 flex items-center justify-center text-[#ED5338] shrink-0">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold uppercase tracking-wider text-stone-200">
                Monthly QA & Dispatch Summary
              </span>
              <span className="text-[10px] bg-amber-500/10 text-amber-300 border border-amber-500/25 px-2 py-0.5 rounded font-mono font-bold">
                {formatMonthLabel(selectedMonth)}
              </span>
            </div>
            <p className="text-[11px] text-stone-400 mt-0.5">
              Displaying operational metrics, food safety adherence, and retail output for {formatMonthLabel(selectedMonth)}.
            </p>
          </div>
        </div>

        {/* Monthly Switcher (Changeable via Arrows Only) */}
        <div className="flex items-center space-x-2 bg-stone-950 border border-stone-800 rounded-xl p-1.5 shrink-0 self-stretch sm:self-auto justify-between sm:justify-start">
          <button
            type="button"
            onClick={goToPreviousMonth}
            disabled={selectedMonth <= START_MONTH}
            className={`p-1.5 rounded-lg transition ${
              selectedMonth <= START_MONTH
                ? 'opacity-30 cursor-not-allowed text-stone-600'
                : 'hover:bg-stone-800 text-stone-400 hover:text-white cursor-pointer'
            }`}
            title={selectedMonth <= START_MONTH ? "Starts from September 2026" : "Previous Month"}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <span className="text-xs font-bold text-white px-3 py-1 font-mono tracking-wide select-none min-w-[130px] text-center">
            {formatMonthLabel(selectedMonth)}
          </span>

          <button
            type="button"
            onClick={goToNextMonth}
            disabled={selectedMonth >= currentMonthPrefix}
            className={`p-1.5 rounded-lg transition ${
              selectedMonth >= currentMonthPrefix
                ? 'opacity-30 cursor-not-allowed text-stone-600'
                : 'hover:bg-stone-800 text-stone-400 hover:text-white cursor-pointer'
            }`}
            title={selectedMonth >= currentMonthPrefix ? "Future months cannot be selected" : "Next Month"}
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {hasAccess('inventory', 'view') && (
          <div className="bg-stone-900 border border-stone-800 rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between text-stone-400 text-xs mb-1">
              <span>Total Units In Kitchen</span>
              <Package className="w-4 h-4 text-amber-500" />
            </div>
            <div className="text-2xl font-black text-white">{totalStockUnits}</div>
            <div className="text-[11px] text-stone-400 mt-1 flex items-center space-x-1">
              <span>Across</span>
              <span className="text-amber-400 font-semibold">{batches.length} batches</span>
            </div>
          </div>
        )}

        {(hasAccess('forms', 'view') || hasAccess('reports', 'view')) && (
          <div className="bg-stone-900 border border-stone-800 rounded-xl p-4 shadow-sm relative overflow-hidden group">
            <div className="flex items-center justify-between text-stone-400 text-xs mb-1">
              <span className="font-semibold text-stone-300">Monthly Dispatches</span>
              <div className="flex items-center space-x-1.5">
                <Clock className="w-3.5 h-3.5 text-blue-400" />
                <span className="text-[10px] bg-blue-500/10 text-blue-300 border border-blue-500/20 px-1.5 py-0.5 rounded font-mono font-bold">
                  {selectedMonth === 'all' ? 'All Time' : formatMonthLabel(selectedMonth)}
                </span>
              </div>
            </div>
            <div className="flex items-baseline space-x-1.5 mt-0.5">
              <span className="text-2xl font-black text-white font-mono">{monthlyDispatches.length}</span>
              <span className="text-xs text-stone-400 font-medium">
                logs in {formatMonthLabel(selectedMonth)}
              </span>
            </div>
            <div className="text-[11px] text-stone-400 mt-1.5 flex flex-col space-y-1">
              <div className="flex items-center justify-between">
                <span>{selectedMonth === currentMonthPrefix ? 'Today:' : 'Branches:'} <strong className="text-white font-mono">{selectedMonth === currentMonthPrefix ? todayDispatches : monthlyOutletsServed}</strong></span>
                <span>Units: <strong className="text-amber-400 font-mono">{monthlyUnitsDispatched}</strong></span>
              </div>
              <div className="text-[10px] text-stone-400 font-mono flex items-center justify-between pt-1 border-t border-stone-800/80">
                <span className="text-stone-400 flex items-center space-x-1">
                  <Clock className="w-3 h-3 text-blue-400 shrink-0" />
                  <span>Cycle:</span>
                </span>
                <span className="text-amber-400 font-semibold">
                  {selectedMonth === currentMonthPrefix ? timeLeftForReset : formatMonthLabel(selectedMonth)}
                </span>
              </div>
            </div>
          </div>
        )}

        {hasAccess('outlets', 'view') && (
          <div className="bg-stone-900 border border-stone-800 rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between text-stone-400 text-xs mb-1">
              <span>Outlets Served</span>
              <Store className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-black text-white">
              {monthlyOutletsServed}
            </div>
            <div className="text-[11px] text-stone-400 mt-1">
              <span>Branches served in {formatMonthLabel(selectedMonth)}</span>
            </div>
          </div>
        )}

        <div className="bg-stone-900 border border-stone-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-stone-400 text-xs mb-1">
            <span>Products Dispatched</span>
            <UtensilsCrossed className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-white">
            {monthlyProductsDispatched}
          </div>
          <div className="text-[11px] text-stone-400 mt-1">
            <span>Distinct items in {formatMonthLabel(selectedMonth)}</span>
          </div>
        </div>
      </div>

      {/* Stock Health Alerts */}
      {hasAccess('inventory', 'view') && (lowStockCount > 0 || expiringSoonCount > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {lowStockCount > 0 && (
            <div className="bg-amber-950/40 border border-amber-800/60 rounded-xl p-4 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
                <div>
                  <div className="text-sm font-semibold text-amber-200">
                    Low Stock Alert ({lowStockCount} Batches)
                  </div>
                  <div className="text-xs text-amber-300/80">
                    Some batches have dropped below the minimum 15 unit threshold.
                  </div>
                </div>
              </div>
              <button
                onClick={() => onNavigate('inventory')}
                className="text-xs bg-[#ED5338] hover:bg-[#D84228] text-white font-bold px-3 py-1.5 rounded-lg shadow-sm transition cursor-pointer"
              >
                Inspect
              </button>
            </div>
          )}

          {expiringSoonCount > 0 && (
            <div className="bg-rose-950/40 border border-rose-800/60 rounded-xl p-4 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Clock className="w-5 h-5 text-rose-400 shrink-0" />
                <div>
                  <div className="text-sm font-semibold text-rose-200">
                    Expiry Alert ({expiringSoonCount} Batches)
                  </div>
                  <div className="text-xs text-rose-300/80">
                    Batches reaching expiration date within 3 days. Prioritize in FIFO dispatches.
                  </div>
                </div>
              </div>
              <button
                onClick={() => onNavigate('inventory')}
                className="text-xs bg-rose-600 hover:bg-rose-500 text-white font-bold px-3 py-1.5 rounded-lg transition cursor-pointer"
              >
                Check
              </button>
            </div>
          )}
        </div>
      )}

      {/* Module Shortcuts Grid */}
      <div>
        <h3 className="text-sm font-bold uppercase tracking-wider text-stone-400 mb-3">
          Central Kitchen System Modules
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {quickNav.filter(item => item.visible).map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className="bg-[#171311] border border-[#2E221E] hover:border-[#ED5338]/60 rounded-xl p-5 shadow-sm transition-all hover:shadow-lg hover:shadow-[#ED5338]/5 cursor-pointer group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 rounded-lg bg-[#221A17] border border-[#382B25] flex items-center justify-center text-[#ED5338] group-hover:scale-105 group-hover:bg-[#ED5338] group-hover:text-white transition-all">
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-[#221A17] text-[#FFA594] border border-[#382B25] font-mono">
                      {item.badge}
                    </span>
                  </div>
                  <h4 className="font-bold text-white text-base group-hover:text-[#FFA594] transition">
                    {item.title}
                  </h4>
                  <p className="text-xs text-stone-400 mt-1 leading-relaxed">
                    {item.desc}
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-[#261D1A] flex items-center justify-between text-xs text-[#ED5338] font-semibold">
                  <span>Open Module</span>
                  <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition" />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent Dispatches Section - Monthly Reset Cycle */}
      <div className="bg-[#171311] border border-[#2E221E] rounded-xl p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <div className="flex items-center space-x-2 flex-wrap">
              <h3 className="font-bold text-white text-sm flex items-center space-x-2">
                <FileText className="w-4 h-4 text-[#ED5338]" />
                <span>Kitchen Dispatch Records</span>
              </h3>
              <span className="text-[10px] bg-[#221A17] text-[#FFA594] border border-[#382B25] px-2 py-0.5 rounded font-mono font-bold">
                {dispatchFilterMode === 'monthly' ? (selectedMonth === 'all' ? 'All Historical' : formatMonthLabel(selectedMonth)) : 'All Historical'}
              </span>
              <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded font-mono font-semibold">
                {dispatchFilterMode === 'monthly' ? `${monthlyDispatches.length} Logs` : `${dispatchLogs.length} Total Logs`}
              </span>
            </div>

            <p className="text-[11px] text-stone-400 mt-1 flex items-center space-x-1.5 font-mono">
              <Clock className="w-3 h-3 text-amber-500 shrink-0" />
              <span>
                {selectedMonth === currentMonthPrefix
                  ? `Current Month Dispatch Cycle (${currentMonthName}) • `
                  : `Selected Cycle: ${formatMonthLabel(selectedMonth)} • `}
                <strong className="text-amber-400">
                  {selectedMonth === currentMonthPrefix ? timeLeftForReset : `${monthlyDispatches.length} records`}
                </strong>
              </span>
            </p>
          </div>

          <div className="flex items-center space-x-2 flex-wrap gap-y-2">
            {/* Filter Toggle: Selected Month vs All Time */}
            <div className="flex rounded-lg bg-stone-900 p-0.5 border border-stone-800 text-xs">
              <button
                type="button"
                onClick={() => setDispatchFilterMode('monthly')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition cursor-pointer ${
                  dispatchFilterMode === 'monthly'
                    ? 'bg-[#ED5338] text-white shadow-sm'
                    : 'text-stone-400 hover:text-white'
                }`}
              >
                {selectedMonth === 'all' ? 'All Records' : formatMonthLabel(selectedMonth)} ({monthlyDispatches.length})
              </button>
              <button
                type="button"
                onClick={() => setDispatchFilterMode('all')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition cursor-pointer ${
                  dispatchFilterMode === 'all'
                    ? 'bg-[#ED5338] text-white shadow-sm'
                    : 'text-stone-400 hover:text-white'
                }`}
              >
                All History ({dispatchLogs.length})
              </button>
            </div>

            {(hasAccess('reports', 'view') || hasAccess('forms', 'view')) && (
              <button
                onClick={() => onNavigate(hasAccess('reports', 'view') ? 'reports' : 'forms')}
                className="text-xs text-[#FFA594] hover:text-[#ED5338] transition font-semibold cursor-pointer flex items-center space-x-1 ml-1"
                title="View full audit archive in Reports module"
              >
                <span>Reports</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Display List according to filter mode */}
        {(() => {
          const listToDisplay = dispatchFilterMode === 'monthly' ? monthlyDispatches : dispatchLogs;
          if (listToDisplay.length === 0) {
            return (
              <div className="text-center py-8 text-stone-500 text-xs bg-stone-900/40 rounded-xl border border-dashed border-stone-800 space-y-2 p-4">
                <p className="text-stone-300 font-semibold text-sm">
                  {dispatchFilterMode === 'monthly'
                    ? `No active dispatches recorded for ${formatMonthLabel(selectedMonth)}.`
                    : 'No dispatch logs recorded yet.'}
                </p>
                <p className="text-[11px] text-stone-400 max-w-lg mx-auto">
                  {dispatchFilterMode === 'monthly'
                    ? `Dispatches created for ${formatMonthLabel(selectedMonth)} in Dispatch Forms will appear here.`
                    : 'Dispatches issued in Dispatch Forms will appear here.'}
                </p>
                {dispatchFilterMode === 'monthly' && dispatchLogs.length > 0 && (
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => setDispatchFilterMode('all')}
                      className="text-xs bg-[#221A17] hover:bg-[#2C211D] border border-[#382B25] text-[#FFA594] hover:text-white px-3 py-1.5 rounded-lg transition cursor-pointer font-medium"
                    >
                      View All Prior Dispatches ({dispatchLogs.length} historical logs)
                    </button>
                  </div>
                )}
              </div>
            );
          }

          return (
            <div className="divide-y divide-[#261D1A]">
              {listToDisplay.slice(0, 5).map((log) => {
                const docName = log.documentName || getDispatchDocumentName(log);
                const repNo = log.reportNo || getDispatchReportNo(log);
                const rev = log.revision || 'Rev 01';
                const ver = log.version || '01';

                return (
                  <div key={log.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                        <span className="font-mono font-black text-amber-400 text-xs">{docName}</span>
                        <span className="text-[10px] bg-stone-800 border border-stone-700 px-1.5 py-0.2 rounded font-mono text-stone-200 font-bold">
                          {rev} / {ver}
                        </span>
                        <span className="text-[10px] bg-[#221A17] text-[#FFA594] border border-[#382B25] px-1.5 py-0.2 rounded font-mono font-semibold">
                          #{repNo}
                        </span>
                        {log.previousDocumentName && (
                          <span className="text-[9px] bg-amber-500/10 text-amber-300 border border-amber-500/30 px-1.5 py-0.2 rounded font-mono">
                            Rev of: {log.previousDocumentName}
                          </span>
                        )}
                        <span className="text-[10px] bg-[#221A17] border border-[#382B25] px-1.5 py-0.2 rounded text-stone-300 font-mono">
                          {log.date} @ {log.dispatchTime}
                        </span>
                        <span className="text-[10px] text-[#FFA594] font-semibold">
                          {log.outletNames.join(', ')}
                        </span>
                      </div>
                      <p className="text-[11px] text-stone-400 mt-1">
                        Driver: <span className="text-stone-300">{log.driverName}</span> - Supervisor: <span className="text-stone-300">{log.supervisor}</span> - {log.items.length} product line(s) ({log.items.reduce((s, i) => s + (i.quantity || 0), 0)} units)
                      </p>
                    </div>
                    {(hasAccess('reports', 'view') || hasAccess('forms', 'view')) && (
                      <button
                        onClick={() => onNavigate(hasAccess('reports', 'view') ? 'reports' : 'forms')}
                        className="text-xs bg-[#221A17] hover:bg-[#2C211D] border border-[#382B25] text-stone-300 hover:text-white px-2.5 py-1 rounded transition cursor-pointer self-start sm:self-auto shrink-0"
                      >
                        Details
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })()}
      </div>
    </div>
  );
};
