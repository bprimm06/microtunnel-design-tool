import { downloadFile } from '../lib/download';

/** Trigger a download of a generated HTML report. DOM-only. */
export function downloadHtml(filename: string, html: string): void {
  downloadFile(filename, html, 'text/html;charset=utf-8');
}
