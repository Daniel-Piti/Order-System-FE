import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { orderAPI, customerAPI, agentAPI, type Order, type Customer, type Agent } from '../services/api';
import PaginationBar from '../components/PaginationBar';
import { formatPrice } from '../utils/formatPrice';

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
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);
  const [cancellingOrderId, setCancellingOrderId] = useState<string | null>(null);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [orderIdPendingCancel, setOrderIdPendingCancel] = useState<string | null>(null);

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

  const fetchOrders = async (page: number = 0) => {
    setIsLoading(true);
    setError('');
    try {
      // Determine filterAgent and agentId based on agentFilter
      const filterAgent = agentFilter !== ''; // If agentFilter is not empty, we're filtering by agent
      const agentId = agentFilter === '' || agentFilter === 'manager' 
        ? null 
        : parseInt(agentFilter, 10);

      const pageResponse = await orderAPI.getAllOrders(
        page,
        pageSize,
        sortBy,
        sortDirection,
        statusFilter || undefined,
        filterAgent,
        agentId
      );
      const fetchedOrders = pageResponse?.content || [];
      setOrders(fetchedOrders);
      setTotalPages(pageResponse?.totalPages || 0);
    } catch (err: any) {
      setError('Failed to load orders');
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
      await orderAPI.createOrder({
        customerId: selectedCustomerId || null,
      });
      setShowCreateModal(false);
      setSelectedCustomerId(null);
      setCurrentPage(0); // Reset to first page
      await fetchOrders(0);
    } catch (err: any) {
      setError(err.response?.data?.userMessage || 'Failed to create order');
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

  const handleCopyLink = async (orderId: string) => {
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

  const handleMarkOrderDone = async (orderId: string) => {
    setUpdatingOrderId(orderId);
    setError('');
    try {
      await orderAPI.markOrderDone(orderId);
      await fetchOrders(currentPage);
      setViewingOrder((prev) => {
        if (prev && prev.id === orderId) {
          return { ...prev, status: 'DONE', doneAt: prev.doneAt ?? new Date().toISOString() };
        }
        return prev;
      });
    } catch (err: any) {
      setError(err.response?.data?.userMessage || 'Failed to mark order as done');
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const handleCancelOrder = async (orderId: string) => {
    setCancellingOrderId(orderId);
    setError('');
    try {
      await orderAPI.markOrderCancelled(orderId);
      await fetchOrders(currentPage);
      setViewingOrder((prev) => {
        if (prev && prev.id === orderId) {
          return { ...prev, status: 'CANCELLED' };
        }
        return prev;
      });
    } catch (err: any) {
      setError(err.response?.data?.userMessage || 'Failed to cancel order');
    } finally {
      setCancellingOrderId(null);
      setOrderIdPendingCancel(null);
      setShowCancelConfirm(false);
    }
  };

  const handleViewOrder = (order: Order) => {
    setViewingOrder(order);
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

  const getLabelStyles = (status: string) => {
    switch (status) {
      case 'EMPTY':
        return {
          bg: 'bg-gradient-to-r from-gray-100/90 to-gray-100/90',
          border: 'border-gray-300/60',
          borderHover: 'group-hover:border-gray-400/80',
          text: 'text-gray-900',
        };
      case 'PLACED':
        return {
          bg: 'bg-gradient-to-r from-blue-100/90 to-indigo-100/90',
          border: 'border-blue-300/60',
          borderHover: 'group-hover:border-blue-400/80',
          text: 'text-blue-900',
        };
      case 'DONE':
        return {
          bg: 'bg-gradient-to-r from-green-100/90 to-emerald-100/90',
          border: 'border-green-300/60',
          borderHover: 'group-hover:border-green-400/80',
          text: 'text-green-900',
        };
      case 'EXPIRED':
        return {
          bg: 'bg-gradient-to-r from-orange-100/90 to-amber-100/90',
          border: 'border-orange-300/60',
          borderHover: 'group-hover:border-orange-400/80',
          text: 'text-orange-900',
        };
      case 'CANCELLED':
        return {
          bg: 'bg-gradient-to-r from-red-100/90 to-rose-100/90',
          border: 'border-red-300/60',
          borderHover: 'group-hover:border-red-400/80',
          text: 'text-red-900',
        };
      default:
        return {
          bg: 'bg-gradient-to-r from-gray-100/90 to-gray-100/90',
          border: 'border-gray-300/60',
          borderHover: 'group-hover:border-gray-400/80',
          text: 'text-gray-900',
        };
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
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
    <div className="max-w-7xl mx-auto pb-32">
      {/* Header */}
      <div className="glass-card rounded-3xl p-6 md:p-8 mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-800 leading-tight">Orders</h1>
            <p className="text-gray-600 text-sm mt-2">
              Manage your orders and share links with customers
            </p>
          </div>
          <button
            onClick={openCreateModal}
            className="mt-2 md:mt-0 px-6 py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-lg hover:shadow-xl transition-all flex items-center gap-2 border-0"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span>Create New Order</span>
          </button>
        </div>
      </div>

      {/* Filters and Sorting */}
      <div className="glass-card rounded-2xl p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
          {/* Left side: Filters */}
          <div className="flex flex-col sm:flex-row gap-3 flex-1">
            {/* Agent Filter */}
            <div className="w-[180px]">
              <label className="block text-xs font-medium text-gray-600 mb-1">Agent</label>
              <select
                value={agentFilter}
                onChange={(e) => {
                  setAgentFilter(e.target.value);
                  setCurrentPage(0);
                }}
                className="glass-select w-full px-3 py-2 rounded-xl text-sm font-semibold text-gray-800 cursor-pointer"
              >
                <option value="">All Orders</option>
                <option value="manager">Manager Only</option>
                {agents.map((agent) => (
                  <option key={agent.id} value={agent.id.toString()}>
                    {agent.firstName} {agent.lastName}
                  </option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div className="w-[140px]">
              <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setCurrentPage(0);
                }}
                className="glass-select w-full px-3 py-2 rounded-xl text-sm font-semibold text-gray-800 cursor-pointer"
              >
                <option value="">All Statuses</option>
                <option value="EMPTY">Empty</option>
                <option value="PLACED">Placed</option>
                <option value="DONE">Done</option>
                <option value="EXPIRED">Expired</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>

            {/* Sort By */}
            <div className="w-[140px]">
              <label className="block text-xs font-medium text-gray-600 mb-1">Sort By</label>
              <select
                value={sortBy}
                onChange={(e) => {
                  setSortBy(e.target.value);
                  setCurrentPage(0);
                }}
                className="glass-select w-full px-3 py-2 rounded-xl text-sm font-semibold text-gray-800 cursor-pointer"
              >
                <option value="createdAt">Creation Date</option>
                <option value="status">Status</option>
                <option value="totalPrice">Total Price</option>
              </select>
            </div>

            {/* Sort Direction Toggle */}
            <div className="w-[100px]">
              <label className="block text-xs font-medium text-gray-600 mb-1">&nbsp;</label>
              <button
                onClick={toggleSortDirection}
                className="glass-button w-full px-3 py-2 rounded-xl text-sm font-semibold text-gray-800 hover:shadow-md transition-all flex items-center justify-between"
              >
                <span>Order</span>
                {sortDirection === 'ASC' ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                )}
              </button>
            </div>

            {/* Page Size */}
            <div className="w-[90px]">
              <label className="block text-xs font-medium text-gray-600 mb-1">Per Page</label>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(0);
                }}
                className="glass-select w-full px-3 py-2 rounded-xl text-sm font-semibold text-gray-800 cursor-pointer"
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
          <h3 className="text-xl font-semibold text-gray-700 mb-2">No orders yet</h3>
          <p className="text-gray-600 mb-6">Create your first order to get started</p>
          <button
            onClick={openCreateModal}
            className="glass-button px-6 py-3 rounded-xl font-semibold text-indigo-600 hover:shadow-md transition-all"
          >
            Create Order
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 justify-items-center">
          {orders && orders.map((order) => {
            const linkedCustomer = order.customerId
              ? customers.find((customer) => customer.id === order.customerId)
              : null;
            const showOrderCustomerDetails = order.status !== 'EMPTY' && !!order.customerName;

            const cardStyles = getCardStyles(order.status);
            const labelStyles = getLabelStyles(order.status);
            const orderAgent = order.agentId ? agents.find(agent => agent.id === order.agentId) : null;
            // Show "Me" if filtering by this agent (agentFilter matches this order's agentId)
            const isMe = agentFilter !== '' && agentFilter !== 'manager' && order.agentId === parseInt(agentFilter, 10);
            // Show "Me" label for manager's own orders (orderSource === 'MANAGER' and agentId === null)
            const isManagerOrder = order.orderSource === 'MANAGER' && order.agentId === null;
            // Show label for public orders (orderSource === 'PUBLIC')
            const isPublicOrder = order.orderSource === 'PUBLIC';
            
            return (
            <div key={order.id} className="flex flex-col w-full sm:max-w-[260px] items-center group">
              {/* Agent/Manager/Public Label - Outside and attached at top */}
              {(orderAgent || isManagerOrder || isPublicOrder) && (
                <div className={`w-[80%] px-3 py-1.5 ${labelStyles.bg} border-l-2 border-r-2 border-t-2 ${labelStyles.border} ${labelStyles.borderHover} rounded-t-xl backdrop-blur-sm transition-all duration-300 -mb-[2px]`}>
                  <p className={`text-xs font-semibold ${labelStyles.text} text-center truncate`}>
                    {isPublicOrder ? '- Online -' : isManagerOrder ? 'Me' : isMe ? 'Me' : `${orderAgent!.firstName} ${orderAgent!.lastName}`}
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
                <div className="flex items-center justify-between mb-3 mt-1">
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${getStatusColor(order.status)} shadow-sm`}>
                  {order.status}
                </span>
                <p className="text-xs font-mono text-gray-500/70 font-medium">#{order.id.slice(0, 8)}</p>
              </div>

              {/* Customer Info - Fixed height */}
              <div className="mb-2 min-h-[3.5rem] flex flex-col gap-1 overflow-hidden items-center justify-center">
                {showOrderCustomerDetails ? (
                  <div className="w-full space-y-1 text-center">
                    <p className="text-sm font-bold text-gray-800 truncate">{order.customerName}</p>
                    {order.customerPhone && (
                      <p className="text-xs text-gray-600 font-medium truncate flex items-center justify-center gap-1">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                        {order.customerPhone}
                      </p>
                    )}
                  </div>
                ) : order.status === 'EMPTY' ? (
                  <div className="w-full flex items-center justify-center h-full">
                    <div className="text-center space-y-1">
                      <p className="text-sm font-medium text-gray-400">No customer info yet</p>
                      <p className="text-xs text-gray-400">Waiting for order details</p>
                    </div>
                  </div>
                ) : (
                  !linkedCustomer && <p className="text-sm text-gray-400 italic font-medium text-center">No customer info</p>
                )}

              </div>

              <div className="min-h-[32px] flex items-center justify-center">
                {linkedCustomer ? (
                  <div className="mt-1 pb-0 w-full flex justify-center">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate('/dashboard/customers');
                      }}
                      className="text-sm text-indigo-600 font-semibold hover:text-indigo-700 flex items-center gap-1.5 max-w-full overflow-hidden"
                      title="View linked customer"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                      <span className="truncate max-w-[160px]">{linkedCustomer?.name ?? 'View customer'}</span>
                    </button>
                  </div>
                ) : (
                  <p className="mt-1 pt-1 pb-1 text-sm text-gray-500 italic text-center">No customer linked</p>
                )}
              </div>

              {/* Total Price - Prominent */}
              <div className="mt-3 pb-2 border-t border-gray-200/50 border-b border-gray-200/30 pt-3">
                <div className="flex items-baseline justify-between">
                  <span className="text-xs font-medium text-gray-600 uppercase tracking-wide">Total</span>
                  <span className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                    {formatPrice(order.totalPrice)}
                  </span>
                </div>
              </div>

              {/* Created/Placed Date - Subtle */}
              <div className="mt-auto pt-3 pb-2 flex items-center justify-between min-h-[40px]">
                <p className="text-xs text-gray-500 font-medium flex items-center">
                  {formatDate(order.createdAt)}
                </p>
                {/* Floating Actions */}
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
                    title={copiedOrderId === order.id ? 'Link copied' : 'Copy order link'}
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
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/store/edit/${order.id}`);
                      }}
                      className="px-3 py-1.5 rounded-full border-2 flex items-center gap-2 transition-all shadow-sm flex-shrink-0 bg-blue-100 text-blue-700 border-blue-700 hover:shadow-lg"
                      title="Edit order"
                    >
                      <svg className="w-4 h-4 text-blue-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      <span className="text-xs font-semibold text-blue-700">Edit</span>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMarkOrderDone(order.id);
                      }}
                      disabled={updatingOrderId === order.id}
                      className={`px-3 py-1.5 rounded-full border-2 flex items-center gap-2 transition-all shadow-sm flex-shrink-0 ${
                        updatingOrderId === order.id
                          ? 'bg-gray-100 text-gray-400 border-gray-300 cursor-not-allowed'
                          : 'bg-green-100 text-green-700 border-green-700 hover:shadow-lg'
                      }`}
                      title="Mark as done"
                    >
                      {updatingOrderId === order.id ? (
                        <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V2C6.477 2 2 6.477 2 12h2zm2 5.291A7.962 7.962 0 014 12H2c0 3.042 1.135 5.824 3 7.938l1-2.647z" />
                        </svg>
                      ) : (
                        <>
                          <svg className="w-4 h-4 text-green-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          <span className="text-xs font-semibold text-green-700">Done</span>
                        </>
                      )}
                    </button>
                  </div>
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
      />

      {/* Create Order Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="glass-card rounded-3xl p-6 md:p-8 w-full max-w-lg bg-white/85">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-800">Create New Order</h2>
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

            {error && (
              <div className="glass-card bg-red-50/50 border-red-200 rounded-xl p-3 mb-4 text-red-600 text-sm">
                {error}
              </div>
            )}

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Customer Selection
              </label>

              {/* Standalone Order Option */}
              <button
                onClick={() => setSelectedCustomerId(null)}
                className={`w-full text-left px-4 py-2.5 rounded-xl transition-all mb-3 flex items-center gap-3 ${
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
                  <div className="font-medium text-gray-800 text-sm">No Customer</div>
                  <div className="text-xs text-gray-600">Customer will provide their details via link</div>
                </div>
              </button>

              {/* Link to Customer Section */}
              {customers.length > 0 && (
                <>
                  <div className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">Or link to existing customer</div>
                  
                  {/* Customer Search */}
                  <div className="relative mb-2">
                    <svg
                      className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400"
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
                      placeholder="Search customers..."
                      value={customerSearchQuery}
                      onChange={(e) => setCustomerSearchQuery(e.target.value)}
                      className="glass-input w-full pl-10 pr-10 py-2 rounded-xl text-sm text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    {customerSearchQuery && (
                      <button
                        onClick={() => setCustomerSearchQuery('')}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
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
                        <svg className="w-10 h-10 mx-auto mb-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <p className="text-xs">No customers found</p>
                        <button
                          onClick={() => setCustomerSearchQuery('')}
                          className="text-xs text-indigo-600 hover:text-indigo-700 mt-1"
                        >
                          Clear search
                        </button>
                      </div>
                    ) : (
                      filteredCustomers.map((customer) => (
                        <button
                          key={customer.id}
                          onClick={() => setSelectedCustomerId(customer.id)}
                          className={`w-full text-left px-3 py-2 rounded-lg transition-all flex items-center gap-2.5 ${
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

            <div className="flex space-x-3 pt-4">
              <button
                type="button"
                onClick={closeCreateModal}
                disabled={isCreating}
                className="glass-button flex-1 py-2 px-4 rounded-xl text-sm font-semibold text-gray-800 bg-red-100/60 hover:bg-red-200/70 border-red-500 hover:border-red-600 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreateOrder}
                disabled={isCreating}
                className="glass-button flex-1 py-2 px-4 rounded-xl text-sm font-semibold text-gray-800 bg-green-100/60 hover:bg-green-200/70 border-green-600 hover:border-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
              >
                {isCreating ? (
                  <>
                    <svg
                      className="animate-spin h-5 w-5"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    <span>Creating...</span>
                  </>
                ) : (
                  <span>Create Order</span>
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
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-bold text-gray-800">Order Details</h2>
                <p className="text-sm text-gray-600">Order #{viewingOrder.id.slice(0, 8)}</p>
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
                  {viewingOrder.status}
                </span>
                <span className="text-sm text-gray-600">
                  {viewingOrder.placedAt ? 'Placed' : 'Created'} {formatDate(viewingOrder.placedAt ?? viewingOrder.createdAt)}
                </span>
              </div>
            </div>

            {/* Customer Information */}
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Customer Information</h3>
              <div className="glass-card rounded-xl p-4 space-y-2">
                {viewingOrder.customerName ? (
                  <>
                    <div className="flex items-start justify-between gap-3">
                      <span className="text-sm text-gray-600">Name</span>
                      <span className="text-sm font-medium text-gray-800 text-right break-words break-all">{viewingOrder.customerName}</span>
                    </div>
                    {viewingOrder.customerPhone && (
                      <div className="flex items-start justify-between gap-3">
                        <span className="text-sm text-gray-600">Phone</span>
                        <span className="text-sm font-medium text-gray-800 text-right break-words break-all">{viewingOrder.customerPhone}</span>
                      </div>
                    )}
                    {viewingOrder.customerEmail && (
                      <div className="flex items-start justify-between gap-3">
                        <span className="text-sm text-gray-600">Email</span>
                        <span className="text-sm font-medium text-gray-800 text-right break-words break-all">{viewingOrder.customerEmail}</span>
                      </div>
                    )}
                    {viewingOrder.customerStreetAddress && (
                      <div className="flex items-start justify-between gap-3">
                        <span className="text-sm text-gray-600">Address</span>
                        <span className="text-sm font-medium text-gray-800 text-right break-words break-all">{viewingOrder.customerStreetAddress}</span>
                      </div>
                    )}
                    {viewingOrder.customerCity && (
                      <div className="flex items-start justify-between gap-3">
                        <span className="text-sm text-gray-600">City</span>
                        <span className="text-sm font-medium text-gray-800 text-right break-words break-all">{viewingOrder.customerCity}</span>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-gray-500 italic">No customer information provided yet</p>
                )}
              </div>
            </div>

            {/* Pickup Location */}
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Pickup Location</h3>
              <div className="glass-card rounded-xl p-4 space-y-2">
                {viewingOrder.storeStreetAddress ? (
                  <>
                    <div className="flex items-start justify-between gap-3">
                      <span className="text-sm text-gray-600">Address</span>
                      <span className="text-sm font-medium text-gray-800 text-right break-words break-all">{viewingOrder.storeStreetAddress}</span>
                    </div>
                    {viewingOrder.storeCity && (
                      <div className="flex items-start justify-between gap-3">
                        <span className="text-sm text-gray-600">City</span>
                        <span className="text-sm font-medium text-gray-800 text-right break-words break-all">{viewingOrder.storeCity}</span>
                      </div>
                    )}
                    {viewingOrder.storePhoneNumber && (
                      <div className="flex items-start justify-between gap-3">
                        <span className="text-sm text-gray-600">Phone</span>
                        <span className="text-sm font-medium text-gray-800 text-right break-words break-all">{viewingOrder.storePhoneNumber}</span>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-gray-500 italic">Pickup location not selected yet</p>
                )}
              </div>
            </div>

            {/* Products */}
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Products</h3>
              <div className="glass-card rounded-xl overflow-hidden">
                {viewingOrder.products.length === 0 ? (
                  <p className="text-sm text-gray-500 italic p-4">No products added yet</p>
                ) : (
                  <div className="divide-y divide-gray-200/50">
                    {viewingOrder.products.map((product, index) => (
                      <div key={index} className="p-3 flex items-start justify-between gap-3 hover:bg-white/20 transition-colors">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-800 break-words break-all">{product.productName}</p>
                          <p className="text-xs text-gray-600 break-words break-all">Quantity: {product.quantity}</p>
                        </div>
                        <div className="text-right break-words break-all">
                          <p className="text-sm font-semibold text-gray-800 break-words break-all">
                            {formatPrice(product.pricePerUnit * product.quantity)}
                          </p>
                          <p className="text-xs text-gray-600 break-words break-all">{formatPrice(product.pricePerUnit)} each</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Order Summary */}
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Order Summary</h3>
              <div className="glass-card rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Total Items</span>
                  <span className="text-sm font-medium text-gray-800">{viewingOrder.products.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Total Quantity</span>
                  <span className="text-sm font-medium text-gray-800">
                    {viewingOrder.products.reduce((sum, p) => sum + p.quantity, 0)}
                  </span>
                </div>
                {viewingOrder.doneAt && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Done</span>
                    <span className="text-sm font-medium text-gray-800">{formatDate(viewingOrder.doneAt)}</span>
                  </div>
                )}
                <div className="flex items-center justify-between pt-2 border-t border-gray-200/50">
                  <span className="text-base font-semibold text-gray-800">Total Price</span>
                  <span className="text-lg font-bold text-indigo-600">{formatPrice(viewingOrder.totalPrice)}</span>
                </div>
              </div>
            </div>

            {/* Link Info */}
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Link Information</h3>
              <div className="glass-card rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Link Expires</span>
                  <span className="text-sm font-medium text-gray-800">{formatDate(viewingOrder.linkExpiresAt)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Order ID</span>
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
                  {cancellingOrderId === viewingOrder.id ? 'Cancelling...' : 'Cancel Order'}
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
                    <span>Edit Order</span>
                  </button>
                  <button
                    onClick={() => handleMarkOrderDone(viewingOrder.id)}
                    disabled={updatingOrderId === viewingOrder.id}
                    className={`glass-button px-6 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 border-2 ${
                      updatingOrderId === viewingOrder.id
                        ? 'text-gray-400 border-gray-300 cursor-not-allowed'
                        : 'text-green-600 border-green-700 bg-green-50 hover:shadow-lg'
                    }`}
                  >
                    {updatingOrderId === viewingOrder.id ? (
                      'Marking...'
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span>Mark as Done</span>
                      </>
                    )}
                  </button>
                </>
              )}
              <button
                onClick={closeViewModal}
                className="glass-button px-6 py-2 rounded-xl text-sm font-semibold text-gray-800 hover:shadow-md transition-all"
              >
                Close
              </button>
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
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Cancel order?</h2>
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
              Cancelling will remove this order from the active queue. You can always create a new order later if you change your mind.
            </p>

            <div className="border-t border-gray-200/70 -mx-6 md:-mx-8 mb-4"></div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => !cancellingOrderId && setShowCancelConfirm(false)}
                className="glass-button px-4 py-2 rounded-xl text-sm font-semibold text-gray-700 hover:shadow-md transition-all"
              >
                Keep Order
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
                {cancellingOrderId ? 'Cancelling...' : 'Cancel Order'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
