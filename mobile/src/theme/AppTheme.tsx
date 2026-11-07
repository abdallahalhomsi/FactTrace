import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  DARK_COLORS,
  LIGHT_COLORS,
  ThemeColors,
} from '../constants/app';

const STORAGE_KEY = '@facttrace/color-theme';

type ThemeMode = 'light' | 'dark';

type AppThemeValue = {
  mode: ThemeMode;
  isDark: boolean;
  colors: ThemeColors;
  toggleTheme: () => void;
  setTheme: (mode: ThemeMode) => void;
  ready: boolean;
};

const AppThemeContext = createContext<AppThemeValue | null>(null);

export function AppThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>('light');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;

    void AsyncStorage.getItem(STORAGE_KEY)
      .then(value => {
        if (!active) return;
        if (value === 'dark' || value === 'light') {
          setMode(value);
        }
      })
      .finally(() => {
        if (active) setReady(true);
      });

    return () => {
      active = false;
    };
  }, []);

  const setTheme = useCallback((nextMode: ThemeMode) => {
    setMode(nextMode);
    void AsyncStorage.setItem(STORAGE_KEY, nextMode);
  }, []);

  const toggleTheme = useCallback(() => {
    setMode(current => {
      const nextMode: ThemeMode = current === 'dark' ? 'light' : 'dark';
      void AsyncStorage.setItem(STORAGE_KEY, nextMode);
      return nextMode;
    });
  }, []);

  const value = useMemo<AppThemeValue>(
    () => ({
      mode,
      isDark: mode === 'dark',
      colors: mode === 'dark' ? DARK_COLORS : LIGHT_COLORS,
      toggleTheme,
      setTheme,
      ready,
    }),
    [mode, ready, setTheme, toggleTheme],
  );

  return (
    <AppThemeContext.Provider value={value}>
      {children}
    </AppThemeContext.Provider>
  );
}

export function useAppTheme(): AppThemeValue {
  const value = useContext(AppThemeContext);
  if (!value) {
    throw new Error('useAppTheme must be used inside AppThemeProvider');
  }
  return value;
}
