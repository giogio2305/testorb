import { create } from 'zustand';
import axios from 'axios';

const useAuthStore = create((set, get) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  login: async (credentials) => {
    set({ isLoading: true, error: null });
    try {
      const response = await axios.post('/api/auth/login', credentials);
      const { token, user } = response.data;
      set({ user, token, isAuthenticated: true, isLoading: false });
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Échec de la connexion';
      set({ error: errorMessage, isLoading: false });
      throw error; // Re-throw pour que le composant puisse gérer l'erreur
    }
  },

  register: async (userData) => {
    set({ isLoading: true, error: null });
    try {
      await axios.post('/api/auth/register', userData);
      set({ isLoading: false, error: null });
      return true;
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Échec de l\'inscription';
      set({ error: errorMessage, isLoading: false });
      return false;
    }
  },

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    set({ user: null, token: null, isAuthenticated: false, error: null });
  },

  checkAuth: async () => {
    const token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    
    if (token && storedUser) {
      try {
        set({ 
          token, 
          isAuthenticated: true,
          user: JSON.parse(storedUser),
          error: null
        });
      } catch (error) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        set({ user: null, token: null, isAuthenticated: false, error: null });
      }
    }
  },

  // Fonction utilitaire pour nettoyer les erreurs
  clearError: () => set({ error: null })
}));

export default useAuthStore;