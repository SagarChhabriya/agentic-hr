import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authApi } from '../../services/api';
import { User } from '../../types';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (
    email: string,
    password: string,
    firstName?: string,
    lastName?: string,
    role?: string,
  ) => Promise<User>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');

    if (!token) {
      setIsLoading(false);
      return;
    }

    authApi
      .getProfile()
      .then((userData) => {
        setUser(userData);
      })
      .catch(() => {
        localStorage.removeItem('accessToken');
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  const login = async (email: string, password: string) => {
    const response = await authApi.login(email, password);
    localStorage.setItem('accessToken', response.accessToken);
    setUser(response.user);
    return response.user;
  };

  const register = async (
    email: string,
    password: string,
    firstName?: string,
    lastName?: string,
    role?: string,
  ) => {
    await authApi.register(email, password, firstName, lastName, role);
    const user = await login(email, password);
    return user;
  };

  const logout = () => {
    localStorage.removeItem('accessToken');
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        register,
        logout,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

