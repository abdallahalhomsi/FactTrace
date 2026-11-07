import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import {
  RootStackParamList,
  StudyTrialContext,
} from '../navigation/types';
import {
  ConditionOrder,
  getStudyClaims,
  createStudySession,
  StudyClaim,
  StudyClaims,
} from '../services/studyService';
import { saveWalkthroughState } from '../services/walkthroughService';

type Props = NativeStackScreenProps<
  RootStackParamList,
  'StudyFlow'
>;

type PlannedTrial = {
  claim: StudyClaim;
  trialIndex: number;
  isPractice: boolean;
  condition: 'app' | 'browser';
  phaseLabel: string;
};

const PARTICIPANT_PATTERN = /^[pP]\d{1,3}$/;

function buildPlan(
  claims: StudyClaims,
  conditionOrder: ConditionOrder,
): PlannedTrial[] {
  const firstCondition: 'app' | 'browser' =
    conditionOrder === 'app_first' ? 'app' : 'browser';

  const secondCondition: 'app' | 'browser' =
    firstCondition === 'app' ? 'browser' : 'app';

  const practice = claims.practice.map((claim, index) => ({
    claim,
    trialIndex: index + 1,
    isPractice: true,
    condition: index === 0 ? firstCondition : secondCondition,
    phaseLabel: `Practice ${index + 1}`,
  }));

  const setA = claims.setA.map((claim, index) => ({
    claim,
    trialIndex: practice.length + index + 1,
    isPractice: false,
    condition: firstCondition,
    phaseLabel: 'Study Set A',
  }));

  const setB = claims.setB.map((claim, index) => ({
    claim,
    trialIndex: practice.length + setA.length + index + 1,
    isPractice: false,
    condition: secondCondition,
    phaseLabel: 'Study Set B',
  }));

  return [...practice, ...setA, ...setB];
}

