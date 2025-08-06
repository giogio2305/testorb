import { useState, useEffect } from 'react';
import axios from '../../config/axios';
import { PlayCircle, Clock, CheckCircle, XCircle, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';

const TestStatusDashboard = ({ applicationId }) => {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedErrors, setExpandedErrors] = useState(new Set());

  useEffect(() => {
    if (!applicationId) return;
    
    const fetchJobs = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`/api/jobs/application/${applicationId}?limit=5`);
        setJobs(response.data.data || []);
        setError(null);
      } catch (err) {
        setError('Failed to fetch test jobs');
        console.error('Error fetching jobs:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchJobs();
    
    // Refresh jobs every 30 seconds
    const interval = setInterval(fetchJobs, 30000);
    
    return () => clearInterval(interval);
  }, [applicationId]);

  const toggleErrorExpansion = (jobId) => {
    const newExpanded = new Set(expandedErrors);
    if (newExpanded.has(jobId)) {
      newExpanded.delete(jobId);
    } else {
      newExpanded.add(jobId);
    }
    setExpandedErrors(newExpanded);
  };

  const truncateText = (text, maxLength = 100) => {
    if (!text) return '';
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  };

  const getStatusIcon = (state) => {
    switch (state) {
      case 'waiting':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'active':
        return <PlayCircle className="w-4 h-4 text-blue-500" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusColor = (state) => {
    switch (state) {
      case 'waiting':
        return 'bg-yellow-100 text-yellow-800';
      case 'active':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-red-600 text-sm">
        {error}
      </div>
    );
  }

  if (jobs.length === 0) {
    return (
      <div className="text-gray-500 text-sm text-center py-4">
        No test jobs found for this application.
      </div>
    );
  }

  return (
    <div>
      <h4 className="text-sm font-medium text-gray-900 mb-3">Recent Test Jobs</h4>
      <div className="space-y-2">
        {jobs.map((job) => {
          const isErrorExpanded = expandedErrors.has(job.id);
          const hasLongError = job.failedReason && job.failedReason.length > 100;
          
          return (
            <div key={job.id} className="border border-gray-200 rounded-lg p-3 bg-white">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  {getStatusIcon(job.state)}
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(job.state)}`}>
                    {job.state}
                  </span>
                  {job.progress !== undefined && (
                    <span className="text-xs text-gray-500">{job.progress}%</span>
                  )}
                </div>
                <span className="text-xs text-gray-500">Job #{job.id}</span>
              </div>
              
              {job.progress !== undefined && job.state !== 'completed' && job.state !== 'failed' && (
                <div className="w-full bg-gray-200 rounded-full h-1.5 mb-2">
                  <div 
                    className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
                    style={{ width: `${job.progress}%` }}
                  ></div>
                </div>
              )}
              
              <div className="text-xs text-gray-500">
                <div>Started: {formatDate(job.createdAt)}</div>
                {job.finishedAt && (
                  <div>Finished: {formatDate(job.finishedAt)}</div>
                )}
                {job.failedReason && (
                  <div className="mt-2">
                    <div className="bg-red-50 border border-red-200 rounded-md p-2">
                      <div className="flex items-start space-x-2">
                        <XCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-red-800 text-xs mb-1">Error Details</div>
                          <div className="text-red-700 text-xs">
                            {hasLongError ? (
                              <div>
                                <div className="font-mono bg-red-100 p-2 rounded border break-words">
                                  {isErrorExpanded ? job.failedReason : truncateText(job.failedReason)}
                                </div>
                                <button
                                  onClick={() => toggleErrorExpansion(job.id)}
                                  className="mt-1 inline-flex items-center text-red-600 hover:text-red-800 text-xs"
                                >
                                  {isErrorExpanded ? (
                                    <>
                                      <ChevronUp className="w-3 h-3 mr-1" />
                                      Show Less
                                    </>
                                  ) : (
                                    <>
                                      <ChevronDown className="w-3 h-3 mr-1" />
                                      Show More
                                    </>
                                  )}
                                </button>
                              </div>
                            ) : (
                              <div className="font-mono bg-red-100 p-2 rounded border break-words">
                                {job.failedReason}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TestStatusDashboard;