import { useEffect, useState } from 'react';
import { agentAPI } from '../services/api';
import type { ValidationErrors } from '../utils/validation';
import { validateAgentProfileForm } from '../utils/validation';

interface AgentEditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  currentProfile: {
    firstName: string;
    lastName: string;
    phoneNumber: string;
    streetAddress: string;
    city: string;
  };
}

export default function AgentEditProfileModal({
  isOpen,
  onClose,
  onSuccess,
  currentProfile,
}: AgentEditProfileModalProps) {
  const [formData, setFormData] = useState(currentProfile);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<ValidationErrors>({});
  const [showErrors, setShowErrors] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setFormData(currentProfile);
      setShowErrors(false);
      setFieldErrors({});
      setError('');
    }
  }, [isOpen, currentProfile]);

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const sanitizedValue =
      name === 'phoneNumber'
        ? value.replace(/\D/g, '').slice(0, 20)
        : value;

    setFormData((prev) => ({
      ...prev,
      [name]: sanitizedValue,
    }));

    if (showErrors && fieldErrors[name]) {
      setFieldErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setShowErrors(true);
    setError('');

    const validation = validateAgentProfileForm(formData);
    setFieldErrors(validation.errors);

    if (!validation.isValid) return;

    setIsSubmitting(true);

    try {
      await agentAPI.updateCurrentAgent(formData);
      onSuccess();
      handleClose();
    } catch (err: any) {
      setError(
        err.response?.data?.userMessage ||
          err.response?.data?.message ||
          err.message ||
          'Failed to update profile'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setError('');
    setFieldErrors({});
    setShowErrors(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="glass-card rounded-3xl p-5 w-full max-w-lg max-h-[85vh] overflow-y-auto bg-white/85">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-gray-800">Edit Personal Details</h2>
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

        <form onSubmit={handleSubmit} className="space-y-3" noValidate>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">First Name *</label>
              <input
                name="firstName"
                type="text"
                value={formData.firstName}
                onChange={handleChange}
                className={`glass-input w-full px-2.5 py-1.5 rounded-lg text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-sky-500 ${
                  showErrors && fieldErrors.firstName ? 'border-red-400 focus:ring-red-400' : ''
                }`}
                placeholder="John"
              />
              {showErrors && fieldErrors.firstName && (
                <p className="text-red-500 text-xs mt-0.5">{fieldErrors.firstName}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Last Name *</label>
              <input
                name="lastName"
                type="text"
                value={formData.lastName}
                onChange={handleChange}
                className={`glass-input w-full px-2.5 py-1.5 rounded-lg text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-sky-500 ${
                  showErrors && fieldErrors.lastName ? 'border-red-400 focus:ring-red-400' : ''
                }`}
                placeholder="Doe"
              />
              {showErrors && fieldErrors.lastName && (
                <p className="text-red-500 text-xs mt-0.5">{fieldErrors.lastName}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Phone Number *</label>
              <input
                name="phoneNumber"
                type="tel"
                value={formData.phoneNumber}
                onChange={handleChange}
                className={`glass-input w-full px-2.5 py-1.5 rounded-lg text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-sky-500 ${
                  showErrors && fieldErrors.phoneNumber ? 'border-red-400 focus:ring-red-400' : ''
                }`}
                placeholder="5551234567"
              />
              {showErrors && fieldErrors.phoneNumber && (
                <p className="text-red-500 text-xs mt-0.5">{fieldErrors.phoneNumber}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">City *</label>
              <input
                name="city"
                type="text"
                value={formData.city}
                onChange={handleChange}
                className={`glass-input w-full px-2.5 py-1.5 rounded-lg text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-sky-500 ${
                  showErrors && fieldErrors.city ? 'border-red-400 focus:ring-red-400' : ''
                }`}
                placeholder="New York"
              />
              {showErrors && fieldErrors.city && (
                <p className="text-red-500 text-xs mt-0.5">{fieldErrors.city}</p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Street Address *</label>
            <input
              name="streetAddress"
              type="text"
              value={formData.streetAddress}
              onChange={handleChange}
              className={`glass-input w-full px-2.5 py-1.5 rounded-lg text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-sky-500 ${
                showErrors && fieldErrors.streetAddress ? 'border-red-400 focus:ring-red-400' : ''
              }`}
              placeholder="123 Main St"
            />
            {showErrors && fieldErrors.streetAddress && (
              <p className="text-red-500 text-xs mt-0.5">{fieldErrors.streetAddress}</p>
            )}
          </div>

          <div className="flex space-x-3 pt-3">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="glass-button flex-1 py-1.5 px-3 rounded-lg text-sm font-semibold text-gray-800 bg-gray-100/60 hover:bg-gray-200/70 border-gray-400 hover:border-gray-500 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="glass-button flex-1 py-1.5 px-3 rounded-lg text-sm font-semibold text-gray-800 
                       bg-sky-100/60 hover:bg-sky-200/70 border-sky-600 hover:border-sky-700 disabled:opacity-50 disabled:cursor-not-allowed
                       flex items-center justify-center space-x-2"
            >
              {isSubmitting ? (
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

