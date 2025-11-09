import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { managerAPI } from '../services/api';
import type { Manager } from '../services/api';
import AddManagerModal from '../components/AddManagerModal';

export default function AdminDashboard() {
  const [managers, setManagers] = useState<Manager[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isAddManagerModalOpen, setIsAddManagerModalOpen] = useState(false);
  const [managerToDelete, setManagerToDelete] = useState<Manager | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [managerToResetPassword, setManagerToResetPassword] = useState<Manager | null>(null);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [showResetConfirmation, setShowResetConfirmation] = useState(false);
  const [resetConfirmText, setResetConfirmText] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchManagers();
  }, []);

  const fetchManagers = async () => {
    try {
      setIsLoading(true);
      const data = await managerAPI.getAllManagers();
      setManagers(data);
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.userMessage || 'Failed to load managers');
      if (err.response?.status === 401 || err.response?.status === 403) {
        localStorage.removeItem('authToken');
        navigate('/admin');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteManager = async () => {
    if (!managerToDelete || deleteConfirmText !== 'I Understand') return;

    try {
      setIsDeleting(true);
      await managerAPI.deleteManager(managerToDelete.id, managerToDelete.email);
      setManagerToDelete(null);
      setDeleteConfirmText('');
      fetchManagers(); // Refresh the list
    } catch (err: any) {
      setError(err.response?.data?.userMessage || 'Failed to delete manager');
      if (err.response?.status === 401 || err.response?.status === 403) {
        localStorage.removeItem('authToken');
        navigate('/admin');
      }
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCloseDeleteModal = () => {
    setManagerToDelete(null);
    setDeleteConfirmText('');
  };

  const handleShowResetConfirmation = () => {
    if (!newPassword.trim()) return;
    setShowResetConfirmation(true);
  };

  const handleResetPassword = async () => {
    if (!managerToResetPassword || !newPassword.trim() || resetConfirmText !== 'Update Password') return;

    try {
      setIsResettingPassword(true);
      await managerAPI.resetPassword(managerToResetPassword.email, newPassword);
      setManagerToResetPassword(null);
      setNewPassword('');
      setShowResetConfirmation(false);
      setResetConfirmText('');
      // Show success message or notification here if needed
    } catch (err: any) {
      setError(err.response?.data?.userMessage || 'Failed to reset password');
      if (err.response?.status === 401 || err.response?.status === 403) {
        localStorage.removeItem('authToken');
        navigate('/admin');
      }
    } finally {
      setIsResettingPassword(false);
    }
  };

  const handleCloseResetPasswordModal = () => {
    setManagerToResetPassword(null);
    setManagerToResetPassword(null);
    setNewPassword('');
    setShowResetConfirmation(false);
    setResetConfirmText('');
  };

  const handleBackToPasswordInput = () => {
    setShowResetConfirmation(false);
    setResetConfirmText('');
  };

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userRole');
    navigate('/admin');
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatPhoneNumber = (phone: string) => {
    if (phone.length <= 3) return phone;
    return `${phone.slice(0, 3)}-${phone.slice(3)}`;
  };

  return (
    <div className="min-h-screen p-6">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-indigo-400 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-cyan-400 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
      </div>

      {/* Header */}
      <div className="relative z-10 max-w-7xl mx-auto mb-8">
        <div className="glass-card rounded-2xl p-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Admin Dashboard</h1>
            <p className="text-gray-600 mt-1">Manage your managers</p>
          </div>
          <button
            onClick={handleLogout}
            className="glass-button px-6 py-2 rounded-xl font-medium text-gray-800 flex items-center space-x-2"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
              />
            </svg>
            <span>Logout</span>
          </button>
        </div>
      </div>

      {/* Managers Table */}
      <div className="relative z-10 max-w-7xl mx-auto">
        <div className="glass-card rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-800">All Managers</h2>
              <p className="text-gray-600 text-sm mt-1">
                Total: {managers.length} manager{managers.length !== 1 ? 's' : ''}
              </p>
            </div>
            <button 
              onClick={() => setIsAddManagerModalOpen(true)}
              className="glass-button px-4 py-2 rounded-xl font-medium text-gray-800 flex items-center space-x-2"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              <span>Add Manager</span>
            </button>
          </div>

          {error && (
            <div className="glass-card bg-red-50/50 border-red-200 rounded-xl p-4 mb-6 text-red-600">
              {error}
            </div>
          )}

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <svg
                className="animate-spin h-8 w-8 text-indigo-600"
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
            </div>
          ) : managers.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
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
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
              <p>No managers found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/20">
                    <th className="text-left py-3 px-4 text-gray-700 font-semibold">ID</th>
                    <th className="text-left py-3 px-4 text-gray-700 font-semibold">Name</th>
                    <th className="text-left py-3 px-4 text-gray-700 font-semibold">Email</th>
                    <th className="text-left py-3 px-4 text-gray-700 font-semibold">Phone</th>
                    <th className="text-left py-3 px-4 text-gray-700 font-semibold">Date of Birth</th>
                    <th className="text-left py-3 px-4 text-gray-700 font-semibold">Address</th>
                    <th className="text-left py-3 px-4 text-gray-700 font-semibold">Created</th>
                    <th className="text-left py-3 px-4 text-gray-700 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {managers.map((manager) => (
                    <tr
                      key={manager.id}
                      className="border-b border-white/10 hover:bg-white/10 transition-colors"
                    >
                      <td className="py-3 px-4 text-gray-600 text-sm font-mono">{manager.id}</td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-gray-800">
                          {manager.firstName} {manager.lastName}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-gray-700">{manager.email}</td>
                      <td className="py-3 px-4 text-gray-700">{formatPhoneNumber(manager.phoneNumber)}</td>
                      <td className="py-3 px-4 text-gray-700">
                        {formatDate(manager.dateOfBirth)}
                      </td>
                      <td className="py-3 px-4 text-gray-700 max-w-xs truncate">
                        {manager.streetAddress}, {manager.city}
                      </td>
                      <td className="py-3 px-4 text-gray-700">
                        {formatDate(manager.createdAt)}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => setManagerToResetPassword(manager)}
                            className="p-2 rounded-lg hover:bg-white/20 transition-colors"
                            title="Reset password"
                          >
                            <svg
                              className="w-4 h-4 text-indigo-600"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
                              />
                            </svg>
                          </button>
                          <button
                            onClick={() => setManagerToDelete(manager)}
                            className="p-2 rounded-lg hover:bg-white/20 transition-colors"
                            title="Delete manager"
                          >
                            <svg
                              className="w-4 h-4 text-red-600"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                              />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Add Manager Modal */}
      <AddManagerModal
        isOpen={isAddManagerModalOpen}
        onClose={() => setIsAddManagerModalOpen(false)}
        onSuccess={() => {
          fetchManagers(); // Refresh the manager list
        }}
      />

      {/* Delete Confirmation Modal */}
      {managerToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="glass-card rounded-3xl p-6 w-full max-w-md bg-white/85">
            <div className="flex items-center justify-center mb-4">
              <div className="p-3 rounded-full bg-red-100">
                <svg
                  className="w-6 h-6 text-red-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
            </div>

            <h2 className="text-xl font-bold text-gray-800 text-center mb-2">
              Delete Manager
            </h2>
            <p className="text-gray-600 text-center mb-4">
              Are you sure you want to delete{' '}
              <span className="font-semibold">
                {managerToDelete.firstName} {managerToDelete.lastName}
              </span>
              ? This action cannot be undone.
            </p>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2 text-center">
                Type <span className="font-bold text-gray-900">"I Understand"</span> to confirm:
              </label>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                className="glass-input w-full px-3 py-2 rounded-xl text-gray-800 text-center focus:outline-none focus:ring-2 focus:ring-red-500"
                placeholder="I Understand"
                disabled={isDeleting}
              />
            </div>

            <div className="flex space-x-3">
              <button
                type="button"
                onClick={handleCloseDeleteModal}
                disabled={isDeleting}
                className="glass-button flex-1 py-2 px-4 rounded-xl font-semibold text-gray-800 bg-gray-100/60 hover:bg-gray-200/70 border-gray-400 hover:border-gray-500 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteManager}
                disabled={isDeleting || deleteConfirmText !== 'I Understand'}
                className="glass-button flex-1 py-2 px-4 rounded-xl font-semibold text-white bg-red-600 hover:bg-red-700 border-red-700 hover:border-red-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
              >
                {isDeleting ? (
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
                    <span>Deleting...</span>
                  </>
                ) : (
                  <span>Delete</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Password Confirmation Modal */}
      {managerToResetPassword && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="glass-card rounded-3xl p-6 w-full max-w-md bg-white/85">
            <div className="flex items-center justify-center mb-4">
              <div className="p-3 rounded-full bg-indigo-100">
                <svg
                  className="w-6 h-6 text-indigo-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
                  />
                </svg>
              </div>
            </div>

            {!showResetConfirmation ? (
              <>
                <h2 className="text-xl font-bold text-gray-800 text-center mb-2">
                  Reset Manager Password
                </h2>
                <p className="text-gray-600 text-center mb-4">
                  Set a new password for{' '}
                  <span className="font-semibold">
                    {managerToResetPassword.firstName} {managerToResetPassword.lastName}
                  </span>
                  :
                </p>

                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    New Password *
                  </label>
                  <input
                    type="text"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="glass-input w-full px-3 py-2 rounded-xl text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Enter new password"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Must contain uppercase, lowercase, numbers, and special characters
                  </p>
                </div>

                <div className="flex space-x-3">
                  <button
                    type="button"
                    onClick={handleCloseResetPasswordModal}
                    className="glass-button flex-1 py-2 px-4 rounded-xl font-semibold text-gray-800 bg-gray-100/60 hover:bg-gray-200/70 border-gray-400 hover:border-gray-500"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleShowResetConfirmation}
                    disabled={!newPassword.trim()}
                    className="glass-button flex-1 py-2 px-4 rounded-xl font-semibold text-white bg-indigo-600 hover:bg-indigo-700 border-indigo-700 hover:border-indigo-800 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Continue
                  </button>
                </div>
              </>
            ) : (
              <>
                <h2 className="text-xl font-bold text-gray-800 text-center mb-2">
                  Confirm Password Reset
                </h2>
                <p className="text-gray-600 text-center mb-4">
                  You are about to reset the password for{' '}
                  <span className="font-semibold">
                    {managerToResetPassword.firstName} {managerToResetPassword.lastName}
                  </span>
                  .
                </p>

                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2 text-center">
                    Type <span className="font-bold text-gray-900">"Update Password"</span> to confirm:
                  </label>
                  <input
                    type="text"
                    value={resetConfirmText}
                    onChange={(e) => setResetConfirmText(e.target.value)}
                    className="glass-input w-full px-3 py-2 rounded-xl text-gray-800 text-center focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Update Password"
                    disabled={isResettingPassword}
                  />
                </div>

                <div className="flex space-x-3">
                  <button
                    type="button"
                    onClick={handleBackToPasswordInput}
                    disabled={isResettingPassword}
                    className="glass-button flex-1 py-2 px-4 rounded-xl font-semibold text-gray-800 bg-gray-100/60 hover:bg-gray-200/70 border-gray-400 hover:border-gray-500 disabled:opacity-50"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={handleResetPassword}
                    disabled={isResettingPassword || resetConfirmText !== 'Update Password'}
                    className="glass-button flex-1 py-2 px-4 rounded-xl font-semibold text-white bg-indigo-600 hover:bg-indigo-700 border-indigo-700 hover:border-indigo-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                  >
                    {isResettingPassword ? (
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
                        <span>Resetting...</span>
                      </>
                    ) : (
                      <span>Update Password</span>
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

