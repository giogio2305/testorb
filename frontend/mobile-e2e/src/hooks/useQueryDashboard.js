import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { dashboardService } from '../services/api';
import { queryKeys } from '../config/queryKeys';
import toast from 'react-hot-toast';

// Hook pour récupérer les données du dashboard
export const useDashboardData = () => {
  return useQuery({
    queryKey: queryKeys.dashboardData(),
    queryFn: dashboardService.getDashboardData,
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: true,
    retry: 2,
    onError: (error) => {
      toast.error('Erreur lors du chargement des données du dashboard');
      console.error('Dashboard data error:', error);
    }
  });
};

// Hook pour récupérer les tests récents
export const useRecentTests = (params = {}) => {
  return useQuery({
    queryKey: queryKeys.recentTests(params),
    queryFn: () => dashboardService.getRecentTests(params),
    staleTime: 2 * 60 * 1000, // 2 minutes
    cacheTime: 5 * 60 * 1000, // 5 minutes
    enabled: true,
    retry: 2,
    onError: (error) => {
      toast.error('Erreur lors du chargement des tests récents');
      console.error('Recent tests error:', error);
    }
  });
};

// Hook pour rafraîchir toutes les données du dashboard
export const useRefreshDashboard = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async () => {
      // Invalider et refetch toutes les queries du dashboard
      await queryClient.invalidateQueries({ queryKey: queryKeys.dashboard });
      return Promise.resolve();
    },
    onSuccess: () => {
      toast.success('Dashboard actualisé avec succès');
    },
    onError: (error) => {
      toast.error('Erreur lors de l\'actualisation du dashboard');
      console.error('Dashboard refresh error:', error);
    }
  });
};