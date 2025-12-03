import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import EditProfileModal from '../components/EditProfileModal';
import ChangePasswordModal from '../components/ChangePasswordModal';
import { managerAPI } from '../services/api';
import type { Manager } from '../services/api';

export default function ProfilePage() {
  const [profile, setProfile] = useState<Manager | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isChangePasswordModalOpen, setIsChangePasswordModalOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setIsLoading(true);
      const manager = await managerAPI.getCurrentManager();
      setProfile(manager);
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
        'נכשל בטעינת הפרופיל';
      
      // Translate "Network Error" to Hebrew (check both message and axios error codes)
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
          <p className="text-gray-600 font-medium">טוען פרופיל...</p>
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
          <p className="text-lg font-semibold mb-2">שגיאה בטעינת הפרופיל</p>
          <p className="text-gray-600">{error}</p>
          <button
            onClick={fetchProfile}
            className="glass-button mt-4 px-6 py-2 rounded-xl font-medium"
          >
            נסה שוב
          </button>
        </div>
      </div>
    );
  }

  if (!profile) return null;

  return (
    <div className="max-w-4xl mx-auto space-y-4" dir="rtl">
      {/* Header */}
      <div className="glass-card rounded-3xl p-6 md:p-8">
          <div className="flex flex-col md:flex-row md:flex-wrap md:items-start md:justify-between gap-4 md:gap-6">
          <div className="max-w-full md:flex-1">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2 break-words leading-tight max-w-full">
              שלום {profile.firstName} {profile.lastName}!
            </h1>
            <p className="text-gray-600 text-sm">
              פרטים אישיים ומידע על החשבון שלך
            </p>
          </div>
          <div className="mt-4 md:mt-0 w-full md:w-auto">
            <button 
              onClick={() => setIsEditModalOpen(true)}
              className="glass-button w-full md:w-auto px-6 py-2 rounded-xl font-medium text-gray-800 hover:bg-white/40 flex items-center justify-center gap-3"
            >
              <span>ערוך פרטים אישיים</span>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Profile Details */}
      <div className="glass-card rounded-3xl p-6 md:p-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* First Name */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              שם פרטי
            </label>
            <div className="glass-input px-3 py-2 rounded-lg text-gray-800 text-sm break-words">
              {profile.firstName}
            </div>
          </div>

          {/* Last Name */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              שם משפחה
            </label>
            <div className="glass-input px-3 py-2 rounded-lg text-gray-800 text-sm break-words">
              {profile.lastName}
            </div>
          </div>

          {/* Business Name */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              שם העסק
            </label>
            <div className="glass-input px-3 py-2 rounded-lg text-gray-800 text-sm break-words">
              {profile.businessName}
            </div>
          </div>

          {/* Manager ID */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              ID
            </label>
            <div className="glass-input px-3 py-2 rounded-lg text-gray-800 font-mono text-sm">
              {profile.id}
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              אימייל
            </label>
            <div className="glass-input px-3 py-2 rounded-lg text-gray-800 text-sm break-words">
              {profile.email}
            </div>
          </div>

          {/* Phone Number */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              מספר טלפון
            </label>
            <div className="glass-input px-3 py-2 rounded-lg text-gray-800 text-sm">
              {formatPhoneNumber(profile.phoneNumber)}
            </div>
          </div>

          {/* Street Address */}
          <div className="max-w-full">
            <label className="block text-xs font-medium text-gray-600 mb-1">
              כתובת
            </label>
            <div className="glass-input px-3 py-2 rounded-lg text-gray-800 text-sm break-words">
              {profile.streetAddress}
            </div>
          </div>

          {/* City */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              עיר
            </label>
            <div className="glass-input px-3 py-2 rounded-lg text-gray-800 text-sm break-words">
              {profile.city}
            </div>
          </div>

          {/* Date of Birth */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              תאריך לידה
            </label>
            <div className="glass-input px-3 py-2 rounded-lg text-gray-800 text-sm">
              {formatDate(profile.dateOfBirth)}
            </div>
          </div>

          {/* Account Created */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              תאריך יצירת חשבון
            </label>
            <div className="glass-input px-3 py-2 rounded-lg text-gray-800 text-sm">
              {formatDate(profile.createdAt)}
            </div>
          </div>
        </div>
      </div>

      {/* Security Section */}
      <div className="glass-card rounded-3xl p-6 md:p-8">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">הגדרות אבטחה</h2>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
          <div>
            <p className="font-medium text-gray-800">סיסמה</p>
            <p className="text-sm text-gray-600">
              עדכן את הסיסמה שלך
            </p>
          </div>
          <button 
            onClick={() => setIsChangePasswordModalOpen(true)}
            className="glass-button px-6 py-2 rounded-xl font-medium text-gray-800 hover:bg-white/40 flex items-center gap-3"
          >
            <span>שנה סיסמה</span>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Edit Profile Modal */}
      {profile && (
        <EditProfileModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          onSuccess={() => {
            fetchProfile(); // Refresh the profile data
          }}
          currentProfile={{
            firstName: profile.firstName,
            lastName: profile.lastName,
            businessName: profile.businessName,
            phoneNumber: profile.phoneNumber,
            dateOfBirth: profile.dateOfBirth,
            streetAddress: profile.streetAddress,
            city: profile.city,
          }}
        />
      )}

      {/* Change Password Modal */}
      <ChangePasswordModal
        isOpen={isChangePasswordModalOpen}
        onClose={() => setIsChangePasswordModalOpen(false)}
        onSuccess={() => {
        }}
        onUpdatePassword={async (oldPassword, newPassword, newPasswordConfirmation) => {
          await managerAPI.updateCurrentManagerPassword(oldPassword, newPassword, newPasswordConfirmation);
        }}
      />
    </div>
  );
}

