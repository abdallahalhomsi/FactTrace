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
import {
  MIN_PASSWORD_LENGTH,
  signUp,
} from '../services/authService';

type Props = NativeStackScreenProps<RootStackParamList, 'SignUp'>;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function SignUpScreen({ navigation }: Props) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignUp = async () => {
    if (isSubmitting) {
      return;
    }

    const normalizedName = name.trim();
    const normalizedEmail = email.trim();
    if (!normalizedName || !normalizedEmail) {
      setError('Enter your name and email to create your account.');
      return;
    }
    if (!EMAIL_PATTERN.test(normalizedEmail)) {
      setError('Enter a valid email address.');
      return;
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(
        `Password must be at least ${MIN_PASSWORD_LENGTH} characters long.`,
      );
      return;
    }

    setError(null);
    setIsSubmitting(true);
    try {
      await signUp(normalizedName, normalizedEmail, password);
      navigation.reset({
        index: 0,
        routes: [{ name: 'Home' }],
      });
    } catch (signupError) {
      setError(
        signupError instanceof Error
          ? signupError.message
          : 'Account creation is unavailable. Please try again later.',
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
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>
            Save and access your verification history on this device.
          </Text>

          <View style={styles.form}>
            <Text style={styles.label}>Name</Text>
            <TextInput
              autoComplete="name"
              style={styles.input}
              placeholder="Your name"
              placeholderTextColor={COLORS.textSecondary}
              value={name}
              onChangeText={setName}
              editable={!isSubmitting}
              accessibilityLabel="Name"
            />

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

            <Text style={styles.label}>Password</Text>
            <TextInput
              autoCapitalize="none"
              autoComplete="new-password"
              secureTextEntry
              style={styles.input}
              placeholder="At least 8 characters"
              placeholderTextColor={COLORS.textSecondary}
              value={password}
              onChangeText={setPassword}
              editable={!isSubmitting}
              accessibilityLabel="Password"
            />

            <Text style={styles.accountNote}>
              Use at least {MIN_PASSWORD_LENGTH} characters. This local demo
              stores a password hash on this device; it is not server
              authentication and won’t sync to other devices. Don’t reuse a
              password you use elsewhere.
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
              onPress={handleSignUp}
            >
              {isSubmitting ? (
                <ActivityIndicator color={COLORS.white} />
              ) : (
                <Text style={styles.primaryText}>Create Account</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.85}
              style={[styles.button, styles.secondaryButton]}
              onPress={() => navigation.navigate('Login')}
            >
              <Text style={styles.buttonText}>Already registered? Log In</Text>
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
    marginTop: 42,
  },
  label: {
    marginBottom: 8,
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  input: {
    minHeight: 52,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    backgroundColor: COLORS.white,
    paddingHorizontal: 14,
    color: COLORS.textPrimary,
    fontSize: 14,
  },
  accountNote: {
    marginBottom: 20,
    color: COLORS.textSecondary,
    fontSize: 13,
    lineHeight: 19,
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
