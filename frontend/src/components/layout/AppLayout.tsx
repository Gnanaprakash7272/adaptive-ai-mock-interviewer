import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';
import { useAuth } from '../../context/AuthContext';

export const AppLayout: React.FC = () => {
  const location = useLocation();
  const { user } = useAuth();

  const isPublicStandalonePage =
    !user ||
    location.pathname === '/' ||
    location.pathname === '/login' ||
    location.pathname === '/signup' ||
    location.pathname === '/forgot-password';

  return (
    <div className="min-h-screen flex flex-col bg-surface-light dark:bg-surface-dark transition-colors duration-200">
      <Navbar />

      <div className="flex-1 flex w-full">
        {!isPublicStandalonePage && <Sidebar />}

        <main className="flex-1 w-full overflow-x-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
