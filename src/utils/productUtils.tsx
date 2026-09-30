import React from 'react';

/**
 * Official Barista Central Kitchen Product Categories
 */
export const PRODUCT_CATEGORIES = [
  'Hot Kitchen',
  'Pastry Kitchen'
] as const;

export type ProductCategory = typeof PRODUCT_CATEGORIES[number];

/**
 * Standard selectable measurement units for Barista products
 */
export const STANDARD_UNITS = [
  { value: 'Slices', label: 'Slices', symbol: 'slices', short: 'Slices' },
  { value: 'NoS', label: 'NoS (Numbers / Pieces)', symbol: 'NoS', short: 'NoS' },
  { value: 'Grams (g)', label: 'Grams (g)', symbol: 'g', short: 'g' },
  { value: 'Liters (L)', label: 'Liters (L)', symbol: 'L', short: 'L' },
  { value: 'Packs', label: 'Packs', symbol: 'pk', short: 'Packs' },
  { value: 'Portions', label: 'Portions', symbol: 'port', short: 'Portions' },
  { value: 'Cakes', label: 'Cakes (Whole Cakes)', symbol: 'cakes', short: 'Cakes' },
  { value: 'Cups', label: 'Cups', symbol: 'cups', short: 'Cups' },
] as const;

/**
 * Safely calculates a future date string (YYYY-MM-DD) from a base production date
 * avoiding timezone shifting bugs.
 */
export function calculateFutureDate(baseDateStr: string, days: number): string {
  if (!baseDateStr) {
    const now = new Date();
    now.setDate(now.getDate() + days);
    return now.toISOString().split('T')[0];
  }
  const parts = baseDateStr.split('-');
  if (parts.length !== 3) return baseDateStr;
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);
  const day = parseInt(parts[2], 10);
  if (isNaN(year) || isNaN(month) || isNaN(day)) return baseDateStr;

  const d = new Date(year, month - 1, day);
  d.setDate(d.getDate() + (days || 0));

  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dt = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dt}`;
}

/**
 * Renders a visually distinctive badge for the product / batch unit,
 * including a clear and prominent symbol for Liters (L) and Grams (g).
 */
export function renderUnitBadge(unit?: string): React.ReactElement {
  const u = (unit || 'NoS').trim();
  const lower = u.toLowerCase();

  // Liters (L) - distinct blue badge with prominent 'L' symbol
  if (lower.includes('liter') || lower === 'l' || lower === '(l)') {
    return (
      <span className="inline-flex items-center space-x-1.5 px-2 py-0.5 rounded-md text-[11px] font-mono font-bold bg-blue-500/15 text-blue-300 border border-blue-500/30">
        <span className="w-4 h-4 rounded-full bg-blue-500/30 flex items-center justify-center text-[10px] font-extrabold text-blue-200">
          L
        </span>
        <span>Liters (L)</span>
      </span>
    );
  }

  // Grams (g) - distinct emerald badge with prominent 'g' symbol
  if (lower.includes('gram') || lower === 'g' || lower === '(g)') {
    return (
      <span className="inline-flex items-center space-x-1.5 px-2 py-0.5 rounded-md text-[11px] font-mono font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
        <span className="w-4 h-4 rounded-full bg-emerald-500/30 flex items-center justify-center text-[10px] font-extrabold text-emerald-200">
          g
        </span>
        <span>Grams (g)</span>
      </span>
    );
  }

  // Slices
  if (lower.includes('slice')) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-mono font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
        Slices
      </span>
    );
  }

  // NoS
  if (lower.includes('nos') || lower === 'number' || lower === 'numbers' || lower === 'pcs') {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-mono font-bold bg-purple-500/15 text-purple-300 border border-purple-500/30">
        NoS
      </span>
    );
  }

  // Packs
  if (lower.includes('pack')) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-mono font-bold bg-stone-700/70 text-stone-200 border border-stone-600/50">
        Packs
      </span>
    );
  }

  // Default fallback
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-mono font-bold bg-stone-800 text-stone-300 border border-stone-700">
      {u}
    </span>
  );
}
