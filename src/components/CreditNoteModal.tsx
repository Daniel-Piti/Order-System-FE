import { useState, useEffect } from 'react';
import AccessibleModal from './AccessibleModal';
import Spinner from './Spinner';
import {
  invoiceAPI,
  type CreateCreditNoteByAmountResponse,
  type Order,
} from '../services/api';
import { formatPrice } from '../utils/formatPrice';

type CreditMode = 'byAmount' | 'byOrder';

interface CreditNoteModalProps {
  order: Order;
  invoiceId: number;
  /** Must match original tax invoice: if set, credit note requires 9-digit allocation. */
  primaryAllocationNumber: string | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (response: CreateCreditNoteByAmountResponse) => void;
}

function sanitizeAmountInput(raw: string): string {
  const t = raw.replace(/[^\d.]/g, '');
  const parts = t.split('.');
  if (parts.length <= 1) return t;
  const intPart = parts[0] ?? '';
  const dec = parts.slice(1).join('');
  return `${intPart}.${dec.slice(0, 2)}`;
}

/** Display string for a numeric cap (up to 2 decimals, no unnecessary trailing zeros). */
function formatAmountToInputCap(value: number): string {
  const r = Math.round(value * 100) / 100;
  return String(parseFloat(r.toFixed(2)));
}

/**
 * After sanitizing digits/decimals, clamp so the value never exceeds maxAmount
 * (cannot type or paste above the order’s allowed credit).
 */
function clampAmountToMax(sanitized: string, maxAmount: number): string {
  if (sanitized === '') return '';

  // Still typing the fractional part after "12."
  if (/^\d+\.$/.test(sanitized)) {
    const whole = parseFloat(sanitized.slice(0, -1));
    if (!Number.isNaN(whole) && whole > maxAmount + 1e-9) {
      return formatAmountToInputCap(maxAmount);
    }
    return sanitized;
  }

  const n = parseFloat(sanitized);
  if (Number.isNaN(n)) {
    return sanitized;
  }

  if (n > maxAmount + 1e-9) {
    return formatAmountToInputCap(maxAmount);
  }
  return sanitized;
}

