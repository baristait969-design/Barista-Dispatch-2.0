import React from 'react';
import { Printer, Download, X } from 'lucide-react';
import { DispatchLog } from '../types';
import { BaristaLogo } from './BaristaLogo';
import { DocumentHaccpHeader } from './DocumentHaccpHeader';
import { generateExecutiveReportPDF } from '../utils/pdfExport';
import { printHtmlElement, syncToPrintRoot, clearPrintRoot } from '../utils/printUtils';

interface PrintableExecutiveReportModalProps {
  logs: DispatchLog[];
  stats: {
    totalDispatches: number;
    totalUnitsDispatched: number;
    haccpComplianceRate: number;
    averageTemp: string;
    compliantLogsCount: number;
    deviationCount: number;
    outletsCount: number;
  };
  generatedBy: string;
  filterPeriod: string;
  onClose: () => void;
}

export const PrintableExecutiveReportModal: React.FC<PrintableExecutiveReportModalProps> = ({
  logs,
  stats,
  generatedBy,
  filterPeriod,
  onClose
}) => {
  const todayStr = new Date().toISOString().split('T')[0];

  const handlePrint = () => {
    printHtmlElement('printable-executive-report-content', `Barista_Executive_Report_${todayStr}`);
  };

  const handleDownloadPDF = () => {
    generateExecutiveReportPDF(logs, stats, generatedBy, filterPeriod);
  };

  React.useEffect(() => {
    const timer = setTimeout(() => {
      syncToPrintRoot('printable-executive-report-content');
    }, 50);
    return () => {
      clearTimeout(timer);
      clearPrintRoot();
    };
  }, [logs, stats, generatedBy, filterPeriod]);

  return (
    <div className="printable-modal-overlay fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-sm flex justify-center p-2 sm:p-6 print:p-0 print:bg-white print:static print:inset-auto print:backdrop-blur-none">
      <div className="printable-card-container relative w-full max-w-5xl bg-[#171311] border border-[#382B25] text-stone-100 rounded-2xl shadow-2xl p-4 sm:p-6 print:p-0 print:border-none print:shadow-none print:rounded-none print:w-full print:max-w-none print:bg-white">
        
        {/* Modal Action Bar */}
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-[#2C211C] print:hidden">
          <div className="flex items-center space-x-2.5">
            <BaristaLogo className="w-7 h-7 shadow-sm" />
            <span className="bg-[#ED5338]/15 text-[#FFA594] border border-[#ED5338]/30 text-xs px-2.5 py-1 rounded-md font-bold font-mono">
              OPRP-2 QA REPORT
            </span>
            <span className="text-xs text-stone-400 font-medium hidden sm:inline">
              Central Kitchen Quality & Cold-Chain Dispatch Audit
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleDownloadPDF}
              className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-600 text-white font-bold rounded-xl text-xs flex items-center space-x-1.5 shadow-md transition cursor-pointer"
              title="Download official PDF copy"
            >
              <Download className="w-4 h-4" />
              <span>Download PDF (.pdf)</span>
            </button>
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-[#ED5338] hover:bg-[#D84228] text-white font-bold rounded-xl text-xs flex items-center space-x-1.5 shadow-md shadow-[#ED5338]/25 transition cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Print Document</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-stone-400 hover:text-white rounded-xl border border-[#382B25] hover:bg-[#251D1A] transition cursor-pointer"
              title="Close Report Preview"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* PRINTABLE CONTENT CONTAINER */}
        <div id="printable-executive-report-content" className="print-content bg-white text-stone-900 rounded-xl p-5 sm:p-8 print:p-2 shadow-md print:shadow-none">
          
          <DocumentHaccpHeader
            title="Executive QA & Dispatch Summary"
            subtitle="Central Kitchen Food Safety & Cold-Chain Adherence Audit"
            docCode="BCL/QA/REP/EXEC"
            effectiveDate={filterPeriod || 'Current Audit Cycle'}
            revision="Rev 01"
            version="01"
            approvedBy={generatedBy || 'QA Executive'}
            refId={`AUD-${stats.totalDispatches}-REC`}
            haccpLink="OPRP-2 Certified (<= 5.0 C)"
            mandateNotice="CRITICAL CONTROL REQUIREMENT: Maximum dispatch transit temperature must remain <= 5.0 C"
            className="mb-4 print:mb-3"
            variant="paper"
          />

          {/* Operational Metrics Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <div className="border border-stone-300 rounded-lg p-3 bg-stone-50 text-center">
              <span className="text-[10px] uppercase font-bold text-stone-500 block">Total Volume Dispatched</span>
              <span className="text-xl font-mono font-black text-stone-900 mt-1 block">{stats.totalUnitsDispatched} Units</span>
              <span className="text-[10px] text-stone-500">across {stats.outletsCount} retail branches</span>
            </div>
            <div className="border border-stone-300 rounded-lg p-3 bg-stone-50 text-center">
              <span className="text-[10px] uppercase font-bold text-stone-500 block">Cold-Chain Compliance</span>
              <span className="text-xl font-mono font-black text-emerald-700 mt-1 block">{stats.haccpComplianceRate}%</span>
              <span className="text-[10px] text-emerald-700 font-semibold">{stats.compliantLogsCount} / {stats.totalDispatches} compliant</span>
            </div>
            <div className="border border-stone-300 rounded-lg p-3 bg-stone-50 text-center">
              <span className="text-[10px] uppercase font-bold text-stone-500 block">Average Dispatch Temp</span>
              <span className="text-xl font-mono font-black text-blue-800 mt-1 block">{stats.averageTemp} C</span>
              <span className="text-[10px] text-stone-500">Optimal Range (0 C - 4.5 C)</span>
            </div>
            <div className="border border-stone-300 rounded-lg p-3 bg-stone-50 text-center">
              <span className="text-[10px] uppercase font-bold text-stone-500 block">Temperature Deviations</span>
              <span className="text-xl font-mono font-black text-red-700 mt-1 block">{stats.deviationCount} Logs</span>
              <span className="text-[10px] text-stone-500">{stats.deviationCount === 0 ? 'Zero Breaches' : 'Requires CAPA Review'}</span>
            </div>
          </div>

          {/* Table of Dispatches */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-black uppercase tracking-wider text-stone-800">
                Audited Dispatch Records ({logs.length} Logs)
              </span>
              <span className="text-[10px] text-stone-500 font-mono">
                Period: {filterPeriod}
              </span>
            </div>

            {logs.length === 0 ? (
              <div className="border border-stone-300 p-8 text-center text-xs text-stone-500 italic">
                No dispatch logs available for the selected period.
              </div>
            ) : (
              <table className="w-full text-left text-xs border-collapse border border-stone-900">
                <thead>
                  <tr className="bg-stone-100 text-stone-900 border-b-2 border-stone-900 font-bold uppercase text-[10px] tracking-wider">
                    <th className="p-2 border-r border-stone-400 w-8 text-center">#</th>
                    <th className="p-2 border-r border-stone-400 w-24">Date / Time</th>
                    <th className="p-2 border-r border-stone-400 w-32">Destination Outlet</th>
                    <th className="p-2 border-r border-stone-400 w-28">Driver & Vehicle</th>
                    <th className="p-2 border-r border-stone-400">Dispatched Products & Batches</th>
                    <th className="p-2 border-r border-stone-400 w-20 text-center">Total Qty</th>
                    <th className="p-2 w-24 text-center">Dispatch Temp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-300">
                  {logs.map((log, index) => {
                    const totalQty = log.items.reduce((s, i) => s + (i.quantity || 0), 0);
                    const temps = log.items.filter(i => (i.quantity || 0) > 0).map(i => i.dispatchTemp);
                    const avgLogTemp = temps.length > 0 ? (temps.reduce((a, b) => a + b, 0) / temps.length).toFixed(1) : '3.5';
                    return (
                      <tr key={log.id || index} className="text-stone-900">
                        <td className="p-2 border-r border-stone-300 text-center font-mono font-bold text-stone-500">
                          {index + 1}
                        </td>
                        <td className="p-2 border-r border-stone-300 font-mono text-[11px]">
                          <div>{log.date}</div>
                          <span className="text-stone-500 font-semibold">{log.dispatchTime}</span>
                        </td>
                        <td className="p-2 border-r border-stone-300 font-bold text-[11px]">
                          {log.outletNames && log.outletNames.length > 0 ? log.outletNames.join(', ') : 'All Outlets'}
                        </td>
                        <td className="p-2 border-r border-stone-300 text-[11px]">
                          <div className="font-semibold">{log.driverName}</div>
                          <span className="text-stone-500 font-mono text-[10px]">{log.vehicleNo || 'Refrigerated Van'}</span>
                        </td>
                        <td className="p-2 border-r border-stone-300 text-[11px]">
                          <div className="space-y-0.5">
                            {log.items.filter(i => (i.quantity || 0) > 0).slice(0, 3).map((item, idx) => (
                              <div key={idx} className="flex items-center justify-between text-[10px]">
                                <span className="truncate max-w-[180px] font-medium">{item.productName}</span>
                                <span className="font-mono text-stone-600 ml-1">({item.batchNo} - {item.quantity}u)</span>
                              </div>
                            ))}
                            {log.items.filter(i => (i.quantity || 0) > 0).length > 3 && (
                              <span className="text-[9px] text-stone-500 italic">
                                +{log.items.filter(i => (i.quantity || 0) > 0).length - 3} more items...
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-2 border-r border-stone-300 text-center font-mono font-bold text-sm bg-stone-50">
                          {totalQty}
                        </td>
                        <td className="p-2 text-center font-mono font-bold text-stone-900">
                          {avgLogTemp} C
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* QA Verification & Sign-off */}
          <div className="border-2 border-stone-900 rounded-lg overflow-hidden mb-3 print:mb-1.5">
            <div className="bg-stone-900 text-white px-3 py-1 print:py-0.5 text-[10px] print:text-[9px] font-bold uppercase tracking-wider">
              Executive QA Sign-off & Controlled Audit Certification
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 print:grid-cols-3 divide-y md:divide-y-0 md:divide-x print:divide-y-0 print:divide-x border-t border-stone-900 text-xs">
              <div className="p-3 print:p-2 flex flex-col justify-between min-h-[110px] print:min-h-[80px]">
                <div>
                  <span className="text-[10px] print:text-[9px] font-bold uppercase text-stone-500 block">1. Central Kitchen QA Supervisor</span>
                  <p className="font-bold text-stone-900 mt-1 print:mt-0.5 text-xs print:text-[11px]">{generatedBy}</p>
                  <p className="text-[10px] print:text-[9px] text-stone-500 font-mono">Date: {filterPeriod}</p>
                </div>
                <div className="mt-4 print:mt-2 pt-2 print:pt-1 border-t border-dashed border-stone-400">
                  <span className="text-[10px] print:text-[9px] text-stone-400 block">Authorized Signature:</span>
                  <div className="h-6 print:h-5 border-b border-stone-300"></div>
                </div>
              </div>

              <div className="p-3 print:p-2 flex flex-col justify-between min-h-[110px] print:min-h-[80px]">
                <div>
                  <span className="text-[10px] print:text-[9px] font-bold uppercase text-stone-500 block">2. Central Kitchen Manager</span>
                  <p className="font-bold text-stone-900 mt-1 print:mt-0.5 text-xs print:text-[11px]">Head of Production</p>
                  <p className="text-[10px] print:text-[9px] text-stone-500 font-mono">Operations Sign-off</p>
                </div>
                <div className="mt-4 print:mt-2 pt-2 print:pt-1 border-t border-dashed border-stone-400">
                  <span className="text-[10px] print:text-[9px] text-stone-400 block">Manager Signature:</span>
                  <div className="h-6 print:h-5 border-b border-stone-300"></div>
                </div>
              </div>

              <div className="p-3 print:p-2 flex flex-col justify-between min-h-[110px] print:min-h-[80px]">
                <div>
                  <span className="text-[10px] print:text-[9px] font-bold uppercase text-stone-500 block">3. Quality Assurance Executive</span>
                  <p className="font-bold text-stone-900 mt-1 print:mt-0.5 text-xs print:text-[11px]">Lead HACCP Auditor</p>
                  <p className="text-[10px] print:text-[9px] text-stone-500 font-mono">HACCP Compliance Sign-off</p>
                </div>
                <div className="mt-4 print:mt-2 pt-2 print:pt-1 border-t border-dashed border-stone-400">
                  <span className="text-[10px] print:text-[9px] text-stone-400 block">QA Auditor Signature:</span>
                  <div className="h-6 print:h-5 border-b border-stone-300"></div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-3 pt-2 border-t border-stone-300 flex justify-between items-center text-[9px] text-stone-500 font-mono">
            <span>Barista Coffee Lanka (Pvt) Ltd. - Central Kitchen QA Operations</span>
            <span>Printed on: {new Date().toLocaleString()}</span>
            <span>Page 1 of 1</span>
          </div>
        </div>
      </div>
    </div>
  );
};
