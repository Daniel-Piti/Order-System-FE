import { useCallback, useEffect, useMemo, useState, type ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { agentAPI, type Customer } from '../services/api';
import AgentCustomerAddModal from '../components/AgentCustomerAddModal';
import AgentCustomerDeleteModal from '../components/AgentCustomerDeleteModal';
import AgentCustomerEditModal from '../components/AgentCustomerEditModal';
import PaginationBar from '../components/PaginationBar';

const PAGE_SIZE_OPTIONS = [5, 10, 20, 50] as const;

type SortDirection = 'asc' | 'desc';

export default function AgentCustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [pageSize, setPageSize] = useState<(typeof PAGE_SIZE_OPTIONS)[number]>(PAGE_SIZE_OPTIONS[0]);
  const [currentPage, setCurrentPage] = useState(0);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [deletingCustomer, setDeletingCustomer] = useState<Customer | null>(null);
  const navigate = useNavigate();

  const fetchCustomers = useCallback(async () => {
    try {
      setIsLoading(true);
      setError('');
      const data = await agentAPI.getCustomersForAgent();
      setCustomers(data);
      setCurrentPage(0);
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 401 || status === 403) {
        localStorage.removeItem('authToken');
        localStorage.removeItem('userRole');
        navigate('/login/agent');
        return;
      }
      setError(err?.response?.data?.userMessage || err?.message || 'Failed to load customers');
    } finally {
      setIsLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const filteredAndSortedCustomers = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    const filtered = query
      ? customers.filter((customer) =>
          [customer.name, customer.email, customer.phoneNumber, customer.city, customer.streetAddress]
            .join(' ')
            .toLowerCase()
            .includes(query)
        )
      : customers;

    return [...filtered].sort((a, b) => {
      const comparison = a.name.localeCompare(b.name);
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [customers, searchQuery, sortDirection]);

  const totalPages = Math.max(1, Math.ceil(filteredAndSortedCustomers.length / pageSize));

  const paginatedCustomers = useMemo(() => {
    const start = currentPage * pageSize;
    return filteredAndSortedCustomers.slice(start, start + pageSize);
  }, [filteredAndSortedCustomers, currentPage, pageSize]);

  useEffect(() => {
    setCurrentPage(0);
  }, [searchQuery, sortDirection, pageSize]);

  useEffect(() => {
    if (currentPage > totalPages - 1) {
      setCurrentPage(0);
    }
  }, [currentPage, totalPages]);

  const handlePageSizeChange = (event: ChangeEvent<HTMLSelectElement>) => {
    setPageSize(Number(event.target.value) as (typeof PAGE_SIZE_OPTIONS)[number]);
  };

  const handleSortToggle = () => {
    setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
  };

  const handleSearchChange = (event: ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(event.target.value);
  };

  const handleOpenModal = () => setIsAddModalOpen(true);
  const handleCloseModal = () => setIsAddModalOpen(false);

  const handleAddSuccess = async () => {
    await fetchCustomers();
    handleCloseModal();
  };

  const handleStartEdit = (customer: Customer) => {
    setEditingCustomer(customer);
  };

  const handleCloseEdit = () => {
    setEditingCustomer(null);
  };

  const handleEditSuccess = async () => {
    await fetchCustomers();
    setEditingCustomer(null);
  };

  const handleStartDelete = (customer: Customer) => {
    setDeletingCustomer(customer);
  };

  const handleCloseDelete = () => {
    setDeletingCustomer(null);
  };

  const handleDeleteSuccess = async () => {
    await fetchCustomers();
    setDeletingCustomer(null);
  };

  const handleRetry = () => {
    fetchCustomers();
  };

  const formatPhoneNumber = (value: string) => {
    if (value.length <= 3) return value;
    return `${value.slice(0, 3)}-${value.slice(3)}`;
  };

  const formatInitials = (value: string) => {
    if (!value) return 'CU';
    return value
      .split(' ')
      .map((part) => part.charAt(0).toUpperCase())
      .join('')
      .slice(0, 2)
      .padEnd(2, value.charAt(0).toUpperCase());
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-24">
      <div className="glass-card rounded-3xl p-6 md:p-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.35em] text-sky-500 font-semibold mb-2">Customer Roster</p>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-800 leading-tight">Your Customers</h1>
            <p className="text-gray-600 text-sm mt-2">
              Manage the {customers.length} customers currently assigned to you.
            </p>
          </div>
          <button
            onClick={handleOpenModal}
            className="glass-button px-6 py-2 rounded-xl font-medium text-gray-800 hover:bg-white/40 flex items-center gap-2 border border-sky-200 hover:border-sky-300 transition-colors"
          >
            <svg className="w-5 h-5 text-sky-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span>Add Customer</span>
          </button>
        </div>
      </div>

      <div className="glass-card rounded-3xl p-6 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Show</label>
            <select
              value={pageSize}
              onChange={handlePageSizeChange}
              className="glass-select px-4 py-2 rounded-xl text-sm font-semibold text-gray-800 cursor-pointer w-24"
            >
              {PAGE_SIZE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={handleSortToggle}
            className="glass-button px-4 py-2 rounded-xl text-sm font-semibold text-gray-800 flex items-center gap-2 border border-sky-200 hover:border-sky-300 transition-colors"
          >
            {sortDirection === 'asc' ? (
              <>
                <svg className="w-4 h-4 text-sky-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                </svg>
                <span>Name A → Z</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4 text-sky-600 rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                </svg>
                <span>Name Z → A</span>
              </>
            )}
          </button>
        </div>

        <div className="relative w-full lg:w-96">
          <input
            type="text"
            value={searchQuery}
            onChange={handleSearchChange}
            placeholder="Search customers by name, email, phone, or city…"
            className="glass-input w-full pl-11 pr-10 py-2.5 rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-sky-500 border border-gray-300"
          />
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Clear search"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="glass-card rounded-3xl p-12 flex items-center justify-center">
          <div className="flex items-center space-x-3 text-gray-600">
            <svg
              className="animate-spin h-6 w-6 text-sky-600"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
            <span className="font-medium">Loading customers…</span>
          </div>
        </div>
      ) : error ? (
        <div className="glass-card rounded-3xl p-8 bg-red-50/60 border border-red-200">
          <h2 className="text-xl font-semibold text-red-800 mb-2">Unable to load customers</h2>
          <p className="text-red-600 text-sm">{error}</p>
          <button
            onClick={handleRetry}
            className="glass-button mt-4 px-6 py-2 rounded-xl font-medium text-gray-800 bg-white/70 hover:bg-white transition-colors"
          >
            Try Again
          </button>
        </div>
      ) : filteredAndSortedCustomers.length === 0 ? (
        <div className="glass-card rounded-3xl p-12 text-center">
          <div className="flex flex-col items-center space-y-4">
            <div className="p-6 rounded-full bg-sky-100/60">
              <svg className="w-16 h-16 text-sky-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-800">No Customers Found</h2>
            <p className="text-gray-600 max-w-md">
              {searchQuery
                ? 'No customers match your search. Try refining your keywords.'
                : 'You have not added any customers yet. Create your first customer to get started.'}
            </p>
            <button
              onClick={handleOpenModal}
              className="glass-button px-8 py-3 rounded-xl font-semibold text-gray-800 hover:shadow-lg transition-all"
            >
              Add Customer
            </button>
          </div>
        </div>
      ) : (
        <div className="glass-card rounded-3xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-sky-50/70 backdrop-blur-sm">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">
                    Name
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">
                    Email
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">
                    Phone
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">
                    City
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">
                    Address
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wide">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {paginatedCustomers.map((customer) => (
                  <tr key={customer.id} className="hover:bg-sky-50/60 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-sky-100 flex items-center justify-center text-sky-600 font-semibold">
                          {formatInitials(customer.name)}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{customer.name}</p>
                          <p className="text-xs text-gray-500 mt-0.5">Customer ID: {customer.id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{customer.email}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {formatPhoneNumber(customer.phoneNumber)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{customer.city}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{customer.streetAddress}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="inline-flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleStartEdit(customer)}
                          className="glass-button p-2 rounded-lg text-sm font-semibold text-gray-800 border border-sky-200 hover:border-sky-300 transition-colors inline-flex items-center justify-center"
                          aria-label={`Edit ${customer.name}`}
                          title="Edit customer"
                        >
                          <svg className="w-4 h-4 text-sky-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M11 4H6a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2v-5M18.5 2.5a2.121 2.121 0 113 3L12 15l-4 1 1-4 9.5-9.5z"
                            />
                          </svg>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleStartDelete(customer)}
                          className="glass-button p-2 rounded-lg text-sm font-semibold text-gray-800 border border-red-200 hover:border-red-300 transition-colors inline-flex items-center justify-center"
                          aria-label={`Delete ${customer.name}`}
                          title="Delete customer"
                        >
                          <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3"
                            />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <PaginationBar
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
        maxWidth="max-w-5xl"
        showCondition={filteredAndSortedCustomers.length > pageSize}
      />

      <AgentCustomerAddModal isOpen={isAddModalOpen} onClose={handleCloseModal} onSuccess={handleAddSuccess} />
      <AgentCustomerEditModal
        isOpen={Boolean(editingCustomer)}
        customer={editingCustomer}
        onClose={handleCloseEdit}
        onSuccess={handleEditSuccess}
      />
      <AgentCustomerDeleteModal
        isOpen={Boolean(deletingCustomer)}
        customerName={deletingCustomer?.name ?? null}
        customerId={deletingCustomer?.id ?? null}
        onClose={handleCloseDelete}
        onDeleted={handleDeleteSuccess}
      />
    </div>
  );
}

