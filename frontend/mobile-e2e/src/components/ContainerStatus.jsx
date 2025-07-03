import React, { useState, useEffect } from 'react';
import axios from '../config/axios';

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
            <div className="bg-white rounded-lg border border-gray-200 p-4">
                <h4 className="text-sm font-medium mb-2">Container Status</h4>
                <div className="flex items-center justify-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                    <span className="ml-2 text-sm">Loading...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-medium">Container Status</h4>
                <div className="flex items-center space-x-2">
                    {isPolling && (
                        <div className="flex items-center text-xs text-gray-500">
                            <div className="animate-pulse w-1.5 h-1.5 bg-blue-500 rounded-full mr-1"></div>
                            Auto-refresh
                        </div>
                    )}
                    <button
                        onClick={fetchContainerStatus}
                        className="text-blue-600 hover:text-blue-800 text-xs"
                        disabled={loading}
                    >
                        🔄
                    </button>
                </div>
            </div>

            {error && (
                <div className="bg-red-50 border border-red-200 rounded-md p-2 mb-3">
                    <div className="flex">
                        <div className="text-red-400 text-sm">⚠️</div>
                        <div className="ml-2 text-xs text-red-700">{error}</div>
                    </div>
                </div>
            )}

            {/* Overall Status */}
            <div className="mb-3">
                <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    containerStatus.summary.readyForTesting 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                }`}>
                    {containerStatus.summary.readyForTesting ? '✅ Ready' : '❌ Not Ready'}
                </div>
            </div>

            {/* Individual Container Status */}
            <div className="space-y-2 mb-3">
                {Object.entries(containerStatus.containers).map(([name, container]) => (
                    <div key={name} className="flex items-center justify-between p-2 bg-gray-50 rounded-md">
                        <div className="flex items-center">
                            <span className="text-sm mr-2">{getStatusIcon(container)}</span>
                            <div>
                                <div className="text-xs font-medium capitalize">{name}</div>
                                <div className={`text-xs ${getStatusColor(container)}`}>
                                    {getStatusText(container)}
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Control Buttons */}
            <div className="flex flex-wrap gap-1">
                <button
                    onClick={ensureReady}
                    disabled={loading}
                    className="flex-1 bg-blue-600 text-white px-2 py-1 rounded text-xs hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {loading ? 'Processing...' : '🚀 Ensure Ready'}
                </button>
                <button
                    onClick={startContainers}
                    disabled={loading}
                    className="bg-green-600 text-white px-2 py-1 rounded text-xs hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    ▶️
                </button>
                <button
                    onClick={restartContainers}
                    disabled={loading}
                    className="bg-yellow-600 text-white px-2 py-1 rounded text-xs hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    🔄
                </button>
                <button
                    onClick={stopContainers}
                    disabled={loading}
                    className="bg-red-600 text-white px-2 py-1 rounded text-xs hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    ⏹️
                </button>
            </div>

            {/* Status Summary */}
            <div className="mt-2 text-xs text-gray-500">
                Updated: {new Date().toLocaleTimeString()}
            </div>
        </div>
    );
};

export default ContainerStatus;