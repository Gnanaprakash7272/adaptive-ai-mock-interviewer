import React, { createContext, useContext, useState } from 'react';

export interface CookiePreferences {
  essential: boolean;     // Always true
  functional: boolean;    // Themes, UI state
  analytics: boolean;     // Usage metrics, performance telemetry
  updatedAt: string;
}

interface CookieContextType {
  preferences: CookiePreferences;
  hasConsented: boolean;
  isModalOpen: boolean;
  openPreferencesModal: () => void;
  closePreferencesModal: () => void;
  acceptAllCookies: () => void;
  rejectNonEssentialCookies: () => void;
  saveCustomPreferences: (custom: { functional: boolean; analytics: boolean }) => void;
}

const STORAGE_KEY = 'mockora_cookie_consent';

const DEFAULT_PREFERENCES: CookiePreferences = {
  essential: true,
  functional: true,
  analytics: true,
  updatedAt: new Date().toISOString(),
};

const CookieContext = createContext<CookieContextType | undefined>(undefined);

export const CookieProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [preferences, setPreferences] = useState<CookiePreferences>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return {
          essential: true,
          functional: parsed.functional ?? true,
          analytics: parsed.analytics ?? true,
          updatedAt: parsed.updatedAt || new Date().toISOString(),
        };
      }
    } catch {
      // Fallback
    }
    return DEFAULT_PREFERENCES;
  });

  const [hasConsented, setHasConsented] = useState<boolean>(() => {
    return Boolean(localStorage.getItem(STORAGE_KEY));
  });

  const [isModalOpen, setIsModalOpen] = useState(false);

  const persistConsent = (newPrefs: CookiePreferences) => {
    setPreferences(newPrefs);
    setHasConsented(true);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newPrefs));
    } catch {
      // ignore
    }
  };

  const openPreferencesModal = () => setIsModalOpen(true);
  const closePreferencesModal = () => setIsModalOpen(false);

  const acceptAllCookies = () => {
    const newPrefs: CookiePreferences = {
      essential: true,
      functional: true,
      analytics: true,
      updatedAt: new Date().toISOString(),
    };
    persistConsent(newPrefs);
    setIsModalOpen(false);
  };

  const rejectNonEssentialCookies = () => {
    const newPrefs: CookiePreferences = {
      essential: true,
      functional: false,
      analytics: false,
      updatedAt: new Date().toISOString(),
    };
    persistConsent(newPrefs);
    setIsModalOpen(false);
  };

  const saveCustomPreferences = ({ functional, analytics }: { functional: boolean; analytics: boolean }) => {
    const newPrefs: CookiePreferences = {
      essential: true,
      functional,
      analytics,
      updatedAt: new Date().toISOString(),
    };
    persistConsent(newPrefs);
    setIsModalOpen(false);
  };

  return (
    <CookieContext.Provider
      value={{
        preferences,
        hasConsented,
        isModalOpen,
        openPreferencesModal,
        closePreferencesModal,
        acceptAllCookies,
        rejectNonEssentialCookies,
        saveCustomPreferences,
      }}
    >
      {children}
    </CookieContext.Provider>
  );
};

export const useCookie = (): CookieContextType => {
  const context = useContext(CookieContext);
  if (!context) {
    throw new Error('useCookie must be used within a CookieProvider');
  }
  return context;
};
