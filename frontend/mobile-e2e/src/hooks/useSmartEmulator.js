import { useState, useCallback } from 'react';
import axios from '../config/axios';
import { toast } from 'react-hot-toast';
import { useSmartContainers } from './useSmartContainers';

export const useSmartEmulator = () => {
    const [loading, setLoading] = useState(false);
    const [optimizationStats, setOptimizationStats] = useState(null);
    const { smartStart: smartStartContainers } = useSmartContainers();

    const smartStartEmulator = useCallback(async (applicationId) => {
        setLoading(true);
        setOptimizationStats(null);
        
        try {
            console.log('🚀 Starting emulator with smart optimization...');
            const startTime = Date.now();
            
            // 1. D'abord optimiser les conteneurs avec smart-start
            const containerResponse = await smartStartContainers();
            
            // 2. Puis démarrer l'émulateur spécifique
            const emulatorResponse = await axios.post(`/api/emulator/start/${applicationId}`);
            
            const totalTime = Date.now() - startTime;
            
            // Combiner les statistiques
            const combinedStats = {
                ...containerResponse.optimizationStats,
                emulatorStartTime: totalTime,
                totalOptimizedTime: totalTime
            };
            
            setOptimizationStats(combinedStats);
            
            // Notification intelligente
            if (containerResponse.optimizationStats?.timesSaved) {
                toast.success(`⚡ Émulateur démarré instantanément - conteneurs déjà prêts!`);
            } else {
                toast.success(`🚀 Émulateur démarré avec optimisation en ${Math.round(totalTime/1000)}s`);
            }
            
            return {
                success: true,
                noVncUrl: emulatorResponse.data.noVncUrl,
                optimizationStats: combinedStats
            };
        } catch (error) {
            console.error('Smart emulator start failed:', error);
            toast.error('Erreur lors du démarrage intelligent de l\'émulateur: ' + (error.response?.data?.message || error.message));
            throw error;
        } finally {
            setLoading(false);
        }
    }, [smartStartContainers]);

    const smartStopEmulator = useCallback(async (applicationId) => {
        setLoading(true);
        
        try {
            console.log('🛑 Smart stopping emulator...');
            
            // Arrêter l'émulateur de manière intelligente
            await axios.delete(`/api/emulator/stop/${applicationId}`);
            
            // Vérifier si d'autres émulateurs sont en cours
            const statusResponse = await axios.get('/api/containers/status');
            const hasOtherEmulators = statusResponse.data.containers.android?.running;
            
            if (!hasOtherEmulators) {
                toast.success('🛑 Émulateur arrêté - conteneurs conservés pour usage futur');
            } else {
                toast.success('🛑 Émulateur arrêté');
            }
            
            return { success: true };
        } catch (error) {
            console.error('Smart emulator stop failed:', error);
            toast.error('Erreur lors de l\'arrêt de l\'émulateur: ' + (error.response?.data?.message || error.message));
            throw error;
        } finally {
            setLoading(false);
        }
    }, []);

    const forceStopEmulator = useCallback(async (applicationId) => {
        setLoading(true);
        
        try {
            console.log('🔄 Force stopping emulator and containers...');
            
            // Arrêter l'émulateur
            await axios.delete(`/api/emulator/stop/${applicationId}`);
            
            // Arrêter tous les conteneurs
            await axios.post('/api/containers/stop');
            
            toast.success('🔄 Émulateur et conteneurs arrêtés complètement');
            
            return { success: true };
        } catch (error) {
            console.error('Force emulator stop failed:', error);
            toast.error('Erreur lors de l\'arrêt forcé: ' + (error.response?.data?.message || error.message));
            throw error;
        } finally {
            setLoading(false);
        }
    }, []);

    return {
        smartStartEmulator,
        smartStopEmulator,
        forceStopEmulator,
        loading,
        optimizationStats
    };
};