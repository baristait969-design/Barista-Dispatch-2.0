import React from 'react';
import { DispatchLog } from '../types';
import { BaristaLogo } from './BaristaLogo';
import { DocumentHaccpHeader } from './DocumentHaccpHeader';
import { getDispatchDocumentName } from '../utils/dispatchNumberUtils';

export interface MonthlyExecutiveReportDocumentProps {
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
  id?: string;
  className?: string;
}

/**
 * Canonical Single-Source-of-Truth A4 Portrait Monthly Dispatch Report Document.
 * Used for BOTH visual preview, browser native printing, and high-fidelity PDF download.
 * Ensures 100% exact style, layout, font, and structural parity across printed and downloaded versions.
 */
export const MonthlyExecutiveReportDocument: React.FC<MonthlyExecutiveReportDocumentProps> = ({
  logs,
  stats,
  generatedBy,
  filterPeriod,
  id = 'printable-executive-report-content',
  className = ''
}) => {
  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <div
      id={id}
      className={`print-content bg-white text-[#1c1917] w-full max-w-[794px] min-h-[1123px] p-4 sm:p-6 print:p-2 box-border mx-auto rounded-xl print:rounded-none shadow-md print:shadow-none ${className}`}
      style={{
        boxSizing: 'border-box',
        color: '#1c1917',
        backgroundColor: '#ffffff'
      }}
    >
      {/* 1. Official Header */}
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
        className="mb-3 print:mb-2.5"
        variant="paper"
      />

      {/* 2. Operational Metrics Grid */}
      <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 mb-3.5">
        <div className="border-2 border-[#1c1917] rounded-lg p-2 bg-[#fafaf9] text-center flex flex-col justify-between min-h-[64px]" style={{ borderColor: '#1c1917', backgroundColor: '#fafaf9' }}>
          <span className="text-[8.5px] uppercase font-bold block leading-tight" style={{ color: '#57534e' }}>Total Dispatches</span>
          <span className="text-base font-mono font-black my-0.5 block leading-tight" style={{ color: '#1c1917' }}>{stats.totalDispatches}</span>
          <span className="text-[8px] font-medium block leading-tight" style={{ color: '#78716c' }}>Recorded Trips</span>
        </div>
        <div className="border-2 border-[#1c1917] rounded-lg p-2 bg-[#fafaf9] text-center flex flex-col justify-between min-h-[64px]" style={{ borderColor: '#1c1917', backgroundColor: '#fafaf9' }}>
          <span className="text-[8.5px] uppercase font-bold block leading-tight" style={{ color: '#57534e' }}>Total Output</span>
          <span className="text-base font-mono font-black my-0.5 block leading-tight" style={{ color: '#1c1917' }}>{stats.totalUnitsDispatched} Units</span>
          <span className="text-[8px] font-medium block leading-tight" style={{ color: '#78716c' }}>Pastry & Kitchen</span>
        </div>
        <div className="border-2 border-[#1c1917] rounded-lg p-2 bg-[#fafaf9] text-center flex flex-col justify-between min-h-[64px]" style={{ borderColor: '#1c1917', backgroundColor: '#fafaf9' }}>
          <span className="text-[8.5px] uppercase font-bold block leading-tight" style={{ color: '#57534e' }}>Active Outlets</span>
          <span className="text-base font-mono font-black my-0.5 block leading-tight" style={{ color: '#1c1917' }}>{stats.outletsCount}</span>
          <span className="text-[8px] font-medium block leading-tight" style={{ color: '#78716c' }}>Branches</span>
        </div>
        <div className="border-2 border-[#1c1917] rounded-lg p-2 bg-[#fafaf9] text-center flex flex-col justify-between min-h-[64px]" style={{ borderColor: '#1c1917', backgroundColor: '#fafaf9' }}>
          <span className="text-[8.5px] uppercase font-bold block leading-tight" style={{ color: '#57534e' }}>Avg Temp</span>
          <span className="text-base font-mono font-black my-0.5 block leading-tight" style={{ color: '#1c1917' }}>{stats.averageTemp} °C</span>
          <span className="text-[8px] font-medium block leading-tight" style={{ color: '#78716c' }}>Transit Standard</span>
        </div>
        <div className="col-span-2 sm:col-span-1 border-2 border-[#1c1917] rounded-lg p-2 bg-[#fafaf9] text-center flex flex-col justify-between min-h-[64px]" style={{ borderColor: '#1c1917', backgroundColor: '#fafaf9' }}>
          <span className="text-[8.5px] uppercase font-bold block leading-tight" style={{ color: '#57534e' }}>Reporting Period</span>
          <span className="text-[11.5px] font-mono font-bold my-0.5 block leading-tight" style={{ color: '#1c1917' }} title={filterPeriod}>
            {filterPeriod}
          </span>
          <span className="text-[8px] font-medium block leading-tight" style={{ color: '#78716c' }}>Monthly Cycle</span>
        </div>
      </div>

      {/* 3. Table of Dispatches */}
      <div className="mb-3.5">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px] font-black uppercase tracking-wider font-mono" style={{ color: '#1c1917' }}>
            Itemized Monthly Dispatch Records ({logs.length} Total Deliveries)
          </span>
          <span className="text-[9.5px] font-mono font-bold" style={{ color: '#57534e' }}>
            Cycle: {filterPeriod}
          </span>
        </div>

        {logs.length === 0 ? (
          <div className="border-2 border-[#1c1917] p-6 text-center text-xs italic rounded-lg" style={{ borderColor: '#1c1917', color: '#78716c' }}>
            No dispatch logs available for the selected period.
          </div>
        ) : (
          <div className="border-2 border-[#1c1917] rounded-lg overflow-hidden" style={{ borderColor: '#1c1917', backgroundColor: '#ffffff' }}>
            <table className="w-full text-left text-[10px] border-collapse" style={{ borderColor: '#1c1917', borderCollapse: 'collapse', tableLayout: 'fixed', width: '100%' }}>
              <thead>
                <tr className="bg-[#1c1917] text-white font-bold uppercase text-[9px] tracking-wider" style={{ backgroundColor: '#1c1917', color: '#ffffff', borderBottom: '2px solid #1c1917' }}>
                  <th className="p-2 border-r border-[#44403c] text-center" style={{ borderColor: '#44403c', color: '#ffffff', width: '24px' }}>#</th>
                  <th className="p-2 border-r border-[#44403c] text-center" style={{ borderColor: '#44403c', color: '#ffffff', width: '72px' }}>Doc No</th>
                  <th className="p-2 border-r border-[#44403c] text-center" style={{ borderColor: '#44403c', color: '#ffffff', width: '85px' }}>Destination</th>
                  <th className="p-2 border-r border-[#44403c] text-center" style={{ borderColor: '#44403c', color: '#ffffff', width: '75px' }}>Driver</th>
                  <th className="p-2 border-r border-[#44403c] text-center" style={{ borderColor: '#44403c', color: '#ffffff', width: '80px' }}>Supervisor</th>
                  <th className="p-2 border-r border-[#44403c] text-left pl-2.5" style={{ borderColor: '#44403c', color: '#ffffff' }}>Product Breakdown</th>
                  <th className="p-2 border-r border-[#44403c] text-center" style={{ borderColor: '#44403c', color: '#ffffff', width: '70px' }}>Output</th>
                  <th className="p-2 text-center" style={{ color: '#ffffff', width: '48px' }}>Temp</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log, index) => {
                  const docName = log.documentName || getDispatchDocumentName(log);
                  const activeItems = (log.items || []).filter(i => (i.quantity || 0) > 0);
                  const temps = activeItems.map(i => i.dispatchTemp);
                  const avgLogTemp = temps.length > 0 
                    ? (temps.reduce((a, b) => a + b, 0) / temps.length).toFixed(1) 
                    : '3.5';

                  // Aggregate quantities per product to remove duplicates
                  const aggregatedMap = new Map<string, { productName: string; quantity: number; unit: string }>();
                  activeItems.forEach(item => {
                    const normName = item.productName.trim();
                    const existing = aggregatedMap.get(normName);
                    if (existing) {
                      existing.quantity += (item.quantity || 0);
                    } else {
                      aggregatedMap.set(normName, {
                        productName: item.productName,
                        quantity: item.quantity || 0,
                        unit: (item as any).unit || 'Units'
                      });
                    }
                  });
                  const aggregatedItems = Array.from(aggregatedMap.values());

                  return (
                    <tr 
                      key={log.id || index} 
                      className="text-[#1c1917] hover:bg-[#fafaf9] transition" 
                      style={{ borderBottom: '1px solid #1c1917', color: '#1c1917' }}
                    >
                      <td className="p-2 text-center font-mono font-bold align-middle text-[10px]" style={{ borderRight: '1px solid #d6d3d1', borderBottom: '1px solid #1c1917', color: '#57534e', width: '24px' }}>
                        {index + 1}
                      </td>

                      {/* Document Number */}
                      <td className="p-2 text-center font-mono font-bold text-[10px] align-middle" style={{ borderRight: '1px solid #d6d3d1', borderBottom: '1px solid #1c1917', color: '#0c0a09', width: '72px' }}>
                        {docName}
                      </td>

                      <td className="p-2 text-center font-bold text-[10px] align-middle" style={{ borderRight: '1px solid #d6d3d1', borderBottom: '1px solid #1c1917', color: '#0c0a09', width: '85px' }}>
                        <div style={{ color: '#0c0a09' }}>
                          {log.outletNames && log.outletNames.length > 0 ? log.outletNames.join(', ') : 'All Outlets'}
                        </div>
                      </td>

                      <td className="p-2 text-center text-[9.5px] align-middle" style={{ borderRight: '1px solid #d6d3d1', borderBottom: '1px solid #1c1917', color: '#1c1917', width: '75px' }}>
                        <div className="font-semibold" style={{ color: '#1c1917' }}>{log.driverName}</div>
                      </td>

                      <td className="p-2 text-center text-[9.5px] align-middle" style={{ borderRight: '1px solid #d6d3d1', borderBottom: '1px solid #1c1917', color: '#1c1917', width: '80px' }}>
                        <div className="font-medium" style={{ color: '#1c1917' }}>{log.supervisor}</div>
                      </td>

                      {/* Product Breakdown */}
                      <td className="p-2 text-[10px] align-middle pl-2.5" style={{ borderRight: '1px solid #d6d3d1', borderBottom: '1px solid #1c1917' }}>
                        {aggregatedItems.length === 0 ? (
                          <div className="italic text-[10px]" style={{ color: '#a8a29e' }}>No items recorded</div>
                        ) : (
                          <div className="space-y-1 py-0.5">
                            {aggregatedItems.map((item, itemIdx) => (
                              <div 
                                key={itemIdx} 
                                className="text-[10px] font-semibold text-left py-0.5 leading-snug whitespace-nowrap"
                                style={{ color: '#0c0a09', minHeight: '18px', display: 'flex', alignItems: 'center' }}
                              >
                                {item.productName}
                              </div>
                            ))}
                          </div>
                        )}
                      </td>

                      {/* Output Column */}
                      <td className="p-2 text-center font-mono text-[10px] bg-white align-middle" style={{ borderRight: '1px solid #d6d3d1', borderBottom: '1px solid #1c1917', backgroundColor: '#ffffff', color: '#1c1917', width: '70px' }}>
                        {aggregatedItems.length === 0 ? (
                          <span className="text-[10px]" style={{ color: '#a8a29e' }}>0 Units</span>
                        ) : (
                          <div className="space-y-1 py-0.5 flex flex-col justify-center items-center">
                            {aggregatedItems.map((item, itemIdx) => (
                              <div 
                                key={itemIdx} 
                                className="text-[10px] font-bold py-0.5 leading-snug"
                                style={{ color: '#1c1917', minHeight: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                              >
                                {item.quantity} <span className="text-[8.5px] font-normal ml-1" style={{ color: '#57534e' }}>{item.unit}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </td>

                      <td className="p-2 text-center font-mono font-bold text-[10px] align-middle" style={{ borderBottom: '1px solid #1c1917', color: '#1c1917', width: '48px' }}>
                        {avgLogTemp} °C
                      </td>
                    </tr>
                  );
                })}
              </tbody>

              {/* Summary Footer Row */}
              <tfoot>
                <tr className="bg-[#f5f5f4] font-bold text-[10.5px]" style={{ backgroundColor: '#f5f5f4', color: '#1c1917' }}>
                  <td colSpan={5} className="p-2 text-center font-mono font-bold" style={{ borderTop: '2px solid #1c1917', borderRight: '1px solid #d6d3d1', color: '#1c1917' }}>
                    <span className="uppercase tracking-wider text-[9.5px]">TOTAL OUTPUT ACROSS ALL OUTLETS:</span>
                  </td>
                  <td className="p-2 text-left pl-2.5 font-mono text-[10px]" style={{ borderTop: '2px solid #1c1917', borderRight: '1px solid #d6d3d1', color: '#57534e' }}>
                    {stats.totalDispatches} Deliveries
                  </td>
                  <td className="p-2 text-center font-mono font-black text-xs bg-[#e7e5e4]" style={{ borderTop: '2px solid #1c1917', borderRight: '1px solid #d6d3d1', backgroundColor: '#e7e5e4', color: '#0c0a09', width: '75px' }}>
                    {stats.totalUnitsDispatched} <span className="text-[9px] font-normal" style={{ color: '#57534e' }}>Units</span>
                  </td>
                  <td className="p-2 text-center font-mono font-bold text-[10.5px]" style={{ borderTop: '2px solid #1c1917', color: '#1c1917', width: '58px' }}>
                    {stats.averageTemp} °C
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* 4. Operational Sign-off & Controlled Certification */}
      <div className="border-2 border-[#1c1917] rounded-lg overflow-hidden mb-2.5 print:mb-1.5" style={{ borderColor: '#1c1917', backgroundColor: '#ffffff' }}>
        <div className="bg-[#1c1917] text-white px-2.5 py-1 print:py-0.5 text-[9.5px] print:text-[8.5px] font-bold uppercase tracking-wider" style={{ backgroundColor: '#1c1917', color: '#ffffff' }}>
          Executive Dispatch & Operations Sign-off
        </div>
        <div className="grid grid-cols-3 divide-x border-t border-[#1c1917] text-[10px]" style={{ borderColor: '#1c1917' }}>
          <div className="p-2.5 print:p-2 flex flex-col justify-between min-h-[95px] print:min-h-[70px]">
            <div>
              <span className="text-[9px] print:text-[8px] font-bold uppercase block" style={{ color: '#57534e' }}>
                1. Central Kitchen Supervisor
              </span>
              <p className="font-bold mt-1 print:mt-0.5 text-[10.5px] print:text-[9.5px]" style={{ color: '#1c1917' }}>
                {generatedBy}
              </p>
              <p className="text-[9px] print:text-[8px] font-mono" style={{ color: '#78716c' }}>Date: {todayStr}</p>
            </div>
            <div className="mt-2.5 print:mt-1.5 pt-1.5 print:pt-1 border-t border-dashed border-[#a8a29e]" style={{ borderColor: '#a8a29e' }}>
              <span className="text-[9px] print:text-[8px] block" style={{ color: '#78716c' }}>Authorized Signature:</span>
              <div className="h-4 print:h-3 border-b border-[#d6d3d1]" style={{ borderColor: '#d6d3d1' }}></div>
            </div>
          </div>

          <div className="p-2.5 print:p-2 flex flex-col justify-between min-h-[95px] print:min-h-[70px]">
            <div>
              <span className="text-[9px] print:text-[8px] font-bold uppercase block" style={{ color: '#57534e' }}>
                2. Central Kitchen Manager
              </span>
              <p className="font-bold mt-1 print:mt-0.5 text-[10.5px] print:text-[9.5px]" style={{ color: '#1c1917' }}>Head of Production</p>
              <p className="text-[9px] print:text-[8px] font-mono" style={{ color: '#78716c' }}>Operations Sign-off</p>
            </div>
            <div className="mt-2.5 print:mt-1.5 pt-1.5 print:pt-1 border-t border-dashed border-[#a8a29e]" style={{ borderColor: '#a8a29e' }}>
              <span className="text-[9px] print:text-[8px] block" style={{ color: '#78716c' }}>Manager Signature:</span>
              <div className="h-4 print:h-3 border-b border-[#d6d3d1]" style={{ borderColor: '#d6d3d1' }}></div>
            </div>
          </div>

          <div className="p-2.5 print:p-2 flex flex-col justify-between min-h-[95px] print:min-h-[70px]">
            <div>
              <span className="text-[9px] print:text-[8px] font-bold uppercase block" style={{ color: '#57534e' }}>
                3. Quality Assurance Executive
              </span>
              <p className="font-bold mt-1 print:mt-0.5 text-[10.5px] print:text-[9.5px]" style={{ color: '#1c1917' }}>QA Executive</p>
              <p className="text-[9px] print:text-[8px] font-mono" style={{ color: '#78716c' }}>Verification Sign-off</p>
            </div>
            <div className="mt-2.5 print:mt-1.5 pt-1.5 print:pt-1 border-t border-dashed border-[#a8a29e]" style={{ borderColor: '#a8a29e' }}>
              <span className="text-[9px] print:text-[8px] block" style={{ color: '#78716c' }}>QA Signature:</span>
              <div className="h-4 print:h-3 border-b border-[#d6d3d1]" style={{ borderColor: '#d6d3d1' }}></div>
            </div>
          </div>
        </div>
      </div>

      {/* 5. Document Footer */}
      <div className="mt-2 pt-1.5 border-t border-[#d6d3d1] flex justify-between items-center text-[8.5px] font-mono" style={{ borderColor: '#d6d3d1', color: '#78716c' }}>
        <span>Barista Coffee Lanka (Pvt) Ltd. - Central Kitchen Monthly Dispatch Summary & Audit Record</span>
        <span>Printed on: {new Date().toLocaleString()}</span>
        <span>Page 1 of 1</span>
      </div>
    </div>
  );
};
