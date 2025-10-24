import { useState } from 'react';

interface AddUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddUserModal({ isOpen, onClose, onSuccess }: AddUserModalProps) {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: 'Aa123456!', // Default password
    phoneNumber: '',
    dateOfBirth: '',
    mainAddress: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [showErrors, setShowErrors] = useState(false);

  // Reset form when modal is closed/opened
  const handleClose = () => {
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      password: 'Aa123456!',
      phoneNumber: '',
      dateOfBirth: '',
      mainAddress: '',
    });
    setError('');
    setFieldErrors({});
    setShowErrors(false);
    onClose();
  };

  if (!isOpen) return null;

  const validateForm = () => {
    const errors: Record<string, string> = {};

    if (!formData.firstName.trim()) errors.firstName = 'First name is required';
    if (!formData.lastName.trim()) errors.lastName = 'Last name is required';
    if (!formData.email.trim()) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Please enter a valid email';
    }
    if (!formData.password.trim()) {
      errors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      errors.password = 'Password must be at least 8 characters';
    }
    if (!formData.phoneNumber.trim()) errors.phoneNumber = 'Phone number is required';
    if (!formData.dateOfBirth) errors.dateOfBirth = 'Date of birth is required';
    if (!formData.mainAddress.trim()) errors.mainAddress = 'Address is required';

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
      const response = await fetch('http://localhost:8080/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.userMessage || 'Failed to create user');
      }

      // Success!
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        password: 'Aa123456!',
        phoneNumber: '',
        dateOfBirth: '',
        mainAddress: '',
      });
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="glass-card rounded-3xl p-5 w-full max-w-lg max-h-[85vh] overflow-y-auto bg-white/85">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-gray-800">Add New User</h2>
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
                First Name *
              </label>
              <input
                id="firstName"
                name="firstName"
                type="text"
                value={formData.firstName}
                onChange={handleChange}
                className={`glass-input w-full px-2.5 py-1.5 rounded-lg text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                  showErrors && fieldErrors.firstName ? 'border-red-400 focus:ring-red-400' : ''
                }`}
                placeholder="John"
              />
              {showErrors && fieldErrors.firstName && (
                <p className="text-red-500 text-xs mt-0.5">{fieldErrors.firstName}</p>
              )}
            </div>

            <div>
              <label htmlFor="lastName" className="block text-xs font-medium text-gray-700 mb-1">
                Last Name *
              </label>
              <input
                id="lastName"
                name="lastName"
                type="text"
                value={formData.lastName}
                onChange={handleChange}
                className={`glass-input w-full px-2.5 py-1.5 rounded-lg text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                  showErrors && fieldErrors.lastName ? 'border-red-400 focus:ring-red-400' : ''
                }`}
                placeholder="Doe"
              />
              {showErrors && fieldErrors.lastName && (
                <p className="text-red-500 text-xs mt-0.5">{fieldErrors.lastName}</p>
              )}
            </div>
          </div>

          <div>
            <label htmlFor="email" className="block text-xs font-medium text-gray-700 mb-1">
              Email *
            </label>
            <input
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              className={`glass-input w-full px-2.5 py-1.5 rounded-lg text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                showErrors && fieldErrors.email ? 'border-red-400 focus:ring-red-400' : ''
              }`}
              placeholder="john@example.com"
            />
            {showErrors && fieldErrors.email && (
              <p className="text-red-500 text-xs mt-0.5">{fieldErrors.email}</p>
            )}
          </div>

          <div>
            <label htmlFor="password" className="block text-xs font-medium text-gray-700 mb-1">
              Password *
            </label>
            <input
              id="password"
              name="password"
              type="text"
              value={formData.password}
              onChange={handleChange}
              className={`glass-input w-full px-2.5 py-1.5 rounded-lg text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                showErrors && fieldErrors.password ? 'border-red-400 focus:ring-red-400' : ''
              }`}
              placeholder="Aa123456!"
            />
            {showErrors && fieldErrors.password ? (
              <p className="text-red-500 text-xs mt-0.5">{fieldErrors.password}</p>
            ) : (
              <p className="text-xs text-gray-500 mt-0.5">
                Must contain uppercase, lowercase, numbers, and special characters
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label htmlFor="phoneNumber" className="block text-xs font-medium text-gray-700 mb-1">
                Phone Number *
              </label>
              <input
                id="phoneNumber"
                name="phoneNumber"
                type="tel"
                value={formData.phoneNumber}
                onChange={handleChange}
                className={`glass-input w-full px-2.5 py-1.5 rounded-lg text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                  showErrors && fieldErrors.phoneNumber ? 'border-red-400 focus:ring-red-400' : ''
                }`}
                placeholder="+1234567890"
              />
              {showErrors && fieldErrors.phoneNumber && (
                <p className="text-red-500 text-xs mt-0.5">{fieldErrors.phoneNumber}</p>
              )}
            </div>

            <div>
              <label htmlFor="dateOfBirth" className="block text-xs font-medium text-gray-700 mb-1">
                Date of Birth *
              </label>
              <input
                id="dateOfBirth"
                name="dateOfBirth"
                type="date"
                value={formData.dateOfBirth}
                onChange={handleChange}
                className={`glass-input w-full px-2.5 py-1.5 rounded-lg text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                  showErrors && fieldErrors.dateOfBirth ? 'border-red-400 focus:ring-red-400' : ''
                }`}
              />
              {showErrors && fieldErrors.dateOfBirth && (
                <p className="text-red-500 text-xs mt-0.5">{fieldErrors.dateOfBirth}</p>
              )}
            </div>
          </div>

          <div>
            <label htmlFor="mainAddress" className="block text-xs font-medium text-gray-700 mb-1">
              Main Address *
            </label>
            <input
              id="mainAddress"
              name="mainAddress"
              type="text"
              value={formData.mainAddress}
              onChange={handleChange}
              className={`glass-input w-full px-2.5 py-1.5 rounded-lg text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                showErrors && fieldErrors.mainAddress ? 'border-red-400 focus:ring-red-400' : ''
              }`}
              placeholder="123 Main St, City, Country"
            />
            {showErrors && fieldErrors.mainAddress && (
              <p className="text-red-500 text-xs mt-0.5">{fieldErrors.mainAddress}</p>
            )}
          </div>

          <div className="flex space-x-2.5 pt-2.5">
            <button
              type="button"
              onClick={handleClose}
              className="glass-button flex-1 py-1.5 px-3 rounded-lg text-sm font-semibold text-gray-800 bg-red-100/60 hover:bg-red-200/70 border-red-500 hover:border-red-600"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="glass-button flex-1 py-1.5 px-3 rounded-lg text-sm font-semibold text-gray-800 
                       bg-green-100/60 hover:bg-green-200/70 border-green-600 hover:border-green-700 disabled:opacity-50 disabled:cursor-not-allowed
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
                  <span>Creating...</span>
                </>
              ) : (
                <span>Create User</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

