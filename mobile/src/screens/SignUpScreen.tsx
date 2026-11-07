import React, { useMemo, useState } from 'react';

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
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { ThemeColors } from '../constants/app';
import { useAppTheme } from '../theme/AppTheme';
import { RootStackParamList } from '../navigation/types';
import { signUp } from '../services/authService';

type Props = NativeStackScreenProps<
  RootStackParamList,
  'SignUp'
>;

export default function SignUpScreen({
  navigation,
}: Props) {
  const {
    colors: COLORS,
    isDark,
  } = useAppTheme();

  const styles = useMemo(
    () => createStyles(COLORS, isDark),
    [COLORS, isDark],
  );

  const [displayName, setDisplayName] =
    useState('');

  const [email, setEmail] =
    useState('');

  const [password, setPassword] =
    useState('');

  const [confirmPassword, setConfirmPassword] =
    useState('');

  const [isSubmitting, setIsSubmitting] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const handleSignUp = async () => {
    if (isSubmitting) {
      return;
    }

    const cleanName = displayName.trim();
    const cleanEmail = email.trim();

    if (!cleanName) {
      setError('Enter your name.');
      return;
    }

    if (!cleanEmail) {
      setError('Enter your email.');
      return;
    }

    if (!password) {
      setError('Enter a password.');
      return;
    }

    if (password.length < 6) {
      setError(
        'Password must be at least 6 characters.',
      );
      return;
    }

    if (password !== confirmPassword) {
      setError(
        'Passwords do not match.',
      );
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      await signUp(
        cleanEmail,
        password,
        cleanName,
      );

      navigation.reset({
        index: 0,
        routes: [
          {
            name: 'Home',
          },
        ],
      });
    } catch (signUpError) {
      console.warn(
        'Sign up failed.',
        signUpError,
      );

      setError(
        signUpError instanceof Error
          ? signUpError.message
          : 'Could not create your account. Please try again.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView
      style={styles.safeArea}
    >
      <StatusBar
        style={
          isDark
            ? 'light'
            : 'dark'
        }
      />

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={
          Platform.OS === 'ios'
            ? 'padding'
            : undefined
        }
      >
        <ScrollView
          contentContainerStyle={
            styles.content
          }
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Go back"
            style={styles.backButton}
            onPress={() =>
              navigation.canGoBack()
                ? navigation.goBack()
                : navigation.navigate('Home')
            }
          >
            <Ionicons
              name="arrow-back"
              size={22}
              color={COLORS.textPrimary}
            />
          </TouchableOpacity>

          <View style={styles.headerArea}>
            <View style={styles.logo}>
              <Ionicons
                name="person-add-outline"
                size={34}
                color={COLORS.blue}
              />
            </View>

            <Text style={styles.title}>
              Create your account
            </Text>

            <Text style={styles.subtitle}>
              Save your verification history and return to previous checks.
            </Text>
          </View>

          <View style={styles.formCard}>
            <Text style={styles.label}>
              Name
            </Text>

            <View style={styles.inputWrapper}>
              <Ionicons
                name="person-outline"
                size={19}
                color={COLORS.textMuted}
              />

              <TextInput
                style={styles.input}
                value={displayName}
                onChangeText={setDisplayName}
                placeholder="Your name"
                placeholderTextColor={COLORS.textMuted}
                autoCapitalize="words"
                textContentType="name"
                accessibilityLabel="Name"
              />
            </View>

            <Text
              style={[
                styles.label,
                {
                  marginTop: 16,
                },
              ]}
            >
              Email
            </Text>

            <View style={styles.inputWrapper}>
              <Ionicons
                name="mail-outline"
                size={19}
                color={COLORS.textMuted}
              />

              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                placeholderTextColor={COLORS.textMuted}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                textContentType="emailAddress"
                accessibilityLabel="Email"
              />
            </View>

            <Text
              style={[
                styles.label,
                {
                  marginTop: 16,
                },
              ]}
            >
              Password
            </Text>

            <View style={styles.inputWrapper}>
              <Ionicons
                name="lock-closed-outline"
                size={19}
                color={COLORS.textMuted}
              />

              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder="At least 6 characters"
                placeholderTextColor={COLORS.textMuted}
                secureTextEntry
                textContentType="newPassword"
                accessibilityLabel="Password"
              />
            </View>

            <Text
              style={[
                styles.label,
                {
                  marginTop: 16,
                },
              ]}
            >
              Confirm Password
            </Text>

            <View style={styles.inputWrapper}>
              <Ionicons
                name="lock-closed-outline"
                size={19}
                color={COLORS.textMuted}
              />

              <TextInput
                style={styles.input}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Enter the password again"
                placeholderTextColor={COLORS.textMuted}
                secureTextEntry
                textContentType="newPassword"
                accessibilityLabel="Confirm password"
              />
            </View>

            {error ? (
              <View style={styles.errorCard}>
                <Ionicons
                  name="alert-circle-outline"
                  size={19}
                  color={COLORS.red}
                />

                <Text
                  accessibilityRole="alert"
                  style={styles.errorText}
                >
                  {error}
                </Text>
              </View>
            ) : null}

            <TouchableOpacity
              accessibilityRole="button"
              activeOpacity={0.85}
              disabled={isSubmitting}
              style={[
                styles.primaryButton,
                isSubmitting &&
                  styles.disabledButton,
              ]}
              onPress={() =>
                void handleSignUp()
              }
            >
              {isSubmitting ? (
                <ActivityIndicator
                  color={COLORS.white}
                />
              ) : (
                <Text
                  style={styles.primaryButtonText}
                >
                  Create Account
                </Text>
              )}
            </TouchableOpacity>

            <View style={styles.loginRow}>
              <Text style={styles.loginPrompt}>
                Already have an account?
              </Text>

              <TouchableOpacity
                accessibilityRole="button"
                onPress={() =>
                  navigation.navigate('Login')
                }
              >
                <Text style={styles.loginLink}>
                  Log in
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            accessibilityRole="button"
            style={styles.guestButton}
            onPress={() =>
              navigation.reset({
                index: 0,
                routes: [
                  {
                    name: 'Home',
                  },
                ],
              })
            }
          >
            <Text style={styles.guestText}>
              Continue as Guest
            </Text>
          </TouchableOpacity>

          <Text style={styles.note}>
            Creating an account is optional. Guest users can still scan and verify claims.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const createStyles = (
  COLORS: ThemeColors,
  isDark: boolean,
) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: COLORS.background,
    },

    keyboardView: {
      flex: 1,
    },

    content: {
      flexGrow: 1,
      paddingHorizontal: 24,
      paddingTop: 12,
      paddingBottom: 34,
    },

    backButton: {
      width: 44,
      height: 44,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 15,
      backgroundColor: COLORS.surface,
      borderWidth: 1,
      borderColor: COLORS.border,
    },

    headerArea: {
      alignItems: 'center',
      marginTop: 28,
      marginBottom: 28,
    },

    logo: {
      width: 72,
      height: 72,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 24,
      backgroundColor: COLORS.blueLight,
    },

    title: {
      marginTop: 18,
      color: COLORS.textPrimary,
      fontSize: 27,
      fontWeight: '900',
      letterSpacing: -0.5,
      textAlign: 'center',
    },

    subtitle: {
      marginTop: 8,
      maxWidth: 320,
      color: COLORS.textSecondary,
      fontSize: 14,
      lineHeight: 21,
      textAlign: 'center',
    },

    formCard: {
      borderRadius: 20,
      borderWidth: 1,
      borderColor: COLORS.border,
      backgroundColor: COLORS.surface,
      padding: 18,
    },

    label: {
      marginBottom: 7,
      color: COLORS.textPrimary,
      fontSize: 13,
      fontWeight: '700',
    },

    inputWrapper: {
      minHeight: 52,
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: COLORS.border,
      borderRadius: 13,
      backgroundColor: isDark
        ? COLORS.surfaceElevated
        : COLORS.background,
      paddingHorizontal: 13,
    },

    input: {
      flex: 1,
      marginLeft: 9,
      color: COLORS.textPrimary,
      fontSize: 14,
    },

    errorCard: {
      marginTop: 15,
      flexDirection: 'row',
      alignItems: 'flex-start',
      columnGap: 8,
      borderWidth: 1,
      borderColor: COLORS.border,
      borderRadius: 13,
      backgroundColor: isDark
        ? COLORS.surfaceElevated
        : '#FFF1F1',
      padding: 12,
    },

    errorText: {
      flex: 1,
      color: COLORS.red,
      fontSize: 12.5,
      lineHeight: 18,
    },

    primaryButton: {
      minHeight: 52,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 20,
      borderRadius: 14,
      backgroundColor: COLORS.blue,
    },

    primaryButtonText: {
      color: COLORS.white,
      fontSize: 15,
      fontWeight: '800',
    },

    disabledButton: {
      opacity: 0.6,
    },

    loginRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: 18,
      columnGap: 5,
    },

    loginPrompt: {
      color: COLORS.textSecondary,
      fontSize: 13,
    },

    loginLink: {
      color: COLORS.blue,
      fontSize: 13,
      fontWeight: '800',
    },

    guestButton: {
      minHeight: 50,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 13,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: COLORS.border,
      backgroundColor: COLORS.surface,
    },

    guestText: {
      color: COLORS.textPrimary,
      fontSize: 14,
      fontWeight: '700',
    },

    note: {
      marginTop: 20,
      color: COLORS.textMuted,
      fontSize: 12,
      lineHeight: 18,
      textAlign: 'center',
      paddingHorizontal: 10,
    },
  });