export default function CreditNoteModal({
  order,
  invoiceId,
  primaryAllocationNumber,
  isOpen,
  onClose,
  onSuccess,
}: CreditNoteModalProps) {
  const [mode, setMode] = useState<CreditMode>('byAmount');
  const [amountStr, setAmountStr] = useState('');
  const [allocationNumber, setAllocationNumber] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const credited = order.totalCreditedAmount ?? 0;
  /** Net remaining on order (BE); max next credit is at most this when cap follows gross. */
  const maxAmount = Math.max(0, order.totalPrice);
  const grossOrderTotal = order.totalPrice + credited;

  const primaryHasAllocation =
    primaryAllocationNumber != null && String(primaryAllocationNumber).trim() !== '';

  useEffect(() => {
    if (!isOpen) {
      setMode('byAmount');
      setAmountStr('');
      setAllocationNumber('');
      setError('');
    }
  }, [isOpen]);

  const handleAmountChange = (v: string) => {
    const sanitized = sanitizeAmountInput(v);
    setAmountStr(clampAmountToMax(sanitized, maxAmount));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (mode !== 'byAmount') return;

    const n = parseFloat(amountStr.replace(/,/g, ''));
    if (Number.isNaN(n) || n <= 0) {
      setError('יש להזין סכום חיובי');
      return;
    }
    if (n > maxAmount + 1e-9) {
      setError(`הסכום לא יכול לעלות על ${formatPrice(maxAmount)}`);
      return;
    }
    const rounded = Math.round(n * 100) / 100;

    if (primaryHasAllocation) {
      const t = allocationNumber.trim();
      if (t.length !== 9 || !/^\d{9}$/.test(t)) {
        setError('מספר הקצאה חייב להכיל 9 ספרות');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const response = await invoiceAPI.createCreditNoteByAmount({
        invoiceId,
        amount: rounded,
        allocationNumber: primaryHasAllocation ? allocationNumber.trim() : null,
      });
      onSuccess(response);
      onClose();
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { userMessage?: string } } }).response?.data
              ?.userMessage
          : undefined;
      setError(msg || (err instanceof Error ? err.message : 'נכשל ביצירת הזיכוי'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AccessibleModal
      isOpen={isOpen}
      onClose={onClose}
      title="צור זיכוי מס"
      description={`הזמנה #${order.id.slice(0, 8)}`}
      size="md"
      dir="rtl"
      overlayClassName="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
    >
      {error && (
        <div
          role="alert"
          className="glass-card bg-red-50/50 border-red-200 rounded-xl p-3 mb-4 text-red-600 text-sm"
        >
          {error}
        </div>
      )}

      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium text-gray-700">סוג זיכוי</span>
          <div className="flex items-stretch gap-2 p-1 bg-gray-50 rounded-xl border border-gray-200">
            <button
              type="button"
              onClick={() => setMode('byAmount')}
              className={`flex-1 px-3 py-2 rounded-lg font-semibold text-sm transition-all ${
                mode === 'byAmount'
                  ? 'bg-amber-600 text-white shadow-md'
                  : 'bg-white text-gray-600 hover:bg-gray-100'
              }`}
            >
              זיכוי לפי סכום
            </button>
            <button
              type="button"
              disabled
              className="flex-1 px-3 py-2 rounded-lg font-semibold text-sm bg-gray-100 text-gray-400 cursor-not-allowed border border-dashed border-gray-300"
              title="בקרוב"
            >
              זיכוי לפי עדכון הזמנה
              <span className="block text-xs font-normal mt-0.5">בקרוב</span>
            </button>
          </div>
        </div>

        {mode === 'byAmount' && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-900">
              <div className="flex justify-between gap-2">
                <span>סכום הזמנה (לפני זיכויים)</span>
                <span className="font-bold">{formatPrice(grossOrderTotal)}</span>
              </div>
              {credited > 0 && (
                <div className="flex justify-between gap-2 mt-1 text-amber-800">
                  <span>כבר זוכה</span>
                  <span>{formatPrice(credited)}</span>
                </div>
              )}
              <div className="flex justify-between gap-2 mt-1 pt-1 border-t border-amber-200/80 font-medium">
                <span>יתרה</span>
                <span dir="ltr">{formatPrice(order.totalPrice)}</span>
              </div>
            </div>

            <div>
              <label htmlFor="credit-amount" className="block text-sm font-medium text-gray-700 mb-2">
                סכום הזיכוי (₪)
              </label>
              <input
                id="credit-amount"
                type="text"
                inputMode="decimal"
                autoComplete="off"
                value={amountStr}
                onChange={(e) => handleAmountChange(e.target.value)}
                placeholder="0.00"
                aria-valuemax={maxAmount}
                aria-valuemin={0}
                className="w-full px-4 py-2 border border-gray-300 rounded-xl text-lg font-mono"
                dir="ltr"
              />
              <p className="text-xs text-gray-500 mt-1">
                ספרות ונקודה עשרונית בלבד, עד שני ספרות אחרי הנקודה. מקסימום לפי הזמנה:{' '}
                {formatPrice(maxAmount)}
              </p>
            </div>

            {primaryHasAllocation && (
              <div>
                <label htmlFor="credit-allocation" className="block text-sm font-medium text-gray-700 mb-2">
                  מספר הקצאה (9 ספרות)
                </label>
                <input
                  id="credit-allocation"
                  type="text"
                  inputMode="numeric"
                  maxLength={9}
                  value={allocationNumber}
                  onChange={(e) => setAllocationNumber(e.target.value.replace(/\D/g, '').slice(0, 9))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-xl font-mono"
                  dir="ltr"
                />
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="glass-button px-4 py-2 rounded-xl text-sm font-semibold text-gray-700"
              >
                ביטול
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="glass-button px-4 py-2 rounded-xl text-sm font-semibold border-2 border-amber-700 bg-amber-100 text-amber-900 hover:shadow-lg flex items-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Spinner size="sm" />
                    <span>שולח…</span>
                  </>
                ) : (
                  'צור זיכוי'
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </AccessibleModal>
  );
}
