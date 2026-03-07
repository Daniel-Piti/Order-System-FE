import { useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { Order } from '../services/api';
import { formatPrice } from '../utils/formatPrice';

const getStatusLabel = (status: string) => {
  switch (status) {
    case 'EMPTY': return 'ריק';
    case 'PLACED': return 'הוזמן';
    case 'DONE': return 'הושלם';
    case 'EXPIRED': return 'פג תוקף';
    case 'CANCELLED': return 'בוטל';
    default: return status;
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'EMPTY': return 'bg-gray-100 text-gray-700 border-2 border-gray-700';
    case 'PLACED': return 'bg-blue-100 text-blue-700 border-2 border-blue-700';
    case 'DONE': return 'bg-green-100 text-green-700 border-2 border-green-700';
    case 'EXPIRED': return 'bg-orange-100 text-orange-700 border-2 border-orange-700';
    case 'CANCELLED': return 'bg-red-100 text-red-700 border-2 border-red-700';
    default: return 'bg-gray-100 text-gray-700 border-2 border-gray-700';
  }
};

const formatDate = (dateString: string) =>
  new Date(dateString).toLocaleDateString('he-IL', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

export interface OrderViewModalActions {
  onCancel: () => void;
  onEdit: () => void;
  onDiscount: () => void;
  onMarkDone?: () => void;
  onClose: () => void;
  cancellingOrderId?: string | null;
  updatingOrderId?: string | null;
}

export interface OrderViewModalProps {
  order: Order;
  onClose: () => void;
  /** Standard actions (cancel, edit, discount, mark done, close). When set, same order-detail experience everywhere. */
  actions?: OrderViewModalActions;
  /** When provided, replaces the default/actions footer. Use for custom footers. */
  children?: React.ReactNode;
  onOpenInOrders?: () => void;
  openInOrdersLabel?: string;
}

export default function OrderViewModal({
  order,
  onClose,
  actions,
  children,
  onOpenInOrders,
  openInOrdersLabel = 'פתח בהזמנות',
}: OrderViewModalProps) {
  const mousedownOnBackdropRef = useRef(false);

  // Portal to document.body so the modal is outside layout (no transform/overflow ancestors).
  // Ensures fixed inset-0 always covers the full viewport from any page.
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  const modal = (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="פרטי הזמנה"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) mousedownOnBackdropRef.current = true;
        else mousedownOnBackdropRef.current = false;
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && mousedownOnBackdropRef.current) onClose();
        mousedownOnBackdropRef.current = false;
      }}
    >
      <div
        className="glass-card rounded-3xl p-6 md:p-8 w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white/85"
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => {
          e.stopPropagation();
          mousedownOnBackdropRef.current = false;
        }}
        dir="rtl"
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-bold text-gray-800">פרטי הזמנה</h2>
            <p className="text-sm text-gray-600">מספר מזהה #{order.id}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            aria-label="סגור"
          >
            <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="mb-6">
          <div className="flex items-center gap-3">
            <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getStatusColor(order.status)}`}>
              {getStatusLabel(order.status)}
            </span>
          </div>
        </div>

        {/* Customer */}
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">פרטי לקוח</h3>
          <div className="glass-card rounded-xl p-4 space-y-2">
            {order.customerName ? (
              <>
                <div className="flex items-start justify-between gap-3">
                  <span className="text-sm text-gray-600">שם</span>
                  <span className="text-sm font-medium text-gray-800 text-left break-words break-all">{order.customerName}</span>
                </div>
                {order.customerPhone && (
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-sm text-gray-600">טלפון</span>
                    <span className="text-sm font-medium text-gray-800 text-left break-words break-all">{order.customerPhone}</span>
                  </div>
                )}
                {order.customerEmail && (
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-sm text-gray-600">אימייל</span>
                    <span className="text-sm font-medium text-gray-800 text-left break-words break-all">{order.customerEmail}</span>
                  </div>
                )}
                {order.customerStreetAddress && (
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-sm text-gray-600">כתובת</span>
                    <span className="text-sm font-medium text-gray-800 text-left break-words break-all">{order.customerStreetAddress}</span>
                  </div>
                )}
                {order.customerCity && (
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-sm text-gray-600">עיר</span>
                    <span className="text-sm font-medium text-gray-800 text-left break-words break-all">{order.customerCity}</span>
                  </div>
                )}
              </>
            ) : (
              <p className="text-sm text-gray-500 italic">אין פרטי לקוח עדיין</p>
            )}
          </div>
        </div>

        {/* Pickup */}
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">סניף</h3>
          <div className="glass-card rounded-xl p-4 space-y-2">
            {order.selectedLocation ? (
              <>
                {order.selectedLocation.name && (
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-sm text-gray-600">שם</span>
                    <span className="text-sm font-medium text-gray-800 text-left break-words break-all">{order.selectedLocation.name}</span>
                  </div>
                )}
                {order.selectedLocation.streetAddress && (
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-sm text-gray-600">כתובת</span>
                    <span className="text-sm font-medium text-gray-800 text-left break-words break-all">{order.selectedLocation.streetAddress}</span>
                  </div>
                )}
                {order.selectedLocation.city && (
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-sm text-gray-600">עיר</span>
                    <span className="text-sm font-medium text-gray-800 text-left break-words break-all">{order.selectedLocation.city}</span>
                  </div>
                )}
                {order.selectedLocation.phoneNumber && (
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-sm text-gray-600">טלפון</span>
                    <span className="text-sm font-medium text-gray-800 text-left break-words break-all">{order.selectedLocation.phoneNumber}</span>
                  </div>
                )}
              </>
            ) : (
              <p className="text-sm text-gray-500 italic">סניף לא נבחר עדיין</p>
            )}
          </div>
        </div>

        {/* Products */}
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">מוצרים</h3>
          <div className="glass-card rounded-xl overflow-hidden">
            {order.products.length === 0 ? (
              <p className="text-sm text-gray-500 italic p-4">אין מוצרים עדיין</p>
            ) : (
              <div className="divide-y divide-gray-200/50">
                {order.products.map((product, index) => (
                  <div key={index} className="p-3 flex items-start justify-between gap-3 hover:bg-white/20 transition-colors">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 break-words break-all">{product.productName}</p>
                      <p className="text-xs text-gray-600 break-words break-all">כמות: {product.quantity}</p>
                    </div>
                    <div className="text-left break-words break-all">
                      <p className="text-sm font-semibold text-gray-800 break-words break-all">
                        {formatPrice(product.pricePerUnit * product.quantity)}
                      </p>
                      <p className="text-xs text-gray-600 break-words break-all">{formatPrice(product.pricePerUnit)} לכל יחידה</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Summary */}
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">סיכום הזמנה</h3>
          <div className="glass-card rounded-xl p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">סה״כ פריטים</span>
              <span className="text-sm font-medium text-gray-800">{order.products.length}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">סה״כ כמות</span>
              <span className="text-sm font-medium text-gray-800">
                {order.products.reduce((sum, p) => sum + p.quantity, 0)}
              </span>
            </div>
            {(() => {
              const productsTotal = order.products.reduce((sum, p) =>
                sum + (p.pricePerUnit * p.quantity), 0
              );
              return (
                <div className="flex items-center justify-between pt-2 border-t border-gray-200/50">
                  <span className="text-sm text-gray-600">מחיר</span>
                  <span className="text-sm font-medium text-gray-800">{formatPrice(productsTotal)}</span>
                </div>
              );
            })()}
            {order.discount > 0 && (() => {
              const productsTotal = order.products.reduce((sum, p) =>
                sum + (p.pricePerUnit * p.quantity), 0
              );
              const discountPercentage = productsTotal > 0
                ? ((order.discount / productsTotal) * 100).toFixed(1)
                : '0.0';
              return (
                <div className="flex items-center justify-between pt-2 border-t border-gray-200/50">
                  <span className="text-sm text-gray-600">הנחה</span>
                  <span className="text-sm font-semibold text-red-600">
                    {order.discount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}-₪ ({discountPercentage}%)
                  </span>
                </div>
              );
            })()}
            <div className="flex items-center justify-between pt-2 border-t border-gray-200/50">
              <span className="text-base font-semibold text-gray-800">מחיר כולל</span>
              <span className="text-lg font-bold text-indigo-600">{formatPrice(order.totalPrice)}</span>
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">הערות</h3>
          <div className="glass-card rounded-xl p-4">
            {order.notes && order.notes.trim() ? (
              <p className="text-sm font-bold text-orange-600 whitespace-pre-wrap break-words">{order.notes}</p>
            ) : (
              <p className="text-sm text-gray-500 italic">אין הערות</p>
            )}
          </div>
        </div>

        {/* Dates */}
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">מידע נוסף</h3>
          <div className="glass-card rounded-xl p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">מספר אסמכתא</span>
              <span className="text-xs font-mono font-bold text-gray-800">{order.referenceId}</span>
            </div>
            <div className="pt-2 border-t border-gray-200/50 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">נוצר ב:</span>
                <span className="text-sm font-medium text-gray-600">{formatDate(order.createdAt)}</span>
              </div>
              {order.placedAt && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">הוזמן ב:</span>
                  <span className="text-sm font-medium text-blue-600">{formatDate(order.placedAt)}</span>
                </div>
              )}
              {order.doneAt && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">הושלם ב:</span>
                  <span className="text-sm font-medium text-green-600">{formatDate(order.doneAt)}</span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">פג תוקף ב:</span>
                <span className="text-sm font-medium text-orange-600">{formatDate(order.linkExpiresAt)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap justify-center gap-3 items-center">
          {children !== undefined ? (
            children
          ) : actions ? (
            <>
              {(order.status === 'PLACED' || order.status === 'EMPTY') && (
                <button
                  type="button"
                  onClick={actions.onCancel}
                  disabled={!!actions.cancellingOrderId}
                  className={`glass-button px-6 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 border ${
                    actions.cancellingOrderId ? 'text-gray-400 border-gray-300 cursor-not-allowed' : 'text-red-600 border-red-600 bg-red-50 hover:shadow-lg'
                  }`}
                >
                  {actions.cancellingOrderId ? 'מבטל...' : 'בטל הזמנה'}
                </button>
              )}
              {order.status === 'PLACED' && (
                <>
                  <button
                    type="button"
                    onClick={actions.onEdit}
                    className="glass-button px-6 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 border-2 bg-blue-100 text-blue-700 border-blue-700 hover:shadow-lg"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    <span>ערוך הזמנה</span>
                  </button>
                  <button
                    type="button"
                    onClick={actions.onDiscount}
                    className="glass-button px-6 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 border-2 bg-purple-100 text-purple-700 border-purple-700 hover:shadow-lg"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>הוסף הנחה</span>
                  </button>
                  {actions.onMarkDone && (
                    <button
                      type="button"
                      onClick={actions.onMarkDone}
                      disabled={!!actions.updatingOrderId}
                      className={`glass-button px-6 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 border-2 ${
                        actions.updatingOrderId ? 'text-gray-400 border-gray-300 cursor-not-allowed' : 'text-green-600 border-green-700 bg-green-50 hover:shadow-lg'
                      }`}
                    >
                      {actions.updatingOrderId ? 'מסמן...' : (
                        <>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          <span>סמן כהושלם</span>
                        </>
                      )}
                    </button>
                  )}
                </>
              )}
              <button
                type="button"
                onClick={actions.onClose}
                className="glass-button px-6 py-2 rounded-xl text-sm font-semibold text-gray-800 hover:shadow-md transition-all"
              >
                סגור
              </button>
            </>
          ) : (
            <>
              {onOpenInOrders && (
                <button
                  type="button"
                  onClick={onOpenInOrders}
                  className="glass-button px-6 py-2 rounded-xl text-sm font-semibold text-gray-800 hover:shadow-md transition-all"
                >
                  {openInOrdersLabel}
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="glass-button px-6 py-2 rounded-xl text-sm font-semibold text-gray-800 hover:shadow-md transition-all"
              >
                סגור
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
