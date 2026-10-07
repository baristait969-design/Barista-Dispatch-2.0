import React from 'react';
import { DispatchLog } from '../types';
import { DocumentHaccpHeader } from './DocumentHaccpHeader';
import { getDispatchDocumentName } from '../utils/dispatchNumberUtils';

export interface MonthlyDispatchReportSheetProps {
  containerId?: string;
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
}

export const MonthlyDispatchReportSheet: React.FC<MonthlyDispatchReportSheetProps> = ({
  containerId = 'printable-executive-report-content',
  logs,
  stats,
  generatedBy,
  filterPeriod
}) => {
  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <div
      id={containerId}
      className="print-content bg-white text-stone-900 rounded-xl p-5 sm:p-8 print:p-2 shadow-md print:shadow-none"
      style={{ minWidth: '980px', backgroundColor: '#ffffff', color: '#1c1917' }}
    >
      {/* Official Operations Header - Without HACCP links */}
      <DocumentHaccpHeader
        title="Monthly Dispatch Log & Summary"
        subtitle="Central Kitchen Production & Retail Logistics Report"
        docCode="BCL/REP/DISP/01"
        systemCategory="Central Kitchen Logistics & Dispatch Operations"
        hideHaccpLink={true}
        effectiveDate={filterPeriod || 'Current Month Cycle'}
        revision="Rev 01"
        version="01"
        approvedBy={generatedBy || 'Barista IT Administrator'}
        refId={`DSP-${stats.totalDispatches}-SUM`}
        className="mb-4 print:mb-3"
        variant="paper"
      />

      {/* Operational Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2.5 mb-4">
        <div className="border-2 border-stone-900 rounded-lg p-2.5 bg-stone-50 text-center">
          <span className="text-[9.5px] uppercase font-bold text-stone-600 block">Total Dispatches</span>
          <span className="text-lg font-mono font-black text-stone-900 mt-0.5 block">{stats.totalDispatches}</span>
          <span className="text-[9px] text-stone-500 font-medium">Recorded Trips</span>
        </div>
        <div className="border-2 border-stone-900 rounded-lg p-2.5 bg-stone-50 text-center">
          <span className="text-[9.5px] uppercase font-bold text-stone-600 block">Total Output</span>
          <span className="text-lg font-mono font-black text-stone-900 mt-0.5 block">{stats.totalUnitsDispatched} Units</span>
          <span className="text-[9px] text-stone-500 font-medium">Pastry & Kitchen</span>
        </div>
        <div className="border-2 border-stone-900 rounded-lg p-2.5 bg-stone-50 text-center">
          <span className="text-[9.5px] uppercase font-bold text-stone-600 block">Active Outlets</span>
          <span className="text-lg font-mono font-black text-stone-900 mt-0.5 block">{stats.outletsCount}</span>
          <span className="text-[9px] text-stone-500 font-medium">Branches Served</span>
        </div>
        <div className="border-2 border-stone-900 rounded-lg p-2.5 bg-stone-50 text-center">
          <span className="text-[9.5px] uppercase font-bold text-stone-600 block">Avg Dispatch Temp</span>
          <span className="text-lg font-mono font-black text-stone-900 mt-0.5 block">{stats.averageTemp} °C</span>
          <span className="text-[9px] text-stone-500 font-medium">Transit Standard</span>
        </div>
        <div className="col-span-2 md:col-span-1 border-2 border-stone-900 rounded-lg p-2.5 bg-stone-50 text-center">
          <span className="text-[9.5px] uppercase font-bold text-stone-600 block">Reporting Period</span>
          <span className="text-xs font-mono font-bold text-stone-900 mt-1 block truncate" title={filterPeriod}>
            {filterPeriod}
          </span>
          <span className="text-[9px] text-stone-500 font-medium">Monthly Cycle</span>
        </div>
      </div>

      {/* Dispatches Table */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs font-black uppercase tracking-wider text-stone-900 font-mono">
            Itemized Monthly Dispatch Records ({logs.length} Total Deliveries)
          </span>
          <span className="text-[10px] text-stone-600 font-mono font-bold">
            Cycle: {filterPeriod}
          </span>
        </div>

        {logs.length === 0 ? (
          <div className="border-2 border-stone-900 p-8 text-center text-xs text-stone-500 italic rounded-lg">
            No dispatch logs available for the selected period.
          </div>
        ) : (
          <div className="overflow-x-auto border-2 border-stone-900 rounded-lg">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-stone-900 text-white font-bold uppercase text-[10px] tracking-wider">
                  <th className="p-2.5 border-r border-stone-700 w-8 text-center">#</th>
                  <th className="p-2.5 border-r border-stone-700 w-28 text-center">Document No</th>
                  <th className="p-2.5 border-r border-stone-700 w-36 text-center">Destination Outlet</th>
                  <th className="p-2.5 border-r border-stone-700 w-32 text-center">Dispatch Driver</th>
                  <th className="p-2.5 border-r border-stone-700 w-32 text-center">Supervisor</th>
                  <th className="p-2.5 border-r border-stone-700 min-w-[240px] text-left pl-3">Product Breakdown</th>
                  <th className="p-2.5 border-r border-stone-700 w-28 text-center">Output</th>
                  <th className="p-2.5 w-24 text-center">Dispatch Temp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-900">
                {logs.map((log, index) => {
                  const rawDocName = log.documentName || getDispatchDocumentName(log);
                  // Document No ONLY - clean any trailing or embedded date values
                  const cleanDocNo = rawDocName
                    .replace(/[-_/\s]*\(?\d{4}[-/.]\d{2}[-/.]\d{2}\)?.*$/i, '')
                    .trim() || `DSP-${String(index + 1).padStart(4, '0')}`;

                  const activeItems = (log.items || []).filter(i => (i.quantity || 0) > 0);
                  const temps = activeItems.map(i => i.dispatchTemp);
                  const avgLogTemp = temps.length > 0 
                    ? (temps.reduce((a, b) => a + b, 0) / temps.length).toFixed(1) 
                    : '3.5';

                  // Aggregate quantities per unique product name (no duplicates)
                  const aggregatedMap = new Map<string, { productName: string; quantity: number; unit: string }>();
                  activeItems.forEach(item => {
                    const normKey = item.productName.trim().toLowerCase();
                    const existing = aggregatedMap.get(normKey);
                    if (existing) {
                      existing.quantity += (Number(item.quantity) || 0);
                    } else {
                      aggregatedMap.set(normKey, {
                        productName: item.productName.trim(),
                        quantity: Number(item.quantity) || 0,
                        unit: (item as any).unit || 'Units'
                      });
                    }
                  });
                  const aggregatedItems = Array.from(aggregatedMap.values());

                  return (
                    <tr key={log.id || index} className="text-stone-900 hover:bg-stone-50 transition">
                      <td className="p-2.5 border-r border-stone-300 text-center font-mono font-bold text-stone-600 align-middle">
                        {index + 1}
                      </td>

                      {/* Document No only - centered, without dates */}
                      <td className="p-2.5 border-r border-stone-300 text-center font-mono font-bold text-stone-950 text-xs align-middle">
                        {cleanDocNo}
                      </td>

                      {/* Destination Outlet - centered */}
                      <td className="p-2.5 border-r border-stone-300 text-center font-bold text-xs align-middle">
                        <div className="text-stone-950">
                          {log.outletNames && log.outletNames.length > 0 ? log.outletNames.join(', ') : 'All Outlets'}
                        </div>
                      </td>

                      {/* Driver - centered */}
                      <td className="p-2.5 border-r border-stone-300 text-center text-xs align-middle">
                        <div className="font-semibold text-stone-900">{log.driverName}</div>
                      </td>

                      {/* Supervisor - centered */}
                      <td className="p-2.5 border-r border-stone-300 text-center text-xs align-middle">
                        <div className="font-medium text-stone-900">{log.supervisor}</div>
                      </td>

                      {/* Product Breakdown - left aligned, arranged vertically one by one, no duplicates */}
                      <td className="p-2.5 border-r border-stone-300 text-xs align-middle pl-3 min-w-[240px]">
                        {aggregatedItems.length === 0 ? (
                          <div className="text-stone-400 italic text-[11px]">No items recorded</div>
                        ) : (
                          <div className="space-y-2 py-0.5">
                            {aggregatedItems.map((item, itemIdx) => (
                              <div 
                                key={itemIdx} 
                                className="text-xs font-semibold text-stone-950 text-left py-0.5"
                              >
                                {item.productName}
                              </div>
                            ))}
                          </div>
                        )}
                      </td>

                      {/* Output - total count in front of each product, centered */}
                      <td className="p-2.5 border-r border-stone-300 text-center font-mono text-xs bg-stone-50/60 align-middle">
                        {aggregatedItems.length === 0 ? (
                          <span className="text-stone-400 text-[11px]">0 Units</span>
                        ) : (
                          <div className="space-y-2 py-0.5">
                            {aggregatedItems.map((item, itemIdx) => (
                              <div 
                                key={itemIdx} 
                                className="text-xs font-bold text-stone-900 py-0.5"
                              >
                                {item.quantity} <span className="text-[10px] text-stone-600 font-normal">{item.unit}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </td>

                      {/* Dispatch Temp - centered */}
                      <td className="p-2.5 text-center font-mono font-bold text-xs text-stone-900 align-middle">
                        {avgLogTemp} °C
                      </td>
                    </tr>
                  );
                })}
              </tbody>

              {/* Summary Footer Row */}
              <tfoot>
                <tr className="bg-stone-100 border-t-2 border-stone-900 font-bold text-xs">
                  <td colSpan={5} className="p-2.5 text-center font-mono font-bold text-stone-900 border-r border-stone-300 uppercase tracking-wider">
                    TOTAL DISPATCHED OUTPUT ACROSS ALL OUTLETS:
                  </td>
                  <td className="p-2.5 text-left pl-3 font-mono text-[11px] text-stone-600 border-r border-stone-300">
                    {stats.totalDispatches} Total Deliveries
                  </td>
                  <td className="p-2.5 text-center font-mono font-black text-sm text-stone-950 bg-stone-200 border-r border-stone-300">
                    {stats.totalUnitsDispatched} <span className="text-[10px] font-normal">Units</span>
                  </td>
                  <td className="p-2.5 text-center font-mono font-bold text-xs text-stone-900">
                    {stats.averageTemp} °C avg
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* Operational Sign-off & Controlled Certification */}
      <div className="border-2 border-stone-900 rounded-lg overflow-hidden mb-3 print:mb-1.5">
        <div className="bg-stone-900 text-white px-3 py-1 print:py-0.5 text-[10px] print:text-[9px] font-bold uppercase tracking-wider">
          Executive Dispatch & Operations Sign-off
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 print:grid-cols-3 divide-y md:divide-y-0 md:divide-x print:divide-y-0 print:divide-x border-t border-stone-900 text-xs">
          <div className="p-3 print:p-2 flex flex-col justify-between min-h-[105px] print:min-h-[75px]">
            <div>
              <span className="text-[10px] print:text-[9px] font-bold uppercase text-stone-500 block">
                1. Central Kitchen Dispatch Supervisor
              </span>
              <p className="font-bold text-stone-900 mt-1 print:mt-0.5 text-xs print:text-[11px]">
                {generatedBy}
              </p>
              <p className="text-[10px] print:text-[9px] text-stone-500 font-mono">Date: {todayStr}</p>
            </div>
            <div className="mt-3 print:mt-2 pt-2 print:pt-1 border-t border-dashed border-stone-400">
              <span className="text-[10px] print:text-[9px] text-stone-400 block">Authorized Signature:</span>
              <div className="h-5 print:h-4 border-b border-stone-300"></div>
            </div>
          </div>

          <div className="p-3 print:p-2 flex flex-col justify-between min-h-[105px] print:min-h-[75px]">
            <div>
              <span className="text-[10px] print:text-[9px] font-bold uppercase text-stone-500 block">
                2. Central Kitchen Manager
              </span>
              <p className="font-bold text-stone-900 mt-1 print:mt-0.5 text-xs print:text-[11px]">Head of Production</p>
              <p className="text-[10px] print:text-[9px] text-stone-500 font-mono">Operations Sign-off</p>
            </div>
            <div className="mt-3 print:mt-2 pt-2 print:pt-1 border-t border-dashed border-stone-400">
              <span className="text-[10px] print:text-[9px] text-stone-400 block">Manager Signature:</span>
              <div className="h-5 print:h-4 border-b border-stone-300"></div>
            </div>
          </div>

          <div className="p-3 print:p-2 flex flex-col justify-between min-h-[105px] print:min-h-[75px]">
            <div>
              <span className="text-[10px] print:text-[9px] font-bold uppercase text-stone-500 block">
                3. Quality Assurance & Logistics Executive
              </span>
              <p className="font-bold text-stone-900 mt-1 print:mt-0.5 text-xs print:text-[11px]">QA Executive</p>
              <p className="text-[10px] print:text-[9px] text-stone-500 font-mono">Verification Sign-off</p>
            </div>
            <div className="mt-3 print:mt-2 pt-2 print:pt-1 border-t border-dashed border-stone-400">
              <span className="text-[10px] print:text-[9px] text-stone-400 block">QA Signature:</span>
              <div className="h-5 print:h-4 border-b border-stone-300"></div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-2 pt-2 border-t border-stone-300 flex justify-between items-center text-[9px] text-stone-500 font-mono">
        <span>Barista Coffee Lanka (Pvt) Ltd. - Central Kitchen Monthly Dispatch Summary & Audit Record</span>
        <span>Printed on: {new Date().toLocaleString()}</span>
        <span>Page 1 of 1</span>
      </div>
    </div>
  );
};
