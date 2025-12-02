import { useState, useEffect } from 'react';
import { validateUserProfileForm } from '../utils/validation';
import type { ValidationErrors } from '../utils/validation';
import { managerAPI } from '../services/api';

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  currentProfile: {
    firstName: string;
    lastName: string;
    businessName: string;
    phoneNumber: string;
    dateOfBirth: string;
    streetAddress: string;
    city: string;
  };
}

export default function EditProfileModal({ isOpen, onClose, onSuccess, currentProfile }: EditProfileModalProps) {
  const MAX_NAME_LENGTH = 50;
  const MAX_BUSINESS_NAME_LENGTH = 70;
  const MAX_STREET_ADDRESS_LENGTH = 120;
  const MAX_CITY_LENGTH = 60;
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    businessName: '',
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
        businessName: currentProfile.businessName,
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
      formData.businessName !== currentProfile.businessName ||
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
        : name === 'businessName'
        ? value.slice(0, MAX_BUSINESS_NAME_LENGTH)
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
      businessName: '',
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" dir="rtl">
      <div className="glass-card rounded-3xl p-5 w-full max-w-lg max-h-[85vh] overflow-y-auto bg-white/85">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-gray-800">ערוך פרטים אישיים</h2>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
          >
            <svg
              className="w-6 h-6 text-gray-600"
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
          <div className="glass-card bg-red-50/50 border-red-200 rounded-xl p-3 mb-4 text-red-600 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="space-y-2.5">
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label htmlFor="firstName" className="block text-xs font-medium text-gray-700 mb-1">
                שם פרטי *
              </label>
              <input
                id="firstName"
                name="firstName"
                type="text"
                value={formData.firstName}
                onChange={handleChange}
                maxLength={MAX_NAME_LENGTH}
                className={`glass-input w-full px-2.5 py-1.5 rounded-lg text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-center ${
                  showErrors && fieldErrors.firstName ? 'border-red-400 focus:ring-red-400' : ''
                }`}
                placeholder="יוחנן"
                dir="ltr"
              />
              {showErrors && fieldErrors.firstName && (
                <p className="text-red-500 text-xs mt-0.5">{fieldErrors.firstName}</p>
              )}
            </div>

            <div>
              <label htmlFor="lastName" className="block text-xs font-medium text-gray-700 mb-1">
                שם משפחה *
              </label>
              <input
                id="lastName"
                name="lastName"
                type="text"
                value={formData.lastName}
                onChange={handleChange}
                maxLength={MAX_NAME_LENGTH}
                className={`glass-input w-full px-2.5 py-1.5 rounded-lg text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-center ${
                  showErrors && fieldErrors.lastName ? 'border-red-400 focus:ring-red-400' : ''
                }`}
                placeholder="כהן"
                dir="ltr"
              />
              {showErrors && fieldErrors.lastName && (
                <p className="text-red-500 text-xs mt-0.5">{fieldErrors.lastName}</p>
              )}
            </div>
          </div>

          <div>
            <label htmlFor="businessName" className="block text-xs font-medium text-gray-700 mb-1">
              שם העסק *
            </label>
            <input
              id="businessName"
              name="businessName"
              type="text"
              value={formData.businessName}
              onChange={handleChange}
              maxLength={MAX_BUSINESS_NAME_LENGTH}
              className={`glass-input w-full px-2.5 py-1.5 rounded-lg text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-center ${
                showErrors && fieldErrors.businessName ? 'border-red-400 focus:ring-red-400' : ''
              }`}
              placeholder="עסק בע״מ"
              dir="ltr"
            />
            {showErrors && fieldErrors.businessName && (
              <p className="text-red-500 text-xs mt-0.5">{fieldErrors.businessName}</p>
            )}
          </div>

          <div>
            <label htmlFor="phoneNumber" className="block text-xs font-medium text-gray-700 mb-1">
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
              className={`glass-input w-full px-2.5 py-1.5 rounded-lg text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-center ${
                showErrors && fieldErrors.phoneNumber ? 'border-red-400 focus:ring-red-400' : ''
              }`}
              dir="ltr"
            />
            {showErrors && fieldErrors.phoneNumber && (
              <p className="text-red-500 text-xs mt-0.5">{fieldErrors.phoneNumber}</p>
            )}
          </div>

          <div>
            <label htmlFor="dateOfBirth" className="block text-xs font-medium text-gray-700 mb-1">
              תאריך לידה *
            </label>
            <input
              id="dateOfBirth"
              name="dateOfBirth"
              type="date"
              value={formData.dateOfBirth}
              onChange={handleChange}
              className={`glass-input w-full px-2.5 py-1.5 rounded-lg text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-center ${
                showErrors && fieldErrors.dateOfBirth ? 'border-red-400 focus:ring-red-400' : ''
              }`}
              dir="ltr"
            />
            {showErrors && fieldErrors.dateOfBirth && (
              <p className="text-red-500 text-xs mt-0.5">{fieldErrors.dateOfBirth}</p>
            )}
          </div>

          <div>
            <label htmlFor="streetAddress" className="block text-xs font-medium text-gray-700 mb-1">
              כתובת *
            </label>
            <input
              id="streetAddress"
              name="streetAddress"
              type="text"
              value={formData.streetAddress}
              onChange={handleChange}
              maxLength={MAX_STREET_ADDRESS_LENGTH}
              className={`glass-input w-full px-2.5 py-1.5 rounded-lg text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-center ${
                showErrors && fieldErrors.streetAddress ? 'border-red-400 focus:ring-red-400' : ''
              }`}
              placeholder="רחוב ראשי 123"
              dir="ltr"
            />
            {showErrors && fieldErrors.streetAddress && (
              <p className="text-red-500 text-xs mt-0.5">{fieldErrors.streetAddress}</p>
            )}
          </div>

          <div>
            <label htmlFor="city" className="block text-xs font-medium text-gray-700 mb-1">
              עיר *
            </label>
            <input
              id="city"
              name="city"
              type="text"
              value={formData.city}
              onChange={handleChange}
              maxLength={MAX_CITY_LENGTH}
              className={`glass-input w-full px-2.5 py-1.5 rounded-lg text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-center ${
                showErrors && fieldErrors.city ? 'border-red-400 focus:ring-red-400' : ''
              }`}
              placeholder="תל אביב"
              dir="ltr"
            />
            {showErrors && fieldErrors.city && (
              <p className="text-red-500 text-xs mt-0.5">{fieldErrors.city}</p>
            )}
          </div>

          <div className="flex gap-3 pt-2.5">
            <button
              type="button"
              onClick={handleClose}
              disabled={isLoading}
              className="glass-button flex-1 py-1.5 px-3 rounded-lg text-sm font-semibold text-gray-800 bg-gray-100/60 hover:bg-gray-200/70 border-gray-400 hover:border-gray-500 disabled:opacity-50"
            >
              ביטול
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="glass-button flex-1 py-1.5 px-3 rounded-lg text-sm font-semibold text-gray-800 
                       bg-indigo-100/60 hover:bg-indigo-200/70 border-indigo-600 hover:border-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed
                       flex items-center justify-center gap-2"
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
                <span>שמור שינויים</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

