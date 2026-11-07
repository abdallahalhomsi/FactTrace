
import React, { useRef, useState } from 'react';

import {
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type ViewInstance,
  type ScrollViewInstance,
  useWindowDimensions,
} from 'react-native';

import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';

import { RootStackParamList } from '../navigation/types';
import { COLORS } from '../constants/app';
import { useAuth } from '../hooks/useAuth';
import WalkthroughOverlay from '../components/WalkthroughOverlay';
import { PRACTICE_RESULT } from '../services/walkthroughData';

import {
  getWalkthroughState,
  saveWalkthroughState,
  type WalkthroughStep,
} from '../services/walkthroughService';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

export default function HomeScreen({ navigation, route }: Props) {
  const user = useAuth();
  const { height: windowHeight } = useWindowDimensions();

  // The study assignment is provided by the study flow.
  // Home does not create participant IDs or claim assignments.
  const studyContext = route.params?.studyContext;

  const scrollViewRef = useRef<ScrollViewInstance>(null);
  const scanButtonRef = useRef<ViewInstance>(null);
  const manualEntryButtonRef = useRef<ViewInstance>(null);
  const historyButtonRef = useRef<ViewInstance>(null);
  const browserButtonRef = useRef<ViewInstance>(null);
  const scrollOffset = useRef(0);

  const [walkthroughStep, setWalkthroughStep] =
    useState<WalkthroughStep | null>(null);

  const [walkthroughMode, setWalkthroughMode] = useState<
    'welcome' | 'spotlight' | 'complete' | null
  >(null);

  const [canResumeWalkthrough, setCanResumeWalkthrough] = useState(false);
  const [measurementVersion, setMeasurementVersion] = useState(0);

  const replayHandled = useRef(false);
  const continueHandled = useRef(false);

  const revealScanButton = React.useCallback(() => {
    scrollViewRef.current?.scrollTo({
      y: 0,
      animated: true,
    });

    requestAnimationFrame(() => {
      setMeasurementVersion(version => version + 1);
    });
  }, []);

  const revealTourHomeTarget = React.useCallback((
    target: { current: ViewInstance | null },
  ) => {
    requestAnimationFrame(() => {
      target.current?.measureInWindow((_x, y, _width, targetHeight) => {
        const visibleBottom = windowHeight - 130;
        const overflow = y + targetHeight - visibleBottom;
        if (overflow > 0) {
          scrollViewRef.current?.scrollTo({
            y: scrollOffset.current + overflow,
            animated: true,
          });
        }
        requestAnimationFrame(() => {
          setMeasurementVersion(version => version + 1);
        });
      });
    });
  }, [windowHeight]);

  // Load walkthrough progress whenever Home becomes active.
  // The walkthrough appears automatically only on first use.
  useFocusEffect(
    React.useCallback(() => {
      if (studyContext) {
        setWalkthroughMode(null);
        return;
      }

      let active = true;

      const loadProgress = async () => {
        if (
          route.params?.walkthroughContinue &&
          !continueHandled.current
        ) {
          continueHandled.current = true;
          const savedState = await getWalkthroughState();
          const step =
            savedState?.status === 'in_progress'
              ? savedState.step
              : undefined;

          if (
            active &&
            (step === 'history' ||
              step === 'browser' ||
              step === 'ready')
          ) {
            setWalkthroughStep(step);
            setCanResumeWalkthrough(false);
            setWalkthroughMode(step === 'ready' ? 'complete' : 'spotlight');
            if (step === 'history') {
              revealTourHomeTarget(historyButtonRef);
            } else if (step === 'browser') {
              revealTourHomeTarget(browserButtonRef);
            }
          }

          navigation.setParams({ walkthroughContinue: false });
          return;
        }

        if (continueHandled.current) {
          continueHandled.current = false;
          return;
        }

        // Replay is started explicitly from Profile.
        if (route.params?.walkthroughReplay && !replayHandled.current) {
          replayHandled.current = true;

          await saveWalkthroughState({
            status: 'in_progress',
            step: 'scan',
          });

          if (active) {
            setWalkthroughStep('scan');
            setCanResumeWalkthrough(false);
            setWalkthroughMode('spotlight');
            revealScanButton();
          }

          navigation.setParams({
            walkthroughReplay: false,
          });

          return;
        }

        if (replayHandled.current) {
          replayHandled.current = false;
          return;
        }

        const savedState = await getWalkthroughState();

        if (!active) {
          return;
        }

        if (
          savedState?.status === 'in_progress' &&
          savedState.step
        ) {
          // An interrupted walkthrough can be resumed manually.
          setWalkthroughStep(savedState.step);
          setCanResumeWalkthrough(true);
          setWalkthroughMode(null);
        } else if (!savedState) {
          // First launch only.
          setWalkthroughStep(null);
          setCanResumeWalkthrough(false);
          setWalkthroughMode('welcome');
        } else {
          // Skipped or completed walkthroughs remain dismissed.
          setWalkthroughStep(null);
          setCanResumeWalkthrough(false);
          setWalkthroughMode(null);
        }
      };

      void loadProgress().catch(error => {
        console.warn(
          'Could not restore walkthrough progress.',
          error,
        );

        Alert.alert(
          'Walkthrough unavailable',
          'Saved walkthrough progress could not be loaded. You can continue using FactTrace normally.',
        );
      });

      return () => {
        active = false;
      };
    }, [
      studyContext,
      navigation,
      revealScanButton,
      revealTourHomeTarget,
      route.params?.walkthroughReplay,
      route.params?.walkthroughContinue,
    ]),
  );

  const revealManualEntry = () => {
    requestAnimationFrame(() => {
      manualEntryButtonRef.current?.measureInWindow(
        (_x, y, _width, height) => {
          const visibleBottom = windowHeight - 130;

          const nextOffset = Math.max(
            0,
            scrollOffset.current +
              y +
              height -
              visibleBottom,
          );

          scrollViewRef.current?.scrollTo({
            y: nextOffset,
            animated: true,
          });
        },
      );
    });
  };

  const startWalkthrough = async () => {
    const step = canResumeWalkthrough
      ? walkthroughStep ?? 'scan'
      : 'scan';

    // Resume an unfinished claim-entry lesson.
    if (
      step === 'practice_claim' ||
      step === 'practice_check'
    ) {
      setCanResumeWalkthrough(false);

      navigation.navigate('ClaimReview', {
        walkthrough: true,
      });

      return;
    }

    // Resume an unfinished results, evidence, or decision lesson.
    if (
      step === 'practice_pending' ||
      step === 'result_match' ||
      step === 'result_source' ||
      step === 'evidence_details' ||
      step === 'evidence_return' ||
      step === 'result_decision' ||
      step === 'result_sharing'
    ) {
      setCanResumeWalkthrough(false);

      navigation.navigate('VerificationResults', {
        result: PRACTICE_RESULT,
        walkthrough: true,
      });

      return;
    }

    if (
      step === 'history' ||
      step === 'browser' ||
      step === 'ready'
    ) {
      setWalkthroughStep(step);
      setCanResumeWalkthrough(false);
      setWalkthroughMode(step === 'ready' ? 'complete' : 'spotlight');
      if (step === 'history') {
        revealTourHomeTarget(historyButtonRef);
      } else if (step === 'browser') {
        revealTourHomeTarget(browserButtonRef);
      }
      return;
    }

    if (step === 'complete') {
      try {
        await saveWalkthroughState({
          status: 'in_progress',
          step: 'history',
        });
        setWalkthroughStep('history');
        setCanResumeWalkthrough(false);
        setWalkthroughMode('spotlight');
        revealTourHomeTarget(historyButtonRef);
      } catch (error) {
        Alert.alert(
          'Could not resume walkthrough',
          error instanceof Error ? error.message : 'Please try again.',
        );
      }
      return;
    }

    try {
      await saveWalkthroughState({
        status: 'in_progress',
        step,
      });

      setWalkthroughStep(step);
      setCanResumeWalkthrough(false);
      setWalkthroughMode('spotlight');

      if (step === 'scan') {
        revealScanButton();
      } else if (step === 'manual') {
        revealManualEntry();
      }
    } catch (error) {
      Alert.alert(
        'Could not start walkthrough',
        error instanceof Error
          ? error.message
          : 'Walkthrough progress could not be saved.',
      );
    }
  };

  const showManualEntryStep = async () => {
    try {
      await saveWalkthroughState({
        status: 'in_progress',
        step: 'manual',
      });

      setWalkthroughStep('manual');

      setMeasurementVersion(version => version + 1);

      revealManualEntry();
    } catch (error) {
      Alert.alert(
        'Could not save walkthrough progress',
        error instanceof Error
          ? error.message
          : 'Walkthrough progress could not be saved.',
      );
    }
  };

  const preparePracticeTransition = async () => {
    try {
      // The walkthrough uses a separate practice claim.
      // No real verification or evaluation is started here.
      await saveWalkthroughState({
        status: 'in_progress',
        step: 'practice_claim',
        practiceClaim: '',
      });

      setWalkthroughStep('practice_claim');
      setWalkthroughMode(null);

      navigation.navigate('ClaimReview', {
        walkthrough: true,
      });
    } catch (error) {
      Alert.alert(
        'Could not save walkthrough progress',
        error instanceof Error
          ? error.message
          : 'Walkthrough progress could not be saved.',
      );
    }
  };

  const skipWalkthrough = async () => {
    try {
      await saveWalkthroughState({
        status: 'skipped',
      });

      setWalkthroughMode(null);
      setWalkthroughStep(null);
      setCanResumeWalkthrough(false);
    } catch (error) {
      Alert.alert(
        'Could not skip walkthrough',
        error instanceof Error
          ? error.message
          : 'Walkthrough status could not be saved.',
      );
    }
  };

  const openWalkthroughHistory = async () => {
    try {
      await saveWalkthroughState({
        status: 'in_progress',
        step: 'history',
      });
      setWalkthroughMode(null);
      navigation.navigate('VerificationHistory', { walkthrough: true });
    } catch (error) {
      Alert.alert(
        'Could not save walkthrough progress',
        error instanceof Error ? error.message : 'Please try again.',
      );
    }
  };

  const openWalkthroughBrowser = async () => {
    try {
      await saveWalkthroughState({
        status: 'in_progress',
        step: 'browser',
      });
      setWalkthroughMode(null);
      navigation.navigate('BrowserComparison', { walkthrough: true });
    } catch (error) {
      Alert.alert(
        'Could not save walkthrough progress',
        error instanceof Error ? error.message : 'Please try again.',
      );
    }
  };

  const finishWalkthrough = async () => {
    try {
      await saveWalkthroughState({ status: 'completed' });
      setWalkthroughMode(null);
      setWalkthroughStep(null);
      setCanResumeWalkthrough(false);
    } catch (error) {
      Alert.alert(
        'Could not finish walkthrough',
        error instanceof Error ? error.message : 'Please try again.',
      );
    }
  };

  const onScroll = (offset: number) => {
    scrollOffset.current = offset;

    setMeasurementVersion(version => version + 1);
  };

  const continueAssignedTrial = () => {
    if (!studyContext) {
      return;
    }

    if (studyContext.condition === 'browser') {
      navigation.navigate('BrowserComparison', {
        studyContext,
      });
    } else {
      // Camera must forward this context to ClaimReview and
      // VerificationResults before the app study flow is complete.
      navigation.navigate('Camera', {
        studyContext,
      });
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />

      <ScrollView
        ref={scrollViewRef}
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={event =>
          onScroll(event.nativeEvent.contentOffset.y)
        }
      >
        {/* HEADER */}
        <View style={styles.header}>
          <View>
            <Text style={styles.logo}>FactTrace</Text>

            <Text style={styles.tagline}>
              Check the claim. Explore the evidence.
            </Text>
          </View>

          <TouchableOpacity
            activeOpacity={0.8}
            style={styles.profileButton}
            onPress={() => navigation.navigate('Profile')}
          >
            <Ionicons
              name="person-outline"
              size={23}
              color={COLORS.blue}
            />
          </TouchableOpacity>
        </View>

        {/* HERO */}
        <LinearGradient
          colors={['#102B49', '#123D67', '#17568C']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroCard}
        >
          <View style={styles.heroCircleLarge} />
          <View style={styles.heroCircleSmall} />

          <Text style={styles.heroTitle}>
            Facts deserve{'\n'}a closer look.
          </Text>

          <View style={styles.heroLabel}>
            <Ionicons
              name="shield-checkmark-outline"
              size={16}
              color="#DCEBFF"
            />

            <Text style={styles.heroLabelText}>
              VERIFY WITH EVIDENCE
            </Text>
          </View>

          <Text style={styles.heroDescription}>
            Capture a claim, inspect its sources and make a more informed
            decision.
          </Text>

          <View style={styles.stepsRow}>
            <View style={styles.step}>
              <View style={styles.stepIcon}>
                <Ionicons
                  name="camera-outline"
                  size={16}
                  color={COLORS.white}
                />
              </View>

              <Text style={styles.stepText}>Scan</Text>
            </View>

            <Ionicons
              name="chevron-forward"
              size={16}
              color="#8FB5DB"
            />

            <View style={styles.step}>
              <View style={styles.stepIcon}>
                <Ionicons
                  name="document-text-outline"
                  size={16}
                  color={COLORS.white}
                />
              </View>

              <Text style={styles.stepText}>Review</Text>
            </View>

            <Ionicons
              name="chevron-forward"
              size={16}
              color="#8FB5DB"
            />

            <View style={styles.step}>
              <View style={styles.stepIcon}>
                <Ionicons
                  name="search-outline"
                  size={16}
                  color={COLORS.white}
                />
              </View>

              <Text style={styles.stepText}>Evidence</Text>
            </View>
          </View>
        </LinearGradient>

        {/* RESUME WALKTHROUGH */}
        {canResumeWalkthrough && !studyContext ? (
          <TouchableOpacity
            accessibilityRole="button"
            style={[
              styles.actionCard,
              { marginTop: 14 },
            ]}
            onPress={() => void startWalkthrough()}
          >
            <View style={styles.actionIconBlue}>
              <Ionicons
                name="play-outline"
                size={23}
                color={COLORS.blue}
              />
            </View>

            <View style={styles.actionTextContainer}>
              <Text style={styles.actionTitle}>
                Resume Walkthrough
              </Text>

              <Text style={styles.actionSubtitle}>
                Continue your saved tutorial when you are ready
              </Text>
            </View>

            <Ionicons
              name="chevron-forward"
              size={21}
              color={COLORS.textMuted}
            />
          </TouchableOpacity>
        ) : null}

        {/* ASSIGNED STUDY TRIAL */}
        {studyContext ? (
          <TouchableOpacity
            activeOpacity={0.8}
            style={[
              styles.actionCard,
              { marginTop: 14 },
            ]}
            accessibilityRole="button"
            accessibilityLabel={`Continue assigned ${
              studyContext.condition === 'browser'
                ? 'browser'
                : 'FactTrace'
            } trial ${studyContext.trialIndex}`}
            onPress={continueAssignedTrial}
          >
            <View style={styles.actionIconBlue}>
              <Ionicons
                name="clipboard-outline"
                size={23}
                color={COLORS.blue}
              />
            </View>

            <View style={styles.actionTextContainer}>
              <Text style={styles.actionTitle}>
                Continue Assigned{' '}
                {studyContext.condition === 'browser'
                  ? 'Browser'
                  : 'FactTrace'}{' '}
                Trial
              </Text>

              <Text style={styles.actionSubtitle}>
                {studyContext.participantId}
                {' · '}
                {studyContext.isPractice
                  ? 'Practice'
                  : 'Study'}
                {' trial '}
                {studyContext.trialIndex}
              </Text>
            </View>

            <Ionicons
              name="chevron-forward"
              size={21}
              color={COLORS.textMuted}
            />
          </TouchableOpacity>
        ) : null}

        {/* SCAN BUTTON */}
        <View
          ref={scanButtonRef}
          collapsable={false}
        >
          <TouchableOpacity
            activeOpacity={0.88}
            style={styles.scanButtonWrapper}
            onPress={() => {
              if (
                walkthroughMode === 'spotlight' &&
                walkthroughStep === 'scan'
              ) {
                void showManualEntryStep();
                return;
              }

              if (walkthroughMode) {
                return;
              }

              navigation.navigate('Camera');
            }}
          >
            <LinearGradient
              colors={['#3478F6', '#2563EB']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.scanButton}
            >
              <View style={styles.scanIconContainer}>
                <Ionicons
                  name="scan-outline"
                  size={24}
                  color={COLORS.white}
                />
              </View>

              <View style={styles.scanTextContainer}>
                <Text style={styles.scanButtonTitle}>
                  Scan a Claim
                </Text>

                <Text style={styles.scanButtonSubtitle}>
                  Use your camera to capture text
                </Text>
              </View>

              <Ionicons
                name="arrow-forward"
                size={22}
                color={COLORS.white}
              />
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* SECONDARY ACTIONS */}
        <View style={styles.secondaryActions}>
          <View
            ref={manualEntryButtonRef}
            collapsable={false}
          >
            <TouchableOpacity
              activeOpacity={0.8}
              style={styles.actionCard}
              onPress={() => {
                if (
                  walkthroughMode === 'spotlight' &&
                  walkthroughStep === 'manual'
                ) {
                  void preparePracticeTransition();
                  return;
                }

                if (walkthroughMode) {
                  return;
                }

                navigation.navigate('ClaimReview', {
                  claimText: '',
                });
              }}
            >
              <View style={styles.actionIconBlue}>
                <Ionicons
                  name="create-outline"
                  size={23}
                  color={COLORS.blue}
                />
              </View>

              <View style={styles.actionTextContainer}>
                <Text style={styles.actionTitle}>
                  Enter Claim Manually
                </Text>

                <Text style={styles.actionSubtitle}>
                  Type or paste a claim instead
                </Text>
              </View>

              <Ionicons
                name="chevron-forward"
                size={21}
                color={COLORS.textMuted}
              />
            </TouchableOpacity>
          </View>

          <View ref={historyButtonRef} collapsable={false}>
            <TouchableOpacity
              activeOpacity={0.8}
              style={styles.actionCard}
              onPress={() => {
                if (
                  walkthroughMode === 'spotlight' &&
                  walkthroughStep === 'history'
                ) {
                  void openWalkthroughHistory();
                  return;
                }
                if (walkthroughMode) return;
                navigation.navigate('VerificationHistory');
              }}
            >
            <View style={styles.actionIconPurple}>
              <Ionicons
                name="time-outline"
                size={23}
                color="#7357D9"
              />
            </View>

            <View style={styles.actionTextContainer}>
              <Text style={styles.actionTitle}>
                Verification History
              </Text>

              <Text style={styles.actionSubtitle}>
                Review your previous checks
              </Text>
            </View>

            <Ionicons
              name="chevron-forward"
              size={21}
              color={COLORS.textMuted}
            />
            </TouchableOpacity>
          </View>

          <View ref={browserButtonRef} collapsable={false}>
            <TouchableOpacity
              activeOpacity={0.8}
              style={styles.actionCard}
              onPress={() => {
                if (
                  walkthroughMode === 'spotlight' &&
                  walkthroughStep === 'browser'
                ) {
                  void openWalkthroughBrowser();
                  return;
                }
                if (walkthroughMode) return;
                navigation.navigate('BrowserComparison');
              }}
            >
            <View style={styles.actionIconBlue}>
              <Ionicons
                name="search-outline"
                size={23}
                color={COLORS.blue}
              />
            </View>

            <View style={styles.actionTextContainer}>
              <Text style={styles.actionTitle}>
                Browser Comparison
              </Text>

              <Text style={styles.actionSubtitle}>
                Record a manual research task
              </Text>
            </View>

            <Ionicons
              name="chevron-forward"
              size={21}
              color={COLORS.textMuted}
            />
            </TouchableOpacity>
          </View>
        </View>

        {/* GUEST CARD */}
        <View style={styles.accountCard}>
          <View style={styles.accountIcon}>
            <Ionicons
              name="person-circle-outline"
              size={29}
              color={COLORS.blue}
            />
          </View>

          <View style={styles.accountTextContainer}>
            <Text style={styles.accountTitle}>
              {user
                ? 'Your Account'
                : 'Using FactTrace as a guest'}
            </Text>

            <Text style={styles.accountDescription}>
              {user
                ? `${user.displayName} · your profile and history are saved on this device.`
                : 'You can verify claims without an account. Create an account to save your history on this device.'}
            </Text>
          </View>

          <TouchableOpacity
            activeOpacity={0.8}
            style={styles.loginButton}
            onPress={() =>
              navigation.navigate(user ? 'Profile' : 'Login')
            }
          >
            <Text style={styles.loginButtonText}>
              {user ? 'Profile' : 'Log In'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* WHY FACTTRACE */}
        <View style={styles.whySection}>
          <Text style={styles.whyTitle}>
            Why FactTrace?
          </Text>

          <View style={styles.whyCardsRow}>
            <View style={styles.whyCard}>
              <View style={styles.whyIconBlue}>
                <Ionicons
                  name="link-outline"
                  size={20}
                  color={COLORS.blue}
                />
              </View>

              <Text style={styles.whyCardTitle}>
                Source-first
              </Text>

              <Text style={styles.whyCardText}>
                See where the evidence comes from.
              </Text>
            </View>

            <View style={styles.whyCard}>
              <View style={styles.whyIconOrange}>
                <Ionicons
                  name="analytics-outline"
                  size={20}
                  color="#D97706"
                />
              </View>

              <Text style={styles.whyCardTitle}>
                Transparent
              </Text>

              <Text style={styles.whyCardText}>
                Understand strong, weak, or unavailable matches.
              </Text>
            </View>

            <View style={styles.whyCard}>
              <View style={styles.whyIconGreen}>
                <Ionicons
                  name="person-outline"
                  size={20}
                  color="#16855A"
                />
              </View>

              <Text style={styles.whyCardTitle}>
                You decide
              </Text>

              <Text style={styles.whyCardText}>
                Evidence supports your final judgment.
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* INTERACTIVE WALKTHROUGH */}
      {walkthroughMode && !studyContext ? (
        <WalkthroughOverlay
          mode={walkthroughMode}
          step={walkthroughStep ?? undefined}
          targetRef={
            walkthroughMode === 'spotlight'
              ? walkthroughStep === 'scan'
                ? scanButtonRef
                : walkthroughStep === 'manual'
                  ? manualEntryButtonRef
                  : walkthroughStep === 'history'
                    ? historyButtonRef
                    : browserButtonRef
              : undefined
          }
          measurementVersion={measurementVersion}
          title={
            walkthroughMode === 'welcome'
              ? 'Welcome to FactTrace'
              : walkthroughMode === 'complete'
                ? 'Walkthrough Complete!'
                : walkthroughStep === 'scan'
                  ? 'Scan a Claim'
                  : walkthroughStep === 'manual'
                    ? 'Enter Claim Manually'
                    : walkthroughStep === 'history'
                      ? 'Verification History'
                      : 'Browser Comparison'
          }
          message={
            walkthroughMode === 'welcome'
              ? 'Take a short guided tour of checking a claim and reviewing evidence.'
              : walkthroughMode === 'complete'
                ? "You're ready to use FactTrace!"
                : walkthroughStep === 'scan'
                  ? 'You can scan a claim using your camera. FactTrace will extract the text so you can review it before checking.'
                  : walkthroughStep === 'manual'
                    ? "You can also type or paste a claim yourself. Let's try entering one together!"
                    : walkthroughStep === 'history'
                      ? 'Real completed checks can be reviewed here. The fictional walkthrough check will not appear in History.'
                      : 'Use Browser Comparison to manually research a claim and record your research activity for comparison with FactTrace.'
          }
          resume={canResumeWalkthrough}
          onStart={() => void startWalkthrough()}
          onContinue={
            walkthroughStep === 'scan'
              ? () => void showManualEntryStep()
              : undefined
          }
          onFinish={
            walkthroughMode === 'complete'
              ? () => void finishWalkthrough()
              : undefined
          }
          onSkip={() => void skipWalkthrough()}
        />
      ) : null}
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
    paddingHorizontal: 22,
    paddingBottom: 28,
    backgroundColor: '#F5F8FC',
  },

  /* HEADER */

  header: {
    marginTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  logo: {
    color: COLORS.textPrimary,
    fontSize: 27,
    fontWeight: '800',
    letterSpacing: -0.6,
  },

  tagline: {
    marginTop: 3,
    color: COLORS.textSecondary,
    fontSize: 13,
  },

  profileButton: {
    width: 45,
    height: 45,
    borderRadius: 15,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#1B3655',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: {
      width: 0,
      height: 5,
    },
    elevation: 3,
  },

  /* HERO */

  heroCard: {
    marginTop: 18,
    minHeight: 205,
    borderRadius: 24,
    padding: 18,
    overflow: 'hidden',

    shadowColor: '#0B2542',
    shadowOpacity: 0.22,
    shadowRadius: 18,
    shadowOffset: {
      width: 0,
      height: 8,
    },

    elevation: 8,
  },

  heroCircleLarge: {
    position: 'absolute',
    width: 175,
    height: 175,
    borderRadius: 88,
    borderWidth: 28,
    borderColor: 'rgba(255,255,255,0.035)',
    right: -60,
    top: -48,
  },

  heroCircleSmall: {
    position: 'absolute',
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(255,255,255,0.025)',
    right: 18,
    bottom: -35,
  },

  heroTitle: {
    color: COLORS.white,
    fontSize: 32,
    lineHeight: 36,
    fontWeight: '800',
    letterSpacing: -0.7,
  },

  heroLabel: {
    alignSelf: 'flex-start',
    marginTop: 9,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },

  heroLabelText: {
    color: '#DCEBFF',
    marginLeft: 6,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.7,
  },

  heroDescription: {
    marginTop: 8,
    maxWidth: '92%',
    color: '#CBD9E8',
    fontSize: 14,
    lineHeight: 19,
  },

  stepsRow: {
    marginTop: 11,
    flexDirection: 'row',
    alignItems: 'center',
  },

  step: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  stepIcon: {
    width: 27,
    height: 27,
    borderRadius: 9,
    backgroundColor: 'rgba(255,255,255,0.11)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  stepText: {
    marginLeft: 5,
    marginRight: 7,
    color: '#DCE8F4',
    fontSize: 12,
    fontWeight: '600',
  },

  /* MAIN CTA */

  scanButtonWrapper: {
    marginTop: 13,
    shadowColor: COLORS.blue,
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: {
      width: 0,
      height: 6,
    },
    elevation: 6,
  },

  scanButton: {
    minHeight: 64,
    borderRadius: 18,
    paddingHorizontal: 15,
    flexDirection: 'row',
    alignItems: 'center',
  },

  scanIconContainer: {
    width: 41,
    height: 41,
    borderRadius: 13,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  scanTextContainer: {
    flex: 1,
    marginLeft: 12,
  },

  scanButtonTitle: {
    color: COLORS.white,
    fontSize: 17,
    fontWeight: '700',
  },

  scanButtonSubtitle: {
    marginTop: 2,
    color: '#DCE8FF',
    fontSize: 12,
  },

  /* SECONDARY */

  secondaryActions: {
    marginTop: 9,
    gap: 7,
  },

  actionCard: {
    minHeight: 56,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E3EAF2',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 13,
  },

  actionIconBlue: {
    width: 37,
    height: 37,
    borderRadius: 12,
    backgroundColor: '#EDF4FF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  actionIconPurple: {
    width: 37,
    height: 37,
    borderRadius: 12,
    backgroundColor: '#F2EEFF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  actionTextContainer: {
    flex: 1,
    marginLeft: 11,
  },

  actionTitle: {
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: '700',
  },

  actionSubtitle: {
    marginTop: 1,
    color: COLORS.textSecondary,
    fontSize: 11.5,
  },

  /* ACCOUNT */

  accountCard: {
    marginTop: 9,
    borderRadius: 16,
    backgroundColor: '#EEF4FB',
    paddingHorizontal: 13,
    paddingVertical: 9,
    flexDirection: 'row',
    alignItems: 'center',
  },

  accountIcon: {
    width: 38,
    height: 38,
    borderRadius: 13,
    backgroundColor: '#E2ECFA',
    alignItems: 'center',
    justifyContent: 'center',
  },

  accountTextContainer: {
    flex: 1,
    marginHorizontal: 9,
  },

  accountTitle: {
    color: COLORS.textPrimary,
    fontSize: 13,
    fontWeight: '700',
  },

  accountDescription: {
    marginTop: 1,
    color: COLORS.textSecondary,
    fontSize: 10.5,
    lineHeight: 13,
  },

  loginButton: {
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 9,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: '#D7E2F0',
  },

  loginButtonText: {
    color: COLORS.blue,
    fontSize: 12,
    fontWeight: '700',
  },

  /* WHY FACTTRACE */

  whySection: {
    marginTop: 8,
  },

  whyTitle: {
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 6,
  },

  whyCardsRow: {
    flexDirection: 'row',
    gap: 7,
  },

  whyCard: {
    flex: 1,
    minHeight: 88,
    backgroundColor: COLORS.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E3EAF2',
    paddingHorizontal: 9,
    paddingVertical: 8,
  },

  whyIconBlue: {
    width: 28,
    height: 28,
    borderRadius: 9,
    backgroundColor: '#EDF4FF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  whyIconOrange: {
    width: 28,
    height: 28,
    borderRadius: 9,
    backgroundColor: '#FFF3E6',
    alignItems: 'center',
    justifyContent: 'center',
  },

  whyIconGreen: {
    width: 28,
    height: 28,
    borderRadius: 9,
    backgroundColor: '#EAF8F2',
    alignItems: 'center',
    justifyContent: 'center',
  },

  whyCardTitle: {
    marginTop: 5,
    color: COLORS.textPrimary,
    fontSize: 11.5,
    fontWeight: '700',
  },

  whyCardText: {
    marginTop: 2,
    color: COLORS.textSecondary,
    fontSize: 9.5,
    lineHeight: 12,
  },
});
