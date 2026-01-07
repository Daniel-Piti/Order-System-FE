import { useEffect, useState, useMemo } from 'react';
import Spinner from '../components/Spinner';
import CloseButton from '../components/CloseButton';
import { useNavigate } from 'react-router-dom';
import { customerAPI, agentAPI } from '../services/api';
import type { Customer, Agent } from '../services/api';
import PaginationBar from '../components/PaginationBar';
import {
  validateEmail,
  validateRequiredWithMaxLength,
  validatePhoneNumberDigitsOnly,
  validateDiscountPercentage,
} from '../utils/validation';

const MAX_CUSTOMER_NAME_LENGTH = 50;
const MAX_CUSTOMER_PHONE_LENGTH = 10;
const MAX_CUSTOMER_STREET_LENGTH = 120;
const MAX_CUSTOMER_CITY_LENGTH = 60;
const MAX_CUSTOMER_EMAIL_LENGTH = 100;

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
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
    discountPercentage: 0,
  });
  const [editFormData, setEditFormData] = useState({
    name: '',
    phoneNumber: '',
    email: '',
    streetAddress: '',
    city: '',
    discountPercentage: 0,
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

  const formatPhoneNumber = (phone: string) => {
    if (phone.length >= 3) {
      return `${phone.substring(0, 3)}-${phone.substring(3)}`;
    }
    return phone;
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
    setFormData({ name: '', phoneNumber: '', email: '', streetAddress: '', city: '', discountPercentage: 0 });
    setFormError('');
    setFieldErrors({});
    setShowErrors(false);
  };

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
    setCustomerToEdit(null);
    setEditFormData({ name: '', phoneNumber: '', email: '', streetAddress: '', city: '', discountPercentage: 0 });
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
      discountPercentage: customer.discountPercentage,
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
    if (!customerToDelete || deleteConfirmText !== 'אני מבין') {
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
    let sanitizedValue: string | number = value;
    
    if (name === 'phoneNumber') {
      sanitizedValue = value.replace(/\D/g, '').slice(0, MAX_CUSTOMER_PHONE_LENGTH);
    } else if (name === 'email') {
      sanitizedValue = value.slice(0, MAX_CUSTOMER_EMAIL_LENGTH);
    } else if (name === 'discountPercentage') {
      const numValue = value === '' ? 0 : Math.max(0, Math.min(100, parseInt(value, 10) || 0));
      sanitizedValue = numValue;
    }
    
    setFormData(prev => ({ ...prev, [name]: sanitizedValue }));
    if (showErrors && fieldErrors[name]) {
      setFieldErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleEditInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    let sanitizedValue: string | number = value;
    
    if (name === 'phoneNumber') {
      sanitizedValue = value.replace(/\D/g, '').slice(0, MAX_CUSTOMER_PHONE_LENGTH);
    } else if (name === 'email') {
      sanitizedValue = value.slice(0, MAX_CUSTOMER_EMAIL_LENGTH);
    } else if (name === 'discountPercentage') {
      const numValue = value === '' ? 0 : Math.max(0, Math.min(100, parseInt(value, 10) || 0));
      sanitizedValue = numValue;
    }
    
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
    const nameError = validateRequiredWithMaxLength(formData.name, 'שם הלקוח', MAX_CUSTOMER_NAME_LENGTH);
    if (nameError) {
      errors.name = nameError;
    }

    const phoneError = validatePhoneNumberDigitsOnly(
      formData.phoneNumber,
      MAX_CUSTOMER_PHONE_LENGTH,
      'מספר טלפון'
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
      'כתובת',
      MAX_CUSTOMER_STREET_LENGTH
    );
    if (streetError) {
      errors.streetAddress = streetError;
    }

    const cityError = validateRequiredWithMaxLength(formData.city, 'עיר', MAX_CUSTOMER_CITY_LENGTH);
    if (cityError) {
      errors.city = cityError;
    }

    const discountError = validateDiscountPercentage(formData.discountPercentage, 'אחוז הנחה');
    if (discountError) {
      errors.discountPercentage = discountError;
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
        discountPercentage: formData.discountPercentage,
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
    const nameError = validateRequiredWithMaxLength(editFormData.name, 'שם הלקוח', MAX_CUSTOMER_NAME_LENGTH);
    if (nameError) {
      errors.name = nameError;
    }

    const phoneError = validatePhoneNumberDigitsOnly(
      editFormData.phoneNumber,
      MAX_CUSTOMER_PHONE_LENGTH,
      'מספר טלפון'
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
      'כתובת',
      MAX_CUSTOMER_STREET_LENGTH
    );
    if (streetError) {
      errors.streetAddress = streetError;
    }

    const cityError = validateRequiredWithMaxLength(editFormData.city, 'עיר', MAX_CUSTOMER_CITY_LENGTH);
    if (cityError) {
      errors.city = cityError;
    }

    const discountError = validateDiscountPercentage(editFormData.discountPercentage, 'אחוז הנחה');
    if (discountError) {
      errors.discountPercentage = discountError;
    }

    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      return;
    }

    if (!customerToEdit) return;

    // Check if anything has changed
    const hasChanges =
      editFormData.name !== customerToEdit.name ||
      editFormData.phoneNumber !== customerToEdit.phoneNumber ||
      editFormData.email !== customerToEdit.email ||
      editFormData.streetAddress !== customerToEdit.streetAddress ||
      editFormData.city !== customerToEdit.city ||
      editFormData.discountPercentage !== customerToEdit.discountPercentage;

    // If nothing changed, just close the modal without making an API call
    if (!hasChanges) {
      handleCloseEditModal();
      return;
    }

    try {
      setIsSubmitting(true);
      const payload = {
        name: editFormData.name,
        phoneNumber: editFormData.phoneNumber,
        email: editFormData.email,
        streetAddress: editFormData.streetAddress,
        city: editFormData.city,
        discountPercentage: editFormData.discountPercentage,
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
          <p className="text-gray-600 font-medium">... טוען לקוחות</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto" dir="rtl">
        <div className="glass-card rounded-3xl p-8 bg-red-50/50 border-red-200">
          <h2 className="text-xl font-bold text-red-800 mb-2">שגיאה בטעינת לקוחות</h2>
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-28" dir="rtl">
      <div className="glass-card rounded-3xl p-6 md:p-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-800 leading-tight">לקוחות</h1>
            <p className="text-gray-600 text-sm mt-2">
              נהל {customers.length} לקוחות ברחבי צוות המכירות שלך.
            </p>
          </div>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="mt-2 md:mt-0 btn-add-indigo"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span>הוסף לקוח</span>
          </button>
        </div>
      </div>

      <div className="glass-card rounded-3xl p-6 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex flex-wrap items-center gap-4 justify-end">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700">הצג:</span>
            <select
              value={pageSize}
              onChange={(e) => handlePageSizeChange(Number(e.target.value))}
              className="glass-select pl-3 pr-8 py-2 rounded-xl text-sm font-semibold text-gray-800 cursor-pointer w-20"
              dir="ltr"
            >
              {[5, 10, 20, 50].map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700">מיין:</span>
            <button
              onClick={toggleSortDirection}
              className="glass-button px-4 py-2 rounded-xl text-sm font-semibold text-gray-800 flex items-center gap-2 border-2 border-gray-400/80 hover:border-gray-500 transition-colors justify-center sm:justify-start whitespace-nowrap"
              aria-pressed={sortDirection === 'DESC'}
              aria-label={`Sort customers ${sortDirection === 'ASC' ? 'ascending' : 'descending'}`}
            >
              {sortDirection === 'ASC' ? (
                <>
                  <span>א ← ת</span>
                  <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </>
              ) : (
                <>
                  <span>א → ת</span>
                  <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                  </svg>
                </>
              )}
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700">סוכן:</span>
            <select
              value={agentFilter}
              onChange={(e) => handleAgentFilterChange(e.target.value)}
              className="glass-select pl-8 pr-4 py-2 rounded-xl text-sm font-semibold text-gray-800 cursor-pointer min-w-[12rem]"
              dir="ltr"
            >
              <option value="all">הכל</option>
              <option value="manager">אני</option>
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
            maxLength={100}
            placeholder="חפש לקוחות לפי שם, אימייל, טלפון או סוכן..."
            className="glass-input w-full pr-11 pl-10 py-2.5 rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 border border-gray-300"
            dir="rtl"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
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
              {searchQuery || agentFilter !== 'all' ? 'אין לקוחות התואמים למסננים שלך' : 'אין לקוחות עדיין'}
            </h2>
            <p className="text-gray-600 max-w-md">
              {searchQuery || agentFilter !== 'all'
                ? 'נסה להתאים את מילות החיפוש או לאפס את המסננים.'
                : 'עדיין לא הוספת לקוחות. התחל ביצירת הלקוח הראשון שלך.'}
            </p>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="glass-button mt-4 px-8 py-3 rounded-xl font-semibold text-gray-800 hover:shadow-lg transition-all"
            >
              הוסף לקוח
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
                    <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wide w-48 border-l border-gray-200">שם</th>
                    <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wide w-64 border-l border-gray-200">אימייל</th>
                    <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wide w-32 border-l border-gray-200">טלפון</th>
                    <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wide w-40 border-l border-gray-200">עיר</th>
                    <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wide w-40 border-l border-gray-200">סוכן</th>
                    <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wide w-28 border-l border-gray-200">אחוז הנחה</th>
                    <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wide w-32 border-l border-gray-200">פעולות</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {paginatedCustomers.map((customer) => {
                    return (
                      <tr key={customer.id} className="hover:bg-indigo-50/50 transition-colors">
                        <td className="px-6 py-4 text-right border-l border-gray-200">
                          <span className="text-sm font-semibold text-gray-900 truncate block max-w-[12rem]" title={customer.name}>
                            {customer.name}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-700 text-right border-l border-gray-200">
                          <span className="truncate block max-w-[16rem]" title={customer.email}>
                            {customer.email}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 text-right border-l border-gray-200">
                          {formatPhoneNumber(customer.phoneNumber)}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-700 text-right border-l border-gray-200">
                          <span className="truncate block max-w-[10rem]" title={customer.city}>
                            {customer.city}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-700 text-right border-l border-gray-200">
                          <span className="truncate block max-w-[10rem]" title={customer.agentId != null ? (agentNameMap.get(customer.agentId) ?? 'סוכן לא ידוע') : 'אני'}>
                            {customer.agentId != null
                              ? agentNameMap.get(customer.agentId) ?? 'סוכן לא ידוע'
                              : 'אני'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 text-center font-medium border-l border-gray-200">
                          {customer.discountPercentage}%
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-left border-l border-gray-200">
                          <div className="inline-flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleEditCustomer(customer)}
                              className="glass-button p-2 rounded-lg text-sm font-semibold text-gray-800 border border-indigo-200 hover:border-indigo-300 transition-colors inline-flex items-center justify-center"
                              title="ערוך לקוח"
                            >
                              <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 4H6a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2v-5M18.5 2.5a2.121 2.121 0 113 3L12 15l-4 1 1-4 9.5-9.5z" />
                              </svg>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteCustomer(customer)}
                              className="glass-button p-2 rounded-lg text-sm font-semibold text-red-600 border border-red-200 hover:border-red-300 transition-colors inline-flex items-center justify-center"
                              title="מחק לקוח"
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
        </>
      )}

      {/* Pagination Controls - Bottom */}
      <PaginationBar
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
        maxWidth="max-w-5xl"
        showCondition={filteredCustomers.length > pageSize}
        rtl={true}
      />

      {/* Add Customer Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" dir="rtl" style={{ margin: 0, top: 0 }}>
          <div className="glass-card rounded-3xl p-6 md:p-8 w-full max-w-lg bg-white/90 backdrop-blur-xl shadow-xl">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-semibold text-gray-900">הוסף לקוח חדש</h2>
              <CloseButton onClick={handleCloseModal} />
            </div>

            {formError && (
              <div className="glass-card bg-red-50/80 border border-red-200/60 rounded-xl p-3 mb-4 text-red-600 text-sm">
                {formError}
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate className="space-y-3.5">
              <div>
                <label htmlFor="name" className="form-label">
                  שם הלקוח *
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  value={formData.name}
                  onChange={handleInputChange}
                  maxLength={MAX_CUSTOMER_NAME_LENGTH}
                  className={`form-input text-center ${showErrors && fieldErrors.name ? 'form-input-error' : ''}`}
                  placeholder="לדוגמה: יוחנן כהן"
                  autoFocus
                />
                {showErrors && fieldErrors.name && (
                  <p className="text-red-500 text-xs mt-1">{fieldErrors.name}</p>
                )}
              </div>

              <div>
                <label htmlFor="phoneNumber" className="form-label">
                  מספר טלפון *
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
                  className={`form-input text-center ${showErrors && fieldErrors.phoneNumber ? 'form-input-error' : ''}`}
                  placeholder="לדוגמה: 0501234567"
                  dir="ltr"
                />
                {showErrors && fieldErrors.phoneNumber && (
                  <p className="text-red-500 text-xs mt-1">{fieldErrors.phoneNumber}</p>
                )}
              </div>

              <div>
                <label htmlFor="email" className="form-label">
                  כתובת אימייל *
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  maxLength={MAX_CUSTOMER_EMAIL_LENGTH}
                  className={`form-input text-center ${showErrors && fieldErrors.email ? 'form-input-error' : ''}`}
                  placeholder="לדוגמה: yohanan@example.com"
                  dir="ltr"
                />
                {showErrors && fieldErrors.email && (
                  <p className="text-red-500 text-xs mt-1">{fieldErrors.email}</p>
                )}
              </div>

              <div>
                <label htmlFor="streetAddress" className="form-label">
                  כתובת *
                </label>
                <input
                  id="streetAddress"
                  name="streetAddress"
                  type="text"
                  value={formData.streetAddress}
                  onChange={handleInputChange}
                  maxLength={MAX_CUSTOMER_STREET_LENGTH}
                  className={`form-input text-center ${showErrors && fieldErrors.streetAddress ? 'form-input-error' : ''}`}
                  placeholder="לדוגמה: רחוב הרצל 123"
                />
                {showErrors && fieldErrors.streetAddress && (
                  <p className="text-red-500 text-xs mt-1">{fieldErrors.streetAddress}</p>
                )}
              </div>

              <div>
                <label htmlFor="city" className="form-label">
                  עיר *
                </label>
                <input
                  id="city"
                  name="city"
                  type="text"
                  value={formData.city}
                  onChange={handleInputChange}
                  maxLength={MAX_CUSTOMER_CITY_LENGTH}
                  className={`form-input text-center ${showErrors && fieldErrors.city ? 'form-input-error' : ''}`}
                  placeholder="לדוגמה: תל אביב"
                />
                {showErrors && fieldErrors.city && (
                  <p className="text-red-500 text-xs mt-1">{fieldErrors.city}</p>
                )}
              </div>

              <div>
                <label htmlFor="discountPercentage" className="block text-xs font-medium text-gray-700 mb-1.5">
                  אחוז הנחה
                </label>
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-medium text-gray-500 w-6">0%</span>
                    <div className="flex-1 relative h-2.5">
                      <div className="absolute top-0 left-0 w-full h-full rounded-lg bg-gray-200 -z-10" />
                      <div 
                        className="absolute top-0 right-0 h-full rounded-lg bg-indigo-600"
                        style={{
                          width: `${formData.discountPercentage}%`
                        }}
                      />
                      <input
                        id="discountPercentage"
                        name="discountPercentage"
                        type="range"
                        min="0"
                        max="100"
                        value={formData.discountPercentage}
                        onChange={handleInputChange}
                        className="absolute top-0 left-0 w-full h-full bg-transparent appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-indigo-600 [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:transition-all [&::-webkit-slider-thumb]:duration-200 [&:hover::-webkit-slider-thumb]:w-6 [&:hover::-webkit-slider-thumb]:h-6 [&:active::-webkit-slider-thumb]:w-7 [&:active::-webkit-slider-thumb]:h-7 [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-indigo-600 [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:shadow-md [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white [&::-moz-range-thumb]:border-none [&::-moz-range-thumb]:transition-all [&::-moz-range-thumb]:duration-200 [&:hover::-moz-range-thumb]:w-6 [&:hover::-moz-range-thumb]:h-6 [&:active::-moz-range-thumb]:w-7 [&:active::-moz-range-thumb]:h-7"
                      />
                    </div>
                    <span className="text-xs font-medium text-gray-500 w-8 text-right">100%</span>
                    <div className="flex items-center gap-1.5 bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-200 min-w-[4.5rem]">
                      <input
                        name="discountPercentage"
                        type="number"
                        min="0"
                        max="100"
                        value={formData.discountPercentage}
                        onChange={handleInputChange}
                        className={`w-12 px-1 py-0.5 text-sm font-semibold text-indigo-700 bg-transparent border-none focus:outline-none focus:ring-0 text-center ${
                          showErrors && fieldErrors.discountPercentage ? 'text-red-600' : ''
                        }`}
                        placeholder="0"
                      />
                      <span className="text-sm font-medium text-indigo-600">%</span>
                    </div>
                  </div>
                  {showErrors && fieldErrors.discountPercentage && (
                    <p className="text-red-500 text-xs ml-9">{fieldErrors.discountPercentage}</p>
                  )}
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  disabled={isSubmitting}
                  className="btn-cancel"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  <span>ביטול</span>
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn-save"
                >
                  {isSubmitting ? (
                    <>
                      <Spinner size="sm" />
                      <span>יוצר...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>צור לקוח</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Customer Modal */}
      {isEditModalOpen && customerToEdit && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" dir="rtl" style={{ margin: 0, top: 0 }}>
          <div className="glass-card rounded-3xl p-6 md:p-8 w-full max-w-lg max-h-[90vh] overflow-y-auto bg-white/90 backdrop-blur-xl shadow-xl">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-semibold text-gray-900">ערוך לקוח</h2>
              <CloseButton onClick={handleCloseEditModal} />
            </div>

            {formError && (
              <div className="mb-4 p-3 bg-red-50/80 border border-red-200/60 rounded-xl text-red-600 text-sm">
                {formError}
              </div>
            )}

            <form onSubmit={handleEditSubmit} noValidate className="space-y-3.5">
              <div>
                <label htmlFor="editName" className="form-label">
                  שם הלקוח *
                </label>
                <input
                  id="editName"
                  name="name"
                  type="text"
                  value={editFormData.name}
                  onChange={handleEditInputChange}
                  maxLength={MAX_CUSTOMER_NAME_LENGTH}
                  className={`form-input text-center ${showErrors && fieldErrors.name ? 'form-input-error' : ''}`}
                  placeholder="לדוגמה: יוחנן כהן"
                  autoFocus
                />
                {showErrors && fieldErrors.name && (
                  <p className="text-red-500 text-xs mt-1">{fieldErrors.name}</p>
                )}
              </div>

              <div>
                <label htmlFor="editPhoneNumber" className="form-label">
                  מספר טלפון *
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
                  className={`form-input text-center ${showErrors && fieldErrors.phoneNumber ? 'form-input-error' : ''}`}
                  placeholder="לדוגמה: 0501234567"
                  dir="ltr"
                />
                {showErrors && fieldErrors.phoneNumber && (
                  <p className="text-red-500 text-xs mt-1">{fieldErrors.phoneNumber}</p>
                )}
              </div>

              <div>
                <label htmlFor="editEmail" className="form-label">
                  כתובת אימייל *
                </label>
                <input
                  id="editEmail"
                  name="email"
                  type="email"
                  value={editFormData.email}
                  onChange={handleEditInputChange}
                  maxLength={MAX_CUSTOMER_EMAIL_LENGTH}
                  className={`form-input text-center ${showErrors && fieldErrors.email ? 'form-input-error' : ''}`}
                  placeholder="לדוגמה: yohanan@example.com"
                  dir="ltr"
                />
                {showErrors && fieldErrors.email && (
                  <p className="text-red-500 text-xs mt-1">{fieldErrors.email}</p>
                )}
              </div>

              <div>
                <label htmlFor="editStreetAddress" className="form-label">
                  כתובת *
                </label>
                <input
                  id="editStreetAddress"
                  name="streetAddress"
                  type="text"
                  value={editFormData.streetAddress}
                  onChange={handleEditInputChange}
                  maxLength={MAX_CUSTOMER_STREET_LENGTH}
                  className={`form-input text-center ${showErrors && fieldErrors.streetAddress ? 'form-input-error' : ''}`}
                  placeholder="לדוגמה: רחוב הרצל 123"
                />
                {showErrors && fieldErrors.streetAddress && (
                  <p className="text-red-500 text-xs mt-1">{fieldErrors.streetAddress}</p>
                )}
              </div>

              <div>
                <label htmlFor="editCity" className="form-label">
                  עיר *
                </label>
                <input
                  id="editCity"
                  name="city"
                  type="text"
                  value={editFormData.city}
                  onChange={handleEditInputChange}
                  maxLength={MAX_CUSTOMER_CITY_LENGTH}
                  className={`form-input text-center ${showErrors && fieldErrors.city ? 'form-input-error' : ''}`}
                  placeholder="לדוגמה: תל אביב"
                />
                {showErrors && fieldErrors.city && (
                  <p className="text-red-500 text-xs mt-1">{fieldErrors.city}</p>
                )}
              </div>

              <div>
                <label htmlFor="editDiscountPercentage" className="block text-sm font-medium text-gray-700 mb-2">
                  אחוז הנחה
                </label>
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-medium text-gray-500 w-6">0%</span>
                    <div className="flex-1 relative h-2.5">
                      <div className="absolute top-0 left-0 w-full h-full rounded-lg bg-gray-200 -z-10" />
                      <div 
                        className="absolute top-0 right-0 h-full rounded-lg bg-indigo-600"
                        style={{
                          width: `${editFormData.discountPercentage}%`
                        }}
                      />
                      <input
                        id="editDiscountPercentage"
                        name="discountPercentage"
                        type="range"
                        min="0"
                        max="100"
                        value={editFormData.discountPercentage}
                        onChange={handleEditInputChange}
                        className="absolute top-0 left-0 w-full h-full bg-transparent appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-indigo-600 [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:transition-all [&::-webkit-slider-thumb]:duration-200 [&:hover::-webkit-slider-thumb]:w-6 [&:hover::-webkit-slider-thumb]:h-6 [&:active::-webkit-slider-thumb]:w-7 [&:active::-webkit-slider-thumb]:h-7 [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-indigo-600 [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:shadow-md [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white [&::-moz-range-thumb]:border-none [&::-moz-range-thumb]:transition-all [&::-moz-range-thumb]:duration-200 [&:hover::-moz-range-thumb]:w-6 [&:hover::-moz-range-thumb]:h-6 [&:active::-moz-range-thumb]:w-7 [&:active::-moz-range-thumb]:h-7"
                      />
                    </div>
                    <span className="text-xs font-medium text-gray-500 w-8 text-right">100%</span>
                    <div className="flex items-center gap-1.5 bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-200 min-w-[4.5rem]">
                      <input
                        name="discountPercentage"
                        type="number"
                        min="0"
                        max="100"
                        value={editFormData.discountPercentage}
                        onChange={handleEditInputChange}
                        className={`w-12 px-1 py-0.5 text-sm font-semibold text-indigo-700 bg-transparent border-none focus:outline-none focus:ring-0 text-center ${
                          showErrors && fieldErrors.discountPercentage ? 'text-red-600' : ''
                        }`}
                        placeholder="0"
                      />
                      <span className="text-sm font-medium text-indigo-600">%</span>
                    </div>
                  </div>
                  {showErrors && fieldErrors.discountPercentage && (
                    <p className="text-red-500 text-xs ml-9">{fieldErrors.discountPercentage}</p>
                  )}
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={handleCloseEditModal}
                  disabled={isSubmitting}
                  className="btn-cancel"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  <span>ביטול</span>
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn-save"
                >
                  {isSubmitting ? (
                    <>
                      <Spinner size="sm" />
                      <span>מעדכן...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>עדכן לקוח</span>
                    </>
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
          <div className="bg-white/85 backdrop-blur-xl rounded-3xl p-6 max-w-md w-full shadow-2xl border border-white/20" dir="rtl">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">מחק לקוח</h2>
            
            <div className="space-y-4">
              <div className="glass-card rounded-xl p-4 bg-red-50/50 border-red-200">
                <p className="text-sm text-gray-700 mb-2">
                  אתה עומד למחוק את הלקוח:
                </p>
                <p className="font-bold text-gray-900">{customerToDelete.name}</p>
                <p className="text-sm text-gray-600">{customerToDelete.email}</p>
                <p className="text-sm text-red-600 mt-3">
                  ⚠️ פעולה זו לא ניתנת לביטול. כל ההזמנות ומחירים מיוחדים עבור לקוח זה יושפעו.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  הקלד "אני מבין" כדי לאשר מחיקה:
                </label>
                <input
                  type="text"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  className="w-full px-3 py-2 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-indigo-500"
                  placeholder="אני מבין"
                />
              </div>

              {formError && (
                <div className="glass-card rounded-xl p-3 bg-red-50/50 border-red-200">
                  <p className="text-red-600 text-sm">{formError}</p>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleCloseDeleteModal}
                  disabled={isSubmitting}
                  className="glass-button flex-1 py-2 px-4 rounded-xl text-sm font-semibold text-gray-800 bg-gray-100/60 hover:bg-gray-200/70 border-gray-500 hover:border-gray-600 disabled:opacity-50"
                >
                  ביטול
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  disabled={deleteConfirmText !== 'אני מבין' || isSubmitting}
                  className="glass-button flex-1 py-2 px-4 rounded-xl text-sm font-semibold text-white bg-red-600 hover:bg-red-700 border-red-700 hover:border-red-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <Spinner size="sm" />
                      <span>מוחק...</span>
                    </>
                  ) : (
                    <span>מחק לקוח</span>
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

