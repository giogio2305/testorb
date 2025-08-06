import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { emulatorService } from '../services/api';
import { queryKeys, invalidateQueries } from '../config/queryKeys';
import toast from 'react-hot-toast';

// Hook pour récupérer le statut de l'émulateur
export const useEmulatorStatus = (applicationId, options = {}) => {
  return useQuery({
    queryKey: queryKeys.emulatorStatus(applicationId),
    queryFn: () => emulatorService.getEmulatorStatus(applicationId),
    enabled: !!applicationId,
    refetchInterval: 5000, // Refetch toutes les 5 secondes
    staleTime: 0, // Toujours considérer comme stale
    retry: 2,
    ...options,
    onError: (error) => {
      console.error('Emulator status error:', error);
    }
  });
};

// Hook pour vérifier si une app est installée
export const useAppInstallStatus = (applicationId, packageName, options = {}) => {
  return useQuery({
    queryKey: queryKeys.appInstallStatus(applicationId, packageName),
    queryFn: () => emulatorService.checkAppInstalled(applicationId, packageName),
    enabled: !!(applicationId && packageName),
    staleTime: 30 * 1000, // 30 secondes
    cacheTime: 2 * 60 * 1000, // 2 minutes
    retry: 2,
    ...options,
    onError: (error) => {
      console.error('App install status error:', error);
    }
  });
};

// Hook pour démarrer l'émulateur
export const useStartEmulator = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: emulatorService.startEmulator,
    onMutate: async (applicationId) => {
      // Optimistic update
      await queryClient.cancelQueries({ queryKey: queryKeys.emulatorStatus(applicationId) });
      const previousStatus = queryClient.getQueryData(queryKeys.emulatorStatus(applicationId));
      
      queryClient.setQueryData(queryKeys.emulatorStatus(applicationId), {
        ...previousStatus,
        status: 'starting'
      });
      
      return { previousStatus, applicationId };
    },
    onSuccess: (data, variables) => {
      // Invalider le statut de l'émulateur
      queryClient.invalidateQueries({ queryKey: queryKeys.emulatorStatus(variables) });
      toast.success('Émulateur démarré avec succès');
    },
    onError: (error, variables, context) => {
      // Rollback optimistic update
      if (context?.previousStatus) {
        queryClient.setQueryData(
          queryKeys.emulatorStatus(context.applicationId),
          context.previousStatus
        );
      }
      toast.error('Erreur lors du démarrage de l\'émulateur');
      console.error('Start emulator error:', error);
    },
    onSettled: (data, error, variables) => {
      // Toujours invalider après la mutation
      queryClient.invalidateQueries({ queryKey: queryKeys.emulatorStatus(variables) });
    }
  });
};

// Hook pour arrêter l'émulateur
export const useStopEmulator = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: emulatorService.stopEmulator,
    onMutate: async (applicationId) => {
      // Optimistic update
      await queryClient.cancelQueries({ queryKey: queryKeys.emulatorStatus(applicationId) });
      const previousStatus = queryClient.getQueryData(queryKeys.emulatorStatus(applicationId));
      
      queryClient.setQueryData(queryKeys.emulatorStatus(applicationId), {
        ...previousStatus,
        status: 'stopping'
      });
      
      return { previousStatus, applicationId };
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.emulatorStatus(variables) });
      toast.success('Émulateur arrêté avec succès');
    },
    onError: (error, variables, context) => {
      // Rollback optimistic update
      if (context?.previousStatus) {
        queryClient.setQueryData(
          queryKeys.emulatorStatus(context.applicationId),
          context.previousStatus
        );
      }
      toast.error('Erreur lors de l\'arrêt de l\'émulateur');
      console.error('Stop emulator error:', error);
    },
    onSettled: (data, error, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.emulatorStatus(variables) });
    }
  });
};

// Hook pour installer une app
export const useInstallApp = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ applicationId, packageName }) => 
      emulatorService.installApp(applicationId, packageName),
    onSuccess: (data, variables) => {
      // Invalider le statut d'installation
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.appInstallStatus(variables.applicationId, variables.packageName) 
      });
      toast.success('Application installée avec succès');
    },
    onError: (error) => {
      toast.error('Erreur lors de l\'installation de l\'application');
      console.error('Install app error:', error);
    }
  });
};