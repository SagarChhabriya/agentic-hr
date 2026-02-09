import axios from 'axios';

// API URL: Use environment variable if set, otherwise fallback to localhost for development
// In production, VITE_API_URL must be set after backend is deployed
// If not set in production, API calls will fail (which is expected until backend is deployed)
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

// Warn in production if API URL is not set
if (import.meta.env.PROD && !import.meta.env.VITE_API_URL) {
  console.warn('⚠️ VITE_API_URL is not set. API calls will fail. Set it in Vercel environment variables after backend is deployed.');
}

const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for token refresh (simplified - implement full refresh logic)
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('accessToken');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const authApi = {
  login: async (email: string, password: string) => {
    const response = await apiClient.post('/auth/login', { email, password });
    return response.data;
  },

  register: async (email: string, password: string, firstName?: string, lastName?: string, role?: string) => {
    const response = await apiClient.post('/auth/register', { email, password, firstName, lastName, role });
    return response.data;
  },

  getProfile: async () => {
    const response = await apiClient.get('/auth/profile');
    return response.data;
  },

  refreshToken: async (refreshToken: string) => {
    const response = await apiClient.post('/auth/refresh', { refreshToken });
    return response.data;
  },
};

export default apiClient;
