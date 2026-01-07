import { useState, useEffect } from 'react';
import { validateUserProfileForm } from '../utils/validation';
import type { ValidationErrors } from '../utils/validation';
import { managerAPI } from '../services/api';
import Spinner from './Spinner';
import CloseButton from './CloseButton';

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  currentProfile: {
    firstName: string;
    lastName: string;
    phoneNumber: string;
    dateOfBirth: string;
    streetAddress: string;
    city: string;
  };
}

export default function EditProfileModal({ isOpen, onClose, onSuccess, currentProfile }: EditProfileModalProps) {
  const MAX_NAME_LENGTH = 50;
  const MAX_STREET_ADDRESS_LENGTH = 120;
  const MAX_CITY_LENGTH = 60;
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phoneNumber: '',
    dateOfBirth: '',
    streetAddress: '',
    city: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<ValidationErrors>({});
  const [showErrors, setShowErrors] = useState(false);

  // Initialize form with current profile data
  useEffect(() => {
    if (isOpen) {
      setFormData({
        firstName: currentProfile.firstName,
        lastName: currentProfile.lastName,
        phoneNumber: currentProfile.phoneNumber,
        dateOfBirth: currentProfile.dateOfBirth,
        streetAddress: currentProfile.streetAddress,
        city: currentProfile.city,
      });
      setShowErrors(false);
      setFieldErrors({});
      setError('');
    }
  }, [isOpen, currentProfile]);

  if (!isOpen) return null;

  const validateForm = () => {
    const result = validateUserProfileForm(formData);
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
      formData.firstName !== currentProfile.firstName ||
      formData.lastName !== currentProfile.lastName ||
      formData.phoneNumber !== currentProfile.phoneNumber ||
      formData.dateOfBirth !== currentProfile.dateOfBirth ||
      formData.streetAddress !== currentProfile.streetAddress ||
      formData.city !== currentProfile.city;

    // If nothing changed, just close the modal without making an API call
    if (!hasChanges) {
      handleClose();
      return;
    }

    setIsLoading(true);

    try {
      await managerAPI.updateCurrentManager(formData);
      onSuccess();
      handleClose();
    } catch (err: any) {
      setError(
        err.response?.data?.userMessage ||
          err.response?.data?.message ||
          err.message ||
          'נכשל בעדכון הפרופיל'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const sanitizedValue =
      name === 'firstName' || name === 'lastName'
        ? value.slice(0, MAX_NAME_LENGTH)
        : name === 'phoneNumber'
        ? value.replace(/\D/g, '')
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
      firstName: '',
      lastName: '',
      phoneNumber: '',
      dateOfBirth: '',
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
          <h2 className="text-xl font-semibold text-gray-900">ערוך פרטים אישיים</h2>
          <CloseButton onClick={handleClose} />
        </div>

        {error && (
          <div className="glass-card bg-red-50/80 border border-red-200/60 rounded-xl p-3 mb-4 text-red-600 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="space-y-3.5">
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label htmlFor="firstName" className="form-label">
                שם פרטי *
              </label>
              <input
                id="firstName"
                name="firstName"
                type="text"
                value={formData.firstName}
                onChange={handleChange}
                maxLength={MAX_NAME_LENGTH}
                className={`form-input text-center ${showErrors && fieldErrors.firstName ? 'form-input-error' : ''}`}
                placeholder="יוחנן"
                dir="ltr"
              />
              {showErrors && fieldErrors.firstName && (
                <p className="text-red-500 text-xs mt-1">{fieldErrors.firstName}</p>
              )}
            </div>

            <div>
              <label htmlFor="lastName" className="form-label">
                שם משפחה *
              </label>
              <input
                id="lastName"
                name="lastName"
                type="text"
                value={formData.lastName}
                onChange={handleChange}
                maxLength={MAX_NAME_LENGTH}
                className={`form-input text-center ${showErrors && fieldErrors.lastName ? 'form-input-error' : ''}`}
                placeholder="כהן"
                dir="ltr"
              />
              {showErrors && fieldErrors.lastName && (
                <p className="text-red-500 text-xs mt-1">{fieldErrors.lastName}</p>
              )}
            </div>
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
              maxLength={10}
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
            <label htmlFor="dateOfBirth" className="form-label">
              תאריך לידה *
            </label>
            <input
              id="dateOfBirth"
              name="dateOfBirth"
              type="date"
              value={formData.dateOfBirth}
              onChange={handleChange}
              className={`form-input text-center ${showErrors && fieldErrors.dateOfBirth ? 'form-input-error' : ''}`}
              dir="ltr"
            />
            {showErrors && fieldErrors.dateOfBirth && (
              <p className="text-red-500 text-xs mt-1">{fieldErrors.dateOfBirth}</p>
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

