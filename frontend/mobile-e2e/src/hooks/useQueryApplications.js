import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { applicationService } from '../services/api';
import { queryKeys, invalidateQueries } from '../config/queryKeys';
import toast from 'react-hot-toast';

// Hook pour récupérer la liste des applications
export const useApplicationsList = () => {
  return useQuery({
    queryKey: queryKeys.applicationsList(),
    queryFn: applicationService.getApplications,
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
    retry: 2,
    onError: (error) => {
      toast.error('Erreur lors du chargement des applications');
      console.error('Applications list error:', error);
    }
  });
};

// Hook pour récupérer une application spécifique
export const useApplicationDetail = (id, options = {}) => {
  return useQuery({
    queryKey: queryKeys.applicationDetail(id),
    queryFn: () => applicationService.getApplication(id),
    enabled: !!id,
    staleTime: 3 * 60 * 1000, // 3 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
    retry: 2,
    ...options,
    onError: (error) => {
      toast.error('Erreur lors du chargement de l\'application');
      console.error('Application detail error:', error);
    }
  });
};

// Hook pour récupérer les tests d'une application
export const useApplicationTests = (id, options = {}) => {
  return useQuery({
    queryKey: queryKeys.applicationTests(id),
    queryFn: () => applicationService.getApplicationTests(id),
    enabled: !!id,
    staleTime: 2 * 60 * 1000, // 2 minutes
    cacheTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
    ...options,
    onError: (error) => {
      toast.error('Erreur lors du chargement des tests');
      console.error('Application tests error:', error);
    }
  });
};

// Hook pour créer une nouvelle application
export const useCreateApplication = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: applicationService.createApplication,
    onSuccess: (data) => {
      // Invalider la liste des applications
      invalidateQueries.applications(queryClient);
      // Invalider le dashboard pour mettre à jour les stats
      invalidateQueries.dashboard(queryClient);
      toast.success('Application créée avec succès');
    },
    onError: (error) => {
      toast.error('Erreur lors de la création de l\'application');
      console.error('Create application error:', error);
    }
  });
};

// Hook pour supprimer une application
export const useDeleteApplication = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: applicationService.deleteApplication,
    onSuccess: (data, variables) => {
      // Invalider la liste des applications
      invalidateQueries.applications(queryClient);
      // Invalider le dashboard
      invalidateQueries.dashboard(queryClient);
      // Supprimer les données en cache de cette application
      queryClient.removeQueries({ queryKey: queryKeys.applicationDetail(variables) });
      queryClient.removeQueries({ queryKey: queryKeys.applicationTests(variables) });
      toast.success('Application supprimée avec succès');
    },
    onError: (error) => {
      toast.error('Erreur lors de la suppression de l\'application');
      console.error('Delete application error:', error);
    }
  });
};

// Hook pour uploader un test
export const useUploadTest = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, formData }) => applicationService.uploadTest(id, formData),
    onSuccess: (data, variables) => {
      // Invalider les tests de cette application
      queryClient.invalidateQueries({ queryKey: queryKeys.applicationTests(variables.id) });
      // Invalider le détail de l'application
      queryClient.invalidateQueries({ queryKey: queryKeys.applicationDetail(variables.id) });
      toast.success('Test uploadé avec succès');
    },
    onError: (error) => {
      toast.error('Erreur lors de l\'upload du test');
      console.error('Upload test error:', error);
    }
  });
};

// Hook pour supprimer un test
export const useDeleteTest = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ applicationId, testId }) => applicationService.deleteTest(applicationId, testId),
    onSuccess: (data, variables) => {
      // Invalider les tests de cette application
      queryClient.invalidateQueries({ queryKey: queryKeys.applicationTests(variables.applicationId) });
      toast.success('Test supprimé avec succès');
    },
    onError: (error) => {
      toast.error('Erreur lors de la suppression du test');
      console.error('Delete test error:', error);
    }
  });
};

// Hook pour modifier un test
export const useUpdateTest = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ applicationId, testId, data }) => applicationService.updateTest(applicationId, testId, data),
    onSuccess: (data, variables) => {
      // Invalider les tests de cette application
      queryClient.invalidateQueries({ queryKey: queryKeys.applicationTests(variables.applicationId) });
      toast.success('Test modifié avec succès');
    },
    onError: (error) => {
      toast.error('Erreur lors de la modification du test');
      console.error('Update test error:', error);
    }
  });
};