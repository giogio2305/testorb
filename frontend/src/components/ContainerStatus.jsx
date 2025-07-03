import React, { useState, useEffect } from 'react';
import axios from 'axios';

const ContainerStatus = ({ onStatusChange }) => {
    const [containerStatus, setContainerStatus] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [isPolling, setIsPolling] = useState(false);

    const fetchContainerStatus = async () => {
        try {
            const response = await axios.get('/api/containers/status');
            setContainerStatus(response.data);
            setError(null);
            
            // Notify parent component about status change
            if (onStatusChange) {
                onStatusChange(response.data.summary.readyForTesting);
            }
        } catch (err) {
            console.error('Failed to fetch container status:', err);
            setError('Failed to fetch container status');
            if (onStatusChange) {
                onStatusChange(false);
            }
        }
    };

    const startContainers = async () => {
        setLoading(true);
        setError(null);
        try {
            await axios.post('/api/containers/start');
            await fetchContainerStatus();
        } catch (err) {
            console.error('Failed to start containers:', err);
            setError('Failed to start containers: ' + (err.response?.data?.message || err.message));
        } finally {
            setLoading(false);
        }
    };

    const stopContainers = async () => {
        setLoading(true);
        setError(null);
        try {
            await axios.post('/api/containers/stop');
            await fetchContainerStatus();
        } catch (err) {
            console.error('Failed to stop containers:', err);
            setError('Failed to stop containers: ' + (err.response?.data?.message || err.message));
        } finally {
            setLoading(false);
        }
    };

    const restartContainers = async () => {
        setLoading(true);
        setError(null);
        try {
            await axios.post('/api/containers/restart');
            await fetchContainerStatus();
        } catch (err) {
            console.error('Failed to restart containers:', err);
            setError('Failed to restart containers: ' + (err.response?.data?.message || err.message));
        } finally {
            setLoading(false);
        }
    };

    const ensureReady = async () => {
        setLoading(true);
        setError(null);
        try {
            await axios.post('/api/containers/ensure-ready');
            await fetchContainerStatus();
        } catch (err) {
            console.error('Failed to ensure containers are ready:', err);
            setError('Failed to ensure containers are ready: ' + (err.response?.data?.message || err.message));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchContainerStatus();
        
        // Start polling for status updates
        setIsPolling(true);
        const pollInterval = setInterval(fetchContainerStatus, 10000); // Poll every 10 seconds
        
        return () => {
            clearInterval(pollInterval);
            setIsPolling(false);
        };
    }, []);

    const getStatusColor = (container) => {
        if (container.running && container.healthy) {
            return 'text-green-600';
        } else if (container.running) {
            return 'text-yellow-600';
        } else {
            return 'text-red-600';
        }
    };

    const getStatusIcon = (container) => {
        if (container.running && container.healthy) {
            return '✅';
        } else if (container.running) {
            return '⚠️';
        } else {
            return '❌';
        }
    };

    const getStatusText = (container) => {
        if (container.running && container.healthy) {
            return 'Healthy';
        } else if (container.running) {
            return 'Running (Not Healthy)';
        } else {
            return 'Stopped';
        }
    };

    if (!containerStatus) {
        return (
            <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-semibold mb-4">Container Status</h3>
                <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <span className="ml-2">Loading container status...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Container Status</h3>
                <div className="flex items-center space-x-2">
                    {isPolling && (
                        <div className="flex items-center text-sm text-gray-500">
                            <div className="animate-pulse w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
                            Auto-refreshing
                        </div>
                    )}
                    <button
                        onClick={fetchContainerStatus}
                        className="text-blue-600 hover:text-blue-800 text-sm"
                        disabled={loading}
                    >
                        🔄 Refresh
                    </button>
                </div>
            </div>

            {error && (
                <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-4">
                    <div className="flex">
                        <div className="text-red-400">⚠️</div>
                        <div className="ml-2 text-sm text-red-700">{error}</div>
                    </div>
                </div>
            )}

            {/* Overall Status */}
            <div className="mb-6">
                <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                    containerStatus.summary.readyForTesting 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                }`}>
                    {containerStatus.summary.readyForTesting ? '✅ Ready for Testing' : '❌ Not Ready'}
                </div>
            </div>

            {/* Individual Container Status */}
            <div className="space-y-3 mb-6">
                {Object.entries(containerStatus.containers).map(([name, container]) => (
                    <div key={name} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                        <div className="flex items-center">
                            <span className="text-lg mr-2">{getStatusIcon(container)}</span>
                            <div>
                                <div className="font-medium capitalize">{name}</div>
                                <div className={`text-sm ${getStatusColor(container)}`}>
                                    {getStatusText(container)}
                                </div>
                            </div>
                        </div>
                        <div className="text-xs text-gray-500">
                            {container.status}
                        </div>
                    </div>
                ))}
            </div>

            {/* Control Buttons */}
            <div className="flex flex-wrap gap-2">
                <button
                    onClick={ensureReady}
                    disabled={loading}
                    className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                    {loading ? 'Processing...' : '🚀 Ensure Ready'}
                </button>
                <button
                    onClick={startContainers}
                    disabled={loading}
                    className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                    ▶️ Start
                </button>
                <button
                    onClick={restartContainers}
                    disabled={loading}
                    className="bg-yellow-600 text-white px-4 py-2 rounded-md hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                    🔄 Restart
                </button>
                <button
                    onClick={stopContainers}
                    disabled={loading}
                    className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                    ⏹️ Stop
                </button>
            </div>

            {/* Status Summary */}
            <div className="mt-4 text-xs text-gray-500">
                Last updated: {new Date().toLocaleTimeString()}
            </div>
        </div>
    );
};

export default ContainerStatus;