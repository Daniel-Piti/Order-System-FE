import { useEffect, useState } from 'react';
import { agentAPI, type CustomerRequest } from '../services/api';
import { validateRequiredWithMaxLength, validatePhoneNumberDigitsOnly, validateEmail, validateDiscountPercentage } from '../utils/validation';
import type { ValidationErrors } from '../utils/validation';

interface AgentCustomerAddModalProps {
  isOpen: boolean;
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
  discountPercentage: 0,
};

export default function AgentCustomerAddModal({
  isOpen,
  onClose,
  onSuccess,
}: AgentCustomerAddModalProps) {
  const [formData, setFormData] = useState<CustomerRequest>(INITIAL_FORM);
  const [fieldErrors, setFieldErrors] = useState<ValidationErrors>({});
  const [showErrors, setShowErrors] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setFormData(INITIAL_FORM);
      setFieldErrors({});
      setShowErrors(false);
      setError('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
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
      case 'discountPercentage':
        const numValue = value === '' ? 0 : Math.max(0, Math.min(100, parseInt(value, 10) || 0));
        setFormData((prev) => ({
          ...prev,
          [name]: numValue,
        }));
        if (showErrors && fieldErrors[name]) {
          setFieldErrors((prev) => ({ ...prev, [name]: '' }));
        }
        return;
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

    const nameError = validateRequiredWithMaxLength(formData.name, 'Customer name', MAX_CUSTOMER_NAME_LENGTH);
    if (nameError) errors.name = nameError;
    
    const phoneError = validatePhoneNumberDigitsOnly(
      formData.phoneNumber,
      MAX_CUSTOMER_PHONE_LENGTH,
      'Phone number'
    );
    if (phoneError) errors.phoneNumber = phoneError;
    
    const emailError = validateEmail(formData.email);
    if (emailError) errors.email = emailError;
    
    const streetError = validateRequiredWithMaxLength(
      formData.streetAddress,
      'Street address',
      MAX_CUSTOMER_STREET_LENGTH
    );
    if (streetError) errors.streetAddress = streetError;
    
    const cityError = validateRequiredWithMaxLength(formData.city, 'City', MAX_CUSTOMER_CITY_LENGTH);
    if (cityError) errors.city = cityError;
    
    const discountError = validateDiscountPercentage(
      formData.discountPercentage ?? 0,
      'Discount percentage'
    );
    if (discountError) errors.discountPercentage = discountError;

    return errors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setShowErrors(true);
    setError('');

    const errors = validateForm();
    setFieldErrors(errors);

    if (Object.keys(errors).length > 0) {
      return;
    }

    setIsSubmitting(true);

    try {
      await agentAPI.createCustomerForAgent(formData);
      onSuccess();
      handleClose();
    } catch (err: any) {
      setError(
        err.response?.data?.userMessage ||
          err.response?.data?.message ||
          err.message ||
          'נכשל ביצירת לקוח'
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
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" dir="rtl" style={{ margin: 0, top: 0 }}>
      <div className="glass-card rounded-3xl p-6 w-full max-w-xl max-h-[85vh] overflow-y-auto bg-white/90 backdrop-blur-xl shadow-xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-semibold text-gray-900">הוסף לקוח חדש</h2>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100/50 rounded-xl transition-colors"
            aria-label="סגור חלון"
          >
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {error && (
          <div className="glass-card bg-red-50/80 border border-red-200/60 rounded-xl p-3 text-red-600 text-sm mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5" noValidate>
          <div>
            <label className="form-label">שם לקוח *</label>
            <input
              name="name"
              type="text"
              value={formData.name}
              onChange={handleChange}
              maxLength={MAX_CUSTOMER_NAME_LENGTH}
              className={`form-input text-center ${showErrors && fieldErrors.name ? 'form-input-error' : ''}`}
              placeholder="שם מלא"
              dir="rtl"
            />
            {showErrors && fieldErrors.name && <p className="text-red-500 text-xs mt-1">{fieldErrors.name}</p>}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            <div>
              <label className="form-label">מספר טלפון *</label>
              <input
                name="phoneNumber"
                type="tel"
                value={formData.phoneNumber}
                onChange={handleChange}
                maxLength={MAX_CUSTOMER_PHONE_LENGTH}
                className={`form-input text-center ${showErrors && fieldErrors.phoneNumber ? 'form-input-error' : ''}`}
                placeholder="0501234567"
                dir="ltr"
              />
              {showErrors && fieldErrors.phoneNumber && (
                <p className="text-red-500 text-xs mt-1">{fieldErrors.phoneNumber}</p>
              )}
            </div>
            <div>
              <label className="form-label">כתובת אימייל *</label>
              <input
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                maxLength={MAX_CUSTOMER_EMAIL_LENGTH}
                className={`form-input text-center ${showErrors && fieldErrors.email ? 'form-input-error' : ''}`}
                placeholder="customer@example.com"
                dir="ltr"
              />
              {showErrors && fieldErrors.email && <p className="text-red-500 text-xs mt-1">{fieldErrors.email}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            <div>
              <label className="form-label">כתובת רחוב *</label>
              <input
                name="streetAddress"
                type="text"
                value={formData.streetAddress}
                onChange={handleChange}
                maxLength={MAX_CUSTOMER_STREET_LENGTH}
                className={`form-input text-center ${showErrors && fieldErrors.streetAddress ? 'form-input-error' : ''}`}
                placeholder="רחוב ושם רחוב"
                dir="rtl"
              />
              {showErrors && fieldErrors.streetAddress && (
                <p className="text-red-500 text-xs mt-1">{fieldErrors.streetAddress}</p>
              )}
            </div>
            <div>
              <label className="form-label">עיר *</label>
              <input
                name="city"
                type="text"
                value={formData.city}
                onChange={handleChange}
                maxLength={MAX_CUSTOMER_CITY_LENGTH}
                className={`form-input text-center ${showErrors && fieldErrors.city ? 'form-input-error' : ''}`}
                placeholder="תל אביב"
                dir="rtl"
              />
              {showErrors && fieldErrors.city && <p className="text-red-500 text-xs mt-1">{fieldErrors.city}</p>}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">אחוז הנחה</label>
            <div className="space-y-2">
              <div className="flex items-center gap-2.5">
                <span className="text-xs font-medium text-gray-500 w-5">0%</span>
                <input
                  name="discountPercentage"
                  type="range"
                  min="0"
                  max="100"
                  value={formData.discountPercentage ?? 0}
                  onChange={handleChange}
                  className="flex-1 h-2.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-sky-500 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-sky-500 [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:transition-all [&::-webkit-slider-thumb]:duration-200 [&:hover::-webkit-slider-thumb]:w-6 [&:hover::-webkit-slider-thumb]:h-6 [&:active::-webkit-slider-thumb]:w-7 [&:active::-webkit-slider-thumb]:h-7 [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-sky-500 [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:shadow-md [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white [&::-moz-range-thumb]:border-none [&::-moz-range-thumb]:transition-all [&::-moz-range-thumb]:duration-200 [&:hover::-moz-range-thumb]:w-6 [&:hover::-moz-range-thumb]:h-6 [&:active::-moz-range-thumb]:w-7 [&:active::-moz-range-thumb]:h-7"
                  style={{
                    background: `linear-gradient(to left, #0ea5e9 0%, #0ea5e9 ${formData.discountPercentage ?? 0}%, #d1d5db ${formData.discountPercentage ?? 0}%, #d1d5db 100%)`
                  }}
                />
                <span className="text-xs font-medium text-gray-500 w-7 text-left">100%</span>
                <div className="flex items-center gap-1.5 bg-sky-50 px-2.5 py-1.5 rounded-lg border border-sky-200 min-w-[4rem]">
                  <span className="text-xs font-medium text-sky-600">%</span>
                  <input
                    name="discountPercentage"
                    type="number"
                    min="0"
                    max="100"
                    value={formData.discountPercentage ?? 0}
                    onChange={handleChange}
                    className={`w-11 px-1 py-0.5 text-xs font-semibold text-sky-700 bg-transparent border-none focus:outline-none focus:ring-0 text-center ${
                      showErrors && fieldErrors.discountPercentage ? 'text-red-600' : ''
                    }`}
                    placeholder="0"
                    dir="ltr"
                  />
                </div>
              </div>
              {showErrors && fieldErrors.discountPercentage && (
                <p className="text-red-500 text-xs mr-7">{fieldErrors.discountPercentage}</p>
              )}
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
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
                  <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  <span>מוסיף...</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>הוסף לקוח</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
