import { useState, useEffect } from 'react';
import Spinner from '../components/Spinner';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { agentAPI, type Order, type Customer } from '../services/api';
import PaginationBar from '../components/PaginationBar';
import { formatPrice } from '../utils/formatPrice';

export default function AgentOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [viewingOrder, setViewingOrder] = useState<Order | null>(null);
  const [copiedOrderId, setCopiedOrderId] = useState<number | null>(null);
  const [copiedPhoneNumber, setCopiedPhoneNumber] = useState<string | null>(null);
  const [cancellingOrderId, setCancellingOrderId] = useState<string | null>(null);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [orderIdPendingCancel, setOrderIdPendingCancel] = useState<number | null>(null);
  const [discountOrder, setDiscountOrder] = useState<Order | null>(null);
  const [discountValue, setDiscountValue] = useState('');
  const [discountMode, setDiscountMode] = useState<'number' | 'percentage'>('number');
  const [isUpdatingDiscount, setIsUpdatingDiscount] = useState(false);
  const [discountError, setDiscountError] = useState('');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [totalPages, setTotalPages] = useState(0);

  // Sorting state
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortDirection, setSortDirection] = useState<'ASC' | 'DESC'>('DESC');

  // Filter state
  const [statusFilter, setStatusFilter] = useState<string>('');
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    fetchOrders(currentPage);
  }, [currentPage, sortBy, sortDirection, pageSize, statusFilter]);

  const fetchOrders = async (page: number = 0) => {
    setIsLoading(true);
    setError('');
    try {
      const pageResponse = await agentAPI.getAllOrders(
        page,
        pageSize,
        sortBy,
        sortDirection,
        statusFilter || undefined
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
      const data = await agentAPI.getCustomersForAgent();
      setCustomers(data);
    } catch (err: any) {
      console.error('Error fetching customers:', err);
    }
  };

  const fetchCurrentAgent = async () => {
    try {
      await agentAPI.getCurrentAgent();
    } catch (err: any) {
      console.error('Error fetching current agent:', err);
    }
  };

  useEffect(() => {
    fetchCustomers();
    fetchCurrentAgent();
  }, []);

  // Check URL params for orderId after orders are loaded
  useEffect(() => {
    const orderIdFromUrl = searchParams.get('orderId');
    if (orderIdFromUrl && !viewingOrder) {
      const orderIdNum = parseInt(orderIdFromUrl, 10);
      if (isNaN(orderIdNum)) return;
      // First check if order is in current page
      const orderToView = orders.find(o => o.id === orderIdNum);
      if (orderToView) {
        setViewingOrder(orderToView);
        // Clear the URL parameter after opening
        const newSearchParams = new URLSearchParams(searchParams);
        newSearchParams.delete('orderId');
        setSearchParams(newSearchParams, { replace: true });
      } else if (orders.length > 0) {
        // Order not in current page, fetch it by ID
        agentAPI.getOrderById(orderIdNum)
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
      await agentAPI.createOrder({
        customerId: selectedCustomerId || null,
      });
      setShowCreateModal(false);
      setSelectedCustomerId(null);
      setCurrentPage(0); // Reset to first page
      await fetchOrders(0);
    } catch (err: any) {
      const errorMessage = err.response?.data?.userMessage || 'נכשל ביצירת הזמנה';
      // Translate specific error messages to Hebrew
      const translatedMessage = errorMessage === 'Cannot create order. Please add at least one location first.'
        ? 'לא ניתן ליצור הזמנה. יש להוסיף לפחות מיקום אחד תחילה.'
        : errorMessage;
      setError(translatedMessage);
    } finally {
      setIsCreating(false);
    }
  };

  const openCreateModal = async () => {
    await fetchCustomers();
    setShowCreateModal(true);
  };

  const closeCreateModal = () => {
    setShowCreateModal(false);
    setSelectedCustomerId(null);
    setCustomerSearchQuery('');
    setError('');
  };

  const handleCopyLink = async (orderId: number) => {
    try {
      // Get base URL from environment or use current origin
      const baseUrl = import.meta.env.VITE_FRONTEND_URL || window.location.origin;
      const fullLink = `${baseUrl}/store/order/${orderId}`;
      
      await navigator.clipboard.writeText(fullLink);
      setCopiedOrderId(orderId);
      setTimeout(() => setCopiedOrderId(null), 2000); // Clear after 2 seconds
    } catch (err) {
      console.error('Failed to copy:', err);
      // Fallback: try using execCommand
      try {
        const baseUrl = import.meta.env.VITE_FRONTEND_URL || window.location.origin;
        const fullLink = `${baseUrl}/store/order/${orderId}`;
        const textArea = document.createElement('textarea');
        textArea.value = fullLink;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        setCopiedOrderId(orderId);
        setTimeout(() => setCopiedOrderId(null), 2000);
      } catch (fallbackErr) {
        console.error('Fallback copy also failed:', fallbackErr);
      }
    }
  };

  const handleCancelOrder = async (orderId: number) => {
    setCancellingOrderId(orderId);
    setError('');
    try {
      await agentAPI.markOrderCancelled(orderId);
      await fetchOrders(currentPage);
      setViewingOrder((prev) => {
        if (prev && prev.id === orderId) {
          return { ...prev, status: 'CANCELLED' };
        }
        return prev;
      });
    } catch (err: any) {
      setError(err.response?.data?.userMessage || 'נכשל בביטול ההזמנה');
    } finally {
      setCancellingOrderId(null);
      setOrderIdPendingCancel(null);
      setShowCancelConfirm(false);
    }
  };

  const handleUpdateDiscount = async () => {
    if (!discountOrder || !discountValue) return;

    const productsTotal = discountOrder.products.reduce((sum, product) => 
      sum + (product.pricePerUnit * product.quantity), 0
    );
    const inputValue = parseFloat(discountValue);
    
    if (isNaN(inputValue) || inputValue < 0) {
      setDiscountError('אנא הזן ערך תקין');
      return;
    }

    // Calculate discount amount (values are already capped in onChange)
    let discountNum = discountMode === 'percentage'
      ? (inputValue / 100) * productsTotal
      : inputValue;

    // Round to 2 decimal places before sending to backend
    discountNum = Math.round(discountNum * 100) / 100;

    setIsUpdatingDiscount(true);
    setDiscountError('');
    try {
      // Always send the discount as a number to the backend (rounded to 2 decimal places)
      await agentAPI.updateOrderDiscount(discountOrder.id, discountNum);
      await fetchOrders(currentPage);
      setViewingOrder((prev) => {
        if (prev && prev.id === discountOrder.id) {
          return { ...prev, discount: discountNum, totalPrice: prev.totalPrice };
        }
        return prev;
      });
      setDiscountOrder(null);
      setDiscountValue('');
      setDiscountMode('number');
    } catch (err: any) {
      const errorMessage = err.response?.data?.userMessage || 'נכשל בעדכון ההנחה';
      // Translate common backend error messages to Hebrew
      const translatedMessage = errorMessage.includes('can have at most 2 decimal places')
        ? 'הנחה יכולה לכלול עד 2 ספרות אחרי הנקודה'
        : errorMessage.includes('cannot exceed the total price')
        ? 'הנחה לא יכולה לעלות על סכום ההזמנה'
        : errorMessage.includes('must be greater than or equal to 0')
        ? 'הנחה חייבת להיות מספר חיובי'
        : errorMessage;
      setDiscountError(translatedMessage);
    } finally {
      setIsUpdatingDiscount(false);
    }
  };

  const handleViewOrder = async (order: Order) => {
    try {
      const orderDetails = await agentAPI.getOrderById(order.id);
      setViewingOrder(orderDetails);
    } catch (err: any) {
      setError(err.response?.data?.userMessage || 'נכשל בטעינת פרטי ההזמנה');
      console.error('Error fetching order details:', err);
    }
  };

  const closeViewModal = () => {
    setViewingOrder(null);
  };

  const toggleSortDirection = () => {
    setSortDirection(prev => prev === 'ASC' ? 'DESC' : 'ASC');
    setCurrentPage(0);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'EMPTY':
        return 'bg-gray-100 text-gray-700 border-2 border-gray-700';
      case 'PLACED':
        return 'bg-blue-100 text-blue-700 border-2 border-blue-700';
      case 'DONE':
        return 'bg-green-100 text-green-700 border-2 border-green-700';
      case 'EXPIRED':
        return 'bg-orange-100 text-orange-700 border-2 border-orange-700';
      case 'CANCELLED':
        return 'bg-red-100 text-red-700 border-2 border-red-700';
      default:
        return 'bg-gray-100 text-gray-700 border-2 border-gray-700';
    }
  };

  const getCardStyles = (status: string) => {
    switch (status) {
      case 'EMPTY':
        return {
          container: 'bg-gradient-to-br from-gray-50/90 via-gray-100/80 to-gray-50/90 border-2 border-gray-300/60 shadow-md hover:shadow-xl hover:border-gray-400/80',
          accent: 'bg-gray-200/50',
        };
      case 'PLACED':
        return {
          container: 'bg-gradient-to-br from-blue-50/90 via-indigo-50/80 to-blue-50/90 border-2 border-blue-300/60 shadow-md hover:shadow-xl hover:border-blue-400/80 hover:shadow-blue-200/50',
          accent: 'bg-blue-200/50',
        };
      case 'DONE':
        return {
          container: 'bg-gradient-to-br from-green-50/90 via-emerald-50/80 to-green-50/90 border-2 border-green-300/60 shadow-md hover:shadow-xl hover:border-green-400/80 hover:shadow-green-200/50',
          accent: 'bg-green-200/50',
        };
      case 'EXPIRED':
        return {
          container: 'bg-gradient-to-br from-orange-50/90 via-amber-50/80 to-orange-50/90 border-2 border-orange-300/60 shadow-md hover:shadow-xl hover:border-orange-400/80 hover:shadow-orange-200/50',
          accent: 'bg-orange-200/50',
        };
      case 'CANCELLED':
        return {
          container: 'bg-gradient-to-br from-red-50/90 via-rose-50/80 to-red-50/90 border-2 border-red-300/60 shadow-md hover:shadow-xl hover:border-red-400/80 hover:shadow-red-200/50',
          accent: 'bg-red-200/50',
        };
      default:
        return {
          container: 'bg-gradient-to-br from-gray-50/90 via-gray-100/80 to-gray-50/90 border-2 border-gray-300/60 shadow-md hover:shadow-xl hover:border-gray-400/80',
          accent: 'bg-gray-200/50',
        };
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('he-IL', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatDateShort = (dateString: string) => {
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear().toString().slice(-2);
    return `${day}/${month}/${year}`;
  };

  const getOrderCardDate = (order: Order): { label: string; date: string } | null => {
    switch (order.status) {
      case 'EMPTY':
        return { label: 'נוצר ב:\u00A0', date: order.createdAt };
      case 'PLACED':
        return { label: 'הוזמן ב:\u00A0', date: order.placedAt || order.createdAt };
      case 'DONE':
        return { label: 'הושלם ב:\u00A0', date: order.doneAt || order.placedAt || order.createdAt };
      case 'EXPIRED':
        return { label: 'פג תוקף ב:\u00A0', date: order.linkExpiresAt };
      case 'CANCELLED':
        return null; // No date for cancelled
      default:
        return { label: 'נוצר ב:\u00A0', date: order.createdAt };
    }
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
            className="mt-2 md:mt-0 px-6 py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-lg hover:shadow-xl transition-all flex items-center gap-2 border-0"
          >
            <span>צור הזמנה חדשה</span>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>
      </div>

      {/* Filters and Sorting */}
      <div className="glass-card rounded-2xl p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
          {/* Right side: Filters */}
          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto md:ml-auto">
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
                <option value="status">סטטוס</option>
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
            aria-hidden="true"
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
            
            return (
            <div
              key={order.id}
              onClick={() => handleViewOrder(order)}
              className={`${cardStyles.container} backdrop-blur-sm rounded-2xl p-4 transition-all duration-300 cursor-pointer group flex flex-col relative w-full sm:max-w-[260px] overflow-hidden`}
            >
              {/* Status Accent Bar - with rounded top to match card */}
              <div className={`absolute top-0 left-0 right-0 h-1.5 ${cardStyles.accent} rounded-t-2xl`}></div>
              
              {/* Order Header - Status & ID */}
              <div className="flex items-center justify-between mb-3 mt-1">
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${getStatusColor(order.status)} shadow-sm`}>
                  {order.status === 'EMPTY' ? 'ריק' : order.status === 'PLACED' ? 'הוזמן' : order.status === 'DONE' ? 'הושלם' : order.status === 'EXPIRED' ? 'פג תוקף' : order.status === 'CANCELLED' ? 'בוטל' : order.status}
                </span>
                <p className="text-xs font-mono text-gray-600 font-medium">#{order.id}</p>
              </div>

              {/* Customer Info - Fixed height */}
              <div className="mb-2 min-h-[3.5rem] flex flex-col gap-1 overflow-hidden items-center justify-center">
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
              <div className="mt-3 pb-2 border-t border-gray-200/50 border-b border-gray-200/30 pt-3">
                {order.discount > 0 && (() => {
                  const productsTotal = order.products.reduce((sum, product) => 
                    sum + (product.pricePerUnit * product.quantity), 0
                  );
                  const discountPercentage = productsTotal > 0 
                    ? ((order.discount / productsTotal) * 100).toFixed(1)
                    : '0.0';
                  return (
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="text-xs text-gray-500">הנחה</span>
                      <span className="text-sm font-semibold text-red-600">
                        {order.discount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}-₪ ({discountPercentage}%)
                      </span>
                    </div>
                  );
                })()}
                <div className="flex items-baseline justify-between gap-2 min-w-0">
                  <span className="hidden sm:block text-xs font-medium text-gray-600 uppercase tracking-wide flex-shrink-0">סה״כ</span>
                  <span className="text-lg sm:text-xl md:text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent truncate min-w-0 w-full sm:w-auto text-center sm:text-right">
                    {formatPrice(order.totalPrice)}
                  </span>
                </div>
              </div>

              {/* Date & Floating Actions */}
              <div className="mt-auto pt-3 pb-2 flex items-center justify-between min-h-[40px] gap-2">
                {getOrderCardDate(order) ? (
                  <p className="text-xs text-gray-500 font-medium flex items-center min-w-0 flex-1 pt-1 sm:pt-0">
                    <span className="truncate">
                      <span>{getOrderCardDate(order)!.label}</span>
                      <span>{formatDateShort(getOrderCardDate(order)!.date)}</span>
                    </span>
                  </p>
                ) : (
                  <div></div>
                )}
                <div className="flex items-center justify-end flex-shrink-0 pt-1">
                {order.status === 'EMPTY' ? (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCopyLink(order.id);
                    }}
                    className={`w-9 h-9 rounded-full border-2 flex items-center justify-center transition-all shadow-sm flex-shrink-0 relative ${
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
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </span>
                    <span
                      className={`absolute inset-0 flex items-center justify-center transition-all duration-200 transform ${
                        copiedOrderId === order.id ? 'opacity-100 scale-100' : 'opacity-0 scale-75'
                      }`}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </span>
                  </button>
                ) : order.status === 'PLACED' ? (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/store/edit/${order.id}`);
                    }}
                    className="w-8 h-8 sm:w-9 sm:h-9 rounded-full border-2 flex items-center justify-center transition-all shadow-sm flex-shrink-0 bg-blue-100 text-blue-700 border-blue-700 hover:shadow-lg"
                    title="ערוך הזמנה"
                  >
                    <svg className="w-4 h-4 sm:w-5 sm:h-5 text-blue-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                ) : null}
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
          onClick={(e) => {
            // Close on backdrop click
            if (e.target === e.currentTarget) {
              closeCreateModal();
            }
          }}
        >
          <div 
            className="glass-card rounded-3xl p-6 md:p-8 w-full max-w-lg bg-white/85" 
            dir="rtl"
            onClick={(e) => e.stopPropagation()}
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

      {/* View Order Modal */}
      {viewingOrder && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={closeViewModal}
        >
          <div
            className="glass-card rounded-3xl p-6 md:p-8 w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white/85"
            onClick={(e) => e.stopPropagation()}
            dir="rtl"
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-bold text-gray-800">פרטי הזמנה</h2>
                <p className="text-sm text-gray-600">הזמנה #{viewingOrder.id}</p>
              </div>
              <button
                onClick={closeViewModal}
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

            {/* Status */}
            <div className="mb-6">
              <div className="flex items-center gap-3">
                <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getStatusColor(viewingOrder.status)}`}>
                  {viewingOrder.status === 'EMPTY' ? 'ריק' : viewingOrder.status === 'PLACED' ? 'הוזמן' : viewingOrder.status === 'DONE' ? 'הושלם' : viewingOrder.status === 'EXPIRED' ? 'פג תוקף' : viewingOrder.status === 'CANCELLED' ? 'בוטל' : viewingOrder.status}
                </span>
                <span className="text-sm text-gray-600">
                  {viewingOrder.placedAt ? 'הוזמן' : 'נוצר'} {formatDate(viewingOrder.placedAt ?? viewingOrder.createdAt)}
                </span>
              </div>
            </div>

            {/* Customer Information */}
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">פרטי לקוח</h3>
              <div className="glass-card rounded-xl p-4 space-y-2">
                {viewingOrder.customerName ? (
                  <>
                    <div className="flex items-start justify-between gap-3">
                      <span className="text-sm text-gray-600">שם</span>
                      <span className="text-sm font-medium text-gray-800 text-left break-words break-all">{viewingOrder.customerName}</span>
                    </div>
                    {viewingOrder.customerPhone && (
                      <div className="flex items-start justify-between gap-3">
                        <span className="text-sm text-gray-600">טלפון</span>
                        <span className="text-sm font-medium text-gray-800 text-left break-words break-all">{viewingOrder.customerPhone}</span>
                      </div>
                    )}
                    {viewingOrder.customerEmail && (
                      <div className="flex items-start justify-between gap-3">
                        <span className="text-sm text-gray-600">אימייל</span>
                        <span className="text-sm font-medium text-gray-800 text-left break-words break-all">{viewingOrder.customerEmail}</span>
                      </div>
                    )}
                    {viewingOrder.customerStreetAddress && (
                      <div className="flex items-start justify-between gap-3">
                        <span className="text-sm text-gray-600">כתובת</span>
                        <span className="text-sm font-medium text-gray-800 text-left break-words break-all">{viewingOrder.customerStreetAddress}</span>
                      </div>
                    )}
                    {viewingOrder.customerCity && (
                      <div className="flex items-start justify-between gap-3">
                        <span className="text-sm text-gray-600">עיר</span>
                        <span className="text-sm font-medium text-gray-800 text-left break-words break-all">{viewingOrder.customerCity}</span>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-gray-500 italic">אין פרטי לקוח עדיין</p>
                )}
              </div>
            </div>

            {/* Pickup Location */}
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">מיקום איסוף</h3>
              <div className="glass-card rounded-xl p-4 space-y-2">
                {viewingOrder.storeStreetAddress ? (
                  <>
                    <div className="flex items-start justify-between gap-3">
                      <span className="text-sm text-gray-600">כתובת</span>
                      <span className="text-sm font-medium text-gray-800 text-left break-words break-all">{viewingOrder.storeStreetAddress}</span>
                    </div>
                    {viewingOrder.storeCity && (
                      <div className="flex items-start justify-between gap-3">
                        <span className="text-sm text-gray-600">עיר</span>
                        <span className="text-sm font-medium text-gray-800 text-left break-words break-all">{viewingOrder.storeCity}</span>
                      </div>
                    )}
                    {viewingOrder.storePhoneNumber && (
                      <div className="flex items-start justify-between gap-3">
                        <span className="text-sm text-gray-600">טלפון</span>
                        <span className="text-sm font-medium text-gray-800 text-left break-words break-all">{viewingOrder.storePhoneNumber}</span>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-gray-500 italic">מיקום איסוף לא נבחר עדיין</p>
                )}
              </div>
            </div>

            {/* Products */}
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">מוצרים</h3>
              <div className="glass-card rounded-xl overflow-hidden">
                {viewingOrder.products.length === 0 ? (
                  <p className="text-sm text-gray-500 italic p-4">אין מוצרים עדיין</p>
                ) : (
                  <div className="divide-y divide-gray-200/50">
                    {viewingOrder.products.map((product, index) => (
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

            {/* Order Summary */}
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">סיכום הזמנה</h3>
              <div className="glass-card rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">סה״כ פריטים</span>
                  <span className="text-sm font-medium text-gray-800">{viewingOrder.products.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">סה״כ כמות</span>
                  <span className="text-sm font-medium text-gray-800">
                    {viewingOrder.products.reduce((sum, p) => sum + p.quantity, 0)}
                  </span>
                </div>
                {(() => {
                  const productsTotal = viewingOrder.products.reduce((sum, p) => 
                    sum + (p.pricePerUnit * p.quantity), 0
                  );
                  return (
                    <div className="flex items-center justify-between pt-2 border-t border-gray-200/50">
                      <span className="text-sm text-gray-600">מחיר</span>
                      <span className="text-sm font-medium text-gray-800">{formatPrice(productsTotal)}</span>
                    </div>
                  );
                })()}
                {viewingOrder.doneAt && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">הושלם</span>
                    <span className="text-sm font-medium text-gray-800">{formatDate(viewingOrder.doneAt)}</span>
                  </div>
                )}
                {viewingOrder.discount > 0 && (() => {
                  const productsTotal = viewingOrder.products.reduce((sum, p) => 
                    sum + (p.pricePerUnit * p.quantity), 0
                  );
                  const discountPercentage = productsTotal > 0 
                    ? ((viewingOrder.discount / productsTotal) * 100).toFixed(1)
                    : '0.0';
                  return (
                    <div className="flex items-center justify-between pt-2 border-t border-gray-200/50">
                      <span className="text-sm text-gray-600">הנחה</span>
                      <span className="text-sm font-semibold text-red-600">
                        {viewingOrder.discount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}-₪ ({discountPercentage}%)
                      </span>
                    </div>
                  );
                })()}
                <div className="flex items-center justify-between pt-2 border-t border-gray-200/50">
                  <span className="text-base font-semibold text-gray-800">מחיר כולל</span>
                  <span className="text-lg font-bold text-indigo-600">{formatPrice(viewingOrder.totalPrice)}</span>
                </div>
              </div>
            </div>

            {/* Link Info */}
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">מידע על קישור</h3>
              <div className="glass-card rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">תאריך תפוגה</span>
                  <span className="text-sm font-medium text-gray-800">{formatDate(viewingOrder.linkExpiresAt)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">מספר הזמנה</span>
                  <span className="text-xs font-mono text-gray-800">{viewingOrder.id}</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap justify-center gap-3 items-center">
              {(viewingOrder.status === 'PLACED' || viewingOrder.status === 'EMPTY') && (
                <button
                  onClick={() => {
                    setOrderIdPendingCancel(viewingOrder.id);
                    setShowCancelConfirm(true);
                  }}
                  disabled={cancellingOrderId === viewingOrder.id}
                  className={`glass-button px-6 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 border ${
                    cancellingOrderId === viewingOrder.id
                      ? 'text-gray-400 border-gray-300 cursor-not-allowed'
                      : 'text-red-600 border-red-600 bg-red-50 hover:shadow-lg'
                  }`}
                >
                  {cancellingOrderId === viewingOrder.id ? 'מבטל...' : 'בטל הזמנה'}
                </button>
              )}
              {viewingOrder.status === 'PLACED' && (
                <>
                  <button
                    onClick={() => {
                      setViewingOrder(null);
                      navigate(`/store/edit/${viewingOrder.id}`);
                    }}
                    className="glass-button px-6 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 border-2 bg-blue-100 text-blue-700 border-blue-700 hover:shadow-lg"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    <span>ערוך הזמנה</span>
                  </button>
                  <button
                    onClick={() => {
                      setDiscountOrder(viewingOrder);
                      setDiscountValue(viewingOrder.discount > 0 ? viewingOrder.discount.toString() : '');
                      setDiscountMode('number');
                    }}
                    className="glass-button px-6 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 border-2 bg-purple-100 text-purple-700 border-purple-700 hover:shadow-lg"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>הוסף הנחה</span>
                  </button>
                </>
              )}
              <button
                onClick={closeViewModal}
                className="glass-button px-6 py-2 rounded-xl text-sm font-semibold text-gray-800 hover:shadow-md transition-all"
              >
                סגור
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Discount Modal */}
      {discountOrder && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={() => {
            if (!isUpdatingDiscount) {
              setDiscountOrder(null);
              setDiscountValue('');
              setDiscountMode('number');
            }
          }}
        >
          <div
            className="glass-card rounded-3xl p-6 md:p-8 w-full max-w-md bg-white/90 shadow-xl border border-purple-100"
            onClick={(e) => e.stopPropagation()}
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
                    setDiscountError('');
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
                    setDiscountError('');
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
                          setDiscountError('');
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
                          setDiscountError('');
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

              {discountError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl">
                  <p className="text-sm text-red-600">{discountError}</p>
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

      {showCancelConfirm && orderIdPendingCancel && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={() => !cancellingOrderId && setShowCancelConfirm(false)}
        >
          <div
            className="glass-card rounded-3xl p-6 md:p-8 w-full max-w-md bg-white/90 shadow-xl border border-red-100"
            onClick={(e) => e.stopPropagation()}
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
              ביטול יסיר את ההזמנה מהתור הפעיל. תמיד תוכל ליצור הזמנה חדשה מאוחר יותר אם תשנה את דעתך.
            </p>

            <div className="border-t border-gray-200/70 -mx-6 md:-mx-8 mb-4"></div>

            <div className="flex justify-end gap-3">
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
    </div>
  );
}

