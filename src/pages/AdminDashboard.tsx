import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { managerAPI, businessAPI } from '../services/api';
import type { Manager, Business } from '../services/api';
import AddManagerModal from '../components/AddManagerModal';
import { useModalBackdrop } from '../hooks/useModalBackdrop';

interface ManagerWithBusiness extends Manager {
  business?: Business;
}

export default function AdminDashboard() {
  const [managers, setManagers] = useState<ManagerWithBusiness[]>([]);
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
  const [selectedManager, setSelectedManager] = useState<ManagerWithBusiness | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchManagers();
  }, []);

  const fetchManagers = async () => {
    try {
      setIsLoading(true);
      const managersData = await managerAPI.getAllManagers();
      
      // Fetch all businesses in a single batch request
      const managerIds = managersData.map(m => m.id);
      const businessesMap = managerIds.length > 0 
        ? await businessAPI.getBusinessesByManagerIds(managerIds)
        : {};

      // Merge managers with their businesses
      const managersWithBusiness: ManagerWithBusiness[] = managersData.map(manager => ({
        ...manager,
        business: businessesMap[manager.id] || undefined,
      }));

      setManagers(managersWithBusiness);
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
    setNewPassword('');
    setShowResetConfirmation(false);
    setResetConfirmText('');
  };

  const { backdropProps: viewManagerBackdropProps, contentProps: viewManagerContentProps } = useModalBackdrop(() => setSelectedManager(null));
  const { backdropProps: deleteManagerBackdropProps, contentProps: deleteManagerContentProps } = useModalBackdrop(handleCloseDeleteModal);
  const { backdropProps: resetPasswordBackdropProps, contentProps: resetPasswordContentProps } = useModalBackdrop(handleCloseResetPasswordModal);

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

  const handleRowClick = (manager: ManagerWithBusiness, e: React.MouseEvent) => {
    // Don't open modal if clicking on action buttons
    if ((e.target as HTMLElement).closest('button')) {
      return;
    }
    setSelectedManager(manager);
  };

  return (
    <div className="min-h-screen p-4 sm:p-6">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-indigo-400 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-cyan-400 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
      </div>

      {/* Header */}
      <div className="relative z-10 max-w-7xl mx-auto mb-8">
        <div className="glass-card rounded-2xl p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Admin Dashboard</h1>
            <p className="text-gray-600 mt-1 text-sm sm:text-base">Manage your managers</p>
          </div>
          <button
            onClick={handleLogout}
            className="glass-button px-4 sm:px-6 py-2 rounded-xl font-medium text-gray-800 flex items-center justify-center space-x-2 w-full sm:w-auto"
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
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-800">Managers and Businesses Data</h2>
              <p className="text-gray-600 text-sm mt-1">
                Total: {managers.length} manager{managers.length !== 1 ? 's' : ''}
              </p>
            </div>
            <button 
              onClick={() => setIsAddManagerModalOpen(true)}
              className="glass-button px-4 py-2 rounded-xl font-medium text-gray-800 flex items-center justify-center space-x-2 w-full sm:w-auto"
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
            <div className="glass-card rounded-3xl overflow-hidden">
              <div className="overflow-x-auto">
                <table 
                  className="min-w-full divide-y divide-gray-200"
                  aria-label="Managers table"
                  role="table"
                >
                  <caption className="sr-only">
                    Table of managers with details including ID, name, email, phone, business ID, business name, creation date, and actions
                  </caption>
                  <thead className="bg-indigo-50/70 backdrop-blur-sm">
                    <tr>
                      <th scope="col" id="manager-id" className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide border-l border-gray-200">Manager ID</th>
                      <th scope="col" id="manager-name" className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide border-l border-gray-200">Name</th>
                      <th scope="col" id="manager-email" className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide border-l border-gray-200">Email</th>
                      <th scope="col" id="manager-phone" className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide border-l border-gray-200">Phone</th>
                      <th scope="col" id="manager-business-id" className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide border-l border-gray-200">Business ID</th>
                      <th scope="col" id="manager-business-name" className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide border-l border-gray-200">Business Name</th>
                      <th scope="col" id="manager-created" className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide border-l border-gray-200">Created</th>
                      <th scope="col" id="manager-actions" className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide border-l border-gray-200">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {managers.map((manager) => (
                      <tr
                        key={manager.id}
                        onClick={(e) => handleRowClick(manager, e)}
                        className="hover:bg-indigo-50/50 transition-colors cursor-pointer"
                      >
                        <td className="px-6 py-4 text-sm text-gray-700 font-mono border-l border-gray-200" headers="manager-id">{manager.id}</td>
                        <td className="px-6 py-4 border-l border-gray-200" headers="manager-name">
                          <span className="text-sm font-semibold text-gray-900">
                            {manager.firstName} {manager.lastName}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-700 border-l border-gray-200" headers="manager-email">
                          <span className="truncate block max-w-[16rem]" title={manager.email}>
                            {manager.email}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 border-l border-gray-200" headers="manager-phone">
                          {formatPhoneNumber(manager.phoneNumber)}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-700 font-mono border-l border-gray-200" headers="manager-business-id">
                          {manager.business?.id || '-'}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-700 border-l border-gray-200" headers="manager-business-name">
                          <span className="truncate block max-w-[12rem]" title={manager.business?.name || ''}>
                            {manager.business?.name || '-'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 border-l border-gray-200" headers="manager-created">
                          {formatDate(manager.createdAt)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap border-l border-gray-200" headers="manager-actions">
                          <div className="inline-flex items-center gap-2" role="group" aria-label={`Actions for manager ${manager.firstName} ${manager.lastName}`} onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => setManagerToResetPassword(manager)}
                              className="glass-button p-2 rounded-lg text-sm font-semibold text-gray-800 border border-indigo-200 hover:border-indigo-300 transition-colors inline-flex items-center justify-center focus-visible:outline-3 focus-visible:outline-blue-600 focus-visible:outline-offset-2"
                              aria-label={`Reset password for manager ${manager.firstName} ${manager.lastName}`}
                            >
                              <svg
                                className="w-4 h-4 text-indigo-600"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                                aria-hidden="true"
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
                              className="glass-button p-2 rounded-lg text-sm font-semibold text-red-600 border border-red-200 hover:border-red-300 transition-colors inline-flex items-center justify-center focus-visible:outline-3 focus-visible:outline-red-600 focus-visible:outline-offset-2"
                              aria-label={`Delete manager ${manager.firstName} ${manager.lastName}`}
                            >
                              <svg
                                className="w-4 h-4"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                                aria-hidden="true"
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
            </div>
          )}
        </div>
      </div>

      {/* Manager & Business Detail Modal */}
      {selectedManager && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          {...viewManagerBackdropProps}
        >
          <div 
            className="glass-card rounded-3xl p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-white/90 backdrop-blur-xl shadow-2xl border border-white/20"
            {...viewManagerContentProps}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-800">Manager & Business Details</h2>
              <button
                onClick={() => setSelectedManager(null)}
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Manager Information */}
              <div className="space-y-4">
                <div className="pb-3 border-b border-gray-200/50">
                  <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                    <span className="w-8 h-8 rounded-full bg-blue-500/20 text-blue-600 flex items-center justify-center text-sm font-bold">👤</span>
                    Manager Information
                  </h3>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">ID</label>
                    <div className="text-sm text-gray-800 font-mono">{selectedManager.id}</div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Full Name</label>
                    <div className="text-sm text-gray-800">{selectedManager.firstName} {selectedManager.lastName}</div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
                    <div className="text-sm text-gray-800">{selectedManager.email}</div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Phone Number</label>
                    <div className="text-sm text-gray-800">{formatPhoneNumber(selectedManager.phoneNumber)}</div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Date of Birth</label>
                    <div className="text-sm text-gray-800">{formatDate(selectedManager.dateOfBirth)}</div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Address</label>
                    <div className="text-sm text-gray-800">{selectedManager.streetAddress}, {selectedManager.city}</div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Created At</label>
                    <div className="text-sm text-gray-800">{formatDate(selectedManager.createdAt)}</div>
                  </div>
                </div>
              </div>

              {/* Business Information */}
              <div className="space-y-4">
                <div className="pb-3 border-b border-gray-200/50">
                  <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                    <span className="w-8 h-8 rounded-full bg-green-500/20 text-green-600 flex items-center justify-center text-sm font-bold">🏢</span>
                    Business Information
                  </h3>
                </div>

                {selectedManager.business ? (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Business ID</label>
                      <div className="text-sm text-gray-800 font-mono">{selectedManager.business.id}</div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Business Name</label>
                      <div className="text-sm text-gray-800">{selectedManager.business.name}</div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">State ID Number</label>
                      <div className="text-sm text-gray-800">{selectedManager.business.stateIdNumber}</div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Business Email</label>
                      <div className="text-sm text-gray-800">{selectedManager.business.email}</div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Phone Number</label>
                      <div className="text-sm text-gray-800">{formatPhoneNumber(selectedManager.business.phoneNumber)}</div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Address</label>
                      <div className="text-sm text-gray-800">{selectedManager.business.streetAddress}, {selectedManager.business.city}</div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Created At</label>
                      <div className="text-sm text-gray-800">{formatDate(selectedManager.business.createdAt)}</div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Updated At</label>
                      <div className="text-sm text-gray-800">{formatDate(selectedManager.business.updatedAt)}</div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <svg
                      className="w-12 h-12 mx-auto mb-3 text-gray-400"
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
                    <p className="text-sm">No business registered</p>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-gray-200/50">
              <button
                onClick={() => setSelectedManager(null)}
                className="glass-button w-full py-2.5 px-4 rounded-xl font-semibold text-gray-800 bg-gray-100/60 hover:bg-gray-200/70 border border-gray-300/50 transition-all duration-200 hover:scale-[1.02]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

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
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          {...deleteManagerBackdropProps}
        >
          <div 
            className="glass-card rounded-3xl p-6 w-full max-w-md bg-white/85"
            {...deleteManagerContentProps}
          >
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
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          {...resetPasswordBackdropProps}
        >
          <div 
            className="glass-card rounded-3xl p-6 w-full max-w-md bg-white/85"
            {...resetPasswordContentProps}
          >
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
