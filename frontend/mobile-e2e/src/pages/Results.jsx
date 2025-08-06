import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from '../config/axios';
import useAuthStore from '../store/authStore';
import { CheckCircle, XCircle, Clock, TrendingUp, TrendingDown, BarChart3, ArrowLeft, RefreshCw, Calendar, Timer, Target, Camera } from 'lucide-react';

const Results = () => {
  const { applicationId } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, token, user } = useAuthStore();
  
  // Add debugging
  useEffect(() => {
    console.log('Results component - Auth state:', { isAuthenticated, token: !!token, user: !!user });
    console.log('Application ID:', applicationId);
  }, [isAuthenticated, token, user, applicationId]);
  
  const [testResults, setTestResults] = useState([]);
  const [testMetrics, setTestMetrics] = useState(null);
  const [application, setApplication] = useState(null);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedTimeRange, setSelectedTimeRange] = useState('7d');
  const [selectedTest, setSelectedTest] = useState(null);

  // Fetch test results with pagination
  const fetchTestResults = useCallback(async (page = 1) => {
    if (!applicationId) return;
    
    setLoading(true);
    try {
      const response = await axios.get(`/api/applications/${applicationId}/test-results`, {
        params: {
          page,
          limit: 10,
          timeRange: selectedTimeRange
        }
      });
      setTestResults(response.data.results);
      setCurrentPage(response.data.currentPage);
      setTotalPages(response.data.totalPages);
    } catch (error) {
      console.error('Error fetching test results:', error);
      setTestResults([]);
    } finally {
      setLoading(false);
    }
  }, [applicationId, selectedTimeRange]);

  // Fetch test metrics
  const fetchTestMetrics = useCallback(async () => {
    if (!applicationId) return;
    
    try {
      const response = await axios.get(`/api/applications/${applicationId}/test-metrics`, {
        params: { timeRange: selectedTimeRange }
      });
      setTestMetrics(response.data);
    } catch (error) {
      console.error('Error fetching test metrics:', error);
      setTestMetrics(null);
    }
  }, [applicationId, selectedTimeRange]);

  // Fetch application details
  const fetchApplication = useCallback(async () => {
    if (!applicationId) return;
    
    try {
      const response = await axios.get(`/api/applications/list/${applicationId}`);
      setApplication(response.data);
      console.log('Application details:', response.data);
    } catch (error) {
      console.error('Error fetching application:', error);
      setApplication(null);
    }
  }, [applicationId]);

  useEffect(() => {
    fetchTestResults();
    fetchTestMetrics();
    fetchApplication();
  }, [fetchTestResults, fetchTestMetrics, fetchApplication]);

  const handleRefresh = () => {
    fetchTestResults(currentPage);
    fetchTestMetrics();
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'passed':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-600" />;
      default:
        return <Clock className="w-5 h-5 text-yellow-600" />;
    }
  };

  const formatDuration = (duration) => {
    if (duration < 1000) return `${duration}ms`;
    return `${(duration / 1000).toFixed(2)}s`;
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Authentication Required</h2>
          <p className="text-gray-600 mb-4">Please log in to view test results.</p>
          <button
            onClick={() => navigate('/login')}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/applications')}
                className="flex items-center text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="w-5 h-5 mr-2" />
                Back to Applications
              </button>
              <div className="h-6 border-l border-gray-300"></div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {application?.name || 'Test Results'}
                </h1>
                <p className="text-sm text-gray-600">
                  {application?.packageName || applicationId}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <select
                value={selectedTimeRange}
                onChange={(e) => setSelectedTimeRange(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-1 text-sm"
              >
                <option value="1d">Last 24 hours</option>
                <option value="7d">Last 7 days</option>
                <option value="30d">Last 30 days</option>
                <option value="all">All time</option>
              </select>
              <button
                onClick={handleRefresh}
                className="flex items-center px-3 py-1 border border-gray-300 rounded-md text-sm hover:bg-gray-50"
              >
                <RefreshCw className="w-4 h-4 mr-1" />
                Refresh
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Metrics Cards */}
        {testMetrics && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-3xl font-bold text-blue-600">{testMetrics.totalTests}</div>
                  <div className="text-sm text-gray-600 mt-1">Total Tests</div>
                </div>
                <div className="p-3 bg-blue-100 rounded-full">
                  <BarChart3 className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-3xl font-bold text-green-600">{testMetrics.passedTests}</div>
                  <div className="text-sm text-gray-600 mt-1">Passed</div>
                </div>
                <div className="p-3 bg-green-100 rounded-full">
                  <TrendingUp className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-3xl font-bold text-red-600">{testMetrics.failedTests}</div>
                  <div className="text-sm text-gray-600 mt-1">Failed</div>
                </div>
                <div className="p-3 bg-red-100 rounded-full">
                  <TrendingDown className="w-6 h-6 text-red-600" />
                </div>
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-3xl font-bold text-purple-600">{testMetrics.successRate}%</div>
                  <div className="text-sm text-gray-600 mt-1">Success Rate</div>
                </div>
                <div className="p-3 bg-purple-100 rounded-full">
                  <Target className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Test Results Table */}
        <div className="bg-white shadow-sm rounded-lg border">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Test Results</h2>
          </div>
          
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-gray-600">Loading test results...</span>
            </div>
          ) : testResults.length === 0 ? (
            <div className="p-12 text-center">
              <BarChart3 className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-4 text-lg font-medium text-gray-900">No test results found</h3>
              <p className="mt-2 text-gray-500">
                No test results available for the selected time range.
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Test Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Duration
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Executed At
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Retries
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Screenshots
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {testResults.map((result, index) => (
                      <React.Fragment key={result._id || index}>
                        <tr className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              {getStatusIcon(result.status)}
                              <div className="ml-3">
                                <div className="text-sm font-medium text-gray-900">
                                  {result.testName}
                                </div>
                                <div className="text-sm text-gray-500">
                                  {result.testFile}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              result.status === 'passed' ? 'bg-green-100 text-green-800' :
                              result.status === 'failed' ? 'bg-red-100 text-red-800' :
                              'bg-yellow-100 text-yellow-800'
                            }`}>
                              {result.status.charAt(0).toUpperCase() + result.status.slice(1)}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            <div className="flex items-center">
                              <Timer className="w-4 h-4 mr-1 text-gray-400" />
                              {formatDuration(result.duration)}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            <div className="flex items-center">
                              <Calendar className="w-4 h-4 mr-1 text-gray-400" />
                              {new Date(result.executedAt).toLocaleString()}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {result.retries > 0 ? (
                              <span className="text-yellow-600 font-medium">{result.retries}</span>
                            ) : (
                              <span className="text-gray-400">0</span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {result.status === 'failed' && result.screenshots && result.screenshots.length > 0 ? (
                              <button
                                onClick={() => setSelectedTest(result)}
                                className="text-blue-600 hover:text-blue-800 text-xs"
                              >
                                {result.screenshots.length} screenshot{result.screenshots.length > 1 ? 's' : ''}
                              </button>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                        </tr>
                        
                        {/* Expandable error details row - only for failed tests */}
                        {result.status === 'failed' && result.error && (
                          <tr className="bg-red-50">
                            <td colSpan="6" className="px-6 py-3">
                              <div className="flex items-start space-x-3">
                                <XCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
                                <div className="flex-1">
                                  <div className="font-medium text-red-800 mb-2">Error Details</div>
                                  <div className="text-red-700 text-sm font-mono bg-red-100 p-3 rounded border">
                                    {result.error.message}
                                  </div>
                                  {result.error.stack && (
                                    <details className="mt-2">
                                      <summary className="text-red-600 text-sm cursor-pointer hover:text-red-800">
                                        View Full Stack Trace
                                      </summary>
                                      <div className="mt-2 text-red-700 text-sm font-mono bg-red-100 p-3 rounded border max-h-40 overflow-y-auto">
                                        {result.error.stack}
                                      </div>
                                    </details>
                                  )}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {/* Pagination */}
              {totalPages > 1 && (
                <div className="px-6 py-3 border-t border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-700">
                      Page {currentPage} of {totalPages}
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => fetchTestResults(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Previous
                      </button>
                      <button
                        onClick={() => fetchTestResults(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Screenshots Modal */}
      {selectedTest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl max-h-[90vh] overflow-hidden">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">
                Screenshots - {selectedTest.testName}
              </h3>
              <button
                onClick={() => setSelectedTest(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>
            <div className="p-4 overflow-y-auto max-h-[70vh]">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {selectedTest.screenshots?.map((screenshot, index) => (
                  <div key={index} className="border rounded-lg overflow-hidden">
                    <img
                      src={`/api/screenshots/${screenshot.path}`}
                      alt={`Screenshot ${index + 1}`}
                      className="w-full h-auto"
                    />
                    <div className="p-2 bg-gray-50 text-sm text-gray-600">
                      Captured at: {new Date(screenshot.timestamp).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Results;