import { useEffect, useState } from 'react';
import { agentAPI, type UpdateAgentRequest, type Agent } from '../services/api';
import CloseButton from './CloseButton';
import type { ValidationErrors } from '../utils/validation';
import { validateAgentProfileForm, AGENT_FIELD_LIMITS } from '../utils/validation';
import Spinner from './Spinner';

interface AgentEditModalProps {
  isOpen: boolean;
  agent: Agent | null;
  onClose: () => void;
  onSuccess: () => void;
}

const INITIAL_FORM: UpdateAgentRequest = {
  firstName: '',
  lastName: '',
  phoneNumber: '',
  streetAddress: '',
  city: '',
};

export default function AgentEditModal({ isOpen, agent, onClose, onSuccess }: AgentEditModalProps) {
  const [formData, setFormData] = useState<UpdateAgentRequest>(INITIAL_FORM);
  const [fieldErrors, setFieldErrors] = useState<ValidationErrors>({});
  const [showErrors, setShowErrors] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && agent) {
      setFormData({
        firstName: agent.firstName,
        lastName: agent.lastName,
        phoneNumber: agent.phoneNumber,
        streetAddress: agent.streetAddress,
        city: agent.city,
      });
      setFieldErrors({});
      setShowErrors(false);
      setError('');
    }
  }, [isOpen, agent]);

  if (!isOpen || !agent) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    let sanitized = value;

    switch (name) {
      case 'firstName':
      case 'lastName':
        sanitized = value.slice(0, AGENT_FIELD_LIMITS.firstName);
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

    const validation = validateAgentProfileForm(formData);
    setFieldErrors(validation.errors);

    if (!validation.isValid) {
      return;
    }

    // Check if anything has changed
    const hasChanges =
      formData.firstName !== agent.firstName ||
      formData.lastName !== agent.lastName ||
      formData.phoneNumber !== agent.phoneNumber ||
      formData.streetAddress !== agent.streetAddress ||
      formData.city !== agent.city;

    // If nothing changed, just close the modal without making an API call
    if (!hasChanges) {
      handleClose();
      return;
    }

    setIsSubmitting(true);

    try {
      await agentAPI.updateAgent(agent.id, formData);
      onSuccess();
      handleClose();
    } catch (err: any) {
      setError(
        err.response?.data?.userMessage ||
          err.response?.data?.message ||
          err.message ||
          'Failed to update agent'
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
      <div className="glass-card rounded-3xl p-6 md:p-8 w-full max-w-xl max-h-[90vh] overflow-y-auto bg-white/90 backdrop-blur-xl shadow-xl">
        <div className="modal-header">
          <div>
            <h2 className="modal-header-title">ערוך סוכן</h2>
            <p className="text-xs text-gray-500 mt-1">עדכן פרטי קשר עבור {agent.firstName} {agent.lastName}</p>
          </div>
          <CloseButton onClick={handleClose} ariaLabel="Close modal" />
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50/80 border border-red-200/60 rounded-xl text-red-600 text-sm">
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
                className={`form-input ${showErrors && fieldErrors.firstName ? 'form-input-error' : ''}`}
                placeholder="לדוגמה: יוחנן"
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
                className={`form-input ${showErrors && fieldErrors.lastName ? 'form-input-error' : ''}`}
                placeholder="לדוגמה: כהן"
              />
              {showErrors && fieldErrors.lastName && <p className="text-red-500 text-xs mt-1">{fieldErrors.lastName}</p>}
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
                className={`form-input ${showErrors && fieldErrors.phoneNumber ? 'form-input-error' : ''}`}
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
                className={`form-input ${showErrors && fieldErrors.city ? 'form-input-error' : ''}`}
                placeholder="לדוגמה: תל אביב"
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
              className={`form-input ${showErrors && fieldErrors.streetAddress ? 'form-input-error' : ''}`}
              placeholder="לדוגמה: רחוב הרצל 123"
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

