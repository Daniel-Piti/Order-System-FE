import { useEffect, useState } from 'react';
import { invoiceAPI, type InvoiceDto } from '../services/api';
import PaginationBar from '../components/PaginationBar';
import Spinner from '../components/Spinner';
import { formatPrice } from '../utils/formatPrice';
import { formatOrderDateShortWithTime } from '../utils/orderUtils';

function toDateInputValue(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export default function DocumentsReportsPage() {
  const [fromDate, setFromDate] = useState(() => {
    const now = new Date();
    const monthAgo = new Date(now);
    monthAgo.setMonth(now.getMonth() - 1);
    return toDateInputValue(monthAgo);
  });
  const [toDate, setToDate] = useState(() => toDateInputValue(new Date()));
  const [isDownloading, setIsDownloading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [error, setError] = useState('');
  const [results, setResults] = useState<InvoiceDto[]>([]);

  const [pageNumber, setPageNumber] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [totalPages, setTotalPages] = useState(0);

  const canDownload = Boolean(fromDate && toDate && !isDownloading);
  const canSearch = Boolean(fromDate && toDate && !isSearching);

  const handleDownload = async () => {
    if (!fromDate || !toDate) return;
    setIsDownloading(true);
    setError('');
    try {
      const blob = await invoiceAPI.downloadInvoicesDocument(fromDate, toDate);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `חשבוניות_${fromDate}_${toDate}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error('Failed to download invoices document:', err);
      setError('נכשל בהורדת הקובץ. נסה שוב.');
    } finally {
      setIsDownloading(false);
    }
  };

  const runSearch = async (nextPageNumber: number = 0) => {
    if (!fromDate || !toDate) return;
    setIsSearching(true);
    setError('');
    try {
      const page = await invoiceAPI.searchInvoices(fromDate, toDate, nextPageNumber, pageSize, 'createdAt', 'DESC');
      setResults(page.content ?? []);
      setTotalPages(page.totalPages ?? 0);
      setPageNumber(nextPageNumber);
      setHasSearched(true);
    } catch (err: any) {
      console.error('Failed to search invoices:', err);
      setError('נכשל בחיפוש חשבוניות. נסה שוב.');
      setResults([]);
      setTotalPages(0);
    } finally {
      setIsSearching(false);
    }
  };

  useEffect(() => {
    // reset paging when date range changes
    setPageNumber(0);
    setResults([]);
    setTotalPages(0);
    setHasSearched(false);
  }, [fromDate, toDate]);

  useEffect(() => {
    // If user already searched and changes page size, re-run search for same date range
    if (hasSearched && fromDate && toDate) {
      runSearch(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageSize]);

  return (
    <div className="max-w-4xl mx-auto pb-32" dir="rtl">
      <div className="glass-card rounded-3xl p-6 md:p-8 mb-6">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-800 leading-tight">דוחות ומסמכים</h1>
        <p className="text-gray-600 text-sm mt-2">
          בחר טווח תאריכים, חפש חשבוניות, או ייצא לקובץ מסודר עם קישורים וסיכום.
        </p>
      </div>

      <div className="glass-card rounded-2xl p-6 md:p-8">
        {error && (
          <div className="glass-card bg-red-50/50 border-red-200 rounded-xl p-3 mb-4 text-red-600 text-sm">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">מתאריך</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="glass-input w-full px-4 py-2 rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              dir="ltr"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">עד תאריך</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="glass-input w-full px-4 py-2 rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              dir="ltr"
            />
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mt-6 items-start sm:items-center justify-between">
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <button
              onClick={() => runSearch(0)}
              disabled={!canSearch}
              className={`glass-button px-5 py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 border ${
                canSearch
                  ? 'text-gray-800 border-gray-300 bg-white/30 hover:shadow-lg'
                  : 'text-gray-400 border-gray-300 bg-gray-50 cursor-not-allowed'
              }`}
            >
              {isSearching ? (
                <>
                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" aria-hidden="true">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V2C6.477 2 2 6.477 2 12h2zm2 5.291A7.962 7.962 0 014 12H2c0 3.042 1.135 5.824 3 7.938l1-2.647z" />
                  </svg>
                  <span>מחפש...</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <span>חפש</span>
                </>
              )}
            </button>

            <button
              onClick={handleDownload}
              disabled={!canDownload}
              className={`glass-button px-5 py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 border ${
                canDownload
                  ? 'text-indigo-700 border-indigo-400 bg-indigo-50 hover:shadow-lg'
                  : 'text-gray-400 border-gray-300 bg-gray-50 cursor-not-allowed'
              }`}
            >
              {isDownloading ? (
                <>
                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" aria-hidden="true">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V2C6.477 2 2 6.477 2 12h2zm2 5.291A7.962 7.962 0 014 12H2c0 3.042 1.135 5.824 3 7.938l1-2.647z" />
                  </svg>
                  <span>מוריד...</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v12m0 0l4-4m-4 4l-4-4M4 17v3a1 1 0 001 1h14a1 1 0 001-1v-3" />
                  </svg>
                  <span>ייצא לקובץ</span>
                </>
              )}
            </button>
          </div>

          <div className="flex items-center justify-center sm:justify-end gap-2 w-full sm:w-auto">
            <label className="text-xs text-gray-600">הצג:</label>
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="glass-select w-28 px-3 py-2 rounded-xl text-sm font-semibold text-gray-800 cursor-pointer"
              dir="ltr"
            >
              <option value="2">2</option>
              <option value="10">10</option>
              <option value="20">20</option>
              <option value="50">50</option>
              <option value="100">100</option>
            </select>
          </div>
        </div>

        <div className="mt-6">
          {isSearching ? (
            <div className="flex justify-center py-8">
              <Spinner />
            </div>
          ) : results.length === 0 ? (
            <p className="text-gray-500 text-center py-8">אין תוצאות להצגה.</p>
          ) : (
            <>
              <div className="overflow-x-auto rounded-xl border border-gray-200">
                <table className="min-w-full divide-y divide-gray-200" aria-label="תוצאות חיפוש חשבוניות">
                  <thead className="bg-indigo-50/70">
                    <tr>
                      <th scope="col" className="px-4 py-3 text-center text-xs font-semibold text-gray-600">מס׳ חשבונית</th>
                      <th scope="col" className="px-4 py-3 text-center text-xs font-semibold text-gray-600">מזהה הזמנה</th>
                      <th scope="col" className="px-4 py-3 text-center text-xs font-semibold text-gray-600">תאריך</th>
                      <th scope="col" className="px-4 py-3 text-center text-xs font-semibold text-gray-600">סכום הזמנה</th>
                      <th scope="col" className="px-4 py-3 text-center text-xs font-semibold text-gray-600">פעולות</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {results.map((row) => (
                      <tr key={`${row.orderId}-${row.invoiceSequenceNumber}`} className="hover:bg-gray-50/70">
                        <td className="px-4 py-3 text-sm font-mono text-gray-700 text-center">{row.invoiceSequenceNumber}</td>
                        <td className="px-4 py-3 text-sm font-mono text-gray-700 text-center">{row.orderId}</td>
                        <td className="px-4 py-3 text-sm text-gray-800 text-center">
                          {formatOrderDateShortWithTime(row.createdAt)}
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-gray-800 text-center">{formatPrice(row.orderTotalPrice)}</td>
                        <td className="px-4 py-3 text-center">
                          <button
                            type="button"
                            onClick={() => window.open(row.pdfUrl, '_blank')}
                            className="glass-button px-3 py-2 rounded-xl text-xs font-semibold border border-indigo-300 bg-indigo-50 text-indigo-700 hover:shadow-md transition-all"
                          >
                            הצג חשבונית
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Pagination at page bottom (centers better with sidebar layouts) */}
      {!isSearching && results.length > 0 && (
        <div className="mt-10 flex justify-center">
          <PaginationBar
            currentPage={pageNumber}
            totalPages={totalPages}
            onPageChange={(p) => runSearch(p)}
            showCondition={totalPages > 1}
          />
        </div>
      )}
    </div>
  );
}

