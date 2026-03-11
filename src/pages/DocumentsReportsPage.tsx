import { useState } from 'react';
import { invoiceAPI } from '../services/api';

export default function DocumentsReportsPage() {
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState('');

  const canDownload = Boolean(fromDate && toDate && !isDownloading);

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

  return (
    <div className="max-w-4xl mx-auto pb-32" dir="rtl">
      <div className="glass-card rounded-3xl p-6 md:p-8 mb-6">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-800 leading-tight">דוחות ומסמכים</h1>
        <p className="text-gray-600 text-sm mt-2">
          בחר טווח תאריכים והורד קובץ חשבוניות מסודר עם קישורים וסיכום.
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
          <button
            onClick={handleDownload}
            disabled={!canDownload}
            className={`glass-button px-5 py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 border ${
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
                <span>הורד קובץ חשבוניות</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

