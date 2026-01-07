import { useState } from 'react';
import { validatePasswordChangeForm } from '../utils/validation';
import type { ValidationErrors } from '../utils/validation';

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  onUpdatePassword: (oldPassword: string, newPassword: string, newPasswordConfirmation: string) => Promise<void>;
}

export default function ChangePasswordModal({ isOpen, onClose, onSuccess, onUpdatePassword }: ChangePasswordModalProps) {
  const [formData, setFormData] = useState({
    oldPassword: '',
    newPassword: '',
    newPasswordConfirmation: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<ValidationErrors>({});
  const [showErrors, setShowErrors] = useState(false);

  if (!isOpen) return null;

  const validateForm = () => {
    const result = validatePasswordChangeForm(formData);
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
      await onUpdatePassword(
        formData.oldPassword,
        formData.newPassword,
        formData.newPasswordConfirmation
      );
      onSuccess();
      handleClose();
    } catch (err: any) {
      setError(
        err.response?.data?.userMessage ||
          err.response?.data?.message ||
          err.message ||
          'נכשל בעדכון הסיסמה'
      );
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
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" dir="rtl" style={{ margin: 0, top: 0 }}>
      <div className="glass-card rounded-3xl p-6 w-full max-w-md bg-white/90 backdrop-blur-xl shadow-xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-semibold text-gray-900">שנה סיסמה</h2>
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
            <label htmlFor="oldPassword" className="form-label">
              סיסמה נוכחית *
            </label>
            <input
              id="oldPassword"
              name="oldPassword"
              type="password"
              value={formData.oldPassword}
              onChange={handleChange}
              className={`form-input text-center ${showErrors && fieldErrors.oldPassword ? 'form-input-error' : ''}`}
              placeholder="הזן סיסמה נוכחית"
              dir="ltr"
            />
            {showErrors && fieldErrors.oldPassword && (
              <p className="text-red-500 text-xs mt-1">{fieldErrors.oldPassword}</p>
            )}
          </div>

          <div>
            <label htmlFor="newPassword" className="form-label">
              סיסמה חדשה *
            </label>
            <input
              id="newPassword"
              name="newPassword"
              type="password"
              value={formData.newPassword}
              onChange={handleChange}
              className={`form-input text-center ${showErrors && fieldErrors.newPassword ? 'form-input-error' : ''}`}
              placeholder="הזן סיסמה חדשה"
              dir="ltr"
            />
            {showErrors && fieldErrors.newPassword ? (
              <p className="text-red-500 text-xs mt-1">{fieldErrors.newPassword}</p>
            ) : (
              <p className="text-xs text-gray-500 mt-1">
                חייבת להכיל אותיות גדולות, אותיות קטנות, מספרים ותווים מיוחדים
              </p>
            )}
          </div>

          <div>
            <label htmlFor="newPasswordConfirmation" className="form-label">
              אמת סיסמה חדשה *
            </label>
            <input
              id="newPasswordConfirmation"
              name="newPasswordConfirmation"
              type="password"
              value={formData.newPasswordConfirmation}
              onChange={handleChange}
              className={`form-input text-center ${showErrors && fieldErrors.newPasswordConfirmation ? 'form-input-error' : ''}`}
              placeholder="אמת סיסמה חדשה"
              dir="ltr"
            />
            {showErrors && fieldErrors.newPasswordConfirmation && (
              <p className="text-red-500 text-xs mt-1">{fieldErrors.newPasswordConfirmation}</p>
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
                  <span>מעדכן...</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>עדכן סיסמה</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


