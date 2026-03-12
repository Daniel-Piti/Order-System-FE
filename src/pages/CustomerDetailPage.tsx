import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { customerAPI, orderAPI, invoiceAPI } from '../services/api';
import type { Customer, Order } from '../services/api';
import PaginationBar from '../components/PaginationBar';
import CustomerEditModal from '../components/CustomerEditModal';
import OrderViewModal from '../components/OrderViewModal';
import InvoiceCreationModal from '../components/InvoiceCreationModal';
import { formatPrice } from '../utils/formatPrice';
import { getStatusLabel, getStatusColor, formatOrderDateShort, getOrderRowClass, translateDiscountErrorMessage } from '../utils/orderUtils';
import { copyOrderLink, getOrderStoreLink } from '../utils/copyOrderLink';
import { useModalBackdrop } from '../hooks/useModalBackdrop';

const PAGE_SIZE_OPTIONS = [5, 10, 20];

export default function CustomerDetailPage() {
  const { customerId } = useParams<{ customerId: string }>();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [ordersPage, setOrdersPage] = useState<{ content: Order[]; totalPages: number }>({ content: [], totalPages: 0 });
  const [ordersPageNum, setOrdersPageNum] = useState(0);
  const [ordersPageSize, setOrdersPageSize] = useState(10);
  const [isLoadingCustomer, setIsLoadingCustomer] = useState(true);
  const [isLoadingOrders, setIsLoadingOrders] = useState(true);
  const [error, setError] = useState('');
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [isGeneratingLink, setIsGeneratingLink] = useState(false);
  const [showCreateNew, setShowCreateNew] = useState(false);
  const successTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [copiedOrderId, setCopiedOrderId] = useState<string | null>(null);
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);
  const [orderInvoiceUrls, setOrderInvoiceUrls] = useState<Map<string, string>>(new Map());
  const [loadingInvoiceUrls, setLoadingInvoiceUrls] = useState<Set<string>>(new Set());
  const [checkedOrders, setCheckedOrders] = useState<Set<string>>(new Set());
  const [invoiceOrder, setInvoiceOrder] = useState<Order | null>(null);
  const [viewingOrder, setViewingOrder] = useState<Order | null>(null);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [orderIdPendingCancel, setOrderIdPendingCancel] = useState<string | null>(null);
  const [cancellingOrderId, setCancellingOrderId] = useState<string | null>(null);
  const [discountOrder, setDiscountOrder] = useState<Order | null>(null);
  const [discountValue, setDiscountValue] = useState('');
  const [discountMode, setDiscountMode] = useState<'number' | 'percentage'>('number');
  const [isUpdatingDiscount, setIsUpdatingDiscount] = useState(false);
  const { backdropProps: cancelConfirmBackdropProps, contentProps: cancelConfirmContentProps } = useModalBackdrop(() => setShowCancelConfirm(false));
  const { backdropProps: discountModalBackdropProps, contentProps: discountModalContentProps } = useModalBackdrop(() => setDiscountOrder(null));

  const fetchCustomer = useCallback(async () => {
    if (!customerId) return;
    try {
      setIsLoadingCustomer(true);
      setError('');
      const data = await customerAPI.getCustomer(customerId);
      setCustomer(data);
    } catch (err: unknown) {
      const e = err as { response?: { status: number }; message?: string };
      if (e?.response?.status === 404 || e?.response?.status === 403) {
        setError('הלקוח לא נמצא או שאין הרשאה');
      } else {
        setError((e?.message as string) || 'שגיאה בטעינת הלקוח');
      }
      if (e?.response?.status === 401) navigate('/login/manager');
    } finally {
      setIsLoadingCustomer(false);
    }
  }, [customerId, navigate]);

  const fetchOrders = useCallback(async (pageOverride?: number) => {
    if (!customerId) return;
    const page = pageOverride ?? ordersPageNum;
    try {
      setIsLoadingOrders(true);
      const res = await orderAPI.getAllOrders(
        page,
        ordersPageSize,
        'createdAt',
        'DESC',
        undefined,
        false,
        null,
        customerId
      );
      setOrdersPage({ content: res.content, totalPages: res.totalPages });
    } catch (err: unknown) {
      const e = err as { response?: { status: number } };
      if (e?.response?.status === 401) navigate('/login/manager');
    } finally {
      setIsLoadingOrders(false);
    }
  }, [customerId, ordersPageNum, ordersPageSize, navigate]);

  useEffect(() => {
    fetchCustomer();
  }, [fetchCustomer]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Check invoice status for DONE orders (like Orders page)
  useEffect(() => {
    const doneOrders = ordersPage.content.filter((o) => o.status === 'DONE');
    if (doneOrders.length === 0) return;
    const toCheck = doneOrders.filter((o) => !checkedOrders.has(o.id));
    if (toCheck.length === 0) return;
    const orderIds = toCheck.map((o) => o.id);
    setLoadingInvoiceUrls((prev) => {
      const next = new Set(prev);
      orderIds.forEach((id) => next.add(id));
      return next;
    });
    invoiceAPI
      .getInvoicesByOrderIds(orderIds)
      .then((invoiceMap) => {
        if (Object.keys(invoiceMap).length > 0) {
          setOrderInvoiceUrls((prev) => {
            const next = new Map(prev);
            Object.entries(invoiceMap).forEach(([orderId, url]) => next.set(orderId, url));
            return next;
          });
        }
      })
      .catch((err) => console.error('Error checking invoices:', err))
      .finally(() => {
        setLoadingInvoiceUrls((prev) => {
          const next = new Set(prev);
          orderIds.forEach((id) => next.delete(id));
          return next;
        });
        setCheckedOrders((prev) => {
          const next = new Set(prev);
          orderIds.forEach((id) => next.add(id));
          return next;
        });
      });
  }, [ordersPage.content]);

  useEffect(() => {
    if (!generatedLink) {
      setShowCreateNew(false);
      if (successTimerRef.current) {
        clearTimeout(successTimerRef.current);
        successTimerRef.current = null;
      }
      return;
    }
    setShowCreateNew(false);
    successTimerRef.current = setTimeout(() => {
      setShowCreateNew(true);
      successTimerRef.current = null;
    }, 2000);
    return () => {
      if (successTimerRef.current) clearTimeout(successTimerRef.current);
    };
  }, [generatedLink]);

  const copyToClipboard = async (text: string): Promise<boolean> => {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      try {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        return true;
      } catch {
        return false;
      }
    }
  };

  const handleGenerateLink = async () => {
    if (!customerId) return;
    setIsGeneratingLink(true);
    setError('');
    try {
      const newOrder = await orderAPI.createOrder({ customerId });
      const baseUrl = import.meta.env.VITE_FRONTEND_URL || window.location.origin;
      const link = `${baseUrl}/store/order/${newOrder.id}`;
      setGeneratedLink(link);
      await copyToClipboard(link);
      setOrdersPage((prev) => ({
        content: [newOrder, ...prev.content],
        totalPages: prev.totalPages === 0 ? 1 : prev.totalPages,
      }));
      setOrdersPageNum(0);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { userMessage?: string }; status: number }; message?: string };
      const msg = e?.response?.data?.userMessage || (e?.message as string) || 'שגיאה ביצירת קישור';
      const noLocationsHebrew = 'לא ניתן ליצור הזמנה. יש להוסיף לפחות מיקום אחד קודם.';
      setError(
        msg === 'Cannot create order. Please add at least one location first.' || msg === 'You have minimum one locations'
          ? noLocationsHebrew
          : msg
      );
      if (e?.response?.status === 401) navigate('/login/manager');
    } finally {
      setIsGeneratingLink(false);
    }
  };

  const formatPhone = (phone: string) =>
    phone.length >= 3 ? `${phone.substring(0, 3)}-${phone.substring(3)}` : phone;

  const handleCopyOrderLink = async (e: React.MouseEvent, orderId: string) => {
    e.stopPropagation();
    const ok = await copyOrderLink(orderId);
    if (ok) {
      setCopiedOrderId(orderId);
      setTimeout(() => setCopiedOrderId(null), 2000);
    } else {
      setError('העתקה נכשלה');
    }
  };

  const handleMarkOrderDone = async (e: React.MouseEvent, orderId: string) => {
    e.stopPropagation();
    setUpdatingOrderId(orderId);
    setError('');
    try {
      const updatedOrder = await orderAPI.markOrderDone(orderId);
      setViewingOrder((prev) => (prev?.id === orderId ? updatedOrder : prev));
      setOrdersPage((prev) => ({
        ...prev,
        content: prev.content.map((o) => (o.id === orderId ? updatedOrder : o)),
      }));
    } catch (err: unknown) {
      const e = err as { response?: { data?: { userMessage?: string } }; status?: number };
      setError(e?.response?.data?.userMessage || 'נכשל בסימון ההזמנה כהושלמה');
      if (e?.response?.status === 401) navigate('/login/manager');
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const handleCancelOrder = async (orderId: string) => {
    setCancellingOrderId(orderId);
    setError('');
    try {
      const cancelledOrder = await orderAPI.markOrderCancelled(orderId);
      setViewingOrder((prev) => (prev?.id === orderId ? cancelledOrder : prev));
      setOrdersPage((prev) => ({
        ...prev,
        content: prev.content.map((o) => (o.id === orderId ? cancelledOrder : o)),
      }));
    } catch (err: unknown) {
      const e = err as { response?: { data?: { userMessage?: string } }; status?: number };
      setError(e?.response?.data?.userMessage || 'נכשל בביטול ההזמנה');
      if (e?.response?.status === 401) navigate('/login/manager');
    } finally {
      setCancellingOrderId(null);
      setOrderIdPendingCancel(null);
      setShowCancelConfirm(false);
    }
  };

  const handleUpdateDiscount = async () => {
    if (!discountOrder) return;
    const productsTotal = discountOrder.products.reduce((sum, p) => sum + p.pricePerUnit * p.quantity, 0);
    const inputValue = discountMode === 'percentage' ? parseFloat(discountValue) : parseFloat(discountValue);
    if (isNaN(inputValue) || inputValue < 0) {
      setError('אנא הזן ערך תקין');
      return;
    }
    let discountNum = discountMode === 'percentage' ? (inputValue / 100) * productsTotal : inputValue;
    discountNum = Math.round(discountNum * 100) / 100;
    setIsUpdatingDiscount(true);
    setError('');
    try {
      const updatedOrder = await orderAPI.updateOrderDiscount(discountOrder.id, discountNum);
      setViewingOrder((prev) => (prev?.id === updatedOrder.id ? updatedOrder : prev));
      setOrdersPage((prev) => ({
        ...prev,
        content: prev.content.map((o) => (o.id === updatedOrder.id ? updatedOrder : o)),
      }));
      setDiscountOrder(null);
      setDiscountValue('');
      setDiscountMode('number');
    } catch (err: unknown) {
      const er = err as { response?: { data?: { userMessage?: string } }; status?: number };
      const msg = er?.response?.data?.userMessage || 'נכשל בעדכון ההנחה';
      setError(translateDiscountErrorMessage(msg));
      if (er?.response?.status === 401) navigate('/login/manager');
    } finally {
      setIsUpdatingDiscount(false);
    }
  };

  if (!customerId) {
    return (
      <div className="max-w-4xl mx-auto p-6" dir="rtl">
        <p className="text-gray-600">מזהה לקוח חסר.</p>
      </div>
    );
  }

  if (isLoadingCustomer) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]" dir="rtl">
        <div className="animate-spin h-12 w-12 border-4 border-indigo-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error && !customer) {
    return (
      <div className="max-w-4xl mx-auto p-6" dir="rtl">
        <div className="glass-card rounded-3xl p-8 bg-red-50/50 border-red-200">
          <h2 className="text-xl font-bold text-red-800 mb-2">שגיאה</h2>
          <p className="text-red-600 mb-4">{error}</p>
          <button
            type="button"
            onClick={() => navigate('/dashboard/customers')}
            className="glass-button px-4 py-2 rounded-xl text-gray-800"
          >
            חזרה לרשימת הלקוחות
          </button>
        </div>
      </div>
    );
  }

  if (!customer) {
    return null;
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-28" dir="rtl">
      <button
        type="button"
        onClick={() => navigate('/dashboard/customers')}
        className="self-start flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-gray-700 bg-white border-2 border-gray-300 hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50/50 transition-colors shadow-sm"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        חזרה ללקוחות
      </button>

      <div className="glass-card rounded-3xl p-6 md:p-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-4">{customer.name}</h1>
        <div className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-center md:gap-4">
          <div className="flex flex-1 flex-col gap-2 text-sm md:flex-row md:flex-wrap md:items-center md:gap-x-6 md:gap-y-1">
            <div className="flex gap-1.5">
              <span className="font-bold text-gray-600">אימייל:</span>
              <span className="font-semibold text-gray-900">{customer.email}</span>
            </div>
            <div className="flex gap-1.5">
              <span className="font-bold text-gray-600">טלפון:</span>
              <span className="font-semibold text-gray-900" dir="ltr">{formatPhone(customer.phoneNumber)}</span>
            </div>
            <div className="flex gap-1.5">
              <span className="font-bold text-gray-600">עיר:</span>
              <span className="font-semibold text-gray-900">{customer.city}</span>
            </div>
            <div className="flex gap-1.5">
              <span className="font-bold text-gray-600">אחוז הנחה:</span>
              <span className="font-semibold text-gray-900">{customer.discountPercentage}%</span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsEditOpen(true)}
            className="w-fit shrink-0 glass-button px-4 py-2 rounded-xl text-sm font-semibold text-gray-800 border border-indigo-200 hover:border-indigo-300 inline-flex items-center gap-2"
            aria-label="ערוך לקוח"
          >
            <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 4H6a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2v-5M18.5 2.5a2.121 2.121 0 113 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
            ערוך לקוח
          </button>
        </div>
      </div>

      <div className="glass-card rounded-3xl p-6 md:p-8">
        <h2 className="text-xl font-bold text-gray-800 mb-4">קישור להזמנה חדשה</h2>
        {error && !generatedLink && (
          <p className="text-red-600 text-sm mb-2">{error}</p>
        )}
        <button
          type="button"
          onClick={handleGenerateLink}
          disabled={isGeneratingLink || (!!generatedLink && !showCreateNew)}
          className={
            'inline-flex items-center justify-center gap-2 min-w-[15rem] h-12 rounded-xl font-semibold text-white border-2 transition-all duration-500 ease-in-out ' +
            (generatedLink && !showCreateNew
              ? 'bg-green-600 border-green-600 cursor-default shadow-lg shadow-green-500/30'
              : 'bg-indigo-600 border-indigo-600/40 hover:bg-indigo-700 hover:border-indigo-700/60 shadow-lg shadow-indigo-500/30 hover:shadow-xl hover:shadow-indigo-500/40')
          }
        >
          {isGeneratingLink ? (
            <>
              <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
              יוצר הזמנה
            </>
          ) : generatedLink && !showCreateNew ? (
            'הזמנה נוצרה ✓ הועתק!'
          ) : generatedLink && showCreateNew ? (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
              צור קישור חדש
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
              צור קישור להזמנה חדשה
            </>
          )}
        </button>

        <div className="border-t border-gray-200 pt-6 mt-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
            <h2 className="text-xl font-bold text-gray-800">הזמנות של הלקוח</h2>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">הצג:</span>
              <select
                value={ordersPageSize}
                onChange={(e) => { setOrdersPageSize(Number(e.target.value)); setOrdersPageNum(0); }}
                className="glass-select pl-3 pr-8 py-2 rounded-xl text-sm w-20"
                dir="ltr"
              >
                {PAGE_SIZE_OPTIONS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>

        {isLoadingOrders ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin h-10 w-10 border-2 border-indigo-600 border-t-transparent rounded-full" />
          </div>
        ) : ordersPage.content.length === 0 ? (
          <p className="text-gray-500 text-center py-8">אין הזמנות ללקוח זה.</p>
        ) : (
          <>
            <div className="overflow-x-auto rounded-t-xl border border-gray-200">
              <table className="min-w-full divide-y divide-gray-200" aria-label="הזמנות הלקוח">
                <thead className="bg-indigo-50/70">
                  <tr>
                    <th scope="col" className="px-4 py-3 text-center text-xs font-semibold text-gray-600">ID</th>
                    <th scope="col" className="px-4 py-3 text-center text-xs font-semibold text-gray-600">סטטוס</th>
                    <th scope="col" className="px-4 py-3 text-center text-xs font-semibold text-gray-600">תאריך יצירה</th>
                    <th scope="col" className="px-4 py-3 text-center text-xs font-semibold text-gray-600">סה״כ</th>
                    <th scope="col" className="px-4 py-3 text-center text-xs font-semibold text-gray-600 w-32">פעולות</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {ordersPage.content.map((order) => (
                    <tr
                      key={order.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => setViewingOrder(order)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setViewingOrder(order);
                        }
                      }}
                      className={`cursor-pointer ${getOrderRowClass(order.status)}`}
                    >
                      <td className="px-4 py-3 text-sm font-mono text-gray-700 text-center">{order.id}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex px-3 py-1 rounded-full text-xs font-bold ${getStatusColor(order.status)} shadow-sm`}>
                          {getStatusLabel(order.status)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-800 text-center">
                        {formatOrderDateShort(order.createdAt)}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-800 text-center">
                        {formatPrice(order.totalPrice)}
                        {order.discount > 0 && (
                          <span className="text-red-600 text-xs mr-1" aria-label={`הנחה ${formatPrice(order.discount)}`}>
                            {' '}({formatPrice(order.discount)} הנחה)
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <div className="flex flex-wrap items-center justify-center gap-1.5">
                          {order.status === 'EMPTY' && (
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  window.open(`https://wa.me/?text=${encodeURIComponent(getOrderStoreLink(order.id))}`, '_blank');
                                }}
                                className="p-2 rounded-full border-2 border-[#25D366] bg-[#25D366]/10 text-[#25D366] hover:shadow-md transition-all flex-shrink-0"
                                title="שלח קישור בוואטסאפ"
                                aria-label="שלח קישור בוואטסאפ"
                              >
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                                </svg>
                              </button>
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); handleCopyOrderLink(e, order.id); }}
                                className={`p-2 rounded-full border-2 transition-all shadow-sm flex-shrink-0 ${
                                  copiedOrderId === order.id
                                    ? 'bg-indigo-200 text-indigo-700 border-indigo-700'
                                    : 'bg-indigo-50 text-indigo-600 border-indigo-500 hover:shadow-md'
                                }`}
                                title={copiedOrderId === order.id ? 'קישור הועתק' : 'העתק קישור'}
                                aria-label={copiedOrderId === order.id ? 'קישור הועתק' : 'העתק קישור'}
                              >
                                {copiedOrderId === order.id ? (
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                  </svg>
                                ) : (
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                  </svg>
                                )}
                              </button>
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); window.open(getOrderStoreLink(order.id), '_blank'); }}
                                className="p-2 rounded-full border-2 bg-indigo-50 text-indigo-600 border-indigo-500 hover:shadow-md transition-all flex-shrink-0"
                                title="פתח הזמנה בטאב חדש"
                                aria-label="פתח הזמנה בטאב חדש"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                </svg>
                              </button>
                            </div>
                          )}
                          {order.status === 'PLACED' && (
                            <>
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); setViewingOrder(null); navigate(`/store/edit/${order.id}`); }}
                                className="p-2 rounded-full border-2 bg-blue-100 text-blue-700 border-blue-700 hover:shadow-md transition-all"
                                title="ערוך הזמנה"
                                aria-label="ערוך הזמנה"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </button>
                              <button
                                type="button"
                                onClick={(e) => handleMarkOrderDone(e, order.id)}
                                disabled={updatingOrderId === order.id}
                                className={`p-2 rounded-full border-2 transition-all shadow-sm ${
                                  updatingOrderId === order.id
                                    ? 'bg-gray-100 text-gray-400 border-gray-300 cursor-not-allowed'
                                    : 'bg-green-100 text-green-700 border-green-700 hover:shadow-md'
                                }`}
                                title="סמן כהושלם"
                                aria-label="סמן כהושלם"
                              >
                                {updatingOrderId === order.id ? (
                                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V2C6.477 2 2 6.477 2 12h2zm2 5.291A7.962 7.962 0 014 12H2c0 3.042 1.135 5.824 3 7.938l1-2.647z" />
                                  </svg>
                                ) : (
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                  </svg>
                                )}
                              </button>
                            </>
                          )}
                          {order.status === 'DONE' && (
                            orderInvoiceUrls.has(order.id) ? (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const url = orderInvoiceUrls.get(order.id);
                                  if (url) window.open(url, '_blank');
                                }}
                                className="p-2 rounded-full border-2 bg-green-50 text-green-600 border-green-500 hover:bg-green-100 hover:shadow-md transition-all"
                                title="צפה בחשבונית"
                                aria-label="צפה בחשבונית"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); setInvoiceOrder(order); }}
                                disabled={loadingInvoiceUrls.has(order.id)}
                                className="p-2 rounded-full border-2 bg-green-100 text-green-700 border-green-600 hover:bg-green-200 hover:shadow-md transition-all disabled:opacity-60"
                                title="צור חשבונית"
                                aria-label="צור חשבונית"
                              >
                                {loadingInvoiceUrls.has(order.id) ? (
                                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V2C6.477 2 2 6.477 2 12h2zm2 5.291A7.962 7.962 0 014 12H2c0 3.042 1.135 5.824 3 7.938l1-2.647z" />
                                  </svg>
                                ) : (
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                  </svg>
                                )}
                              </button>
                            )
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <PaginationBar
              currentPage={ordersPageNum}
              totalPages={ordersPage.totalPages}
              onPageChange={setOrdersPageNum}
              showCondition={ordersPage.totalPages > 1}
              fixed={false}
              rtl
            />
          </>
        )}
        </div>
      </div>

      {viewingOrder && (
        <OrderViewModal
          order={viewingOrder}
          onClose={() => setViewingOrder(null)}
          actions={{
            onCancel: () => {
              setOrderIdPendingCancel(viewingOrder.id);
              setShowCancelConfirm(true);
            },
            onEdit: () => {
              setViewingOrder(null);
              navigate(`/store/edit/${viewingOrder.id}`);
            },
            onDiscount: () => {
              setDiscountOrder(viewingOrder);
              setDiscountValue(viewingOrder.discount > 0 ? viewingOrder.discount.toString() : '');
              setDiscountMode('number');
            },
            onMarkDone: () => handleMarkOrderDone({ stopPropagation: () => {} } as React.MouseEvent, viewingOrder.id),
            onClose: () => setViewingOrder(null),
            cancellingOrderId,
            updatingOrderId,
          }}
        />
      )}

      {showCancelConfirm && orderIdPendingCancel && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" {...cancelConfirmBackdropProps}>
          <div className="glass-card rounded-3xl p-6 md:p-8 w-full max-w-md bg-white/90 shadow-xl border border-red-100" {...cancelConfirmContentProps} dir="rtl">
            <div className="flex items-center justify-between mb-4">
              <div><h2 className="text-lg font-semibold text-gray-900">בטל הזמנה?</h2></div>
              <button onClick={() => !cancellingOrderId && setShowCancelConfirm(false)} className="p-2 hover:bg-white/20 rounded-lg transition-colors">
                <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <p className="text-sm text-gray-600 mb-6 leading-relaxed font-medium">ביטול יסיר את ההזמנה מהתור הפעיל. אתה תמיד יכול ליצור הזמנה חדשה מאוחר יותר אם תשנה את דעתך.</p>
            <div className="border-t border-gray-200/70 -mx-6 md:-mx-8 mb-4" />
            <div className="flex justify-start gap-3">
              <button onClick={() => !cancellingOrderId && setShowCancelConfirm(false)} className="glass-button px-4 py-2 rounded-xl text-sm font-semibold text-gray-700 hover:shadow-md transition-all">שמור הזמנה</button>
              <button onClick={() => handleCancelOrder(orderIdPendingCancel)} disabled={!!cancellingOrderId} className={`glass-button px-4 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 border ${cancellingOrderId ? 'text-gray-400 border-gray-300 cursor-not-allowed' : 'text-red-600 border-red-600 bg-red-50 hover:shadow-lg'}`}>
                {cancellingOrderId ? 'מבטל...' : 'בטל הזמנה'}
              </button>
            </div>
          </div>
        </div>
      )}

      {discountOrder && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" {...discountModalBackdropProps}>
          <div className="glass-card rounded-3xl p-6 md:p-8 w-full max-w-md bg-white/90 shadow-xl border border-purple-100" {...discountModalContentProps} dir="rtl">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">הוסף הנחה</h2>
                <p className="text-sm text-gray-600 mt-1">הזמנה #{discountOrder.id.slice(0, 8)}</p>
              </div>
              <button onClick={() => { if (!isUpdatingDiscount) { setDiscountOrder(null); setDiscountValue(''); setDiscountMode('number'); } }} disabled={isUpdatingDiscount} className="p-2 hover:bg-white/20 rounded-lg transition-colors disabled:opacity-50">
                <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="space-y-4">
              {(() => {
                const productsTotal = discountOrder.products.reduce((sum, p) => sum + p.pricePerUnit * p.quantity, 0);
                return (
                  <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-indigo-700">סכום הזמנה:</span>
                      <span className="text-lg font-bold text-indigo-900">{formatPrice(productsTotal)}</span>
                    </div>
                  </div>
                );
              })()}
              <div className="flex items-center justify-center gap-3 p-2 bg-gray-50 rounded-xl border border-gray-200">
                <button type="button" onClick={() => { setDiscountMode('number'); setDiscountValue(''); setError(''); }} className={`flex-1 px-4 py-2 rounded-lg font-semibold text-sm transition-all ${discountMode === 'number' ? 'bg-purple-600 text-white shadow-md' : 'bg-white text-gray-600 hover:bg-gray-100'}`}>סכום (₪)</button>
                <button type="button" onClick={() => { setDiscountMode('percentage'); setDiscountValue(''); setError(''); }} className={`flex-1 px-4 py-2 rounded-lg font-semibold text-sm transition-all ${discountMode === 'percentage' ? 'bg-purple-600 text-white shadow-md' : 'bg-white text-gray-600 hover:bg-gray-100'}`}>אחוז (%)</button>
              </div>
              <div>
                <label htmlFor="discount-input-customer" className="block text-sm font-medium text-gray-700 mb-2">{discountMode === 'number' ? 'סכום הנחה (₪)' : 'אחוז הנחה (%)'}</label>
                <div className="relative">
                  <input id="discount-input-customer" type="number" step={discountMode === 'number' ? '0.01' : '0.1'} min="0" value={discountValue} onChange={(e) => {
                    const value = e.target.value;
                    const productsTotal = discountOrder.products.reduce((sum, p) => sum + p.pricePerUnit * p.quantity, 0);
                    if (discountMode === 'number') {
                      if (value === '' || /^\d*\.?\d{0,2}$/.test(value)) {
                        const num = parseFloat(value);
                        if (value === '' || isNaN(num)) setDiscountValue(value);
                        else if (num > productsTotal) setDiscountValue(productsTotal.toFixed(2));
                        else if (num < 0) setDiscountValue('0');
                        else setDiscountValue(value);
                        setError('');
                      }
                    } else {
                      if (value === '' || /^\d*\.?\d{0,2}$/.test(value)) {
                        const num = parseFloat(value);
                        if (value === '' || isNaN(num)) setDiscountValue(value);
                        else if (num > 100) setDiscountValue('100');
                        else if (num < 0) setDiscountValue('0');
                        else setDiscountValue(value);
                        setError('');
                      }
                    }
                  }} onBlur={(e) => { const num = parseFloat(e.target.value); if (!isNaN(num)) setDiscountValue(num.toFixed(2).replace(/\.?0+$/, '')); }} placeholder={discountMode === 'number' ? '0.00' : '0.0'} disabled={isUpdatingDiscount} className="w-full px-4 py-2 pl-12 pr-12 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 disabled:bg-gray-100 disabled:cursor-not-allowed text-center [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield]" dir="ltr" />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium pointer-events-none">{discountMode === 'number' ? '₪' : '%'}</span>
                </div>
              </div>
              {error && <div className="p-3 bg-red-50 border border-red-200 rounded-xl"><p className="text-sm text-red-600">{error}</p></div>}
              <div className="flex justify-start gap-3">
                <button onClick={() => { if (!isUpdatingDiscount) { setDiscountOrder(null); setDiscountValue(''); setDiscountMode('number'); } }} disabled={isUpdatingDiscount} className="glass-button px-4 py-2 rounded-xl text-sm font-semibold text-gray-700 hover:shadow-md transition-all disabled:opacity-50">ביטול</button>
                <button onClick={handleUpdateDiscount} disabled={isUpdatingDiscount || !discountValue || parseFloat(discountValue) < 0 || (discountMode === 'percentage' && parseFloat(discountValue) > 100)} className={`glass-button px-4 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 border ${isUpdatingDiscount || !discountValue || parseFloat(discountValue) < 0 || (discountMode === 'percentage' && parseFloat(discountValue) > 100) ? 'text-gray-400 border-gray-300 cursor-not-allowed' : 'text-purple-600 border-purple-600 bg-purple-50 hover:shadow-lg'}`}>
                  {isUpdatingDiscount ? 'מעדכן...' : 'עדכן הנחה'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <CustomerEditModal
        isOpen={isEditOpen}
        customer={customer}
        onClose={() => setIsEditOpen(false)}
        onSuccess={(updatedCustomer) => { setCustomer(updatedCustomer); setIsEditOpen(false); }}
        updateCustomer={customerAPI.updateCustomer}
      />

      {invoiceOrder && (
        <InvoiceCreationModal
          order={invoiceOrder}
          isOpen={!!invoiceOrder}
          onClose={() => setInvoiceOrder(null)}
          onSuccess={(response) => {
            if (invoiceOrder) {
              setOrderInvoiceUrls((prev) => new Map(prev).set(invoiceOrder.id, response.pdfUrl));
              setCheckedOrders((prev) => new Set(prev).add(invoiceOrder.id));
            }
            setInvoiceOrder(null);
          }}
        />
      )}
    </div>
  );
}
