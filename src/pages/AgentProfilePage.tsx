import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { agentAPI, type Agent } from '../services/api';
import AgentEditProfileModal from '../components/AgentEditProfileModal';
import ChangePasswordModal from '../components/ChangePasswordModal';

export default function AgentProfilePage() {
  const [agent, setAgent] = useState<Agent | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isChangePasswordModalOpen, setIsChangePasswordModalOpen] = useState(false);
  const navigate = useNavigate();

  const loadAgentProfile = useCallback(async () => {
    try {
      setIsLoading(true);
      const profile = await agentAPI.getCurrentAgent();
      setAgent(profile);
      setError('');
    } catch (err: any) {
      if (err.response?.status === 401) {
        localStorage.removeItem('authToken');
        localStorage.removeItem('userRole');
        navigate('/login/agent');
        return;
      }
      setError(err.response?.data?.userMessage || err.message || 'נכשל בטעינת פרופיל הסוכן.');
    } finally {
      setIsLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    loadAgentProfile();
  }, [loadAgentProfile]);

  return (
    <div className="max-w-4xl mx-auto space-y-4" dir="rtl">
      {/* Header */}
      <div className="glass-card rounded-3xl p-6 md:p-8">
        <div className="flex flex-col md:flex-row md:flex-wrap md:items-start md:justify-between gap-4 md:gap-6">
          <div className="max-w-full md:flex-1">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2 break-words leading-tight max-w-full">
              {agent ? `שלום ${agent.firstName}!` : 'שלום'}
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

      {isLoading ? (
        <div className="glass-card rounded-3xl p-8 flex items-center justify-center">
          <div className="flex items-center gap-3 text-gray-700">
            <svg
              className="animate-spin h-6 w-6 text-sky-600"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
            <span>טוען את הפרופיל שלך...</span>
          </div>
        </div>
      ) : error ? (
        <div className="glass-card rounded-3xl p-6 bg-red-50 border border-red-200 text-red-600">
          {error}
        </div>
      ) : agent ? (
        <>
        {/* Profile Details */}
        <div className="glass-card rounded-3xl p-6 md:p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* First Name */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                שם פרטי
              </label>
              <div className="glass-input px-3 py-2 rounded-lg text-gray-800 text-sm break-words">
                {agent.firstName}
              </div>
            </div>

            {/* Last Name */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                שם משפחה
              </label>
              <div className="glass-input px-3 py-2 rounded-lg text-gray-800 text-sm break-words">
                {agent.lastName}
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                אימייל
              </label>
              <div className="glass-input px-3 py-2 rounded-lg text-gray-800 text-sm break-words">
                {agent.email}
              </div>
            </div>

            {/* Phone Number */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                מספר טלפון
              </label>
              <div className="glass-input px-3 py-2 rounded-lg text-gray-800 text-sm">
                {agent.phoneNumber}
              </div>
            </div>

            {/* Street Address */}
            <div className="max-w-full">
              <label className="block text-xs font-medium text-gray-600 mb-1">
                כתובת
              </label>
              <div className="glass-input px-3 py-2 rounded-lg text-gray-800 text-sm break-words">
                {agent.streetAddress}
              </div>
            </div>

            {/* City */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                עיר
              </label>
              <div className="glass-input px-3 py-2 rounded-lg text-gray-800 text-sm break-words">
                {agent.city}
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
        </>
      ) : (
        <div className="glass-card rounded-3xl p-6 text-center text-gray-600">
          אין מידע על הסוכן זמין.
        </div>
      )}
      {agent && (
        <>
          <AgentEditProfileModal
            isOpen={isEditModalOpen}
            onClose={() => setIsEditModalOpen(false)}
            onSuccess={loadAgentProfile}
            currentProfile={{
              firstName: agent.firstName,
              lastName: agent.lastName,
              phoneNumber: agent.phoneNumber,
              streetAddress: agent.streetAddress,
              city: agent.city,
            }}
          />

          {/* Change Password Modal */}
          <ChangePasswordModal
            isOpen={isChangePasswordModalOpen}
            onClose={() => setIsChangePasswordModalOpen(false)}
            onSuccess={() => {
            }}
            onUpdatePassword={async (oldPassword, newPassword, newPasswordConfirmation) => {
              await agentAPI.updateCurrentAgentPassword(oldPassword, newPassword, newPasswordConfirmation);
            }}
          />
        </>
      )}
    </div>
  );
}

