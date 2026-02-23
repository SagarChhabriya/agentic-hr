import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

if (import.meta.env.PROD && !import.meta.env.VITE_API_URL) {
  console.warn('VITE_API_URL is not set. API calls will fail.');
}

const apiClient = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

type TokenGetter = () => Promise<string | null>;

let tokenGetter: TokenGetter | null = null;

export function setApiTokenGetter(getter: TokenGetter) {
  tokenGetter = getter;
}

apiClient.interceptors.request.use(
  async (config) => {
    if (tokenGetter) {
      const token = await tokenGetter();
      if (token) config.headers.Authorization = `Bearer ${token}`;
    } else {
      const token = localStorage.getItem('accessToken');
      if (token) config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (err) => Promise.reject(err)
);

apiClient.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('accessToken');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export const authApi = {
  login: async (email: string, password: string) => {
    const { data } = await apiClient.post('/auth/login', { email, password });
    return data;
  },
  register: async (email: string, password: string, firstName?: string, lastName?: string, role?: string) => {
    const { data } = await apiClient.post('/auth/register', { email, password, firstName, lastName, role });
    return data;
  },
  getProfile: async () => {
    const { data } = await apiClient.get('/auth/profile');
    return data;
  },
  refreshToken: async (refreshToken: string) => {
    const { data } = await apiClient.post('/auth/refresh', { refreshToken });
    return data;
  },
};

export const jobsApi = {
  list: (status?: string) =>
    apiClient.get('/jobs', { params: status && status !== 'all' ? { status } : {} }).then((r) => r.data),
  create: (body: Record<string, unknown>) => apiClient.post('/jobs', body).then((r) => r.data),
  get: (id: string) => apiClient.get(`/jobs/${id}`).then((r) => r.data),
  update: (id: string, body: Record<string, unknown>) => apiClient.patch(`/jobs/${id}`, body).then((r) => r.data),
  delete: (id: string) => apiClient.delete(`/jobs/${id}`),
};

export const applicationsApi = {
  list: (status?: string) =>
    apiClient.get('/applications', { params: status && status !== 'all' ? { status } : {} }).then((r) => r.data),
};

export const assessmentsApi = {
  list: () => apiClient.get('/assessments').then((r) => r.data),
  create: (body: { name: string; duration_minutes: number; job_id?: string }) =>
    apiClient.post('/assessments', body).then((r) => r.data),
};

export const customQuestionsApi = {
  list: () => apiClient.get('/custom-questions').then((r) => r.data),
  create: (body: { question: string; type: string; required: boolean }) =>
    apiClient.post('/custom-questions', body).then((r) => r.data),
  update: (id: string, body: Partial<{ question: string; type: string; required: boolean }>) =>
    apiClient.patch(`/custom-questions/${id}`, body).then((r) => r.data),
  delete: (id: string) => apiClient.delete(`/custom-questions/${id}`),
};

export default apiClient;
