import type { InvoiceDto } from '../services/api';

export interface PrimaryTaxInvoiceMeta {
  invoiceId: number;
  allocationNumber: string | null;
}

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

/** Tax invoice (`INVOICE`) for credit notes — backend requires this type. */
export function primaryTaxInvoiceMeta(invoices: InvoiceDto[]): PrimaryTaxInvoiceMeta | undefined {
  const taxInvoices = invoices.filter((i) => i.invoiceType === 'INVOICE');
  if (taxInvoices.length === 0) return undefined;
  const chosen = [...taxInvoices].sort((a, b) => a.invoiceSequenceNumber - b.invoiceSequenceNumber)[0];
  const raw = chosen.allocationNumber;
  return {
    invoiceId: chosen.id,
    allocationNumber: raw != null && String(raw).trim() !== '' ? String(raw).trim() : null,
  };
}
