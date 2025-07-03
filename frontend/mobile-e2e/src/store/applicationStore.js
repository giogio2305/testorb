import { create } from 'zustand';
import axios from '../config/axios';
import useAuthStore from './authStore';

const useApplicationStore = create((set) => ({
  applications: [],
  isLoading: false,
  error: null,
  
  createApplication: async (formData) => {
    set({ isLoading: true, error: null });
    try {
      const token = useAuthStore.getState().token;
      
      if (!token) {
        throw new Error('Authentication required');
      }

      const formDataToSend = new FormData();
      formDataToSend.append('name', formData.name);
      formDataToSend.append('description', formData.description);
      formDataToSend.append('platform', formData.platform);
      formDataToSend.append('file', formData.file);

      // Let the axios interceptor handle the Authorization header
      const response = await axios.post('/api/applications/create', formDataToSend, {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
      });

      set(state => ({
        applications: [response.data, ...state.applications],
        isLoading: false
      }));

      return response.data;
    } catch (error) {
      const errorMessage = error.message === 'Authentication required' 
        ? 'Please login to create an application'
        : error.response?.data?.error || 'Failed to create application';
        
      set({ 
        error: errorMessage,
        isLoading: false 
      });
      throw error;
    }
  },

  // Fetch all applications
  fetchApplications: async () => {
    set({ isLoading: true, error: null });
    try {
       const token = useAuthStore.getState().token;
      if (!token) {
        throw new Error('Authentication required');
      }

      // No need to get token or set Authorization header here
      const response = await axios.get('/api/applications/list');
      set({ applications: response.data, isLoading: false });
      return response.data;
    } catch (error) {
      set({ 
        error: error.response?.data?.error || 'Failed to fetch applications',
        isLoading: false 
      });
      throw error;
    }
  },

  // Fetch a single application by ID
  fetchApplication: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const token = useAuthStore.getState().token;
      if (!token) {
        throw new Error('Authentication required');
      }
      const response = await axios.get(`/api/applications/list/${id}`);
      set({ isLoading: false });
      return response.data;
    } catch (error) {
      set({
        error: error.response?.data?.error || 'Failed to fetch application details',
        isLoading: false
      });
      throw error;
    }
  },

  // Reset error state
  resetError: () => set({ error: null })
}));

export default useApplicationStore;