import React, { useCallback, useEffect, useState, useMemo } from 'react';

import {
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type ViewInstance,
} from 'react-native';

import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useIsFocused } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { ThemeColors } from '../constants/app';
import { useAppTheme } from '../theme/AppTheme';
import { RootStackParamList } from '../navigation/types';
import { useAuth } from '../hooks/useAuth';

import {
  getVerificationHistory,
  VerificationHistoryEntry,
} from '../services/historyService';

import { MatchStatus } from '../types/verification';
import { saveWalkthroughState } from '../services/walkthroughService';
import WalkthroughOverlay from '../components/WalkthroughOverlay';

type Props = NativeStackScreenProps<
  RootStackParamList,
  'VerificationHistory'
>;

type StatusTheme = {
  label: string;
  color: string;
  backgroundColor: string;
  icon: keyof typeof Ionicons.glyphMap;
};

function getStatusTheme(
  status: MatchStatus,
  colors: ThemeColors,
): StatusTheme {
  switch (status) {
    case 'strong_match':
      return {
        label: 'Strong match',
        color: '#16855A',
        backgroundColor: '#E8F7EF',
        icon: 'checkmark-circle',
      };

    case 'weak_match':
      return {
        label: 'Weak match',
        color: '#B96800',
        backgroundColor: '#FFF4E2',
        icon: 'alert-circle',
      };

    case 'no_match':
      return {
        label: 'No match',
        color: colors.textSecondary,
        backgroundColor: '#EEF2F6',
        icon: 'remove-circle',
      };
  }
}

function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);

  return `${date.toLocaleDateString()} · ${date.toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  })}`;
}

