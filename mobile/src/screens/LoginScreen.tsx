import React, { useState } from 'react';

import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { COLORS } from '../constants/app';
import { RootStackParamList } from '../navigation/types';
import { signIn } from '../services/authService';

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function LoginScreen({ navigation }: Props) {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    if (isSubmitting) {
      return;
    }

    const normalizedEmail = email.trim();
    if (!normalizedEmail) {
      setError('Enter the email used for your profile.');
      return;
    }
    if (!EMAIL_PATTERN.test(normalizedEmail)) {
      setError('Enter a valid email address.');
      return;
    }

    setError(null);
    setIsSubmitting(true);
    try {
      await signIn(normalizedEmail);
      navigation.reset({
        index: 0,
        routes: [{ name: 'Home' }],
      });
    } catch (loginError) {
      setError(
        loginError instanceof Error
          ? loginError.message
          : 'Sign in is unavailable. Please try again later.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <TouchableOpacity
            accessibilityRole="button"
            style={styles.backButton}
            onPress={() =>
              navigation.canGoBack()
                ? navigation.goBack()
                : navigation.navigate('Profile')
            }
          >
            <Text style={styles.backText}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Log In</Text>
          <Text style={styles.subtitle}>Welcome back to FactTrace.</Text>

          <View style={styles.form}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              style={styles.input}
              placeholder="name@example.com"
              placeholderTextColor={COLORS.textSecondary}
              value={email}
              onChangeText={setEmail}
              editable={!isSubmitting}
              accessibilityLabel="Email"
            />

            <Text style={styles.accountNote}>
              Enter the email you used to create your account. Your account is
              stored on this device.
            </Text>
          </View>

          {error ? (
            <Text accessibilityRole="alert" style={styles.error}>
              {error}
            </Text>
          ) : null}

          <View style={styles.actions}>
            <TouchableOpacity
              activeOpacity={0.85}
              disabled={isSubmitting}
              style={[styles.button, styles.primaryButton]}
              onPress={handleLogin}
            >
              {isSubmitting ? (
                <ActivityIndicator color={COLORS.white} />
              ) : (
                <Text style={styles.primaryText}>Log In</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.85}
              style={[styles.button, styles.secondaryButton]}
              onPress={() => navigation.navigate('SignUp')}
            >
              <Text style={styles.buttonText}>Create Account</Text>
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.85}
              style={[styles.button, styles.outlineButton]}
              onPress={() => navigation.navigate('Home')}
            >
              <Text style={styles.buttonText}>Continue as Guest</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F5F8FC',
  },
  flex: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 32,
  },
  backButton: {
    width: 40,
    height: 36,
    justifyContent: 'center',
    marginBottom: 8,
  },
  backText: {
    color: COLORS.textPrimary,
    fontSize: 32,
    lineHeight: 34,
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
  form: {
    marginTop: 88,
  },
  label: {
    marginBottom: 8,
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  accountNote: {
    marginTop: -8,
    marginBottom: 24,
    color: COLORS.textSecondary,
    fontSize: 13,
    lineHeight: 19,
  },
  input: {
    minHeight: 52,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    backgroundColor: COLORS.white,
    paddingHorizontal: 14,
    color: COLORS.textPrimary,
    fontSize: 14,
  },
  actions: {
    marginTop: 'auto',
    rowGap: 10,
  },
  button: {
    minHeight: 50,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 13,
  },
  primaryButton: {
    backgroundColor: COLORS.blue,
  },
  primaryText: {
    color: COLORS.white,
    fontSize: 15,
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
    marginTop: 2,
    marginBottom: 12,
    color: COLORS.red,
    fontSize: 13,
    lineHeight: 18,
  },
});
