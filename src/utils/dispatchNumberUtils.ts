import { DispatchLog } from '../types';

/**
 * Universal helper for Dispatch Report numbering and HACCP Revision/Version tracking.
 */

export function getDispatchReportNo(log: Partial<DispatchLog>, indexFallback: number = 1): string {
  if (log.reportNo && log.reportNo.trim()) {
    return log.reportNo.trim();
  }
  // Try extracting from documentName e.g. "DSP-0001-Rev02" -> "DSP-0001"
  if (log.documentName) {
    const match = log.documentName.match(/^(DSP-\d+)/i);
    if (match) return match[1].toUpperCase();
  }
  return `DSP-${String(indexFallback).padStart(4, '0')}`;
}

export function getDispatchDocumentName(log: Partial<DispatchLog>, indexFallback: number = 1): string {
  if (log.documentName && log.documentName.trim()) {
    return log.documentName.trim();
  }
  const reportNum = getDispatchReportNo(log, indexFallback);
  const revNum = log.revisionNumber || (log.version ? parseInt(log.version, 10) : 1) || 1;
  if (revNum > 1) {
    return `${reportNum}-Rev${String(revNum).padStart(2, '0')}`;
  }
  return reportNum;
}

export function generateNextReportNumber(existingLogs: DispatchLog[] = []): string {
  let max = 0;
  for (const log of existingLogs) {
    const candidate = log.reportNo || log.documentName || '';
    const match = candidate.match(/DSP-(\d+)/i);
    if (match) {
      const num = parseInt(match[1], 10);
      if (!isNaN(num) && num > max) {
        max = num;
      }
    }
  }
  return `DSP-${String(max + 1).padStart(4, '0')}`;
}

export interface NextRevisionInfo {
  reportNo: string;
  revisionNumber: number;
  revision: string; // e.g. "Rev 02"
  version: string; // e.g. "02"
  documentName: string; // e.g. "DSP-0001-Rev02"
  previousDocId: string;
  previousDocumentName: string;
}

/**
 * Calculates revision upgrade and document naming for an edited dispatch report.
 */
export function calculateNextRevisionAndDocName(
  previousLog: DispatchLog,
  indexFallback: number = 1
): NextRevisionInfo {
  const reportNo = getDispatchReportNo(previousLog, indexFallback);
  const prevDocName = getDispatchDocumentName(previousLog, indexFallback);
  
  const currentRevNum = previousLog.revisionNumber || (previousLog.version ? parseInt(previousLog.version, 10) : 1) || 1;
  const nextRevNum = currentRevNum + 1;
  const nextRevStr = `Rev ${String(nextRevNum).padStart(2, '0')}`;
  const nextVerStr = String(nextRevNum).padStart(2, '0');
  
  const nextDocName = `${prevDocName}-Rev${String(nextRevNum).padStart(2, '0')}`;

  return {
    reportNo,
    revisionNumber: nextRevNum,
    revision: nextRevStr,
    version: nextVerStr,
    documentName: nextDocName,
    previousDocId: previousLog.id,
    previousDocumentName: prevDocName,
  };
}
