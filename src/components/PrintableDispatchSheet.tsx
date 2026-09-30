import React from 'react';
import { Printer, X, Download } from 'lucide-react';
import { DispatchLog, DispatchLineItem } from '../types';
import { BaristaLogo } from './BaristaLogo';
import { DocumentHaccpHeader } from './DocumentHaccpHeader';
import { generateSingleDispatchPDF } from '../utils/pdfExport';
import { printHtmlElement, syncToPrintRoot, clearPrintRoot } from '../utils/printUtils';

interface PrintableDispatchSheetProps {
  dispatchLog: Partial<DispatchLog> & {
    items: DispatchLineItem[];
    outletNames: string[];
    date: string;
    dispatchTime: string;
    driverName: string;
    supervisor: string;
    outletName?: string;
  };
  onClose?: () => void;
  autoPrint?: boolean;
}

export const PrintableDispatchSheet: React.FC<PrintableDispatchSheetProps> = ({
  dispatchLog,
  onClose,
  autoPrint = false
}) => {
  const activeItems = dispatchLog.items.filter(item => item.quantity > 0);
  const totalUnits = activeItems.reduce((acc, item) => acc + item.quantity, 0);

  const getDocFilenameTitle = () => {
    let outlet = '';
    if (dispatchLog.outletNames && dispatchLog.outletNames.length > 0) {
      outlet = dispatchLog.outletNames[0];
    } else if (dispatchLog.outletName) {
      outlet = dispatchLog.outletName;
    } else {
      outlet = 'Outlet';
    }
    const cleanOutlet = outlet.replace(/[^a-zA-Z0-9_-]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
    const todayStr = new Date().toISOString().split('T')[0];
    return `Barista_Dispatch_${cleanOutlet}_${todayStr}`;
  };

  const handlePrint = () => {
    printHtmlElement('printable-dispatch-sheet-content', getDocFilenameTitle());
  };

  React.useEffect(() => {
    const syncTimer = setTimeout(() => {
      syncToPrintRoot('printable-dispatch-sheet-content');
    }, 50);

    let printTimer: any;
    if (autoPrint) {
      printTimer = setTimeout(() => {
        handlePrint();
      }, 400);
    }

    return () => {
      clearTimeout(syncTimer);
      if (printTimer) clearTimeout(printTimer);
      clearPrintRoot();
    };
  }, [dispatchLog, autoPrint]);

  return (
    <div className="printable-modal-overlay fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-sm flex justify-center p-2 sm:p-6 print:p-0 print:bg-white print:static print:inset-auto print:backdrop-blur-none">
      <div className="printable-card-container relative w-full max-w-4xl bg-[#171311] border border-[#382B25] text-stone-100 rounded-2xl shadow-2xl p-4 sm:p-6 print:p-0 print:border-none print:shadow-none print:rounded-none print:w-full print:max-w-none print:bg-white">
        
        {/* Screen Action Bar (Hidden in Print) */}
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-[#2C211C] print:hidden">
          <div className="flex items-center space-x-2.5">
            <BaristaLogo className="w-7 h-7 shadow-sm" />
            <span className="bg-[#ED5338]/15 text-[#FFA594] border border-[#ED5338]/30 text-xs px-2.5 py-1 rounded-md font-bold font-mono">
              HACCP BCL/REC/HACCP/32
            </span>
            <span className="text-xs text-stone-400 font-medium hidden sm:inline">
              Official Printed Dispatch Sheet (Selected Items Only)
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => generateSingleDispatchPDF(dispatchLog as any)}
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
            {onClose && (
              <button
                onClick={onClose}
                className="p-2 text-stone-400 hover:text-white rounded-xl border border-[#382B25] hover:bg-[#251D1A] transition cursor-pointer"
                title="Close Sheet"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* PRINTABLE OFFICIAL HACCP DOCUMENT */}
        <div id="printable-dispatch-sheet-content" className="print-content bg-white text-stone-900 rounded-xl p-5 sm:p-8 print:p-2 shadow-md print:shadow-none">
          
          <DocumentHaccpHeader
            title="Dispatch Log & Receipt"
            subtitle="Central Kitchen Cold-Chain Logistics & Dispatch Custody"
            docCode="BCL/REC/HACCP/32"
            effectiveDate={dispatchLog.date || "01 January 2025"}
            revision="Rev 01"
            version="01"
            approvedBy={dispatchLog.supervisor || "QA Executive"}
            refId={dispatchLog.docNo || dispatchLog.id || `DSP-${Date.now().toString().slice(-6)}`}
            haccpLink="OPRP-2 (Cold-Chain <= 5.0 C)"
            mandateNotice="CRITICAL CONTROL REQUIREMENT: Maximum dispatch transit temperature must remain <= 5.0 C"
            className="mb-4 print:mb-3.5"
            variant="paper"
          />

          {/* Delivery & Logistics Manifest Details */}
          <div className="border border-stone-300 rounded-lg p-3.5 print:p-3 mb-4 print:mb-3.5 bg-stone-50/60 text-xs">
            <div className="grid grid-cols-1 md:grid-cols-3 print:grid-cols-3 gap-3 print:gap-2.5">
              <div>
                <span className="text-stone-500 block text-[10px] uppercase font-semibold">Destination Outlets</span>
                <span className="font-bold text-stone-900 text-sm print:text-xs">
                  {dispatchLog.outletNames && dispatchLog.outletNames.length > 0 
                    ? dispatchLog.outletNames.join(', ')
                    : 'All Assigned Outlets'}
                </span>
              </div>
              <div>
                <span className="text-stone-500 block text-[10px] uppercase font-semibold">Date & Dispatch Time</span>
                <span className="font-mono font-bold text-stone-900 text-sm print:text-xs">
                  {dispatchLog.date} @ {dispatchLog.dispatchTime} hrs
                </span>
              </div>
              <div>
                <span className="text-stone-500 block text-[10px] uppercase font-semibold">Assigned Dispatch Driver</span>
                <span className="font-bold text-stone-900 text-sm print:text-xs">
                  {dispatchLog.driverName}
                </span>
              </div>
            </div>
            <div className="mt-2 pt-2 border-t border-stone-200 grid grid-cols-1 md:grid-cols-2 print:grid-cols-2 gap-2 text-[11px] print:text-[10px]">
              <div>
                <span className="text-stone-500">Dispatch QA / Supervisor: </span>
                <strong className="text-stone-900">{dispatchLog.supervisor}</strong>
                {dispatchLog.supervisorId && (
                  <span className="text-stone-500 font-mono ml-1">({dispatchLog.supervisorId})</span>
                )}
              </div>
              {dispatchLog.notes && (
                <div>
                  <span className="text-stone-500">Transit Notes: </span>
                  <span className="text-stone-800 italic">{dispatchLog.notes}</span>
                </div>
              )}
            </div>
          </div>

          {/* Selected Dispatches Table */}
          <div className="mb-4 print:mb-3.5">
            <div className="flex items-center justify-between mb-1.5 print:mb-1">
              <span className="text-xs font-black uppercase tracking-wider text-stone-800">
                Dispatched Kitchen Line Items ({activeItems.length} Products)
              </span>
              <span className="text-[10px] text-stone-500 font-mono">
                Printed only items with quantity &gt; 0
              </span>
            </div>

            {activeItems.length === 0 ? (
              <div className="border border-stone-300 p-8 text-center text-xs text-stone-500 italic">
                No products with quantity &gt; 0 selected for dispatch.
              </div>
            ) : (
              <table className="w-full text-left text-xs border-collapse border border-stone-900 rounded-lg overflow-hidden">
                <thead>
                  <tr className="bg-stone-100 text-stone-900 border-b-2 border-stone-900 font-bold uppercase text-[10px] tracking-wider">
                    <th className="p-2 border-r border-stone-400 w-8 text-center">#</th>
                    <th className="p-2 border-r border-stone-400">Product Description</th>
                    <th className="p-2 border-r border-stone-400 w-28">Batch No</th>
                    <th className="p-2 border-r border-stone-400 w-20 text-center">Dispatch Time</th>
                    <th className="p-2 border-r border-stone-400 w-24">Prod Date</th>
                    <th className="p-2 border-r border-stone-400 w-24">Expiration Date</th>
                    <th className="p-2 border-r border-stone-400 w-20 text-center">Qty (Units)</th>
                    <th className="p-2 w-24 text-center">Dispatch Temp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-300">
                  {activeItems.map((item, index) => (
                    <tr key={item.id || index} className="text-stone-900">
                      <td className="p-2 border-r border-stone-300 text-center font-mono font-bold text-stone-500">
                        {index + 1}
                      </td>
                      <td className="p-2 border-r border-stone-300 font-bold">
                        {item.productName}
                      </td>
                      <td className="p-2 border-r border-stone-300 font-mono font-semibold text-stone-800">
                        {item.batchNo || 'N/A'}
                      </td>
                      <td className="p-2 border-r border-stone-300 text-center font-mono">
                        {item.dispatchTime || dispatchLog.dispatchTime}
                      </td>
                      <td className="p-2 border-r border-stone-300 font-mono text-stone-700">
                        {item.prodDate || '-'}
                      </td>
                      <td className="p-2 border-r border-stone-300 font-mono text-stone-700">
                        {item.useByDate || '-'}
                      </td>
                      <td className="p-2 border-r border-stone-300 text-center font-mono font-bold text-sm bg-stone-50/70">
                        {item.quantity}
                      </td>
                      <td className="p-2 text-center font-mono font-bold text-stone-900">
                        {item.dispatchTemp.toFixed(1)} C
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-stone-900 bg-stone-100 font-bold text-xs text-stone-900">
                    <td colSpan={6} className="p-2 text-right uppercase tracking-wider">
                      Total Dispatched Output:
                    </td>
                    <td className="p-2 border-r border-l border-stone-900 text-center font-mono text-sm bg-stone-200 font-black">
                      {totalUnits} Units
                    </td>
                    <td className="p-2 text-center font-mono text-xs">
                      {activeItems.length > 0 ? (activeItems.reduce((s, i) => s + i.dispatchTemp, 0) / activeItems.length).toFixed(1) : '-'} C avg
                    </td>
                  </tr>
                </tfoot>
              </table>
            )}
          </div>

          {/* Official 3-Party Sign-off Matrix */}
          <div className="border-2 border-stone-900 rounded-lg overflow-hidden mb-3 print:mb-3">
            <div className="bg-stone-900 text-white px-3 py-1 text-[10px] print:text-[9.5px] font-bold uppercase tracking-wider">
              Verification & Custody Handover Sign-Off (Strict HACCP Audit Protocol)
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 print:grid-cols-3 divide-y md:divide-y-0 md:divide-x print:divide-y-0 print:divide-x border-t border-stone-900 text-xs">
              
              <div className="p-3 flex flex-col justify-between min-h-[110px] print:min-h-[100px]">
                <div>
                  <span className="text-[10px] font-bold uppercase text-stone-500 block">
                    1. Central Kitchen Dispatch QA
                  </span>
                  <p className="font-bold text-stone-900 mt-1 text-xs">{dispatchLog.supervisor}</p>
                  <p className="text-[10px] text-stone-500 font-mono">Date: {dispatchLog.date} @ {dispatchLog.dispatchTime}</p>
                </div>
                <div className="mt-4 pt-2 border-t border-dashed border-stone-400">
                  <span className="text-[10px] text-stone-400 block">Authorized Signature:</span>
                  <div className="h-6 border-b border-stone-300"></div>
                </div>
              </div>

              <div className="p-3 flex flex-col justify-between min-h-[110px] print:min-h-[100px]">
                <div>
                  <span className="text-[10px] font-bold uppercase text-stone-500 block">
                    2. Cold-Chain Transport Driver
                  </span>
                  <p className="font-bold text-stone-900 mt-1 text-xs">{dispatchLog.driverName}</p>
                  <p className="text-[10px] text-stone-500 font-mono">Vehicle: {dispatchLog.vehicleNo || 'WP CAD-4291'}</p>
                </div>
                <div className="mt-4 pt-2 border-t border-dashed border-stone-400">
                  <span className="text-[10px] text-stone-400 block">Driver Acceptance Signature:</span>
                  <div className="h-6 border-b border-stone-300"></div>
                </div>
              </div>

              <div className="p-3 flex flex-col justify-between min-h-[110px] print:min-h-[100px]">
                <div>
                  <span className="text-[10px] font-bold uppercase text-stone-500 block">
                    3. Retail Store Receiving Barista
                  </span>
                  <p className="font-bold text-stone-900 mt-1 text-xs">Branch Receiving Barista</p>
                  <p className="text-[10px] text-stone-500 font-mono">Temp on Arrival: _____ C</p>
                </div>
                <div className="mt-4 pt-2 border-t border-dashed border-stone-400">
                  <span className="text-[10px] text-stone-400 block">Store Stamp & Signature:</span>
                  <div className="h-6 border-b border-stone-300"></div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-3 print:mt-2 pt-2 border-t border-stone-300 flex justify-between items-center text-[9px] text-stone-500 font-mono">
            <span>Barista Coffee Lanka - BCL/REC/HACCP/32 - Controlled Document</span>
            <span>Printed on: {new Date().toLocaleString()}</span>
            <span>Page 1 of 1</span>
          </div>
        </div>
      </div>
    </div>
  );
};
