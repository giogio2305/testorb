import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { invalidateQueries, queryKeys } from '../config/queryKeys';
import { testService } from '../services/api';

// Hook pour récupérer les résultats de tests
export const useTestResults = (applicationId, params = {}, options = {}) => {
    return useQuery({
        queryKey: queryKeys.testResults(applicationId, params),
        queryFn: () => testService.getTestResults(applicationId, params),
        enabled: !!applicationId,
        staleTime: 1 * 60 * 1000, // 1 minute
        cacheTime: 5 * 60 * 1000, // 5 minutes
        retry: 2,
        ...options,
        onError: (error) => {
            toast.error('Erreur lors du chargement des résultats de tests');
            console.error('Test results error:', error);
        },
    });
};

// Hook pour récupérer les métriques de tests
export const useTestMetrics = (applicationId, params = {}, options = {}) => {
    return useQuery({
        queryKey: queryKeys.testMetrics(applicationId, params),
        queryFn: () => testService.getTestMetrics(applicationId, params),
        enabled: !!applicationId,
        staleTime: 2 * 60 * 1000, // 2 minutes
        cacheTime: 10 * 60 * 1000, // 10 minutes
        retry: 2,
        ...options,
        onError: (error) => {
            toast.error('Erreur lors du chargement des métriques');
            console.error('Test metrics error:', error);
        },
    });
};

// Hook pour récupérer le statut d'un job
export const useJobStatus = (jobId, options = {}) => {
    return useQuery({
        queryKey: queryKeys.jobStatus(jobId),
        queryFn: () => testService.getJobStatus(jobId).then(response => response.data), // ← Extraire data
        enabled: !!jobId,
        refetchInterval: (data) => {
            return data?.state === 'active' || data?.state === 'waiting' ? 2000 : false;
        },
        staleTime: 0,
        retry: 3,
        ...options,
        onError: (error) => {
            console.error('Job status error for job', jobId, ':', error);
            // Si le job n'existe plus (404), arrêter le polling
            if (error.response?.status === 404) {
                // Déclencher un callback pour nettoyer le currentJobId
                options.onJobNotFound?.(jobId);
            }
            toast.error('Erreur lors du suivi du job');
        },
    });
};

// Hook pour lancer des tests
export const useRunTests = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: testService.runTests,
        onSuccess: (data, variables) => {
            // Invalider les résultats et métriques de cette application
            queryClient.invalidateQueries({ queryKey: queryKeys.testResults(variables) });
            queryClient.invalidateQueries({ queryKey: queryKeys.testMetrics(variables) });
            // Invalider le dashboard pour mettre à jour les stats
            invalidateQueries.dashboard(queryClient);
            toast.success('Tests lancés avec succès');
        },
        onError: (error) => {
            toast.error('Erreur lors du lancement des tests');
            console.error('Run tests error:', error);
        },
    });
};

// Hook pour annuler un job
export const useCancelJob = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: testService.cancelJob,
        onSuccess: (data, variables) => {
            // Invalider le statut du job
            queryClient.invalidateQueries({ queryKey: queryKeys.jobStatus(variables) });
            toast.success('Job annulé avec succès');
        },
        onError: (error) => {
            toast.error("Erreur lors de l'annulation du job");
            console.error('Cancel job error:', error);
        },
    });
};
