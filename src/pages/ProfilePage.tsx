import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import EditProfileModal from '../components/EditProfileModal';
import ChangePasswordModal from '../components/ChangePasswordModal';

interface UserProfile {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  dateOfBirth: string;
  mainAddress: string;
  createdAt: string;
  updatedAt: string;
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
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
      const token = localStorage.getItem('authToken');
      const response = await fetch('http://localhost:8080/api/users/me', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          localStorage.removeItem('authToken');
          navigate('/');
        }
        throw new Error('Failed to fetch profile');
      }

      const data = await response.json();
      setProfile(data);
      setError('');
    } catch (err: any) {
      setError(err.message || 'Failed to load profile');
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
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
          <p className="text-gray-600">Loading profile...</p>
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
          <p className="text-lg font-semibold mb-2">Error Loading Profile</p>
          <p className="text-gray-600">{error}</p>
          <button
            onClick={fetchProfile}
            className="glass-button mt-4 px-6 py-2 rounded-xl font-medium"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!profile) return null;

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      {/* Header */}
      <div className="glass-card rounded-3xl p-6 md:p-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-2">
              Profile
            </h1>
            <p className="text-gray-600">
              View your personal information
            </p>
          </div>
          <div className="mt-4 md:mt-0">
            <button 
              onClick={() => setIsEditModalOpen(true)}
              className="glass-button px-6 py-2 rounded-xl font-medium text-gray-800 hover:bg-white/40"
            >
              Edit Personal Details
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
              First Name
            </label>
            <div className="glass-input px-3 py-2 rounded-lg text-gray-800 text-sm">
              {profile.firstName}
            </div>
          </div>

          {/* Last Name */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Last Name
            </label>
            <div className="glass-input px-3 py-2 rounded-lg text-gray-800 text-sm">
              {profile.lastName}
            </div>
          </div>

          {/* User ID */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              User ID
            </label>
            <div className="glass-input px-3 py-2 rounded-lg text-gray-800 font-mono text-sm">
              {profile.id}
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Email
            </label>
            <div className="glass-input px-3 py-2 rounded-lg text-gray-800 text-sm">
              {profile.email}
            </div>
          </div>

          {/* Phone Number */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Phone Number
            </label>
            <div className="glass-input px-3 py-2 rounded-lg text-gray-800 text-sm">
              {formatPhoneNumber(profile.phoneNumber)}
            </div>
          </div>

          {/* Date of Birth */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Date of Birth
            </label>
            <div className="glass-input px-3 py-2 rounded-lg text-gray-800 text-sm">
              {formatDate(profile.dateOfBirth)}
            </div>
          </div>

          {/* Main Address */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Main Address
            </label>
            <div className="glass-input px-3 py-2 rounded-lg text-gray-800 text-sm">
              {profile.mainAddress}
            </div>
          </div>

          {/* Account Created */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Account Created
            </label>
            <div className="glass-input px-3 py-2 rounded-lg text-gray-800 text-sm">
              {formatDate(profile.createdAt)}
            </div>
          </div>
        </div>
      </div>

      {/* Security Section */}
      <div className="glass-card rounded-3xl p-6 md:p-8">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Security</h2>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
          <div>
            <p className="font-medium text-gray-800">Password</p>
            <p className="text-sm text-gray-600">
              Manage your account password
            </p>
          </div>
          <button 
            onClick={() => setIsChangePasswordModalOpen(true)}
            className="glass-button px-6 py-2 rounded-xl font-medium text-gray-800 hover:bg-white/40"
          >
            Change Password
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
            phoneNumber: profile.phoneNumber,
            dateOfBirth: profile.dateOfBirth,
            mainAddress: profile.mainAddress,
          }}
        />
      )}

      {/* Change Password Modal */}
      <ChangePasswordModal
        isOpen={isChangePasswordModalOpen}
        onClose={() => setIsChangePasswordModalOpen(false)}
        onSuccess={() => {
          // Password changed successfully - maybe show a notification
        }}
      />
    </div>
  );
}

