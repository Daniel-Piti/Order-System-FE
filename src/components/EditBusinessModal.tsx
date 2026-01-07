import { useState, useEffect } from 'react';
import { validateBusinessForm } from '../utils/validation';
import type { ValidationErrors } from '../utils/validation';
import { businessAPI } from '../services/api';

interface EditBusinessModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  currentBusiness: {
    name: string;
    stateIdNumber: string;
    email: string;
    phoneNumber: string;
    streetAddress: string;
    city: string;
  };
}

export default function EditBusinessModal({ isOpen, onClose, onSuccess, currentBusiness }: EditBusinessModalProps) {
  const MAX_NAME_LENGTH = 50;
  const MAX_STATE_ID_LENGTH = 20;
  const MAX_EMAIL_LENGTH = 100;
  const MAX_PHONE_LENGTH = 10;
  const MAX_STREET_ADDRESS_LENGTH = 120;
  const MAX_CITY_LENGTH = 60;

  const [formData, setFormData] = useState({
    name: '',
    stateIdNumber: '',
    email: '',
    phoneNumber: '',
    streetAddress: '',
    city: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<ValidationErrors>({});
  const [showErrors, setShowErrors] = useState(false);

  // Initialize form with current business data
  useEffect(() => {
    if (isOpen) {
      setFormData({
        name: currentBusiness.name,
        stateIdNumber: currentBusiness.stateIdNumber,
        email: currentBusiness.email,
        phoneNumber: currentBusiness.phoneNumber,
        streetAddress: currentBusiness.streetAddress,
        city: currentBusiness.city,
      });
      setShowErrors(false);
      setFieldErrors({});
      setError('');
    }
  }, [isOpen, currentBusiness]);

  if (!isOpen) return null;

  const validateForm = () => {
    const result = validateBusinessForm(formData);
    setFieldErrors(result.errors);
    return result.isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setFieldErrors({});
    setShowErrors(true);

    if (!validateForm()) {
      return;
    }

    // Check if anything has changed
    const hasChanges =
      formData.name !== currentBusiness.name ||
      formData.stateIdNumber !== currentBusiness.stateIdNumber ||
      formData.email !== currentBusiness.email ||
      formData.phoneNumber !== currentBusiness.phoneNumber ||
      formData.streetAddress !== currentBusiness.streetAddress ||
      formData.city !== currentBusiness.city;

    // If nothing changed, just close the modal without making an API call
    if (!hasChanges) {
      handleClose();
      return;
    }

    setIsLoading(true);

    try {
      await businessAPI.updateMyBusiness(formData);
      onSuccess();
      handleClose();
    } catch (err: any) {
      setError(
        err.response?.data?.userMessage ||
          err.response?.data?.message ||
          err.message ||
          'נכשל בעדכון פרטי העסק'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const sanitizedValue =
      name === 'name'
        ? value.slice(0, MAX_NAME_LENGTH)
        : name === 'stateIdNumber'
        ? value.slice(0, MAX_STATE_ID_LENGTH)
        : name === 'email'
        ? value.slice(0, MAX_EMAIL_LENGTH)
        : name === 'phoneNumber'
        ? value.replace(/\D/g, '').slice(0, MAX_PHONE_LENGTH)
        : name === 'streetAddress'
        ? value.slice(0, MAX_STREET_ADDRESS_LENGTH)
        : name === 'city'
        ? value.slice(0, MAX_CITY_LENGTH)
        : value;
    setFormData({
      ...formData,
      [name]: sanitizedValue,
    });
    // Clear error for this field when user starts typing
    if (showErrors && fieldErrors[name]) {
      setFieldErrors({
        ...fieldErrors,
        [name]: '',
      });
    }
  };

  const handleClose = () => {
    setFormData({
      name: '',
      stateIdNumber: '',
      email: '',
      phoneNumber: '',
      streetAddress: '',
      city: '',
    });
    setError('');
    setFieldErrors({});
    setShowErrors(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" dir="rtl" style={{ margin: 0, top: 0 }}>
      <div className="glass-card rounded-3xl p-6 w-full max-w-lg max-h-[85vh] overflow-y-auto bg-white/90 backdrop-blur-xl shadow-xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-semibold text-gray-900">עדכן פרטי עסק</h2>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100/50 rounded-xl transition-colors"
          >
            <svg
              className="w-5 h-5 text-gray-500"
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
          <div className="glass-card bg-red-50/80 border border-red-200/60 rounded-xl p-3 mb-4 text-red-600 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="space-y-3.5">
          <div>
            <label htmlFor="name" className="form-label">
              שם העסק *
            </label>
            <input
              id="name"
              name="name"
              type="text"
              value={formData.name}
              onChange={handleChange}
              maxLength={MAX_NAME_LENGTH}
              className={`form-input text-center ${showErrors && fieldErrors.name ? 'form-input-error' : ''}`}
              placeholder="שם העסק"
              dir="ltr"
            />
            {showErrors && fieldErrors.name && (
              <p className="text-red-500 text-xs mt-1">{fieldErrors.name}</p>
            )}
          </div>

          <div>
            <label htmlFor="stateIdNumber" className="form-label">
              ח.פ / ע.מ *
            </label>
            <input
              id="stateIdNumber"
              name="stateIdNumber"
              type="text"
              value={formData.stateIdNumber}
              onChange={handleChange}
              maxLength={MAX_STATE_ID_LENGTH}
              className={`form-input text-center ${showErrors && fieldErrors.stateIdNumber ? 'form-input-error' : ''}`}
              placeholder="123456789"
              dir="ltr"
            />
            {showErrors && fieldErrors.stateIdNumber && (
              <p className="text-red-500 text-xs mt-1">{fieldErrors.stateIdNumber}</p>
            )}
          </div>

          <div>
            <label htmlFor="email" className="form-label">
              אימייל העסק *
            </label>
            <input
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              maxLength={MAX_EMAIL_LENGTH}
              className={`form-input text-center ${showErrors && fieldErrors.email ? 'form-input-error' : ''}`}
              placeholder="business@example.com"
              dir="ltr"
            />
            {showErrors && fieldErrors.email && (
              <p className="text-red-500 text-xs mt-1">{fieldErrors.email}</p>
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
              onChange={handleChange}
              maxLength={MAX_PHONE_LENGTH}
              inputMode="numeric"
              pattern="[0-9]*"
              className={`form-input text-center ${showErrors && fieldErrors.phoneNumber ? 'form-input-error' : ''}`}
              dir="ltr"
            />
            {showErrors && fieldErrors.phoneNumber && (
              <p className="text-red-500 text-xs mt-1">{fieldErrors.phoneNumber}</p>
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
              onChange={handleChange}
              maxLength={MAX_STREET_ADDRESS_LENGTH}
              className={`form-input text-center ${showErrors && fieldErrors.streetAddress ? 'form-input-error' : ''}`}
              placeholder="רחוב ראשי 123"
              dir="ltr"
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
              onChange={handleChange}
              maxLength={MAX_CITY_LENGTH}
              className={`form-input text-center ${showErrors && fieldErrors.city ? 'form-input-error' : ''}`}
              placeholder="תל אביב"
              dir="ltr"
            />
            {showErrors && fieldErrors.city && (
              <p className="text-red-500 text-xs mt-1">{fieldErrors.city}</p>
            )}
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              disabled={isLoading}
              className="btn-cancel"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              <span>ביטול</span>
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="btn-save-indigo"
            >
              {isLoading ? (
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

