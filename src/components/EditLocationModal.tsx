import { useState, useEffect } from 'react';
import CloseButton from './CloseButton';
import Spinner from './Spinner';
import { validateLocationForm, LOCATION_FIELD_LIMITS } from '../utils/validation';
import type { ValidationErrors } from '../utils/validation';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

interface EditLocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  location: {
    id: number;
    name: string;
    streetAddress: string;
    city: string;
    phoneNumber: string;
  };
}

export default function EditLocationModal({ isOpen, onClose, onSuccess, location }: EditLocationModalProps) {
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

  // Initialize form with current location data
  useEffect(() => {
    if (isOpen) {
      setFormData({
        name: location.name.slice(0, LOCATION_FIELD_LIMITS.name),
        streetAddress: location.streetAddress.slice(0, LOCATION_FIELD_LIMITS.streetAddress),
        city: location.city.slice(0, LOCATION_FIELD_LIMITS.city),
        phoneNumber: location.phoneNumber.replace(/\D/g, '').slice(0, LOCATION_FIELD_LIMITS.phoneNumber),
      });
      setShowErrors(false);
      setFieldErrors({});
      setError('');
    }
  }, [isOpen, location]);

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
      const response = await fetch(`${API_BASE_URL}/locations/${location.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.userMessage || 'נכשל בעדכון הסניף');
      }

      onSuccess();
      handleClose();
    } catch (err: any) {
      setError(err.message || 'נכשל בעדכון הסניף');
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
          <h2 className="text-xl font-semibold text-gray-900">ערוך סניף</h2>
          <CloseButton onClick={handleClose} />
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

