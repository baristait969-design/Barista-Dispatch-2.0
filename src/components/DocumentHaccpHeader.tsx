import React from 'react';
import { ThermometerSnowflake } from 'lucide-react';
import { BaristaLogo } from './BaristaLogo';

export interface DocumentHaccpHeaderProps {
  title: string;
  subtitle?: string;
  docCode?: string;
  reportNo?: string;
  documentName?: string;
  previousDocumentName?: string;
  effectiveDate?: string;
  revision?: string;
  version?: string;
  approvedBy?: string;
  refId?: string;
  haccpLink?: string;
  hideHaccpLink?: boolean;
  systemCategory?: string;
  mandateNotice?: string;
  showMandateNotice?: boolean;
  className?: string;
  variant?: 'dark' | 'paper' | 'auto';
}

export const DocumentHaccpHeader: React.FC<DocumentHaccpHeaderProps> = ({
  title = 'Central Kitchen Dispatch Log & Receipt',
  subtitle = 'Quality Assurance & Cold-Chain Food Safety Management',
  docCode = 'BCL/REC/HACCP/32',
  reportNo,
  documentName,
  previousDocumentName,
  effectiveDate = '01 January 2025',
  revision = 'Rev 01',
  version = '01',
  approvedBy = 'QA Executive',
  refId,
  haccpLink = 'OPRP-2 (Cold-Chain <= 5.0 C)',
  hideHaccpLink = false,
  systemCategory = 'HACCP Food Safety Management System',
  mandateNotice,
  showMandateNotice = false,
  className = '',
  variant = 'dark'
}) => {
  const isDark = variant === 'dark' || variant === 'auto';
  const displayDocRef = documentName || refId || reportNo || 'BCL-CK-DISP';

  if (!isDark) {
    // Official White Paper Variant
    return (
      <header 
        className={`border-2 border-[#1c1917] bg-white text-[#1c1917] mb-3 print:mb-2.5 rounded-lg print:rounded-lg overflow-hidden ${className}`}
        style={{ borderColor: '#1c1917', backgroundColor: '#ffffff', color: '#1c1917', boxSizing: 'border-box', overflow: 'hidden', borderRadius: '8px' }}
      >
        <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, textAlign: 'center', backgroundColor: '#ffffff' }}>
          <tbody>
            <tr>
              {/* Column 1: Logo & Company Info */}
              <td style={{ width: '32%', padding: '12px 10px', borderRight: '2px solid #1c1917', backgroundColor: '#fafaf9', verticalAlign: 'middle', textAlign: 'center' }}>
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: '4px' }}>
                  <BaristaLogo className="w-10 h-10 print:w-9 print:h-9 shadow-sm print:shadow-none" size={40} />
                </div>
                <div style={{ fontFamily: 'serif', fontWeight: 900, letterSpacing: '2px', fontSize: '16px', color: '#1c1917', lineHeight: 1.2 }}>
                  BARISTA
                </div>
                <div style={{ fontSize: '8.5px', fontWeight: 'bold', letterSpacing: '1px', textTransform: 'uppercase', color: '#44403c', marginTop: '2px', lineHeight: 1.2 }}>
                  SRI LANKA - CENTRAL KITCHEN
                </div>
                <div style={{ fontSize: '8px', color: '#78716c', fontFamily: 'monospace', marginTop: '2px', lineHeight: 1.2 }}>
                  Barista Coffee Lanka (Pvt) Ltd.
                </div>
              </td>

              {/* Column 2: Document Title & Metadata */}
              <td style={{ width: '38%', padding: '12px 10px', borderRight: '2px solid #1c1917', backgroundColor: '#ffffff', verticalAlign: 'middle', textAlign: 'center' }}>
                {systemCategory && (
                  <div style={{ fontSize: '8px', fontFamily: 'monospace', fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase', color: '#78716c', lineHeight: 1.2 }}>
                    {systemCategory}
                  </div>
                )}
                <div style={{ fontSize: '14px', fontWeight: 900, textTransform: 'uppercase', color: '#1c1917', margin: '4px 0', lineHeight: 1.2 }}>
                  {title}
                </div>
                {!hideHaccpLink && haccpLink && (
                  <div style={{ display: 'inline-block', padding: '2px 8px', backgroundColor: '#fff7ed', color: '#c2410c', border: '1px solid #fdba74', borderRadius: '4px', fontSize: '8.5px', fontWeight: 'bold', fontFamily: 'monospace', margin: '2px 0' }}>
                    {haccpLink}
                  </div>
                )}
                {displayDocRef && displayDocRef !== 'BCL-CK-DISP' && (
                  <div style={{ fontSize: '9px', fontFamily: 'monospace', fontWeight: 'bold', color: '#1c1917', marginTop: '3px', lineHeight: 1.2 }}>
                    Doc Ref: {displayDocRef}
                  </div>
                )}
                {previousDocumentName && (
                  <div style={{ fontSize: '8px', fontFamily: 'monospace', color: '#57534e', backgroundColor: '#f5f5f4', padding: '1.5px 5px', borderRadius: '3px', border: '1px solid #d6d3d1', marginTop: '2px', display: 'inline-block', fontWeight: 600 }}>
                    Rev of: {previousDocumentName}
                  </div>
                )}
                {subtitle && (
                  <div style={{ fontSize: '8.5px', color: '#57534e', marginTop: '3px', lineHeight: 1.2 }}>
                    {subtitle}
                  </div>
                )}
              </td>

              {/* Column 3: Control & Metadata Matrix */}
              <td style={{ width: '30%', padding: '0', backgroundColor: '#fafaf9', verticalAlign: 'middle', textAlign: 'center' }}>
                <table style={{ width: '100%', height: '100%', borderCollapse: 'collapse', textAlign: 'center' }}>
                  <tbody>
                    {/* Row 1: Record Code */}
                    <tr style={{ borderBottom: '1px solid #d6d3d1' }}>
                      <td colSpan={2} style={{ padding: '7px 4px', textAlign: 'center', verticalAlign: 'middle' }}>
                        <div style={{ fontSize: '7.5px', textTransform: 'uppercase', color: '#78716c', fontWeight: 700, lineHeight: 1.1 }}>Record Code</div>
                        <div style={{ fontFamily: 'monospace', fontWeight: 900, fontSize: '11px', color: '#1c1917', lineHeight: 1.2, marginTop: '2px' }}>{docCode}</div>
                      </td>
                    </tr>
                    {/* Row 2: Effective Date & Revision */}
                    <tr style={{ borderBottom: '1px solid #d6d3d1' }}>
                      <td style={{ width: '50%', padding: '6px 3px', borderRight: '1px solid #d6d3d1', textAlign: 'center', verticalAlign: 'middle' }}>
                        <div style={{ fontSize: '7.5px', textTransform: 'uppercase', color: '#78716c', fontWeight: 600, lineHeight: 1.1 }}>Effective Date</div>
                        <div style={{ fontFamily: 'monospace', fontSize: '8.5px', fontWeight: 'bold', color: '#1c1917', lineHeight: 1.2, marginTop: '1px' }}>{effectiveDate}</div>
                      </td>
                      <td style={{ width: '50%', padding: '6px 3px', textAlign: 'center', verticalAlign: 'middle' }}>
                        <div style={{ fontSize: '7.5px', textTransform: 'uppercase', color: '#78716c', fontWeight: 600, lineHeight: 1.1 }}>Revision / Ver</div>
                        <div style={{ fontFamily: 'monospace', fontSize: '8.5px', fontWeight: 'bold', color: '#1c1917', lineHeight: 1.2, marginTop: '1px' }}>{revision} / {version}</div>
                      </td>
                    </tr>
                    {/* Row 3: Approved By & Document Ref */}
                    <tr>
                      <td style={{ width: '50%', padding: '6px 3px', borderRight: '1px solid #d6d3d1', textAlign: 'center', verticalAlign: 'middle' }}>
                        <div style={{ fontSize: '7.5px', textTransform: 'uppercase', color: '#78716c', fontWeight: 600, lineHeight: 1.1 }}>Approved By</div>
                        <div style={{ fontSize: '8.5px', fontWeight: 'bold', color: '#1c1917', lineHeight: 1.2, marginTop: '1px', wordBreak: 'break-word', padding: '0 2px' }}>{approvedBy}</div>
                      </td>
                      <td style={{ width: '50%', padding: '6px 3px', textAlign: 'center', verticalAlign: 'middle' }}>
                        <div style={{ fontSize: '7.5px', textTransform: 'uppercase', color: '#78716c', fontWeight: 600, lineHeight: 1.1 }}>Document Ref</div>
                        <div style={{ fontFamily: 'monospace', fontSize: '8.5px', fontWeight: 'bold', color: '#1c1917', lineHeight: 1.2, marginTop: '1px', wordBreak: 'break-word', padding: '0 2px' }}>{displayDocRef}</div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </td>
            </tr>
          </tbody>
        </table>

        {showMandateNotice && mandateNotice && (
          <div className="bg-[#f5f5f4] print:bg-white p-2 border-t-2 border-[#1c1917] print:border-black flex flex-wrap items-center justify-center text-center text-[10px] sm:text-[10.5px] px-3 gap-2" style={{ color: '#1c1917', borderColor: '#1c1917' }}>
            <ThermometerSnowflake className="w-3.5 h-3.5 text-blue-700 print:text-black shrink-0" />
            <span className="font-semibold text-stone-800 print:text-black">
              {mandateNotice}
            </span>
            <span className="font-mono text-[9px] font-bold uppercase tracking-wider text-stone-700 bg-stone-200/90 print:border print:border-black px-1.5 py-0.2 rounded">
              OPRP-2
            </span>
          </div>
        )}
      </header>
    );
  }

  // DARK THEME VARIANT
  return (
    <header className={`border border-[#382B25] sm:border-2 bg-[#201916] text-stone-100 mb-4 print:mb-3.5 overflow-hidden rounded-xl print:rounded-lg print:border-2 print:border-black print:bg-white print:text-black shadow-xl ${className}`}>
      <div className="grid grid-cols-12 divide-y md:divide-y-0 md:divide-x-2 print:divide-y-0 print:divide-x-2 divide-[#382B25] print:divide-black text-center">
        {/* Column 1: Logo */}
        <div className="col-span-12 md:col-span-4 print:col-span-4 p-3.5 print:p-3 flex flex-col justify-center items-center text-center bg-[#191311] print:bg-stone-50/60 border-b md:border-b-0 border-[#382B25] print:border-black">
          <div className="flex justify-center items-center mb-1.5">
            <BaristaLogo className="w-13 h-13 print:w-12 print:h-12 shadow-lg ring-1 ring-amber-500/20 print:shadow-none print:ring-0" size={52} />
          </div>
          <h1 className="font-serif font-black tracking-widest text-lg sm:text-xl print:text-lg text-stone-100 print:text-black leading-tight">
            BARISTA
          </h1>
          <p className="text-[10px] font-bold tracking-wider uppercase text-amber-400 print:text-black mt-0.5">
            SRI LANKA - CENTRAL KITCHEN
          </p>
          <p className="text-[8.5px] text-stone-400 print:text-stone-700 font-mono mt-0.5">
            Barista Coffee Lanka (Pvt) Ltd.
          </p>
        </div>

        {/* Column 2: Document Title */}
        <div className="col-span-12 md:col-span-4 print:col-span-4 p-3.5 print:p-3 flex flex-col justify-center items-center text-center bg-[#221A16] print:bg-white border-b md:border-b-0 border-[#382B25] print:border-black">
          {systemCategory && (
            <span className="text-[9.5px] print:text-[8.5px] font-mono font-semibold tracking-wider uppercase text-stone-400 print:text-stone-700">
              {systemCategory}
            </span>
          )}
          <h2 className="text-base sm:text-lg print:text-sm font-black text-white print:text-black uppercase tracking-wide leading-snug my-1 print:my-0.5">
            {title}
          </h2>
          {!hideHaccpLink && haccpLink && (
            <div className="inline-flex items-center justify-center px-2.5 py-0.5 bg-[#ED5338]/20 print:bg-stone-100 text-[#FF7A63] print:text-black border border-[#ED5338]/40 print:border-black rounded text-[9.5px] print:text-[8.5px] font-bold font-mono shadow-sm">
              {haccpLink}
            </div>
          )}
          {displayDocRef && displayDocRef !== 'BCL-CK-DISP' && (
            <div className="text-[10.5px] font-mono font-bold text-amber-400 print:text-black mt-1">
              Doc Ref: {displayDocRef}
            </div>
          )}
          {previousDocumentName && (
            <div className="text-[9px] font-mono text-amber-300/90 print:text-stone-700 bg-amber-500/10 px-1.5 py-0.2 rounded border border-amber-500/30 print:border-black mt-0.5">
              Rev of: {previousDocumentName}
            </div>
          )}
          {subtitle && (
            <p className="text-[9px] print:text-[8px] text-stone-300 print:text-stone-800 mt-1 print:mt-0.5 max-w-[280px]">
              {subtitle}
            </p>
          )}
        </div>

        {/* Column 3: Control & Metadata */}
        <div className="col-span-12 md:col-span-4 print:col-span-4 flex flex-col justify-between text-center text-xs divide-y divide-[#2E231E] print:divide-black bg-[#191311] print:bg-white">
          <div className="py-2 px-2 flex flex-col items-center justify-center bg-[#1D1614] print:bg-white">
            <span className="text-[9px] text-stone-400 print:text-stone-700 uppercase tracking-wider font-semibold">
              Record Code
            </span>
            <span className="font-mono font-black text-amber-400 print:text-black text-xs sm:text-sm tracking-wide">
              {docCode}
            </span>
          </div>
          <div className="py-1.5 px-2 grid grid-cols-2 divide-x divide-[#2E231E] print:divide-black text-center">
            <div className="px-1 flex flex-col items-center justify-center">
              <span className="text-[8.5px] text-stone-400 print:text-stone-700 uppercase">Effective Date</span>
              <span className="font-mono font-semibold text-stone-200 print:text-black text-[10px]">
                {effectiveDate}
              </span>
            </div>
            <div className="px-1 flex flex-col items-center justify-center">
              <span className="text-[8.5px] text-stone-400 print:text-stone-700 uppercase">Revision / Ver</span>
              <span className="font-mono font-bold text-amber-400 print:text-black text-[10px]">
                {revision} / {version}
              </span>
            </div>
          </div>
          <div className="py-1.5 px-2 grid grid-cols-2 divide-x divide-[#2E231E] print:divide-black text-center">
            <div className="px-1 flex flex-col items-center justify-center">
              <span className="text-[8.5px] text-stone-400 print:text-stone-700 uppercase">Approved By</span>
              <span className="font-bold text-stone-100 print:text-black text-[10px] truncate max-w-[105px]">
                {approvedBy}
              </span>
            </div>
            <div className="px-1 flex flex-col items-center justify-center">
              <span className="text-[8.5px] text-stone-400 print:text-stone-700 uppercase">Document Ref</span>
              <span className="font-mono font-bold text-amber-400 print:text-black text-[10px] truncate max-w-[105px]" title={displayDocRef}>
                {displayDocRef}
              </span>
            </div>
          </div>
        </div>
      </div>

      {showMandateNotice && mandateNotice && (
        <div className="bg-[#140F0D] print:bg-white p-2.5 border-t border-[#382B25] print:border-t-2 print:border-black flex flex-wrap items-center justify-center text-center text-[10px] sm:text-[10.5px] px-3 gap-2">
          <ThermometerSnowflake className="w-3.5 h-3.5 text-cyan-400 print:text-black shrink-0" />
          <span className="font-semibold text-stone-200 print:text-black">
            {mandateNotice}
          </span>
          <span className="font-mono text-[9px] font-bold uppercase tracking-wider text-amber-300 bg-amber-500/20 border border-amber-500/40 print:border-black print:text-black print:bg-stone-200/90 px-1.5 py-0.2 rounded shadow-sm">
            OPRP-2
          </span>
        </div>
      )}
    </header>
  );
};
