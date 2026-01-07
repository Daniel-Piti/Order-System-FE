import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { businessAPI } from '../services/api';
import type { Business } from '../services/api';
import EditBusinessModal from '../components/EditBusinessModal';

export default function BusinessDataPage() {
  const [business, setBusiness] = useState<Business | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchBusiness();
  }, []);

  const fetchBusiness = async () => {
    try {
      setIsLoading(true);
      const businessData = await businessAPI.getMyBusiness();
      setBusiness(businessData);
      setError('');
    } catch (err: any) {
      if (err.response?.status === 401 || err.response?.status === 403) {
        localStorage.removeItem('authToken');
        navigate('/login/manager');
        return;
      }
      const errorMessage = err.response?.data?.userMessage ||
        err.response?.data?.message ||
        err.message ||
        'נכשל בטעינת נתוני העסק';
      
      // Translate "Network Error" to Hebrew
      const isNetworkError = errorMessage === 'Network Error' || 
        errorMessage?.includes('Network Error') ||
        err.code === 'ERR_NETWORK' ||
        err.code === 'ECONNABORTED';
      
      const translatedMessage = isNetworkError ? 'שגיאת רשת' : errorMessage;
      
      setError(translatedMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('he-IL', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatPhoneNumber = (phone: string) => {
    if (phone.length <= 3) return phone;
    return `${phone.slice(0, 3)}-${phone.slice(3)}`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center space-y-4">
          <svg
            className="animate-spin h-12 w-12 text-indigo-600"
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
          <p className="text-gray-600 font-medium">טוען נתוני עסק...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass-card rounded-3xl p-8 max-w-2xl mx-auto">
        <div className="text-center text-red-600">
          <svg
            className="w-16 h-16 mx-auto mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <p className="text-lg font-semibold mb-2">שגיאה בטעינת נתוני העסק</p>
          <p className="text-gray-600">{error}</p>
          <button
            onClick={fetchBusiness}
            className="glass-button mt-4 px-6 py-2 rounded-xl font-medium"
          >
            נסה שוב
          </button>
        </div>
      </div>
    );
  }

  if (!business) {
    return (
      <div className="glass-card rounded-3xl p-8 max-w-2xl mx-auto">
        <div className="text-center text-gray-500">
          <svg
            className="w-16 h-16 mx-auto mb-4 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
            />
          </svg>
          <p className="text-lg font-semibold mb-2">לא נמצאו נתוני עסק</p>
          <p className="text-gray-600">לא נרשם עסק עבור חשבון זה</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-4" dir="rtl">
      {/* Header */}
      <div className="glass-card rounded-3xl p-6 md:p-8">
        <div className="flex flex-col md:flex-row md:flex-wrap md:items-start md:justify-between gap-4 md:gap-6">
          <div className="max-w-full md:flex-1">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2 break-words leading-tight max-w-full">
              {business.name}
            </h1>
            <p className="text-gray-600 text-sm">
              פרטי העסק
            </p>
          </div>
          <div className="mt-4 md:mt-0 w-full md:w-auto">
            <button 
              onClick={() => setIsEditModalOpen(true)}
              className="w-full md:w-auto btn-add-indigo"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              <span>עדכן פרטי עסק</span>
            </button>
          </div>
        </div>
      </div>

      {/* Business Details */}
      <div className="glass-card rounded-3xl p-6 md:p-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Business Name */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              שם העסק
            </label>
            <div className="glass-input px-3 py-2 rounded-lg text-gray-800 text-sm break-words">
              {business.name}
            </div>
          </div>

          {/* State ID Number */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              ח.פ / ע.מ
            </label>
            <div className="glass-input px-3 py-2 rounded-lg text-gray-800 text-sm">
              {business.stateIdNumber}
            </div>
          </div>

          {/* Business Email */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              אימייל העסק
            </label>
            <div className="glass-input px-3 py-2 rounded-lg text-gray-800 text-sm break-words">
              {business.email}
            </div>
          </div>

          {/* Phone Number */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              מספר טלפון
            </label>
            <div className="glass-input px-3 py-2 rounded-lg text-gray-800 text-sm">
              {formatPhoneNumber(business.phoneNumber)}
            </div>
          </div>

          {/* Street Address */}
          <div className="max-w-full">
            <label className="block text-xs font-medium text-gray-600 mb-1">
              כתובת
            </label>
            <div className="glass-input px-3 py-2 rounded-lg text-gray-800 text-sm break-words">
              {business.streetAddress}
            </div>
          </div>

          {/* City */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              עיר
            </label>
            <div className="glass-input px-3 py-2 rounded-lg text-gray-800 text-sm break-words">
              {business.city}
            </div>
          </div>

          {/* Created At */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              תאריך רישום
            </label>
            <div className="glass-input px-3 py-2 rounded-lg text-gray-800 text-sm">
              {formatDate(business.createdAt)}
            </div>
          </div>

          {/* Updated At */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              תאריך עדכון אחרון
            </label>
            <div className="glass-input px-3 py-2 rounded-lg text-gray-800 text-sm">
              {formatDate(business.updatedAt)}
            </div>
          </div>
        </div>
      </div>

      {/* Edit Business Modal */}
      {business && (
        <EditBusinessModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          onSuccess={() => {
            fetchBusiness(); // Refresh the business data
          }}
          currentBusiness={{
            name: business.name,
            stateIdNumber: business.stateIdNumber,
            email: business.email,
            phoneNumber: business.phoneNumber,
            streetAddress: business.streetAddress,
            city: business.city,
          }}
        />
      )}
    </div>
  );
}

