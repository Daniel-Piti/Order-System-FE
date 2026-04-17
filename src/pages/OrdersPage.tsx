import { useState, useEffect } from 'react';
import Spinner from '../components/Spinner';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { orderAPI, customerAPI, agentAPI, invoiceAPI, type Order, type Customer, type Agent, type InvoiceDto } from '../services/api';
import PaginationBar from '../components/PaginationBar';
import OrderViewModal from '../components/OrderViewModal';
import { formatPrice } from '../utils/formatPrice';
import { getStatusLabel, getStatusColor, getCardStyles, getLabelStyles, formatOrderDateShortWithTime, getOrderCardDate, translateDiscountErrorMessage } from '../utils/orderUtils';
import { copyOrderLink, getOrderStoreLink } from '../utils/copyOrderLink';
import InvoiceCreationModal from '../components/InvoiceCreationModal';
import CreditNoteModal from '../components/CreditNoteModal';
import { useModalBackdrop } from '../hooks/useModalBackdrop';
import { primaryInvoicePdfUrl, primaryTaxInvoiceMeta } from '../utils/invoiceUtils';
import { resolveApiErr } from '../utils/apiErrorMessage';

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [viewingOrder, setViewingOrder] = useState<Order | null>(null);
  const [copiedOrderId, setCopiedOrderId] = useState<string | null>(null);
  const [copiedPhoneNumber, setCopiedPhoneNumber] = useState<string | null>(null);
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);
  const [cancellingOrderId, setCancellingOrderId] = useState<string | null>(null);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [orderIdPendingCancel, setOrderIdPendingCancel] = useState<string | null>(null);
  const [invoiceOrder, setInvoiceOrder] = useState<Order | null>(null);
  const [creditNoteOrder, setCreditNoteOrder] = useState<Order | null>(null);
  const [orderInvoiceUrls, setOrderInvoiceUrls] = useState<Map<string, string>>(new Map());
  const [orderInvoicePrimaryMeta, setOrderInvoicePrimaryMeta] = useState<
    Map<string, { invoiceId: number; allocationNumber: string | null }>
  >(new Map());
  const [checkedOrders, setCheckedOrders] = useState<Set<string>>(new Set()); // Track which orders we've checked (even if no invoice)
  const [loadingInvoiceUrls, setLoadingInvoiceUrls] = useState<Set<string>>(new Set());
  /** Full invoice rows per order (tax + credit notes) for modal list + card URLs */
  const [orderInvoicesByOrderId, setOrderInvoicesByOrderId] = useState<Map<string, InvoiceDto[]>>(new Map());
  const [loadingOrderInvoicesForModal, setLoadingOrderInvoicesForModal] = useState(false);
  const [discountOrder, setDiscountOrder] = useState<Order | null>(null);
  const [discountValue, setDiscountValue] = useState<string>('');
  const [discountMode, setDiscountMode] = useState<'number' | 'percentage'>('number');
  const [isUpdatingDiscount, setIsUpdatingDiscount] = useState(false);
  const { backdropProps: createModalBackdropProps, contentProps: createModalContentProps } = useModalBackdrop(() => setShowCreateModal(false));
  const { backdropProps: cancelConfirmBackdropProps, contentProps: cancelConfirmContentProps } = useModalBackdrop(() => setShowCancelConfirm(false));
  const { backdropProps: discountModalBackdropProps, contentProps: discountModalContentProps } = useModalBackdrop(() => setDiscountOrder(null));

  // Pagination state
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [totalPages, setTotalPages] = useState(0);

  // Sorting state
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortDirection, setSortDirection] = useState<'ASC' | 'DESC'>('DESC');

  // Filter state
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [agentFilter, setAgentFilter] = useState<string>(''); // '' = all, 'manager' = manager only, 'agentId' = specific agent
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    fetchOrders(currentPage);
  }, [currentPage, sortBy, sortDirection, pageSize, statusFilter, agentFilter]);

  // Check invoice status for DONE orders (batch check)
  useEffect(() => {
    const checkInvoiceStatus = async () => {
      const doneOrders = orders.filter(order => order.status === 'DONE');
      if (doneOrders.length === 0) return;

      // Only check orders that we haven't checked yet
      const ordersToCheck = doneOrders.filter(order => !checkedOrders.has(order.id));
      if (ordersToCheck.length === 0) return; // All already checked

      // Mark orders as loading
      const orderIdsToCheck = ordersToCheck.map(order => order.id);
      setLoadingInvoiceUrls(prev => {
        const updated = new Set(prev);
        orderIdsToCheck.forEach(id => updated.add(id));
        return updated;
      });

      try {
        const invoicesByOrderId = await invoiceAPI.getInvoicesByOrderIds(orderIdsToCheck);
        setOrderInvoiceUrls((prev) => {
          const updated = new Map(prev);
          for (const orderId of orderIdsToCheck) {
            const list = invoicesByOrderId[orderId] ?? [];
            const url = primaryInvoicePdfUrl(list);
            if (url) updated.set(orderId, url);
          }
          return updated;
        });
        setOrderInvoicePrimaryMeta((prev) => {
          const updated = new Map(prev);
          for (const orderId of orderIdsToCheck) {
            const list = invoicesByOrderId[orderId] ?? [];
            const meta = primaryTaxInvoiceMeta(list);
            if (meta) updated.set(orderId, meta);
          }
          return updated;
        });
        setOrderInvoicesByOrderId((prev) => {
          const updated = new Map(prev);
          for (const orderId of orderIdsToCheck) {
            updated.set(orderId, invoicesByOrderId[orderId] ?? []);
          }
          return updated;
        });
      } catch (err: any) {
        // Log error but don't fail silently
        console.error('Error checking invoices for orders:', err);
      } finally {
        // Clear loading state and mark all as checked
        setLoadingInvoiceUrls(prev => {
          const updated = new Set(prev);
          orderIdsToCheck.forEach(id => updated.delete(id));
          return updated;
        });

        // Mark all checked orders as checked (even if they don't have invoices)
        setCheckedOrders(prev => {
          const updated = new Set(prev);
          orderIdsToCheck.forEach(id => updated.add(id));
          return updated;
        });
      }
    };

    if (orders.length > 0) {
      checkInvoiceStatus();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orders]);

  // When opening a DONE order, reload invoices so the modal shows tax + credit notes
  useEffect(() => {
    if (!viewingOrder || viewingOrder.status !== 'DONE') {
      setLoadingOrderInvoicesForModal(false);
      return;
    }
    let cancelled = false;
    setLoadingOrderInvoicesForModal(true);
    invoiceAPI
      .getInvoicesByOrderIds([viewingOrder.id])
      .then((map) => {
        if (cancelled) return;
        const list = map[viewingOrder.id] ?? [];
        setOrderInvoicesByOrderId((prev) => new Map(prev).set(viewingOrder.id, list));
        const url = primaryInvoicePdfUrl(list);
        setOrderInvoiceUrls((prev) => {
          const next = new Map(prev);
          if (url) next.set(viewingOrder.id, url);
          else next.delete(viewingOrder.id);
          return next;
        });
        const meta = primaryTaxInvoiceMeta(list);
        setOrderInvoicePrimaryMeta((prev) => {
          const next = new Map(prev);
          if (meta) next.set(viewingOrder.id, meta);
          else next.delete(viewingOrder.id);
          return next;
        });
      })
      .catch((err) => console.error('Error loading invoices for order modal:', err))
      .finally(() => {
        if (!cancelled) setLoadingOrderInvoicesForModal(false);
      });
    return () => {
      cancelled = true;
    };
  }, [viewingOrder?.id, viewingOrder?.status]);

  const fetchOrders = async (page: number = 0) => {
    setIsLoading(true);
    setError('');
    try {
      // Determine orderSource and agentId based on agentFilter
      // '' = all (orderSource=null), 'manager' = manager only (MANAGER), otherwise = specific agent (AGENT + agentId)
      const orderSource = agentFilter === '' ? null : agentFilter === 'manager' ? 'MANAGER' : 'AGENT';
      const agentId = orderSource === 'AGENT' ? agentFilter : null;

      const pageResponse = await orderAPI.getAllOrders(
        page,
        pageSize,
        sortBy,
        sortDirection,
        statusFilter || undefined,
        orderSource,
        agentId
      );
      const fetchedOrders = pageResponse?.content || [];
      setOrders(fetchedOrders);
      setTotalPages(pageResponse?.totalPages || 0);
    } catch (err: any) {
      setError('נכשל בטעינת הזמנות');
      setOrders([]); // Reset to empty array on error
      setTotalPages(0);
      console.error('Error fetching orders:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCustomers = async () => {
    try {
      const data = await customerAPI.getAllCustomers();
      setCustomers(data);
    } catch (err: any) {
      console.error('Error fetching customers:', err);
    }
  };

  const fetchAgents = async () => {
    try {
      const data = await agentAPI.getAgentsForManager();
      setAgents(data);
    } catch (err: any) {
      console.error('Error fetching agents:', err);
    }
  };

  useEffect(() => {
    fetchCustomers();
    fetchAgents();
  }, []);

  // Check URL params for orderId after orders are loaded
  useEffect(() => {
    const orderIdFromUrl = searchParams.get('orderId');
    if (orderIdFromUrl && !viewingOrder) {
      // First check if order is in current page
      const orderToView = orders.find(o => o.id === orderIdFromUrl);
      if (orderToView) {
        setViewingOrder(orderToView);
        // Clear the URL parameter after opening
        const newSearchParams = new URLSearchParams(searchParams);
        newSearchParams.delete('orderId');
        setSearchParams(newSearchParams, { replace: true });
      } else if (orders.length > 0) {
        // Order not in current page, fetch it by ID
        orderAPI.getOrderById(orderIdFromUrl)
          .then((fetchedOrder) => {
            setViewingOrder(fetchedOrder);
            // Clear the URL parameter after opening
            const newSearchParams = new URLSearchParams(searchParams);
            newSearchParams.delete('orderId');
            setSearchParams(newSearchParams, { replace: true });
          })
          .catch((err) => {
            console.error('Failed to fetch order by ID:', err);
            // Clear the URL parameter even on error
            const newSearchParams = new URLSearchParams(searchParams);
            newSearchParams.delete('orderId');
            setSearchParams(newSearchParams, { replace: true });
          });
      }
    }
  }, [orders, searchParams, setSearchParams, viewingOrder]);

  const handleCreateOrder = async () => {
    setIsCreating(true);
    setError('');
    try {
      const newOrder = await orderAPI.createOrder({
        customerId: selectedCustomerId || null,
      });
      setShowCreateModal(false);
      setSelectedCustomerId(null);
      setCurrentPage(0);
      setOrders((prev) => [newOrder, ...prev]);
    } catch (err: unknown) {
      setError(resolveApiErr(err, 'orderCreate'));
    } finally {
      setIsCreating(false);
    }
  };

  const openCreateModal = () => {
    setShowCreateModal(true);
  };

  const closeCreateModal = () => {
    setShowCreateModal(false);
    setSelectedCustomerId(null);
    setCustomerSearchQuery('');
    setError('');
  };

  const handleCopyLink = async (orderId: string) => {
    const ok = await copyOrderLink(orderId);
    if (ok) {
      setCopiedOrderId(orderId);
      setTimeout(() => setCopiedOrderId(null), 2000);
    }
  };

  const handleMarkOrderDone = async (orderId: string) => {
    setUpdatingOrderId(orderId);
    setError('');
    try {
      const updatedOrder = await orderAPI.markOrderDone(orderId);
      setOrders((prev) => prev.map((o) => (o.id === orderId ? updatedOrder : o)));
      setViewingOrder((prev) => (prev?.id === orderId ? updatedOrder : prev));
    } catch (err: unknown) {
      setError(resolveApiErr(err, 'orderMarkDone'));
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const handleUpdateDiscount = async () => {
    if (!discountOrder || !discountValue) return;

    const productsTotal = discountOrder.products.reduce((sum, product) => 
      sum + (product.pricePerUnit * product.quantity), 0
    );
    const inputValue = parseFloat(discountValue);
    
    if (isNaN(inputValue) || inputValue < 0) {
      setError('אנא הזן ערך תקין');
      return;
    }

    // Calculate discount amount (values are already capped in onChange)
    let discountNum = discountMode === 'percentage'
      ? (inputValue / 100) * productsTotal
      : inputValue;

    // Round to 2 decimal places before sending to backend
    discountNum = Math.round(discountNum * 100) / 100;

    setIsUpdatingDiscount(true);
    setError('');
    try {
      const updatedOrder = await orderAPI.updateOrderDiscount(discountOrder.id, discountNum);
      setOrders((prev) => prev.map((o) => (o.id === updatedOrder.id ? updatedOrder : o)));
      setViewingOrder((prev) => (prev?.id === updatedOrder.id ? updatedOrder : prev));
      setDiscountOrder(null);
      setDiscountValue('');
      setDiscountMode('number');
    } catch (err: unknown) {
      const errorMessage = resolveApiErr(err, 'orderDiscount');
      setError(translateDiscountErrorMessage(errorMessage));
    } finally {
      setIsUpdatingDiscount(false);
    }
  };

  const handleCancelOrder = async (orderId: string) => {
    setCancellingOrderId(orderId);
    setError('');
    try {
      const cancelledOrder = await orderAPI.markOrderCancelled(orderId);
      setOrders((prev) => prev.map((o) => (o.id === orderId ? cancelledOrder : o)));
      setViewingOrder((prev) => (prev?.id === orderId ? cancelledOrder : prev));
    } catch (err: unknown) {
      setError(resolveApiErr(err, 'orderCancel'));
    } finally {
      setCancellingOrderId(null);
      setOrderIdPendingCancel(null);
      setShowCancelConfirm(false);
    }
  };

  const handleViewOrder = (order: Order) => {
    setViewingOrder(order);
  };

  const closeViewModal = () => setViewingOrder(null);

  const toggleSortDirection = () => {
    setSortDirection(prev => prev === 'ASC' ? 'DESC' : 'ASC');
    setCurrentPage(0);
  };

  // Filter customers in modal based on search query
  const filteredCustomers = customers.filter((customer) => {
    if (!customerSearchQuery.trim()) return true;
    
    const query = customerSearchQuery.toLowerCase();
    const name = customer.name.toLowerCase();
    const phone = customer.phoneNumber.toLowerCase();
    const email = customer.email.toLowerCase();
    
    return (
      name.includes(query) ||
      phone.includes(query) ||
      email.includes(query)
    );
  });

  if (isLoading) {
  return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
    </div>
  );
}

  return (
    <div className="max-w-7xl mx-auto pb-32" dir="rtl">
      {/* Header */}
      <div className="glass-card rounded-3xl p-6 md:p-8 mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-800 leading-tight">הזמנות</h1>
            <p className="text-gray-600 text-sm mt-2">
              נהל את ההזמנות שלך ושתף קישורים עם לקוחות
            </p>
          </div>
          <button
            onClick={openCreateModal}
            className="mt-2 md:mt-0 btn-add-indigo"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span>צור הזמנה חדשה</span>
          </button>
        </div>
      </div>

      {/* Filters and Sorting */}
      <div className="glass-card rounded-2xl p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
          {/* Right side: Filters */}
          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto md:ml-auto">
            {/* Agent Filter */}
            <div className="w-[180px]">
              <label className="block text-xs font-medium text-gray-600 mb-1">סוכן:</label>
              <select
                value={agentFilter}
                onChange={(e) => {
                  setAgentFilter(e.target.value);
                  setCurrentPage(0);
                }}
                className="glass-select w-full pl-3 pr-8 py-2 rounded-xl text-sm font-semibold text-gray-800 cursor-pointer"
                dir="ltr"
              >
                <option value="">הכל</option>
                <option value="manager">אני</option>
                {agents.map((agent) => (
                  <option key={agent.id} value={agent.id}>
                    {agent.firstName} {agent.lastName}
                  </option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div className="w-[140px]">
              <label className="block text-xs font-medium text-gray-600 mb-1">סטטוס:</label>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setCurrentPage(0);
                }}
                className="glass-select w-full pl-3 pr-8 py-2 rounded-xl text-sm font-semibold text-gray-800 cursor-pointer"
                dir="ltr"
              >
                <option value="">הכל</option>
                <option value="EMPTY">ריק</option>
                <option value="PLACED">הוזמן</option>
                <option value="DONE">הושלם</option>
                <option value="EXPIRED">פג תוקף</option>
                <option value="CANCELLED">בוטל</option>
              </select>
            </div>

            {/* Sort By */}
            <div className="w-[140px]">
              <label className="block text-xs font-medium text-gray-600 mb-1">מיין לפי:</label>
              <select
                value={sortBy}
                onChange={(e) => {
                  setSortBy(e.target.value);
                  setCurrentPage(0);
                }}
                className="glass-select w-full pl-3 pr-8 py-2 rounded-xl text-sm font-semibold text-gray-800 cursor-pointer"
                dir="ltr"
              >
                <option value="createdAt">תאריך יצירה</option>
                <option value="totalPrice">מחיר כולל</option>
              </select>
            </div>

            {/* Sort Direction Toggle */}
            <div className="w-[100px]">
              <label className="block text-xs font-medium text-gray-600 mb-1">&nbsp;</label>
              <button
                onClick={toggleSortDirection}
                className="glass-button w-full px-3 py-2 rounded-xl text-sm font-semibold text-gray-800 hover:shadow-md transition-all flex items-center justify-between"
              >
                <span>{sortDirection === 'ASC' ? 'א ← ת' : 'א → ת'}</span>
                {sortDirection === 'ASC' ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                  </svg>
                )}
              </button>
            </div>

            {/* Page Size */}
            <div className="w-[90px]">
              <label className="block text-xs font-medium text-gray-600 mb-1">הצג:</label>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(0);
                }}
                className="glass-select w-full pl-3 pr-8 py-2 rounded-xl text-sm font-semibold text-gray-800 cursor-pointer"
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
        </div>
      </div>

      {/* Orders List */}
      {!orders || orders.length === 0 ? (
        <div className="glass-card rounded-2xl p-12 text-center">
          <svg
            className="w-16 h-16 text-gray-400 mx-auto mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <h2 className="text-xl font-semibold text-gray-700 mb-2">אין הזמנות עדיין</h2>
          <p className="text-gray-600 mb-6">צור את ההזמנה הראשונה שלך כדי להתחיל</p>
          <button
            onClick={openCreateModal}
            className="glass-button px-6 py-3 rounded-xl font-semibold text-indigo-600 hover:shadow-md transition-all"
          >
            צור הזמנה
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 justify-items-center">
          {orders && orders.map((order) => {
            const linkedCustomer = order.customerId
              ? customers.find((customer) => customer.id === order.customerId)
              : null;
            // Show customer details if: (status is not EMPTY and has customerName) OR (status is EMPTY and is linked to customer)
            const showOrderCustomerDetails = (order.status !== 'EMPTY' && !!order.customerName) || (order.status === 'EMPTY' && !!linkedCustomer);
            // For EMPTY orders linked to customer, use linkedCustomer data; otherwise use order data
            const displayCustomerName = order.status === 'EMPTY' && linkedCustomer ? linkedCustomer.name : order.customerName;
            const displayCustomerPhone = order.status === 'EMPTY' && linkedCustomer ? linkedCustomer.phoneNumber : order.customerPhone;

            const cardStyles = getCardStyles(order.status);
            const labelStyles = getLabelStyles(order.status);
            const orderAgent = order.agentId ? agents.find(agent => agent.id === order.agentId) : null;
            // "אני" only for manager's own orders (orderSource === 'MANAGER' and no agent)
            const isManagerOrder = order.orderSource === 'MANAGER' && order.agentId == null;
            const isPublicOrder = order.orderSource === 'PUBLIC';
            const agentLabel = isManagerOrder ? 'אני' : (orderAgent ? `${orderAgent.firstName} ${orderAgent.lastName}` : null);

            return (
            <div key={order.id} className="flex flex-col w-full sm:max-w-[260px] items-center group">
              {/* Agent/Manager/Public Label - Outside and attached at top */}
              {(agentLabel || isPublicOrder) && (
                <div className={`w-[80%] px-3 py-1.5 ${labelStyles.bg} border-l-2 border-r-2 border-t-2 ${labelStyles.border} ${labelStyles.borderHover} rounded-t-xl backdrop-blur-sm transition-all duration-300 -mb-[2px]`}>
                  <p className={`text-xs font-semibold ${labelStyles.text} text-center truncate`}>
                    {isPublicOrder ? '- אונליין -' : agentLabel}
                  </p>
                </div>
              )}
              
              {/* Card */}
              <div
                onClick={() => handleViewOrder(order)}
                className={`${cardStyles.container} backdrop-blur-sm rounded-2xl p-4 transition-all duration-300 cursor-pointer flex flex-col relative w-full overflow-hidden h-[280px]`}
              >
                {/* Status Accent Bar - with rounded top to match card */}
                <div className={`absolute top-0 left-0 right-0 h-1.5 ${cardStyles.accent} rounded-t-2xl`}></div>
                
                {/* Order Header - Status & ID */}
                <div className="flex items-center justify-between mb-2 mt-0.5">
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${getStatusColor(order.status)} shadow-sm`}>
                  {getStatusLabel(order.status)}
                </span>
                <p className="text-xs font-mono text-gray-600 font-medium">#{order.id}</p>
              </div>

              {/* Customer Info - Fixed height */}
              <div className="mb-1 min-h-[3.5rem] flex flex-col gap-1 overflow-hidden items-center justify-center">
                {showOrderCustomerDetails ? (
                  <div className="w-full space-y-1.5 text-center">
                    <p className="text-base font-bold text-gray-800 truncate">{displayCustomerName}</p>
                    {displayCustomerPhone && (
                      <a
                        href={`tel:${displayCustomerPhone}`}
                        onClick={(e) => {
                          // On desktop, prevent default tel: behavior and copy instead
                          if (window.innerWidth >= 768 || !('ontouchstart' in window)) {
                            e.preventDefault();
                            e.stopPropagation();
                            const phoneNumber = displayCustomerPhone || '';
                            navigator.clipboard.writeText(phoneNumber).then(() => {
                              setCopiedPhoneNumber(phoneNumber);
                              setTimeout(() => {
                                setCopiedPhoneNumber(null);
                              }, 1500);
                            }).catch(() => {
                              // Fallback if clipboard API fails
                              const textArea = document.createElement('textarea');
                              textArea.value = phoneNumber;
                              textArea.style.position = 'fixed';
                              textArea.style.opacity = '0';
                              document.body.appendChild(textArea);
                              textArea.select();
                              document.execCommand('copy');
                              document.body.removeChild(textArea);
                              setCopiedPhoneNumber(phoneNumber);
                              setTimeout(() => {
                                setCopiedPhoneNumber(null);
                              }, 1500);
                            });
                          }
                        }}
                        className={`text-sm font-semibold truncate flex items-center justify-center gap-1.5 transition-all duration-300 relative ${
                          copiedPhoneNumber === displayCustomerPhone
                            ? 'text-green-600'
                            : 'text-indigo-600 hover:text-indigo-700'
                        }`}
                      >
                        <span className={`transition-opacity duration-300 ${
                          copiedPhoneNumber === displayCustomerPhone ? 'opacity-100' : 'opacity-0 absolute'
                        }`}>
                          <svg className="w-4 h-4 inline-block mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          הועתק!
                        </span>
                        <span className={`transition-opacity duration-300 flex items-center gap-1.5 ${
                          copiedPhoneNumber === displayCustomerPhone ? 'opacity-0 absolute' : 'opacity-100'
                        }`}>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                        {displayCustomerPhone}
                        </span>
                      </a>
                    )}
                  </div>
                ) : order.status === 'EMPTY' ? (
                  <div className="w-full flex items-center justify-center h-full">
                    <div className="text-center space-y-1">
                      <p className="text-sm font-medium text-gray-600">אין פרטי לקוח עדיין</p>
                      <p className="text-xs text-gray-600">ממתין לפרטי ההזמנה</p>
                    </div>
                  </div>
                ) : (
                  !linkedCustomer && <p className="text-sm text-gray-600 italic font-medium text-center">אין פרטי לקוח</p>
                )}

              </div>

              {/* Total Price - Prominent */}
              <div className="mt-1 pb-2 border-t border-gray-200/50 border-b border-gray-200/30 pt-1.5">
                <div className="flex flex-col gap-1">
                  {(() => {
                    const productsTotal = order.products.reduce((sum, product) =>
                      sum + (product.pricePerUnit * product.quantity), 0
                    );
                    const discountPercentage = productsTotal > 0
                      ? ((order.discount / productsTotal) * 100).toFixed(1)
                      : '0.0';
                    const totalCreditedAmount = order.totalCreditedAmount ?? 0;

                    return (
                      <>
                        <div className="flex items-center justify-between gap-2 text-xs text-gray-600">
                          <span>הנחה:</span>
                          <span className="text-red-600 font-semibold">
                            {order.discount > 0
                              ? `${order.discount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}-₪ (${discountPercentage}%)`
                              : '-'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-2 text-xs text-gray-600">
                          <span>זיכוי:</span>
                          <span className="text-amber-700 font-semibold">
                            {totalCreditedAmount > 0
                              ? `${totalCreditedAmount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}-₪`
                              : '-'}
                          </span>
                        </div>
                      </>
                    );
                  })()}
                  <div className="flex items-baseline justify-between gap-2 min-w-0">
                    <span className="hidden sm:block text-xs font-medium text-gray-600 uppercase tracking-wide flex-shrink-0">סה״כ</span>
                    <span dir="ltr" className="text-base sm:text-lg md:text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent truncate min-w-0 w-full sm:w-auto text-center sm:text-right inline-block">
                      {formatPrice(order.totalPrice)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Date & Floating Actions */}
              <div className="mt-auto pt-2.5 pb-1 flex flex-col items-center justify-start gap-2 min-h-[36px]">
                {getOrderCardDate(order) ? (
                  <p className="text-xs text-gray-500 font-medium text-center">
                    <span className="truncate">
                      <span>{getOrderCardDate(order)!.label}</span>
                      <span>{formatOrderDateShortWithTime(getOrderCardDate(order)!.date)}</span>
                    </span>
                  </p>
                ) : null}
                <div className="flex items-center justify-center flex-shrink-0">
                {order.status === 'EMPTY' ? (
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const url = `https://wa.me/?text=${encodeURIComponent(getOrderStoreLink(order.id))}`;
                        window.open(url, '_blank');
                      }}
                      className="w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all shadow-sm flex-shrink-0 bg-[#25D366]/10 text-[#25D366] border-[#25D366] hover:shadow-md"
                      title="שלח קישור בוואטסאפ"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                      </svg>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCopyLink(order.id);
                      }}
                      className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all shadow-sm flex-shrink-0 relative ${
                        copiedOrderId === order.id
                          ? 'bg-indigo-200 text-indigo-700 border-indigo-700'
                          : 'bg-indigo-50 text-indigo-600 border-indigo-500 hover:shadow-md'
                      }`}
                      title={copiedOrderId === order.id ? 'קישור הועתק' : 'העתק קישור הזמנה'}
                    >
                      <span
                        className={`absolute inset-0 flex items-center justify-center transition-all duration-200 transform ${
                          copiedOrderId === order.id ? 'opacity-0 scale-75' : 'opacity-100 scale-100'
                        }`}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      </span>
                      <span
                        className={`absolute inset-0 flex items-center justify-center transition-all duration-200 transform ${
                          copiedOrderId === order.id ? 'opacity-100 scale-100' : 'opacity-0 scale-75'
                        }`}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </span>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        window.open(getOrderStoreLink(order.id), '_blank');
                      }}
                      className="w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all shadow-sm flex-shrink-0 bg-indigo-50 text-indigo-600 border-indigo-500 hover:shadow-md"
                      title="פתח הזמנה בטאב חדש"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </button>
                  </div>
                ) : order.status === 'PLACED' ? (
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/store/edit/${order.id}`);
                      }}
                      className="w-7 h-7 sm:w-8 sm:h-8 rounded-full border-2 flex items-center justify-center transition-all shadow-sm flex-shrink-0 bg-blue-100 text-blue-700 border-blue-700 hover:shadow-lg"
                      title="ערוך הזמנה"
                    >
                      <svg className="w-4 h-4 sm:w-5 sm:h-5 text-blue-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMarkOrderDone(order.id);
                      }}
                      disabled={updatingOrderId === order.id}
                      className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full border-2 flex items-center justify-center transition-all shadow-sm flex-shrink-0 ${
                        updatingOrderId === order.id
                          ? 'bg-gray-100 text-gray-400 border-gray-300 cursor-not-allowed'
                          : 'bg-green-100 text-green-700 border-green-700 hover:shadow-lg'
                      }`}
                      title="סמן כהושלם"
                    >
                      {updatingOrderId === order.id ? (
                        <svg className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V2C6.477 2 2 6.477 2 12h2zm2 5.291A7.962 7.962 0 014 12H2c0 3.042 1.135 5.824 3 7.938l1-2.647z" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4 sm:w-5 sm:h-5 text-green-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                      )}
                    </button>
                  </div>
                ) : order.status === 'DONE' ? (
                  orderInvoiceUrls.has(order.id) ? (
                    // Invoice exists - show eye icon + file icon
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const invoiceUrl = orderInvoiceUrls.get(order.id);
                        if (invoiceUrl) {
                          window.open(invoiceUrl, '_blank');
                        }
                      }}
                    className="h-8 flex items-center justify-center gap-1 sm:gap-1.5 px-1.5 sm:px-2 rounded-full border-2 transition-all shadow-sm flex-shrink-0 bg-green-50 text-green-600 border-green-500 hover:bg-green-100 hover:shadow-lg whitespace-nowrap"
                      title="זיכוי"
                    >
                      <span className="text-[11px] sm:text-xs font-semibold leading-none text-green-700">זיכוי</span>
                      <svg className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </button>
                  ) : (
                    // No invoice - show text "צור" + file icon
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setInvoiceOrder(order);
                      }}
                    className="h-8 flex items-center justify-center gap-1 sm:gap-1.5 px-1.5 sm:px-2 rounded-full border-2 transition-all shadow-sm flex-shrink-0 bg-green-100 text-green-700 border-green-600 hover:bg-green-200 hover:shadow-lg whitespace-nowrap"
                      title="צור חשבונית מס קבלה"
                      disabled={loadingInvoiceUrls.has(order.id)}
                    >
                      {loadingInvoiceUrls.has(order.id) ? (
                        <svg className="w-4 h-4 sm:w-5 sm:h-5 animate-spin text-green-700" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V2C6.477 2 2 6.477 2 12h2zm2 5.291A7.962 7.962 0 014 12H2c0 3.042 1.135 5.824 3 7.938l1-2.647z" />
                        </svg>
                      ) : (
                        <>
                          <span className="text-[11px] sm:text-xs font-semibold leading-none text-green-700">צור חשבונית מס קבלה</span>
                          <svg className="w-4 h-4 sm:w-5 sm:h-5 text-green-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </>
                      )}
                    </button>
                  )
                ) : null}
                </div>
              </div>
            </div>
            </div>
            );
          })}
        </div>
      )}

      {/* Pagination Controls - Bottom */}
      <PaginationBar
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
        maxWidth="max-w-7xl"
        showCondition={orders && orders.length > 0 && totalPages > 0}
        rtl={true}
      />

      {/* Create Order Modal */}
      {showCreateModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          {...createModalBackdropProps}
        >
          <div 
            className="glass-card rounded-3xl p-6 md:p-8 w-full max-w-lg bg-white/85" 
            dir="rtl"
            {...createModalContentProps}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-800">צור הזמנה חדשה</h2>
              <button
                onClick={closeCreateModal}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              >
                <svg
                  className="w-6 h-6 text-gray-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <div className="glass-card bg-blue-50/50 border-blue-200 rounded-xl p-3 mb-4 text-blue-700 text-sm">
              <div className="flex items-start gap-2">
                <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>קישור להזמנה יהיה תקף למשך שבוע אחד ויפקע לאחר מכן</span>
              </div>
            </div>

            {error && (
              <div className="glass-card bg-red-50/50 border-red-200 rounded-xl p-3 mb-4 text-red-600 text-sm">
                {error}
              </div>
            )}

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                בחירת לקוח
              </label>

              {/* Standalone Order Option */}
              <button
                onClick={() => setSelectedCustomerId(null)}
                className={`w-full text-right px-4 py-2.5 rounded-xl transition-all mb-3 flex items-center gap-3 ${
                  selectedCustomerId === null
                    ? 'glass-button shadow-md border-2 border-indigo-500 bg-indigo-50/30'
                    : 'glass-input hover:shadow-sm'
                }`}
              >
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                  selectedCustomerId === null ? 'border-indigo-600 bg-indigo-600' : 'border-gray-300'
                }`}>
                  {selectedCustomerId === null && (
                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
                <div className="flex-1">
                  <div className="font-medium text-gray-800 text-sm">ללא לקוח</div>
                  <div className="text-xs text-gray-600">הלקוח יספק את הפרטים שלו דרך הקישור</div>
                </div>
              </button>

              {/* Link to Customer Section */}
              {customers.length > 0 && (
                <>
                  <div className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">או קשר ללקוח קיים</div>
                  
                  {/* Customer Search */}
                  <div className="relative mb-2">
                    <svg
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                      />
                    </svg>
                    <input
                      type="text"
                      placeholder="חפש לקוחות..."
                      value={customerSearchQuery}
                      onChange={(e) => setCustomerSearchQuery(e.target.value)}
                      className="glass-input w-full pr-10 pl-10 py-2 rounded-xl text-sm text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      dir="rtl"
                    />
                    {customerSearchQuery && (
                      <button
                        onClick={() => setCustomerSearchQuery('')}
                        className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>

                  {/* Customer List */}
                  <div className="space-y-1.5 max-h-52 overflow-y-auto">
                    {filteredCustomers.length === 0 && customerSearchQuery ? (
                      <div className="text-center py-6 text-gray-500">
                        <svg className="w-10 h-10 mx-auto mb-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <p className="text-xs">לא נמצאו לקוחות</p>
                        <button
                          onClick={() => setCustomerSearchQuery('')}
                          className="text-xs text-indigo-600 hover:text-indigo-700 mt-1"
                        >
                          נקה חיפוש
                        </button>
                      </div>
                    ) : (
                      filteredCustomers.map((customer) => (
                        <button
                          key={customer.id}
                          onClick={() => setSelectedCustomerId(customer.id)}
                          className={`w-full text-right px-3 py-2 rounded-lg transition-all flex items-center gap-2.5 ${
                            selectedCustomerId === customer.id
                              ? 'glass-button shadow-md border-2 border-indigo-500 bg-indigo-50/30'
                              : 'glass-input hover:shadow-sm'
                          }`}
                        >
                          <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                            selectedCustomerId === customer.id ? 'border-indigo-600 bg-indigo-600' : 'border-gray-300'
                          }`}>
                            {selectedCustomerId === customer.id && (
                              <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-gray-800 text-sm truncate">{customer.name}</div>
                            <div className="text-xs text-gray-600">{customer.phoneNumber}</div>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </>
              )}
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={closeCreateModal}
                disabled={isCreating}
                className="btn-cancel"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                <span>ביטול</span>
              </button>
              <button
                type="button"
                onClick={handleCreateOrder}
                disabled={isCreating}
                className="btn-save"
              >
                {isCreating ? (
                  <>
                    <Spinner size="sm" />
                    <span>יוצר...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>צור הזמנה</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Order Modal - same form and actions everywhere */}
      {viewingOrder && (
        <OrderViewModal
          order={viewingOrder}
          onClose={closeViewModal}
          invoiceDocuments={
            viewingOrder.status === 'DONE'
              ? {
                  loading: loadingOrderInvoicesForModal,
                  items: orderInvoicesByOrderId.get(viewingOrder.id) ?? [],
                }
              : null
          }
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
            onMarkDone: () => handleMarkOrderDone(viewingOrder.id),
            onClose: closeViewModal,
            cancellingOrderId,
            updatingOrderId,
            showCreateCreditNote:
              viewingOrder.status === 'DONE' &&
              (loadingInvoiceUrls.has(viewingOrder.id) ||
                orderInvoicePrimaryMeta.has(viewingOrder.id)),
            createCreditNoteDisabled:
              loadingInvoiceUrls.has(viewingOrder.id) ||
              !orderInvoicePrimaryMeta.has(viewingOrder.id),
            onCreateCreditNote: () => setCreditNoteOrder(viewingOrder),
          }}
        />
      )}

      {showCancelConfirm && orderIdPendingCancel && (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          {...cancelConfirmBackdropProps}
        >
          <div
            className="glass-card rounded-3xl p-6 md:p-8 w-full max-w-md bg-white/90 shadow-xl border border-red-100"
            {...cancelConfirmContentProps}
            dir="rtl"
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">בטל הזמנה?</h2>
              </div>
              <button
                onClick={() => !cancellingOrderId && setShowCancelConfirm(false)}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              >
                <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <p className="text-sm text-gray-600 mb-6 leading-relaxed font-medium">
              ביטול יסיר את ההזמנה מהתור הפעיל. אתה תמיד יכול ליצור הזמנה חדשה מאוחר יותר אם תשנה את דעתך.
            </p>

            <div className="border-t border-gray-200/70 -mx-6 md:-mx-8 mb-4"></div>

            <div className="flex justify-start gap-3">
              <button
                onClick={() => !cancellingOrderId && setShowCancelConfirm(false)}
                className="glass-button px-4 py-2 rounded-xl text-sm font-semibold text-gray-700 hover:shadow-md transition-all"
              >
                שמור הזמנה
              </button>
              <button
                onClick={() => handleCancelOrder(orderIdPendingCancel)}
                disabled={!!cancellingOrderId}
                className={`glass-button px-4 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 border ${
                  cancellingOrderId
                    ? 'text-gray-400 border-gray-300 cursor-not-allowed'
                    : 'text-red-600 border-red-600 bg-red-50 hover:shadow-lg'
                }`}
              >
                {cancellingOrderId ? 'מבטל...' : 'בטל הזמנה'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Discount Modal */}
      {discountOrder && (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          {...discountModalBackdropProps}
        >
          <div
            className="glass-card rounded-3xl p-6 md:p-8 w-full max-w-md bg-white/90 shadow-xl border border-purple-100"
            {...discountModalContentProps}
            dir="rtl"
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">הוסף הנחה</h2>
                <p className="text-sm text-gray-600 mt-1">הזמנה #{discountOrder.id.slice(0, 8)}</p>
              </div>
              <button
                onClick={() => {
                  if (!isUpdatingDiscount) {
                    setDiscountOrder(null);
                    setDiscountValue('');
                    setDiscountMode('number');
                  }
                }}
                disabled={isUpdatingDiscount}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors disabled:opacity-50"
              >
                <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              {/* Order Total Display */}
              {(() => {
                const productsTotal = discountOrder.products.reduce((sum, product) => 
                  sum + (product.pricePerUnit * product.quantity), 0
                );
                return (
                  <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-indigo-700">סכום הזמנה:</span>
                      <span className="text-lg font-bold text-indigo-900">{formatPrice(productsTotal)}</span>
                    </div>
                  </div>
                );
              })()}

              {/* Discount Mode Toggle */}
              <div className="flex items-center justify-center gap-3 p-2 bg-gray-50 rounded-xl border border-gray-200">
                <button
                  type="button"
                  onClick={() => {
                    setDiscountMode('number');
                    setDiscountValue('');
                    setError('');
                  }}
                  className={`flex-1 px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
                    discountMode === 'number'
                      ? 'bg-purple-600 text-white shadow-md'
                      : 'bg-white text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  סכום (₪)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDiscountMode('percentage');
                    setDiscountValue('');
                    setError('');
                  }}
                  className={`flex-1 px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
                    discountMode === 'percentage'
                      ? 'bg-purple-600 text-white shadow-md'
                      : 'bg-white text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  אחוז (%)
                </button>
              </div>

              <div>
                <label htmlFor="discount-input" className="block text-sm font-medium text-gray-700 mb-2">
                  {discountMode === 'number' ? 'סכום הנחה (₪)' : 'אחוז הנחה (%)'}
                </label>
                <div className="relative">
                  <input
                    id="discount-input"
                    type="number"
                    step={discountMode === 'number' ? '0.01' : '0.1'}
                    min="0"
                    value={discountValue}
                    onChange={(e) => {
                      const value = e.target.value;
                      const productsTotal = discountOrder.products.reduce((sum, product) => 
                        sum + (product.pricePerUnit * product.quantity), 0
                      );
                      
                      if (discountMode === 'number') {
                        // Number mode: Allow empty, numbers, and one decimal point
                        if (value === '' || /^\d*\.?\d{0,2}$/.test(value)) {
                          const num = parseFloat(value);
                          if (value === '' || isNaN(num)) {
                            setDiscountValue(value);
                          } else if (num > productsTotal) {
                            // Cap at maximum order total
                            setDiscountValue(productsTotal.toFixed(2));
                          } else if (num < 0) {
                            setDiscountValue('0');
                          } else {
                            setDiscountValue(value);
                          }
                          setError('');
                        }
                      } else {
                        // Percentage mode: Allow 0-100 with up to 2 decimal places
                        if (value === '' || /^\d*\.?\d{0,2}$/.test(value)) {
                          const num = parseFloat(value);
                          if (value === '' || isNaN(num)) {
                            setDiscountValue(value);
                          } else if (num > 100) {
                            // Cap at 100%
                            setDiscountValue('100');
                          } else if (num < 0) {
                            setDiscountValue('0');
                          } else {
                            setDiscountValue(value);
                          }
                          setError('');
                        }
                      }
                    }}
                    onBlur={(e) => {
                      const num = parseFloat(e.target.value);
                      if (!isNaN(num)) {
                        setDiscountValue(num.toFixed(2).replace(/\.?0+$/, ''));
                      }
                    }}
                    placeholder={discountMode === 'number' ? '0.00' : '0.0'}
                    disabled={isUpdatingDiscount}
                    className="w-full px-4 py-2 pl-12 pr-12 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 disabled:bg-gray-100 disabled:cursor-not-allowed text-center [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield]"
                    dir="ltr"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium pointer-events-none">
                    {discountMode === 'number' ? '₪' : '%'}
                  </span>
                </div>
                {(() => {
                  const productsTotal = discountOrder.products.reduce((sum, product) => 
                    sum + (product.pricePerUnit * product.quantity), 0
                  );
                  return (
                    <>
                      {discountMode === 'number' ? (
                        <p className="text-xs text-gray-500 mt-1">עד 2 ספרות אחרי הנקודה, מקסימום {formatPrice(productsTotal)}</p>
                      ) : (
                        <p className="text-xs text-gray-500 mt-1">עד 2 ספרות אחרי הנקודה, מקסימום 100%</p>
                      )}
                      {/* Show calculated discount amount when in percentage mode */}
                      {discountMode === 'percentage' && discountValue && !isNaN(parseFloat(discountValue)) && (
                        <div className="mt-2 p-2 bg-purple-50 border border-purple-200 rounded-lg">
                          <p className="text-xs text-purple-700">
                            סכום הנחה: <span className="font-bold">{formatPrice((parseFloat(discountValue) / 100) * productsTotal)}</span>
                          </p>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              <div className="flex justify-start gap-3">
                <button
                  onClick={() => {
                    if (!isUpdatingDiscount) {
                      setDiscountOrder(null);
                      setDiscountValue('');
                      setDiscountMode('number');
                    }
                  }}
                  disabled={isUpdatingDiscount}
                  className="glass-button px-4 py-2 rounded-xl text-sm font-semibold text-gray-700 hover:shadow-md transition-all disabled:opacity-50"
                >
                  ביטול
                </button>
                <button
                  onClick={handleUpdateDiscount}
                  disabled={isUpdatingDiscount || !discountValue || parseFloat(discountValue) < 0 || (discountMode === 'percentage' && parseFloat(discountValue) > 100)}
                  className={`glass-button px-4 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 border ${
                    isUpdatingDiscount || !discountValue || parseFloat(discountValue) < 0 || (discountMode === 'percentage' && parseFloat(discountValue) > 100)
                      ? 'text-gray-400 border-gray-300 cursor-not-allowed'
                      : 'text-purple-600 border-purple-600 bg-purple-50 hover:shadow-lg'
                  }`}
                >
                  {isUpdatingDiscount ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V2C6.477 2 2 6.477 2 12h2zm2 5.291A7.962 7.962 0 014 12H2c0 3.042 1.135 5.824 3 7.938l1-2.647z" />
                      </svg>
                      <span>שומר...</span>
                    </>
                  ) : (
                    'שמור'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Invoice Creation Modal */}
      {invoiceOrder && (
        <InvoiceCreationModal
          order={invoiceOrder}
          isOpen={!!invoiceOrder}
          onClose={() => setInvoiceOrder(null)}
          onSuccess={async (response) => {
            if (invoiceOrder) {
              setOrderInvoiceUrls(prev => new Map(prev).set(invoiceOrder.id, response.pdfUrl));
              setOrderInvoicePrimaryMeta((prev) =>
                new Map(prev).set(invoiceOrder.id, {
                  invoiceId: response.invoiceId,
                  allocationNumber: response.primaryInvoiceAllocationNumber ?? null,
                }),
              );
              setCheckedOrders(prev => new Set(prev).add(invoiceOrder.id));
              try {
                const invMap = await invoiceAPI.getInvoicesByOrderIds([invoiceOrder.id]);
                const list = invMap[invoiceOrder.id] ?? [];
                setOrderInvoicesByOrderId((prev) => new Map(prev).set(invoiceOrder.id, list));
              } catch (e) {
                console.error('Failed to refresh invoice list after create:', e);
              }
            }
            setInvoiceOrder(null);
          }}
        />
      )}

      {creditNoteOrder && orderInvoicePrimaryMeta.has(creditNoteOrder.id) && (
        <CreditNoteModal
          order={creditNoteOrder}
          invoiceId={orderInvoicePrimaryMeta.get(creditNoteOrder.id)!.invoiceId}
          primaryAllocationNumber={
            orderInvoicePrimaryMeta.get(creditNoteOrder.id)!.allocationNumber
          }
          isOpen={!!creditNoteOrder}
          onClose={() => setCreditNoteOrder(null)}
          onSuccess={async () => {
            const orderId = creditNoteOrder.id;
            try {
              const [invMap, freshOrder] = await Promise.all([
                invoiceAPI.getInvoicesByOrderIds([orderId]),
                orderAPI.getOrderById(orderId),
              ]);
              const list = invMap[orderId] ?? [];
              const url = primaryInvoicePdfUrl(list);
              const meta = primaryTaxInvoiceMeta(list);
              setOrderInvoiceUrls((prev) => {
                const next = new Map(prev);
                if (url) next.set(orderId, url);
                return next;
              });
              setOrderInvoicePrimaryMeta((prev) => {
                const next = new Map(prev);
                if (meta) next.set(orderId, meta);
                return next;
              });
              setOrderInvoicesByOrderId((prev) => new Map(prev).set(orderId, list));
              setOrders((prev) => prev.map((o) => (o.id === orderId ? freshOrder : o)));
              setViewingOrder((prev) => (prev?.id === orderId ? freshOrder : prev));
            } catch (e) {
              console.error('Failed to refresh order after credit note:', e);
            }
          }}
        />
      )}
    </div>
  );
}
