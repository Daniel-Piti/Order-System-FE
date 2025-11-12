import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { customerAPI, agentAPI } from '../services/api';
import type { Customer, Agent } from '../services/api';
import PaginationBar from '../components/PaginationBar';
import {
  validateEmail,
  validateRequiredWithMaxLength,
  validatePhoneNumberDigitsOnly,
} from '../utils/validation';

interface CustomerOverrideData {
  overrides: never[];
  currentPage: number;
  totalPages: number;
  totalElements: number;
  isLoading: boolean;
}

const MAX_CUSTOMER_NAME_LENGTH = 50;
const MAX_CUSTOMER_PHONE_LENGTH = 10;
const MAX_CUSTOMER_STREET_LENGTH = 120;
const MAX_CUSTOMER_CITY_LENGTH = 60;
const MAX_CUSTOMER_EMAIL_LENGTH = 100;

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [customerOverridesData, setCustomerOverridesData] = useState<Map<string, CustomerOverrideData>>(new Map());
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [sortDirection, setSortDirection] = useState<'ASC' | 'DESC'>('ASC');
  const [searchQuery, setSearchQuery] = useState('');
  const [agentFilter, setAgentFilter] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [customerToEdit, setCustomerToEdit] = useState<Customer | null>(null);
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    phoneNumber: '',
    email: '',
    streetAddress: '',
    city: '',
  });
  const [editFormData, setEditFormData] = useState({
    name: '',
    phoneNumber: '',
    email: '',
    streetAddress: '',
    city: '',
  });
  const [formError, setFormError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [showErrors, setShowErrors] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchCustomers();
    fetchAgents();
  }, []);

  useEffect(() => {
    setCurrentPage(0);
  }, [searchQuery, agentFilter]);

  const fetchCustomers = async () => {
    try {
      setIsLoading(true);
      setError('');
      
      const data = await customerAPI.getAllCustomers();
      setCustomers(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load customers');
      if (err.message.includes('401')) {
        navigate('/login/manager');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAgents = async () => {
    try {
      const data = await agentAPI.getAgentsForManager();
      setAgents(data);
    } catch (err: any) {
      if (err?.response?.status === 401 || err?.response?.status === 403) {
        localStorage.removeItem('authToken');
        navigate('/login/manager');
      } else {
        setError(prev => prev || err.response?.data?.userMessage || err.message || 'Failed to load agents');
      }
    }
  };

  const fetchOverrideCount = async (customerId: string) => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(
        `http://localhost:8080/api/product-overrides?customerId=${customerId}&page=0&size=1`,
        {
        headers: {
          'Authorization': `Bearer ${token}`
        }
        }
      );
      
      if (!response.ok) throw new Error('Failed to fetch override count');
      const data = await response.json();
      
      setCustomerOverridesData(prev => {
        const newMap = new Map(prev);
        newMap.set(customerId, {
          overrides: [],
          currentPage: 0,
          totalPages: data.totalPages || 0,
          totalElements: data.totalElements || 0,
          isLoading: false
        });
        return newMap;
      });
    } catch (err) {
      console.error(`Failed to fetch override count for customer ${customerId}:`, err);
    }
  };

  // Sort customers by name
  const agentNameMap = useMemo(() => {
    const map = new Map<number, string>();
    agents.forEach((agent) => {
      map.set(agent.id, `${agent.firstName} ${agent.lastName}`);
    });
    return map;
  }, [agents]);

  const filteredCustomers = useMemo(() => {
    // First filter by agent
    let filtered = customers;
    if (agentFilter === 'manager') {
      filtered = customers.filter((customer) => customer.agentId == null);
    } else if (agentFilter !== 'all') {
      const agentId = Number(agentFilter);
      filtered = customers.filter((customer) => customer.agentId === agentId);
    }

    // Then filter by search query
    const query = searchQuery.trim().toLowerCase();
    if (query) {
      filtered = filtered.filter((customer) => {
        const agentName = customer.agentId != null ? agentNameMap.get(customer.agentId) ?? '' : 'me';
        return (
          customer.name.toLowerCase().includes(query) ||
          customer.email.toLowerCase().includes(query) ||
          customer.phoneNumber.includes(query) ||
          customer.city.toLowerCase().includes(query) ||
          agentName.toLowerCase().includes(query)
        );
      });
    }

    return [...filtered].sort((a, b) => {
      const comparison = a.name.localeCompare(b.name);
      return sortDirection === 'ASC' ? comparison : -comparison;
    });
  }, [customers, agentNameMap, searchQuery, sortDirection, agentFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredCustomers.length / pageSize));
  const paginatedCustomers = useMemo(() => {
    const start = currentPage * pageSize;
    const end = start + pageSize;
    return filteredCustomers.slice(start, end);
  }, [filteredCustomers, currentPage, pageSize]);

  useEffect(() => {
    if (currentPage >= totalPages) {
      setCurrentPage(Math.max(0, totalPages - 1));
    }
  }, [currentPage, totalPages]);

  // Fetch override counts for visible customers
  useEffect(() => {
    if (paginatedCustomers.length > 0) {
      paginatedCustomers.forEach(customer => {
        // Only fetch if we don't have data for this customer yet
        if (!customerOverridesData.has(customer.id)) {
          fetchOverrideCount(customer.id);
        }
      });
    }
  }, [paginatedCustomers]);

  const formatPhoneNumber = (phone: string) => {
    if (phone.length >= 3) {
      return `${phone.substring(0, 3)}-${phone.substring(3)}`;
    }
    return phone;
  };

  const formatInitials = (value: string) => {
    if (!value) return 'CU';
    const initials = value
      .split(' ')
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase())
      .join('');
    if (initials.length === 0) {
      return value.charAt(0).toUpperCase();
    }
    return initials.slice(0, 2).padEnd(2, initials.charAt(0));
  };

  const handleViewOverrides = (customerId: string) => {
    navigate(`/dashboard/customers/${customerId}/overrides`);
  };

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setCurrentPage(0); // Reset to first page
  };

  const toggleSortDirection = () => {
    setSortDirection(prev => prev === 'ASC' ? 'DESC' : 'ASC');
    setCurrentPage(0); // Reset to first page
  };

  const handleAgentFilterChange = (agentId: string) => {
    setAgentFilter(agentId);
    setCurrentPage(0);
  };

  const handleCloseModal = () => {
    setIsAddModalOpen(false);
    setFormData({ name: '', phoneNumber: '', email: '', streetAddress: '', city: '' });
    setFormError('');
    setFieldErrors({});
    setShowErrors(false);
  };

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
    setCustomerToEdit(null);
    setEditFormData({ name: '', phoneNumber: '', email: '', streetAddress: '', city: '' });
    setFormError('');
    setFieldErrors({});
    setShowErrors(false);
  };

  const handleEditCustomer = (customer: Customer) => {
    setCustomerToEdit(customer);
    setEditFormData({
      name: customer.name,
      phoneNumber: customer.phoneNumber,
      email: customer.email,
      streetAddress: customer.streetAddress,
      city: customer.city,
    });
    setIsEditModalOpen(true);
  };

  const handleDeleteCustomer = (customer: Customer) => {
    setCustomerToDelete(customer);
    setIsDeleteModalOpen(true);
  };

  const handleCloseDeleteModal = () => {
    setIsDeleteModalOpen(false);
    setCustomerToDelete(null);
    setDeleteConfirmText('');
  };

  const handleConfirmDelete = async () => {
    if (!customerToDelete || deleteConfirmText !== 'I Understand') {
      return;
    }

    try {
      setIsSubmitting(true);
      await customerAPI.deleteCustomer(customerToDelete.id);
      await fetchCustomers();
      handleCloseDeleteModal();
    } catch (err: any) {
      setFormError(err.response?.data?.userMessage || err.message || 'Failed to delete customer');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const sanitizedValue =
      name === 'phoneNumber'
        ? value.replace(/\D/g, '').slice(0, MAX_CUSTOMER_PHONE_LENGTH)
        : name === 'email'
        ? value.slice(0, MAX_CUSTOMER_EMAIL_LENGTH)
        : value;
    setFormData(prev => ({ ...prev, [name]: sanitizedValue }));
    if (showErrors && fieldErrors[name]) {
      setFieldErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleEditInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const sanitizedValue =
      name === 'phoneNumber'
        ? value.replace(/\D/g, '').slice(0, MAX_CUSTOMER_PHONE_LENGTH)
        : name === 'email'
        ? value.slice(0, MAX_CUSTOMER_EMAIL_LENGTH)
        : value;
    setEditFormData(prev => ({ ...prev, [name]: sanitizedValue }));
    if (showErrors && fieldErrors[name]) {
      setFieldErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setShowErrors(true);

    const errors: Record<string, string> = {};
    const nameError = validateRequiredWithMaxLength(formData.name, 'Customer name', MAX_CUSTOMER_NAME_LENGTH);
    if (nameError) {
      errors.name = nameError;
    }

    const phoneError = validatePhoneNumberDigitsOnly(
      formData.phoneNumber,
      MAX_CUSTOMER_PHONE_LENGTH,
      'Phone number'
    );
    if (phoneError) {
      errors.phoneNumber = phoneError;
    }

    const emailError = validateEmail(formData.email);
    if (emailError) {
      errors.email = emailError;
    }

    const streetError = validateRequiredWithMaxLength(
      formData.streetAddress,
      'Street address',
      MAX_CUSTOMER_STREET_LENGTH
    );
    if (streetError) {
      errors.streetAddress = streetError;
    }

    const cityError = validateRequiredWithMaxLength(formData.city, 'City', MAX_CUSTOMER_CITY_LENGTH);
    if (cityError) {
      errors.city = cityError;
    }

    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      return;
    }

    try {
      setIsSubmitting(true);
      const payload = {
        name: formData.name,
        phoneNumber: formData.phoneNumber,
        email: formData.email,
        streetAddress: formData.streetAddress,
        city: formData.city,
      };
      await customerAPI.createCustomer(payload);
      await fetchCustomers();
      handleCloseModal();
    } catch (err: any) {
      setFormError(err.response?.data?.userMessage || err.message || 'Failed to create customer');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setShowErrors(true);

    const errors: Record<string, string> = {};
    const nameError = validateRequiredWithMaxLength(editFormData.name, 'Customer name', MAX_CUSTOMER_NAME_LENGTH);
    if (nameError) {
      errors.name = nameError;
    }

    const phoneError = validatePhoneNumberDigitsOnly(
      editFormData.phoneNumber,
      MAX_CUSTOMER_PHONE_LENGTH,
      'Phone number'
    );
    if (phoneError) {
      errors.phoneNumber = phoneError;
    }

    const emailError = validateEmail(editFormData.email);
    if (emailError) {
      errors.email = emailError;
    }

    const streetError = validateRequiredWithMaxLength(
      editFormData.streetAddress,
      'Street address',
      MAX_CUSTOMER_STREET_LENGTH
    );
    if (streetError) {
      errors.streetAddress = streetError;
    }

    const cityError = validateRequiredWithMaxLength(editFormData.city, 'City', MAX_CUSTOMER_CITY_LENGTH);
    if (cityError) {
      errors.city = cityError;
    }

    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      return;
    }

    if (!customerToEdit) return;

    try {
      setIsSubmitting(true);
      const payload = {
        name: editFormData.name,
        phoneNumber: editFormData.phoneNumber,
        email: editFormData.email,
        streetAddress: editFormData.streetAddress,
        city: editFormData.city,
      };
      await customerAPI.updateCustomer(customerToEdit.id, payload);
      await fetchCustomers();
      handleCloseEditModal();
    } catch (err: any) {
      setFormError(err.response?.data?.userMessage || err.message || 'Failed to update customer');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center space-y-4">
          <svg
            className="animate-spin h-12 w-12 text-indigo-600"
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
          <p className="text-gray-600 font-medium">Loading customers...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="glass-card rounded-3xl p-8 bg-red-50/50 border-red-200">
          <h2 className="text-xl font-bold text-red-800 mb-2">Error Loading Customers</h2>
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-28">
      <div className="glass-card rounded-3xl p-6 md:p-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.35em] text-indigo-500 font-semibold mb-2">
              Customer Management
            </p>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-800 leading-tight">Customers</h1>
            <p className="text-gray-600 text-sm mt-2">
              Manage {customers.length} customers across your sales team.
            </p>
          </div>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="mt-2 md:mt-0 px-6 py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-lg hover:shadow-xl transition-all flex items-center gap-2 border-0"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span>Add Customer</span>
          </button>
        </div>
      </div>

      <div className="glass-card rounded-3xl p-6 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700">Show:</span>
            <select
              value={pageSize}
              onChange={(e) => handlePageSizeChange(Number(e.target.value))}
              className="glass-select px-4 py-2 rounded-xl text-sm font-semibold text-gray-800 cursor-pointer w-24"
            >
              {[5, 10, 20, 50].map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700">Sort:</span>
            <button
              onClick={toggleSortDirection}
              className="glass-button px-4 py-2 rounded-xl text-sm font-semibold text-gray-800 flex items-center gap-2 border-2 border-gray-400/80 hover:border-gray-500 transition-colors justify-center sm:justify-start whitespace-nowrap"
              aria-pressed={sortDirection === 'DESC'}
              aria-label={`Sort customers ${sortDirection === 'ASC' ? 'ascending' : 'descending'}`}
            >
              {sortDirection === 'ASC' ? (
                <>
                  <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                  </svg>
                  <span>A → Z</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 text-indigo-600 rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                  </svg>
                  <span>Z → A</span>
                </>
              )}
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700">Agent:</span>
            <select
              value={agentFilter}
              onChange={(e) => handleAgentFilterChange(e.target.value)}
              className="glass-select px-3 py-2 rounded-xl text-sm font-semibold text-gray-800 cursor-pointer min-w-[12rem]"
            >
              <option value="all">All Agents</option>
              <option value="manager">Me</option>
              {agents.map((agent) => (
                <option key={agent.id} value={agent.id}>
                  {agent.firstName} {agent.lastName}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="relative w-full lg:w-96">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search customers by name, email, phone, or agent…"
            className="glass-input w-full pl-11 pr-10 py-2.5 rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 border border-gray-300"
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

      {filteredCustomers.length === 0 ? (
        <div className="glass-card rounded-3xl p-12 text-center">
          <div className="flex flex-col items-center space-y-4">
            <div className="p-6 rounded-full bg-indigo-100/60">
              <svg className="w-16 h-16 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-800">
              {searchQuery || agentFilter !== 'all' ? 'No customers match your filters' : 'No customers yet'}
            </h2>
            <p className="text-gray-600 max-w-md">
              {searchQuery || agentFilter !== 'all'
                ? 'Try adjusting your search keywords or reset the filters.'
                : "You haven't added any customers yet. Start by creating your first customer."}
            </p>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="glass-button mt-4 px-8 py-3 rounded-xl font-semibold text-gray-800 hover:shadow-lg transition-all"
            >
              Add Customer
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="glass-card rounded-3xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-indigo-50/70 backdrop-blur-sm">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Email</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Phone</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">City</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Agent</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wide">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {paginatedCustomers.map((customer) => {
                    return (
                      <tr key={customer.id} className="hover:bg-indigo-50/50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => handleViewOverrides(customer.id)}
                            className="text-sm font-semibold text-indigo-600 hover:text-indigo-700 transition-colors"
                          >
                            {customer.name}
                          </button>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{customer.email}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                          {formatPhoneNumber(customer.phoneNumber)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{customer.city}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                          {customer.agentId != null
                            ? agentNameMap.get(customer.agentId) ?? 'Unknown agent'
                            : 'Me'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <div className="inline-flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleViewOverrides(customer.id)}
                              className="glass-button p-2 rounded-lg text-sm font-semibold text-gray-800 border border-indigo-200 hover:border-indigo-300 transition-colors inline-flex items-center justify-center"
                              title="View customer"
                            >
                              <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleEditCustomer(customer)}
                              className="glass-button p-2 rounded-lg text-sm font-semibold text-gray-800 border border-indigo-200 hover:border-indigo-300 transition-colors inline-flex items-center justify-center"
                              title="Edit customer"
                            >
                              <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 4H6a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2v-5M18.5 2.5a2.121 2.121 0 113 3L12 15l-4 1 1-4 9.5-9.5z" />
                              </svg>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteCustomer(customer)}
                              className="glass-button p-2 rounded-lg text-sm font-semibold text-red-600 border border-red-200 hover:border-red-300 transition-colors inline-flex items-center justify-center"
                              title="Delete customer"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3" />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <PaginationBar
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            maxWidth="max-w-5xl"
            showCondition={filteredCustomers.length > pageSize}
          />
        </>
      )}

      {/* Add Customer Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="glass-card rounded-3xl p-6 md:p-8 w-full max-w-lg bg-white/85">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-800">Add New Customer</h2>
              <button
                onClick={handleCloseModal}
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

            {formError && (
              <div className="glass-card bg-red-50/50 border-red-200 rounded-xl p-3 mb-4 text-red-600 text-sm">
                {formError}
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                  Customer Name *
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  value={formData.name}
                  onChange={handleInputChange}
                  maxLength={MAX_CUSTOMER_NAME_LENGTH}
                  className={`glass-input w-full px-3 py-2 rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                    showErrors && fieldErrors.name ? 'border-red-400 focus:ring-red-400' : ''
                  }`}
                  placeholder="e.g., John Doe"
                  autoFocus
                />
                {showErrors && fieldErrors.name && (
                  <p className="text-red-500 text-xs mt-1">{fieldErrors.name}</p>
                )}
              </div>

              <div>
                <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number *
                </label>
                <input
                  id="phoneNumber"
                  name="phoneNumber"
                  type="tel"
                  value={formData.phoneNumber}
                  onChange={handleInputChange}
                  maxLength={MAX_CUSTOMER_PHONE_LENGTH}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  className={`glass-input w-full px-3 py-2 rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                    showErrors && fieldErrors.phoneNumber ? 'border-red-400 focus:ring-red-400' : ''
                  }`}
                  placeholder="e.g., 0501234567"
                />
                {showErrors && fieldErrors.phoneNumber && (
                  <p className="text-red-500 text-xs mt-1">{fieldErrors.phoneNumber}</p>
                )}
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address *
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  maxLength={MAX_CUSTOMER_EMAIL_LENGTH}
                  className={`glass-input w-full px-3 py-2 rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                    showErrors && fieldErrors.email ? 'border-red-400 focus:ring-red-400' : ''
                  }`}
                  placeholder="e.g., john.doe@example.com"
                />
                {showErrors && fieldErrors.email && (
                  <p className="text-red-500 text-xs mt-1">{fieldErrors.email}</p>
                )}
              </div>

              <div>
                <label htmlFor="streetAddress" className="block text-sm font-medium text-gray-700 mb-2">
                  Street Address *
                </label>
                <input
                  id="streetAddress"
                  name="streetAddress"
                  type="text"
                  value={formData.streetAddress}
                  onChange={handleInputChange}
                  maxLength={MAX_CUSTOMER_STREET_LENGTH}
                  className={`glass-input w-full px-3 py-2 rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                    showErrors && fieldErrors.streetAddress ? 'border-red-400 focus:ring-red-400' : ''
                  }`}
                  placeholder="e.g., 123 Main Street"
                />
                {showErrors && fieldErrors.streetAddress && (
                  <p className="text-red-500 text-xs mt-1">{fieldErrors.streetAddress}</p>
                )}
              </div>

              <div>
                <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-2">
                  City *
                </label>
                <input
                  id="city"
                  name="city"
                  type="text"
                  value={formData.city}
                  onChange={handleInputChange}
                  maxLength={MAX_CUSTOMER_CITY_LENGTH}
                  className={`glass-input w-full px-3 py-2 rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                    showErrors && fieldErrors.city ? 'border-red-400 focus:ring-red-400' : ''
                  }`}
                  placeholder="e.g., Tel Aviv"
                />
                {showErrors && fieldErrors.city && (
                  <p className="text-red-500 text-xs mt-1">{fieldErrors.city}</p>
                )}
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  disabled={isSubmitting}
                  className="glass-button flex-1 py-2 px-4 rounded-xl text-sm font-semibold text-gray-800 bg-red-100/60 hover:bg-red-200/70 border-red-500 hover:border-red-600 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="glass-button flex-1 py-2 px-4 rounded-xl text-sm font-semibold text-gray-800 bg-green-100/60 hover:bg-green-200/70 border-green-600 hover:border-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                >
                  {isSubmitting ? (
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
                    <span>Create Customer</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Customer Modal */}
      {isEditModalOpen && customerToEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="glass-card rounded-3xl p-6 md:p-8 w-full max-w-lg bg-white/85">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-800">Edit Customer</h2>
              <button
                onClick={handleCloseEditModal}
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

            {formError && (
              <div className="glass-card bg-red-50/50 border-red-200 rounded-xl p-3 mb-4 text-red-600 text-sm">
                {formError}
              </div>
            )}

            <form onSubmit={handleEditSubmit} noValidate className="space-y-4">
              <div>
                <label htmlFor="editName" className="block text-sm font-medium text-gray-700 mb-2">
                  Customer Name *
                </label>
                <input
                  id="editName"
                  name="name"
                  type="text"
                  value={editFormData.name}
                  onChange={handleEditInputChange}
                  maxLength={MAX_CUSTOMER_NAME_LENGTH}
                  className={`glass-input w-full px-3 py-2 rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                    showErrors && fieldErrors.name ? 'border-red-400 focus:ring-red-400' : ''
                  }`}
                  placeholder="e.g., John Doe"
                  autoFocus
                />
                {showErrors && fieldErrors.name && (
                  <p className="text-red-500 text-xs mt-1">{fieldErrors.name}</p>
                )}
              </div>

              <div>
                <label htmlFor="editPhoneNumber" className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number *
                </label>
                <input
                  id="editPhoneNumber"
                  name="phoneNumber"
                  type="tel"
                  value={editFormData.phoneNumber}
                  onChange={handleEditInputChange}
                  maxLength={MAX_CUSTOMER_PHONE_LENGTH}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  className={`glass-input w-full px-3 py-2 rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                    showErrors && fieldErrors.phoneNumber ? 'border-red-400 focus:ring-red-400' : ''
                  }`}
                  placeholder="e.g., 0501234567"
                />
                {showErrors && fieldErrors.phoneNumber && (
                  <p className="text-red-500 text-xs mt-1">{fieldErrors.phoneNumber}</p>
                )}
              </div>

              <div>
                <label htmlFor="editEmail" className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address *
                </label>
                <input
                  id="editEmail"
                  name="email"
                  type="email"
                  value={editFormData.email}
                  onChange={handleEditInputChange}
                  maxLength={MAX_CUSTOMER_EMAIL_LENGTH}
                  className={`glass-input w-full px-3 py-2 rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                    showErrors && fieldErrors.email ? 'border-red-400 focus:ring-red-400' : ''
                  }`}
                  placeholder="e.g., john.doe@example.com"
                />
                {showErrors && fieldErrors.email && (
                  <p className="text-red-500 text-xs mt-1">{fieldErrors.email}</p>
                )}
              </div>

              <div>
                <label htmlFor="editStreetAddress" className="block text-sm font-medium text-gray-700 mb-2">
                  Street Address *
                </label>
                <input
                  id="editStreetAddress"
                  name="streetAddress"
                  type="text"
                  value={editFormData.streetAddress}
                  onChange={handleEditInputChange}
                  maxLength={MAX_CUSTOMER_STREET_LENGTH}
                  className={`glass-input w-full px-3 py-2 rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                    showErrors && fieldErrors.streetAddress ? 'border-red-400 focus:ring-red-400' : ''
                  }`}
                  placeholder="e.g., 123 Main Street"
                />
                {showErrors && fieldErrors.streetAddress && (
                  <p className="text-red-500 text-xs mt-1">{fieldErrors.streetAddress}</p>
                )}
              </div>

              <div>
                <label htmlFor="editCity" className="block text-sm font-medium text-gray-700 mb-2">
                  City *
                </label>
                <input
                  id="editCity"
                  name="city"
                  type="text"
                  value={editFormData.city}
                  onChange={handleEditInputChange}
                  maxLength={MAX_CUSTOMER_CITY_LENGTH}
                  className={`glass-input w-full px-3 py-2 rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                    showErrors && fieldErrors.city ? 'border-red-400 focus:ring-red-400' : ''
                  }`}
                  placeholder="e.g., Tel Aviv"
                />
                {showErrors && fieldErrors.city && (
                  <p className="text-red-500 text-xs mt-1">{fieldErrors.city}</p>
                )}
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={handleCloseEditModal}
                  disabled={isSubmitting}
                  className="glass-button flex-1 py-2 px-4 rounded-xl text-sm font-semibold text-gray-800 bg-red-100/60 hover:bg-red-200/70 border-red-500 hover:border-red-600 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="glass-button flex-1 py-2 px-4 rounded-xl text-sm font-semibold text-gray-800 bg-green-100/60 hover:bg-green-200/70 border-green-600 hover:border-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                >
                  {isSubmitting ? (
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
                      <span>Updating...</span>
                    </>
                  ) : (
                    <span>Update Customer</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && customerToDelete && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white/85 backdrop-blur-xl rounded-3xl p-6 max-w-md w-full shadow-2xl border border-white/20">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Delete Customer</h2>
            
            <div className="space-y-4">
              <div className="glass-card rounded-xl p-4 bg-red-50/50 border-red-200">
                <p className="text-sm text-gray-700 mb-2">
                  You are about to delete customer:
                </p>
                <p className="font-bold text-gray-900">{customerToDelete.name}</p>
                <p className="text-sm text-gray-600">{customerToDelete.email}</p>
                <p className="text-sm text-red-600 mt-3">
                  ⚠️ This action cannot be undone. All orders and product overrides for this customer will be affected.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Type "I Understand" to confirm deletion:
                </label>
                <input
                  type="text"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  className="w-full px-3 py-2 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-indigo-500"
                  placeholder="I Understand"
                />
              </div>

              {formError && (
                <div className="glass-card rounded-xl p-3 bg-red-50/50 border-red-200">
                  <p className="text-red-600 text-sm">{formError}</p>
                </div>
              )}

              <div className="flex space-x-3 pt-2">
                <button
                  type="button"
                  onClick={handleCloseDeleteModal}
                  disabled={isSubmitting}
                  className="glass-button flex-1 py-2 px-4 rounded-xl text-sm font-semibold text-gray-800 bg-gray-100/60 hover:bg-gray-200/70 border-gray-500 hover:border-gray-600 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  disabled={deleteConfirmText !== 'I Understand' || isSubmitting}
                  className="glass-button flex-1 py-2 px-4 rounded-xl text-sm font-semibold text-white bg-red-600 hover:bg-red-700 border-red-700 hover:border-red-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                >
                  {isSubmitting ? (
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
                      <span>Deleting...</span>
                    </>
                  ) : (
                    <span>Delete Customer</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

