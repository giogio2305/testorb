import axios from 'axios';
import useAuthStore from '../store/authStore';

const instance = axios.create({
  baseURL: 'http://localhost:3000'
});

// Add request interceptor to add token to all requests
instance.interceptors.request.use(
  (config) => {
    // Always get the latest token from Zustand
    const token = useAuthStore.getState().token;
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor to handle 401 errors
instance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      useAuthStore.getState().logout();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default instance;