export default function StudyFlowScreen({
  navigation,
  route,
}: Props) {
  const { colors: COLORS, isDark } = useAppTheme();

  const styles = useMemo(
    () => createStyles(COLORS, isDark),
    [COLORS, isDark],
  );

  const walkthrough = route.params?.walkthrough === true;
  const resumedParticipantId = route.params?.participantId;
  const resumedConditionOrder = route.params?.conditionOrder;

  const completedTrialIndex =
    route.params?.completedTrialIndex ?? 0;

  const [participantInput, setParticipantInput] = useState(
    resumedParticipantId ?? '',
  );

  const [conditionOrder, setConditionOrder] =
    useState<ConditionOrder>(
      resumedConditionOrder ?? 'app_first',
    );

  const [claims, setClaims] =
    useState<StudyClaims | null>(null);

  const [isLoading, setIsLoading] =
    useState(!walkthrough);

  const [isStarting, setIsStarting] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const participantId =
    resumedParticipantId?.toUpperCase();

  const sessionStarted = Boolean(
    participantId && resumedConditionOrder,
  );

  useEffect(() => {
    if (walkthrough) {
      return;
    }

    let active = true;

    void getStudyClaims()
      .then(data => {
        if (!active) {
          return;
        }

        setClaims(data);
        setError(null);
      })
      .catch(loadError => {
        if (!active) {
          return;
        }

        setError(
          loadError instanceof Error
            ? loadError.message
            : 'Could not load the study claims.',
        );
      })
      .finally(() => {
        if (active) {
          setIsLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [walkthrough]);

  const plan = useMemo(() => {
    if (!claims) {
      return [];
    }

    return buildPlan(
      claims,
      resumedConditionOrder ?? conditionOrder,
    );
  }, [
    claims,
    conditionOrder,
    resumedConditionOrder,
  ]);

  const nextTrial = plan.find(
    trial =>
      trial.trialIndex === completedTrialIndex + 1,
  );

  const studyComplete =
    sessionStarted &&
    plan.length > 0 &&
    completedTrialIndex >= plan.length;

  const finishWalkthroughStudyIntro = async () => {
    try {
      await saveWalkthroughState({
        status: 'in_progress',
        step: 'ready',
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
    } catch (walkthroughError) {
      Alert.alert(
        'Could not finish walkthrough step',
        walkthroughError instanceof Error
          ? walkthroughError.message
          : 'Please try again.',
      );
    }
  };

  const startSession = async () => {
    const normalized =
      participantInput.trim().toUpperCase();

    if (!PARTICIPANT_PATTERN.test(normalized)) {
      Alert.alert(
        'Invalid participant ID',
        'Use an anonymous code such as P01, P12, or P105.',
      );

      return;
    }

    setIsStarting(true);
    setError(null);

    try {
      await createStudySession(
        normalized,
        conditionOrder,
      );

      navigation.replace('StudyFlow', {
        participantId: normalized,
        conditionOrder,
        completedTrialIndex: 0,
      });
    } catch (startError) {
      setError(
        startError instanceof Error
          ? startError.message
          : 'Could not start the study session.',
      );
    } finally {
      setIsStarting(false);
    }
  };

  const launchNextTrial = () => {
    if (
      !participantId ||
      !resumedConditionOrder ||
      !nextTrial
    ) {
      return;
    }

    const studyContext: StudyTrialContext = {
      participantId,
      conditionOrder: resumedConditionOrder,
      condition: nextTrial.condition,
      claimId: nextTrial.claim.claimId,
      claimText: nextTrial.claim.text,
      trialIndex: nextTrial.trialIndex,
      isPractice: nextTrial.isPractice,
      startedAt: new Date().toISOString(),
    };

    if (nextTrial.condition === 'browser') {
      navigation.navigate(
        'BrowserComparison',
        {
          studyContext,
        },
      );

      return;
    }

    navigation.navigate(
      'Camera',
      {
        studyContext,
      },
    );
  };

  if (walkthrough) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar style={isDark ? 'light' : 'dark'} />

        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.walkthroughCard}>
            <View style={styles.walkthroughIcon}>
              <Ionicons
                name="flask-outline"
                size={34}
                color={COLORS.blue}
              />
            </View>

            <Text style={styles.walkthroughEyebrow}>
              GUIDED WALKTHROUGH
            </Text>

            <Text style={styles.walkthroughTitle}>
              FactTrace vs Browser Study
            </Text>

            <Text style={styles.walkthroughText}>
              This is the research-study flow used to compare FactTrace with
              normal browser search. A participant receives an anonymous ID,
              completes short practice trials, then checks assigned claims in
              both conditions. The study keeps track of trial order, decisions,
              source use, timing, and sharing intention automatically.
            </Text>

            <View style={styles.walkthroughFlow}>
              <Text style={styles.walkthroughFlowText}>
                Participant ID → Practice → FactTrace + Browser → Study complete
              </Text>
            </View>

            <Text style={styles.walkthroughNote}>
              This walkthrough only introduces the study. No participant session
              or trial is started here.
            </Text>

            <TouchableOpacity
              accessibilityRole="button"
              style={styles.primaryButton}
              onPress={() =>
                void finishWalkthroughStudyIntro()
              }
            >
              <Text style={styles.primaryButtonText}>
                Done
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar style={isDark ? 'light' : 'dark'} />

        <View style={styles.centered}>
          <ActivityIndicator
            size="large"
            color={COLORS.blue}
          />

          <Text style={styles.loadingText}>
            Loading study…
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style={isDark ? 'light' : 'dark'} />

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() =>
            navigation.navigate('Home')
          }
          accessibilityRole="button"
          accessibilityLabel="Back to Home"
        >
          <Ionicons
            name="arrow-back"
            size={22}
            color={COLORS.textPrimary}
          />

          <Text style={styles.backText}>
            Home
          </Text>
        </TouchableOpacity>

        <Text style={styles.title}>
          FactTrace Study
        </Text>

        <Text style={styles.subtitle}>
          Guided participant flow for the FactTrace vs browser comparison.
        </Text>

        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>
              {error}
            </Text>
          </View>
        ) : null}

        {!sessionStarted ? (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>
              Start participant session
            </Text>

            <Text style={styles.label}>
              Participant ID
            </Text>

            <TextInput
              value={participantInput}
              onChangeText={setParticipantInput}
              autoCapitalize="characters"
              autoCorrect={false}
              placeholder="P01"
              placeholderTextColor={COLORS.textMuted}
              style={styles.input}
              maxLength={4}
            />

            <Text style={styles.label}>
              Condition order
            </Text>

            <View style={styles.orderRow}>
              <TouchableOpacity
                style={[
                  styles.orderButton,
                  conditionOrder === 'app_first' &&
                    styles.orderButtonSelected,
                ]}
                onPress={() =>
                  setConditionOrder('app_first')
                }
              >
                <Text
                  style={[
                    styles.orderButtonText,
                    conditionOrder === 'app_first' &&
                      styles.orderButtonTextSelected,
                  ]}
                >
                  FactTrace first
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.orderButton,
                  conditionOrder === 'browser_first' &&
                    styles.orderButtonSelected,
                ]}
                onPress={() =>
                  setConditionOrder('browser_first')
                }
              >
                <Text
                  style={[
                    styles.orderButtonText,
                    conditionOrder === 'browser_first' &&
                      styles.orderButtonTextSelected,
                  ]}
                >
                  Browser first
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.note}>
              Use a fresh anonymous participant code. Practice 1 uses the first
              condition and Practice 2 uses the second condition, so the
              participant sees both interfaces before the measured trials.
            </Text>

            <TouchableOpacity
              style={[
                styles.primaryButton,
                isStarting &&
                  styles.disabledButton,
              ]}
              disabled={isStarting}
              onPress={() =>
                void startSession()
              }
            >
              <Text style={styles.primaryButtonText}>
                {isStarting
                  ? 'Starting…'
                  : 'Start Study'}
              </Text>
            </TouchableOpacity>
          </View>
        ) : studyComplete ? (
          <View style={styles.card}>
            <View style={styles.completeIcon}>
              <Ionicons
                name="checkmark-circle"
                size={56}
                color="#2E9D69"
              />
            </View>

            <Text style={styles.completeTitle}>
              Study complete
            </Text>

            <Text style={styles.completeText}>
              {participantId} completed all {plan.length} trials.
            </Text>

            <Text style={styles.note}>
              The participant can now be thanked and dismissed. Verify the saved
              rows in MySQL before starting the next participant.
            </Text>

            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() =>
                navigation.replace(
                  'StudyFlow',
                  undefined,
                )
              }
            >
              <Text style={styles.primaryButtonText}>
                Start Another Participant
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <View style={styles.progressCard}>
              <View>
                <Text style={styles.progressLabel}>
                  Participant
                </Text>

                <Text style={styles.progressValue}>
                  {participantId}
                </Text>
              </View>

              <View>
                <Text style={styles.progressLabel}>
                  Progress
                </Text>

                <Text style={styles.progressValue}>
                  {completedTrialIndex}/{plan.length}
                </Text>
              </View>

              <View>
                <Text style={styles.progressLabel}>
                  Order
                </Text>

                <Text style={styles.progressValue}>
                  {resumedConditionOrder === 'app_first'
                    ? 'App → Browser'
                    : 'Browser → App'}
                </Text>
              </View>
            </View>

            {nextTrial ? (
              <View style={styles.card}>
                <Text style={styles.eyebrow}>
                  {nextTrial.phaseLabel}
                </Text>

                <Text style={styles.sectionTitle}>
                  Trial {nextTrial.trialIndex} of {plan.length}
                </Text>

                <View style={styles.conditionBadge}>
                  <Ionicons
                    name={
                      nextTrial.condition === 'app'
                        ? 'camera-outline'
                        : 'search-outline'
                    }
                    size={18}
                    color={COLORS.blue}
                  />

                  <Text style={styles.conditionText}>
                    {nextTrial.condition === 'app'
                      ? 'FactTrace condition'
                      : 'Browser condition'}
                  </Text>
                </View>

                <Text style={styles.claimLabel}>
                  Assigned claim
                </Text>

                <Text style={styles.claimText}>
                  {nextTrial.claim.text}
                </Text>

                {nextTrial.condition === 'app' ? (
                  <Text style={styles.note}>
                    Show this claim to the participant on the prepared printed
                    or on-screen study material. They should capture it using
                    the phone camera.
                  </Text>
                ) : (
                  <Text style={styles.note}>
                    The browser screen will show this assigned claim. The
                    participant should research it using ordinary browser search
                    and record the sources they consulted.
                  </Text>
                )}

                <TouchableOpacity
                  style={styles.primaryButton}
                  onPress={launchNextTrial}
                >
                  <Text style={styles.primaryButtonText}>
                    Start Trial {nextTrial.trialIndex}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : null}
          </>
        )}
      </ScrollView>
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

    content: {
      padding: 20,
      paddingBottom: 40,
    },

    centered: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },

    loadingText: {
      marginTop: 12,
      color: COLORS.textMuted,
    },

    backButton: {
      alignSelf: 'flex-start',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingVertical: 8,
      marginBottom: 12,
    },

    backText: {
      color: COLORS.textPrimary,
      fontSize: 15,
      fontWeight: '600',
    },

    title: {
      color: COLORS.textPrimary,
      fontSize: 30,
      fontWeight: '800',
    },

    subtitle: {
      marginTop: 6,
      marginBottom: 20,
      color: COLORS.textMuted,
      fontSize: 15,
      lineHeight: 21,
    },

    card: {
      backgroundColor: COLORS.surface,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: COLORS.border,
      padding: 18,
      marginBottom: 14,
    },

    sectionTitle: {
      color: COLORS.textPrimary,
      fontSize: 20,
      fontWeight: '800',
      marginBottom: 14,
    },

    label: {
      color: COLORS.textPrimary,
      fontSize: 13,
      fontWeight: '700',
      marginBottom: 7,
      marginTop: 8,
    },

    input: {
      minHeight: 50,
      borderWidth: 1,
      borderColor: COLORS.border,
      borderRadius: 13,
      paddingHorizontal: 14,
      color: COLORS.textPrimary,
      backgroundColor: COLORS.surfaceElevated,
      fontSize: 16,
    },

    orderRow: {
      flexDirection: 'row',
      gap: 9,
    },

    orderButton: {
      flex: 1,
      borderWidth: 1,
      borderColor: COLORS.border,
      borderRadius: 13,
      paddingVertical: 13,
      paddingHorizontal: 10,
      alignItems: 'center',
      backgroundColor: COLORS.surfaceElevated,
    },

    orderButtonSelected: {
      borderColor: COLORS.blue,
      backgroundColor: isDark
        ? COLORS.surfaceElevated
        : '#EDF4FF',
    },

    orderButtonText: {
      color: COLORS.textMuted,
      fontWeight: '700',
      textAlign: 'center',
    },

    orderButtonTextSelected: {
      color: COLORS.blue,
    },

    note: {
      marginTop: 14,
      color: COLORS.textMuted,
      fontSize: 13,
      lineHeight: 19,
    },

    primaryButton: {
      marginTop: 18,
      minHeight: 52,
      borderRadius: 14,
      backgroundColor: COLORS.blue,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 16,
    },

    disabledButton: {
      opacity: 0.55,
    },

    primaryButtonText: {
      color: COLORS.white,
      fontSize: 16,
      fontWeight: '800',
    },

    errorBox: {
      marginBottom: 14,
      borderRadius: 13,
      borderWidth: 1,
      borderColor: isDark
        ? COLORS.border
        : '#F3B7B7',
      backgroundColor: isDark
        ? COLORS.surfaceElevated
        : '#FFF3F3',
      padding: 13,
    },

    errorText: {
      color: isDark
        ? COLORS.red
        : '#9C2F2F',
      lineHeight: 19,
    },

    progressCard: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      backgroundColor: isDark
        ? COLORS.surfaceElevated
        : '#EAF2FF',
      borderRadius: 16,
      padding: 15,
      marginBottom: 14,
    },

    progressLabel: {
      color: COLORS.textMuted,
      fontSize: 11,
      fontWeight: '700',
      textTransform: 'uppercase',
    },

    progressValue: {
      marginTop: 4,
      color: COLORS.textPrimary,
      fontSize: 14,
      fontWeight: '800',
    },

    eyebrow: {
      color: COLORS.blue,
      fontSize: 12,
      fontWeight: '800',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: 6,
    },

    conditionBadge: {
      alignSelf: 'flex-start',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 7,
      backgroundColor: isDark
        ? COLORS.surfaceElevated
        : '#EDF4FF',
      paddingHorizontal: 11,
      paddingVertical: 7,
      borderRadius: 999,
      marginBottom: 16,
    },

    conditionText: {
      color: COLORS.blue,
      fontSize: 13,
      fontWeight: '800',
    },

    claimLabel: {
      color: COLORS.textMuted,
      fontSize: 12,
      fontWeight: '700',
      textTransform: 'uppercase',
      marginBottom: 6,
    },

    claimText: {
      color: COLORS.textPrimary,
      fontSize: 18,
      lineHeight: 25,
      fontWeight: '700',
    },

    completeIcon: {
      alignItems: 'center',
    },

    completeTitle: {
      marginTop: 8,
      color: COLORS.textPrimary,
      fontSize: 24,
      fontWeight: '800',
      textAlign: 'center',
    },

    completeText: {
      marginTop: 8,
      color: COLORS.textMuted,
      fontSize: 15,
      textAlign: 'center',
    },

    walkthroughCard: {
      marginTop: 42,
      backgroundColor: COLORS.surface,
      borderRadius: 22,
      borderWidth: 1,
      borderColor: COLORS.border,
      padding: 22,
    },

    walkthroughIcon: {
      width: 62,
      height: 62,
      borderRadius: 18,
      backgroundColor: isDark
        ? COLORS.surfaceElevated
        : '#EDF4FF',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 18,
    },

    walkthroughEyebrow: {
      color: COLORS.blue,
      fontSize: 11,
      fontWeight: '800',
      letterSpacing: 0.8,
      marginBottom: 7,
    },

    walkthroughTitle: {
      color: COLORS.textPrimary,
      fontSize: 26,
      lineHeight: 32,
      fontWeight: '800',
    },

    walkthroughText: {
      marginTop: 12,
      color: COLORS.textSecondary,
      fontSize: 15,
      lineHeight: 22,
    },

    walkthroughFlow: {
      marginTop: 18,
      borderRadius: 14,
      backgroundColor: COLORS.background,
      padding: 14,
    },

    walkthroughFlowText: {
      color: COLORS.textPrimary,
      fontSize: 13,
      fontWeight: '700',
      lineHeight: 19,
      textAlign: 'center',
    },

    walkthroughNote: {
      marginTop: 16,
      color: COLORS.textMuted,
      fontSize: 13,
      lineHeight: 19,
    },
  });