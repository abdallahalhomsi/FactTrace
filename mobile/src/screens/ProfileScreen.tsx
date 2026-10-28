import React, { useState } from 'react';

import {
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { COLORS } from '../constants/app';
import { RootStackParamList } from '../navigation/types';
import { signOut } from '../services/authService';
import { useAuth } from '../hooks/useAuth';

type Props = NativeStackScreenProps<RootStackParamList, 'Profile'>;

export default function ProfileScreen({ navigation }: Props) {
  const user = useAuth();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignOut = async () => {
    if (isSigningOut) {
      return;
    }
    setError(null);
    setIsSigningOut(true);
    try {
      await signOut();
      navigation.reset({
        index: 0,
        routes: [{ name: 'Home' }],
      });
    } catch {
      setError('Could not sign out. Please try again.');
    } finally {
      setIsSigningOut(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
      >
        <TouchableOpacity
          accessibilityRole="button"
          style={styles.backButton}
          onPress={() =>
            navigation.canGoBack()
              ? navigation.goBack()
              : navigation.navigate('Home')
          }
        >
          <Ionicons name="arrow-back" size={22} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Profile</Text>
        <Text style={styles.subtitle}>
          {user
            ? 'Your FactTrace account'
            : 'You are using FactTrace as a guest.'}
        </Text>

        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Ionicons
              name="person-outline"
              size={42}
              color={COLORS.blue}
            />
          </View>
          <Text style={styles.welcome}>
            {user?.displayName || (user ? 'Welcome back!' : 'Welcome, Guest!')}
          </Text>
          <Text style={styles.helper}>
            {user?.email ||
              (user
                ? 'Your profile and verification history are saved on this device.'
                : 'Scanning works without an account.')}
          </Text>
        </View>

        {error ? (
          <Text accessibilityRole="alert" style={styles.error}>
            {error}
          </Text>
        ) : null}

        {user ? (
          <TouchableOpacity
            activeOpacity={0.85}
            disabled={isSigningOut}
            style={[styles.button, styles.primaryButton]}
            onPress={handleSignOut}
          >
            {isSigningOut ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <Text style={styles.primaryText}>Log Out</Text>
            )}
          </TouchableOpacity>
        ) : (
          <>
            <TouchableOpacity
              activeOpacity={0.85}
              style={[styles.button, styles.primaryButton]}
              onPress={() => navigation.navigate('SignUp')}
            >
              <Text style={styles.primaryText}>Create Account</Text>
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.85}
              style={[styles.button, styles.secondaryButton]}
              onPress={() => navigation.navigate('Login')}
            >
              <Text style={styles.buttonText}>Log In</Text>
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.85}
              style={[styles.button, styles.outlineButton]}
              onPress={() => navigation.navigate('Home')}
            >
              <Text style={styles.buttonText}>Continue as Guest</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F5F8FC',
  },
  container: {
    flex: 1,
    backgroundColor: '#F5F8FC',
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 15,
    paddingBottom: 28,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    marginBottom: 10,
  },
  title: {
    color: COLORS.textPrimary,
    fontSize: 26,
    fontWeight: '800',
  },
  subtitle: {
    marginTop: 4,
    color: COLORS.textSecondary,
    fontSize: 14,
  },
  profileCard: {
    minHeight: 235,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 46,
    marginBottom: 40,
    borderRadius: 20,
    backgroundColor: COLORS.white,
    padding: 22,
  },
  avatar: {
    width: 94,
    height: 94,
    borderRadius: 47,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.blueLight,
  },
  welcome: {
    marginTop: 18,
    color: COLORS.textPrimary,
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
  },
  helper: {
    marginTop: 9,
    color: COLORS.textSecondary,
    fontSize: 13,
    textAlign: 'center',
  },
  button: {
    minHeight: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    borderRadius: 13,
  },
  primaryButton: {
    backgroundColor: COLORS.blue,
  },
  primaryText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '700',
  },
  secondaryButton: {
    backgroundColor: COLORS.blueLight,
  },
  outlineButton: {
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  buttonText: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  error: {
    marginBottom: 12,
    color: COLORS.red,
    fontSize: 13,
  },
});
