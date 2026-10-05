import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

/**
 * Universal single-window print helper.
 * Clones the printable document element into #print-root so that @media print
 * completely suppresses #root and prints ONLY the targeted document on a single clean page.
 */
export function syncToPrintRoot(elementId: string) {
  try {
    const sourceEl = document.getElementById(elementId);
    let printRoot = document.getElementById('print-root');
    if (!printRoot) {
      printRoot = document.createElement('div');
      printRoot.id = 'print-root';
      document.body.appendChild(printRoot);
    }
    if (sourceEl) {
      printRoot.innerHTML = sourceEl.outerHTML;
    }
  } catch (err) {
    console.error('Error syncing to print root:', err);
  }
}

export function clearPrintRoot() {
  try {
    const printRoot = document.getElementById('print-root');
    if (printRoot) {
      printRoot.innerHTML = '';
    }
  } catch (err) {
    console.error('Error clearing print root:', err);
  }
}

export function printHtmlElement(elementId?: string, title?: string) {
  try {
    if (elementId) {
      syncToPrintRoot(elementId);
    }
    const isLandscape = elementId === 'printable-executive-report-content';
    if (isLandscape) {
      document.body.classList.add('printing-landscape');
    }
    const prevTitle = document.title;
    if (title) {
      document.title = title;
    }
    const cleanup = () => {
      document.body.classList.remove('printing-landscape');
      document.title = prevTitle;
      window.removeEventListener('afterprint', cleanup);
    };
    window.addEventListener('afterprint', cleanup);
    window.focus();
    window.print();
    // Fallback cleanup if afterprint doesn't fire immediately
    setTimeout(cleanup, 2500);
  } catch (err) {
    console.error('Print error:', err);
  }
}

export function triggerDevicePrint(elementId?: string, title?: string) {
  printHtmlElement(elementId, title);
}

/**
 * Capture any printable HTML element and export it directly as an official PDF.
 * Ensures the downloaded PDF is 100% pixel-identical to the printed sheet.
 */
export async function downloadHtmlElementAsPDF(
  elementOrId: HTMLElement | string,
  filename: string,
  orientation: 'portrait' | 'landscape' = 'portrait'
): Promise<void> {
  try {
    const element = typeof elementOrId === 'string' ? document.getElementById(elementOrId) : elementOrId;
    if (!element) {
      console.error('downloadHtmlElementAsPDF: Element not found:', elementOrId);
      return;
    }

    // High resolution capture for retina/print crispness
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff'
    });

    const imgData = canvas.toDataURL('image/jpeg', 0.98);
    const pdf = new jsPDF({
      orientation,
      unit: 'mm',
      format: 'a4'
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const margin = 8;
    const contentWidth = pdfWidth - margin * 2;
    const contentHeight = (canvas.height * contentWidth) / canvas.width;

    if (contentHeight <= pdfHeight - margin * 2) {
      pdf.addImage(imgData, 'JPEG', margin, margin, contentWidth, contentHeight);
    } else {
      let heightLeft = contentHeight;
      let position = margin;

      pdf.addImage(imgData, 'JPEG', margin, position, contentWidth, contentHeight);
      heightLeft -= (pdfHeight - margin * 2);

      while (heightLeft > 0) {
        position = heightLeft - contentHeight + margin;
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', margin, position, contentWidth, contentHeight);
        heightLeft -= (pdfHeight - margin * 2);
      }
    }

    pdf.save(filename.endsWith('.pdf') ? filename : `${filename}.pdf`);
  } catch (err) {
    console.error('Error downloading HTML element as PDF:', err);
  }
}

/**
 * Generates the EXACT matching HTML template of the printed dispatch sheet.
 */
