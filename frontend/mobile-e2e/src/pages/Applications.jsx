import { useEffect, useCallback } from 'react';
import useApplicationStore from '../store/applicationStore';
import ApplicationCard from '../components/applications/ApplicationCard';
import ApplicationSkeleton from '../components/applications/ApplicationSkeleton';
import EmptyState from '../components/applications/EmptyState';
import { Plus } from 'lucide-react';

export default function Applications() {
  // Use selector function with null safety
  const applications = useApplicationStore(state => state?.applications || []);
  const isLoading = useApplicationStore(state => state?.isLoading || false);
  const error = useApplicationStore(state => state?.error || null);
  const fetchApplications = useApplicationStore(state => state?.fetchApplications);
  
  // Handle new application creation
  const handleCreateNew = useCallback(() => {
    console.log("Create new application");
    // Implement your creation logic here
  }, []);

 // Data fetching is commented out for now
  useEffect(() => {
    let isMounted = true;
    const loadData = async () => {
      if (fetchApplications && typeof fetchApplications === 'function') {
        try {
          await fetchApplications();
        } catch (err) {
          if (isMounted) {
            console.error("Failed to fetch applications:", err);
          }
        }
      }
    };
    loadData();
    return () => {
      isMounted = false;
    };
  }, []);

  if (isLoading) {
    return <ApplicationSkeleton />;
  }

  if (error) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="mt-8 rounded-lg bg-red-50 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <div className="mt-2 text-sm text-red-700">{error.toString()}</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-gray-900">Applications</h1>
        <button
          type="button"
          onClick={handleCreateNew}
          className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
        >
          <Plus className="size-4 mr-2" />
          New Application
        </button>
      </div>
      
      {!applications || applications.length === 0 ? (
        <EmptyState onCreateNew={handleCreateNew} />
      ) : (
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {applications.map((application) => (
            <ApplicationCard key={application?._id || Math.random()} application={application} />
          ))}
        </div>
      )}
    </div>
  );
}