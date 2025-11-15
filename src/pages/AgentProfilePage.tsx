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
      setError(err.response?.data?.userMessage || err.message || 'Failed to load agent profile.');
    } finally {
      setIsLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    loadAgentProfile();
  }, [loadAgentProfile]);

  return (
    <div className="max-w-5xl mx-auto px-4 py-10 space-y-6">
      <div className="glass-card rounded-3xl p-6 md:p-8">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 md:gap-6">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-800">
            {agent ? `Hello ${agent.firstName}!` : 'Hello'}
          </h1>
          <p className="text-gray-600 mt-2 max-w-2xl">
              Keep your contact information current so your team always has the right details.
          </p>
        </div>
          <div className="mt-4 md:mt-0 w-full md:w-auto">
            <button
              onClick={() => setIsEditModalOpen(true)}
              className="glass-button w-full md:w-auto px-6 py-2 rounded-xl font-medium text-gray-800 hover:bg-white/40 flex items-center justify-center space-x-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              <span>Edit Personal Details</span>
            </button>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="glass-card rounded-3xl p-8 flex items-center justify-center">
          <div className="flex items-center space-x-3 text-gray-700">
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
            <span>Loading your profile…</span>
          </div>
        </div>
      ) : error ? (
        <div className="glass-card rounded-3xl p-6 bg-red-50 border border-red-200 text-red-600">
          {error}
        </div>
      ) : agent ? (
        <>
        <div className="glass-card rounded-3xl p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="glass-input px-4 py-3 rounded-xl text-left">
              <p className="text-xs uppercase text-gray-500">First Name</p>
              <p className="text-gray-800 font-medium break-words">{agent.firstName}</p>
            </div>
            <div className="glass-input px-4 py-3 rounded-xl text-left">
              <p className="text-xs uppercase text-gray-500">Last Name</p>
              <p className="text-gray-800 font-medium break-words">{agent.lastName}</p>
            </div>

            <div className="glass-input px-4 py-3 rounded-xl text-left">
              <p className="text-xs uppercase text-gray-500">Email</p>
              <p className="text-gray-800 font-medium break-words">{agent.email}</p>
            </div>
            <div className="glass-input px-4 py-3 rounded-xl text-left">
              <p className="text-xs uppercase text-gray-500">Phone</p>
              <p className="text-gray-800 font-medium break-words">{agent.phoneNumber}</p>
            </div>

            <div className="glass-input px-4 py-3 rounded-xl text-left">
              <p className="text-xs uppercase text-gray-500">Street Address</p>
              <p className="text-gray-800 font-medium break-words">{agent.streetAddress}</p>
            </div>
            <div className="glass-input px-4 py-3 rounded-xl text-left">
              <p className="text-xs uppercase text-gray-500">City</p>
              <p className="text-gray-800 font-medium break-words">{agent.city}</p>
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
              className="glass-button px-6 py-2 rounded-xl font-medium text-gray-800 hover:bg-white/40 flex items-center space-x-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
              <span>Change Password</span>
            </button>
          </div>
        </div>
        </>
      ) : (
        <div className="glass-card rounded-3xl p-6 text-center text-gray-600">
          No agent information available.
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

