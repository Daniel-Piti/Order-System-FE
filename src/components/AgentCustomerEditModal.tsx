import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import { agentAPI, type CustomerRequest, type Customer } from '../services/api';
import { validateEmail, validatePhoneNumberDigitsOnly, validateRequiredWithMaxLength, type ValidationErrors } from '../utils/validation';

interface AgentCustomerEditModalProps {
  isOpen: boolean;
  customer: Customer | null;
  onClose: () => void;
  onSuccess: () => void;
}

const MAX_CUSTOMER_NAME_LENGTH = 50;
const MAX_CUSTOMER_PHONE_LENGTH = 10;
const MAX_CUSTOMER_EMAIL_LENGTH = 100;
const MAX_CUSTOMER_STREET_LENGTH = 120;
const MAX_CUSTOMER_CITY_LENGTH = 60;

const INITIAL_FORM: CustomerRequest = {
  name: '',
  phoneNumber: '',
  email: '',
  streetAddress: '',
  city: '',
};

export default function AgentCustomerEditModal({ isOpen, customer, onClose, onSuccess }: AgentCustomerEditModalProps) {
  const [formData, setFormData] = useState<CustomerRequest>(INITIAL_FORM);
  const [fieldErrors, setFieldErrors] = useState<ValidationErrors>({});
  const [showErrors, setShowErrors] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen || !customer) {
      setFormData(INITIAL_FORM);
      setFieldErrors({});
      setShowErrors(false);
      setIsSubmitting(false);
      setError('');
      return;
    }

    setFormData({
      name: customer.name,
      phoneNumber: customer.phoneNumber,
      email: customer.email,
      streetAddress: customer.streetAddress,
      city: customer.city,
    });
    setFieldErrors({});
    setShowErrors(false);
    setError('');
  }, [isOpen, customer]);

  if (!isOpen || !customer) {
    return null;
  }

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    let sanitized = value;

    switch (name) {
      case 'name':
        sanitized = value.slice(0, MAX_CUSTOMER_NAME_LENGTH);
        break;
      case 'phoneNumber':
        sanitized = value.replace(/\D/g, '').slice(0, MAX_CUSTOMER_PHONE_LENGTH);
        break;
      case 'email':
        sanitized = value.slice(0, MAX_CUSTOMER_EMAIL_LENGTH);
        break;
      case 'streetAddress':
        sanitized = value.slice(0, MAX_CUSTOMER_STREET_LENGTH);
        break;
      case 'city':
        sanitized = value.slice(0, MAX_CUSTOMER_CITY_LENGTH);
        break;
      default:
        sanitized = value;
    }

    setFormData((prev) => ({
      ...prev,
      [name]: sanitized,
    }));

    if (showErrors && fieldErrors[name]) {
      setFieldErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = (): ValidationErrors => {
    const errors: ValidationErrors = {};

    errors.name = validateRequiredWithMaxLength(formData.name, 'Customer name', MAX_CUSTOMER_NAME_LENGTH);
    errors.phoneNumber = validatePhoneNumberDigitsOnly(formData.phoneNumber, MAX_CUSTOMER_PHONE_LENGTH, 'Phone number');
    errors.email = validateEmail(formData.email);
    errors.streetAddress = validateRequiredWithMaxLength(
      formData.streetAddress,
      'Street address',
      MAX_CUSTOMER_STREET_LENGTH
    );
    errors.city = validateRequiredWithMaxLength(formData.city, 'City', MAX_CUSTOMER_CITY_LENGTH);

    const cleanedErrors: ValidationErrors = {};
    Object.entries(errors).forEach(([key, value]) => {
      if (value) {
        cleanedErrors[key] = value;
      }
    });

    return cleanedErrors;
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setShowErrors(true);
    setError('');

    const errors = validateForm();
    setFieldErrors(errors);

    if (Object.keys(errors).length > 0) {
      return;
    }

    // Check if anything has changed
    const hasChanges =
      formData.name !== customer.name ||
      formData.phoneNumber !== customer.phoneNumber ||
      formData.email !== customer.email ||
      formData.streetAddress !== customer.streetAddress ||
      formData.city !== customer.city;

    // If nothing changed, just close the modal without making an API call
    if (!hasChanges) {
      handleClose();
      return;
    }

    setIsSubmitting(true);
    try {
      await agentAPI.updateCustomerForAgent(customer.id, formData);
      onSuccess();
    } catch (err: any) {
      setError(
        err?.response?.data?.userMessage ||
          err?.response?.data?.message ||
          err?.message ||
          'Failed to update customer'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setFormData(INITIAL_FORM);
    setFieldErrors({});
    setShowErrors(false);
    setError('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="glass-card rounded-3xl p-6 w-full max-w-xl max-h-[85vh] overflow-y-auto bg-white/85">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-gray-800">Edit Customer</h2>
            <p className="text-xs text-gray-500 mt-1">Update contact details for {customer.name}</p>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            aria-label="Close modal"
            type="button"
          >
            <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {error && (
          <div className="glass-card bg-red-50/60 border border-red-200 rounded-xl p-3 text-red-600 text-sm mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3" noValidate>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Customer Name *</label>
            <input
              name="name"
              type="text"
              value={formData.name}
              onChange={handleChange}
              className={`glass-input w-full px-3 py-2 rounded-lg text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-sky-500 ${
                showErrors && fieldErrors.name ? 'border-red-400 focus:ring-red-400' : ''
              }`}
              placeholder="John Doe"
            />
            {showErrors && fieldErrors.name && <p className="text-red-500 text-xs mt-1">{fieldErrors.name}</p>}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Phone Number *</label>
              <input
                name="phoneNumber"
                type="tel"
                value={formData.phoneNumber}
                onChange={handleChange}
                className={`glass-input w-full px-3 py-2 rounded-lg text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-sky-500 ${
                  showErrors && fieldErrors.phoneNumber ? 'border-red-400 focus:ring-red-400' : ''
                }`}
                placeholder="0501234567"
              />
              {showErrors && fieldErrors.phoneNumber && (
                <p className="text-red-500 text-xs mt-1">{fieldErrors.phoneNumber}</p>
              )}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Email Address *</label>
              <input
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                className={`glass-input w-full px-3 py-2 rounded-lg text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-sky-500 ${
                  showErrors && fieldErrors.email ? 'border-red-400 focus:ring-red-400' : ''
                }`}
                placeholder="customer@example.com"
              />
              {showErrors && fieldErrors.email && <p className="text-red-500 text-xs mt-1">{fieldErrors.email}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Street Address *</label>
              <input
                name="streetAddress"
                type="text"
                value={formData.streetAddress}
                onChange={handleChange}
                className={`glass-input w-full px-3 py-2 rounded-lg text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-sky-500 ${
                  showErrors && fieldErrors.streetAddress ? 'border-red-400 focus:ring-red-400' : ''
                }`}
                placeholder="123 Main Street"
              />
              {showErrors && fieldErrors.streetAddress && (
                <p className="text-red-500 text-xs mt-1">{fieldErrors.streetAddress}</p>
              )}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">City *</label>
              <input
                name="city"
                type="text"
                value={formData.city}
                onChange={handleChange}
                className={`glass-input w-full px-3 py-2 rounded-lg text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-sky-500 ${
                  showErrors && fieldErrors.city ? 'border-red-400 focus:ring-red-400' : ''
                }`}
                placeholder="Tel Aviv"
              />
              {showErrors && fieldErrors.city && <p className="text-red-500 text-xs mt-1">{fieldErrors.city}</p>}
            </div>
          </div>

          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="glass-button flex-1 py-2 px-4 rounded-lg text-sm font-semibold text-gray-800 bg-gray-100/70 hover:bg-gray-200/80 border border-gray-300 hover:border-gray-400 disabled:opacity-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="glass-button flex-1 py-2 px-4 rounded-lg text-sm font-semibold text-gray-800 bg-sky-100/80 hover:bg-sky-200/80 border border-sky-400 hover:border-sky-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 transition-colors"
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  <span>Saving…</span>
                </>
              ) : (
                <span>Save Changes</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


