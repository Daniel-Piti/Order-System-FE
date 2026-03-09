import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import AccessibleModal from './AccessibleModal';
import type { CustomerRequest, Customer } from '../services/api';
import { validateEmail, validatePhoneNumberDigitsOnly, validateRequiredWithMaxLength, validateDiscountPercentage, type ValidationErrors } from '../utils/validation';
import Spinner from './Spinner';

interface CustomerEditModalProps {
  isOpen: boolean;
  customer: Customer | null;
  onClose: () => void;
  onSuccess: (updatedCustomer: Customer) => void;
  updateCustomer: (customerId: string, data: CustomerRequest) => Promise<Customer>;
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

export default function CustomerEditModal({ isOpen, customer, onClose, onSuccess, updateCustomer }: CustomerEditModalProps) {
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
        setFormData((prev) => ({ ...prev, [name]: numValue }));
        if (showErrors && fieldErrors[name]) {
          setFieldErrors((prev) => ({ ...prev, [name]: '' }));
        }
        return;
      default:
        sanitized = value;
    }

    setFormData((prev) => ({ ...prev, [name]: sanitized }));
    if (showErrors && fieldErrors[name]) {
      setFieldErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = (): ValidationErrors => {
    const errors: ValidationErrors = {};
    const nameError = validateRequiredWithMaxLength(formData.name, 'שם הלקוח', MAX_CUSTOMER_NAME_LENGTH);
    if (nameError) errors.name = nameError;
    const phoneError = validatePhoneNumberDigitsOnly(formData.phoneNumber, MAX_CUSTOMER_PHONE_LENGTH, 'מספר טלפון');
    if (phoneError) errors.phoneNumber = phoneError;
    const emailError = validateEmail(formData.email);
    if (emailError) errors.email = emailError;
    const streetError = validateRequiredWithMaxLength(formData.streetAddress, 'כתובת', MAX_CUSTOMER_STREET_LENGTH);
    if (streetError) errors.streetAddress = streetError;
    const cityError = validateRequiredWithMaxLength(formData.city, 'עיר', MAX_CUSTOMER_CITY_LENGTH);
    if (cityError) errors.city = cityError;
    const trimmedStateId = formData.stateId.trim();
    if (!trimmedStateId) {
      errors.stateId = 'ח.פ / ע.מ הוא שדה חובה';
    } else if (!/^\d+$/.test(trimmedStateId)) {
      errors.stateId = 'ח.פ / ע.מ חייב להכיל ספרות בלבד';
    } else if (trimmedStateId.length !== 9) {
      errors.stateId = 'ח.פ / ע.מ חייב להכיל בדיוק 9 ספרות';
    }
    const discountError = validateDiscountPercentage(formData.discountPercentage ?? 0, 'אחוז הנחה');
    if (discountError) errors.discountPercentage = discountError;
    return errors;
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setShowErrors(true);
    setError('');
    const errors = validateForm();
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    const hasChanges =
      formData.name !== customer.name ||
      formData.phoneNumber !== customer.phoneNumber ||
      formData.email !== customer.email ||
      formData.streetAddress !== customer.streetAddress ||
      formData.city !== customer.city ||
      formData.stateId !== customer.stateId ||
      formData.discountPercentage !== customer.discountPercentage;
    if (!hasChanges) {
      onClose();
      return;
    }

    setIsSubmitting(true);
    try {
      const updated = await updateCustomer(customer.id, formData);
      onSuccess(updated);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { userMessage?: string; message?: string }; status?: number }; message?: string };
      setError(e?.response?.data?.userMessage ?? e?.response?.data?.message ?? (e?.message as string) ?? 'נכשל בעדכון לקוח');
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
    <AccessibleModal
      isOpen={isOpen}
      onClose={handleClose}
      title="ערוך לקוח"
      description={`עדכן פרטי קשר עבור ${customer?.name ?? ''}`}
      size="lg"
      dir="rtl"
    >
      {error && (
        <div role="alert" className="mb-4 p-3 bg-red-50/80 border border-red-200/60 rounded-xl text-red-600 text-sm" aria-live="assertive">
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
            {showErrors && fieldErrors.phoneNumber && <p className="text-red-500 text-xs mt-1">{fieldErrors.phoneNumber}</p>}
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
            {showErrors && fieldErrors.streetAddress && <p className="text-red-500 text-xs mt-1">{fieldErrors.streetAddress}</p>}
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
            maxLength={9}
            inputMode="numeric"
            pattern="[0-9]*"
            className={`form-input text-center ${showErrors && fieldErrors.stateId ? 'form-input-error' : ''}`}
            placeholder="123456789"
            dir="ltr"
          />
          {showErrors && fieldErrors.stateId && <p className="text-red-500 text-xs mt-1">{fieldErrors.stateId}</p>}
          <p className="text-xs text-gray-500 mt-1">הזן בדיוק 9 ספרות</p>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">אחוז הנחה</label>
          <div className="flex items-center gap-2.5">
            <span className="text-xs font-medium text-gray-500 w-5">0%</span>
            <input
              name="discountPercentage"
              type="range"
              min="0"
              max="100"
              value={formData.discountPercentage ?? 0}
              onChange={handleChange}
              className="flex-1 h-2.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-500"
            />
            <span className="text-xs font-medium text-gray-500 w-7 text-left">100%</span>
            <div className="flex items-center gap-1.5 bg-indigo-50 px-2.5 py-1.5 rounded-lg border border-indigo-200 min-w-[4rem]">
              <span className="text-xs font-medium text-indigo-600">%</span>
              <input
                name="discountPercentage"
                type="number"
                min="0"
                max="100"
                value={formData.discountPercentage ?? 0}
                onChange={handleChange}
                className={`w-11 px-1 py-0.5 text-xs font-semibold text-indigo-700 bg-transparent border-none focus:outline-none focus:ring-0 text-center ${showErrors && fieldErrors.discountPercentage ? 'text-red-600' : ''}`}
                placeholder="0"
                dir="ltr"
              />
            </div>
          </div>
          {showErrors && fieldErrors.discountPercentage && <p className="text-red-500 text-xs mr-7">{fieldErrors.discountPercentage}</p>}
        </div>
        <div className="flex gap-3 pt-4">
          <button type="button" onClick={handleClose} disabled={isSubmitting} className="btn-cancel">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            <span>ביטול</span>
          </button>
          <button type="submit" disabled={isSubmitting} className="btn-save">
            {isSubmitting ? <><Spinner size="sm" /><span>שומר...</span></> : <><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg><span>שמור שינויים</span></>}
          </button>
        </div>
      </form>
    </AccessibleModal>
  );
}
