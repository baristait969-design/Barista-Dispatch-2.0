import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { DispatchLog } from '../types';
import { getDispatchReportNo, getDispatchDocumentName } from './dispatchNumberUtils';

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

  // COLUMN 2: Title & HACCP
  const col2CenterX = startX + col1Width + col2Width / 2;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(isLandscape ? 5.5 : 6.0);
  doc.setTextColor(100, 95, 90);
  doc.text('HACCP FOOD SAFETY MANAGEMENT SYSTEM', col2CenterX, startY + (isLandscape ? 5.5 : 6.5), { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(isLandscape ? 9.5 : 10.5);
  doc.setTextColor(20, 20, 20);
  doc.text(config.title.toUpperCase(), col2CenterX, startY + (isLandscape ? 11.0 : 13.0), { align: 'center' });

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

  const startX = 18;
  const startY = 8;
  const totalWidth = 267;

  const nextY = drawHaccpHeaderToPdf(
    doc,
    startX,
    startY,
    totalWidth,
    {
      title: 'Executive QA & Dispatch Summary',
      subtitle: 'Central Kitchen Food Safety & Cold-Chain Adherence Audit',
      docCode: 'BCL/QA/REP/EXEC',
      effectiveDate: dateRange,
      revision: 'Rev 01',
      version: '01',
      approvedBy: userName,
      refId: `AUD-${stats.totalDispatches}-REC`,
      haccpLink: 'OPRP-2 Certified (<= 5.0 C)'
    },
    true
  );

  const kpiY = nextY;
  const kpiH = 15;
  doc.setFillColor(246, 246, 248);
  doc.rect(startX, kpiY, totalWidth, kpiH, 'F');
  doc.setDrawColor(210, 210, 215);
  doc.setLineWidth(0.3);
  doc.rect(startX, kpiY, totalWidth, kpiH, 'S');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(80, 80, 80);
  doc.text('TOTAL DISPATCHES', 20, kpiY + 5);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(20, 20, 20);
  doc.text(String(stats.totalDispatches), 20, kpiY + 11.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(80, 80, 80);
  doc.text('TOTAL OUTPUT', 65, kpiY + 5);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(20, 20, 20);
  doc.text(`${stats.totalUnitsDispatched} Units`, 65, kpiY + 11.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(80, 80, 80);
  doc.text('COLD-CHAIN ADHERENCE', 120, kpiY + 5);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(stats.haccpComplianceRate >= 95 ? 16 : 180, stats.haccpComplianceRate >= 95 ? 140 : 80, 50);
  doc.text(`${stats.haccpComplianceRate}% (OPRP-2)`, 120, kpiY + 11.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(80, 80, 80);
  doc.text('AVG DISPATCH TEMP', 190, kpiY + 5);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(20, 20, 20);
  doc.text(`${stats.averageTemp} C`, 190, kpiY + 11.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(80, 80, 80);
  doc.text('ACTIVE OUTLETS', 245, kpiY + 5);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(20, 20, 20);
  doc.text(String(stats.outletsCount), 245, kpiY + 11.5);

  const tableRows: any[] = [];
  logs.forEach(log => {
    const totalUnits = log.items.reduce((s, i) => s + i.quantity, 0);
    const isCompliant = log.items.every(i => i.dispatchTemp <= 5.0);
    const itemSummary = log.items.filter(i => i.quantity > 0).map(i => `${i.productName} (${i.quantity})`).join(', ');
    tableRows.push([
      log.docNo,
      `${log.date} ${log.dispatchTime}`,
      log.outletNames.join(', '),
      log.driverName,
      log.supervisor,
      `${log.items.filter(i => i.quantity > 0).length} items (${totalUnits} units)`,
      itemSummary || 'None',
      isCompliant ? 'PASS (<=5 C)' : 'DEV (>5 C)'
    ]);
  });

  autoTable(doc, {
    startY: kpiY + kpiH + 4,
    head: [['Doc No', 'Date / Time', 'Destination Outlets', 'Driver', 'QA Supervisor', 'Output', 'Product Breakdown', 'HACCP']],
    body: tableRows,
    theme: 'grid',
    headStyles: {
      fillColor: [35, 32, 29],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
      halign: 'left'
    },
    bodyStyles: {
      fontSize: 7.5,
      textColor: [40, 40, 40]
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 26 },
      1: { cellWidth: 26 },
      2: { cellWidth: 42 },
      3: { cellWidth: 30 },
      4: { cellWidth: 30 },
      5: { cellWidth: 28 },
      6: { cellWidth: 62 },
      7: { fontStyle: 'bold', cellWidth: 25, halign: 'center' }
    },
    didParseCell: function(data) {
      if (data.section === 'body' && data.column.index === 7) {
        if (data.cell.raw === 'PASS (<=5 C)') {
          data.cell.styles.textColor = [16, 120, 50];
        } else {
          data.cell.styles.textColor = [180, 20, 20];
        }
      }
    },
    margin: { left: startX, right: 12, bottom: 20 }
  });

  const lastTableFinalY = (doc as any).lastAutoTable?.finalY || 140;
  let execSignY = lastTableFinalY + 6;
  if (execSignY + 26 > 195) {
    doc.addPage();
    execSignY = 16;
  }

  doc.setDrawColor(30, 25, 22);
  doc.setLineWidth(0.35);
  doc.rect(startX, execSignY, totalWidth, 22, 'S');

  doc.setFillColor(35, 32, 29);
  doc.rect(startX, execSignY, totalWidth, 4.2, 'F');
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text('EXECUTIVE QA SIGN-OFF & CONTROLLED AUDIT CERTIFICATION', startX + 4, execSignY + 3.0);

  const colW = totalWidth / 3;
  doc.setDrawColor(200, 200, 205);
  doc.setLineWidth(0.25);
  doc.line(startX + colW, execSignY + 4.2, startX + colW, execSignY + 22);
  doc.line(startX + colW * 2, execSignY + 4.2, startX + colW * 2, execSignY + 22);

  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(80, 80, 80);
  doc.text('1. Central Kitchen QA Supervisor', startX + 4, execSignY + 8.0);
  doc.setFontSize(7.5);
  doc.setTextColor(20, 20, 20);
  doc.text(userName || 'QA Executive', startX + 4, execSignY + 12.5);
  doc.setFontSize(6.2);
  doc.setTextColor(100, 100, 100);
  doc.setFont('helvetica', 'normal');
  doc.text('Authorized Signature: _______________________', startX + 4, execSignY + 18.5);

  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(80, 80, 80);
  doc.text('2. Central Kitchen Manager', startX + colW + 4, execSignY + 8.0);
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
  doc.text('3. Quality Assurance Executive', startX + colW * 2 + 4, execSignY + 8.0);
  doc.setFontSize(7.5);
  doc.setTextColor(20, 20, 20);
  doc.text('Lead HACCP Auditor', startX + colW * 2 + 4, execSignY + 12.5);
  doc.setFontSize(6.2);
  doc.setTextColor(100, 100, 100);
  doc.setFont('helvetica', 'normal');
  doc.text('QA Auditor Signature: _______________________', startX + colW * 2 + 4, execSignY + 18.5);

  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(120, 120, 120);
    doc.text(
      `Barista Coffee Lanka (Pvt) Ltd. - Doc: BCL/QA/REP/EXEC - Official HACCP Audit Record - Page ${i} of ${pageCount}`,
      startX,
      202
    );
  }

  return doc;
}

export function generateExecutiveReportPDF(
  logs: DispatchLog[],
  stats: any,
  userName: string = 'QA Executive',
  dateRange: string = 'All Records'
) {
  const doc = buildExecutiveReportDoc(logs, stats, userName, dateRange);
  const todayStr = new Date().toISOString().split('T')[0];
  doc.save(`Barista_Executive_Dispatch_Report_${todayStr}.pdf`);
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
}): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const activeItems = log.items.filter(item => item.quantity > 0);
  const totalUnits = activeItems.reduce((acc, item) => acc + item.quantity, 0);
  const isAllHaccpCompliant = activeItems.every(item => item.dispatchTemp <= 5.0);

  const startX = 20;
  const startY = 10;
  const totalWidth = 178;

  const reportNo = log.reportNo || getDispatchReportNo(log);
  const documentName = log.documentName || getDispatchDocumentName(log);
  const revision = log.revision || 'Rev 01';
  const version = log.version || '01';

  const nextY = drawHaccpHeaderToPdf(
    doc,
    startX,
    startY,
    totalWidth,
    {
      title: 'Dispatch Log & Receipt',
      subtitle: 'Central Kitchen Cold-Chain Logistics & Dispatch Custody',
      docCode: 'BCL/REC/HACCP/32',
      effectiveDate: log.date || '01 January 2025',
      revision: revision,
      version: version,
      approvedBy: log.supervisor || 'QA Executive',
      refId: documentName,
      haccpLink: 'OPRP-2 (Cold-Chain <= 5.0 C)'
    },
    false
  );

  const logBoxY = nextY;
  const logBoxH = 18;
  doc.setFillColor(248, 248, 250);
  doc.rect(startX, logBoxY, totalWidth, logBoxH, 'F');
  doc.setDrawColor(200, 200, 205);
  doc.setLineWidth(0.3);
  doc.rect(startX, logBoxY, totalWidth, logBoxH, 'S');

  doc.setFontSize(7.5);
  doc.setTextColor(100, 100, 100);
  doc.setFont('helvetica', 'bold');
  doc.text('DESTINATION OUTLETS', startX + 4, logBoxY + 4.5);
  doc.text('DATE & DISPATCH TIME', startX + 70, logBoxY + 4.5);
  doc.text('ASSIGNED DRIVER', startX + 130, logBoxY + 4.5);

  doc.setFontSize(9);
  doc.setTextColor(20, 20, 20);
  doc.text(log.outletNames.join(', ') || 'Retail Branches', startX + 4, logBoxY + 10);
  doc.text(`${log.date} @ ${log.dispatchTime}`, startX + 70, logBoxY + 10);
  doc.text(log.driverName || 'Fleet Driver', startX + 130, logBoxY + 10);

  doc.setFontSize(7.5);
  doc.setTextColor(80, 80, 80);
  doc.setFont('helvetica', 'normal');
  doc.text(`QA Supervisor: ${log.supervisor || 'QA Officer'}${log.notes ? ` - Notes: ${log.notes}` : ''}`, startX + 4, logBoxY + 15);

  const tableRows = activeItems.map((item, idx) => {
    const isCompliant = item.dispatchTemp <= 5.0;
    return [
      idx + 1,
      item.productName,
      item.batchNo || 'N/A',
      item.dispatchTime || log.dispatchTime,
      item.prodDate || '-',
      item.useByDate || '-',
      item.quantity,
      `${item.dispatchTemp.toFixed(1)} C`,
      isCompliant ? 'PASS (<=5 C)' : 'FAIL (>5 C)'
    ];
  });

  autoTable(doc, {
    startY: logBoxY + logBoxH + 4,
    head: [['#', 'Product Description', 'Batch No', 'Time', 'Prod Date', 'Expiration Date', 'Qty', 'Temp', 'HACCP Check']],
    body: tableRows,
    theme: 'grid',
    headStyles: {
      fillColor: [35, 32, 29],
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: 'bold'
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [30, 30, 30]
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 10 },
      1: { fontStyle: 'bold', cellWidth: 58 },
      2: { halign: 'center', cellWidth: 16 },
      3: { halign: 'center', cellWidth: 18 },
      4: { halign: 'center', cellWidth: 19 },
      5: { halign: 'center', cellWidth: 19 },
      6: { halign: 'center', fontStyle: 'bold', cellWidth: 14 },
      7: { halign: 'center', fontStyle: 'bold', cellWidth: 12 },
      8: { halign: 'center', fontStyle: 'bold', cellWidth: 12 }
    },
    didParseCell: function(data) {
      if (data.section === 'body' && data.column.index === 8) {
        if (String(data.cell.raw).startsWith('PASS')) {
          data.cell.styles.textColor = [16, 120, 50];
        } else {
          data.cell.styles.textColor = [180, 20, 20];
        }
      }
    }
  });

  const finalY = (doc as any).lastAutoTable.finalY + 5;
  doc.setFillColor(240, 240, 245);
  doc.rect(startX, finalY, totalWidth, 9, 'F');
  doc.setDrawColor(200, 200, 205);
  doc.setLineWidth(0.3);
  doc.rect(startX, finalY, totalWidth, 9, 'S');

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(20, 20, 20);
  doc.text(`TOTAL DISPATCHED OUTPUT: ${totalUnits} UNITS`, startX + 4, finalY + 6);

  doc.setTextColor(isAllHaccpCompliant ? 16 : 180, isAllHaccpCompliant ? 130 : 20, 40);
  doc.text(
    isAllHaccpCompliant ? '100% Cold-Chain Compliant (<= 5.0 C)' : 'HACCP Temperature Breach Detected',
    startX + totalWidth - 78,
    finalY + 6
  );

  const signY = finalY + 12;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(30, 27, 24);
  doc.setLineWidth(0.4);
  doc.rect(startX, signY, totalWidth, 32, 'S');

  doc.setFillColor(30, 27, 24);
  doc.rect(startX, signY, totalWidth, 5.5, 'F');
  doc.setFontSize(7);
  doc.setTextColor(255, 255, 255);
  doc.text('VERIFICATION & CUSTODY HANDOVER SIGN-OFF (STRICT HACCP AUDIT PROTOCOL)', startX + 4, signY + 4);

  const colW = totalWidth / 3;
  doc.setDrawColor(200, 200, 205);
  doc.setLineWidth(0.3);
  doc.line(startX + colW, signY + 5.5, startX + colW, signY + 32);
  doc.line(startX + colW * 2, signY + 5.5, startX + colW * 2, signY + 32);

  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(80, 80, 80);
  doc.text('1. Central Kitchen QA Supervisor', startX + 4, signY + 10);
  doc.setFontSize(8);
  doc.setTextColor(20, 20, 20);
  doc.text(log.supervisor || 'QA Officer', startX + 4, signY + 16);
  doc.setFontSize(6.5);
  doc.setTextColor(100, 100, 100);
  doc.text('Authorized Signature: __________________', startX + 4, signY + 26);

  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(80, 80, 80);
  doc.text('2. Cold-Chain Transport Driver', startX + colW + 4, signY + 10);
  doc.setFontSize(8);
  doc.setTextColor(20, 20, 20);
  doc.text(log.driverName || 'Driver', startX + colW + 4, signY + 16);
  doc.setFontSize(6.5);
  doc.setTextColor(100, 100, 100);
  doc.text('Driver Signature: ______________________', startX + colW + 4, signY + 26);

  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(80, 80, 80);
  doc.text('3. Retail Store Receiving Barista', startX + colW * 2 + 4, signY + 10);
  doc.setFontSize(8);
  doc.setTextColor(20, 20, 20);
  doc.text('Receiving Store Staff', startX + colW * 2 + 4, signY + 16);
  doc.setFontSize(6.5);
  doc.setTextColor(100, 100, 100);
  doc.text('Store Stamp & Sign: ____________________', startX + colW * 2 + 4, signY + 26);

  doc.setFontSize(6.5);
  doc.setTextColor(130, 130, 130);
  doc.text(`Barista Coffee Lanka - BCL/REC/HACCP/32 - Doc Ref: ${documentName} (${revision} / ${version}) - Report #: ${reportNo}`, startX, 287);
  doc.text(`Printed: ${new Date().toLocaleString()}`, startX + totalWidth - 45, 287);

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
