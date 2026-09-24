import React, { createContext, useContext, useState } from 'react';
import type { User, Resume, UserRoleTarget } from '../types';
import { mockUser, mockResume } from '../mock/mockData';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  activeResume: Resume | null;
  login: (email: string) => void;
  logout: () => void;
  updateUserTargetRole: (role: UserRoleTarget) => void;
  setActiveResume: (resume: Resume) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(mockUser);
  const [activeResume, setActiveResume] = useState<Resume | null>(mockResume);

  const login = (_email: string) => {
    setUser(mockUser);
  };

  const logout = () => {
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
        activeResume,
        login,
        logout,
        updateUserTargetRole,
        setActiveResume,
      }}
    >
      {children}
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
