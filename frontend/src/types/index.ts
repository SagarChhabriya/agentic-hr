export interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: 'ADMIN' | 'RECRUITER' | 'CANDIDATE';
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}
