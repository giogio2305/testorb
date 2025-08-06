import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { containerService } from '../services/api';
import { queryKeys, invalidateQueries } from '../config/queryKeys';
import toast from 'react-hot-toast';

// Hook pour récupérer la santé de l'émulateur
export const useEmulatorHealth = (options = {}) => {
  return useQuery({
    queryKey: queryKeys.emulatorHealth(),
    queryFn: containerService.getEmulatorHealth,
    refetchInterval: 10000, // Refetch toutes les 10 secondes
    staleTime: 5000, // 5 secondes
    retry: 2,
    ...options,
    onError: (error) => {
      console.error('Emulator health error:', error);
    }
  });
};

// Hook pour démarrer intelligemment les conteneurs
export const useSmartStartContainers = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (services = null) => containerService.smartStart(services),
    onSuccess: (data) => {
      // Invalider toutes les queries liées aux conteneurs
      invalidateQueries.containers(queryClient);
      invalidateQueries.emulator(queryClient);
      toast.success('Conteneurs démarrés avec succès');
    },
    onError: (error) => {
      toast.error('Erreur lors du démarrage des conteneurs');
      console.error('Smart start containers error:', error);
    }
  });
};