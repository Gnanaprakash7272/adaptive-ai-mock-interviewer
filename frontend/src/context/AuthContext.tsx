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

interface TokenPayload {
  user_id?: number;
  email?: string;
  name?: string;
  username?: string;
  role?: string;
  exp?: number;
}

const isTokenPayload = (value: unknown): value is TokenPayload =>
  typeof value === 'object' && value !== null;

const decodeTokenPayload = (token: string): TokenPayload => {
  const [, encodedPayload] = token.split('.');
  if (!encodedPayload) {
    throw new Error('Invalid access token format');
  }

  const base64 = encodedPayload.replace(/-/g, '+').replace(/_/g, '/');
  const jsonPayload = decodeURIComponent(
    atob(base64)
      .split('')
      .map((character) => `%${('00' + character.charCodeAt(0).toString(16)).slice(-2)}`)
      .join('')
  );
  const payload: unknown = JSON.parse(jsonPayload);

  if (!isTokenPayload(payload)) {
    throw new Error('Invalid access token payload');
  }

  return payload;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [activeResume, setActiveResume] = useState<Resume | null>(null);

  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const initAuth = async () => {
      // Attempt to hydrate session from token on mount
      const token = getAccessToken();
      if (token) {
        try {
          const payload = decodeTokenPayload(token);
          if (payload.exp && payload.exp < Date.now() / 1000) {
            clearAccessToken();
            setUser(null);
          } else if (payload.user_id && payload.email) {
            setUser({
              user_id: payload.user_id,
              id: String(payload.user_id),
              name: payload.name || payload.email.split('@')[0] || 'Candidate',
              email: payload.email,
              username: payload.username || payload.email.split('@')[0] || 'Candidate',
              role: payload.role || (payload.email.toLowerCase().includes('admin') ? 'admin' : 'candidate'),
            });
            setIsLoading(false);
            return;
          }
        } catch {
          clearAccessToken();
        }
      }

      // If no valid localStorage token, attempt to hydrate via httpOnly cookie /auth/me
      try {
        const me = await apiService.getMe();
        if (me && me.user_id) {
          setUser({
            user_id: me.user_id,
            id: String(me.user_id),
            name: me.name || me.email.split('@')[0] || 'Candidate',
            email: me.email,
            username: me.username || me.email.split('@')[0] || 'Candidate',
            role: (me as any).role || (me.email.toLowerCase().includes('admin') ? 'admin' : 'candidate'),
          });
        }
      } catch {
        // Not logged in
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  useEffect(() => {
    const handleAuthInvalidated = () => {
      setUser(null);
      setActiveResume(null);
    };
    window.addEventListener(AUTH_INVALIDATED_EVENT, handleAuthInvalidated);
    return () => window.removeEventListener(AUTH_INVALIDATED_EVENT, handleAuthInvalidated);
  }, []);

  const login = async (email: string, pass: string) => {
    const res = await apiService.login({ email, password: pass });
    if (!res?.user?.user_id) {
        throw new Error('Login response missing user data');
    }
    const nextUser = {
      user_id: res.user.user_id,
      id: String(res.user.user_id),
      name: res.user.name || res.user.email?.split('@')[0] || 'Candidate',
      email: res.user.email,
      username: res.user.username || res.user.email?.split('@')[0] || 'Candidate',
      role: (res.user as any).role || (res.user.email?.toLowerCase().includes('admin') ? 'admin' : 'candidate'),
    };
    console.log("AUTH USER (from login response):", { res, nextUser });
    setUser(nextUser);

  };

  const logout = () => {
    apiService.logout().catch(() => {});
    clearAccessToken();
    setUser(null);
    setActiveResume(null);
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

// eslint-disable-next-line react/only-export-components -- hook intentionally co-located with provider
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
