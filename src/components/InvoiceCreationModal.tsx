import { useState, useEffect, useRef } from 'react';
import Spinner from './Spinner';
import AccessibleModal from './AccessibleModal';
import { invoiceAPI, type CreateInvoiceRequest } from '../services/api';
import { formatPrice } from '../utils/formatPrice';
import type { Order } from '../services/api';

interface InvoiceCreationModalProps {
  order: Order;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function InvoiceCreationModal({
  order,
  isOpen,
  onClose,
  onSuccess,
}: InvoiceCreationModalProps) {
  const [paymentMethod, setPaymentMethod] = useState<'CREDIT_CARD' | 'CASH'>('CASH');
  const [creditCardLast4, setCreditCardLast4] = useState('');
  const [allocationNumber, setAllocationNumber] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [showAllocationHelp, setShowAllocationHelp] = useState(false);
  const helpTooltipRef = useRef<HTMLDivElement>(null);

  // Check if allocation number is required
  const isAllocationNumberRequired = (): boolean => {
    if (!order.doneAt) return false;
    
    const doneDate = new Date(order.doneAt);
    const year = doneDate.getFullYear();
    const month = doneDate.getMonth() + 1; // JavaScript months are 0-indexed

    const threshold = (year < 2026 || (year === 2026 && month < 6)) ? 10000 : 5000;
    return order.totalPrice >= threshold;
  };

  const allocationRequired = isAllocationNumberRequired();

  useEffect(() => {
    if (!isOpen) {
      // Reset form when modal closes
      setPaymentMethod('CASH');
      setCreditCardLast4('');
      setAllocationNumber('');
      setError('');
      setShowAllocationHelp(false);
    }
  }, [isOpen]);

  // Handle clicks outside the help tooltip
  useEffect(() => {
    if (!showAllocationHelp) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (helpTooltipRef.current) {
        const target = event.target as Node;
        // Check if click is outside the tooltip container (button + popup)
        if (!helpTooltipRef.current.contains(target)) {
          setShowAllocationHelp(false);
        }
      }
    };

    // Use a small delay to avoid immediate closing when opening
    const timeoutId = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside, true);
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('mousedown', handleClickOutside, true);
    };
  }, [showAllocationHelp]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      // Validate allocation number if required
      if (allocationRequired) {
        if (!allocationNumber.trim()) {
          setError('מספר הקצאה הוא שדה חובה');
          setIsSubmitting(false);
          return;
        }
        if (allocationNumber.trim().length !== 9) {
          setError('מספר הקצאה חייב להכיל 9 ספרות בדיוק');
          setIsSubmitting(false);
          return;
        }
        if (!/^\d{9}$/.test(allocationNumber.trim())) {
          setError('מספר הקצאה חייב להכיל ספרות בלבד');
          setIsSubmitting(false);
          return;
        }
      }

      // Build payment proof based on payment method
      let paymentProof = '';
      if (paymentMethod === 'CREDIT_CARD') {
        if (!creditCardLast4.trim() || creditCardLast4.trim().length !== 4) {
          setError('יש להזין 4 ספרות אחרונות של כרטיס האשראי');
          setIsSubmitting(false);
          return;
        }
        if (!/^\d{4}$/.test(creditCardLast4.trim())) {
          setError('4 הספרות האחרונות חייבות להיות מספרים בלבד');
          setIsSubmitting(false);
          return;
        }
        paymentProof = creditCardLast4.trim();
      } else {
        // For CASH, send a placeholder string (required by backend, but no specific format needed)
        paymentProof = 'תשלום במזומן';
      }

      // Build request
      const request: CreateInvoiceRequest = {
        orderId: order.id,
        paymentMethod,
        paymentProof,
        allocationNumber: allocationRequired ? (allocationNumber.trim() || null) : null,
      };

      await invoiceAPI.createInvoice(request);
      onSuccess();
      onClose();
    } catch (err: any) {
      const errorMessage = err.response?.data?.userMessage || err.message || 'נכשל ביצירת החשבונית';
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AccessibleModal
      isOpen={isOpen}
      onClose={onClose}
      title="צור חשבונית"
      description={`הזמנה #${order.id.slice(0, 8)}`}
      size="md"
      dir="rtl"
    >
      {error && (
        <div 
          role="alert"
          className="glass-card bg-red-50/50 border-red-200 rounded-xl p-3 mb-4 text-red-600 text-sm"
          aria-live="assertive"
        >
          {error}
        </div>
      )}

        {/* Order Summary */}
        <div className="mb-6 glass-card rounded-xl p-4 border border-gray-200/50">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">סה״כ הזמנה</span>
            <span className="text-lg font-bold text-indigo-600">{formatPrice(order.totalPrice)}</span>
          </div>
          {allocationRequired && (
            <div className="mt-2 pt-2 border-t border-gray-200/50">
              <p className="text-xs text-orange-600 font-medium">מספר הקצאה נדרש עבור הזמנה זו</p>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Payment Method */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              אמצעי תשלום
            </label>
            <select
              value={paymentMethod}
              onChange={(e) => {
                setPaymentMethod(e.target.value as 'CREDIT_CARD' | 'CASH');
                setCreditCardLast4('');
                setError('');
              }}
              className="glass-select w-full pl-3 pr-10 py-2.5 rounded-xl text-sm font-semibold text-gray-800 cursor-pointer"
              dir="rtl"
              disabled={isSubmitting}
              required
            >
              <option value="CASH">מזומן</option>
              <option value="CREDIT_CARD">כרטיס אשראי</option>
            </select>
          </div>

          {/* Required Data for Tax Authority - Only shown when allocation is required */}
          {allocationRequired && (
            <div className="glass-card rounded-xl p-4 border border-gray-200/50">
              <p className="text-sm font-bold text-gray-700 mb-2">נתונתים להנפקת מספר הקצאה</p>
              <textarea
                readOnly
                value={(() => {
                  const currentDate = new Date().toLocaleDateString('he-IL', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit'
                  });
                  const priceWithoutVat = (order.totalPrice / 1.18).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
                  return `מספר אסמכתה: ${order.referenceId}\nמספר מזהה של לקוח: ${order.customerStateId || 'לא זמין'}\nתאריך: ${currentDate}\nסכום העסקה ללא מעמ: ${priceWithoutVat} ₪`;
                })()}
                className="w-full px-3 py-2 text-sm font-bold text-gray-700 bg-gray-50 border border-gray-200 rounded-lg font-mono resize-none focus:outline-none"
                rows={4}
                dir="rtl"
              />
            </div>
          )}

          {/* Credit Card Last 4 Digits - Only shown when CREDIT_CARD is selected */}
          {paymentMethod === 'CREDIT_CARD' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                4 הספרות האחרונות של כרטיס האשראי
              </label>
              <input
                type="text"
                value={creditCardLast4}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '').slice(0, 4);
                  setCreditCardLast4(value);
                  setError('');
                }}
                placeholder="1234"
                className="glass-input w-full px-4 py-2.5 rounded-xl text-sm text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                dir="ltr"
                disabled={isSubmitting}
                required
                maxLength={4}
              />
              <p className="text-xs text-gray-500 mt-1">הזן 4 ספרות בלבד</p>
            </div>
          )}

          {/* Allocation Number */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <label className="block text-sm font-medium text-gray-700">
                מספר הקצאה {allocationRequired && <span className="text-red-500">*</span>}
              </label>
              <div ref={helpTooltipRef} className="relative">
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setShowAllocationHelp(!showAllocationHelp);
                  }}
                  className="w-5 h-5 rounded-full bg-indigo-100 hover:bg-indigo-200 text-indigo-600 flex items-center justify-center text-xs font-bold transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1"
                  aria-label="מידע נוסף על מספר הקצאה"
                  aria-expanded={showAllocationHelp}
                >
                  ?
                </button>
                {showAllocationHelp && (
                  <>
                    {/* Bridge area to prevent gap */}
                    <div className="absolute right-0 top-5 w-full h-2" />
                    <div 
                      className="absolute right-0 top-6 z-50 w-72 p-3 bg-white border border-gray-200 rounded-lg shadow-lg text-sm text-gray-700"
                      onClick={(e) => e.stopPropagation()}
                      onMouseDown={(e) => e.stopPropagation()}
                    >
                      {(() => {
                        const doneDate = order.doneAt ? new Date(order.doneAt) : new Date();
                        const year = doneDate.getFullYear();
                        const month = doneDate.getMonth() + 1;
                        const threshold = (year < 2026 || (year === 2026 && month < 6)) ? 10000 : 5000;
                        return (
                          <>
                            <p className="mb-2 text-gray-700">
                              הזמנות עם סכום כולל של {formatPrice(threshold)} ומעלה נדרשות למספר הקצאה.
                            </p>
                            <a
                              href="https://www.youtube.com/watch?v=rQKsFJ9ug1g&t=139s"
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-indigo-600 hover:text-indigo-800 underline"
                              onClick={(e) => e.stopPropagation()}
                            >
                              קישור להסבר הנפקת מספר הקצאה
                            </a>
                          </>
                        );
                      })()}
                    </div>
                  </>
                )}
              </div>
            </div>
            <input
              type="text"
              value={allocationNumber}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, '').slice(0, 9);
                setAllocationNumber(value);
                setError('');
              }}
              placeholder={allocationRequired ? "הזן 9 ספרות" : ""}
              className={`glass-input w-full px-4 py-2.5 rounded-xl text-sm text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                !allocationRequired ? 'bg-gray-100/50 cursor-not-allowed' : ''
              }`}
              dir="ltr"
              disabled={isSubmitting || !allocationRequired}
              maxLength={9}
            />
            {!allocationRequired && (
              <p className="text-xs text-gray-500 mt-1">מספר הקצאה לא נדרש עבור הזמנה זו</p>
            )}
            {allocationRequired && (
              <p className="text-xs text-gray-500 mt-1">הזן 9 ספרות בדיוק</p>
            )}
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="btn-cancel flex-1"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              <span>ביטול</span>
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-save flex-1"
            >
              {isSubmitting ? (
                <>
                  <Spinner size="sm" />
                  <span>יוצר...</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span>צור חשבונית</span>
                </>
              )}
            </button>
          </div>
        </form>
    </AccessibleModal>
  );
}

