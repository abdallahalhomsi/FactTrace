import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import AppNavigator from './src/navigation/AppNavigator';
import { COLORS } from './src/constants/app';
import { initializeAuth } from './src/services/authService';

export default function App() {
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

  if (!isReady) {
    return (
      <SafeAreaView style={styles.safeArea}>
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

  return (
    <NavigationContainer>
      <AppNavigator />
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5F8FC',
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
    paddingVertical: 13,
  },
  buttonText: {
    color: COLORS.white,
    fontWeight: '700',
  },
});