import { useState, useCallback } from 'react';
import axios from '../config/axios';
import { toast } from 'react-hot-toast';

export const useSmartContainers = () => {
    const [loading, setLoading] = useState(false);
    const [optimizationStats, setOptimizationStats] = useState(null);

    const smartStart = useCallback(async (services = null) => {
        setLoading(true);
        setOptimizationStats(null);
        
        try {
            console.log('🚀 Smart starting containers...');
            const startTime = Date.now();
            
            const response = await axios.post('/api/containers/smart-start', {
                services
            });
            
            const totalTime = Date.now() - startTime;
            const stats = response.data.optimizationStats;
            
            setOptimizationStats({
                ...stats,
                actualTime: totalTime
            });
            
            // Notifications intelligentes
            if (stats.timesSaved) {
                toast.success('⚡ Conteneurs déjà prêts - aucun redémarrage nécessaire!');
            } else {
                const message = [];
                if (stats.servicesStarted.length > 0) {
                    message.push(`${stats.servicesStarted.length} service(s) démarré(s)`);
                }
                if (stats.servicesRestarted.length > 0) {
                    message.push(`${stats.servicesRestarted.length} service(s) redémarré(s)`);
                }
                
                if (totalTime < 30000) { // Moins de 30 secondes
                    toast.success(`🚀 Démarrage optimisé: ${message.join(', ')} en ${Math.round(totalTime/1000)}s`);
                } else {
                    toast.success(`✅ ${message.join(', ')} - Prêt pour les tests`);
                }
            }
            
            return response.data;
        } catch (error) {
            console.error('Smart start failed:', error);
            toast.error('Erreur lors du démarrage intelligent: ' + (error.response?.data?.message || error.message));
            throw error;
        } finally {
            setLoading(false);
        }
    }, []);

    const forceStart = useCallback(async (services = null) => {
        setLoading(true);
        
        try {
            console.log('🔄 Force starting containers...');
            const response = await axios.post('/api/containers/start', {
                services,
                force: true
            });
            
            toast.success('🔄 Redémarrage complet effectué');
            return response.data;
        } catch (error) {
            console.error('Force start failed:', error);
            toast.error('Erreur lors du redémarrage forcé: ' + (error.response?.data?.message || error.message));
            throw error;
        } finally {
            setLoading(false);
        }
    }, []);

    return {
        smartStart,
        forceStart,
        loading,
        optimizationStats
    };
};