export default function VerificationHistoryScreen({
  navigation,
  route,
}: Props) {
  const { colors: COLORS, isDark } = useAppTheme();

  const styles = useMemo(
    () => createStyles(COLORS, isDark),
    [COLORS, isDark],
  );

  const isWalkthrough = Boolean(route.params?.walkthrough);

  const isFocused = useIsFocused();

  const authenticatedUser = useAuth();

  const [entries, setEntries] =
    useState<VerificationHistoryEntry[]>([]);

  const [isLoading, setIsLoading] = useState(true);

  const [hasError, setHasError] = useState(false);

  const [retryCount, setRetryCount] = useState(0);
  const continueWalkthroughRef = React.useRef<ViewInstance>(null);

  useEffect(() => {
    let isActive = true;

    if (!isFocused || !authenticatedUser) {
      setEntries([]);
      setHasError(false);
      setIsLoading(false);

      return () => {
        isActive = false;
      };
    }

    setIsLoading(true);
    setHasError(false);

    getVerificationHistory(authenticatedUser)
      .then(history => {
        if (isActive) {
          setEntries(history);
        }
      })
      .catch(error => {
        console.warn(
          'Could not load verification history.',
          error,
        );

        if (isActive) {
          setHasError(true);
        }
      })
      .finally(() => {
        if (isActive) {
          setIsLoading(false);
        }
      });

    return () => {
      isActive = false;
    };
  }, [
    authenticatedUser,
    isFocused,
    retryCount,
  ]);

  const returnToWalkthroughHome =
    useCallback(async () => {
      try {
        await saveWalkthroughState({
          status: 'in_progress',
          step: 'browser',
        });

        navigation.reset({
          index: 0,
          routes: [
            {
              name: 'Home',
              params: {
                walkthroughContinue: true,
              },
            },
          ],
        });
      } catch (error) {
        console.warn(
          'Could not continue walkthrough from History.',
          error,
        );
      }
    }, [navigation]);

  const skipWalkthrough = async () => {
    try {
      await saveWalkthroughState({
        status: 'skipped',
      });

      navigation.reset({
        index: 0,
        routes: [
          {
            name: 'Home',
          },
        ],
      });
    } catch (error) {
      console.warn(
        'Could not skip walkthrough from History.',
        error,
      );
    }
  };

  const handleBack = useCallback(() => {
    if (isWalkthrough) {
      void returnToWalkthroughHome();
      return;
    }

    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate('Home');
    }
  }, [
    isWalkthrough,
    navigation,
    returnToWalkthroughHome,
  ]);

  const handleRetry = () => {
    setRetryCount(count => count + 1);
  };

  const openEntry = (
    entry: VerificationHistoryEntry,
  ) => {
    navigation.navigate('VerificationResults', {
      result: entry.result,
      historyEntryId: entry.id,
    });
  };

  const renderEntry = (
    entry: VerificationHistoryEntry,
  ) => {
    const statusTheme = getStatusTheme(
      entry.result.matchStatus,
      COLORS,
    );

    return (
      <TouchableOpacity
        key={entry.id}
        activeOpacity={0.82}
        accessibilityRole="button"
        disabled={isWalkthrough}
        style={styles.entryCard}
        onPress={() => {
          if (!isWalkthrough) {
            openEntry(entry);
          }
        }}
      >
        <View style={styles.entryHeader}>
          <View style={styles.entryDateArea}>
            <Ionicons
              name="time-outline"
              size={16}
              color={COLORS.textSecondary}
            />

            <Text style={styles.entryDate}>
              {formatTimestamp(entry.timestamp)}
            </Text>
          </View>

          <View
            style={[
              styles.statusBadge,
              {
                backgroundColor:
                  statusTheme.backgroundColor,
              },
            ]}
          >
            <Ionicons
              name={statusTheme.icon}
              size={15}
              color={statusTheme.color}
            />

            <Text
              style={[
                styles.statusText,
                {
                  color: statusTheme.color,
                },
              ]}
            >
              {statusTheme.label}
            </Text>
          </View>
        </View>

        <Text
          style={styles.claimText}
          numberOfLines={4}
          ellipsizeMode="tail"
        >
          {entry.result.originalClaim}
        </Text>

        <View style={styles.entryFooter}>
          <Text style={styles.evidenceCount}>
            {entry.result.evidence.length}{' '}
            {entry.result.evidence.length === 1
              ? 'source'
              : 'sources'}
          </Text>

          <View style={styles.openResult}>
            <Text style={styles.openResultText}>
              View result
            </Text>

            <Ionicons
              name="chevron-forward"
              size={17}
              color={COLORS.blue}
            />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style={isDark ? 'light' : 'dark'} />

      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            style={styles.backButton}
            onPress={handleBack}
          >
            <Ionicons
              name="arrow-back"
              size={22}
              color={COLORS.textPrimary}
            />
          </TouchableOpacity>

          <View style={styles.headerText}>
            <Text style={styles.title}>
              Verification History
            </Text>

            <Text style={styles.subtitle}>
              Your previous claim checks
            </Text>
          </View>

          <View style={styles.headerSpacer} />
        </View>

        {isWalkthrough ? (
          <View style={styles.walkthroughNotice}>
            <Text
              style={styles.walkthroughNoticeTitle}
            >
              Your completed checks
            </Text>

            <Text
              style={styles.walkthroughNoticeText}
            >
              Real completed checks can be reviewed here. The fictional
              walkthrough check is not saved to History.
            </Text>

            <TouchableOpacity
              ref={continueWalkthroughRef}
              accessibilityRole="button"
              activeOpacity={0.85}
              style={styles.primaryButton}
              onPress={() =>
                void returnToWalkthroughHome()
              }
            >
              <Text
                style={styles.primaryButtonText}
              >
                Continue to Home
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              accessibilityRole="button"
              onPress={() =>
                void skipWalkthrough()
              }
              style={styles.walkthroughSkip}
            >
              <Text
                style={styles.walkthroughSkipText}
              >
                Skip Walkthrough
              </Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {!authenticatedUser ? (
          <View style={styles.centerState}>
            <View style={styles.stateIcon}>
              <Ionicons
                name="person-circle-outline"
                size={32}
                color={COLORS.blue}
              />
            </View>

            <Text style={styles.stateTitle}>
              Log in to view your history
            </Text>

            <Text style={styles.stateDescription}>
              Create an account to save and access your verification history.
              You can still verify claims as a guest.
            </Text>

            {!isWalkthrough ? (
              <TouchableOpacity
                activeOpacity={0.85}
                style={styles.primaryButton}
                onPress={() =>
                  navigation.navigate('Login')
                }
              >
                <Text
                  style={styles.primaryButtonText}
                >
                  Log In or Create Account
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>
        ) : isLoading ? (
          <View style={styles.centerState}>
            <ActivityIndicator
              size="large"
              color={COLORS.blue}
            />

            <Text style={styles.loadingText}>
              Loading your history…
            </Text>
          </View>
        ) : hasError ? (
          <View style={styles.centerState}>
            <View style={styles.stateIcon}>
              <Ionicons
                name="cloud-offline-outline"
                size={30}
                color={COLORS.blue}
              />
            </View>

            <Text style={styles.stateTitle}>
              History couldn’t be loaded
            </Text>

            <Text style={styles.stateDescription}>
              Please check your device storage and try again.
            </Text>

            <TouchableOpacity
              activeOpacity={0.85}
              style={styles.primaryButton}
              onPress={handleRetry}
            >
              <Text
                style={styles.primaryButtonText}
              >
                Try again
              </Text>
            </TouchableOpacity>
          </View>
        ) : entries.length === 0 ? (
          <View style={styles.centerState}>
            <View style={styles.stateIcon}>
              <Ionicons
                name="time-outline"
                size={30}
                color={COLORS.blue}
              />
            </View>

            <Text style={styles.stateTitle}>
              No saved checks yet
            </Text>

            <Text style={styles.stateDescription}>
              Successful verifications will appear here when you’re signed in.
            </Text>

            {!isWalkthrough ? (
              <TouchableOpacity
                activeOpacity={0.85}
                style={styles.primaryButton}
                onPress={() =>
                  navigation.navigate('Camera')
                }
              >
                <Text
                  style={styles.primaryButtonText}
                >
                  Verify a claim
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          >
            {entries.map(renderEntry)}
          </ScrollView>
        )}
      </View>

      {isWalkthrough ? (
        <WalkthroughOverlay
          mode="spotlight"
          step="history"
          targetRef={continueWalkthroughRef}
          title="Your verification history"
          message="Real completed checks appear here. The practice check from this walkthrough was not saved. Tap Continue to return to the walkthrough."
          onContinue={() => void returnToWalkthroughHome()}
          onSkip={() => void skipWalkthrough()}
        />
      ) : null}
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

    container: {
      flex: 1,
      paddingHorizontal: 22,
    },

    header: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 10,
      marginBottom: 20,
    },

    backButton: {
      width: 44,
      height: 44,
      borderRadius: 15,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: COLORS.surface,
      elevation: 2,
    },

    headerText: {
      flex: 1,
      alignItems: 'center',
    },

    title: {
      color: COLORS.textPrimary,
      fontSize: 20,
      fontWeight: '800',
    },

    subtitle: {
      marginTop: 3,
      color: COLORS.textSecondary,
      fontSize: 12,
    },

    headerSpacer: {
      width: 44,
    },

    walkthroughNotice: {
      marginBottom: 16,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: isDark
        ? COLORS.border
        : '#EDCC77',
      backgroundColor: isDark
        ? COLORS.surfaceElevated
        : '#FFF9EB',
      padding: 15,
    },

    walkthroughNoticeTitle: {
      color: COLORS.textPrimary,
      fontSize: 15,
      fontWeight: '800',
    },

    walkthroughNoticeText: {
      marginTop: 6,
      marginBottom: 12,
      color: COLORS.textSecondary,
      fontSize: 13,
      lineHeight: 19,
    },

    walkthroughSkip: {
      minHeight: 38,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 4,
    },

    walkthroughSkipText: {
      color: COLORS.blue,
      fontSize: 13,
      fontWeight: '700',
    },

    listContent: {
      paddingBottom: 32,
    },

    entryCard: {
      marginBottom: 13,
      borderRadius: 17,
      borderWidth: 1,
      borderColor: isDark
        ? COLORS.border
        : '#E1E8F0',
      backgroundColor: COLORS.surface,
      padding: 15,
    },

    entryHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      flexWrap: 'wrap',
      rowGap: 8,
    },

    entryDateArea: {
      flexDirection: 'row',
      alignItems: 'center',
      flexShrink: 1,
      marginRight: 8,
    },

    entryDate: {
      marginLeft: 6,
      color: COLORS.textSecondary,
      fontSize: 12,
      flexShrink: 1,
    },

    statusBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: 20,
      paddingHorizontal: 9,
      paddingVertical: 6,
    },

    statusText: {
      marginLeft: 5,
      fontSize: 11,
      fontWeight: '700',
    },

    claimText: {
      marginTop: 13,
      color: COLORS.textPrimary,
      fontSize: 15,
      lineHeight: 22,
      fontWeight: '600',
      flexShrink: 1,
    },

    entryFooter: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: 14,
      paddingTop: 11,
      borderTopWidth: 1,
      borderTopColor: isDark
        ? COLORS.border
        : '#EEF1F5',
    },

    evidenceCount: {
      color: COLORS.textSecondary,
      fontSize: 12,
    },

    openResult: {
      flexDirection: 'row',
      alignItems: 'center',
    },

    openResultText: {
      color: COLORS.blue,
      fontSize: 12,
      fontWeight: '700',
    },

    centerState: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 18,
      paddingBottom: 36,
    },

    stateIcon: {
      width: 64,
      height: 64,
      borderRadius: 21,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: COLORS.blueLight,
    },

    stateTitle: {
      marginTop: 17,
      color: COLORS.textPrimary,
      fontSize: 18,
      fontWeight: '800',
      textAlign: 'center',
    },

    stateDescription: {
      marginTop: 8,
      maxWidth: 310,
      color: COLORS.textSecondary,
      fontSize: 14,
      lineHeight: 21,
      textAlign: 'center',
    },

    loadingText: {
      marginTop: 14,
      color: COLORS.textSecondary,
      fontSize: 14,
    },

    primaryButton: {
      marginTop: 20,
      minHeight: 46,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 22,
      borderRadius: 14,
      backgroundColor: COLORS.blue,
    },

    primaryButtonText: {
      color: COLORS.white,
      fontSize: 14,
      fontWeight: '700',
    },
  });