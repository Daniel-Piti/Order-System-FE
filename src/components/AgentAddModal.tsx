import { useEffect, useState } from 'react';
import { agentAPI, type NewAgentRequest } from '../services/api';
import type { ValidationErrors } from '../utils/validation';
import { validateAgentCreationForm, AGENT_FIELD_LIMITS } from '../utils/validation';

interface AgentAddModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const INITIAL_FORM: NewAgentRequest = {
  firstName: '',
  lastName: '',
  email: '',
  password: '',
  phoneNumber: '',
  streetAddress: '',
  city: '',
};

export default function AgentAddModal({ isOpen, onClose, onSuccess }: AgentAddModalProps) {
  const [formData, setFormData] = useState<NewAgentRequest>(INITIAL_FORM);
  const [fieldErrors, setFieldErrors] = useState<ValidationErrors>({});
  const [showErrors, setShowErrors] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setFormData(INITIAL_FORM);
      setFieldErrors({});
      setShowErrors(false);
      setError('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    let sanitized = value;

    switch (name) {
      case 'firstName':
      case 'lastName':
        sanitized = value.slice(0, AGENT_FIELD_LIMITS.firstName);
        break;
      case 'email':
        sanitized = value.slice(0, AGENT_FIELD_LIMITS.email);
        break;
      case 'password':
        sanitized = value.slice(0, AGENT_FIELD_LIMITS.password);
        break;
      case 'phoneNumber':
        sanitized = value.replace(/\D/g, '').slice(0, AGENT_FIELD_LIMITS.phoneNumber);
        break;
      case 'streetAddress':
        sanitized = value.slice(0, AGENT_FIELD_LIMITS.streetAddress);
        break;
      case 'city':
        sanitized = value.slice(0, AGENT_FIELD_LIMITS.city);
        break;
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setShowErrors(true);
    setError('');

    const validation = validateAgentCreationForm(formData);
    setFieldErrors(validation.errors);

    if (!validation.isValid) {
      return;
    }

    setIsSubmitting(true);

    try {
      await agentAPI.createAgent(formData);
      onSuccess();
      handleClose();
    } catch (err: any) {
      setError(
        err.response?.data?.userMessage ||
          err.response?.data?.message ||
          err.message ||
          'Failed to create agent'
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
      <div className="glass-card rounded-3xl p-6 w-full max-w-xl max-h-[85vh] overflow-y-auto bg-white/90 backdrop-blur-xl shadow-xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-semibold text-gray-900">הוסף סוכן חדש</h2>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100/50 rounded-xl transition-colors"
            aria-label="Close modal"
          >
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {error && (
          <div className="glass-card bg-red-50/80 border border-red-200/60 rounded-xl p-3 text-red-600 text-sm mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5" noValidate>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            <div>
              <label className="form-label">שם פרטי *</label>
              <input
                name="firstName"
                type="text"
                value={formData.firstName}
                onChange={handleChange}
                className={`form-input text-center ${showErrors && fieldErrors.firstName ? 'form-input-error' : ''}`}
                placeholder="לדוגמה: יוחנן"
                dir="ltr"
              />
              {showErrors && fieldErrors.firstName && (
                <p className="text-red-500 text-xs mt-1">{fieldErrors.firstName}</p>
              )}
            </div>
            <div>
              <label className="form-label">שם משפחה *</label>
              <input
                name="lastName"
                type="text"
                value={formData.lastName}
                onChange={handleChange}
                className={`form-input text-center ${showErrors && fieldErrors.lastName ? 'form-input-error' : ''}`}
                placeholder="לדוגמה: כהן"
                dir="ltr"
              />
              {showErrors && fieldErrors.lastName && <p className="text-red-500 text-xs mt-1">{fieldErrors.lastName}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            <div>
              <label className="form-label">אימייל *</label>
              <input
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                className={`form-input text-center ${showErrors && fieldErrors.email ? 'form-input-error' : ''}`}
                placeholder="לדוגמה: agent@example.com"
                autoComplete="email"
                dir="ltr"
              />
              {showErrors && fieldErrors.email && <p className="text-red-500 text-xs mt-1">{fieldErrors.email}</p>}
            </div>
            <div>
              <label className="form-label">סיסמה זמנית *</label>
              <input
                name="password"
                type="text"
                value={formData.password}
                onChange={handleChange}
                className={`form-input text-center ${showErrors && fieldErrors.password ? 'form-input-error' : ''}`}
                placeholder="סיסמה ראשונית לגישה"
                dir="ltr"
              />
              {showErrors && fieldErrors.password && <p className="text-red-500 text-xs mt-1">{fieldErrors.password}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            <div>
              <label className="form-label">מספר טלפון *</label>
              <input
                name="phoneNumber"
                type="tel"
                value={formData.phoneNumber}
                onChange={handleChange}
                className={`form-input text-center ${showErrors && fieldErrors.phoneNumber ? 'form-input-error' : ''}`}
                placeholder="לדוגמה: 0501234567"
                dir="ltr"
              />
              {showErrors && fieldErrors.phoneNumber && (
                <p className="text-red-500 text-xs mt-1">{fieldErrors.phoneNumber}</p>
              )}
            </div>
            <div>
              <label className="form-label">עיר *</label>
              <input
                name="city"
                type="text"
                value={formData.city}
                onChange={handleChange}
                className={`form-input text-center ${showErrors && fieldErrors.city ? 'form-input-error' : ''}`}
                placeholder="לדוגמה: תל אביב"
                dir="ltr"
              />
              {showErrors && fieldErrors.city && <p className="text-red-500 text-xs mt-1">{fieldErrors.city}</p>}
            </div>
          </div>

          <div>
            <label className="form-label">כתובת *</label>
            <input
              name="streetAddress"
              type="text"
              value={formData.streetAddress}
              onChange={handleChange}
              className={`form-input text-center ${showErrors && fieldErrors.streetAddress ? 'form-input-error' : ''}`}
              placeholder="לדוגמה: רחוב הרצל 123"
              dir="ltr"
            />
            {showErrors && fieldErrors.streetAddress && (
              <p className="text-red-500 text-xs mt-1">{fieldErrors.streetAddress}</p>
            )}
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
                  <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  <span>מוסיף...</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>הוסף סוכן</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
