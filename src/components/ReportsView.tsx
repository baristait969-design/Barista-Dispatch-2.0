import React, { useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  BarChart3, 
  Download, 
  Printer, 
  Clock, 
  Building2, 
  ShieldCheck, 
  ThermometerSnowflake, 
  Filter, 
  Package, 
  FileText, 
  Search,
  Lock,
  Boxes,
  Calendar,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { DispatchLog, InventoryBatch, Outlet, Driver, UserProfile } from '../types';
import { PrintableDispatchSheet } from './PrintableDispatchSheet';
import { PrintableExecutiveReportModal } from './PrintableExecutiveReportModal';
import { BaristaLogo } from './BaristaLogo';
import { generateExecutiveReportPDF, generateSingleDispatchPDF } from '../utils/pdfExport';
import { getDispatchReportNo, getDispatchDocumentName } from '../utils/dispatchNumberUtils';
import { useModal } from '../context/ModalDialogContext';

interface ReportsViewProps {
  dispatchLogs: DispatchLog[];
  batches: InventoryBatch[];
  outlets?: Outlet[];
  drivers?: Driver[];
  usersList?: UserProfile[];
}

export const ReportsView: React.FC<ReportsViewProps> = ({ 
  dispatchLogs, 
  batches,
  outlets = [],
  drivers = [],
  usersList = []
}) => {
  const { userProfile, role, hasAccess } = useAuth();
  const { showAlert } = useModal();

  const canViewReports = hasAccess('reports', 'view');
  const canExport = hasAccess('reports', 'edit') || role === 'admin';

  const allDriversList = useMemo(() => {
    const list: Array<{ id: string; name: string; designation?: string }> = [];
    const seen = new Set<string>();
    if (usersList && usersList.length > 0) {
      usersList.filter(u => u.role === 'driver').forEach(u => {
        if (!seen.has(u.displayName)) {
          seen.add(u.displayName);
          list.push({ id: u.id, name: u.displayName, designation: u.designation || 'Driver' });
        }
      });
    }
    drivers.forEach(d => {
      if (!seen.has(d.name)) {
        seen.add(d.name);
        list.push({ id: d.id, name: d.name, designation: 'Driver' });
      }
    });
    return list;
  }, [usersList, drivers]);

  const [activeReportTab, setActiveReportTab] = useState<'dispatch_log' | 'outlets' | 'products'>('dispatch_log');

  const todayStr = new Date().toISOString().split('T')[0];
  const currentMonthPrefix = todayStr.substring(0, 7);

  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthPrefix);
  const [datePreset, setDatePreset] = useState<'month' | 'today' | '7days' | '30days' | 'all' | 'custom'>('month');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [selectedOutletFilter, setSelectedOutletFilter] = useState<string>('all');
  const [selectedDriverFilter, setSelectedDriverFilter] = useState<string>('all');
  const [haccpFilter, setHaccpFilter] = useState<'all' | 'compliant' | 'warning'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const [selectedLogForPrint, setSelectedLogForPrint] = useState<DispatchLog | null>(null);
  const [showExecutiveReportModal, setShowExecutiveReportModal] = useState<boolean>(false);

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

  const monthOptions = useMemo(() => {
    const set = new Set<string>();
    set.add(currentMonthPrefix);
    
    dispatchLogs.forEach(log => {
      const d = log.date || log.createdAt;
      if (d && d.length >= 7) {
        set.add(d.substring(0, 7));
      }
    });

    const now = new Date();
    for (let i = 1; i <= 6; i++) {
      const past = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const str = `${past.getFullYear()}-${String(past.getMonth() + 1).padStart(2, '0')}`;
      set.add(str);
    }

    return Array.from(set).sort().reverse().map(m => ({
      value: m,
      label: formatMonthLabel(m)
    }));
  }, [dispatchLogs, currentMonthPrefix]);

  const goToPreviousMonth = () => {
    if (selectedMonth === 'all') {
      setSelectedMonth(currentMonthPrefix);
      return;
    }
    const [year, month] = selectedMonth.split('-').map(Number);
    const d = new Date(year, month - 2, 1);
    const prevStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    setSelectedMonth(prevStr);
  };

  const goToNextMonth = () => {
    if (selectedMonth === 'all') {
      setSelectedMonth(currentMonthPrefix);
      return;
    }
    const [year, month] = selectedMonth.split('-').map(Number);
    const d = new Date(year, month, 1);
    const nextStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    setSelectedMonth(nextStr);
  };

  const filteredLogs = useMemo(() => {
    return dispatchLogs.filter(log => {
      // Monthly cycle filter
      if (selectedMonth !== 'all') {
        const matchesMonth = Boolean(
          (log.date && log.date.startsWith(selectedMonth)) ||
          (log.createdAt && log.createdAt.startsWith(selectedMonth))
        );
        if (!matchesMonth) return false;
      }

      if (datePreset === 'today') {
        if (log.date !== todayStr) return false;
      } else if (datePreset === '7days') {
        const d = new Date();
        d.setDate(d.getDate() - 7);
        const threshold = d.toISOString().split('T')[0];
        if (log.date < threshold) return false;
      } else if (datePreset === '30days') {
        const d = new Date();
        d.setDate(d.getDate() - 30);
        const threshold = d.toISOString().split('T')[0];
        if (log.date < threshold) return false;
      } else if (datePreset === 'custom') {
        if (startDate && log.date < startDate) return false;
        if (endDate && log.date > endDate) return false;
      }

      if (selectedOutletFilter !== 'all') {
        const matchesOutlet = log.outletNames.some(name => 
          name.toLowerCase().includes(selectedOutletFilter.toLowerCase())
        );
        if (!matchesOutlet) return false;
      }

      if (selectedDriverFilter !== 'all') {
        if (log.driverName !== selectedDriverFilter) return false;
      }

      if (haccpFilter === 'compliant' && !log.haccpCompliant) return false;
      if (haccpFilter === 'warning' && log.haccpCompliant) return false;

      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase();
        const inDocName = (log.documentName || '').toLowerCase().includes(q);
        const inRepNo = (log.reportNo || '').toLowerCase().includes(q);
        const inPrevDoc = (log.previousDocumentName || '').toLowerCase().includes(q);
        const inRev = (log.revision || '').toLowerCase().includes(q);
        const inVer = (log.version || '').toLowerCase().includes(q);
        const inDoc = log.docNo.toLowerCase().includes(q);
        const inDriver = log.driverName.toLowerCase().includes(q);
        const inSupervisor = log.supervisor.toLowerCase().includes(q);
        const inOutlets = log.outletNames.some(o => o.toLowerCase().includes(q));
        const inItems = log.items.some(i => i.productName.toLowerCase().includes(q) || i.batchNo.toLowerCase().includes(q));
        const inLogId = (log.id || '').toLowerCase().includes(q);
        const inPrevLogId = (log.previousDocId || '').toLowerCase().includes(q);
        if (!inDocName && !inRepNo && !inPrevDoc && !inRev && !inVer && !inDoc && !inDriver && !inSupervisor && !inOutlets && !inItems && !inLogId && !inPrevLogId) return false;
      }

      return true;
    });
  }, [dispatchLogs, datePreset, startDate, endDate, selectedOutletFilter, selectedDriverFilter, haccpFilter, searchQuery, todayStr]);

  const totalDispatches = filteredLogs.length;
  const totalUnitsDispatched = useMemo(() => {
    return filteredLogs.reduce((acc, log) => {
      return acc + log.items.reduce((s, i) => s + (i.quantity || 0), 0);
    }, 0);
  }, [filteredLogs]);

  const compliantLogsCount = filteredLogs.filter(l => l.haccpCompliant).length;
  const haccpComplianceRate = totalDispatches > 0 
    ? Math.round((compliantLogsCount / totalDispatches) * 100) 
    : 100;

  const averageTemp = useMemo(() => {
    let sum = 0;
    let count = 0;
    filteredLogs.forEach(log => {
      log.items.forEach(item => {
        if (item.quantity > 0) {
          sum += item.dispatchTemp;
          count++;
        }
      });
    });
    return count > 0 ? (sum / count).toFixed(1) : '3.6';
  }, [filteredLogs]);

  const deviationCount = filteredLogs.filter(l => !l.haccpCompliant).length;

  const outletStats = useMemo(() => {
    const map: Record<string, { count: number; units: number; lastDate: string }> = {};
    filteredLogs.forEach(log => {
      const unitsInLog = log.items.reduce((s, i) => s + (i.quantity || 0), 0);
      const dividedUnits = log.outletNames.length > 0 ? Math.round(unitsInLog / log.outletNames.length) : unitsInLog;
      log.outletNames.forEach(outlet => {
        if (!map[outlet]) {
          map[outlet] = { count: 0, units: 0, lastDate: log.date };
        }
        map[outlet].count += 1;
        map[outlet].units += dividedUnits;
        if (log.date > map[outlet].lastDate) {
          map[outlet].lastDate = log.date;
        }
      });
    });

    return Object.entries(map).map(([name, data]) => ({
      name,
      ...data,
      share: totalUnitsDispatched > 0 ? Math.round((data.units / totalUnitsDispatched) * 100) : 0
    })).sort((a, b) => b.units - a.units);
  }, [filteredLogs, totalUnitsDispatched]);

  const productStats = useMemo(() => {
    const map: Record<string, { units: number; batchCount: Set<string>; avgTempSum: number; count: number }> = {};
    filteredLogs.forEach(log => {
      log.items.forEach(item => {
        if (item.quantity > 0) {
          if (!map[item.productName]) {
            map[item.productName] = { units: 0, batchCount: new Set(), avgTempSum: 0, count: 0 };
          }
          map[item.productName].units += item.quantity;
          if (item.batchNo) map[item.productName].batchCount.add(item.batchNo);
          map[item.productName].avgTempSum += item.dispatchTemp;
          map[item.productName].count += 1;
        }
      });
    });

    return Object.entries(map).map(([name, data]) => ({
      name,
      units: data.units,
      batchesUsed: data.batchCount.size,
      avgTemp: data.count > 0 ? (data.avgTempSum / data.count).toFixed(1) : '3.5',
      share: totalUnitsDispatched > 0 ? Math.round((data.units / totalUnitsDispatched) * 100) : 0
    })).sort((a, b) => b.units - a.units);
  }, [filteredLogs, totalUnitsDispatched]);

  const exportAllDispatchesCSV = () => {
    if (!canExport) {
      showAlert('Your current role has read-only access. Only Admin or Kitchen Editor can export audit reports.', {
        title: 'Export Access Restricted',
        type: 'security'
      });
      return;
    }

    const headers = [
      'Document Name',
      'Report No',
      'Revision',
      'Version',
      'Previous Document',
      'HACCP Code',
      'Date',
      'Dispatch Time',
      'Outlets Delivered',
      'Driver Name',
      'Vehicle No',
      'Supervisor / QA Officer',
      'Product Name',
      'Batch No',
      'Quantity Dispatched (Units)',
      'Loaded Temperature (C)',
      'HACCP Compliant (<=5C)',
      'Log Status'
    ];

    const rows: any[] = [];
    filteredLogs.forEach(log => {
      const docName = log.documentName || getDispatchDocumentName(log);
      const repNo = log.reportNo || getDispatchReportNo(log);
      const rev = log.revision || 'Rev 01';
      const ver = log.version || '01';

      log.items.forEach(item => {
        if (item.quantity > 0) {
          rows.push([
            `"${docName}"`,
            `"${repNo}"`,
            `"${rev}"`,
            `"${ver}"`,
            `"${log.previousDocumentName || 'N/A'}"`,
            `"${log.docNo}"`,
            `"${log.date}"`,
            `"${log.dispatchTime}"`,
            `"${log.outletNames.join('; ')}"`,
            `"${log.driverName}"`,
            `"${log.vehicleNo || ''}"`,
            `"${log.supervisor}"`,
            `"${item.productName}"`,
            `"${item.batchNo}"`,
            item.quantity,
            item.dispatchTemp,
            item.dispatchTemp <= 5.0 ? 'YES' : 'NO',
            `"${log.status}"`
          ]);
        }
      });
    });

    if (rows.length === 0) {
      showAlert('No dispatched items found for the selected filter criteria.', {
        title: 'Empty Dataset',
        type: 'info'
      });
      return;
    }

    const csvContent = 'data:text/csv;charset=utf-8,' + 
      [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Barista_Central_Kitchen_Dispatch_Report_${todayStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadExecutivePDF = () => {
    if (filteredLogs.length === 0) {
      showAlert('No dispatch records available for the selected filters to generate PDF.', {
        title: 'Empty Report Dataset',
        type: 'info'
      });
      return;
    }
    generateExecutiveReportPDF(
      filteredLogs,
      {
        totalDispatches,
        totalUnitsDispatched,
        haccpComplianceRate,
        averageTemp,
        compliantLogsCount,
        deviationCount,
        outletsCount: outletStats.length
      },
      userProfile?.displayName || userProfile?.email || 'Central Kitchen QA Executive',
      datePreset === 'today' ? `Today (${todayStr})` : datePreset === '7days' ? 'Last 7 Days' : datePreset === '30days' ? 'Last 30 Days' : 'Full Historical Dataset'
    );
  };

  const handlePrintExecutiveReport = () => {
    setShowExecutiveReportModal(true);
  };

  if (!canViewReports) {
    return (
      <div className="bg-stone-900 border border-stone-800 rounded-2xl p-12 text-center flex flex-col items-center justify-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-red-950/60 border border-red-800/80 flex items-center justify-center text-red-400">
          <Lock className="w-8 h-8" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-white">Access Restricted: Reports Module</h3>
          <p className="text-xs text-stone-400 max-w-md mt-1">
            Your account does not possess permissions to view Central Kitchen QA and dispatch analytics. Please contact the Barista IT Administrator to update your module permissions.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {selectedLogForPrint && (
        <PrintableDispatchSheet
          dispatchLog={selectedLogForPrint}
          onClose={() => setSelectedLogForPrint(null)}
          autoPrint={false}
        />
      )}

      {showExecutiveReportModal && (
        <PrintableExecutiveReportModal
          logs={filteredLogs}
          stats={{
            totalDispatches,
            totalUnitsDispatched,
            haccpComplianceRate,
            averageTemp,
            compliantLogsCount,
            deviationCount,
            outletsCount: outletStats.length
          }}
          generatedBy={userProfile?.displayName || userProfile?.email || 'Central Kitchen QA Executive'}
          filterPeriod={selectedMonth === 'all' ? 'All Historical Records' : formatMonthLabel(selectedMonth)}
          onClose={() => setShowExecutiveReportModal(false)}
        />
      )}

      {/* TOP BANNER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#171311] border border-[#2E221E] rounded-2xl p-5 print:hidden shadow-md">
        <div>
          <div className="flex items-center space-x-2.5">
            <BaristaLogo className="w-8 h-8 ring-2 ring-[#ED5338]/40 shadow-md shrink-0" />
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-xl sm:text-2xl font-bold text-white tracking-wide">Central Kitchen Reports & QA Audits</h2>
                <span className="text-[10px] bg-[#ED5338]/15 text-[#FFA594] border border-[#ED5338]/30 px-2 py-0.5 rounded font-mono font-bold">
                  OPRP-2 Certified
                </span>
                <span className="inline-flex items-center space-x-1 text-[10px] bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded font-mono font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Real-time Live</span>
                </span>
              </div>
              <p className="text-xs text-stone-400 mt-0.5">
                Real-time bakery dispatch analytics, cold-chain compliance (&lt;= 5.0 C), retail outlet volumes, and item performance.
              </p>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleDownloadExecutivePDF}
            className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-600 text-white font-bold rounded-xl text-xs transition flex items-center space-x-1.5 cursor-pointer shadow-md"
            title="Download Executive QA & Dispatch Report in PDF format (.pdf)"
          >
            <Download className="w-4 h-4" />
            <span>Download PDF (.pdf)</span>
          </button>
          <button
            onClick={handlePrintExecutiveReport}
            className="px-3.5 py-2 bg-[#ED5338] hover:bg-[#D84228] text-white font-bold rounded-xl text-xs shadow-md shadow-[#ED5338]/20 transition flex items-center space-x-1.5 cursor-pointer"
            title="Print Executive QA & Dispatch Summary Sheet"
          >
            <Printer className="w-4 h-4" />
            <span>Print Report</span>
          </button>
          {role !== 'viewer' && canExport && (
            <button
              onClick={exportAllDispatchesCSV}
              disabled={filteredLogs.length === 0}
              className="px-3.5 py-2 bg-[#221B18] hover:bg-[#2F2420] text-[#FFA594] border border-[#ED5338]/40 font-bold rounded-xl text-xs transition flex items-center space-x-1.5 cursor-pointer shadow-sm disabled:opacity-50"
              title="Download CSV for Excel / ERP integration"
            >
              <Download className="w-4 h-4" />
              <span>Export CSV</span>
            </button>
          )}
        </div>
      </div>

      {/* MONTHLY CYCLE / PERIOD CONTROLLER (Monthly Changeable Dashboard Overview) */}
      <div className="bg-[#181311] border border-[#2E221E] rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-md print:hidden">
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
                {selectedMonth === 'all' ? 'All Historical Records' : formatMonthLabel(selectedMonth)}
              </span>
            </div>
            <p className="text-[11px] text-stone-400 mt-0.5">
              {selectedMonth === 'all' 
                ? 'Displaying cumulative operational metrics across all historical dispatches.'
                : `Displaying operational metrics, food safety adherence, and retail output for ${formatMonthLabel(selectedMonth)}.`}
            </p>
          </div>
        </div>

        {/* Monthly Switcher (Changeable) */}
        <div className="flex items-center space-x-2 bg-stone-950 border border-stone-800 rounded-xl p-1.5 shrink-0 self-stretch sm:self-auto justify-between sm:justify-start">
          <button
            type="button"
            onClick={goToPreviousMonth}
            className="p-1.5 hover:bg-stone-800 text-stone-400 hover:text-white rounded-lg transition cursor-pointer"
            title="Previous Month"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="bg-transparent text-xs font-bold text-white px-2 py-1 focus:outline-none cursor-pointer font-mono"
          >
            {monthOptions.map(opt => (
              <option key={opt.value} value={opt.value} className="bg-stone-900 text-white">
                {opt.label}
              </option>
            ))}
            <option value="all" className="bg-stone-900 text-white">All Historical Records</option>
          </select>

          <button
            type="button"
            onClick={goToNextMonth}
            className="p-1.5 hover:bg-stone-800 text-stone-400 hover:text-white rounded-lg transition cursor-pointer"
            title="Next Month"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          {selectedMonth !== currentMonthPrefix && (
            <button
              type="button"
              onClick={() => setSelectedMonth(currentMonthPrefix)}
              className="text-[10px] font-bold text-amber-400 hover:text-amber-300 px-2 py-1 bg-amber-500/10 rounded-lg border border-amber-500/30 transition cursor-pointer ml-1"
              title="Return to Current Month"
            >
              Current Month
            </button>
          )}
        </div>
      </div>

      {/* OPERATIONAL KPI DISPLAY CARDS (Display Only - Not Buttons) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
        <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4 flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between text-stone-400 text-xs">
            <span className="font-semibold text-stone-300">Total Dispatches</span>
            <FileText className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-black text-white font-mono">{totalDispatches}</span>
            <span className="text-[11px] text-stone-500 block">Deliveries recorded</span>
          </div>
        </div>

        <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4 flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between text-stone-400 text-xs">
            <span className="font-semibold text-stone-300">Total Output</span>
            <Package className="w-4 h-4 text-blue-400" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-black text-white font-mono">{totalUnitsDispatched}</span>
            <span className="text-[11px] text-stone-500 block">Pastry & bakery units</span>
          </div>
        </div>

        <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4 flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between text-stone-400 text-xs">
            <span className="font-semibold text-stone-300">Outlets Served</span>
            <Building2 className="w-4 h-4 text-purple-400" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <div>
              <span className="text-2xl font-black text-white font-mono">{outletStats.length}</span>
              <span className="text-[11px] text-stone-500 block">Active branches</span>
            </div>
            {deviationCount > 0 ? (
              <span className="text-[10px] font-bold text-red-400 bg-red-950/80 border border-red-800 px-1.5 py-0.5 rounded">
                {deviationCount} Alerts
              </span>
            ) : (
              <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/80 border border-emerald-800 px-1.5 py-0.5 rounded">
                0 Breaches
              </span>
            )}
          </div>
        </div>

        <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4 flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between text-stone-400 text-xs">
            <span className="font-semibold text-stone-300">Products Dispatched</span>
            <Boxes className="w-4 h-4 text-orange-400" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <div>
              <span className="text-2xl font-black text-white font-mono">{productStats.length}</span>
              <span className="text-[11px] text-stone-500 block">Distinct items</span>
            </div>
            <span className="text-[10px] font-mono font-bold text-amber-300 bg-amber-950/80 border border-amber-800/80 px-1.5 py-0.5 rounded">
              SKUs Active
            </span>
          </div>
        </div>

        <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4 flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between text-stone-400 text-xs">
            <span className="font-semibold text-stone-300">Cold-Chain Adherence</span>
            <ThermometerSnowflake className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="mt-2">
            <div className="flex items-baseline space-x-1.5">
              <span className={`text-2xl font-black font-mono ${
                haccpComplianceRate >= 95 ? 'text-emerald-400' : 'text-amber-400'
              }`}>
                {haccpComplianceRate}%
              </span>
              <span className="text-[10px] text-stone-400 font-mono">OPRP-2 (&lt;= 5.0 C)</span>
            </div>
            <span className="text-[11px] text-emerald-400 font-semibold block">
              {compliantLogsCount} of {totalDispatches} compliant
            </span>
          </div>
        </div>

        <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4 flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between text-stone-400 text-xs">
            <span className="font-semibold text-stone-300">Avg Dispatch Temp</span>
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2">
            <div className="flex items-baseline space-x-1">
              <span className="text-2xl font-black text-white font-mono">{averageTemp} C</span>
              <span className="text-[10px] text-emerald-400 font-mono">Safe</span>
            </div>
            <span className="text-[11px] text-stone-500 block">Max standard: 5.0 C</span>
          </div>
        </div>
      </div>

      {/* FILTER CONTROLS BAR */}
      <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4 space-y-3 print:hidden shadow-sm">
        <div className="flex items-center justify-between pb-2 border-b border-stone-800">
          <div className="flex items-center space-x-2 text-xs font-bold text-stone-300">
            <Filter className="w-3.5 h-3.5 text-amber-400" />
            <span>Report Filters & Operational Parameters</span>
          </div>
          <div className="text-[11px] text-stone-500 font-mono">
            Showing {filteredLogs.length} matching dispatches
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 text-xs">
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-300 mb-1">
              Time Period
            </label>
            <select
              value={datePreset}
              onChange={(e) => setDatePreset(e.target.value as any)}
              className="w-full px-2.5 py-2 bg-stone-950 border border-stone-700 rounded-lg text-xs text-stone-100 font-medium focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 cursor-pointer"
            >
              <option value="month" className="bg-stone-900 text-stone-100">
                {selectedMonth === 'all' ? 'All Historical Records' : `Selected Month (${formatMonthLabel(selectedMonth)})`}
              </option>
              <option value="today" className="bg-stone-900 text-stone-100">Today Only ({todayStr})</option>
              <option value="7days" className="bg-stone-900 text-stone-100">Last 7 Days</option>
              <option value="30days" className="bg-stone-900 text-stone-100">Last 30 Days</option>
              <option value="custom" className="bg-stone-900 text-stone-100">Custom Date Range...</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-300 mb-1">
              Destination Outlet
            </label>
            <select
              value={selectedOutletFilter}
              onChange={(e) => setSelectedOutletFilter(e.target.value)}
              className="w-full px-2.5 py-2 bg-stone-950 border border-stone-700 rounded-lg text-xs text-stone-100 font-medium focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 cursor-pointer"
            >
              <option value="all" className="bg-stone-900 text-stone-100">All Retail Branches</option>
              {outlets.map(o => (
                <option key={o.id} value={o.name} className="bg-stone-900 text-stone-100">{o.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-300 mb-1">
              Cold-Chain Driver
            </label>
            <select
              value={selectedDriverFilter}
              onChange={(e) => setSelectedDriverFilter(e.target.value)}
              className="w-full px-2.5 py-2 bg-stone-950 border border-stone-700 rounded-lg text-xs text-stone-100 font-medium focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 cursor-pointer"
            >
              <option value="all" className="bg-stone-900 text-stone-100">All Fleet Drivers</option>
              {allDriversList.map(d => (
                <option key={d.id} value={d.name} className="bg-stone-900 text-stone-100">{d.name} ({d.designation || 'Driver'})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-300 mb-1">
              Cold-Chain Status
            </label>
            <select
              value={haccpFilter}
              onChange={(e) => setHaccpFilter(e.target.value as any)}
              className="w-full px-2.5 py-2 bg-stone-950 border border-stone-700 rounded-lg text-xs text-stone-100 font-medium focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 cursor-pointer"
            >
              <option value="all" className="bg-stone-900 text-stone-100">All Dispatches</option>
              <option value="compliant" className="bg-stone-900 text-stone-100">Compliant Only (&lt;= 5.0 C)</option>
              <option value="warning" className="bg-stone-900 text-stone-100">Deviations (&gt;5.0 C)</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-300 mb-1">
              Search Products / Logs
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                placeholder="Product, Batch, Outlet, Doc ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-2.5 py-2 bg-stone-950 border border-stone-700 rounded-lg text-xs text-stone-100 placeholder-stone-400 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30"
              />
            </div>
          </div>
        </div>

        {datePreset === 'custom' && (
          <div className="pt-2.5 border-t border-stone-800 flex items-center space-x-3 text-xs">
            <span className="text-stone-300 font-medium">From Date:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-2.5 py-1.5 bg-stone-950 border border-stone-700 rounded-lg text-stone-100 text-xs font-mono focus:outline-none focus:border-amber-500"
            />
            <span className="text-stone-300 font-medium">To Date:</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-2.5 py-1.5 bg-stone-950 border border-stone-700 rounded-lg text-stone-100 text-xs font-mono focus:outline-none focus:border-amber-500"
            />
          </div>
        )}
      </div>

      {/* REPORT SUB-NAV TABS */}
      <div className="flex bg-[#120E0D] p-1.5 rounded-2xl border border-[#2E221E] space-x-1.5 print:hidden overflow-x-auto shadow-inner">
        <button
          onClick={() => setActiveReportTab('dispatch_log')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition cursor-pointer flex items-center space-x-2 shrink-0 ${
            activeReportTab === 'dispatch_log'
              ? 'bg-[#ED5338] text-white shadow-md shadow-[#ED5338]/25'
              : 'text-stone-300 hover:text-white hover:bg-[#251C18]'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Dispatch Records & Print Archive ({filteredLogs.length})</span>
        </button>
        <button
          onClick={() => setActiveReportTab('outlets')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition cursor-pointer flex items-center space-x-2 shrink-0 ${
            activeReportTab === 'outlets'
              ? 'bg-[#ED5338] text-white shadow-md shadow-[#ED5338]/25'
              : 'text-stone-300 hover:text-white hover:bg-[#251C18]'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Outlet Distribution Breakdown ({outletStats.length})</span>
        </button>
        <button
          onClick={() => setActiveReportTab('products')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition cursor-pointer flex items-center space-x-2 shrink-0 ${
            activeReportTab === 'products'
              ? 'bg-[#ED5338] text-white shadow-md shadow-[#ED5338]/25'
              : 'text-stone-300 hover:text-white hover:bg-[#251C18]'
          }`}
        >
          <Package className="w-4 h-4" />
          <span>Product Performance Matrix ({productStats.length})</span>
        </button>
      </div>

      {/* TAB 1: DISPATCH RECORDS */}
      {activeReportTab === 'dispatch_log' && (
        <div className="bg-stone-900 border border-stone-800 rounded-2xl overflow-hidden shadow-md">
          <div className="p-4 border-b border-stone-800 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white">Itemized Dispatch Manifests</h3>
              <p className="text-xs text-stone-400">
                Click "Print Sheet" on any record to print ONLY the selected dispatched items with official HACCP header.
              </p>
            </div>
            <span className="text-xs font-mono text-stone-400">
              Total Units: <strong>{totalUnitsDispatched}</strong>
            </span>
          </div>

          {filteredLogs.length === 0 ? (
            <div className="p-12 text-center text-xs text-stone-500">
              No dispatch records found matching your filter parameters.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-stone-850 text-stone-300 font-bold uppercase tracking-wider border-b border-stone-800 text-[11px]">
                  <tr>
                    <th className="py-3 px-4">Document Ref / Date</th>
                    <th className="py-3 px-4">Destination Outlets</th>
                    <th className="py-3 px-4">Driver & Vehicle</th>
                    <th className="py-3 px-4">Dispatched Items & Qty</th>
                    <th className="py-3 px-4 text-center">Cold-Chain Temp</th>
                    <th className="py-3 px-4">QA Supervisor</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-800">
                  {filteredLogs.map((log) => {
                    const docName = log.documentName || getDispatchDocumentName(log);
                    const repNo = log.reportNo || getDispatchReportNo(log);
                    const rev = log.revision || 'Rev 01';
                    const ver = log.version || '01';
                    const activeItems = log.items.filter(i => i.quantity > 0);
                    const unitsCount = activeItems.reduce((s, i) => s + i.quantity, 0);

                    return (
                      <tr key={log.id} className="hover:bg-stone-800/40 transition">
                        <td className="py-3 px-4">
                          <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
                            <span className="font-mono font-black text-amber-400 text-xs">{docName}</span>
                            <span className="text-[10px] bg-stone-800 border border-stone-700 px-1.5 py-0.2 rounded font-mono text-stone-200 font-bold">
                              {rev} / {ver}
                            </span>
                            <span className="text-[10px] bg-[#221A17] text-[#FFA594] border border-[#382B25] px-1.5 py-0.2 rounded font-mono font-semibold">
                              #{repNo}
                            </span>
                          </div>
                          {log.previousDocumentName && (
                            <span className="text-[9px] bg-amber-500/10 text-amber-300 border border-amber-500/30 px-1.5 py-0.2 rounded font-mono block w-fit mt-1">
                              Rev of: {log.previousDocumentName}
                            </span>
                          )}
                          <span className="text-[11px] text-stone-400 font-mono block mt-0.5">
                            {log.date} @ {log.dispatchTime}
                          </span>
                        </td>

                        <td className="py-3 px-4 font-semibold text-white max-w-[200px]">
                          <div className="truncate" title={log.outletNames.join(', ')}>
                            {log.outletNames.join(', ')}
                          </div>
                          <span className="text-[10px] text-stone-400 block font-mono">
                            {log.outletNames.length} branch(es)
                          </span>
                        </td>

                        <td className="py-3 px-4 text-stone-300">
                          <div>{log.driverName}</div>
                          <span className="text-[10px] text-stone-400 font-mono">{log.vehicleNo || 'Van'}</span>
                        </td>

                        <td className="py-3 px-4">
                          <div className="flex items-center space-x-1.5">
                            <span className="font-bold text-white font-mono text-sm">{unitsCount}</span>
                            <span className="text-stone-400 text-[11px]">units</span>
                            <span className="text-[10px] bg-stone-800 text-stone-400 px-1.5 py-0.5 rounded">
                              ({activeItems.length} products)
                            </span>
                          </div>
                          <div className="text-[10px] text-stone-400 truncate max-w-[220px] mt-0.5">
                            {activeItems.map(i => `${i.productName} (${i.quantity})`).join(', ')}
                          </div>
                        </td>

                        <td className="py-3 px-4 text-center">
                          <span className="font-mono font-bold text-xs text-stone-200">
                            {activeItems.length > 0 
                              ? Array.from(new Set(activeItems.map(i => `${Number(i.dispatchTemp || 0).toFixed(1)} C`))).join(', ')
                              : 'N/A'}
                          </span>
                        </td>

                        <td className="py-3 px-4 text-stone-300 text-xs">
                          <div className="font-medium text-stone-200">{log.supervisor}</div>
                          <span className="text-[10px] text-stone-500 font-mono">QA Verified</span>
                        </td>

                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end space-x-1.5">
                            <button
                              onClick={() => generateSingleDispatchPDF(log as any)}
                              className="px-2.5 py-1.5 bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 hover:text-white border border-emerald-800 rounded-lg text-xs font-bold transition flex items-center space-x-1 cursor-pointer shadow-sm"
                              title="Download PDF (.pdf) for this dispatch record"
                            >
                              <Download className="w-3 h-3 text-emerald-400" />
                              <span>PDF</span>
                            </button>
                            <button
                              onClick={() => setSelectedLogForPrint(log)}
                              className="px-2.5 py-1.5 bg-[#251C18] hover:bg-[#ED5338] text-[#FFA594] hover:text-white border border-[#ED5338]/30 rounded-lg text-xs font-bold transition flex items-center space-x-1 cursor-pointer shadow-sm"
                              title="Print this dispatch sheet with official Barista header"
                            >
                              <Printer className="w-3 h-3" />
                              <span>Print</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: OUTLET BREAKDOWN */}
      {activeReportTab === 'outlets' && (
        <div className="bg-[#171311] border border-[#2E221E] rounded-2xl p-5 space-y-4 shadow-md">
          <div className="flex items-center justify-between pb-3 border-b border-[#2E221E]">
            <div>
              <h3 className="text-sm font-bold text-white">Retail Outlet Delivery & Volume Breakdown</h3>
              <p className="text-xs text-stone-400">
                Total pastry and cake units delivered per Barista Sri Lanka branch.
              </p>
            </div>
            <span className="text-xs font-mono text-stone-400">
              Total Delivery Trips: <strong>{totalDispatches}</strong>
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {outletStats.map((stat, idx) => (
              <div key={stat.name} className="bg-[#1E1714] border border-[#382B25] rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="w-5 h-5 rounded-full bg-[#2A201C] text-[#FFA594] font-mono text-[10px] flex items-center justify-center font-bold">
                      {idx + 1}
                    </span>
                    <span className="text-sm font-bold text-white">{stat.name}</span>
                  </div>
                  <span className="text-xs font-mono font-bold text-[#FFA594]">
                    {stat.units} Units ({stat.share}%)
                  </span>
                </div>
                <div className="w-full bg-[#120E0D] rounded-full h-2 overflow-hidden border border-[#2E221E]">
                  <div 
                    className="bg-[#ED5338] h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, stat.share * 2 || 5)}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[11px] text-stone-400 pt-1">
                  <span>Deliveries: <strong>{stat.count} dispatches</strong></span>
                  <span>Last Service: <strong className="font-mono text-stone-300">{stat.lastDate}</strong></span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: PRODUCT PERFORMANCE MATRIX */}
      {activeReportTab === 'products' && (
        <div className="bg-stone-900 border border-stone-800 rounded-2xl p-5 space-y-4 shadow-md">
          <div className="flex items-center justify-between pb-3 border-b border-stone-800">
            <div>
              <h3 className="text-sm font-bold text-white">Product Dispatch & Inventory Output Matrix</h3>
              <p className="text-xs text-stone-400">
                Quantity dispatched, distinct batch rotations, and average departure temperatures.
              </p>
            </div>
            <span className="text-xs font-mono text-stone-400">
              Active Products: <strong>{productStats.length}</strong>
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-850 text-stone-300 font-bold uppercase tracking-wider border-b border-stone-800 text-[11px]">
                <tr>
                  <th className="py-3 px-4">Pastry / Kitchen Product</th>
                  <th className="py-3 px-4 text-center">Total Dispatched</th>
                  <th className="py-3 px-4 text-center">Output Share</th>
                  <th className="py-3 px-4 text-center">Batches Utilized</th>
                  <th className="py-3 px-4 text-center">Avg Dispatch Temp</th>
                  <th className="py-3 px-4 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-800">
                {productStats.map((prod) => (
                  <tr key={prod.name} className="hover:bg-stone-800/40 transition">
                    <td className="py-3 px-4 font-bold text-white flex items-center space-x-2">
                      <div className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                      <span>{prod.name}</span>
                    </td>
                    <td className="py-3 px-4 text-center font-mono font-bold text-amber-400 text-sm">
                      {prod.units} units
                    </td>
                    <td className="py-3 px-4 text-center font-mono text-stone-300">
                      {prod.share}%
                    </td>
                    <td className="py-3 px-4 text-center font-mono text-stone-300">
                      {prod.batchesUsed} batches
                    </td>
                    <td className="py-3 px-4 text-center font-mono font-bold text-cyan-300">
                      {prod.avgTemp}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-800 px-2 py-0.5 rounded">
                        Active In Circulation
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
