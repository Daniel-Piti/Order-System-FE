import { useEffect, useMemo, useRef, useState } from 'react';
import { customerAPI, invoiceAPI, type Customer, type InvoiceDto } from '../services/api';
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

  const [customers, setCustomers] = useState<Customer[]>([]);
  /** `all` = no customer filter; `pick` = filter by chosen customer (search + select). */
  const [customerScope, setCustomerScope] = useState<'all' | 'pick'>('all');
  const [customerSearch, setCustomerSearch] = useState('');
  const [pickedCustomer, setPickedCustomer] = useState<Customer | null>(null);
  const [customerListOpen, setCustomerListOpen] = useState(false);
  const customerPickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    customerAPI
      .getAllCustomers()
      .then((list) => {
        if (!cancelled) setCustomers(list);
      })
      .catch(() => {
        if (!cancelled) setCustomers([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const onDocMouseDown = (e: MouseEvent) => {
      const el = customerPickerRef.current;
      if (el && !el.contains(e.target as Node)) setCustomerListOpen(false);
    };
    document.addEventListener('mousedown', onDocMouseDown);
    return () => document.removeEventListener('mousedown', onDocMouseDown);
  }, []);

  const sortedCustomers = useMemo(
    () => customers.slice().sort((a, b) => a.name.localeCompare(b.name, 'he')),
    [customers],
  );

  const filteredCustomersForPicker = useMemo(() => {
    const q = customerSearch.trim().toLowerCase();
    const digits = (s: string) => s.replace(/\D/g, '');
    const base = sortedCustomers;
    if (!q) return base.slice(0, 80);
    return base.filter((c) => {
      if (c.name.toLowerCase().includes(q)) return true;
      if (c.email.toLowerCase().includes(q)) return true;
      const qd = digits(q);
      if (qd.length > 0 && digits(c.phoneNumber).includes(qd)) return true;
      return false;
    }).slice(0, 80);
  }, [sortedCustomers, customerSearch]);

  const effectiveCustomerId =
    customerScope === 'pick' && pickedCustomer ? pickedCustomer.id : undefined;

  const canDownload = Boolean(fromDate && toDate && !isDownloading);
  const canSearch = Boolean(
    fromDate &&
      toDate &&
      !isSearching &&
      (customerScope === 'all' || pickedCustomer != null),
  );

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
    if (customerScope === 'pick' && !pickedCustomer) {
      setError('נא לבחור לקוח מהרשימה (או לעבור ל״כל הלקוחות״).');
      return;
    }
    setIsSearching(true);
    setError('');
    try {
      const page = await invoiceAPI.searchInvoices(
        fromDate,
        toDate,
        nextPageNumber,
        pageSize,
        'createdAt',
        'DESC',
        effectiveCustomerId,
      );
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
  }, [fromDate, toDate, customerScope, pickedCustomer?.id]);

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
            <label className="block text-sm font-medium text-gray-700 mb-2">מתאריך:</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="glass-input w-full px-4 py-2 rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              dir="ltr"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">עד תאריך:</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="glass-input w-full px-4 py-2 rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              dir="ltr"
            />
          </div>
        </div>

        <h2 className="mt-6 text-sm font-semibold text-gray-800">סינון לפי לקוח</h2>
        <div className="mt-2 rounded-2xl border border-gray-200/70 bg-gradient-to-b from-white/70 to-white/40 backdrop-blur-sm p-5 md:p-7 shadow-sm ring-1 ring-gray-900/5">
          <div ref={customerPickerRef}>
            {/* LTR row: chip on the left, toggle on the right; whole group centered */}
            <div
              className="flex flex-wrap items-center justify-center gap-3 md:gap-4"
              dir="ltr"
            >
              {customerScope === 'pick' && pickedCustomer && (
                <div
                  className="flex w-fit max-w-[min(100%,20rem)] shrink-0 items-center gap-2 rounded-2xl border border-indigo-200/80 bg-white px-2 py-1.5 shadow-sm ring-1 ring-indigo-900/5"
                  dir="rtl"
                >
                  <span className="min-w-0 max-w-[14rem] truncate py-0.5 ps-1 text-sm font-medium leading-snug text-gray-900 sm:max-w-[18rem]">
                    {pickedCustomer.name}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setPickedCustomer(null);
                      setCustomerSearch('');
                      setCustomerListOpen(true);
                      setPageNumber(0);
                    }}
                    className="ms-0.5 shrink-0 rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-indigo-50 hover:text-indigo-700"
                    aria-label="נקה בחירת לקוח"
                    title="נקה בחירה"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              )}
              <div
                className="inline-flex rounded-2xl border border-gray-200/90 bg-white/80 p-1 gap-0.5 shadow-sm"
                role="group"
                aria-label="סינון לקוח"
              >
                <button
                  type="button"
                  onClick={() => {
                    setCustomerScope('all');
                    setPickedCustomer(null);
                    setCustomerSearch('');
                    setCustomerListOpen(false);
                    setPageNumber(0);
                  }}
                  className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all min-w-[7.5rem] ${
                    customerScope === 'all'
                      ? 'bg-indigo-600 text-white shadow-md'
                      : 'text-gray-600 hover:bg-gray-50/90'
                  }`}
                >
                  כל הלקוחות
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCustomerScope('pick');
                    setPickedCustomer(null);
                    setCustomerSearch('');
                    setCustomerListOpen(true);
                    setPageNumber(0);
                  }}
                  className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all min-w-[7.5rem] ${
                    customerScope === 'pick'
                      ? 'bg-indigo-600 text-white shadow-md'
                      : 'text-gray-600 hover:bg-gray-50/90'
                  }`}
                >
                  לקוח מסוים
                </button>
              </div>
            </div>

            {customerScope === 'pick' && !pickedCustomer && (
              <>
                <div className="my-5 border-t border-gray-200/60" aria-hidden />
                <div className="mx-auto flex w-full max-w-2xl flex-col gap-3">
                    <div className="rounded-2xl border border-gray-200/90 bg-white overflow-hidden shadow-md ring-1 ring-gray-900/[0.06]">
                      <div
                        className={`relative ${
                          customerListOpen && filteredCustomersForPicker.length > 0 ? 'border-b border-gray-200/80' : ''
                        }`}
                      >
                        <svg
                          className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          aria-hidden
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                          />
                        </svg>
                        <input
                          id="invoice-customer-search"
                          type="text"
                          autoComplete="off"
                          placeholder="הקלד לחיפוש…"
                          value={customerSearch}
                          onChange={(e) => {
                            setCustomerSearch(e.target.value);
                            setCustomerListOpen(true);
                            setPageNumber(0);
                          }}
                          onFocus={() => setCustomerListOpen(true)}
                          className="w-full border-0 rounded-none pr-12 pl-4 py-3.5 text-base text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500/80 bg-transparent"
                          dir="rtl"
                          aria-label="חיפוש לקוח"
                          aria-autocomplete="list"
                          aria-expanded={customerListOpen}
                          aria-controls="invoice-customer-suggestions"
                        />
                      </div>
                      {customerListOpen && filteredCustomersForPicker.length > 0 && (
                        <ul
                          id="invoice-customer-suggestions"
                          role="listbox"
                          className="max-h-64 overflow-y-auto w-full py-1.5"
                        >
                          {filteredCustomersForPicker.map((c) => (
                            <li key={c.id} role="option">
                              <button
                                type="button"
                                className="w-full text-center px-4 py-3 text-base font-medium text-gray-900 hover:bg-indigo-50/90 transition-colors"
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => {
                                  setPickedCustomer(c);
                                  setCustomerSearch('');
                                  setCustomerListOpen(false);
                                  setPageNumber(0);
                                }}
                              >
                                {c.name}
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                    {customerListOpen &&
                      customerSearch.trim() &&
                      filteredCustomersForPicker.length === 0 &&
                      customers.length > 0 && (
                        <p className="w-full text-center text-sm text-amber-800 bg-amber-50/90 border border-amber-200/80 rounded-xl px-4 py-3">
                          לא נמצאו לקוחות התואמים לחיפוש. נסה טקסט אחר.
                        </p>
                      )}
                </div>
              </>
            )}
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

