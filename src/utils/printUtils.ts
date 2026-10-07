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

    // Dynamic A4 portrait page size injection for strict browser compliance
    const pageStyle = document.createElement('style');
    pageStyle.id = 'dynamic-print-page-style';
    pageStyle.textContent = `@media print { @page { size: A4 portrait !important; margin: 6mm 8mm 6mm 8mm !important; } }`;
    document.head.appendChild(pageStyle);

    const prevTitle = document.title;
    if (title) {
      document.title = title;
    }
    const cleanup = () => {
      document.body.classList.remove('printing-landscape');
      document.title = prevTitle;
      const s = document.getElementById('dynamic-print-page-style');
      if (s) s.remove();
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
 * Capture any printable HTML element and export it directly as an official A4 PDF.
 * Ensures the downloaded PDF is 100% pixel-identical to the printed sheet.
 */
export async function downloadHtmlElementAsPDF(
  elementOrId: HTMLElement | string,
  filename: string,
  orientation: 'portrait' | 'landscape' = 'portrait'
): Promise<boolean> {
  try {
    let element: HTMLElement | null = typeof elementOrId === 'string' ? document.getElementById(elementOrId) : elementOrId;
    if (!element) {
      await new Promise(r => setTimeout(r, 150));
      element = typeof elementOrId === 'string' ? document.getElementById(elementOrId) : elementOrId;
    }

    if (!element) {
      console.error('downloadHtmlElementAsPDF: Element not found:', elementOrId);
      return false;
    }

    // High resolution capture for retina/print crispness
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      onclone: (_clonedDoc, clonedEl) => {
        // If element or any ancestor is positioned off-screen, promote it in clone
        if (clonedEl) {
          let parent = clonedEl.parentElement;
          while (parent && parent !== _clonedDoc.body) {
            parent.style.position = 'static';
            parent.style.left = '0';
            parent.style.top = '0';
            parent.style.transform = 'none';
            parent.style.opacity = '1';
            parent.style.visibility = 'visible';
            parent = parent.parentElement;
          }
          clonedEl.style.position = 'static';
          clonedEl.style.left = '0';
          clonedEl.style.top = '0';
          clonedEl.style.opacity = '1';
          clonedEl.style.visibility = 'visible';
          clonedEl.style.display = 'block';
          clonedEl.style.margin = '0 auto';
          clonedEl.style.width = '794px';
          clonedEl.style.maxWidth = '794px';
        }
      }
    });

    const pdf = new jsPDF({
      orientation,
      unit: 'mm',
      format: 'a4'
    });

    const pdfWidth = pdf.internal.pageSize.getWidth(); // 210mm for A4 portrait
    const pdfHeight = pdf.internal.pageSize.getHeight(); // 297mm for A4 portrait
    const margin = 8;
    const contentWidth = pdfWidth - margin * 2;
    const pageAvailHeight = pdfHeight - margin * 2;

    // Detect actual table row and section boundaries to prevent splitting rows across pages
    const elementRect = element.getBoundingClientRect();
    const rows = Array.from(element.querySelectorAll('tr, header, .grid > div, .signoff-box, .print-avoid-break'));
    const boundaries: number[] = [];
    rows.forEach(el => {
      const r = el.getBoundingClientRect();
      const bottomPx = r.bottom - elementRect.top;
      if (bottomPx > 10 && bottomPx < element.scrollHeight) {
        boundaries.push(bottomPx);
      }
    });
    boundaries.sort((a, b) => a - b);

    const totalHeightPx = element.scrollHeight || element.offsetHeight || (canvas.height / 2);
    const mmPerPx = contentWidth / (element.offsetWidth || 794);
    const pageAvailHeightPx = pageAvailHeight / mmPerPx;
    const canvasScale = canvas.width / (element.offsetWidth || 794);

    // Determine smart cut points where no table row is cut in half
    const cutPoints: number[] = [0];
    let currentCut = 0;

    while (currentCut < totalHeightPx - 15) {
      const maxCut = currentCut + pageAvailHeightPx;
      if (maxCut >= totalHeightPx) {
        cutPoints.push(totalHeightPx);
        break;
      }

      // Find the last row bottom that fits comfortably on this page
      const validBoundaries = boundaries.filter(b => b <= maxCut && b > currentCut + (pageAvailHeightPx * 0.4));
      let bestCut = maxCut;
      if (validBoundaries.length > 0) {
        bestCut = validBoundaries[validBoundaries.length - 1];
      } else {
        bestCut = maxCut;
      }

      // Prevent zero progress loop
      if (bestCut <= currentCut + 40) {
        bestCut = Math.min(currentCut + pageAvailHeightPx, totalHeightPx);
      }

      cutPoints.push(bestCut);
      currentCut = bestCut;
    }

    if (cutPoints.length <= 2 && (totalHeightPx * mmPerPx) <= pageAvailHeight) {
      // Single page document
      const imgData = canvas.toDataURL('image/jpeg', 0.98);
      const contentHeight = (canvas.height * contentWidth) / canvas.width;
      pdf.addImage(imgData, 'JPEG', margin, margin, contentWidth, Math.min(contentHeight, pageAvailHeight));
    } else {
      // Multi-page document with clean row-boundary slicing
      for (let i = 0; i < cutPoints.length - 1; i++) {
        const startY = cutPoints[i];
        const endY = cutPoints[i + 1];
        const sliceHeightPx = endY - startY;
        if (sliceHeightPx <= 0) continue;

        const sliceCanvas = document.createElement('canvas');
        sliceCanvas.width = canvas.width;
        sliceCanvas.height = Math.round(sliceHeightPx * canvasScale);
        const ctx = sliceCanvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height);
          ctx.drawImage(
            canvas,
            0,
            Math.round(startY * canvasScale),
            canvas.width,
            Math.round(sliceHeightPx * canvasScale),
            0,
            0,
            sliceCanvas.width,
            sliceCanvas.height
          );
        }

        const sliceImgData = sliceCanvas.toDataURL('image/jpeg', 0.98);
        const slicePdfHeight = (sliceHeightPx * contentWidth) / (element.offsetWidth || 794);

        if (i > 0) {
          pdf.addPage();
        }
        pdf.addImage(sliceImgData, 'JPEG', margin, margin, contentWidth, slicePdfHeight);
      }
    }

    pdf.save(filename.endsWith('.pdf') ? filename : `${filename}.pdf`);
    return true;
  } catch (err) {
    console.error('Error downloading HTML element as PDF:', err);
    return false;
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
      <div style="border: 2px solid #1c1917; border-radius: 8px; overflow: hidden; margin-bottom: 14px; background: #ffffff; box-sizing: border-box;">
        <table style="width: 100%; border-collapse: separate; border-spacing: 0; text-align: center;">
          <tr>
            <td style="width: 33%; padding: 12px 10px; border-right: 2px solid #1c1917; background-color: #fafaf9; vertical-align: middle;">
              <div style="width: 48px; height: 48px; border-radius: 50%; background: #EF6340; margin: 0 auto 6px; display: flex; align-items: center; justify-content: center;">
                <svg viewBox="0 0 1000 1000" style="width: 44px; height: 44px;" fill="none">
                  <circle cx="500" cy="500" r="500" fill="#EF6340"/>
                  <text x="500" y="672" text-anchor="middle" textLength="780" lengthAdjust="spacingAndGlyphs" font-family="Arial Narrow, sans-serif" font-size="345" font-weight="700" fill="#FFFFFF">BARISTA</text>
                  <rect x="502" y="640" width="150" height="32" rx="1" fill="#641B0B"/>
                </svg>
              </div>
              <div style="font-family: serif; font-weight: 900; letter-spacing: 2px; font-size: 18px; color: #1c1917; line-height: 1.2;">BARISTA</div>
              <div style="font-size: 9px; font-weight: bold; letter-spacing: 1px; text-transform: uppercase; color: #44403c; margin-top: 2px; line-height: 1.2;">SRI LANKA - CENTRAL KITCHEN</div>
              <div style="font-size: 8px; color: #78716c; font-family: monospace; margin-top: 2px; line-height: 1.2;">Barista Coffee Lanka (Pvt) Ltd.</div>
            </td>
            <td style="width: 37%; padding: 12px 10px; border-right: 2px solid #1c1917; background-color: #ffffff; vertical-align: middle;">
              <div style="font-size: 9px; font-family: monospace; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; color: #78716c; line-height: 1.2;">HACCP FOOD SAFETY MANAGEMENT SYSTEM</div>
              <div style="font-size: 15px; font-weight: 900; text-transform: uppercase; color: #1c1917; margin: 4px 0; line-height: 1.2;">DISPATCH LOG &amp; RECEIPT</div>
              <div style="display: inline-block; padding: 2px 8px; background: #ffedd5; color: #9a3412; border: 1.5px solid #1c1917; border-radius: 4px; font-size: 9px; font-weight: bold; font-family: monospace; margin: 2px 0;">OPRP-2 (Cold-Chain &le; 5.0 C)</div>
              <div style="font-size: 10px; font-family: monospace; font-weight: bold; color: #1c1917; margin-top: 3px; line-height: 1.2;">Doc Ref: ${docName}</div>
              <div style="font-size: 8.5px; color: #78716c; margin-top: 3px; line-height: 1.2;">Central Kitchen Cold-Chain Logistics &amp; Dispatch Custody</div>
            </td>
            <td style="width: 30%; padding: 0; background-color: #fafaf9; vertical-align: middle; text-align: center;">
              <table style="width: 100%; height: 100%; border-collapse: collapse; text-align: center;">
                <tbody>
                  <tr style="border-bottom: 1.5px solid #1c1917;">
                    <td colspan="2" style="padding: 7px 4px; text-align: center; vertical-align: middle;">
                      <div style="font-size: 7.5px; text-transform: uppercase; color: #78716c; font-weight: 700; line-height: 1.1;">Record Code</div>
                      <div style="font-family: monospace; font-weight: 900; font-size: 12px; color: #1c1917; line-height: 1.2; margin-top: 2px;">BCL/REC/HACCP/32</div>
                    </td>
                  </tr>
                  <tr style="border-bottom: 1.5px solid #1c1917;">
                    <td style="width: 50%; padding: 6px 3px; border-right: 1.5px solid #1c1917; text-align: center; vertical-align: middle;">
                      <div style="font-size: 7.5px; text-transform: uppercase; color: #78716c; font-weight: 600; line-height: 1.1;">Effective Date</div>
                      <div style="font-family: monospace; font-size: 8.5px; font-weight: bold; color: #1c1917; line-height: 1.2; margin-top: 1px;">${dateStr}</div>
                    </td>
                    <td style="width: 50%; padding: 6px 3px; text-align: center; vertical-align: middle;">
                      <div style="font-size: 7.5px; text-transform: uppercase; color: #78716c; font-weight: 600; line-height: 1.1;">Revision / Ver</div>
                      <div style="font-family: monospace; font-size: 8.5px; font-weight: bold; color: #1c1917; line-height: 1.2; margin-top: 1px;">${rev} / ${ver}</div>
                    </td>
                  </tr>
                  <tr>
                    <td style="width: 50%; padding: 6px 3px; border-right: 1.5px solid #1c1917; text-align: center; vertical-align: middle;">
                      <div style="font-size: 7.5px; text-transform: uppercase; color: #78716c; font-weight: 600; line-height: 1.1;">Approved By</div>
                      <div style="font-size: 8.5px; font-weight: bold; color: #1c1917; line-height: 1.2; margin-top: 1px; word-break: break-word; padding: 0 2px;">${supervisorStr}</div>
                    </td>
                    <td style="width: 50%; padding: 6px 3px; text-align: center; vertical-align: middle;">
                      <div style="font-size: 7.5px; text-transform: uppercase; color: #78716c; font-weight: 600; line-height: 1.1;">Doc Ref ID</div>
                      <div style="font-family: monospace; font-size: 8.5px; font-weight: bold; color: #1c1917; line-height: 1.2; margin-top: 1px; word-break: break-word; padding: 0 2px;">#${reportNo}</div>
                    </td>
                  </tr>
                </tbody>
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

/**
 * Generates the EXACT matching HTML template of the printed monthly dispatch summary report.
 */
export function renderMonthlyExecutiveReportHtml(
  logs: any[],
  stats: any,
  generatedBy: string = 'Barista IT Administrator',
  filterPeriod: string = 'Current Month Cycle'
): string {
  const tableRowsHtml = logs.map((log: any, index: number) => {
    const docName = log.documentName || log.docNo || `DSP-${String(index + 1).padStart(4, '0')}`;
    const activeItems = (log.items || []).filter((i: any) => (i.quantity || 0) > 0);
    const temps = activeItems.map((i: any) => i.dispatchTemp);
    const avgLogTemp = temps.length > 0 
      ? (temps.reduce((a: number, b: number) => a + b, 0) / temps.length).toFixed(1) 
      : '3.5';

    // Aggregate quantities per unique product name
    const aggregatedMap = new Map<string, { productName: string; quantity: number; unit: string }>();
    activeItems.forEach((item: any) => {
      const normName = item.productName.trim();
      const existing = aggregatedMap.get(normName);
      if (existing) {
        existing.quantity += (item.quantity || 0);
      } else {
        aggregatedMap.set(normName, {
          productName: item.productName,
          quantity: item.quantity || 0,
          unit: item.unit || 'Units'
        });
      }
    });
    const aggregatedItems = Array.from(aggregatedMap.values());

    const productsHtml = aggregatedItems.length === 0
      ? '<div style="color: #a8a29e; font-style: italic; font-size: 11px;">No items recorded</div>'
      : aggregatedItems.map(i => `
          <div style="font-size: 12px; font-weight: 600; color: #0c0a09; text-align: left; padding: 2px 0;">
            ${i.productName}
          </div>
        `).join('');

    const outputsHtml = aggregatedItems.length === 0
      ? '<span style="color: #a8a29e; font-size: 11px;">0 Units</span>'
      : aggregatedItems.map(i => `
          <div style="font-size: 12px; font-weight: bold; color: #1c1917; padding: 2px 0;">
            ${i.quantity} <span style="font-size: 10px; color: #57534e; font-weight: normal;">${i.unit}</span>
          </div>
        `).join('');

    const outletsStr = log.outletNames && log.outletNames.length > 0 ? log.outletNames.join(', ') : 'All Outlets';

    return `
      <tr style="border-bottom: 1px solid #1c1917; color: #1c1917;">
        <td style="padding: 8px 6px; border-right: 1px solid #d6d3d1; border-bottom: 1px solid #1c1917; text-align: center; font-family: monospace; font-weight: bold; color: #57534e; vertical-align: middle;">${index + 1}</td>
        <td style="padding: 8px 6px; border-right: 1px solid #d6d3d1; border-bottom: 1px solid #1c1917; text-align: center; font-family: monospace; font-weight: bold; font-size: 11px; color: #0c0a09; vertical-align: middle;">${docName}</td>
        <td style="padding: 8px 6px; border-right: 1px solid #d6d3d1; border-bottom: 1px solid #1c1917; text-align: center; font-weight: bold; font-size: 11px; color: #0c0a09; vertical-align: middle;">${outletsStr}</td>
        <td style="padding: 8px 6px; border-right: 1px solid #d6d3d1; border-bottom: 1px solid #1c1917; text-align: center; font-size: 11px; font-weight: 600; color: #1c1917; vertical-align: middle;">${log.driverName}</td>
        <td style="padding: 8px 6px; border-right: 1px solid #d6d3d1; border-bottom: 1px solid #1c1917; text-align: center; font-size: 11px; color: #1c1917; vertical-align: middle;">${log.supervisor}</td>
        <td style="padding: 8px 10px; border-right: 1px solid #d6d3d1; border-bottom: 1px solid #1c1917; vertical-align: middle; min-width: 180px;">${productsHtml}</td>
        <td style="padding: 8px 6px; border-right: 1px solid #d6d3d1; border-bottom: 1px solid #1c1917; text-align: center; font-family: monospace; font-size: 11px; background-color: #ffffff; vertical-align: middle;">${outputsHtml}</td>
        <td style="padding: 8px 6px; border-bottom: 1px solid #1c1917; text-align: center; font-family: monospace; font-weight: bold; font-size: 11px; color: #1c1917; vertical-align: middle;">${avgLogTemp} °C</td>
      </tr>
    `;
  }).join('');

  return `
    <div style="background-color: #ffffff; color: #1c1917; font-family: system-ui, -apple-system, sans-serif; padding: 20px; box-sizing: border-box; width: 100%;">
      <!-- Official Header -->
      <div style="border: 2px solid #1c1917; border-radius: 8px; overflow: hidden; margin-bottom: 12px; background: #ffffff; box-sizing: border-box;">
        <table style="width: 100%; border-collapse: separate; border-spacing: 0; text-align: center;">
          <tr>
            <td style="width: 32%; padding: 12px 10px; border-right: 2px solid #1c1917; background-color: #fafaf9; vertical-align: middle;">
              <div style="width: 40px; height: 40px; border-radius: 50%; background: #EF6340; margin: 0 auto 4px; display: flex; align-items: center; justify-content: center;">
                <svg viewBox="0 0 1000 1000" style="width: 36px; height: 36px;" fill="none">
                  <circle cx="500" cy="500" r="500" fill="#EF6340"/>
                  <text x="500" y="672" text-anchor="middle" textLength="780" lengthAdjust="spacingAndGlyphs" font-family="Arial Narrow, sans-serif" font-size="345" font-weight="700" fill="#FFFFFF">BARISTA</text>
                  <rect x="502" y="640" width="150" height="32" rx="1" fill="#641B0B"/>
                </svg>
              </div>
              <div style="font-family: serif; font-weight: 900; letter-spacing: 2px; font-size: 16px; color: #1c1917; line-height: 1.2;">BARISTA</div>
              <div style="font-size: 8.5px; font-weight: bold; letter-spacing: 1px; text-transform: uppercase; color: #44403c; margin-top: 2px; line-height: 1.2;">SRI LANKA - CENTRAL KITCHEN</div>
              <div style="font-size: 8px; color: #78716c; font-family: monospace; margin-top: 2px; line-height: 1.2;">Barista Coffee Lanka (Pvt) Ltd.</div>
            </td>
            <td style="width: 38%; padding: 12px 10px; border-right: 2px solid #1c1917; background-color: #ffffff; vertical-align: middle;">
              <div style="font-size: 8px; font-family: monospace; font-weight: 700; letter-spacing: 0.5px; text-transform: uppercase; color: #78716c; line-height: 1.2;">CENTRAL KITCHEN LOGISTICS &amp; DISPATCH OPERATIONS</div>
              <div style="font-size: 14px; font-weight: 900; text-transform: uppercase; color: #1c1917; margin: 3px 0; line-height: 1.2;">MONTHLY DISPATCH LOG &amp; SUMMARY</div>
              <div style="font-size: 9px; font-family: monospace; font-weight: bold; color: #1c1917; margin-top: 2px; line-height: 1.2;">Doc Ref: DSP-${stats.totalDispatches}-SUM</div>
              <div style="font-size: 8.5px; color: #78716c; margin-top: 2px; line-height: 1.2;">Central Kitchen Production &amp; Retail Logistics Report</div>
            </td>
            <td style="width: 30%; padding: 0; background-color: #fafaf9; vertical-align: middle; text-align: center;">
              <table style="width: 100%; height: 100%; border-collapse: collapse; text-align: center;">
                <tbody>
                  <tr style="border-bottom: 1.5px solid #1c1917;">
                    <td colspan="2" style="padding: 7px 4px; text-align: center; vertical-align: middle;">
                      <div style="font-size: 7.5px; text-transform: uppercase; color: #78716c; font-weight: 700; line-height: 1.1;">Record Code</div>
                      <div style="font-family: monospace; font-weight: 900; font-size: 11px; color: #1c1917; line-height: 1.2; margin-top: 2px;">BCL/REP/DISP/01</div>
                    </td>
                  </tr>
                  <tr style="border-bottom: 1.5px solid #1c1917;">
                    <td style="width: 50%; padding: 6px 3px; border-right: 1.5px solid #1c1917; text-align: center; vertical-align: middle;">
                      <div style="font-size: 7.5px; text-transform: uppercase; color: #78716c; font-weight: 600; line-height: 1.1;">Effective Date</div>
                      <div style="font-family: monospace; font-size: 8.5px; font-weight: bold; color: #1c1917; line-height: 1.2; margin-top: 1px;">${filterPeriod}</div>
                    </td>
                    <td style="width: 50%; padding: 6px 3px; text-align: center; vertical-align: middle;">
                      <div style="font-size: 7.5px; text-transform: uppercase; color: #78716c; font-weight: 600; line-height: 1.1;">Revision / Ver</div>
                      <div style="font-family: monospace; font-size: 8.5px; font-weight: bold; color: #1c1917; line-height: 1.2; margin-top: 1px;">Rev 01 / 01</div>
                    </td>
                  </tr>
                  <tr>
                    <td style="width: 50%; padding: 6px 3px; border-right: 1.5px solid #1c1917; text-align: center; vertical-align: middle;">
                      <div style="font-size: 7.5px; text-transform: uppercase; color: #78716c; font-weight: 600; line-height: 1.1;">Approved By</div>
                      <div style="font-size: 8.5px; font-weight: bold; color: #1c1917; line-height: 1.2; margin-top: 1px; word-break: break-word; padding: 0 2px;">${generatedBy}</div>
                    </td>
                    <td style="width: 50%; padding: 6px 3px; text-align: center; vertical-align: middle;">
                      <div style="font-size: 7.5px; text-transform: uppercase; color: #78716c; font-weight: 600; line-height: 1.1;">Document Ref</div>
                      <div style="font-family: monospace; font-size: 8.5px; font-weight: bold; color: #1c1917; line-height: 1.2; margin-top: 1px; word-break: break-word; padding: 0 2px;">DSP-${stats.totalDispatches}-SUM</div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </td>
          </tr>
        </table>
      </div>

      <!-- Operational Metrics Grid -->
      <table style="width: 100%; border-collapse: collapse; border: 2px solid #1c1917; border-radius: 8px; margin-bottom: 12px; text-align: center; background-color: #fafaf9;">
        <tr>
          <td style="width: 20%; padding: 6px 4px; border-right: 1px solid #1c1917; vertical-align: middle;">
            <div style="font-size: 8.5px; text-transform: uppercase; font-weight: bold; color: #57534e; line-height: 1.1;">Total Dispatches</div>
            <div style="font-size: 15px; font-family: monospace; font-weight: 900; color: #1c1917; margin: 2px 0; line-height: 1.1;">${stats.totalDispatches}</div>
            <div style="font-size: 8px; color: #78716c; line-height: 1.1;">Recorded Trips</div>
          </td>
          <td style="width: 20%; padding: 6px 4px; border-right: 1px solid #1c1917; vertical-align: middle;">
            <div style="font-size: 8.5px; text-transform: uppercase; font-weight: bold; color: #57534e; line-height: 1.1;">Total Output</div>
            <div style="font-size: 15px; font-family: monospace; font-weight: 900; color: #1c1917; margin: 2px 0; line-height: 1.1;">${stats.totalUnitsDispatched} Units</div>
            <div style="font-size: 8px; color: #78716c; line-height: 1.1;">Pastry &amp; Kitchen</div>
          </td>
          <td style="width: 20%; padding: 6px 4px; border-right: 1px solid #1c1917; vertical-align: middle;">
            <div style="font-size: 8.5px; text-transform: uppercase; font-weight: bold; color: #57534e; line-height: 1.1;">Active Outlets</div>
            <div style="font-size: 15px; font-family: monospace; font-weight: 900; color: #1c1917; margin: 2px 0; line-height: 1.1;">${stats.outletsCount}</div>
            <div style="font-size: 8px; color: #78716c; line-height: 1.1;">Branches Served</div>
          </td>
          <td style="width: 20%; padding: 6px 4px; border-right: 1px solid #1c1917; vertical-align: middle;">
            <div style="font-size: 8.5px; text-transform: uppercase; font-weight: bold; color: #57534e; line-height: 1.1;">Avg Dispatch Temp</div>
            <div style="font-size: 15px; font-family: monospace; font-weight: 900; color: #1c1917; margin: 2px 0; line-height: 1.1;">${stats.averageTemp} &deg;C</div>
            <div style="font-size: 8px; color: #78716c; line-height: 1.1;">Transit Standard</div>
          </td>
          <td style="width: 20%; padding: 6px 4px; vertical-align: middle;">
            <div style="font-size: 8.5px; text-transform: uppercase; font-weight: bold; color: #57534e; line-height: 1.1;">Reporting Period</div>
            <div style="font-size: 11px; font-family: monospace; font-weight: bold; color: #1c1917; margin: 2px 0; line-height: 1.1;">${filterPeriod}</div>
            <div style="font-size: 8px; color: #78716c; line-height: 1.1;">Monthly Cycle</div>
          </td>
        </tr>
      </table>

      <!-- Dispatches Table -->
      <div style="margin-bottom: 14px;">
        <table style="width: 100%; border-collapse: collapse; font-size: 11px; border: 2px solid #1c1917;">
          <thead>
            <tr style="background-color: #1c1917; color: #ffffff; font-weight: bold; text-transform: uppercase; font-size: 9.5px; letter-spacing: 0.5px;">
              <th style="padding: 8px; border-right: 1px solid #44403c; width: 30px; text-align: center;">#</th>
              <th style="padding: 8px; border-right: 1px solid #44403c; width: 110px; text-align: center;">Document No</th>
              <th style="padding: 8px; border-right: 1px solid #44403c; width: 140px; text-align: center;">Destination Outlet</th>
              <th style="padding: 8px; border-right: 1px solid #44403c; width: 120px; text-align: center;">Dispatch Driver</th>
              <th style="padding: 8px; border-right: 1px solid #44403c; width: 120px; text-align: center;">Supervisor</th>
              <th style="padding: 8px 12px; border-right: 1px solid #44403c; text-align: left;">Product Breakdown</th>
              <th style="padding: 8px; border-right: 1px solid #44403c; width: 100px; text-align: center;">Output</th>
              <th style="padding: 8px; width: 90px; text-align: center;">Dispatch Temp</th>
            </tr>
          </thead>
          <tbody>
            ${tableRowsHtml}
          </tbody>
          <tfoot>
            <tr style="background-color: #f5f5f4; font-weight: bold; font-size: 11px; color: #1c1917;">
              <td colspan="5" style="border-top: 2px solid #1c1917; padding: 10px; text-align: center; text-transform: uppercase; font-weight: 900; border-right: 1px solid #d6d3d1;">TOTAL DISPATCHED OUTPUT ACROSS ALL OUTLETS:</td>
              <td style="border-top: 2px solid #1c1917; padding: 10px 12px; font-family: monospace; font-size: 11px; color: #57534e; border-right: 1px solid #d6d3d1;">${stats.totalDispatches} Total Deliveries</td>
              <td style="border-top: 2px solid #1c1917; padding: 10px 8px; text-align: center; font-family: monospace; font-size: 13px; background-color: #e7e5e4; font-weight: 900; border-right: 1px solid #d6d3d1;">${stats.totalUnitsDispatched} <span style="font-size: 10px; font-weight: normal;">Units</span></td>
              <td style="border-top: 2px solid #1c1917; padding: 10px 8px; text-align: center; font-family: monospace; font-size: 11px; font-weight: bold;">${stats.averageTemp} &deg;C avg</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <!-- Sign-off Box -->
      <div style="border: 2px solid #1c1917; border-radius: 8px; overflow: hidden; margin-bottom: 12px;">
        <div style="background-color: #1c1917; color: #ffffff; padding: 4px 10px; font-size: 9px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px;">
          Executive Dispatch &amp; Operations Sign-off
        </div>
        <table style="width: 100%; border-collapse: collapse; font-size: 10px;">
          <tr>
            <td style="width: 33.33%; padding: 10px; vertical-align: top; border-right: 1px solid #1c1917;">
              <span style="font-size: 8.5px; font-weight: bold; text-transform: uppercase; color: #78716c; display: block;">1. Central Kitchen Dispatch Supervisor</span>
              <div style="font-weight: bold; color: #1c1917; margin-top: 2px;">${generatedBy}</div>
              <div style="font-size: 8.5px; color: #78716c; font-family: monospace;">Date: ${new Date().toISOString().split('T')[0]}</div>
              <div style="margin-top: 14px; padding-top: 6px; border-top: 1px dashed #a8a29e;">
                <span style="font-size: 8px; color: #78716c; display: block;">Authorized Signature:</span>
                <div style="height: 18px; border-bottom: 1px solid #d6d3d1;"></div>
              </div>
            </td>
            <td style="width: 33.33%; padding: 10px; vertical-align: top; border-right: 1px solid #1c1917;">
              <span style="font-size: 8.5px; font-weight: bold; text-transform: uppercase; color: #78716c; display: block;">2. Central Kitchen Manager</span>
              <div style="font-weight: bold; color: #1c1917; margin-top: 2px;">Head of Production</div>
              <div style="font-size: 8.5px; color: #78716c; font-family: monospace;">Operations Sign-off</div>
              <div style="margin-top: 14px; padding-top: 6px; border-top: 1px dashed #a8a29e;">
                <span style="font-size: 8px; color: #78716c; display: block;">Manager Signature:</span>
                <div style="height: 18px; border-bottom: 1px solid #d6d3d1;"></div>
              </div>
            </td>
            <td style="width: 33.33%; padding: 10px; vertical-align: top;">
              <span style="font-size: 8.5px; font-weight: bold; text-transform: uppercase; color: #78716c; display: block;">3. Quality Assurance &amp; Logistics Executive</span>
              <div style="font-weight: bold; color: #1c1917; margin-top: 2px;">QA Executive</div>
              <div style="font-size: 8.5px; color: #78716c; font-family: monospace;">Verification Sign-off</div>
              <div style="margin-top: 14px; padding-top: 6px; border-top: 1px dashed #a8a29e;">
                <span style="font-size: 8px; color: #78716c; display: block;">QA Signature:</span>
                <div style="height: 18px; border-bottom: 1px solid #d6d3d1;"></div>
              </div>
            </td>
          </tr>
        </table>
      </div>

      <!-- Document Footer -->
      <div style="margin-top: 10px; padding-top: 6px; border-top: 1px solid #d6d3d1; display: flex; justify-content: space-between; font-size: 8.5px; color: #78716c; font-family: monospace;">
        <span>Barista Coffee Lanka (Pvt) Ltd. - Central Kitchen Monthly Dispatch Summary &amp; Audit Record</span>
        <span>Printed on: ${new Date().toLocaleString()}</span>
        <span>Page 1 of 1</span>
      </div>
    </div>
  `;
}

/**
 * Directly downloads the monthly executive report as a PDF without opening any print preview modal.
 * Uses the exact 1-to-1 matching HTML template with high-contrast, professional, user-friendly color grading.
 */
export async function exportDirectMonthlyExecutiveReportPDF(
  logs: any[],
  stats: any,
  generatedBy: string = 'Barista IT Administrator',
  filterPeriod: string = 'Current Month Cycle'
): Promise<boolean> {
  const todayStr = new Date().toISOString().split('T')[0];
  const filename = `Barista_Monthly_Dispatch_Report_${todayStr}.pdf`;

  if (typeof document === 'undefined') return false;

  const tempDiv = document.createElement('div');
  tempDiv.id = 'direct-monthly-pdf-export-container';
  tempDiv.style.position = 'fixed';
  tempDiv.style.left = '-9999px';
  tempDiv.style.top = '0';
  tempDiv.style.width = '794px';
  tempDiv.style.backgroundColor = '#ffffff';
  tempDiv.style.zIndex = '-9999';
  tempDiv.innerHTML = renderMonthlyExecutiveReportHtml(logs, stats, generatedBy, filterPeriod);

  document.body.appendChild(tempDiv);

  try {
    const success = await downloadHtmlElementAsPDF(tempDiv, filename, 'portrait');
    return success;
  } catch (err) {
    console.error('Error generating direct monthly report PDF:', err);
    return false;
  } finally {
    if (document.body.contains(tempDiv)) {
      document.body.removeChild(tempDiv);
    }
  }
}



