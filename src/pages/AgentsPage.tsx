import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { agentAPI, type Agent } from '../services/api';
import AgentAddModal from '../components/AgentAddModal';
import AgentEditModal from '../components/AgentEditModal';
import AgentDeleteModal from '../components/AgentDeleteModal';

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [pageSize, setPageSize] = useState(10);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [agentToEdit, setAgentToEdit] = useState<Agent | null>(null);
  const [agentToDelete, setAgentToDelete] = useState<Agent | null>(null);
  const navigate = useNavigate();

  const fetchAgents = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await agentAPI.getAgentsForManager();
      setAgents(data);
      setError('');
    } catch (err: any) {
      if (err.response?.status === 401 || err.response?.status === 403) {
        localStorage.removeItem('authToken');
        localStorage.removeItem('userRole');
        navigate('/login/manager');
        return;
      }
      setError(err.response?.data?.userMessage || err.message || 'Failed to load agents');
    } finally {
      setIsLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    fetchAgents();
  }, [fetchAgents]);

  const filteredAgents = useMemo(() => {
    const query = searchQuery.toLowerCase();
    return agents
      .filter((agent) => {
        if (!query) return true;
        return (
          agent.firstName.toLowerCase().includes(query) ||
          agent.lastName.toLowerCase().includes(query) ||
          agent.email.toLowerCase().includes(query) ||
          agent.phoneNumber.toLowerCase().includes(query)
        );
      })
      .sort((a, b) => {
        const nameA = `${a.firstName} ${a.lastName}`.toLowerCase();
        const nameB = `${b.firstName} ${b.lastName}`.toLowerCase();
        return sortDirection === 'asc' ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA);
      });
  }, [agents, searchQuery, sortDirection]);

  const displayAgents = filteredAgents.slice(0, pageSize);

  const handleEditAgent = (agent: Agent) => {
    setAgentToEdit(agent);
    setIsEditModalOpen(true);
  };

  const handleDeleteAgent = (agent: Agent) => {
    setAgentToDelete(agent);
    setIsDeleteModalOpen(true);
  };

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
    setAgentToEdit(null);
  };

  const handleCloseDeleteModal = () => {
    setIsDeleteModalOpen(false);
    setAgentToDelete(null);
  };

  const handleEditSuccess = () => {
    fetchAgents();
    handleCloseEditModal();
  };

  const handleDeleteSuccess = () => {
    fetchAgents();
    handleCloseDeleteModal();
  };

  return (
    <div className="space-y-6" dir="rtl">
      <div className="glass-card rounded-3xl p-6 md:p-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-800">הסוכנים שלך</h1>
          <p className="text-gray-600 mt-2">
            עקוב אחר הסוכנים הפעילים שלך ודאג שפרטי הקשר שלהם מעודכנים.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsAddModalOpen(true)}
          className="mt-2 md:mt-0 px-6 py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-lg hover:shadow-xl transition-all flex items-center gap-2 border-0"
        >
          <span>הוסף סוכן</span>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>

      <div className="glass-card rounded-3xl p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-end">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700">הצג:</span>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="glass-select pl-3 pr-8 py-2 rounded-xl text-sm font-semibold text-gray-800 cursor-pointer w-24"
                dir="ltr"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={30}>30</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700">מיין:</span>
              <button
                onClick={() => setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'))}
                className="glass-button px-4 py-2 rounded-xl text-sm font-semibold text-gray-800 flex items-center gap-2 justify-center sm:justify-start whitespace-nowrap"
                aria-pressed={sortDirection === 'desc'}
                aria-label={`Sort agents ${sortDirection === 'asc' ? 'ascending' : 'descending'}`}
              >
                {sortDirection === 'asc' ? (
                  <>
                    <span>א ← ת</span>
                    <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </>
                ) : (
                  <>
                    <span>א → ת</span>
                    <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                    </svg>
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="relative w-full sm:w-80 sm:max-w-xs">
            <svg
              className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-5.197-5.197m0 0A6 6 0 1010.606 4.5a6 6 0 005.197 11.303z"
              />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              maxLength={100}
              placeholder="חפש סוכנים..."
              className="glass-input w-full pr-10 pl-10 py-2 rounded-xl text-sm text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 border-2 border-gray-400/80 hover:border-gray-500 focus:border-gray-400 bg-white/50 focus:bg-white/60 shadow-lg hover:shadow-xl"
              dir="rtl"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                aria-label="Clear search"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="glass-card rounded-3xl p-8 flex items-center justify-center">
          <div className="flex items-center gap-3 text-gray-700">
            <svg
              className="animate-spin h-6 w-6 text-indigo-600"
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
            <span className="font-medium">... טוען סוכנים</span>
          </div>
        </div>
      ) : error ? (
        <div className="glass-card rounded-3xl p-6 bg-red-50 border border-red-200 text-red-600">
          {error}
        </div>
      ) : (
        <div className="glass-card rounded-3xl p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-indigo-100/70">
              <thead className="bg-purple-200/95 text-gray-700">
                <tr>
                  <th scope="col" className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wide border-l border-gray-200">
                    שם
                  </th>
                  <th scope="col" className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wide border-l border-gray-200">
                    אימייל
                  </th>
                  <th scope="col" className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wide border-l border-gray-200">
                    טלפון
                  </th>
                  <th scope="col" className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wide border-l border-gray-200">
                    מיקום
                  </th>
                  <th scope="col" className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wide border-l border-gray-200">
                    נוסף
                  </th>
                  <th scope="col" className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wide border-l border-gray-200 w-24">
                    פעולות
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-indigo-50">
                {displayAgents.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-10 text-center text-gray-500">
                      אין סוכנים התואמים למסננים הנוכחיים שלך.
                    </td>
                  </tr>
                ) : (
                  displayAgents.map((agent) => (
                    <tr
                      key={agent.id}
                      className="transition-colors bg-white hover:bg-indigo-50/50"
                    >
                      <td className="px-6 py-4 text-right border-l border-gray-200">
                        <p className="text-sm font-semibold text-gray-800">
                          {agent.firstName} {agent.lastName}
                        </p>
                      </td>
                      <td className="px-6 py-4 text-right border-l border-gray-200">
                        <p className="text-sm text-gray-800 break-words truncate max-w-[16rem]" title={agent.email}>{agent.email}</p>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800 text-right border-l border-gray-200">
                        {agent.phoneNumber}
                      </td>
                      <td className="px-6 py-4 text-right border-l border-gray-200">
                        <p className="text-sm text-gray-800 break-words truncate max-w-[12rem]" title={agent.streetAddress}>{agent.streetAddress}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{agent.city}</p>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 text-center border-l border-gray-200">
                        {new Date(agent.createdAt).toLocaleDateString('he-IL')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-left border-l border-gray-200">
                        <div className="inline-flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleEditAgent(agent)}
                            className="glass-button p-2 rounded-lg text-sm font-semibold text-gray-800 border border-indigo-200 hover:border-indigo-300 transition-colors inline-flex items-center justify-center"
                            title="ערוך סוכן"
                          >
                            <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 4H6a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2v-5M18.5 2.5a2.121 2.121 0 113 3L12 15l-4 1 1-4 9.5-9.5z" />
                            </svg>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteAgent(agent)}
                            className="glass-button p-2 rounded-lg text-sm font-semibold text-gray-800 border border-red-200 hover:border-red-300 transition-colors inline-flex items-center justify-center"
                            title="מחק סוכן"
                          >
                            <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <AgentAddModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={fetchAgents}
      />

      <AgentEditModal
        isOpen={isEditModalOpen}
        agent={agentToEdit}
        onClose={handleCloseEditModal}
        onSuccess={handleEditSuccess}
      />

      <AgentDeleteModal
        isOpen={isDeleteModalOpen}
        agentName={agentToDelete ? `${agentToDelete.firstName} ${agentToDelete.lastName}` : null}
        agentId={agentToDelete?.id ?? null}
        onClose={handleCloseDeleteModal}
        onDeleted={handleDeleteSuccess}
      />
    </div>
  );
}

