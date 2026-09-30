import React from 'react';
import { ThermometerSnowflake } from 'lucide-react';
import { BaristaLogo } from './BaristaLogo';

export interface DocumentHaccpHeaderProps {
  title: string;
  subtitle?: string;
  docCode?: string;
  effectiveDate?: string;
  revision?: string;
  version?: string;
  approvedBy?: string;
  refId?: string;
  haccpLink?: string;
  mandateNotice?: string;
  className?: string;
  variant?: 'dark' | 'paper' | 'auto';
}

export const DocumentHaccpHeader: React.FC<DocumentHaccpHeaderProps> = ({
  title = 'Central Kitchen Dispatch Log & Receipt',
  subtitle = 'Quality Assurance & Cold-Chain Food Safety Management',
  docCode = 'BCL/REC/HACCP/32',
  effectiveDate = '01 January 2025',
  revision = 'Rev 01',
  version = '01',
  approvedBy = 'QA Executive',
  refId,
  haccpLink = 'OPRP-2 (Cold-Chain <= 5.0 C)',
  mandateNotice = 'CRITICAL CONTROL REQUIREMENT: Maximum dispatch transit temperature must remain <= 5.0 C.',
  className = '',
  variant = 'dark'
}) => {
  const isDark = variant === 'dark' || variant === 'auto';

  if (!isDark) {
    // Official White Paper Variant
    return (
      <header className={`border-2 border-stone-900 bg-white text-stone-900 mb-4 print:mb-3.5 overflow-hidden rounded-lg print:rounded-lg ${className}`}>
        <div className="grid grid-cols-12 divide-y md:divide-y-0 md:divide-x-2 print:divide-y-0 print:divide-x-2 divide-stone-900 text-center">
          {/* Column 1: Logo */}
          <div className="col-span-12 md:col-span-4 print:col-span-4 p-3.5 print:p-3 flex flex-col justify-center items-center text-center bg-stone-50/60 print:bg-stone-50/60">
            <div className="flex justify-center items-center mb-1.5">
              <BaristaLogo className="w-13 h-13 print:w-12 print:h-12 shadow-sm print:shadow-none" size={52} />
            </div>
            <h1 className="font-serif font-black tracking-widest text-lg sm:text-xl print:text-lg text-stone-900 leading-tight">
              BARISTA
            </h1>
            <p className="text-[10px] font-bold tracking-wider uppercase text-stone-700 mt-0.5">
              SRI LANKA - CENTRAL KITCHEN
            </p>
            <p className="text-[8.5px] text-stone-500 font-mono mt-0.5">
              Barista Coffee Lanka (Pvt) Ltd.
            </p>
          </div>

          {/* Column 2: Document Title */}
          <div className="col-span-12 md:col-span-4 print:col-span-4 p-3.5 print:p-3 flex flex-col justify-center items-center text-center bg-white">
            <span className="text-[9.5px] print:text-[8.5px] font-mono font-semibold tracking-wider uppercase text-stone-500 print:text-stone-700">
              HACCP Food Safety Management System
            </span>
            <h2 className="text-base sm:text-lg print:text-sm font-black text-stone-900 print:text-black uppercase tracking-wide leading-snug my-1 print:my-0.5">
              {title}
            </h2>
            <div className="inline-flex items-center justify-center px-2.5 py-0.5 bg-[#ED5338]/10 print:bg-stone-100 text-[#ED5338] print:text-black border border-[#ED5338]/30 print:border-black rounded text-[9.5px] print:text-[8.5px] font-bold font-mono">
              {haccpLink}
            </div>
            {subtitle && (
              <p className="text-[9px] print:text-[8px] text-stone-600 print:text-stone-800 mt-1 print:mt-0.5 max-w-[260px]">
                {subtitle}
              </p>
            )}
          </div>

          {/* Column 3: Control & Metadata */}
          <div className="col-span-12 md:col-span-4 print:col-span-4 flex flex-col justify-between text-center text-xs divide-y divide-stone-200 print:divide-black bg-stone-50/40 print:bg-white">
            <div className="py-2 px-2 flex flex-col items-center justify-center">
              <span className="text-[9px] text-stone-500 print:text-stone-700 uppercase tracking-wider font-semibold">
                Record Code
              </span>
              <span className="font-mono font-black text-stone-900 print:text-black text-xs sm:text-sm tracking-wide">
                {docCode}
              </span>
            </div>
            <div className="py-1.5 px-2 grid grid-cols-2 divide-x divide-stone-200 print:divide-black text-center">
              <div className="px-1 flex flex-col items-center justify-center">
                <span className="text-[8.5px] text-stone-500 print:text-stone-700 uppercase">Effective Date</span>
                <span className="font-mono font-semibold text-stone-800 print:text-black text-[10px]">
                  {effectiveDate}
                </span>
              </div>
              <div className="px-1 flex flex-col items-center justify-center">
                <span className="text-[8.5px] text-stone-500 print:text-stone-700 uppercase">Revision / Ver</span>
                <span className="font-mono font-semibold text-stone-800 print:text-black text-[10px]">
                  {revision} / {version}
                </span>
              </div>
            </div>
            <div className="py-1.5 px-2 grid grid-cols-2 divide-x divide-stone-200 print:divide-black text-center">
              <div className="px-1 flex flex-col items-center justify-center">
                <span className="text-[8.5px] text-stone-500 print:text-stone-700 uppercase">Approved By</span>
                <span className="font-bold text-stone-900 print:text-black text-[10px] truncate max-w-[105px]">
                  {approvedBy}
                </span>
              </div>
              <div className="px-1 flex flex-col items-center justify-center">
                <span className="text-[8.5px] text-stone-500 print:text-stone-700 uppercase">Document Ref</span>
                <span className="font-mono font-bold text-stone-800 print:text-black text-[10px] truncate max-w-[105px]">
                  {refId || 'BCL-CK-DISP'}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-stone-100 print:bg-white p-2 border-t-2 border-stone-900 print:border-black flex flex-wrap items-center justify-center text-center text-[10px] sm:text-[10.5px] px-3 gap-2">
          <ThermometerSnowflake className="w-3.5 h-3.5 text-blue-700 print:text-black shrink-0" />
          <span className="font-semibold text-stone-800 print:text-black">
            {mandateNotice}
          </span>
          <span className="font-mono text-[9px] font-bold uppercase tracking-wider text-stone-700 bg-stone-200/90 print:border print:border-black px-1.5 py-0.2 rounded">
            OPRP-2
          </span>
        </div>
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
          <span className="text-[9.5px] print:text-[8.5px] font-mono font-semibold tracking-wider uppercase text-stone-400 print:text-stone-700">
            HACCP Food Safety Management System
          </span>
          <h2 className="text-base sm:text-lg print:text-sm font-black text-white print:text-black uppercase tracking-wide leading-snug my-1 print:my-0.5">
            {title}
          </h2>
          <div className="inline-flex items-center justify-center px-2.5 py-0.5 bg-[#ED5338]/20 print:bg-stone-100 text-[#FF7A63] print:text-black border border-[#ED5338]/40 print:border-black rounded text-[9.5px] print:text-[8.5px] font-bold font-mono shadow-sm">
            {haccpLink}
          </div>
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
              <span className="font-mono font-semibold text-stone-200 print:text-black text-[10px]">
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
              <span className="font-mono font-bold text-stone-200 print:text-black text-[10px] truncate max-w-[105px]">
                {refId || 'BCL-CK-DISP'}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-[#140F0D] print:bg-white p-2.5 border-t border-[#382B25] print:border-t-2 print:border-black flex flex-wrap items-center justify-center text-center text-[10px] sm:text-[10.5px] px-3 gap-2">
        <ThermometerSnowflake className="w-3.5 h-3.5 text-cyan-400 print:text-black shrink-0" />
        <span className="font-semibold text-stone-200 print:text-black">
          {mandateNotice}
        </span>
        <span className="font-mono text-[9px] font-bold uppercase tracking-wider text-amber-300 bg-amber-500/20 border border-amber-500/40 print:border-black print:text-black print:bg-stone-200/90 px-1.5 py-0.2 rounded shadow-sm">
          OPRP-2
        </span>
      </div>
    </header>
  );
};
