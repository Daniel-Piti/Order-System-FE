import type { InvoiceDto } from '../services/api';

/**
 * URL to open for the order row: prefer tax invoice (`INVOICE`), else the lowest sequence with a PDF.
 */
export function primaryInvoicePdfUrl(invoices: InvoiceDto[]): string | undefined {
  const withUrl = invoices.filter((i) => i.pdfUrl);
  if (withUrl.length === 0) return undefined;
  const tax = withUrl.find((i) => i.invoiceType === 'INVOICE');
  const chosen =
    tax ?? [...withUrl].sort((a, b) => a.invoiceSequenceNumber - b.invoiceSequenceNumber)[0];
  return chosen.pdfUrl;
}
