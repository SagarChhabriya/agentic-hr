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
    // Let browser set Content-Type with boundary for FormData (manual multipart/form-data breaks parsing)
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
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
  /** Candidate apply flow: job + screening questions (auth). */
  getApplyData: (id: string) => apiClient.get(`/jobs/${id}/apply-data`).then((r) => r.data),
};

export const companiesApi = {
  me: () => apiClient.get('/companies/me').then((r) => r.data),
  upsert: (body: Record<string, unknown>) => apiClient.put('/companies/me', body).then((r) => r.data),
  listPending: () => apiClient.get('/companies/pending').then((r) => r.data),
  verify: (companyId: string) => apiClient.post(`/companies/${companyId}/verify`).then((r) => r.data),
  reject: (companyId: string, reason: string) =>
    apiClient.post(`/companies/${companyId}/reject`, { reason }).then((r) => r.data),
};

export const applicationsApi = {
  list: (status?: string, jobId?: string) => {
    const params: Record<string, string> = {};
    if (status && status !== 'all') params.status = status;
    if (jobId) params.job_id = jobId;
    return apiClient.get('/applications', { params }).then((r) => r.data);
  },
  get: (id: string) => apiClient.get(`/applications/${id}`).then((r) => r.data),
  getAssessmentResult: (applicationId: string) =>
    apiClient.get(`/applications/${applicationId}/assessment-result`).then((r) => r.data),
  resendAssessment: (id: string) =>
    apiClient.post(`/applications/${id}/resend-assessment`).then((r) => r.data),
  apply: (body: { job_id: string; cover_letter?: string; custom_answers?: Record<string, string> }) =>
    apiClient.post('/applications', body).then((r) => r.data),
  mine: () => apiClient.get('/applications/mine').then((r) => r.data),
  updateStatus: (id: string, status: string) =>
    apiClient.patch(`/applications/${id}/status`, { status }).then((r) => r.data),
  scheduleInPerson: (id: string, body: { scheduled_at: string; notes?: string }) =>
    apiClient.post(`/applications/${id}/in-person-schedule`, body).then((r) => r.data),
  sendOfferLetter: (id: string) =>
    apiClient.post(`/applications/${id}/send-offer`).then((r) => r.data),
  respondOffer: (id: string, response: 'accept' | 'decline') =>
    apiClient.post(`/applications/${id}/respond-offer`, { response }).then((r) => r.data),
};

export const interviewsApi = {
  schedule: (body: { application_id: string; scheduled_at: string; duration_minutes?: number }) =>
    apiClient.post('/interviews', body).then((r) => r.data),
  getToken: (interviewId: string) =>
    apiClient.post(`/interviews/${interviewId}/token`).then((r) => r.data),
  listByApplication: (applicationId: string) =>
    apiClient.get(`/interviews/by-application/${applicationId}`).then((r) => r.data),
  mine: () => apiClient.get('/interviews/mine').then((r) => r.data),
  cancel: (interviewId: string) =>
    apiClient.post(`/interviews/${interviewId}/cancel`).then((r) => r.data),
  reschedule: (interviewId: string, body: { scheduled_at: string; duration_minutes?: number }) =>
    apiClient.post(`/interviews/${interviewId}/reschedule`, body).then((r) => r.data),
  /** Candidate: save Supabase storage path after upload completes */
  saveRecordingPath: (interviewId: string, storagePath: string) =>
    apiClient.patch(`/interviews/${interviewId}/recording`, { storage_path: storagePath }).then((r) => r.data),
  /** Recruiter: get a 1-hour signed URL to stream/download the recording */
  getRecordingSignedUrl: (interviewId: string) =>
    apiClient.get(`/interviews/${interviewId}/recording-url`).then((r) => r.data),
};

export const profileApi = {
  get: () => apiClient.get('/profile').then((r) => r.data),
  update: (body: Record<string, unknown>) => apiClient.put('/profile', body).then((r) => r.data),
  uploadResume: (file: File) => {
    const form = new FormData();
    form.append('file', file);
    return apiClient.post('/profile/resume', form).then((r) => r.data);
  },
  deleteResume: () => apiClient.delete('/profile/resume').then((r) => r.data),
};

export const assessmentsApi = {
  list: () => apiClient.get('/assessments').then((r) => r.data),
  getById: (id: string) => apiClient.get(`/assessments/${id}`).then((r) => r.data),
  create: (body: { name: string; duration_minutes: number; job_id?: string }) =>
    apiClient.post('/assessments', body).then((r) => r.data),
  clearQuestions: (assessmentId: string) =>
    apiClient.delete(`/assessments/${assessmentId}/questions`).then((r) => r.data),
  getForAttempt: (assessmentId: string, applicationId: string) =>
    apiClient.get(`/assessments/${assessmentId}/for-attempt`, { params: { application_id: applicationId } }).then((r) => r.data),
  addQuestions: (assessmentId: string, questions: Array<{ question_text: string; options: string[]; correct_index: number }>) =>
    apiClient.put(`/assessments/${assessmentId}/questions`, { questions }).then((r) => r.data),
  submitAttempt: (body: { application_id: string; assessment_id: string; answers: Array<{ question_id: string; selected_index: number }> }) =>
    apiClient.post('/assessments/submit', body).then((r) => r.data),
};

export const customQuestionsApi = {
  list: () => apiClient.get('/custom-questions').then((r) => r.data),
  create: (body: { question: string; type: string; required: boolean }) =>
    apiClient.post('/custom-questions', body).then((r) => r.data),
  update: (id: string, body: Partial<{ question: string; type: string; required: boolean }>) =>
    apiClient.patch(`/custom-questions/${id}`, body).then((r) => r.data),
  delete: (id: string) => apiClient.delete(`/custom-questions/${id}`),
};

export const dashboardApi = {
  recruiter: () => apiClient.get('/dashboard/recruiter').then((r) => r.data),
};

export const aiApi = {
  generateJD: (body: {
    title: string;
    location?: string;
    job_type?: string;
    skills?: string[];
    experience?: string;
    extra_context?: string;
  }) => apiClient.post('/ai/generate-jd', body).then((r) => r.data),
  generateQuestions: (body: {
    job_title: string;
    job_description?: string;
    skills?: string[];
    count?: number;
  }) => apiClient.post('/ai/generate-questions', body).then((r) => r.data),
  generateQuestionsFromPrompt: (body: {
    prompt: string;
    job_title?: string;
    job_description?: string;
    skills?: string[];
    count?: number;
    question_type?: string;
  }) => apiClient.post('/ai/generate-questions-from-prompt', body).then((r) => r.data),
  rankResume: (body: { resume_text: string }) =>
    apiClient.post('/ai/rank-resume', body).then((r) => r.data),
  rankResumeForJob: (body: {
    resume_text: string;
    job_title: string;
    job_description?: string;
    required_skills?: string[];
  }) => apiClient.post('/ai/rank-resume-for-job', body).then((r) => r.data),
};

export default apiClient;
