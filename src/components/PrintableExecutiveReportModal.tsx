import React from 'react';
import { Printer, X } from 'lucide-react';
import { DispatchLog } from '../types';
import { BaristaLogo } from './BaristaLogo';
import { MonthlyExecutiveReportDocument } from './MonthlyExecutiveReportDocument';
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
  autoDownload?: boolean;
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
    printHtmlElement('printable-executive-report-content', `Barista_Monthly_Dispatch_Report_${todayStr}`);
  };

  React.useEffect(() => {
    const timer = setTimeout(() => {
      syncToPrintRoot('printable-executive-report-content');
    }, 250);
    return () => {
      clearTimeout(timer);
      clearPrintRoot();
    };
  }, [logs, stats, generatedBy, filterPeriod]);

  return (
    <div className="printable-modal-overlay fixed inset-0 z-50 overflow-y-auto bg-black/85 backdrop-blur-sm flex justify-center p-2 sm:p-6 print:p-0 print:bg-white print:static print:inset-auto print:backdrop-blur-none">
      <div className="printable-card-container relative w-full max-w-4xl bg-[#171311] border border-[#382B25] text-stone-100 rounded-2xl shadow-2xl p-4 sm:p-6 print:p-0 print:border-none print:shadow-none print:rounded-none print:w-full print:max-w-none print:bg-white">
        
        {/* Modal Top Action Bar */}
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-[#2C211C] print:hidden">
          <div className="flex items-center space-x-2.5">
            <BaristaLogo className="w-8 h-8 shadow-sm" />
            <div>
              <div className="flex items-center space-x-2">
                <span className="bg-[#ED5338]/15 text-[#FFA594] border border-[#ED5338]/30 text-xs px-2.5 py-0.5 rounded-md font-bold font-mono">
                  MONTHLY DISPATCH REPORT
                </span>
                <span className="text-xs text-white font-bold">
                  {filterPeriod || 'Current Month Cycle'}
                </span>
              </div>
              <p className="text-[11px] text-stone-400 mt-0.5">
                Central Kitchen Consolidated Delivery Manifest & Outlet Distribution Log
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
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
              title="Close Preview"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* PRINTABLE CONTENT CONTAINER */}
        <div className="overflow-x-auto print:overflow-visible">
          <MonthlyExecutiveReportDocument
            logs={logs}
            stats={stats}
            generatedBy={generatedBy}
            filterPeriod={filterPeriod}
            id="printable-executive-report-content"
          />
        </div>
      </div>
    </div>
  );
};
