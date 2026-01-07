import { useState } from 'react';
import { validateLocationForm, LOCATION_FIELD_LIMITS } from '../utils/validation';
import type { ValidationErrors } from '../utils/validation';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

interface AddLocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddLocationModal({ isOpen, onClose, onSuccess }: AddLocationModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    streetAddress: '',
    city: '',
    phoneNumber: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<ValidationErrors>({});
  const [showErrors, setShowErrors] = useState(false);

  if (!isOpen) return null;

  const validateForm = () => {
    const result = validateLocationForm(formData);
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

    setIsLoading(true);

    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/locations`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.userMessage || 'נכשל ביצירת הסניף');
      }

      onSuccess();
      handleClose();
    } catch (err: any) {
      setError(err.message || 'נכשל ביצירת הסניף');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const sanitizedValue =
      name === 'phoneNumber'
        ? value.replace(/\D/g, '').slice(0, LOCATION_FIELD_LIMITS.phoneNumber)
        : value.slice(0, LOCATION_FIELD_LIMITS[name as keyof typeof LOCATION_FIELD_LIMITS] ?? value.length);
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
      streetAddress: '',
      city: '',
      phoneNumber: '',
    });
    setError('');
    setFieldErrors({});
    setShowErrors(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" dir="rtl" style={{ margin: 0, top: 0 }}>
      <div className="glass-card rounded-3xl p-6 md:p-8 w-full max-w-lg max-h-[90vh] overflow-y-auto bg-white/90 backdrop-blur-xl shadow-xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-semibold text-gray-900">הוסף סניף חדש</h2>
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
          <div className="mb-4 p-3 bg-red-50/80 border border-red-200/60 rounded-xl text-red-600 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="space-y-3.5">
          <div>
            <label htmlFor="name" className="block text-xs font-medium text-gray-700 mb-1.5">
              שם הסניף *
            </label>
            <input
              id="name"
              name="name"
              type="text"
              value={formData.name}
              onChange={handleChange}
              maxLength={LOCATION_FIELD_LIMITS.name}
              className={`glass-input w-full px-3.5 py-2.5 rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all text-center ${
                showErrors && fieldErrors.name ? 'border-red-400 focus:ring-red-400/50' : ''
              }`}
              placeholder="לדוגמה: סניף ראשי, סניף מרכז"
              dir="ltr"
            />
            {showErrors && fieldErrors.name && (
              <p className="text-red-500 text-xs mt-1">{fieldErrors.name}</p>
            )}
          </div>

          <div>
            <label htmlFor="streetAddress" className="block text-xs font-medium text-gray-700 mb-1.5">
              כתובת *
            </label>
            <input
              id="streetAddress"
              name="streetAddress"
              type="text"
              value={formData.streetAddress}
              onChange={handleChange}
              maxLength={LOCATION_FIELD_LIMITS.streetAddress}
              className={`glass-input w-full px-3.5 py-2.5 rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all text-center ${
                showErrors && fieldErrors.streetAddress ? 'border-red-400 focus:ring-red-400/50' : ''
              }`}
              placeholder="רחוב ראשי 123"
              dir="ltr"
            />
            {showErrors && fieldErrors.streetAddress && (
              <p className="text-red-500 text-xs mt-1">{fieldErrors.streetAddress}</p>
            )}
          </div>

          <div>
            <label htmlFor="city" className="block text-xs font-medium text-gray-700 mb-1.5">
              עיר *
            </label>
            <input
              id="city"
              name="city"
              type="text"
              value={formData.city}
              onChange={handleChange}
              maxLength={LOCATION_FIELD_LIMITS.city}
              className={`glass-input w-full px-3.5 py-2.5 rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all text-center ${
                showErrors && fieldErrors.city ? 'border-red-400 focus:ring-red-400/50' : ''
              }`}
              placeholder="תל אביב"
              dir="ltr"
            />
            {showErrors && fieldErrors.city && (
              <p className="text-red-500 text-xs mt-1">{fieldErrors.city}</p>
            )}
          </div>

          <div>
            <label htmlFor="phoneNumber" className="block text-xs font-medium text-gray-700 mb-1.5">
              מספר טלפון *
            </label>
            <input
              id="phoneNumber"
              name="phoneNumber"
              type="tel"
              value={formData.phoneNumber}
              onChange={handleChange}
              maxLength={LOCATION_FIELD_LIMITS.phoneNumber}
              inputMode="numeric"
              pattern="[0-9]*"
              className={`glass-input w-full px-3.5 py-2.5 rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all text-center ${
                showErrors && fieldErrors.phoneNumber ? 'border-red-400 focus:ring-red-400/50' : ''
              }`}
              dir="ltr"
            />
            {showErrors && fieldErrors.phoneNumber && (
              <p className="text-red-500 text-xs mt-1">{fieldErrors.phoneNumber}</p>
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
              className="btn-save"
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
                  <span>יוצר...</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>צור סניף</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

