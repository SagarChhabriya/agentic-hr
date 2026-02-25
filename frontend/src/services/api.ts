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
  setQuestions: (jobId: string, questionIds: string[]) =>
    apiClient.put(`/jobs/${jobId}/questions`, { question_ids: questionIds }).then((r) => r.data),
  listPublic: (params?: { search?: string; location?: string; job_type?: string }) =>
    apiClient.get('/jobs/public', { params }).then((r) => r.data),
  getPublic: (id: string) => apiClient.get(`/jobs/public/${id}`).then((r) => r.data),
};

export const applicationsApi = {
  list: (status?: string) =>
    apiClient.get('/applications', { params: status && status !== 'all' ? { status } : {} }).then((r) => r.data),
  apply: (body: { job_id: string; cover_letter?: string; custom_answers?: Record<string, string> }) =>
    apiClient.post('/applications', body).then((r) => r.data),
  mine: () => apiClient.get('/applications/mine').then((r) => r.data),
  updateStatus: (id: string, status: string) =>
    apiClient.patch(`/applications/${id}/status`, { status }).then((r) => r.data),
};

export const profileApi = {
  get: () => apiClient.get('/profile').then((r) => r.data),
  update: (body: Record<string, unknown>) => apiClient.put('/profile', body).then((r) => r.data),
  uploadResume: (file: File) => {
    const form = new FormData();
    form.append('file', file);
    return apiClient.post('/profile/resume', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then((r) => r.data);
  },
  deleteResume: () => apiClient.delete('/profile/resume').then((r) => r.data),
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
