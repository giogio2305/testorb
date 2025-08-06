import { CircleStop, Play, RefreshCcw, Zap } from 'lucide-react';
import { useEffect, useState } from 'react';
import axios from '../config/axios';
import { useSmartContainers } from '../hooks/useSmartContainers';

const ContainerStatus = ({ onStatusChange }) => {
    const [containerStatus, setContainerStatus] = useState(null);
    const [error, setError] = useState(null);
    const [isPolling, setIsPolling] = useState(false);

    // Hook pour la gestion intelligente des conteneurs
    const {
        smartStart,
        forceStart,
        loading: smartLoading,
        optimizationStats,
    } = useSmartContainers();

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

    const handleSmartStart = async () => {
        try {
            await smartStart();
            await fetchContainerStatus();
        } catch (error) {
            // Error already handled in hook
        }
    };

    const handleForceStart = async () => {
        try {
            await forceStart();
            await fetchContainerStatus();
        } catch (error) {
            // Error already handled in hook
        }
    };

    const stopContainers = async () => {
        try {
            await axios.post('/api/containers/stop');
            await fetchContainerStatus();
        } catch (err) {
            console.error('Failed to stop containers:', err);
            setError('Failed to stop containers: ' + (err.response?.data?.message || err.message));
        }
    };

    const restartContainers = async () => {
        try {
            await axios.post('/api/containers/restart');
            await fetchContainerStatus();
        } catch (err) {
            console.error('Failed to restart containers:', err);
            setError('Failed to restart containers: ' + (err.response?.data?.message || err.message));
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

    const renderOptimizationStats = () => {
        if (!optimizationStats) return null;

        return (
            <div className='mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-sm'>
                <div className='flex items-center gap-1 text-blue-700 font-medium'>
                    <Zap className='w-4 h-4' />
                    Optimisation Smart-Start
                </div>
                {optimizationStats.timesSaved ? (
                    <div className='text-green-600 mt-1'>
                        ⚡ Aucun redémarrage nécessaire - conteneurs déjà prêts!
                    </div>
                ) : (
                    <div className='mt-1 space-y-1'>
                        {optimizationStats.servicesStarted?.length > 0 && (
                            <div className='text-blue-600'>
                                ▶️ Démarrés: {optimizationStats.servicesStarted.join(', ')}
                            </div>
                        )}
                        {optimizationStats.servicesRestarted?.length > 0 && (
                            <div className='text-orange-600'>
                                🔄 Redémarrés: {optimizationStats.servicesRestarted.join(', ')}
                            </div>
                        )}
                        <div className='text-gray-600'>
                            ⏱️ Temps: {optimizationStats.totalTime}ms
                        </div>
                    </div>
                )}
            </div>
        );
    };

    if (!containerStatus) {
        return (
            <div className='bg-white rounded-lg border border-gray-200 p-4'>
                <h4 className='text-sm font-medium mb-2'>Container Status</h4>
                <div className='flex items-center justify-center py-4'>
                    <div className='animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600'></div>
                    <span className='ml-2 text-sm'>Loading...</span>
                </div>
            </div>
        );
    }

    return (
        <div className='bg-white rounded-lg border border-gray-200 p-4'>
            <div className='flex items-center justify-between mb-3'>
                <h4 className='text-sm font-medium'>Container Status</h4>
                <div className='flex items-center space-x-2'>
                    {isPolling && (
                        <div className='flex items-center text-xs text-gray-500'>
                            <div className='animate-pulse w-1.5 h-1.5 bg-blue-500 rounded-full mr-1'></div>
                            Auto-refresh
                        </div>
                    )}
                    <button
                        onClick={fetchContainerStatus}
                        className='text-blue-600 hover:text-blue-800 text-xs'
                        disabled={smartLoading}
                    >
                        <RefreshCcw className='size-3.5 text-blue-600' />
                    </button>
                </div>
            </div>

            {error && (
                <div className='bg-red-50 border border-red-200 rounded-md p-2 mb-3'>
                    <div className='flex'>
                        <div className='text-red-400 text-sm'>⚠️</div>
                        <div className='ml-2 text-xs text-red-700'>{error}</div>
                    </div>
                </div>
            )}

            {/* Overall Status */}
            <div className='mb-3'>
                <div
                    className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        containerStatus.summary.readyForTesting
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                    }`}
                >
                    {containerStatus.summary.readyForTesting ? '✅ Ready' : '❌ Not Ready'}
                </div>
            </div>

            {/* Individual Container Status */}
            <div className='space-y-2 mb-3'>
                {Object.entries(containerStatus.containers).map(([name, container]) => (
                    <div
                        key={name}
                        className='flex items-center justify-between p-2 bg-gray-50 rounded-md'
                    >
                        <div className='flex items-center'>
                            <span className='text-sm mr-2'>{getStatusIcon(container)}</span>
                            <div>
                                <div className='text-xs font-medium capitalize'>{name}</div>
                                <div className={`text-xs ${getStatusColor(container)}`}>
                                    {getStatusText(container)}
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Affichage des statistiques d'optimisation */}
            {renderOptimizationStats()}

            {/* Control Buttons */}
            <div className='flex flex-wrap gap-2 mt-3'>
                <button
                    onClick={handleSmartStart}
                    disabled={smartLoading}
                    className='flex items-center gap-1 px-3 py-2 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed'
                >
                    <Zap className='w-3 h-3' />
                    {smartLoading ? 'Démarrage...' : 'Smart Start'}
                </button>
                
                <button
                    onClick={handleForceStart}
                    disabled={smartLoading}
                    className='flex items-center gap-1 px-3 py-2 bg-orange-600 text-white rounded text-xs hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed'
                >
                    <Play className='w-3 h-3' />
                    Force Start
                </button>
                
                <button
                    onClick={restartContainers}
                    disabled={smartLoading}
                    className='bg-yellow-600 text-yellow-100 px-2 py-1 rounded text-xs hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed'
                >
                    <RefreshCcw className='size-3.5' />
                </button>
                
                <button
                    onClick={stopContainers}
                    disabled={smartLoading}
                    className='bg-red-600 text-white px-2 py-1 rounded text-xs hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed'
                >
                    <CircleStop className='size-3.5' />
                </button>
            </div>

            {/* Status Summary */}
            <div className='mt-2 text-xs text-gray-500'>
                Updated: {new Date().toLocaleTimeString()}
            </div>
        </div>
    );
};

export default ContainerStatus;
