import { useState } from 'react';
import { validateUserCreationForm, validateBusinessForm } from '../utils/validation';
import type { ValidationErrors } from '../utils/validation';
import { managerAPI, businessAPI } from '../services/api';
import Spinner from './Spinner';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

interface AddManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddManagerModal({ isOpen, onClose, onSuccess }: AddManagerModalProps) {
  const MAX_NAME_LENGTH = 50;
  const MAX_EMAIL_LENGTH = 100;
  const MAX_PHONE_LENGTH = 10;
  const MAX_STREET_ADDRESS_LENGTH = 120;
  const MAX_CITY_LENGTH = 60;
  const MAX_STATE_ID_LENGTH = 20;

  // Manager form data
  const [managerFormData, setManagerFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: 'Aa123456!',
    phoneNumber: '',
    dateOfBirth: '',
    streetAddress: '',
    city: '',
  });

  // Business form data
  const [businessFormData, setBusinessFormData] = useState({
    name: '',
    stateIdNumber: '',
    email: '',
    phoneNumber: '',
    streetAddress: '',
    city: '',
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [managerFieldErrors, setManagerFieldErrors] = useState<ValidationErrors>({});
  const [businessFieldErrors, setBusinessFieldErrors] = useState<ValidationErrors>({});
  const [showErrors, setShowErrors] = useState(false);
  const [step, setStep] = useState<'manager' | 'business' | 'complete'>('manager');

  // Reset form when modal is closed/opened
  const handleClose = () => {
    setManagerFormData({
      firstName: '',
      lastName: '',
      email: '',
      password: 'Aa123456!',
      phoneNumber: '',
      dateOfBirth: '',
      streetAddress: '',
      city: '',
    });
    setBusinessFormData({
      name: '',
      stateIdNumber: '',
      email: '',
      phoneNumber: '',
      streetAddress: '',
      city: '',
    });
    setError('');
    setManagerFieldErrors({});
    setBusinessFieldErrors({});
    setShowErrors(false);
    setStep('manager');
    onClose();
  };

  if (!isOpen) return null;

  const validateManagerForm = () => {
    const result = validateUserCreationForm(managerFormData);
    setManagerFieldErrors(result.errors);
    return result.isValid;
  };

  const validateBusinessFormData = () => {
    const result = validateBusinessForm(businessFormData);
    setBusinessFieldErrors(result.errors);
    return result.isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setManagerFieldErrors({});
    setBusinessFieldErrors({});
    setShowErrors(true);

    // Validate both forms
    const isManagerValid = validateManagerForm();
    const isBusinessValid = validateBusinessFormData();

    if (!isManagerValid || !isBusinessValid) {
      return;
    }

    setIsLoading(true);
    setStep('manager');

    try {
      // Step 1: Create manager
      const managerId = await managerAPI.createManager(managerFormData);
      
      // Step 2: Create business with manager ID
      setStep('business');
      await businessAPI.createBusiness({
        managerId,
        name: businessFormData.name.trim(),
        stateIdNumber: businessFormData.stateIdNumber.trim(),
        email: businessFormData.email.trim(),
        phoneNumber: businessFormData.phoneNumber,
        streetAddress: businessFormData.streetAddress.trim(),
        city: businessFormData.city.trim(),
      });

      // Success!
      setStep('complete');
      setTimeout(() => {
      onSuccess();
      handleClose();
      }, 1000);
    } catch (err: any) {
      setError(err.response?.data?.userMessage || err.message || 'Failed to create manager and business');
      setStep('manager');
    } finally {
      setIsLoading(false);
    }
  };

  const handleManagerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const sanitizedValue =
      name === 'firstName' || name === 'lastName'
        ? value.slice(0, MAX_NAME_LENGTH)
        : name === 'phoneNumber'
        ? value.replace(/\D/g, '').slice(0, MAX_PHONE_LENGTH)
        : name === 'email'
        ? value.slice(0, MAX_EMAIL_LENGTH)
        : name === 'streetAddress'
        ? value.slice(0, MAX_STREET_ADDRESS_LENGTH)
        : name === 'city'
        ? value.slice(0, MAX_CITY_LENGTH)
        : value;
    setManagerFormData({
      ...managerFormData,
      [name]: sanitizedValue,
    });
    if (showErrors && managerFieldErrors[name]) {
      setManagerFieldErrors({
        ...managerFieldErrors,
        [name]: '',
      });
    }
  };

  const handleBusinessChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const sanitizedValue =
      name === 'name'
        ? value.slice(0, MAX_NAME_LENGTH)
        : name === 'stateIdNumber'
        ? value.slice(0, MAX_STATE_ID_LENGTH)
        : name === 'phoneNumber'
        ? value.replace(/\D/g, '').slice(0, MAX_PHONE_LENGTH)
        : name === 'email'
        ? value.slice(0, MAX_EMAIL_LENGTH)
        : name === 'streetAddress'
        ? value.slice(0, MAX_STREET_ADDRESS_LENGTH)
        : name === 'city'
        ? value.slice(0, MAX_CITY_LENGTH)
        : value;
    setBusinessFormData({
      ...businessFormData,
      [name]: sanitizedValue,
    });
    if (showErrors && businessFieldErrors[name]) {
      setBusinessFieldErrors({
        ...businessFieldErrors,
        [name]: '',
      });
    }
  };

  return (
    <div 
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm transition-opacity duration-300 ${
        isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}
    >
      <div 
        className={`glass-card rounded-3xl p-6 w-full max-w-6xl max-h-[90vh] overflow-y-auto bg-white/90 backdrop-blur-xl shadow-2xl border border-white/20 transform transition-all duration-500 ${
          isOpen ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-800 mb-1">Create Manager & Business</h2>
            <p className="text-sm text-gray-500">Fill in both forms to complete registration</p>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-white/30 rounded-xl transition-all duration-200 hover:rotate-90"
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

        {/* Progress Indicator */}
        <div className="mb-6 flex items-center justify-center space-x-2">
          <div className={`h-2 w-24 rounded-full transition-all duration-500 ${
            step === 'manager' ? 'bg-blue-500' : 'bg-green-500'
          }`} />
          <div className={`h-2 w-24 rounded-full transition-all duration-500 ${
            step === 'business' || step === 'complete' ? 'bg-green-500' : 'bg-gray-300'
          }`} />
        </div>

        {/* Error Message */}
        {error && (
          <div className="glass-card bg-red-50/70 border-red-200 rounded-xl p-4 mb-6 text-red-600 text-sm animate-shake">
            {error}
          </div>
        )}

        {/* Success Message */}
        {step === 'complete' && (
          <div className="glass-card bg-green-50/70 border-green-200 rounded-xl p-4 mb-6 text-green-600 text-sm animate-fadeIn">
            ✓ Manager and Business created successfully!
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column - Manager Form */}
            <div className="space-y-4">
              <div className="pb-4 border-b border-gray-200/50">
                <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                  <span className="w-8 h-8 rounded-full bg-blue-500/20 text-blue-600 flex items-center justify-center text-sm font-bold">1</span>
                  Manager Information
                </h3>
              </div>

              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="transform transition-all duration-200 hover:scale-[1.02]">
                    <label htmlFor="firstName" className="block text-xs font-medium text-gray-700 mb-1.5">
                First Name *
              </label>
              <input
                id="firstName"
                name="firstName"
                type="text"
                      value={managerFormData.firstName}
                      onChange={handleManagerChange}
              maxLength={MAX_NAME_LENGTH}
                      className={`glass-input w-full px-3 py-2.5 rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all duration-200 ${
                        showErrors && managerFieldErrors.firstName ? 'border-red-400 focus:ring-red-400' : 'border-transparent'
                }`}
                placeholder="John"
              />
                    {showErrors && managerFieldErrors.firstName && (
                      <p className="text-red-500 text-xs mt-1 animate-fadeIn">{managerFieldErrors.firstName}</p>
              )}
            </div>

                  <div className="transform transition-all duration-200 hover:scale-[1.02]">
                    <label htmlFor="lastName" className="block text-xs font-medium text-gray-700 mb-1.5">
                Last Name *
              </label>
              <input
                id="lastName"
                name="lastName"
                type="text"
                      value={managerFormData.lastName}
                      onChange={handleManagerChange}
              maxLength={MAX_NAME_LENGTH}
                      className={`glass-input w-full px-3 py-2.5 rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all duration-200 ${
                        showErrors && managerFieldErrors.lastName ? 'border-red-400 focus:ring-red-400' : 'border-transparent'
                }`}
                placeholder="Doe"
              />
                    {showErrors && managerFieldErrors.lastName && (
                      <p className="text-red-500 text-xs mt-1 animate-fadeIn">{managerFieldErrors.lastName}</p>
              )}
            </div>
          </div>

                <div className="transform transition-all duration-200 hover:scale-[1.02]">
                  <label htmlFor="managerEmail" className="block text-xs font-medium text-gray-700 mb-1.5">
              Email *
            </label>
            <input
                    id="managerEmail"
              name="email"
              type="email"
                    value={managerFormData.email}
                    onChange={handleManagerChange}
            maxLength={MAX_EMAIL_LENGTH}
                    className={`glass-input w-full px-3 py-2.5 rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all duration-200 ${
                      showErrors && managerFieldErrors.email ? 'border-red-400 focus:ring-red-400' : 'border-transparent'
              }`}
              placeholder="john@example.com"
            />
                  {showErrors && managerFieldErrors.email && (
                    <p className="text-red-500 text-xs mt-1 animate-fadeIn">{managerFieldErrors.email}</p>
            )}
          </div>

                <div className="transform transition-all duration-200 hover:scale-[1.02]">
                  <label htmlFor="managerPassword" className="block text-xs font-medium text-gray-700 mb-1.5">
              Password *
            </label>
            <input
                    id="managerPassword"
              name="password"
              type="text"
                    value={managerFormData.password}
                    onChange={handleManagerChange}
                    className={`glass-input w-full px-3 py-2.5 rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all duration-200 ${
                      showErrors && managerFieldErrors.password ? 'border-red-400 focus:ring-red-400' : 'border-transparent'
              }`}
              placeholder="Aa123456!"
            />
                  {showErrors && managerFieldErrors.password ? (
                    <p className="text-red-500 text-xs mt-1 animate-fadeIn">{managerFieldErrors.password}</p>
            ) : (
                    <p className="text-xs text-gray-500 mt-1">Must contain uppercase, lowercase, numbers, and special characters</p>
            )}
          </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="transform transition-all duration-200 hover:scale-[1.02]">
                    <label htmlFor="managerPhoneNumber" className="block text-xs font-medium text-gray-700 mb-1.5">
                Phone Number *
              </label>
              <input
                      id="managerPhoneNumber"
                name="phoneNumber"
                type="tel"
                      value={managerFormData.phoneNumber}
                      onChange={handleManagerChange}
            maxLength={MAX_PHONE_LENGTH}
            inputMode="numeric"
            pattern="[0-9]*"
                      className={`glass-input w-full px-3 py-2.5 rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all duration-200 ${
                        showErrors && managerFieldErrors.phoneNumber ? 'border-red-400 focus:ring-red-400' : 'border-transparent'
                }`}
                      placeholder="0501234567"
              />
                    {showErrors && managerFieldErrors.phoneNumber && (
                      <p className="text-red-500 text-xs mt-1 animate-fadeIn">{managerFieldErrors.phoneNumber}</p>
              )}
            </div>

                  <div className="transform transition-all duration-200 hover:scale-[1.02]">
                    <label htmlFor="managerDateOfBirth" className="block text-xs font-medium text-gray-700 mb-1.5">
                Date of Birth *
              </label>
              <input
                      id="managerDateOfBirth"
                name="dateOfBirth"
                type="date"
                      value={managerFormData.dateOfBirth}
                      onChange={handleManagerChange}
                      className={`glass-input w-full px-3 py-2.5 rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all duration-200 ${
                        showErrors && managerFieldErrors.dateOfBirth ? 'border-red-400 focus:ring-red-400' : 'border-transparent'
                }`}
              />
                    {showErrors && managerFieldErrors.dateOfBirth && (
                      <p className="text-red-500 text-xs mt-1 animate-fadeIn">{managerFieldErrors.dateOfBirth}</p>
              )}
            </div>
          </div>

                <div className="transform transition-all duration-200 hover:scale-[1.02]">
                  <label htmlFor="managerStreetAddress" className="block text-xs font-medium text-gray-700 mb-1.5">
              Street Address *
            </label>
            <input
                    id="managerStreetAddress"
              name="streetAddress"
              type="text"
                    value={managerFormData.streetAddress}
                    onChange={handleManagerChange}
              maxLength={MAX_STREET_ADDRESS_LENGTH}
                    className={`glass-input w-full px-3 py-2.5 rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all duration-200 ${
                      showErrors && managerFieldErrors.streetAddress ? 'border-red-400 focus:ring-red-400' : 'border-transparent'
              }`}
              placeholder="123 Main St"
            />
                  {showErrors && managerFieldErrors.streetAddress && (
                    <p className="text-red-500 text-xs mt-1 animate-fadeIn">{managerFieldErrors.streetAddress}</p>
                  )}
                </div>

                <div className="transform transition-all duration-200 hover:scale-[1.02]">
                  <label htmlFor="managerCity" className="block text-xs font-medium text-gray-700 mb-1.5">
                    City *
                  </label>
                  <input
                    id="managerCity"
                    name="city"
                    type="text"
                    value={managerFormData.city}
                    onChange={handleManagerChange}
                    maxLength={MAX_CITY_LENGTH}
                    className={`glass-input w-full px-3 py-2.5 rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all duration-200 ${
                      showErrors && managerFieldErrors.city ? 'border-red-400 focus:ring-red-400' : 'border-transparent'
                    }`}
                    placeholder="Tel Aviv"
                  />
                  {showErrors && managerFieldErrors.city && (
                    <p className="text-red-500 text-xs mt-1 animate-fadeIn">{managerFieldErrors.city}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Right Column - Business Form */}
            <div className="space-y-4">
              <div className="pb-4 border-b border-gray-200/50">
                <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                  <span className="w-8 h-8 rounded-full bg-green-500/20 text-green-600 flex items-center justify-center text-sm font-bold">2</span>
                  Business Information
                </h3>
              </div>

              <div className="space-y-3">
                <div className="transform transition-all duration-200 hover:scale-[1.02]">
                  <label htmlFor="businessName" className="block text-xs font-medium text-gray-700 mb-1.5">
                    Business Name *
                  </label>
                  <input
                    id="businessName"
                    name="name"
                    type="text"
                    value={businessFormData.name}
                    onChange={handleBusinessChange}
                    maxLength={MAX_NAME_LENGTH}
                    className={`glass-input w-full px-3 py-2.5 rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-green-500/50 transition-all duration-200 ${
                      showErrors && businessFieldErrors.name ? 'border-red-400 focus:ring-red-400' : 'border-transparent'
                    }`}
                    placeholder="Acme Corp"
                  />
                  {showErrors && businessFieldErrors.name && (
                    <p className="text-red-500 text-xs mt-1 animate-fadeIn">{businessFieldErrors.name}</p>
                  )}
                </div>

                <div className="transform transition-all duration-200 hover:scale-[1.02]">
                  <label htmlFor="stateIdNumber" className="block text-xs font-medium text-gray-700 mb-1.5">
                    State ID Number *
                  </label>
                  <input
                    id="stateIdNumber"
                    name="stateIdNumber"
                    type="text"
                    value={businessFormData.stateIdNumber}
                    onChange={handleBusinessChange}
                    maxLength={MAX_STATE_ID_LENGTH}
                    className={`glass-input w-full px-3 py-2.5 rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-green-500/50 transition-all duration-200 ${
                      showErrors && businessFieldErrors.stateIdNumber ? 'border-red-400 focus:ring-red-400' : 'border-transparent'
                    }`}
                    placeholder="123456789"
                  />
                  {showErrors && businessFieldErrors.stateIdNumber && (
                    <p className="text-red-500 text-xs mt-1 animate-fadeIn">{businessFieldErrors.stateIdNumber}</p>
                  )}
                </div>

                <div className="transform transition-all duration-200 hover:scale-[1.02]">
                  <label htmlFor="businessEmail" className="block text-xs font-medium text-gray-700 mb-1.5">
                    Business Email *
                  </label>
                  <input
                    id="businessEmail"
                    name="email"
                    type="email"
                    value={businessFormData.email}
                    onChange={handleBusinessChange}
                    maxLength={MAX_EMAIL_LENGTH}
                    className={`glass-input w-full px-3 py-2.5 rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-green-500/50 transition-all duration-200 ${
                      showErrors && businessFieldErrors.email ? 'border-red-400 focus:ring-red-400' : 'border-transparent'
                    }`}
                    placeholder="contact@acme.com"
                  />
                  {showErrors && businessFieldErrors.email && (
                    <p className="text-red-500 text-xs mt-1 animate-fadeIn">{businessFieldErrors.email}</p>
                  )}
                </div>

                <div className="transform transition-all duration-200 hover:scale-[1.02]">
                  <label htmlFor="businessPhoneNumber" className="block text-xs font-medium text-gray-700 mb-1.5">
                    Phone Number *
                  </label>
                  <input
                    id="businessPhoneNumber"
                    name="phoneNumber"
                    type="tel"
                    value={businessFormData.phoneNumber}
                    onChange={handleBusinessChange}
                    maxLength={MAX_PHONE_LENGTH}
                    inputMode="numeric"
                    pattern="[0-9]*"
                    className={`glass-input w-full px-3 py-2.5 rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-green-500/50 transition-all duration-200 ${
                      showErrors && businessFieldErrors.phoneNumber ? 'border-red-400 focus:ring-red-400' : 'border-transparent'
                    }`}
                    placeholder="0501234567"
                  />
                  {showErrors && businessFieldErrors.phoneNumber && (
                    <p className="text-red-500 text-xs mt-1 animate-fadeIn">{businessFieldErrors.phoneNumber}</p>
                  )}
                </div>

                <div className="transform transition-all duration-200 hover:scale-[1.02]">
                  <label htmlFor="businessStreetAddress" className="block text-xs font-medium text-gray-700 mb-1.5">
                    Street Address *
                  </label>
                  <input
                    id="businessStreetAddress"
                    name="streetAddress"
                    type="text"
                    value={businessFormData.streetAddress}
                    onChange={handleBusinessChange}
                    maxLength={MAX_STREET_ADDRESS_LENGTH}
                    className={`glass-input w-full px-3 py-2.5 rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-green-500/50 transition-all duration-200 ${
                      showErrors && businessFieldErrors.streetAddress ? 'border-red-400 focus:ring-red-400' : 'border-transparent'
                    }`}
                    placeholder="456 Business Ave"
                  />
                  {showErrors && businessFieldErrors.streetAddress && (
                    <p className="text-red-500 text-xs mt-1 animate-fadeIn">{businessFieldErrors.streetAddress}</p>
            )}
          </div>

                <div className="transform transition-all duration-200 hover:scale-[1.02]">
                  <label htmlFor="businessCity" className="block text-xs font-medium text-gray-700 mb-1.5">
              City *
            </label>
            <input
                    id="businessCity"
              name="city"
              type="text"
                    value={businessFormData.city}
                    onChange={handleBusinessChange}
              maxLength={MAX_CITY_LENGTH}
                    className={`glass-input w-full px-3 py-2.5 rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-green-500/50 transition-all duration-200 ${
                      showErrors && businessFieldErrors.city ? 'border-red-400 focus:ring-red-400' : 'border-transparent'
              }`}
                    placeholder="Tel Aviv"
            />
                  {showErrors && businessFieldErrors.city && (
                    <p className="text-red-500 text-xs mt-1 animate-fadeIn">{businessFieldErrors.city}</p>
            )}
                </div>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex gap-4 pt-6 mt-6 border-t border-gray-200/50">
            <button
              type="button"
              onClick={handleClose}
              disabled={isLoading}
              className="glass-button flex-1 py-3 px-4 rounded-xl text-sm font-semibold text-gray-800 bg-gray-100/60 hover:bg-gray-200/70 border border-gray-300/50 transition-all duration-200 hover:scale-[1.02] disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || step === 'complete'}
              className="glass-button flex-1 py-3 px-4 rounded-xl text-sm font-semibold text-white bg-indigo-500 hover:bg-indigo-600 border border-indigo-400/30 transition-all duration-200 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg"
            >
              {isLoading ? (
                <>
                  {step === 'manager' && (
                    <>
                      <Spinner size="sm" />
                      <span>Creating Manager...</span>
                    </>
                  )}
                  {step === 'business' && (
                    <>
                      <Spinner size="sm" />
                      <span>Creating Business...</span>
                    </>
                  )}
                </>
              ) : step === 'complete' ? (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Success!</span>
                </>
              ) : (
                <span>Create Manager & Business</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
