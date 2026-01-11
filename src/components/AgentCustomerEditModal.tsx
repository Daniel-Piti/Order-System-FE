import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import CloseButton from './CloseButton';
import { agentAPI, type CustomerRequest, type Customer } from '../services/api';
import { validateEmail, validatePhoneNumberDigitsOnly, validateRequiredWithMaxLength, validateDiscountPercentage, type ValidationErrors } from '../utils/validation';
import Spinner from './Spinner';

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
  stateId: '',
  discountPercentage: 0,
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
      stateId: customer.stateId,
      discountPercentage: customer.discountPercentage,
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
      case 'stateId':
        sanitized = value.replace(/\D/g, '').slice(0, 20);
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
    
    const phoneError = validatePhoneNumberDigitsOnly(formData.phoneNumber, MAX_CUSTOMER_PHONE_LENGTH, 'Phone number');
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
    
    const stateIdError = validatePhoneNumberDigitsOnly(
      formData.stateId,
      20,
      'Customer state ID'
    );
    if (stateIdError) {
      errors.stateId = stateIdError;
    }
    
    const discountError = validateDiscountPercentage(
      formData.discountPercentage ?? 0,
      'Discount percentage'
    );
    if (discountError) errors.discountPercentage = discountError;

    return errors;
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
      formData.city !== customer.city ||
      formData.stateId !== customer.stateId ||
      formData.discountPercentage !== customer.discountPercentage;

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
          'נכשל בעדכון לקוח'
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
      <div className="glass-card rounded-3xl p-6 md:p-8 w-full max-w-xl max-h-[90vh] overflow-y-auto bg-white/90 backdrop-blur-xl shadow-xl">
        <div className="modal-header">
          <div>
            <h2 className="modal-header-title">ערוך לקוח</h2>
            <p className="text-xs text-gray-500 mt-1">עדכן פרטי קשר עבור {customer.name}</p>
          </div>
          <CloseButton onClick={handleClose} ariaLabel="סגור חלון" />
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50/80 border border-red-200/60 rounded-xl text-red-600 text-sm">
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
              className={`form-input ${showErrors && fieldErrors.name ? 'form-input-error' : ''}`}
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
            <label className="form-label">ח.פ / ע.מ *</label>
            <input
              name="stateId"
              type="text"
              value={formData.stateId}
              onChange={handleChange}
              maxLength={20}
              inputMode="numeric"
              pattern="[0-9]*"
              className={`form-input text-center ${showErrors && fieldErrors.stateId ? 'form-input-error' : ''}`}
              placeholder="123456789"
              dir="ltr"
            />
            {showErrors && fieldErrors.stateId && (
              <p className="text-red-500 text-xs mt-1">{fieldErrors.stateId}</p>
            )}
            <p className="text-xs text-gray-500 mt-1">הזן עד 20 ספרות</p>
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
                  <Spinner size="sm" />
                  <span>שומר...</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>שמור שינויים</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


