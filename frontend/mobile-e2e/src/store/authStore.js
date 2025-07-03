import { create } from 'zustand';
import axios from 'axios';

const useAuthStore = create((set) => ({
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
      localStorage.setItem('user', JSON.stringify(user)); // Store user data
    } catch (error) {
      set({ error: error.response?.data?.message || 'Login failed', isLoading: false });
    }
  },

  register: async (userData) => {
    set({ isLoading: true, error: null });
    try {
      await axios.post('/api/auth/register', userData);
      set({ isLoading: false });
      return true;
    } catch (error) {
      set({ error: error.response?.data?.message || 'Registration failed', isLoading: false });
      return false;
    }
  },

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user'); // Remove user data
    set({ user: null, token: null, isAuthenticated: false });
  },

  checkAuth: async () => {
    const token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    
    if (token && storedUser) {
      try {
        // Immediately set the stored data to prevent flashing
        set({ 
          token, 
          isAuthenticated: true,
          user: JSON.parse(storedUser)
        });
        
        // Optionally verify token with backend if needed
        // const response = await axios.get('/api/auth/verify', {
        //   headers: { Authorization: `Bearer ${token}` }
        // });
      } catch (error) {
        // If there's an error parsing stored user or token is invalid
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        set({ user: null, token: null, isAuthenticated: false });
      }
    }
  }
}));

export default useAuthStore;