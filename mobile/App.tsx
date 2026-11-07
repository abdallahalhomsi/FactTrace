import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  DarkTheme as NavigationDarkTheme,
  DefaultTheme as NavigationDefaultTheme,
  NavigationContainer,
} from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';

import AppNavigator from './src/navigation/AppNavigator';
import { ThemeColors } from './src/constants/app';
import { initializeAuth } from './src/services/authService';
import { AppThemeProvider, useAppTheme } from './src/theme/AppTheme';

function AppContent() {
  const { colors: COLORS, isDark, ready } = useAppTheme();
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initialize = () => {
    setError(null);
    setIsReady(false);
    void initializeAuth()
      .then(() => setIsReady(true))
      .catch(initializationError => {
        setError(
          initializationError instanceof Error
            ? initializationError.message
            : 'Could not load the local demo profile.',
        );
      });
  };

  useEffect(() => {
    initialize();
  }, []);

  if (!ready || !isReady) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        {error ? (
          <View style={styles.message}>
            <Text style={styles.error}>{error}</Text>
            <TouchableOpacity style={styles.button} onPress={initialize}>
              <Text style={styles.buttonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <ActivityIndicator color={COLORS.blue} size="large" />
        )}
      </SafeAreaView>
    );
  }

  const baseNavigationTheme = isDark
    ? NavigationDarkTheme
    : NavigationDefaultTheme;

  const navigationTheme = {
    ...baseNavigationTheme,
    colors: {
      ...baseNavigationTheme.colors,
      primary: COLORS.blue,
      background: COLORS.background,
      card: COLORS.surface,
      text: COLORS.textPrimary,
      border: COLORS.border,
    },
  };

  return (
    <NavigationContainer theme={navigationTheme}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <AppNavigator />
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <AppThemeProvider>
      <AppContent />
    </AppThemeProvider>
  );
}

const createStyles = (COLORS: ThemeColors) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: COLORS.background,
      padding: 24,
    },
    message: {
      alignItems: 'center',
    },
    error: {
      marginBottom: 16,
      color: COLORS.red,
      textAlign: 'center',
    },
    button: {
      borderRadius: 12,
      backgroundColor: COLORS.blue,
      paddingHorizontal: 24,
      paddingVertical: 12,
    },
    buttonText: {
      color: COLORS.white,
      fontWeight: '700',
    },
  });
