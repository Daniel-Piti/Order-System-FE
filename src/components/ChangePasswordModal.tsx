import { useState } from 'react';

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ChangePasswordModal({ isOpen, onClose, onSuccess }: ChangePasswordModalProps) {
  const [formData, setFormData] = useState({
    oldPassword: '',
    newPassword: '',
    newPasswordConfirmation: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [showErrors, setShowErrors] = useState(false);

  if (!isOpen) return null;

  const validateForm = () => {
    const errors: Record<string, string> = {};

    if (!formData.oldPassword.trim()) {
      errors.oldPassword = 'Current password is required';
    }

    if (!formData.newPassword.trim()) {
      errors.newPassword = 'New password is required';
    } else if (formData.newPassword.length < 8) {
      errors.newPassword = 'Password must be at least 8 characters';
    }

    if (!formData.newPasswordConfirmation.trim()) {
      errors.newPasswordConfirmation = 'Please confirm your new password';
    } else if (formData.newPassword !== formData.newPasswordConfirmation) {
      errors.newPasswordConfirmation = 'Passwords do not match';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
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
      const params = new URLSearchParams({
        old_password: formData.oldPassword,
        new_password: formData.newPassword,
        new_password_confirmation: formData.newPasswordConfirmation,
      });

      const response = await fetch(`http://localhost:8080/api/users/me/update-password?${params}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Failed to update password');
      }

      onSuccess();
      handleClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
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
      oldPassword: '',
      newPassword: '',
      newPasswordConfirmation: '',
    });
    setError('');
    setFieldErrors({});
    setShowErrors(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="glass-card rounded-3xl p-5 w-full max-w-md bg-white/85">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-gray-800">Change Password</h2>
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
          <div>
            <label htmlFor="oldPassword" className="block text-xs font-medium text-gray-700 mb-1">
              Current Password *
            </label>
            <input
              id="oldPassword"
              name="oldPassword"
              type="password"
              value={formData.oldPassword}
              onChange={handleChange}
              className={`glass-input w-full px-2.5 py-1.5 rounded-lg text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                showErrors && fieldErrors.oldPassword ? 'border-red-400 focus:ring-red-400' : ''
              }`}
              placeholder="Enter current password"
            />
            {showErrors && fieldErrors.oldPassword && (
              <p className="text-red-500 text-xs mt-0.5">{fieldErrors.oldPassword}</p>
            )}
          </div>

          <div>
            <label htmlFor="newPassword" className="block text-xs font-medium text-gray-700 mb-1">
              New Password *
            </label>
            <input
              id="newPassword"
              name="newPassword"
              type="password"
              value={formData.newPassword}
              onChange={handleChange}
              className={`glass-input w-full px-2.5 py-1.5 rounded-lg text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                showErrors && fieldErrors.newPassword ? 'border-red-400 focus:ring-red-400' : ''
              }`}
              placeholder="Enter new password"
            />
            {showErrors && fieldErrors.newPassword ? (
              <p className="text-red-500 text-xs mt-0.5">{fieldErrors.newPassword}</p>
            ) : (
              <p className="text-xs text-gray-500 mt-0.5">
                Must contain uppercase, lowercase, numbers, and special characters
              </p>
            )}
          </div>

          <div>
            <label htmlFor="newPasswordConfirmation" className="block text-xs font-medium text-gray-700 mb-1">
              Confirm New Password *
            </label>
            <input
              id="newPasswordConfirmation"
              name="newPasswordConfirmation"
              type="password"
              value={formData.newPasswordConfirmation}
              onChange={handleChange}
              className={`glass-input w-full px-2.5 py-1.5 rounded-lg text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                showErrors && fieldErrors.newPasswordConfirmation ? 'border-red-400 focus:ring-red-400' : ''
              }`}
              placeholder="Confirm new password"
            />
            {showErrors && fieldErrors.newPasswordConfirmation && (
              <p className="text-red-500 text-xs mt-0.5">{fieldErrors.newPasswordConfirmation}</p>
            )}
          </div>

          <div className="flex space-x-2.5 pt-2.5">
            <button
              type="button"
              onClick={handleClose}
              disabled={isLoading}
              className="glass-button flex-1 py-1.5 px-3 rounded-lg text-sm font-semibold text-gray-800 bg-gray-100/60 hover:bg-gray-200/70 border-gray-400 hover:border-gray-500 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="glass-button flex-1 py-1.5 px-3 rounded-lg text-sm font-semibold text-gray-800 
                       bg-indigo-100/60 hover:bg-indigo-200/70 border-indigo-600 hover:border-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed
                       flex items-center justify-center space-x-2"
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
                  <span>Updating...</span>
                </>
              ) : (
                <span>Update Password</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


