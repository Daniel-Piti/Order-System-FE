import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AddLocationModal from '../components/AddLocationModal';
import EditLocationModal from '../components/EditLocationModal';

interface Location {
  id: string;
  userId: string;
  name: string;
  streetAddress: string;
  city: string;
  phoneNumber: string;
}

export default function LocationsPage() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [locationToEdit, setLocationToEdit] = useState<Location | null>(null);
  const [locationToDelete, setLocationToDelete] = useState<Location | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchLocations();
  }, []);

  const fetchLocations = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('authToken');
      const response = await fetch('http://localhost:8080/api/locations', {
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
        throw new Error('Failed to fetch locations');
      }

      const data = await response.json();
      setLocations(data);
      setError('');
    } catch (err: any) {
      setError(err.message || 'Failed to load locations');
    } finally {
      setIsLoading(false);
    }
  };

  const formatPhoneNumber = (phone: string) => {
    if (phone.length <= 3) return phone;
    return `${phone.slice(0, 3)}-${phone.slice(3)}`;
  };

  const handleEditLocation = (location: Location) => {
    setLocationToEdit(location);
    setIsEditModalOpen(true);
  };

  const handleDeleteLocation = async () => {
    if (!locationToDelete) return;

    // Check if this is the last location
    if (locations.length <= 1) {
      setDeleteError('You must have at least one location. Cannot delete the last location.');
      return;
    }

    try {
      setIsDeleting(true);
      setDeleteError('');
      const token = localStorage.getItem('authToken');
      const response = await fetch(`http://localhost:8080/api/locations/${locationToDelete.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Failed to delete location');
      }

      setLocationToDelete(null);
      fetchLocations(); // Refresh the list
    } catch (err: any) {
      setDeleteError(err.message || 'Failed to delete location');
    } finally {
      setIsDeleting(false);
    }
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
          <p className="text-gray-600">Loading locations...</p>
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
          <p className="text-lg font-semibold mb-2">Error Loading Locations</p>
          <p className="text-gray-600">{error}</p>
          <button
            onClick={fetchLocations}
            className="glass-button mt-4 px-6 py-2 rounded-xl font-medium"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      {/* Header */}
      <div className="glass-card rounded-3xl p-6 md:p-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-2">
              Locations
            </h1>
            <p className="text-gray-600">
              Manage your business locations
            </p>
          </div>
          <div className="mt-4 md:mt-0">
            <button 
              onClick={() => setIsAddModalOpen(true)}
              className="px-6 py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-lg hover:shadow-xl transition-all flex items-center space-x-2 border-0"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span>Add Location</span>
            </button>
          </div>
        </div>
      </div>

      {/* Locations List */}
      {locations.length === 0 ? (
        <div className="glass-card rounded-3xl p-12 text-center">
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
              d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
          <p className="text-lg font-semibold text-gray-800 mb-2">No Locations Yet</p>
          <p className="text-gray-600 mb-4">
            Start by adding your first business location
          </p>
          <button 
            onClick={() => setIsAddModalOpen(true)}
            className="glass-button px-6 py-2 rounded-xl font-medium text-gray-800 hover:bg-white/40"
          >
            Add Your First Location
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {locations.map((location) => (
            <div key={location.id} className="glass-card rounded-2xl p-5 hover:shadow-xl transition-shadow flex flex-col">
              <div className="mb-4">
                <h3 className="text-lg font-bold text-gray-800 truncate">{location.name}</h3>
              </div>

              <div className="space-y-4 flex-1">
                <div className="flex items-start space-x-2">
                  <svg className="w-5 h-5 text-gray-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <div className="text-sm text-gray-700 w-full">
                    <p className="max-w-[160px] overflow-hidden text-ellipsis whitespace-nowrap" title={location.streetAddress}>
                      {location.streetAddress}
                    </p>
                    <p className="text-gray-600 font-medium max-w-[160px] overflow-hidden text-ellipsis whitespace-nowrap" title={location.city}>
                      {location.city}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <svg className="w-5 h-5 text-gray-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  <p className="text-sm text-gray-700">{formatPhoneNumber(location.phoneNumber)}</p>
                </div>
                </div>

              <div className="flex space-x-1.5 mt-2 pt-2 border-t border-gray-200/50">
                <button 
                  onClick={() => handleEditLocation(location)}
                  className="glass-button flex-1 p-1.5 rounded-lg hover:bg-white/40 transition-colors"
                  title="Edit location"
                >
                  <svg className="w-4 h-4 text-gray-600 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
                <button 
                  onClick={() => {
                    setLocationToDelete(location);
                    setDeleteError('');
                  }}
                  className="glass-button flex-1 p-1.5 rounded-lg hover:bg-red-50/40 transition-colors border-red-500 hover:border-red-600"
                  title="Delete location"
                >
                  <svg className="w-4 h-4 text-red-600 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Location Modal */}
      <AddLocationModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={() => {
          fetchLocations(); // Refresh the locations list
        }}
      />

      {locationToEdit && (
        <EditLocationModal
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setLocationToEdit(null);
          }}
          onSuccess={() => {
            fetchLocations(); // Refresh the locations list
          }}
          location={locationToEdit}
        />
      )}

      {/* Delete Confirmation Modal */}
      {locationToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="glass-card rounded-3xl p-6 md:p-8 w-full max-w-md bg-white/90">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-800">Delete Location</h2>
              <button
                onClick={() => {
                  setLocationToDelete(null);
                  setDeleteError('');
                }}
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

            {deleteError ? (
              <div className="mb-6">
                <div className="glass-card bg-red-50/50 border-red-200 rounded-xl p-4">
                  <div className="flex items-start space-x-2">
                    <svg className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-sm text-red-800">{deleteError}</p>
                  </div>
                </div>
              </div>
            ) : (
            <div className="mb-6">
              <p className="text-gray-700 mb-4">
                Are you sure you want to delete <span className="font-semibold">{locationToDelete.name}</span>? This action cannot be undone.
              </p>
              <div className="glass-card bg-yellow-50/50 border-yellow-200 rounded-xl p-4">
                <div className="flex items-start space-x-2">
                  <svg className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <p className="text-sm text-yellow-800">
                    All orders, products, and customers associated with this location will no longer be linked to it.
                  </p>
                </div>
              </div>
            </div>
            )}

            <div className="flex space-x-3">
              <button
                onClick={() => {
                  setLocationToDelete(null);
                  setDeleteError('');
                }}
                disabled={isDeleting}
                className="glass-button flex-1 py-2.5 px-4 rounded-xl font-semibold text-gray-800 bg-gray-100/60 hover:bg-gray-200/70 border-gray-400 hover:border-gray-500 disabled:opacity-50"
              >
                {deleteError ? 'Close' : 'Cancel'}
              </button>
              {!deleteError && (
              <button
                onClick={handleDeleteLocation}
                disabled={isDeleting}
                className="glass-button flex-1 py-2.5 px-4 rounded-xl font-semibold text-white bg-red-600 hover:bg-red-700 border-red-700 hover:border-red-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
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
                  <span>Delete Location</span>
                )}
              </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

