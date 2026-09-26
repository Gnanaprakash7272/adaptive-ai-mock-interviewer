import React, { createContext, useContext, useState, useEffect } from 'react';
import type { User, Resume, UserRoleTarget } from '../types';
import {
  apiService,
  getAccessToken,
  clearAccessToken,
  AUTH_INVALIDATED_EVENT,
} from '../services/apiService';


interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  activeResume: Resume | null;
  login: (email: string, pass: string) => Promise<void>;
  logout: () => void;
  updateUserTargetRole: (role: UserRoleTarget) => void;
  setActiveResume: (resume: Resume) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [activeResume, setActiveResume] = useState<Resume | null>(null);

  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    // Attempt to hydrate session from token on mount
    const token = getAccessToken();
    if (token) {
      try {
        // Decode payload manually to avoid new dependencies
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(
          atob(base64)
            .split('')
            .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
            .join('')
        );
        const payload = JSON.parse(jsonPayload);
        
        if (payload.exp && payload.exp < Date.now() / 1000) {
          console.warn('Token expired');
          clearAccessToken();
          setUser(null);
        } else {
          setUser({
            user_id: payload.user_id,
            id: String(payload.user_id),
            name: payload.email?.split('@')[0] || 'Candidate',
            email: payload.email,
          });
        }

      } catch (e) {
        console.error('Invalid token payload', e);
        clearAccessToken();
      }
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    const handleAuthInvalidated = () => setUser(null);
    window.addEventListener(AUTH_INVALIDATED_EVENT, handleAuthInvalidated);
    return () => window.removeEventListener(AUTH_INVALIDATED_EVENT, handleAuthInvalidated);
  }, []);

  const login = async (email: string, pass: string) => {
    const res = await apiService.login({ email, password: pass });
    if (!res?.user?.user_id) {
        throw new Error('Login response missing user data');
    }
    setUser({
      user_id: res.user.user_id,
      id: String(res.user.user_id),
      name: res.user.email?.split('@')[0] || 'Candidate',
      email: res.user.email,
    });

  };

  const logout = () => {
    clearAccessToken();
    setUser(null);
  };

  const updateUserTargetRole = (targetRole: UserRoleTarget) => {
    if (user) {
      setUser({ ...user, targetRole });
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        activeResume,
        login,
        logout,
        updateUserTargetRole,
        setActiveResume,
      }}
    >
      {!isLoading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
