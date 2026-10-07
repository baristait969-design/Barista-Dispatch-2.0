import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { DispatchLog } from '../types';
import { getDispatchReportNo, getDispatchDocumentName } from './dispatchNumberUtils';
import { downloadHtmlElementAsPDF, renderDispatchSheetHtml, renderMonthlyExecutiveReportHtml } from './printUtils';

export interface PdfHeaderConfig {
  title: string;
  subtitle?: string;
  docCode: string;
  effectiveDate: string;
  revision: string;
  version: string;
  approvedBy: string;
  refId: string;
  haccpLink?: string;
  hideHaccpLink?: boolean;
  systemCategory?: string;
  mandateNotice?: string;
  showMandateNotice?: boolean;
}

/**
 * Universal official HACCP document header renderer for jsPDF.
 */
export function drawHaccpHeaderToPdf(
  doc: jsPDF,
  startX: number,
  startY: number,
  totalWidth: number,
  config: PdfHeaderConfig,
  isLandscape: boolean = false
): number {
  const hasMandate = Boolean(config.showMandateNotice && config.mandateNotice);
  const gridHeight = isLandscape ? 25 : 28;
  const bannerHeight = hasMandate ? (isLandscape ? 5.5 : 6) : 0;
  const totalHeaderHeight = gridHeight + bannerHeight;

  // 1. Draw outer frame
  doc.setFillColor(255, 255, 255);
  doc.rect(startX, startY, totalWidth, totalHeaderHeight, 'F');
  doc.setDrawColor(25, 20, 18);
  doc.setLineWidth(0.5);
  doc.rect(startX, startY, totalWidth, totalHeaderHeight, 'S');

  // Column widths
  const col1Width = Math.round(totalWidth * 0.30);
  const col2Width = Math.round(totalWidth * 0.42);
  const col3Width = totalWidth - col1Width - col2Width;

  // 2. Draw vertical divider lines
  doc.setDrawColor(25, 20, 18);
  doc.setLineWidth(0.4);
  doc.line(startX + col1Width, startY, startX + col1Width, startY + gridHeight);
  doc.line(startX + col1Width + col2Width, startY, startX + col1Width + col2Width, startY + gridHeight);

  // COLUMN 1: Logo
  const col1CenterX = startX + col1Width / 2;
  doc.setFillColor(250, 248, 246);
  doc.rect(startX + 0.3, startY + 0.3, col1Width - 0.6, gridHeight - 0.3, 'F');

  const logoCenterY = startY + (isLandscape ? 6.5 : 7.2);
  const logoRadius = isLandscape ? 4.5 : 5.0;

  doc.setFillColor(239, 99, 64);
  doc.circle(col1CenterX, logoCenterY, logoRadius, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(isLandscape ? 5.5 : 6.0);
  doc.setTextColor(255, 255, 255);
  doc.text('BARISTA', col1CenterX, logoCenterY + (isLandscape ? 1.0 : 1.2), { align: 'center' });

  doc.setFillColor(100, 27, 11);
  const barWidth = isLandscape ? 2.4 : 2.8;
  doc.rect(col1CenterX - barWidth / 2, logoCenterY + (isLandscape ? 1.6 : 1.9), barWidth, 0.4, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(isLandscape ? 9 : 10);
  doc.setTextColor(25, 20, 18);
  doc.text('BARISTA', col1CenterX, startY + (isLandscape ? 14.5 : 16.5), { align: 'center' });
  doc.setFontSize(isLandscape ? 5.2 : 5.8);
  doc.setTextColor(60, 50, 45);
  doc.text('SRI LANKA - CENTRAL KITCHEN', col1CenterX, startY + (isLandscape ? 18.5 : 21.0), { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(isLandscape ? 4.6 : 5.2);
  doc.setTextColor(110, 100, 95);
  doc.text('Barista Coffee Lanka (Pvt) Ltd.', col1CenterX, startY + (isLandscape ? 22.0 : 25.0), { align: 'center' });

  // COLUMN 2: Title & Category
  const col2CenterX = startX + col1Width + col2Width / 2;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(isLandscape ? 5.5 : 6.0);
  doc.setTextColor(100, 95, 90);
  doc.text((config.systemCategory || 'CENTRAL KITCHEN LOGISTICS & DISPATCH OPERATIONS').toUpperCase(), col2CenterX, startY + (isLandscape ? 5.5 : 6.5), { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(isLandscape ? 9.5 : 10.5);
  doc.setTextColor(20, 20, 20);
  doc.text(config.title.toUpperCase(), col2CenterX, startY + (isLandscape ? 11.0 : 13.0), { align: 'center' });

  if (!config.hideHaccpLink && config.haccpLink) {
    const badgeWidth = Math.min(col2Width - 16, 68);
    const badgeHeight = isLandscape ? 4.5 : 4.8;
    const badgeY = startY + (isLandscape ? 13.5 : 15.5);
    doc.setFillColor(254, 242, 240);
    doc.setDrawColor(237, 83, 56);
    doc.setLineWidth(0.2);
    doc.roundedRect(col2CenterX - badgeWidth / 2, badgeY, badgeWidth, badgeHeight, 1, 1, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(isLandscape ? 5.8 : 6.3);
    doc.setTextColor(216, 66, 40);
    doc.text(config.haccpLink || 'OPRP-2 (Cold-Chain <= 5.0 C)', col2CenterX, badgeY + (isLandscape ? 3.2 : 3.4), { align: 'center' });
  }

  if (config.subtitle) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(isLandscape ? 5.0 : 5.6);
    doc.setTextColor(90, 85, 80);
    doc.text(config.subtitle, col2CenterX, startY + (isLandscape ? 22.0 : 24.5), { align: 'center' });
  }

  // COLUMN 3: Document Control
  const col3X = startX + col1Width + col2Width;
  const col3CenterX = col3X + col3Width / 2;
  doc.setFillColor(252, 250, 248);
  doc.rect(col3X + 0.2, startY + 0.3, col3Width - 0.4, gridHeight - 0.3, 'F');

  const row1H = isLandscape ? 8.0 : 9.0;
  const row2H = isLandscape ? 8.5 : 9.5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(isLandscape ? 5.0 : 5.5);
  doc.setTextColor(110, 100, 95);
  doc.text('RECORD CODE', col3CenterX, startY + (isLandscape ? 3.5 : 4.0), { align: 'center' });
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(isLandscape ? 8.0 : 9.0);
  doc.setTextColor(20, 20, 20);
  doc.text(config.docCode, col3CenterX, startY + (isLandscape ? 7.0 : 7.8), { align: 'center' });

  doc.setDrawColor(210, 200, 195);
  doc.setLineWidth(0.25);
  doc.line(col3X, startY + row1H, col3X + col3Width, startY + row1H);

  const band2Y = startY + row1H;
  const leftHalfX = col3X + col3Width / 4;
  const rightHalfX = col3X + (col3Width * 3) / 4;
  doc.line(col3X + col3Width / 2, band2Y, col3X + col3Width / 2, band2Y + row2H);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(isLandscape ? 4.5 : 5.0);
  doc.setTextColor(110, 100, 95);
  doc.text('EFFECTIVE DATE', leftHalfX, band2Y + (isLandscape ? 3.2 : 3.5), { align: 'center' });
  doc.text('REVISION / VER', rightHalfX, band2Y + (isLandscape ? 3.2 : 3.5), { align: 'center' });
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(isLandscape ? 5.8 : 6.4);
  doc.setTextColor(30, 30, 30);
  doc.text(config.effectiveDate, leftHalfX, band2Y + (isLandscape ? 6.8 : 7.5), { align: 'center' });
  doc.text(`${config.revision} / ${config.version}`, rightHalfX, band2Y + (isLandscape ? 6.8 : 7.5), { align: 'center' });

  const band3Y = band2Y + row2H;
  doc.line(col3X, band3Y, col3X + col3Width, band3Y);
  doc.line(col3X + col3Width / 2, band3Y, col3X + col3Width / 2, startY + gridHeight);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(isLandscape ? 4.5 : 5.0);
  doc.setTextColor(110, 100, 95);
  doc.text('APPROVED BY', leftHalfX, band3Y + (isLandscape ? 3.0 : 3.4), { align: 'center' });
  doc.text('DOCUMENT REF', rightHalfX, band3Y + (isLandscape ? 3.0 : 3.4), { align: 'center' });
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(isLandscape ? 5.8 : 6.4);
  doc.setTextColor(30, 30, 30);
  doc.text(config.approvedBy, leftHalfX, band3Y + (isLandscape ? 6.5 : 7.2), { align: 'center' });
  doc.text(config.refId, rightHalfX, band3Y + (isLandscape ? 6.5 : 7.2), { align: 'center' });

  // Banner strip (only if showMandateNotice is explicitly enabled)
  if (hasMandate && config.mandateNotice) {
    const bannerY = startY + gridHeight;
    doc.setFillColor(245, 245, 248);
    doc.rect(startX, bannerY, totalWidth, bannerHeight, 'F');
    doc.setDrawColor(25, 20, 18);
    doc.setLineWidth(0.4);
    doc.line(startX, bannerY, startX + totalWidth, bannerY);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(isLandscape ? 6.0 : 6.5);
    doc.setTextColor(40, 40, 40);
    doc.text(
      config.mandateNotice,
      startX + totalWidth / 2,
      bannerY + bannerHeight / 2 + (isLandscape ? 1.0 : 1.2),
      { align: 'center' }
    );
  }

  return startY + totalHeaderHeight + 3.5;
}

export function buildExecutiveReportDoc(
  logs: DispatchLog[],
  stats: {
    totalDispatches: number;
    totalUnitsDispatched: number;
    haccpComplianceRate: number;
    averageTemp: string;
    compliantLogsCount: number;
    deviationCount: number;
    outletsCount: number;
  },
  userName: string = 'QA Executive',
  dateRange: string = 'All Records'
): jsPDF {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
  });

  const startX = 14;
  const startY = 8;
  const totalWidth = 269;

  const nextY = drawHaccpHeaderToPdf(
    doc,
    startX,
    startY,
    totalWidth,
    {
      title: 'Monthly Dispatch Log & Summary',
      subtitle: 'Central Kitchen Production & Retail Logistics Report',
      docCode: 'BCL/REP/DISP/01',
      systemCategory: 'Central Kitchen Logistics & Dispatch Operations',
      hideHaccpLink: true,
      effectiveDate: dateRange,
      revision: 'Rev 01',
      version: '01',
      approvedBy: userName,
      refId: `DSP-${stats.totalDispatches}-SUM`
    },
    true
  );

  const kpiY = nextY;
  const kpiH = 14;
  doc.setFillColor(248, 248, 250);
  doc.rect(startX, kpiY, totalWidth, kpiH, 'F');
  doc.setDrawColor(25, 20, 18);
  doc.setLineWidth(0.4);
  doc.rect(startX, kpiY, totalWidth, kpiH, 'S');

  const kpiColW = totalWidth / 5;
  for (let i = 1; i < 5; i++) {
    doc.line(startX + kpiColW * i, kpiY, startX + kpiColW * i, kpiY + kpiH);
  }

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.0);
  doc.setTextColor(80, 80, 80);
  doc.text('TOTAL DISPATCHES', startX + kpiColW * 0.5, kpiY + 4.5, { align: 'center' });
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(20, 20, 20);
  doc.text(`${stats.totalDispatches} Trips`, startX + kpiColW * 0.5, kpiY + 10.5, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.0);
  doc.setTextColor(80, 80, 80);
  doc.text('TOTAL OUTPUT', startX + kpiColW * 1.5, kpiY + 4.5, { align: 'center' });
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(20, 20, 20);
  doc.text(`${stats.totalUnitsDispatched} Units`, startX + kpiColW * 1.5, kpiY + 10.5, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.0);
  doc.setTextColor(80, 80, 80);
  doc.text('ACTIVE OUTLETS', startX + kpiColW * 2.5, kpiY + 4.5, { align: 'center' });
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(20, 20, 20);
  doc.text(`${stats.outletsCount} Branches`, startX + kpiColW * 2.5, kpiY + 10.5, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.0);
  doc.setTextColor(80, 80, 80);
  doc.text('AVG DISPATCH TEMP', startX + kpiColW * 3.5, kpiY + 4.5, { align: 'center' });
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(20, 20, 20);
  doc.text(`${stats.averageTemp} °C`, startX + kpiColW * 3.5, kpiY + 10.5, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.0);
  doc.setTextColor(80, 80, 80);
  doc.text('REPORTING PERIOD', startX + kpiColW * 4.5, kpiY + 4.5, { align: 'center' });
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(20, 20, 20);
  doc.text(dateRange, startX + kpiColW * 4.5, kpiY + 10.2, { align: 'center' });

  const tableRows: any[] = [];
  logs.forEach((log, idx) => {
    const rawDoc = log.documentName || log.reportNo || log.docNo || `DSP-${String(idx + 1).padStart(4, '0')}`;
    const docName = String(rawDoc)
      .replace(/[-_/\s]*\(?\d{4}[-/.]\d{2}[-/.]\d{2}\)?.*$/i, '')
      .trim() || `DSP-${String(idx + 1).padStart(4, '0')}`;
    const activeItems = (log.items || []).filter(i => (i.quantity || 0) > 0);
    const temps = activeItems.map(i => i.dispatchTemp);
    const avgTemp = temps.length > 0 ? (temps.reduce((a, b) => a + b, 0) / temps.length).toFixed(1) : '3.5';

    // Aggregate quantities per unique product name
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

    // Format products ONE BY ONE VERTICALLY (names only)
    const formattedProducts = aggregatedItems.map(i => i.productName).join('\n');
    const formattedOutputs = aggregatedItems.map(i => `${i.quantity} ${i.unit}`).join('\n');

    tableRows.push([
      idx + 1,
      docName,
      log.outletNames.join(', '),
      log.driverName,
      log.supervisor,
      formattedProducts || 'None',
      formattedOutputs || '0 Units',
      `${avgTemp} °C`
    ]);
  });

  autoTable(doc, {
    startY: kpiY + kpiH + 4,
    head: [['#', 'Document No', 'Destination Outlet', 'Dispatch Driver', 'Supervisor', 'Product Breakdown', 'Output', 'Dispatch Temp']],
    body: tableRows,
    theme: 'grid',
    headStyles: {
      fillColor: [25, 20, 18],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 7.5,
      halign: 'center',
      lineWidth: 0.3,
      lineColor: [25, 20, 18]
    },
    bodyStyles: {
      fontSize: 7.0,
      textColor: [25, 20, 18],
      lineWidth: 0.25,
      lineColor: [210, 210, 215],
      cellPadding: 2.5
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 8, halign: 'center' },
      1: { cellWidth: 28, fontStyle: 'bold', halign: 'center' },
      2: { cellWidth: 36, fontStyle: 'bold', halign: 'center' },
      3: { cellWidth: 30, halign: 'center' },
      4: { cellWidth: 28, halign: 'center' },
      5: { cellWidth: 95, halign: 'left' },
      6: { cellWidth: 24, halign: 'center', fontStyle: 'bold' },
      7: { cellWidth: 20, halign: 'center', fontStyle: 'bold' }
    },
    margin: { left: startX, right: 14, bottom: 22 }
  });

  const lastTableFinalY = (doc as any).lastAutoTable?.finalY || 140;
  let execSignY = lastTableFinalY + 5;
  if (execSignY + 24 > 195) {
    doc.addPage();
    execSignY = 14;
  }

  doc.setDrawColor(25, 20, 18);
  doc.setLineWidth(0.4);
  doc.rect(startX, execSignY, totalWidth, 22, 'S');

  doc.setFillColor(25, 20, 18);
  doc.rect(startX, execSignY, totalWidth, 4.5, 'F');
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text('EXECUTIVE DISPATCH & OPERATIONS SIGN-OFF', startX + 4, execSignY + 3.2);

  const colW = totalWidth / 3;
  doc.setDrawColor(200, 200, 205);
  doc.setLineWidth(0.25);
  doc.line(startX + colW, execSignY + 4.5, startX + colW, execSignY + 22);
  doc.line(startX + colW * 2, execSignY + 4.5, startX + colW * 2, execSignY + 22);

  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(80, 80, 80);
  doc.text('1. Central Kitchen Dispatch Supervisor', startX + 4, execSignY + 8.2);
  doc.setFontSize(7.5);
  doc.setTextColor(20, 20, 20);
  doc.text(userName || 'Barista IT Administrator', startX + 4, execSignY + 12.5);
  doc.setFontSize(6.2);
  doc.setTextColor(100, 100, 100);
  doc.setFont('helvetica', 'normal');
  doc.text('Authorized Signature: _______________________', startX + 4, execSignY + 18.5);

  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(80, 80, 80);
  doc.text('2. Central Kitchen Manager', startX + colW + 4, execSignY + 8.2);
  doc.setFontSize(7.5);
  doc.setTextColor(20, 20, 20);
  doc.text('Head of Production', startX + colW + 4, execSignY + 12.5);
  doc.setFontSize(6.2);
  doc.setTextColor(100, 100, 100);
  doc.setFont('helvetica', 'normal');
  doc.text('Manager Signature: __________________________', startX + colW + 4, execSignY + 18.5);

  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(80, 80, 80);
  doc.text('3. Quality Assurance & Logistics Executive', startX + colW * 2 + 4, execSignY + 8.2);
  doc.setFontSize(7.5);
  doc.setTextColor(20, 20, 20);
  doc.text('QA Executive', startX + colW * 2 + 4, execSignY + 12.5);
  doc.setFontSize(6.2);
  doc.setTextColor(100, 100, 100);
  doc.setFont('helvetica', 'normal');
  doc.text('QA Signature: _______________________', startX + colW * 2 + 4, execSignY + 18.5);

  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(6.8);
    doc.setTextColor(120, 120, 120);
    doc.text(
      `Barista Coffee Lanka (Pvt) Ltd. - Central Kitchen Monthly Dispatch Summary & Audit Record - Page ${i} of ${pageCount}`,
      startX,
      202
    );
  }

  return doc;
}

export async function generateExecutiveReportPDF(
  logs: DispatchLog[],
  stats: any,
  userName: string = 'Barista IT Administrator',
  dateRange: string = 'Current Month Cycle'
) {
  const todayStr = new Date().toISOString().split('T')[0];
  const filename = `Barista_Monthly_Dispatch_Report_${todayStr}.pdf`;

  // 1. If currently rendered on screen or in background export mount, capture directly:
  const screenContent = typeof document !== 'undefined' 
    ? (document.getElementById('printable-executive-report-content') || document.getElementById('printable-executive-report-export-content') || document.getElementById('printable-executive-report-content-direct'))
    : null;
  if (screenContent) {
    try {
      const success = await downloadHtmlElementAsPDF(screenContent, filename, 'portrait');
      if (success) return;
    } catch (e) {
      console.warn('Failed capturing screen executive report, using fallback:', e);
    }
  }

  // 2. If off-screen, create the exact HTML element on-screen behind root for 100% parity
  if (typeof document !== 'undefined') {
    const tempDiv = document.createElement('div');
    tempDiv.id = 'temp-monthly-report-print';
    tempDiv.style.position = 'fixed';
    tempDiv.style.left = '-9999px';
    tempDiv.style.top = '0';
    tempDiv.style.zIndex = '-9999';
    tempDiv.style.width = '794px';
    tempDiv.style.pointerEvents = 'none';
    tempDiv.style.backgroundColor = '#ffffff';
    tempDiv.innerHTML = renderMonthlyExecutiveReportHtml(logs, stats, userName, dateRange);
    document.body.appendChild(tempDiv);
    try {
      const success = await downloadHtmlElementAsPDF(tempDiv, filename, 'portrait');
      if (success) return;
    } catch (e) {
      console.warn('Failed capturing offscreen HTML executive report, falling back to jsPDF:', e);
    } finally {
      if (document.body.contains(tempDiv)) {
        document.body.removeChild(tempDiv);
      }
    }
  }

  // 3. Fallback to jsPDF
  const doc = buildExecutiveReportDoc(logs, stats, userName, dateRange);
  doc.save(filename);
}

export function printExecutiveReportPDF(
  logs: DispatchLog[],
  stats: any,
  userName: string = 'QA Executive',
  dateRange: string = 'All Records'
) {
  const doc = buildExecutiveReportDoc(logs, stats, userName, dateRange);
  doc.autoPrint();
  const pdfBlob = doc.output('blob');
  const pdfUrl = URL.createObjectURL(pdfBlob);
  const win = window.open(pdfUrl, '_blank');
  if (!win) {
    const todayStr = new Date().toISOString().split('T')[0];
    doc.save(`Barista_Executive_Dispatch_Report_${todayStr}.pdf`);
  }
}

export function buildSingleDispatchDoc(log: Partial<DispatchLog> & {
  items: any[];
  outletNames: string[];
  date: string;
  dispatchTime: string;
  driverName: string;
  supervisor: string;
  supervisorId?: string;
  vehicleNo?: string;
}): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const activeItems = (log.items || []).filter(item => (item.quantity || 0) > 0);
  const totalUnits = activeItems.reduce((acc, item) => acc + (item.quantity || 0), 0);
  const avgTemp = activeItems.length > 0
    ? (activeItems.reduce((acc, item) => acc + (Number(item.dispatchTemp) || 0), 0) / activeItems.length).toFixed(1)
    : '4.0';

  const startX = 12;
  const startY = 10;
  const totalWidth = 186;

  const documentName = log.documentName || log.reportNo || getDispatchDocumentName(log);
  const revision = log.revision || 'Rev 01';
  const version = log.version || '01';
  const dateStr = log.date || new Date().toISOString().split('T')[0];
  const timeStr = log.dispatchTime || '15:13';
  const driverStr = log.driverName || 'Kamal Perera';
  const supervisorStr = log.supervisor || 'Barista IT Administrator';
  const supervisorId = log.supervisorId || 'admin-barista-00';
  const vehicleStr = log.vehicleNo || 'Refrigerated Van';
  const outletStr = (log.outletNames && log.outletNames.length > 0)
    ? log.outletNames.join(', ')
    : ((log as any).outletName || 'All Assigned Outlets');

  // ==========================================
  // SECTION 1: OFFICIAL HACCP CONTROL HEADER
  // ==========================================
  const headerHeight = 32;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(28, 25, 23);
  doc.setLineWidth(0.45);
  doc.roundedRect(startX, startY, totalWidth, headerHeight, 2.5, 2.5, 'S');

  // Vertical dividers between 3 header columns
  const col1W = 55;
  const col2W = 76;
  doc.line(startX + col1W, startY, startX + col1W, startY + headerHeight);
  doc.line(startX + col1W + col2W, startY, startX + col1W + col2W, startY + headerHeight);

  // Column 1: Logo & Central Kitchen Brand
  const col1CenterX = startX + col1W / 2;
  doc.setFillColor(239, 99, 64);
  doc.circle(col1CenterX, startY + 7.2, 4.8, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5.5);
  doc.setTextColor(255, 255, 255);
  doc.text('BARISTA', col1CenterX, startY + 8.1, { align: 'center' });

  doc.setFillColor(100, 27, 11);
  doc.rect(col1CenterX - 1.25, startY + 8.7, 2.5, 0.4, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(28, 25, 23);
  doc.text('BARISTA', col1CenterX, startY + 16.5, { align: 'center' });

  doc.setFontSize(5.5);
  doc.setTextColor(68, 64, 60);
  doc.text('SRI LANKA - CENTRAL KITCHEN', col1CenterX, startY + 20.5, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(4.8);
  doc.setTextColor(120, 113, 108);
  doc.text('Barista Coffee Lanka (Pvt) Ltd.', col1CenterX, startY + 24, { align: 'center' });

  // Column 2: Document Title & HACCP Certification
  const col2CenterX = startX + col1W + col2W / 2;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5.5);
  doc.setTextColor(110, 105, 100);
  doc.text('HACCP FOOD SAFETY MANAGEMENT SYSTEM', col2CenterX, startY + 5.5, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(28, 25, 23);
  doc.text('DISPATCH LOG &', col2CenterX, startY + 10, { align: 'center' });
  doc.text('RECEIPT', col2CenterX, startY + 14.5, { align: 'center' });

  // Pill badge
  doc.setFillColor(254, 242, 242);
  doc.setDrawColor(237, 83, 56);
  doc.setLineWidth(0.2);
  doc.roundedRect(col2CenterX - 24, startY + 16.5, 48, 4.5, 1, 1, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.2);
  doc.setTextColor(216, 66, 40);
  doc.text('OPRP-2 (Cold-Chain <= 5.0 C)', col2CenterX, startY + 19.8, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(28, 25, 23);
  doc.text(`Doc Ref: ${documentName}`, col2CenterX, startY + 24.5, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5.0);
  doc.setTextColor(120, 113, 108);
  doc.text('Central Kitchen Cold-Chain Logistics & Dispatch Custody', col2CenterX, startY + 28, { align: 'center' });

  // Column 3: Document Control Metadata
  const col3StartX = startX + col1W + col2W;
  const col3EndX = startX + totalWidth;
  const col3CenterX = (col3StartX + col3EndX) / 2;
  const row1H = 10.5;
  const row2H = 10.5;

  // Row 1: Record Code
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5.2);
  doc.setTextColor(110, 100, 95);
  doc.text('RECORD CODE', col3CenterX, startY + 4.2, { align: 'center' });
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(28, 25, 23);
  doc.text('BCL/REC/HACCP/32', col3CenterX, startY + 8.5, { align: 'center' });

  doc.setDrawColor(214, 211, 209);
  doc.setLineWidth(0.2);
  doc.line(col3StartX, startY + row1H, col3EndX, startY + row1H);

  // Row 2: Effective Date | Revision/Ver
  const leftSubCenterX = col3StartX + (col3EndX - col3StartX) / 4;
  const rightSubCenterX = col3StartX + ((col3EndX - col3StartX) * 3) / 4;
  doc.line(col3CenterX, startY + row1H, col3CenterX, startY + row1H + row2H);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(4.8);
  doc.setTextColor(110, 100, 95);
  doc.text('EFFECTIVE DATE', leftSubCenterX, startY + 14.5, { align: 'center' });
  doc.text('REVISION / VER', rightSubCenterX, startY + 14.5, { align: 'center' });
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(28, 25, 23);
  doc.text(dateStr, leftSubCenterX, startY + 18.5, { align: 'center' });
  doc.text(`${revision} / ${version}`, rightSubCenterX, startY + 18.5, { align: 'center' });

  doc.line(col3StartX, startY + row1H + row2H, col3EndX, startY + row1H + row2H);

  // Row 3: Approved By | Document Ref
  doc.line(col3CenterX, startY + row1H + row2H, col3CenterX, startY + headerHeight);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(4.8);
  doc.setTextColor(110, 100, 95);
  doc.text('APPROVED BY', leftSubCenterX, startY + 24.5, { align: 'center' });
  doc.text('DOCUMENT REF', rightSubCenterX, startY + 24.5, { align: 'center' });
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.2);
  doc.setTextColor(28, 25, 23);
  const displayApproved = supervisorStr.length > 20 ? supervisorStr.substring(0, 18) + '...' : supervisorStr;
  doc.text(displayApproved, leftSubCenterX, startY + 28.5, { align: 'center' });
  doc.text(documentName, rightSubCenterX, startY + 28.5, { align: 'center' });

  // ==========================================
  // SECTION 2: LOGISTICS MANIFEST DETAILS
  // ==========================================
  const logBoxY = startY + headerHeight + 4;
  const logBoxH = 17;
  doc.setFillColor(250, 250, 250);
  doc.setDrawColor(214, 211, 209);
  doc.setLineWidth(0.3);
  doc.roundedRect(startX, logBoxY, totalWidth, logBoxH, 2, 2, 'FD');

  // Row 1: 3 Logistics Labels and Values
  doc.setFontSize(5.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(120, 113, 108);
  doc.text('DESTINATION OUTLETS', startX + 4, logBoxY + 4);
  doc.text('DATE & DISPATCH TIME', startX + 70, logBoxY + 4);
  doc.text('ASSIGNED DISPATCH DRIVER', startX + 135, logBoxY + 4);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(28, 25, 23);
  doc.text(outletStr, startX + 4, logBoxY + 8);
  doc.text(`${dateStr} @ ${timeStr} hrs`, startX + 70, logBoxY + 8);
  doc.text(driverStr, startX + 135, logBoxY + 8);

  // Horizontal divider
  doc.setDrawColor(231, 229, 228);
  doc.setLineWidth(0.2);
  doc.line(startX + 4, logBoxY + 10.5, startX + totalWidth - 4, logBoxY + 10.5);

  // Row 2: QA Supervisor Info
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(120, 113, 108);
  doc.text('Dispatch QA / Supervisor: ', startX + 4, logBoxY + 14.5);
  const supPrefixW = doc.getTextWidth('Dispatch QA / Supervisor: ');
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(28, 25, 23);
  doc.text(supervisorStr, startX + 4 + supPrefixW, logBoxY + 14.5);
  const supNameW = doc.getTextWidth(supervisorStr);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(120, 113, 108);
  doc.text(` (${supervisorId})`, startX + 4 + supPrefixW + supNameW, logBoxY + 14.5);

  // ==========================================
  // SECTION 3: KITCHEN LINE ITEMS TABLE
  // ==========================================
  const titleY = logBoxY + logBoxH + 5;
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(28, 25, 23);
  doc.text(`DISPATCHED KITCHEN LINE ITEMS (${activeItems.length} PRODUCTS)`, startX, titleY);

  const tableRows = activeItems.map((item, idx) => [
    idx + 1,
    item.productName,
    item.batchNo || 'N/A',
    item.dispatchTime || timeStr,
    item.prodDate || '-',
    item.useByDate || '-',
    item.quantity,
    `${Number(item.dispatchTemp).toFixed(1)} C`
  ]);

  autoTable(doc, {
    startY: titleY + 2,
    margin: { left: startX, right: 12 },
    tableWidth: totalWidth,
    tableLineWidth: 0.45,
    tableLineColor: [28, 25, 23],
    head: [['#', 'PRODUCT DESCRIPTION', 'BATCH NO', 'DISPATCH TIME', 'PROD DATE', 'EXPIRATION DATE', 'QTY (UNITS)', 'DISPATCH TEMP']],
    body: tableRows,
    foot: [
      [
        {
          content: 'TOTAL DISPATCHED OUTPUT:',
          colSpan: 6,
          styles: {
            halign: 'center',
            valign: 'middle',
            fontStyle: 'bold',
            fontSize: 7.5,
            textColor: [28, 25, 23],
            fillColor: [255, 255, 255],
            lineWidth: 0.45,
            lineColor: [28, 25, 23]
          }
        },
        {
          content: `${totalUnits}\nUnits`,
          styles: {
            halign: 'center',
            valign: 'middle',
            fontStyle: 'bold',
            fontSize: 8.0,
            textColor: [28, 25, 23],
            fillColor: [231, 229, 228],
            lineWidth: 0.45,
            lineColor: [28, 25, 23]
          }
        },
        {
          content: `${avgTemp} C avg`,
          styles: {
            halign: 'center',
            valign: 'middle',
            fontStyle: 'bold',
            fontSize: 7.2,
            textColor: [28, 25, 23],
            fillColor: [255, 255, 255],
            lineWidth: 0.45,
            lineColor: [28, 25, 23]
          }
        }
      ]
    ],
    theme: 'grid',
    headStyles: {
      fillColor: [245, 245, 244],
      textColor: [28, 25, 23],
      fontSize: 6.5,
      fontStyle: 'bold',
      halign: 'center',
      valign: 'middle',
      lineWidth: 0.45,
      lineColor: [28, 25, 23]
    },
    bodyStyles: {
      fontSize: 7.2,
      textColor: [28, 25, 23],
      lineColor: [28, 25, 23],
      lineWidth: 0.45,
      valign: 'middle'
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 9, fontStyle: 'bold', textColor: [120, 113, 108] },
      1: { halign: 'left', cellWidth: 61, fontStyle: 'bold', textColor: [28, 25, 23] },
      2: { halign: 'center', cellWidth: 22, fontStyle: 'bold', textColor: [41, 37, 36] },
      3: { halign: 'center', cellWidth: 20 },
      4: { halign: 'center', cellWidth: 20, textColor: [68, 64, 60] },
      5: { halign: 'center', cellWidth: 20, textColor: [68, 64, 60] },
      6: { halign: 'center', cellWidth: 17, fontStyle: 'bold', fontSize: 8.5, textColor: [28, 25, 23] },
      7: { halign: 'center', cellWidth: 17, fontStyle: 'bold', textColor: [28, 25, 23] }
    },
    footStyles: {
      valign: 'middle'
    },
    didParseCell: function(data) {
      if (data.section === 'head' && data.column.index === 1) {
        data.cell.styles.halign = 'left';
      }
      if (data.section === 'body') {
        data.cell.styles.lineColor = [28, 25, 23];
        data.cell.styles.lineWidth = 0.45;
      }
      if (data.section === 'foot') {
        data.cell.styles.lineColor = [28, 25, 23];
        data.cell.styles.lineWidth = 0.45;
        data.cell.styles.valign = 'middle';
      }
    }
  });

  // ==========================================
  // SECTION 4: 3-PARTY CUSTODY SIGN-OFF MATRIX
  // ==========================================
  const lastTableFinalY = (doc as any).lastAutoTable?.finalY || 160;
  const signStartY = lastTableFinalY + 6;
  const signHeight = 32;

  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(28, 25, 23);
  doc.setLineWidth(0.45);
  doc.roundedRect(startX, signStartY, totalWidth, signHeight, 2, 2, 'S');

  // Black header bar
  doc.setFillColor(28, 25, 23);
  doc.rect(startX, signStartY, totalWidth, 5.5, 'F');
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text('VERIFICATION & CUSTODY HANDOVER SIGN-OFF (STRICT HACCP AUDIT PROTOCOL)', startX + 4, signStartY + 3.8);

  // 3 Columns with vertical dividers
  const colW = totalWidth / 3;
  doc.setDrawColor(28, 25, 23);
  doc.setLineWidth(0.3);
  doc.line(startX + colW, signStartY + 5.5, startX + colW, signStartY + signHeight);
  doc.line(startX + colW * 2, signStartY + 5.5, startX + colW * 2, signStartY + signHeight);

  // Column 1: Central Kitchen QA
  const c1X = startX + 3;
  doc.setFontSize(5.2);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(120, 113, 108);
  doc.text('1. CENTRAL KITCHEN DISPATCH QA', c1X, signStartY + 9);
  doc.setFontSize(7.5);
  doc.setTextColor(28, 25, 23);
  doc.text(supervisorStr, c1X, signStartY + 13.5);
  doc.setFontSize(6.0);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(120, 113, 108);
  doc.text(`Date: ${dateStr} @ ${timeStr}`, c1X, signStartY + 17);

  doc.setLineDashPattern([1, 1], 0);
  doc.setDrawColor(168, 162, 158);
  doc.line(c1X, signStartY + 19.5, startX + colW - 3, signStartY + 19.5);
  doc.setLineDashPattern([], 0);

  doc.setFontSize(5.2);
  doc.setTextColor(120, 113, 108);
  doc.text('Authorized Signature:', c1X, signStartY + 23);
  doc.setDrawColor(214, 211, 209);
  doc.setLineWidth(0.3);
  doc.line(c1X, signStartY + 29, startX + colW - 3, signStartY + 29);

  // Column 2: Cold-Chain Driver
  const c2X = startX + colW + 3;
  doc.setFontSize(5.2);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(120, 113, 108);
  doc.text('2. COLD-CHAIN TRANSPORT DRIVER', c2X, signStartY + 9);
  doc.setFontSize(7.5);
  doc.setTextColor(28, 25, 23);
  doc.text(driverStr, c2X, signStartY + 13.5);
  doc.setFontSize(6.0);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(120, 113, 108);
  doc.text(`Vehicle: ${vehicleStr}`, c2X, signStartY + 17);

  doc.setLineDashPattern([1, 1], 0);
  doc.setDrawColor(168, 162, 158);
  doc.line(c2X, signStartY + 19.5, startX + colW * 2 - 3, signStartY + 19.5);
  doc.setLineDashPattern([], 0);

  doc.setFontSize(5.2);
  doc.setTextColor(120, 113, 108);
  doc.text('Driver Acceptance Signature:', c2X, signStartY + 23);
  doc.setDrawColor(214, 211, 209);
  doc.setLineWidth(0.3);
  doc.line(c2X, signStartY + 29, startX + colW * 2 - 3, signStartY + 29);

  // Column 3: Store Receiving Barista
  const c3X = startX + colW * 2 + 3;
  doc.setFontSize(5.2);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(120, 113, 108);
  doc.text('3. RETAIL STORE RECEIVING BARISTA', c3X, signStartY + 9);
  doc.setFontSize(7.5);
  doc.setTextColor(28, 25, 23);
  doc.text('Branch Receiving Barista', c3X, signStartY + 13.5);
  doc.setFontSize(6.0);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(120, 113, 108);
  doc.text('Temp on Arrival: ______ C', c3X, signStartY + 17);

  doc.setLineDashPattern([1, 1], 0);
  doc.setDrawColor(168, 162, 158);
  doc.line(c3X, signStartY + 19.5, startX + totalWidth - 3, signStartY + 19.5);
  doc.setLineDashPattern([], 0);

  doc.setFontSize(5.2);
  doc.setTextColor(120, 113, 108);
  doc.text('Store Stamp & Signature:', c3X, signStartY + 23);
  doc.setDrawColor(214, 211, 209);
  doc.setLineWidth(0.3);
  doc.line(c3X, signStartY + 29, startX + totalWidth - 3, signStartY + 29);

  // ==========================================
  // SECTION 5: CONTROLLED DOCUMENT FOOTER
  // ==========================================
  const footerY = 286;
  doc.setDrawColor(214, 211, 209);
  doc.setLineWidth(0.2);
  doc.line(startX, footerY - 2.5, startX + totalWidth, footerY - 2.5);

  doc.setFontSize(5.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(120, 113, 108);
  doc.text('Barista Coffee Lanka - BCL/REC/HACCP/32 - Controlled Document', startX, footerY);
  doc.text(`Printed on: ${new Date().toLocaleString()}`, 105, footerY, { align: 'center' });
  doc.text('Page 1 of 1', startX + totalWidth, footerY, { align: 'right' });

  return doc;
}

export function getDispatchFilename(log: any): string {
  let outlet = '';
  if (Array.isArray(log?.outletNames) && log.outletNames.length > 0) {
    outlet = log.outletNames[0];
  } else if (typeof log?.outletName === 'string' && log.outletName.trim()) {
    outlet = log.outletName.trim();
  } else if (typeof log?.destination === 'string' && log.destination.trim()) {
    outlet = log.destination.trim();
  } else {
    outlet = 'Outlet';
  }
  const cleanOutlet = outlet.replace(/[^a-zA-Z0-9_-]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
  const docName = log?.documentName || log?.reportNo || 'DSP';
  const cleanDocName = docName.replace(/[^a-zA-Z0-9_-]/g, '_');
  const todayStr = (log?.date || new Date().toISOString().split('T')[0]);
  return `Barista_Dispatch_${cleanDocName}_${cleanOutlet}_${todayStr}.pdf`;
}

export function generateSingleDispatchPDF(log: any) {
  const doc = buildSingleDispatchDoc(log);
  const filename = getDispatchFilename(log);
  doc.save(filename);
}

export function printSingleDispatchPDF(log: any) {
  const doc = buildSingleDispatchDoc(log);
  const filename = getDispatchFilename(log);
  doc.autoPrint();
  const pdfBlob = doc.output('blob');
  const pdfUrl = URL.createObjectURL(pdfBlob);
  const win = window.open(pdfUrl, '_blank');
  if (!win) {
    doc.save(filename);
  }
}
