import { useState, useEffect } from 'react';
import {
  validateRequiredWithMaxLength,
  validatePhoneNumberDigitsOnly,
  validateEmail,
  type ValidationErrors,
  validateFields,
} from '../utils/validation';
import { agentAPI, type CustomerRequest, type Customer } from '../services/api';

const MAX_NAME_LENGTH = 50;
const MAX_PHONE_LENGTH = 10;
const MAX_EMAIL_LENGTH = 100;
const MAX_STREET_LENGTH = 120;
const MAX_CITY_LENGTH = 60;

interface AgentAddCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (customer: Customer) => void;
}

export default function AgentAddCustomerModal({ isOpen, onClose, onSuccess }: AgentAddCustomerModalProps) {
  const [formData, setFormData] = useState<CustomerRequest>({
    name: '',
    phoneNumber: '',
    email: '',
    streetAddress: '',
    city: '',
  });
  const [fieldErrors, setFieldErrors] = useState<ValidationErrors>({});
  const [showErrors, setShowErrors] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setFormData({
        name: '',
        phoneNumber: '',
        email: '',
        streetAddress: '',
        city: '',
      });
      setFieldErrors({});
      setShowErrors(false);
      setError('');
      setIsSubmitting(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    let sanitized = value;

    switch (name) {
      case 'name':
        sanitized = value.slice(0, MAX_NAME_LENGTH);
        break;
      case 'phoneNumber':
        sanitized = value.replace(/\D/g, '').slice(0, MAX_PHONE_LENGTH);
        break;
      case 'email':
        sanitized = value.slice(0, MAX_EMAIL_LENGTH);
        break;
      case 'streetAddress':
        sanitized = value.slice(0, MAX_STREET_LENGTH);
        break;
      case 'city':
        sanitized = value.slice(0, MAX_CITY_LENGTH);
        break;
      default:
        sanitized = value;
    }

    setFormData((prev) => ({ ...prev, [name]: sanitized }));
    if (showErrors && fieldErrors[name]) {
      setFieldErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const result = validateFields([
      { field: 'name', error: validateRequiredWithMaxLength(formData.name, 'Customer name', MAX_NAME_LENGTH) },
      {
        field: 'phoneNumber',
        error: validatePhoneNumberDigitsOnly(formData.phoneNumber, MAX_PHONE_LENGTH, 'Phone number'),
      },
      { field: 'email', error: validateEmail(formData.email) },
      {
        field: 'streetAddress',
        error: validateRequiredWithMaxLength(formData.streetAddress, 'Street address', MAX_STREET_LENGTH),
      },
      { field: 'city', error: validateRequiredWithMaxLength(formData.city, 'City', MAX_CITY_LENGTH) },
    ]);

    setFieldErrors(result.errors);
    return result.isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setShowErrors(true);

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const newCustomer = await agentAPI.createCustomerForAgent(formData);
      onSuccess(newCustomer);
      handleClose();
    } catch (err: any) {
      if (err?.response?.status === 401 || err?.response?.status === 403) {
        localStorage.removeItem('authToken');
        localStorage.removeItem('userRole');
        window.location.href = '/login/agent';
        return;
      }
      setError(err?.response?.data?.userMessage || err?.message || 'Failed to create customer');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setFormData({
      name: '',
      phoneNumber: '',
      email: '',
      streetAddress: '',
      city: '',
    });
    setFieldErrors({});
    setShowErrors(false);
    setError('');
    setIsSubmitting(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="glass-card rounded-3xl p-6 w-full max-w-lg bg-white/85">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-gray-800">Add New Customer</h2>
            <p className="text-sm text-gray-500">Capture essential details to create a customer record.</p>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            aria-label="Close"
            disabled={isSubmitting}
          >
            <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {error && (
          <div className="glass-card bg-red-50/60 border border-red-200 rounded-xl p-3 mb-4 text-red-600 text-sm">
            {error}
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
              onChange={handleChange}
              className={`glass-input w-full px-3 py-2 rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-sky-500 ${
                showErrors && fieldErrors.name ? 'border-red-400 focus:ring-red-400' : ''
              }`}
              placeholder="e.g., Sarah Johnson"
              autoFocus
            />
            {showErrors && fieldErrors.name && <p className="text-red-500 text-xs mt-1">{fieldErrors.name}</p>}
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
              onChange={handleChange}
              className={`glass-input w-full px-3 py-2 rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-sky-500 ${
                showErrors && fieldErrors.email ? 'border-red-400 focus:ring-red-400' : ''
              }`}
              placeholder="e.g., sarah@example.com"
            />
            {showErrors && fieldErrors.email && <p className="text-red-500 text-xs mt-1">{fieldErrors.email}</p>}
          </div>

  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700 mb-2">
              Phone Number *
            </label>
            <input
              id="phoneNumber"
              name="phoneNumber"
              type="tel"
              value={formData.phoneNumber}
              onChange={handleChange}
              className={`glass-input w-full px-3 py-2 rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-sky-500 ${
                showErrors && fieldErrors.phoneNumber ? 'border-red-400 focus:ring-red-400' : ''
              }`}
              placeholder="e.g., 0501234567"
              inputMode="numeric"
            />
            {showErrors && fieldErrors.phoneNumber && (
              <p className="text-red-500 text-xs mt-1">{fieldErrors.phoneNumber}</p>
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
              onChange={handleChange}
              className={`glass-input w-full px-3 py-2 rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-sky-500 ${
                showErrors && fieldErrors.city ? 'border-red-400 focus:ring-red-400' : ''
              }`}
              placeholder="e.g., Tel Aviv"
            />
            {showErrors && fieldErrors.city && <p className="text-red-500 text-xs mt-1">{fieldErrors.city}</p>}
          </div>
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
              onChange={handleChange}
              className={`glass-input w-full px-3 py-2 rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-sky-500 ${
                showErrors && fieldErrors.streetAddress ? 'border-red-400 focus:ring-red-400' : ''
              }`}
              placeholder="e.g., 42 Evergreen Lane"
            />
            {showErrors && fieldErrors.streetAddress && (
              <p className="text-red-500 text-xs mt-1">{fieldErrors.streetAddress}</p>
            )}
          </div>

          <div className="flex space-x-3 pt-2">
            <button
              type="button"
              onClick={handleClose}
              className="glass-button flex-1 py-2 px-4 rounded-xl text-sm font-semibold text-gray-800 bg-gray-100/60 hover:bg-gray-200/70 border-gray-400 hover:border-gray-500 disabled:opacity-50"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="glass-button flex-1 py-2 px-4 rounded-xl text-sm font-semibold text-gray-800 bg-sky-100/60 hover:bg-sky-200/70 border-sky-600 hover:border-sky-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              {isSubmitting ? (
                <>
                  <svg
                    className="animate-spin h-5 w-5"
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
                  <span>Saving...</span>
                </>
              ) : (
                <span>Create Customer</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

