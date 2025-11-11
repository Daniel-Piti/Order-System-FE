import { useEffect, useState } from 'react';
import { agentAPI } from '../services/api';

interface AgentCustomerDeleteModalProps {
  isOpen: boolean;
  customerName: string | null;
  customerId: string | null;
  onClose: () => void;
  onDeleted: () => void;
}

export default function AgentCustomerDeleteModal({
  isOpen,
  customerName,
  customerId,
  onClose,
  onDeleted,
}: AgentCustomerDeleteModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) {
      setIsSubmitting(false);
      setError('');
    }
  }, [isOpen]);

  if (!isOpen || !customerId) {
    return null;
  }

  const handleCancel = () => {
    if (isSubmitting) return;
    onClose();
  };

  const handleConfirm = async () => {
    setIsSubmitting(true);
    setError('');
    try {
      await agentAPI.deleteCustomerForAgent(customerId);
      onDeleted();
    } catch (err: any) {
      setError(err?.response?.data?.userMessage || err?.message || 'Failed to delete customer');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="glass-card rounded-3xl p-6 w-full max-w-md bg-white/90">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-800">Delete Customer</h2>
          <button
            onClick={handleCancel}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            aria-label="Close delete customer modal"
            type="button"
            disabled={isSubmitting}
          >
            <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex items-center gap-4 mb-4">
          <div className="p-3 rounded-full bg-red-100">
            <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01M5.934 21h12.132A2 2 0 0020 19l-1-11a2 2 0 00-2-2h-1.086a1 1 0 01-.894-.553l-.724-1.447A1 1 0 0013.382 4h-2.764a1 1 0 00-.894.553l-.724 1.447A1 1 0 008.106 6H7a2 2 0 00-2 2l-1 11a2 2 0 001.934 2z"
              />
            </svg>
          </div>
          <div>
            <p className="text-sm text-gray-600 uppercase tracking-[0.25em] font-semibold mb-1">Confirmation</p>
            <p className="text-gray-800 text-base font-medium">
              Are you sure you want to delete{' '}
              <span className="font-semibold text-gray-900">{customerName ?? 'this customer'}</span>?
            </p>
            <p className="text-sm text-gray-500 mt-2">
              This action cannot be undone. Their data and any related overrides will be permanently removed.
            </p>
          </div>
        </div>

        {error && (
          <div className="glass-card bg-red-50/70 border border-red-200 rounded-xl p-3 text-red-600 text-sm mb-4">
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={handleCancel}
            disabled={isSubmitting}
            className="glass-button flex-1 py-2 px-4 rounded-lg text-sm font-semibold text-gray-700 bg-gray-100/80 hover:bg-gray-200/80 border border-gray-300 hover:border-gray-400 disabled:opacity-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isSubmitting}
            className="glass-button flex-1 py-2 px-4 rounded-lg text-sm font-semibold text-white bg-red-500/90 hover:bg-red-500 border border-red-500/60 hover:border-red-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 transition-colors"
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
                <span>Deleting…</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3"
                  />
                </svg>
                <span>Delete</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}


