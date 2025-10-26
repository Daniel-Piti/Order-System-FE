import { useState, useEffect } from 'react';
import { orderAPI, customerAPI, type Order, type Customer } from '../services/api';

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [viewingOrder, setViewingOrder] = useState<Order | null>(null);
  const [copiedOrderId, setCopiedOrderId] = useState<string | null>(null);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    setIsLoading(true);
    setError('');
    try {
      const data = await orderAPI.getAllOrders();
      setOrders(data);
    } catch (err: any) {
      setError('Failed to load orders');
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

  const handleCreateOrder = async () => {
    setIsCreating(true);
    setError('');
    try {
      const newOrderId = await orderAPI.createEmptyOrder({
        customerId: selectedCustomerId || null,
      });
      console.log('Order created:', newOrderId);
      setShowCreateModal(false);
      setSelectedCustomerId(null);
      await fetchOrders();
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
      // For now, just copy the order ID (later will be full URL)
      await navigator.clipboard.writeText(orderId);
      setCopiedOrderId(orderId);
      setTimeout(() => setCopiedOrderId(null), 2000); // Clear after 2 seconds
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleViewOrder = (order: Order) => {
    setViewingOrder(order);
  };

  const closeViewModal = () => {
    setViewingOrder(null);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'EMPTY':
        return 'bg-gray-100 text-gray-700';
      case 'PLACED':
        return 'bg-blue-100 text-blue-700';
      case 'DONE':
        return 'bg-green-100 text-green-700';
      case 'EXPIRED':
        return 'bg-orange-100 text-orange-700';
      case 'CANCELLED':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
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
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-2">Orders</h1>
          <p className="text-gray-600">Manage your orders and share links with customers</p>
        </div>
        <button
          onClick={openCreateModal}
          className="px-6 py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-lg hover:shadow-xl transition-all flex items-center space-x-2 border-0"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span>Create New Order</span>
        </button>
      </div>

      {/* Orders List */}
      {orders.length === 0 ? (
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {orders.map((order) => (
            <div
              key={order.id}
              onClick={() => handleViewOrder(order)}
              className="glass-card rounded-xl p-4 hover:shadow-lg transition-all cursor-pointer group border-2 border-gray-400 hover:border-indigo-400"
            >
              {/* Order Header */}
              <div className="flex items-center justify-between mb-3">
                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${getStatusColor(order.status)}`}>
                  {order.status}
                </span>
                <p className="text-xs text-gray-500">#{order.id.slice(0, 6)}</p>
              </div>

              {/* Customer Info */}
              <div className="mb-3">
                {order.customerName ? (
                  <div>
                    <p className="text-sm font-medium text-gray-800 truncate">{order.customerName}</p>
                    {order.customerPhone && (
                      <p className="text-xs text-gray-600 truncate">{order.customerPhone}</p>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 italic">No customer</p>
                )}
              </div>

              {/* Order Details */}
              <div className="space-y-1 mb-3 pb-3 border-t border-gray-200/50 pt-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-600">Products</span>
                  <span className="font-semibold text-gray-800">{order.products.length}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-600">Total</span>
                  <span className="font-semibold text-gray-800">${order.totalPrice.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-600">Created</span>
                  <span className="text-gray-700">{formatDate(order.createdAt)}</span>
                </div>
              </div>

              {/* Actions */}
              {order.status === 'EMPTY' && (
                <div className="flex items-center justify-center">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCopyLink(order.id);
                    }}
                    className={`w-full glass-button px-3 py-2 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
                      copiedOrderId === order.id
                        ? 'text-green-600 hover:shadow-md'
                        : 'text-indigo-600 hover:shadow-md'
                    }`}
                    title="Copy order link"
                  >
                    {copiedOrderId === order.id ? (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                        <span>Copy Link</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="glass-card rounded-3xl p-6 md:p-8 w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white/85">
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
                  Created {formatDate(viewingOrder.createdAt)}
                </span>
              </div>
            </div>

            {/* Customer Information */}
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Customer Information</h3>
              <div className="glass-card rounded-xl p-4 space-y-2">
                {viewingOrder.customerName ? (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Name</span>
                      <span className="text-sm font-medium text-gray-800">{viewingOrder.customerName}</span>
                    </div>
                    {viewingOrder.customerPhone && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Phone</span>
                        <span className="text-sm font-medium text-gray-800">{viewingOrder.customerPhone}</span>
                      </div>
                    )}
                    {viewingOrder.customerEmail && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Email</span>
                        <span className="text-sm font-medium text-gray-800">{viewingOrder.customerEmail}</span>
                      </div>
                    )}
                    {viewingOrder.customerStreetAddress && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Address</span>
                        <span className="text-sm font-medium text-gray-800">{viewingOrder.customerStreetAddress}</span>
                      </div>
                    )}
                    {viewingOrder.customerCity && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">City</span>
                        <span className="text-sm font-medium text-gray-800">{viewingOrder.customerCity}</span>
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
                {viewingOrder.userStreetAddress ? (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Address</span>
                      <span className="text-sm font-medium text-gray-800">{viewingOrder.userStreetAddress}</span>
                    </div>
                    {viewingOrder.userCity && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">City</span>
                        <span className="text-sm font-medium text-gray-800">{viewingOrder.userCity}</span>
                      </div>
                    )}
                    {viewingOrder.userPhoneNumber && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Phone</span>
                        <span className="text-sm font-medium text-gray-800">{viewingOrder.userPhoneNumber}</span>
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
                      <div key={index} className="p-3 flex items-center justify-between hover:bg-white/20 transition-colors">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-800">{product.productName}</p>
                          <p className="text-xs text-gray-600">Quantity: {product.quantity}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-gray-800">
                            ${(product.pricePerUnit * product.quantity).toFixed(2)}
                          </p>
                          <p className="text-xs text-gray-600">${product.pricePerUnit.toFixed(2)} each</p>
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
                {viewingOrder.deliveryDate && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Delivery Date</span>
                    <span className="text-sm font-medium text-gray-800">{formatDate(viewingOrder.deliveryDate)}</span>
                  </div>
                )}
                <div className="flex items-center justify-between pt-2 border-t border-gray-200/50">
                  <span className="text-base font-semibold text-gray-800">Total Price</span>
                  <span className="text-lg font-bold text-indigo-600">${viewingOrder.totalPrice.toFixed(2)}</span>
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

            {/* Close Button */}
            <div className="flex justify-end">
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
    </div>
  );
}
