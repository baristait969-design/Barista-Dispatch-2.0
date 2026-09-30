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
