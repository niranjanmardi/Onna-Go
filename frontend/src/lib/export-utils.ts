import { api, ApiError } from './api-client';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1';

interface DownloadOptions {
  onStart?: () => void;
  onSuccess?: () => void;
  onError?: (err: Error) => void;
}

const activeDownloads = new Set<string>();

/**
 * Downloads a file (PDF/CSV) from an authenticated API endpoint.
 * Prevents concurrent duplicate clicks and handles errors gracefully.
 */
export async function downloadFile(
  endpoint: string,
  defaultFilename: string,
  options?: DownloadOptions
): Promise<void> {
  const downloadKey = `${endpoint}_${defaultFilename}`;
  if (activeDownloads.has(downloadKey)) {
    // Prevent duplicate downloads on repeated clicks
    return;
  }

  activeDownloads.add(downloadKey);
  options?.onStart?.();

  try {
    const token = localStorage.getItem('onnago_token') || localStorage.getItem('rupaii_token');
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const url = endpoint.startsWith('http')
      ? endpoint
      : `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

    const response = await fetch(url, {
      method: 'GET',
      headers,
      credentials: 'include',
    });

    if (!response.ok) {
      let errMsg = `Download failed with status ${response.status}`;
      try {
        const errJson = await response.json();
        errMsg = errJson.detail || errMsg;
      } catch {
        // Fallback
      }
      throw new Error(errMsg);
    }

    // Extract filename from Content-Disposition if present
    let filename = defaultFilename;
    const disposition = response.headers.get('Content-Disposition');
    if (disposition && disposition.includes('filename=')) {
      const match = disposition.match(/filename=(?:["']?)(.*?)(?:["']?)(?:;|$)/);
      if (match && match[1]) {
        filename = match[1].trim();
      }
    }

    const blob = await response.blob();
    const blobUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(blobUrl);

    options?.onSuccess?.();
  } catch (err: any) {
    options?.onError?.(err);
    throw err;
  } finally {
    activeDownloads.delete(downloadKey);
  }
}

export async function downloadTripPdf(
  tripId: string,
  tripName: string,
  options?: DownloadOptions
): Promise<void> {
  const safeName = tripName.replace(/[^a-zA-Z0-9_\- ]/g, '').replace(/\s+/g, '_') || 'Trip';
  return downloadFile(
    `/reports/trip/${tripId}/export/pdf`,
    `ONNA-GO_${safeName}_Report.pdf`,
    options
  );
}

export async function downloadTripCsv(
  tripId: string,
  tripName: string,
  options?: DownloadOptions
): Promise<void> {
  const safeName = tripName.replace(/[^a-zA-Z0-9_\- ]/g, '').replace(/\s+/g, '_') || 'Trip';
  return downloadFile(
    `/reports/trip/${tripId}/export/csv`,
    `ONNA-GO_${safeName}_expenses.csv`,
    options
  );
}

export async function downloadHistoryPdf(options?: DownloadOptions): Promise<void> {
  return downloadFile(
    '/reports/history/export/pdf',
    'ONNA-GO-Trip-History.pdf',
    options
  );
}

export async function downloadHistoryCsv(options?: DownloadOptions): Promise<void> {
  return downloadFile(
    '/reports/history/export/csv',
    'ONNA-GO-Trip-History.csv',
    options
  );
}
