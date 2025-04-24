
import React, { createContext, useContext, useEffect, useState } from 'react';
import { ThemeType } from '../types';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { useAuth } from './AuthContext';

interface ThemeContextType {
  theme: ThemeType;
  setTheme: (theme: ThemeType) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [theme, setThemeState] = useLocalStorage<ThemeType>(
    'crypto-app-theme',
    user?.settings?.theme || 'dark'
  );

  // Apply theme to document
  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
  }, [theme]);

  // Update theme when user settings change
  useEffect(() => {
    if (user?.settings?.theme && user.settings.theme !== theme) {
      setThemeState(user.settings.theme);
    }
  }, [user?.settings?.theme]);

  const setTheme = (newTheme: ThemeType) => {
    setThemeState(newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