export function renderDispatchSheetHtml(log: any): string {
  const activeItems = (log.items || []).filter((i: any) => (i.quantity || 0) > 0);
  const totalUnits = activeItems.reduce((acc: number, item: any) => acc + (item.quantity || 0), 0);
  const avgTemp = activeItems.length > 0 
    ? (activeItems.reduce((s: number, i: any) => s + (i.dispatchTemp || 0), 0) / activeItems.length).toFixed(1)
    : '3.5';

  const docName = log.documentName || log.reportNo || 'DSP-0001';
  const reportNo = log.reportNo || docName;
  const rev = log.revision || 'Rev 01';
  const ver = log.version || '01';
  const outletsStr = log.outletNames && log.outletNames.length > 0 ? log.outletNames.join(', ') : (log.outletName || 'All Assigned Outlets');
  const dateStr = log.date || new Date().toISOString().split('T')[0];
  const timeStr = log.dispatchTime || '10:00';
  const driverStr = log.driverName || 'Cold-Chain Driver';
  const supervisorStr = log.supervisor || 'QA Executive';
  const vehicleStr = log.vehicleNo || 'WP CAD-4291';
  const notesStr = log.notes ? `<div style="margin-top: 6px; font-size: 11px; color: #555;">Transit Notes: <em style="color: #222;">${log.notes}</em></div>` : '';

  const tableRowsHtml = activeItems.map((item: any, idx: number) => `
    <tr style="border-bottom: 2px solid #1c1917; color: #1c1917;">
      <td style="padding: 6px 8px; border-right: 2px solid #1c1917; text-align: center; font-family: monospace; font-weight: bold; color: #78716c;">${idx + 1}</td>
      <td style="padding: 6px 8px; border-right: 2px solid #1c1917; font-weight: bold;">${item.productName}</td>
      <td style="padding: 6px 8px; border-right: 2px solid #1c1917; text-align: center; font-family: monospace; font-weight: 600; color: #292524;">${item.batchNo || 'N/A'}</td>
      <td style="padding: 6px 8px; border-right: 2px solid #1c1917; text-align: center; font-family: monospace;">${item.dispatchTime || timeStr}</td>
      <td style="padding: 6px 8px; border-right: 2px solid #1c1917; text-align: center; font-family: monospace; color: #44403c;">${item.prodDate || '-'}</td>
      <td style="padding: 6px 8px; border-right: 2px solid #1c1917; text-align: center; font-family: monospace; color: #44403c;">${item.useByDate || '-'}</td>
      <td style="padding: 6px 8px; border-right: 2px solid #1c1917; text-align: center; font-family: monospace; font-weight: bold; font-size: 13px; background-color: #fafaf9;">${item.quantity}</td>
      <td style="padding: 6px 8px; text-align: center; font-family: monospace; font-weight: bold; color: #1c1917;">${Number(item.dispatchTemp).toFixed(1)} C</td>
    </tr>
  `).join('');

  return `
    <div style="background-color: #ffffff; color: #1c1917; font-family: system-ui, -apple-system, sans-serif; padding: 24px; box-sizing: border-box; width: 100%;">
      <!-- Official Header -->
      <div style="border: 2px solid #1c1917; border-radius: 8px; overflow: hidden; margin-bottom: 14px; background: #ffffff;">
        <table style="width: 100%; border-collapse: collapse; text-align: center;">
          <tr>
            <td style="width: 33%; padding: 12px; border-right: 2px solid #1c1917; background-color: #fafaf9; vertical-align: middle;">
              <div style="width: 48px; height: 48px; border-radius: 50%; background: #EF6340; margin: 0 auto 6px; display: flex; align-items: center; justify-content: center;">
                <svg viewBox="0 0 1000 1000" style="width: 44px; height: 44px;" fill="none">
                  <circle cx="500" cy="500" r="500" fill="#EF6340"/>
                  <text x="500" y="672" text-anchor="middle" textLength="780" lengthAdjust="spacingAndGlyphs" font-family="Arial Narrow, sans-serif" font-size="345" font-weight="700" fill="#FFFFFF">BARISTA</text>
                  <rect x="502" y="640" width="150" height="32" rx="1" fill="#641B0B"/>
                </svg>
              </div>
              <div style="font-family: serif; font-weight: 900; letter-spacing: 2px; font-size: 18px; color: #1c1917;">BARISTA</div>
              <div style="font-size: 9px; font-weight: bold; letter-spacing: 1px; text-transform: uppercase; color: #44403c; margin-top: 2px;">SRI LANKA - CENTRAL KITCHEN</div>
              <div style="font-size: 8px; color: #78716c; font-family: monospace;">Barista Coffee Lanka (Pvt) Ltd.</div>
            </td>
            <td style="width: 37%; padding: 12px; border-right: 2px solid #1c1917; background-color: #ffffff; vertical-align: middle;">
              <div style="font-size: 9px; font-family: monospace; font-weight: 600; letter-spacing: 1px; text-transform: uppercase; color: #78716c;">HACCP FOOD SAFETY MANAGEMENT SYSTEM</div>
              <div style="font-size: 15px; font-weight: 900; text-transform: uppercase; color: #1c1917; margin: 4px 0;">DISPATCH LOG &amp; RECEIPT</div>
              <div style="display: inline-block; padding: 2px 8px; background: rgba(237, 83, 56, 0.1); color: #ED5338; border: 1px solid rgba(237, 83, 56, 0.3); border-radius: 4px; font-size: 9px; font-weight: bold; font-family: monospace;">OPRP-2 (Cold-Chain &le; 5.0 C)</div>
              <div style="font-size: 10px; font-family: monospace; font-weight: bold; color: #1c1917; margin-top: 4px;">Doc Ref: ${docName}</div>
              <div style="font-size: 8px; color: #78716c; margin-top: 3px;">Central Kitchen Cold-Chain Logistics &amp; Dispatch Custody</div>
            </td>
            <td style="width: 30%; padding: 0; background-color: #fafaf9; vertical-align: top;">
              <div style="padding: 6px; border-bottom: 1px solid #e7e5e4;">
                <div style="font-size: 8.5px; text-transform: uppercase; color: #78716c; font-weight: 600;">Record Code</div>
                <div style="font-family: monospace; font-weight: 900; font-size: 12px; color: #1c1917;">BCL/REC/HACCP/32</div>
              </div>
              <table style="width: 100%; border-collapse: collapse; border-bottom: 1px solid #e7e5e4;">
                <tr>
                  <td style="width: 50%; padding: 4px; border-right: 1px solid #e7e5e4; text-align: center;">
                    <div style="font-size: 8px; text-transform: uppercase; color: #78716c;">Effective Date</div>
                    <div style="font-family: monospace; font-size: 9px; font-weight: bold; color: #292524;">${dateStr}</div>
                  </td>
                  <td style="width: 50%; padding: 4px; text-align: center;">
                    <div style="font-size: 8px; text-transform: uppercase; color: #78716c;">Revision / Ver</div>
                    <div style="font-family: monospace; font-size: 9px; font-weight: bold; color: #1c1917;">${rev} / ${ver}</div>
                  </td>
                </tr>
              </table>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="width: 50%; padding: 4px; border-right: 1px solid #e7e5e4; text-align: center;">
                    <div style="font-size: 8px; text-transform: uppercase; color: #78716c;">Approved By</div>
                    <div style="font-size: 9px; font-weight: bold; color: #1c1917;">${supervisorStr}</div>
                  </td>
                  <td style="width: 50%; padding: 4px; text-align: center;">
                    <div style="font-size: 8px; text-transform: uppercase; color: #78716c;">Doc Ref ID</div>
                    <div style="font-family: monospace; font-size: 9px; font-weight: bold; color: #1c1917;">#${reportNo}</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </div>

      <!-- Logistics Details -->
      <div style="border: 1px solid #d6d3d1; border-radius: 8px; padding: 10px 14px; margin-bottom: 14px; background-color: #fafaf9; font-size: 11px;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="width: 40%; vertical-align: top;">
              <span style="font-size: 9px; text-transform: uppercase; font-weight: 600; color: #78716c; display: block;">Destination Outlets</span>
              <span style="font-weight: bold; font-size: 12px; color: #1c1917;">${outletsStr}</span>
            </td>
            <td style="width: 32%; vertical-align: top;">
              <span style="font-size: 9px; text-transform: uppercase; font-weight: 600; color: #78716c; display: block;">Date &amp; Dispatch Time</span>
              <span style="font-family: monospace; font-weight: bold; font-size: 12px; color: #1c1917;">${dateStr} @ ${timeStr} hrs</span>
            </td>
            <td style="width: 28%; vertical-align: top;">
              <span style="font-size: 9px; text-transform: uppercase; font-weight: 600; color: #78716c; display: block;">Assigned Dispatch Driver</span>
              <span style="font-weight: bold; font-size: 12px; color: #1c1917;">${driverStr}</span>
            </td>
          </tr>
        </table>
        <div style="margin-top: 8px; padding-top: 6px; border-top: 1px solid #e7e5e4; font-size: 10.5px; color: #57534e;">
          <span>Dispatch QA / Supervisor: <strong style="color: #1c1917;">${supervisorStr}</strong></span>
          ${notesStr}
        </div>
      </div>

      <!-- Items Table -->
      <div style="margin-bottom: 14px;">
        <div style="margin-bottom: 4px;">
          <span style="font-size: 11px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.5px; color: #292524;">
            Dispatched Kitchen Line Items (${activeItems.length} Products)
          </span>
        </div>
        <table style="width: 100%; border-collapse: collapse; font-size: 10.5px; border: 2px solid #1c1917;">
          <thead>
            <tr style="background-color: #f5f5f4; color: #1c1917; border-bottom: 2px solid #1c1917; font-weight: bold; text-transform: uppercase; font-size: 9px; letter-spacing: 0.5px;">
              <th style="padding: 6px 8px; border-right: 2px solid #1c1917; width: 28px; text-align: center;">#</th>
              <th style="padding: 6px 8px; border-right: 2px solid #1c1917; text-align: left;">Product Description</th>
              <th style="padding: 6px 8px; border-right: 2px solid #1c1917; width: 75px; text-align: center;">Batch No</th>
              <th style="padding: 6px 8px; border-right: 2px solid #1c1917; width: 70px; text-align: center;">Dispatch Time</th>
              <th style="padding: 6px 8px; border-right: 2px solid #1c1917; width: 70px; text-align: center;">Prod Date</th>
              <th style="padding: 6px 8px; border-right: 2px solid #1c1917; width: 70px; text-align: center;">Expiration Date</th>
              <th style="padding: 6px 8px; border-right: 2px solid #1c1917; width: 55px; text-align: center;">Qty (Units)</th>
              <th style="padding: 6px 8px; width: 65px; text-align: center;">Dispatch Temp</th>
            </tr>
          </thead>
          <tbody>
            ${tableRowsHtml}
          </tbody>
          <tfoot>
            <tr style="border-top: 2px solid #1c1917; border-bottom: 2px solid #1c1917; background-color: #ffffff; font-weight: bold; font-size: 11px; color: #1c1917;">
              <td colspan="6" style="padding: 8px; text-align: center; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 900; font-size: 11px; border-right: 2px solid #1c1917; border-bottom: 2px solid #1c1917; background-color: #ffffff; vertical-align: middle;">TOTAL DISPATCHED OUTPUT:</td>
              <td style="padding: 6px 8px; border-right: 2px solid #1c1917; border-bottom: 2px solid #1c1917; text-align: center; font-family: monospace; font-size: 12px; background-color: #e7e5e4; font-weight: 900; vertical-align: middle;">${totalUnits}<br/><span style="font-size: 10px;">Units</span></td>
              <td style="padding: 6px 8px; border-bottom: 2px solid #1c1917; text-align: center; font-family: monospace; font-size: 10.5px; background-color: #ffffff; vertical-align: middle;">${avgTemp} C avg</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <!-- Verification & Custody Handover Sign-off -->
      <div style="border: 2px solid #1c1917; border-radius: 8px; overflow: hidden; margin-bottom: 12px;">
        <div style="background-color: #1c1917; color: #ffffff; padding: 4px 10px; font-size: 9px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px;">
          Verification &amp; Custody Handover Sign-Off (Strict HACCP Audit Protocol)
        </div>
        <table style="width: 100%; border-collapse: collapse; font-size: 10px;">
          <tr>
            <td style="width: 33.33%; padding: 10px; vertical-align: top; border-right: 1px solid #1c1917;">
              <span style="font-size: 8.5px; font-weight: bold; text-transform: uppercase; color: #78716c; display: block;">1. Central Kitchen Dispatch QA</span>
              <div style="font-weight: bold; color: #1c1917; margin-top: 2px;">${supervisorStr}</div>
              <div style="font-size: 8.5px; color: #78716c; font-family: monospace;">Date: ${dateStr} @ ${timeStr}</div>
              <div style="margin-top: 14px; padding-top: 6px; border-top: 1px dashed #a8a29e;">
                <span style="font-size: 8px; color: #78716c; display: block;">Authorized Signature:</span>
                <div style="height: 18px; border-bottom: 1px solid #d6d3d1;"></div>
              </div>
            </td>
            <td style="width: 33.33%; padding: 10px; vertical-align: top; border-right: 1px solid #1c1917;">
              <span style="font-size: 8.5px; font-weight: bold; text-transform: uppercase; color: #78716c; display: block;">2. Cold-Chain Transport Driver</span>
              <div style="font-weight: bold; color: #1c1917; margin-top: 2px;">${driverStr}</div>
              <div style="font-size: 8.5px; color: #78716c; font-family: monospace;">Vehicle: ${vehicleStr}</div>
              <div style="margin-top: 14px; padding-top: 6px; border-top: 1px dashed #a8a29e;">
                <span style="font-size: 8px; color: #78716c; display: block;">Driver Acceptance Signature:</span>
                <div style="height: 18px; border-bottom: 1px solid #d6d3d1;"></div>
              </div>
            </td>
            <td style="width: 33.33%; padding: 10px; vertical-align: top;">
              <span style="font-size: 8.5px; font-weight: bold; text-transform: uppercase; color: #78716c; display: block;">3. Retail Store Receiving Barista</span>
              <div style="font-weight: bold; color: #1c1917; margin-top: 2px;">Branch Receiving Barista</div>
              <div style="font-size: 8.5px; color: #78716c; font-family: monospace;">Temp on Arrival: _____ C</div>
              <div style="margin-top: 14px; padding-top: 6px; border-top: 1px dashed #a8a29e;">
                <span style="font-size: 8px; color: #78716c; display: block;">Store Stamp &amp; Signature:</span>
                <div style="height: 18px; border-bottom: 1px solid #d6d3d1;"></div>
              </div>
            </td>
          </tr>
        </table>
      </div>

      <!-- Document Footer -->
      <div style="margin-top: 10px; padding-top: 6px; border-top: 1px solid #d6d3d1; display: flex; justify-content: space-between; font-size: 8.5px; color: #78716c; font-family: monospace;">
        <span>Barista Coffee Lanka - BCL/REC/HACCP/32 - Controlled Document</span>
        <span>Printed on: ${new Date().toLocaleString()}</span>
        <span>Page 1 of 1</span>
      </div>
    </div>
  `;
}

