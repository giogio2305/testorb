import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from '../../config/axios';
import { CheckCircle, XCircle, Clock, BarChart3, ExternalLink, Timer } from 'lucide-react';

const TestResults = ({ applicationId, jobStatus, refreshTrigger }) => {
  const navigate = useNavigate();
  const [testResults, setTestResults] = useState([]);
  const [testMetrics, setTestMetrics] = useState(null);
  const [loading, setLoading] = useState(false);

  // Fetch recent test results (limited to 5 for the tab view)
  const fetchTestResults = async () => {
    if (!applicationId) return;
    
    setLoading(true);
    try {
      const response = await axios.get(`/api/applications/${applicationId}/test-results?limit=5`);
      setTestResults(response.data.results || []);
    } catch (error) {
      console.error('Error fetching test results:', error);
      setTestResults([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch test metrics
  const fetchTestMetrics = async () => {
    if (!applicationId) return;
    
    try {
      const response = await axios.get(`/api/applications/${applicationId}/test-metrics`);
      setTestMetrics(response.data);
    } catch (error) {
      console.error('Error fetching test metrics:', error);
      setTestMetrics(null);
    }
  };

  // Fetch application details
  const fetchApplication = async () => {
    if (!applicationId) return;
    
    try {
      const response = await axios.get(`/api/applications/list/${applicationId}`);
      setApplication(response.data);
    } catch (error) {
      console.error('Error fetching application:', error);
    }
  };

  useEffect(() => {
    fetchTestResults();
    fetchTestMetrics();
  }, [applicationId]);

  useEffect(() => {
    if (refreshTrigger) {
      fetchTestResults();
      fetchTestMetrics();
    }
  }, [refreshTrigger]);

  useEffect(() => {
    if (jobStatus?.state === 'completed' || jobStatus?.state === 'failed') {
      setTimeout(() => {
        fetchTestResults();
        fetchTestMetrics();
      }, 1000);
    }
  }, [jobStatus?.state]);

  const getStatusIcon = (status) => {
    switch (status) {
      case 'passed':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-600" />;
      default:
        return <Clock className="w-4 h-4 text-yellow-600" />;
    }
  };

  const formatDuration = (duration) => {
    if (duration < 1000) return `${duration}ms`;
    return `${(duration / 1000).toFixed(2)}s`;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'passed':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Quick Metrics */}
      {testMetrics && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
            <div className="text-xl font-bold text-blue-600">{testMetrics.totalTests}</div>
            <div className="text-xs text-gray-600">Total Tests</div>
          </div>
          <div className="bg-green-50 p-3 rounded-lg border border-green-200">
            <div className="text-xl font-bold text-green-600">{testMetrics.passedTests}</div>
            <div className="text-xs text-gray-600">Passed</div>
          </div>
          <div className="bg-red-50 p-3 rounded-lg border border-red-200">
            <div className="text-xl font-bold text-red-600">{testMetrics.failedTests}</div>
            <div className="text-xs text-gray-600">Failed</div>
          </div>
          <div className="bg-purple-50 p-3 rounded-lg border border-purple-200">
            <div className="text-xl font-bold text-purple-600">{testMetrics.successRate}%</div>
            <div className="text-xs text-gray-600">Success Rate</div>
          </div>
        </div>
      )}

      {/* Recent Test Results */}
      <div className="bg-white border rounded-lg overflow-hidden">
        <div className="bg-gray-50 px-4 py-3 border-b flex items-center justify-between">
          <h3 className="text-sm font-medium text-gray-900">Recent Test Results</h3>
          <button
            onClick={() => navigate(`/applications/${applicationId}/results`)}
            className="flex items-center text-xs text-blue-600 hover:text-blue-800"
          >
            View All
            <ExternalLink className="w-3 h-3 ml-1" />
          </button>
        </div>
        
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <span className="ml-2 text-sm text-gray-600">Loading...</span>
          </div>
        ) : testResults.length === 0 ? (
          <div className="p-6 text-center">
            <BarChart3 className="mx-auto h-8 w-8 text-gray-400" />
            <p className="mt-2 text-sm text-gray-500">
              No test results yet. Run tests to see results here.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {testResults.map((result, index) => (
              <div key={index} className="p-4 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {getStatusIcon(result.status)}
                    <div>
                      <div className="text-sm font-medium text-gray-900">{result.testName}</div>
                      <div className="text-xs text-gray-500 flex items-center mt-1">
                        <Timer className="w-3 h-3 mr-1" />
                        {formatDuration(result.duration)}
                        {result.retries > 0 && (
                          <span className="ml-2 text-yellow-600">• {result.retries} retries</span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(result.status)}`}>
                      {result.status.charAt(0).toUpperCase() + result.status.slice(1)}
                    </span>
                    <div className="text-xs text-gray-500 mt-1">
                      {new Date(result.executedAt).toLocaleString()}
                    </div>
                  </div>
                </div>
                
                {/* Error section - only show for failed tests */}
                {result.status === 'failed' && result.error && (
                  <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-md">
                    <div className="flex items-start space-x-2">
                      <XCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <div className="font-medium text-red-800 text-sm mb-1">Test Failed</div>
                        <div className="text-red-700 text-xs font-mono bg-red-100 p-2 rounded border">
                          {result.error.message}
                        </div>
                        {result.error.stack && (
                          <details className="mt-2">
                            <summary className="text-red-600 text-xs cursor-pointer hover:text-red-800">
                              View Stack Trace
                            </summary>
                            <div className="mt-1 text-red-700 text-xs font-mono bg-red-100 p-2 rounded border max-h-32 overflow-y-auto">
                              {result.error.stack}
                            </div>
                          </details>
                        )}
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Screenshots section - only show for failed tests with screenshots */}
                {result.status === 'failed' && result.screenshots && result.screenshots.length > 0 && (
                  <div className="mt-3 p-3 bg-gray-50 border border-gray-200 rounded-md">
                    <div className="flex items-center space-x-2 mb-2">
                      <Camera className="w-4 h-4 text-gray-600" />
                      <div className="font-medium text-gray-800 text-sm">Screenshots ({result.screenshots.length})</div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {result.screenshots.slice(0, 4).map((screenshot, index) => (
                        <div key={index} className="relative group">
                          <img
                            src={`/api/screenshots/${screenshot.path}`}
                            alt={`Screenshot ${index + 1}`}
                            className="w-full h-20 object-cover rounded border cursor-pointer hover:opacity-80 transition-opacity"
                            onClick={() => window.open(`/api/screenshots/${screenshot.path}`, '_blank')}
                          />
                          <div className="absolute bottom-1 right-1 bg-black bg-opacity-60 text-white text-xs px-1 rounded">
                            {new Date(screenshot.timestamp).toLocaleTimeString()}
                          </div>
                        </div>
                      ))}
                    </div>
                    {result.screenshots.length > 4 && (
                      <div className="mt-2 text-center">
                        <button 
                          onClick={() => navigate(`/applications/${applicationId}/results/${result._id}/screenshots`)}
                          className="text-xs text-blue-600 hover:text-blue-800"
                        >
                          View all {result.screenshots.length} screenshots
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default TestResults;