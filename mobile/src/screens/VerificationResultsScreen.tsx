import { useIsFocused } from '@react-navigation/native';
import { useNormalDecision } from '../services/normalHardware';

import React, { useEffect, useRef, useState, useMemo } from 'react';
import {
  Linking,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
  type ScrollViewInstance,
  type ViewInstance,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { RootStackParamList } from '../navigation/types';
import WalkthroughOverlay from '../components/WalkthroughOverlay';
import {
  getWalkthroughState,
  saveWalkthroughState,
  type WalkthroughStep,
} from '../services/walkthroughService';
import { APP_VERSION, ThemeColors } from '../constants/app';
import { useAppTheme } from '../theme/AppTheme';
import { MatchStatus } from '../types/verification';
import { useAuth } from '../hooks/useAuth';
import { saveVerificationHistory } from '../services/historyService';
import DeviceDecisionPanel from '../components/DeviceDecisionPanel';
import SharingIntentionModal, {
  SharingIntention,
} from '../components/SharingIntentionModal';
import {
  getEvaluationRecordByLocalTrialKey,
  retryEvaluationSubmission,
  saveEvaluationDecision,
} from '../services/evaluationService';
import {
  getOpenedEvidenceSourceIds,
  recordEvidenceSourceOpened,
} from '../services/evidenceTrackingService';

type Props = NativeStackScreenProps<
  RootStackParamList,
  'VerificationResults'
>;

type Decision = 'trust' | 'dont-trust' | 'unsure' | null;

type MatchTheme = {
  label: string;
  title: string;
  description: string;
  icon: 'ellipse' | 'contrast' | 'ellipse-outline';
  dotColor: string;
  badgeBackground: string;
  badgeBorder: string;
  badgeText: string;
};

//match states use one neutral blue, like the device light (blue for match results, never green or red),
//and differ by shape and label, so colour never carries the meaning alone (WCAG 1.4.1);
//the shapes follow the light patterns: filled = steady (strong), half = slow blink (possible), ring = double blink (none)
function getMatchTheme(status: MatchStatus): MatchTheme {
  const neutral = {
    dotColor: '#9CCBFF',
    badgeBackground: 'rgba(156, 203, 255, 0.14)',
    badgeBorder: 'rgba(156, 203, 255, 0.32)',
    badgeText: '#DCEBFF',
  };

  switch (status) {
    case 'strong_match':
      return {
        label: 'STRONG MATCH',
        icon: 'ellipse',
        title: 'Relevant evidence found',
        description:
          'FactTrace found a closely matching claim and relevant evidence for you to review.',
        ...neutral,
      };

    case 'weak_match':
      return {
        label: 'POSSIBLE MATCH',
        icon: 'contrast',
        title: 'Possible evidence found',
        description:
          'FactTrace found evidence that may be related to your claim. Check that it is the claim you saw, and review the sources carefully.',
        ...neutral,
      };

    case 'no_match':
      return {
        label: 'NO MATCH',
        icon: 'ellipse-outline',
        title: 'No close match found',
        description:
          'FactTrace could not find a closely matching claim. Try changing the wording or scanning another claim.',
        ...neutral,
      };
  }
}

//"2024-03-05T00:00:00Z" → "5 Mar 2024"; anything unreadable is shown as sent
function formatFactCheckDate(value: string): string {
  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
}

export default function VerificationResultsScreen({
  navigation,
  route,
}: Props) {
  const { colors: COLORS, isDark } = useAppTheme();
  const styles = useMemo(() => createStyles(COLORS, isDark), [COLORS, isDark]);
  const isWalkthrough =
    Boolean(route.params.walkthrough) &&
    !route.params.studyContext;

  const { result } = route.params;
  const authenticatedUser = useAuth();

  const [decision, setDecision] = useState<Decision>(null);
  const [isSharingModalVisible, setIsSharingModalVisible] =
    useState(false);
  const [isSubmittingEvaluation, setIsSubmittingEvaluation] =
    useState(false);
  const [evaluationComplete, setEvaluationComplete] =
    useState(false);
  const [evaluationStatus, setEvaluationStatus] =
    useState<string | null>(null);
  const [localTrialNumber, setLocalTrialNumber] =
    useState<number | null>(null);
  const [sharingIntention, setSharingIntention] =
    useState<SharingIntention | null>(null);
  const [retryRecordId, setRetryRecordId] =
    useState<string | null>(null);
  //researcher fallback when the device fails: show the on-screen buttons for this trial
  const [useScreenButtons, setUseScreenButtons] =
    useState(false);

  const evaluationSubmissionAttempted = useRef(false);
  // The trial ends when the verdict is tapped, as in the browser condition,
  // so the time to answer the sharing question is not counted in either condition.
  const verdictSelectedAt = useRef<string | null>(null);
  //study trials: the sources opened when the device press was seen, so sources opened during
  //the 5 s undo window are not counted (source use = distinct sources opened before the decision)
  const sourcesAtDecision = useRef<Promise<string[]> | null>(null);
  const evaluation = route.params.evaluation;
  const studyContext = route.params.studyContext;
  const hasEvaluation = Boolean(evaluation) && !isWalkthrough;
  //study trials take the decision from the device buttons, the same input as the browser condition
  const useDevice =
    Boolean(studyContext) && hasEvaluation && !useScreenButtons;

  const [tourStep, setTourStep] =
    useState<WalkthroughStep>('result_match');
  const [tourVersion, setTourVersion] = useState(0);

  const headerRef = useRef<ViewInstance>(null);
  const tourScrollRef = useRef<ScrollViewInstance>(null);
  const matchTargetRef = useRef<ViewInstance>(null);
  const evidenceTargetRef = useRef<ViewInstance>(null);
  const decisionTargetRef = useRef<ViewInstance>(null);
  const tourScrollOffset = useRef(0);
  const lastTourMeasurementAt = useRef(0);
  const { height: tourWindowHeight } = useWindowDimensions();

  // A locally generated history entry identifies this verification.
  // Study metadata is used when available.
  const localTrialKey = isWalkthrough
    ? undefined
    : studyContext
      ? `app:${studyContext.participantId}:${
          studyContext.sessionId ?? 'session-not-supplied'
        }:${
          studyContext.trialId ??
          route.params.historyEntryId ??
          studyContext.trialIndex
        }:${studyContext.startedAt ?? evaluation?.startedAt ?? ''}`
      : route.params.historyEntryId
        ? `app:standalone:${route.params.historyEntryId}`
        : undefined;

  // This key is shared with EvidenceDetails and stays stable for this screen.
  const evidenceTrackingKey = useRef<string | undefined>(
    hasEvaluation
      ? localTrialKey ??
          `app:evidence:${
            route.params.historyEntryId ??
            evaluation?.startedAt ??
            `${Date.now()}-${Math.random()}`
          }`
      : undefined,
  ).current;

  const attemptedHistoryEntryIds = useRef(new Set<string>());
  const historyEntryId = isWalkthrough
    ? undefined
    : route.params.historyEntryId;

  useEffect(() => {
    if (
      !historyEntryId ||
      attemptedHistoryEntryIds.current.has(historyEntryId)
    ) {
      return;
    }

    if (!authenticatedUser) return;

    // Study trials are never added to an account's history: the study phone is shared, so a
    // logged-in account would collect every participant's checks and the next participant could see them.
    if (studyContext) return;

    attemptedHistoryEntryIds.current.add(historyEntryId);

    void saveVerificationHistory(
      authenticatedUser,
      historyEntryId,
      result,
    ).catch(error => {
      console.warn('Could not save verification history.', error);
    });
  }, [authenticatedUser, historyEntryId, result, studyContext]);

  // All walkthrough steps stay inside local AsyncStorage. No real evidence,
  // evaluation, history, or backend submission uses this route.
  const updateTourStep = async (
    nextStep: WalkthroughStep,
  ) => {
    try {
      await saveWalkthroughState({
        status: 'in_progress',
        step: nextStep,
      });
      setTourStep(nextStep);
    } catch (error) {
      console.warn(
        'Could not save tutorial progress.',
        error,
      );
      setEvaluationStatus(
        'Could not save tutorial progress. Please try again.',
      );
    }
  };

  const skipTour = async () => {
    try {
      await saveWalkthroughState({ status: 'skipped' });
      setIsSharingModalVisible(false);
      navigation.reset({
        index: 0,
        routes: [{ name: 'Home' }],
      });
    } catch (error) {
      setEvaluationStatus(
        'Could not skip walkthrough. Please try again.',
      );
    }
  };

  const finishTour = async () => {
    try {
      await saveWalkthroughState({ status: 'completed' });
      navigation.reset({
        index: 0,
        routes: [{ name: 'Home' }],
      });
    } catch (error) {
      setEvaluationStatus(
        'Could not finish walkthrough. Please try again.',
      );
    }
  };

  const revealTourTarget = (
    target: { current: ViewInstance | null },
  ) => {
    requestAnimationFrame(() => {
      headerRef.current?.measureInWindow((_hx, hy, _hw, hh) => {
        target.current?.measureInWindow(
          (_x, y, _width, height) => {
            const safeBottom = tourWindowHeight - 145;
            const overflow = y + height - safeBottom;

            const safeTop = hy + hh + 8;
            if (y < safeTop) {
              tourScrollRef.current?.scrollTo({
                y: Math.max(0, tourScrollOffset.current + y - safeTop),
                animated: true,
              });
            } else if (overflow > 0) {
              tourScrollRef.current?.scrollTo({
                y: tourScrollOffset.current + overflow,
                animated: true,
              });
            }
            setTourVersion(v => v + 1);
          },
        );
      });
    });
  };

  const activeTourTarget =
    tourStep === 'result_match'
      ? matchTargetRef
      : tourStep === 'result_source'
        ? evidenceTargetRef
        : tourStep === 'result_decision'
          ? decisionTargetRef
          : null;

  useEffect(() => {
    if (!isWalkthrough) return;

    let active = true;

    void getWalkthroughState()
      .then(state => {
        if (!active) return;

        const savedStep =
          state?.status === 'in_progress'
            ? state.step
            : undefined;

        // Returning by a hardware gesture, or reopening the tutorial, should
        // never imply that a fictional source was actually inspected.
        const nextStep: WalkthroughStep =
          savedStep === 'result_source'
            ? 'result_source'
            : savedStep === 'result_decision'
              ? 'result_decision'
              : savedStep === 'result_sharing'
                ? 'result_decision'
                : savedStep === 'complete'
                  ? 'complete'
                  : savedStep === 'evidence_details' ||
                      savedStep === 'evidence_return'
                    ? 'result_source'
                    : 'result_match';

        setTourStep(nextStep);

        if (nextStep !== savedStep) {
          void saveWalkthroughState({
            status: 'in_progress',
            step: nextStep,
          });
        }
      })
      .catch(error => {
        console.warn(
          'Could not restore tutorial.',
          error,
        );
      });

    return () => {
      active = false;
    };
  }, [isWalkthrough]);

  // Refresh the guided result state after returning from Evidence Details.
  useEffect(() => {
    if (!isWalkthrough) return;
    if (activeTourTarget) revealTourTarget(activeTourTarget);
  }, [isWalkthrough, tourStep, tourWindowHeight]);

  useEffect(() => {
    if (!isWalkthrough) return;

    const unsubscribe = navigation.addListener('focus', () => {
      void getWalkthroughState()
        .then(state => {
          if (state?.status !== 'in_progress') return;

          if (state.step === 'result_decision') {
            setTourStep('result_decision');
          } else if (
            state.step === 'evidence_details' ||
            state.step === 'evidence_return'
          ) {
            // Native back before completing the lesson: offer source again.
            setTourStep('result_source');
            void saveWalkthroughState({
              status: 'in_progress',
              step: 'result_source',
            }).catch(error => {
              console.warn(
                'Could not restore practice source progress.',
                error,
              );
            });
          }
        })
        .catch(error => {
          console.warn(
            'Could not restore walkthrough progress on focus.',
            error,
          );
        });
    });

    return unsubscribe;
  }, [isWalkthrough, navigation]);

  const matchTheme = getMatchTheme(result.matchStatus);
  const hasEvidence = result.evidence.length > 0;
  const matchScore =
    result.matchScore !== undefined
      ? `${Math.round(result.matchScore)}%`
      : '—';

  const handleOpenSource = async (sourceId: string) => {
    if (
      isWalkthrough &&
      tourStep !== 'result_source'
    ) {
      return;
    }

    const source = result.evidence.find(
      evidence => evidence.id === sourceId,
    );

    if (!source) return;

    // Record only the source whose details the participant opens.
    if (!isWalkthrough && evidenceTrackingKey) {
      recordEvidenceSourceOpened(
        evidenceTrackingKey,
        source.sourceId ?? source.id,
      );
    }

    if (isWalkthrough) {
      try {
        await saveWalkthroughState({
          status: 'in_progress',
          step: 'evidence_details',
        });
        setTourStep('evidence_details');
      } catch (error) {
        console.warn(
          'Could not save practice source progress.',
          error,
        );
        setEvaluationStatus(
          'Could not save tutorial progress. Please try again.',
        );
        return;
      }
    }

    navigation.navigate('EvidenceDetails', {
      result,
      sourceId,
      ...(isWalkthrough ? { walkthrough: true } : {}),
      ...(studyContext ? { studyContext } : {}),
      ...(evidenceTrackingKey
        ? { evidenceTrackingKey }
        : {}),
    });
  };

  //opens the fact-check article and counts it as an opened source, like opening an evidence source
  const openFactCheck = async () => {
    const url = result.factCheck?.url;

    if (!url || isWalkthrough) return;

    if (evidenceTrackingKey) {
      recordEvidenceSourceOpened(
        evidenceTrackingKey,
        `factcheck:${url}`,
      );
    }

    try {
      await Linking.openURL(url);
    } catch (error) {
      console.warn('Could not open the fact-check link.', error);
    }
  };

  const handleViewFullEvidence = () => {
    if (isWalkthrough) return;

    // Merely seeing the full list doesn't mean every source was opened.
    navigation.navigate('EvidenceDetails', {
      result,
      ...(studyContext ? { studyContext } : {}),
      ...(evidenceTrackingKey
        ? { evidenceTrackingKey }
        : {}),
    });
  };

  //decidedAt: when the device press was seen (study trials), otherwise now
  const handleDecision = async (
    value: Exclude<Decision, null>,
    decidedAt?: string,
  ) => {
    if (isWalkthrough) {
      if (
        tourStep !== 'result_decision' ||
        decision
      ) {
        return;
      }

      try {
        await saveWalkthroughState({
          status: 'in_progress',
          step: 'result_sharing',
        });
        setDecision(value);
        setTourStep('result_sharing');
        setIsSharingModalVisible(true);
      } catch (error) {
        console.warn(
          'Could not save walkthrough decision progress.',
          error,
        );
        setEvaluationStatus(
          'Could not save tutorial progress. Please try again.',
        );
      }
      return;
    }

    if (
      decision ||
      !hasEvaluation ||
      isSubmittingEvaluation ||
      retryRecordId
    ) {
      return;
    }

    verdictSelectedAt.current = decidedAt ?? new Date().toISOString();
    setDecision(value);
    setIsSharingModalVisible(true);
  };

  const resultFocused = useIsFocused();
  // Keep the hardware active while the user opens evidence details from this result.
  const stack = navigation.getState();
  const evidenceOpen = stack.routes[stack.index]?.name === 'EvidenceDetails' && stack.routes[stack.index - 1]?.key === route.key;
  const normalMode = !studyContext && hasEvaluation && !isWalkthrough;
  const normalHardware = useNormalDecision(
    normalMode && !evaluationComplete && (resultFocused || evidenceOpen),
    result.matchStatus,
    (value, decidedAt) => void handleDecision(value === 'dont_trust' ? 'dont-trust' : value, decidedAt),
  );
  const chooseScreenDecision = (value: Exclude<Decision, null>) => {
    if (normalMode) void normalHardware.choose(value === 'dont-trust' ? 'dont_trust' : value);
    else void handleDecision(value);
  };
  const normalDecisionBusy = normalMode && (normalHardware.connecting || normalHardware.busy || Boolean(normalHardware.pending));

  const handleSharingIntention = async (
    intention: SharingIntention,
  ) => {
    if (isWalkthrough) {
      setSharingIntention(intention);
      setIsSharingModalVisible(false);
      try {
        await saveWalkthroughState({
          status: 'in_progress',
          step: 'history',
        });
        navigation.reset({
          index: 0,
          routes: [
            {
              name: 'Home',
              params: { walkthroughContinue: true },
            },
          ],
        });
      } catch (error) {
        console.warn(
          'Could not continue to walkthrough History.',
          error,
        );
        setEvaluationStatus(
          'Could not save tutorial progress. Please try again.',
        );
      }
      return;
    }

    if (
      evaluationSubmissionAttempted.current ||
      !decision ||
      !evaluation ||
      isSubmittingEvaluation
    ) {
      return;
    }

    evaluationSubmissionAttempted.current = true;
    setSharingIntention(intention);
    setIsSubmittingEvaluation(true);

    try {
      const response = await saveEvaluationDecision(
        {
          condition: 'app',
          claimId:
            studyContext?.claimId ??
            result.claimId ??
            null,
          claimText: result.originalClaim,
          originalOcrText: evaluation.originalOcrText,
          inputSource: evaluation.inputSource,
          matchStatus: result.matchStatus,
          matchScore: result.matchScore,
          weakReason: result.weakReason ?? null,
          ocrEngine: evaluation.ocrEngine ?? null,
          ocrError: evaluation.ocrError ?? null,
          ocrConfidence: evaluation.ocrConfidence ?? null,
          ocrRetakes: evaluation.ocrRetakes ?? null,
          factCheckFound:
            result.matchStatus === 'no_match'
              ? result.factCheck?.found ?? null
              : null,
          appVersion: APP_VERSION,
          decision:
            decision === 'dont-trust'
              ? 'dont_trust'
              : decision,
          sharingIntention: intention,

          // Backend expects evidence source IDs for FactTrace trials.
          sourcesOpened: sourcesAtDecision.current
            ? await sourcesAtDecision.current
            : evidenceTrackingKey
              ? await getOpenedEvidenceSourceIds(
                  evidenceTrackingKey,
                )
              : [],

          startedAt: evaluation.startedAt,
          endedAt:
            verdictSelectedAt.current ??
            new Date().toISOString(),

          ...(studyContext
            ? {
                trialIndex: studyContext.trialIndex,
                isPractice: studyContext.isPractice,
                claimFamiliarity:
                  studyContext.claimFamiliarity ?? null,
              }
            : {}),
        },
        studyContext?.participantId,
        { ...(localTrialKey ? { localTrialKey } : {}), standalone: !studyContext },
      );

      setEvaluationStatus(response.message);
      setLocalTrialNumber(
        response.localTrialNumber ?? null,
      );
      setIsSharingModalVisible(false);

      if (
        response.serverStatus === 'submitted' ||
        (!studyContext &&
          response.serverStatus === 'not_submitted')
      ) {
        setEvaluationComplete(true);
        setRetryRecordId(null);
      } else {
        setRetryRecordId(response.recordId);
      }
    } catch (error) {
      const existing = localTrialKey
        ? await getEvaluationRecordByLocalTrialKey(
            localTrialKey,
          ).catch(() => undefined)
        : undefined;

      if (existing) {
        setRetryRecordId(existing.recordId);
        setEvaluationStatus(
          'Your original decision was saved locally. Retry the saved submission.',
        );
      } else {
        evaluationSubmissionAttempted.current = false;
        setDecision(null);
        setSharingIntention(null);
        setEvaluationStatus(
          error instanceof Error
            ? `Could not save this decision: ${error.message}`
            : 'Could not save this decision. Please try again.',
        );
      }
    } finally {
      setIsSubmittingEvaluation(false);
      setIsSharingModalVisible(false);
    }
  };

  const handleRetryEvaluation = async () => {
    if (
      !retryRecordId ||
      isSubmittingEvaluation
    ) {
      return;
    }

    setIsSubmittingEvaluation(true);

    try {
      const response =
        await retryEvaluationSubmission(retryRecordId);

      setEvaluationStatus(response.message);
      setLocalTrialNumber(
        response.localTrialNumber ?? null,
      );

      if (response.serverStatus === 'submitted') {
        setEvaluationComplete(true);
        setRetryRecordId(null);
      }
    } catch (error) {
      setEvaluationStatus(
        error instanceof Error
          ? `Could not retry the saved decision: ${error.message}`
          : 'Could not retry the saved decision. Please try again.',
      );
    } finally {
      setIsSubmittingEvaluation(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style={isDark ? 'light' : 'dark'} />

      {/* Persistent navigation, outside the scrolling content. */}
      <View ref={headerRef} collapsable={false} style={styles.header}>
        <TouchableOpacity
          activeOpacity={0.8}
          style={styles.backButton}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={() => navigation.goBack()}
        >
          <Ionicons
            name="arrow-back"
            size={23}
            color={COLORS.textPrimary}
          />
        </TouchableOpacity>

        <View style={styles.headerTextArea}>
          <Text style={styles.headerTitle}>
            Evidence Results
          </Text>
          <Text style={styles.headerSubtitle}>
            Review the match and supporting sources
          </Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        ref={tourScrollRef}
        scrollEventThrottle={16}
        onScroll={event => {
          if (isWalkthrough) {
            tourScrollOffset.current =
              event.nativeEvent.contentOffset.y;
            const now = Date.now();
            if (now - lastTourMeasurementAt.current >= 50) {
              lastTourMeasurementAt.current = now;
              setTourVersion(v => v + 1);
            }
          }
        }}
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* PROGRESS */}
        <View style={styles.progressRow}>
          <View style={styles.progressItem}>
            <View style={styles.progressComplete}>
              <Ionicons
                name="checkmark"
                size={15}
                color={COLORS.white}
              />
            </View>
            <Text style={styles.progressCompleteText}>
              Capture
            </Text>
          </View>

          <View style={styles.progressLineActive} />

          <View style={styles.progressItem}>
            <View style={styles.progressComplete}>
              <Ionicons
                name="checkmark"
                size={15}
                color={COLORS.white}
              />
            </View>
            <Text style={styles.progressCompleteText}>
              Review
            </Text>
          </View>

          <View style={styles.progressLineActive} />

          <View style={styles.progressItem}>
            <View style={styles.progressCurrent}>
              <Text style={styles.progressCurrentNumber}>
                3
              </Text>
            </View>
            <Text style={styles.progressCurrentText}>
              Evidence
            </Text>
          </View>
        </View>

        {/* YOUR CLAIM */}
        <View style={styles.claimCard}>
          <View style={styles.claimTop}>
            <View style={styles.claimIcon}>
              <Ionicons
                name="document-text-outline"
                size={21}
                color={COLORS.blue}
              />
            </View>
            <Text style={styles.claimLabel}>
              YOUR CLAIM
            </Text>
          </View>
          <Text style={styles.claimText}>
            “{result.originalClaim}”
          </Text>
        </View>

        {/* MATCH */}
        <View
          ref={matchTargetRef}
          collapsable={false}
          onLayout={() => {
            if (isWalkthrough) {
              setTourVersion(v => v + 1);
            }
          }}
        >
          <LinearGradient
            colors={['#102B49', '#123D67', '#17568C']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.matchCard}
          >
            <View style={styles.matchCircleOne} />
            <View style={styles.matchCircleTwo} />

            <View style={styles.matchTopRow}>
              <View
                style={[
                  styles.matchBadge,
                  {
                    backgroundColor:
                      matchTheme.badgeBackground,
                    borderColor:
                      matchTheme.badgeBorder,
                  },
                ]}
              >
                <Ionicons
                  name={matchTheme.icon}
                  size={12}
                  color={matchTheme.dotColor}
                  style={styles.matchDot}
                />
                <Text
                  style={[
                    styles.matchBadgeText,
                    { color: matchTheme.badgeText },
                  ]}
                >
                  {matchTheme.label}
                </Text>
              </View>

              <View
                style={styles.matchScore}
                accessible
                accessibilityLabel={
                    result.matchScore === undefined
                      ? 'Claim wording match unavailable'
                      : `${matchScore} claim wording match, not a truth rating`
                  }
              >
                <Text style={styles.matchScoreNumber}>
                  {matchScore}
                </Text>
                <Text style={styles.matchScoreLabel}>
                  Claim wording match
                </Text>
              </View>
            </View>

            <Text style={styles.matchTitle}>
              {matchTheme.title}
            </Text>
            <Text style={styles.matchDescription}>
              {result.explanation ||
                matchTheme.description}
            </Text>

            {result.matchScore !== undefined && (
              <Text style={styles.matchScoreNote}>
                Measures wording similarity to a claim in the dataset, not whether the claim is true.
              </Text>
            )}

            {result.matchedClaim && (
              <View style={styles.matchedClaimBox}>
                <Text style={styles.matchedClaimLabel}>
                  MATCHED CLAIM
                </Text>
                <Text style={styles.matchedClaimText}>
                  {result.matchedClaim}
                </Text>
              </View>
            )}
          </LinearGradient>
        </View>

        {/* DATASET NOTICE: required by Dr. Göktaş; a database match is not independent verification */}
        {result.datasetNotice ? (
          <View
            style={styles.noticeBox}
            accessible
            accessibilityLabel={result.datasetNotice}
          >
            <Ionicons
              name="information-circle-outline"
              size={20}
              color={COLORS.blue}
            />
            <Text style={styles.noticeText}>
              {result.datasetNotice}
            </Text>
          </View>
        ) : null}

        {/* FACT CHECK: only on a no match, when Google Fact Check found a published review */}
        {result.matchStatus === 'no_match' &&
        result.factCheck?.found &&
        result.factCheck.url ? (
          <View style={styles.factCheckCard}>
            <Text style={styles.factCheckLabel}>
              PUBLISHED FACT-CHECK FOUND
            </Text>
            <Text style={styles.factCheckPublisher}>
              {result.factCheck.publisher ?? 'A fact-checking organisation'}
              {result.factCheck.reviewDate
                ? ` • ${formatFactCheckDate(result.factCheck.reviewDate)}`
                : ''}
            </Text>
            {/* the rating is the fact-checker's verdict, so study trials show the source only, like every evidence card */}
            {!studyContext && result.factCheck.rating ? (
              <Text style={styles.factCheckRating}>
                Rating given by {result.factCheck.publisher ?? 'the fact-checker'}: “{result.factCheck.rating}”
              </Text>
            ) : null}
            <Text style={styles.factCheckNote}>
              Found by Google Fact Check search, outside FactTrace’s curated dataset.
            </Text>
            <TouchableOpacity
              accessibilityRole="link"
              accessibilityLabel={`Open the fact-check by ${result.factCheck.publisher ?? 'the fact-checker'}`}
              style={styles.factCheckButton}
              onPress={() => void openFactCheck()}
            >
              <Ionicons
                name="open-outline"
                size={18}
                color={COLORS.white}
              />
              <Text style={styles.factCheckButtonText}>
                Open fact-check
              </Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {/* EVIDENCE HEADER */}
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>
              Evidence
            </Text>
            <Text style={styles.sectionSubtitle}>
              {hasEvidence
                ? 'Sources related to this matched claim'
                : 'No evidence sources available'}
            </Text>
          </View>

          <View style={styles.sourceCount}>
            <Text style={styles.sourceCountText}>
              {result.evidence.length}{' '}
              {result.evidence.length === 1
                ? 'source'
                : 'sources'}
            </Text>
          </View>
        </View>

        {/* EVIDENCE CARDS */}
        {hasEvidence ? (
          result.evidence.map((source, index) => (
            <View
              key={source.id}
              ref={
                index === 0
                  ? evidenceTargetRef
                  : undefined
              }
              collapsable={false}
              onLayout={() => {
                if (
                  isWalkthrough &&
                  index === 0
                ) {
                  setTourVersion(v => v + 1);
                }
              }}
            >
              <TouchableOpacity
                activeOpacity={0.82}
                style={styles.evidenceCard}
                onPress={() =>
                  handleOpenSource(source.id)
                }
              >
                <View style={styles.evidenceTop}>
                  <View
                    style={
                      index === 0
                        ? styles.sourceIconBlue
                        : styles.sourceIconPurple
                    }
                  >
                    <Ionicons
                      name={
                        index === 0
                          ? 'newspaper-outline'
                          : 'library-outline'
                      }
                      size={22}
                      color={
                        index === 0
                          ? COLORS.blue
                          : '#7357D9'
                      }
                    />
                  </View>

                  <View style={styles.sourceInfo}>
                    <Text style={styles.sourceName}>
                      {source.sourceName}
                    </Text>
                    <Text style={styles.sourceMeta}>
                      {source.organization ||
                        'Published source'}
                      {source.publicationDate
                        ? ` • ${source.publicationDate}`
                        : ''}
                    </Text>
                  </View>

                  <Ionicons
                    name="chevron-forward"
                    size={21}
                    color={COLORS.textMuted}
                  />
                </View>

                <Text style={styles.evidenceTitle}>
                  {source.title}
                </Text>
                <Text
                  style={styles.evidencePreview}
                  numberOfLines={3}
                >
                  {source.summary}
                </Text>

                <View style={styles.evidenceFooter}>
                  <View style={styles.provenanceChip}>
                    <Ionicons
                      name="link-outline"
                      size={14}
                      color={COLORS.blue}
                    />
                    <Text style={styles.provenanceText}>
                      Source details available
                    </Text>
                  </View>
                  <Text style={styles.readMore}>
                    View source
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          ))
        ) : (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIcon}>
              <Ionicons
                name="search-outline"
                size={25}
                color={COLORS.blue}
              />
            </View>
            <Text style={styles.emptyTitle}>
              No evidence found
            </Text>
            <Text style={styles.emptyText}>
              Try changing the wording of the claim
              or scan a different statement.
            </Text>
          </View>
        )}

        {/* DECISION */}
        {(hasEvaluation || isWalkthrough) && (
          <View
            ref={decisionTargetRef}
            collapsable={false}
            style={styles.decisionSection}
            onLayout={() => {
              if (isWalkthrough) {
                setTourVersion(v => v + 1);
              }
            }}
          >
            <View style={styles.decisionHeader}>
              <Text style={styles.decisionTitle}>
                What do you think?
              </Text>
              <Text style={styles.decisionSubtitle}>
                {hasEvidence
                  ? 'Based on the evidence you reviewed, record your decision.'
                  : 'Record your decision based on the information available.'}
              </Text>
            </View>

            {normalMode && !decision && (
              <View style={{ gap: 8, marginBottom: 12 }}>
                <Text style={styles.decisionSubtitle}>
                  {normalHardware.connecting ? 'Connecting to the device…' : normalHardware.connected
                    ? 'Use Trust, Unsure or Don’t Trust on the device or on this screen.'
                    : 'Device unavailable. Use the on-screen buttons.'}
                </Text>
                {normalHardware.pending && (
                  <>
                    <Text style={styles.decisionSubtitle}>
                      You chose {normalHardware.pending === 'dont_trust' ? 'Don’t Trust' : normalHardware.pending === 'trust' ? 'Trust' : 'Unsure'}. Recorded.
                    </Text>
                    <TouchableOpacity accessibilityRole="button" disabled={normalHardware.busy}
                      style={{ padding: 12, borderWidth: 1, borderColor: COLORS.border, borderRadius: 12 }}
                      onPress={() => void normalHardware.undo()}>
                      <Text style={styles.decisionSubtitle}>Wrong button? Undo ({normalHardware.seconds})</Text>
                    </TouchableOpacity>
                  </>
                )}
                {normalHardware.finalChoice && <Text style={styles.decisionSubtitle}>Retry the same recorded decision to finish saving.</Text>}
                {normalHardware.canFallback && !normalHardware.pending && (
                  <TouchableOpacity accessibilityRole="button" disabled={normalHardware.busy}
                    onPress={normalHardware.useScreenOnly}
                    style={{ padding: 12, borderWidth: 1, borderColor: COLORS.border, borderRadius: 12 }}>
                    <Text style={styles.decisionSubtitle}>Use screen only</Text>
                  </TouchableOpacity>
                )}
                {Boolean(normalHardware.message) && <Text accessibilityRole="alert" style={styles.decisionSubtitle}>{normalHardware.message}</Text>}
              </View>
            )}
            {useDevice && studyContext ? (
              <DeviceDecisionPanel
                trial={studyContext}
                decision={
                  decision === 'dont-trust'
                    ? 'dont_trust'
                    : decision
                }
                onDecision={(value, decidedAt) =>
                  void handleDecision(
                    value === 'dont_trust'
                      ? 'dont-trust'
                      : value,
                    decidedAt,
                  )
                }
                onPressSeen={() => {
                  sourcesAtDecision.current =
                    evidenceTrackingKey
                      ? getOpenedEvidenceSourceIds(
                          evidenceTrackingKey,
                        )
                      : Promise.resolve([]);
                }}
                onUndone={() => {
                  sourcesAtDecision.current = null;
                }}
                onUseScreenButtons={() =>
                  setUseScreenButtons(true)
                }
              />
            ) : (
            <View style={styles.decisionButtons}>
              <TouchableOpacity
                activeOpacity={0.8}
                disabled={Boolean(decision) || normalDecisionBusy || (normalMode && Boolean(normalHardware.finalChoice) && normalHardware.finalChoice !== 'trust')}
                style={[
                  styles.decisionButton,
                  decision === 'trust' &&
                    styles.trustSelected,
                ]}
                onPress={() => chooseScreenDecision('trust')}
              >
                <View
                  style={[
                    styles.decisionIcon,
                    decision === 'trust' &&
                      styles.trustIconSelected,
                  ]}
                >
                  <Ionicons
                    name="checkmark"
                    size={21}
                    color={
                      decision === 'trust'
                        ? COLORS.white
                        : '#16855A'
                    }
                  />
                </View>
                <Text
                  style={[
                    styles.decisionButtonText,
                    decision === 'trust' &&
                      styles.selectedDecisionText,
                  ]}
                >
                  Trust
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.8}
                disabled={Boolean(decision) || normalDecisionBusy || (normalMode && Boolean(normalHardware.finalChoice) && normalHardware.finalChoice !== 'dont_trust')}
                style={[
                  styles.decisionButton,
                  decision === 'dont-trust' &&
                    styles.dontTrustSelected,
                ]}
                onPress={() =>
                  chooseScreenDecision('dont-trust')
                }
              >
                <View
                  style={[
                    styles.decisionIcon,
                    decision === 'dont-trust' &&
                      styles.dontTrustIconSelected,
                  ]}
                >
                  <Ionicons
                    name="close"
                    size={22}
                    color={
                      decision === 'dont-trust'
                        ? COLORS.white
                        : '#C24545'
                    }
                  />
                </View>
                <Text
                  style={[
                    styles.decisionButtonText,
                    decision === 'dont-trust' &&
                      styles.selectedDecisionText,
                  ]}
                >
                  Don't Trust
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.8}
                disabled={Boolean(decision) || normalDecisionBusy || (normalMode && Boolean(normalHardware.finalChoice) && normalHardware.finalChoice !== 'unsure')}
                style={[
                  styles.decisionButton,
                  decision === 'unsure' &&
                    styles.unsureSelected,
                ]}
                onPress={() => chooseScreenDecision('unsure')}
              >
                <View
                  style={[
                    styles.decisionIcon,
                    decision === 'unsure' &&
                      styles.unsureIconSelected,
                  ]}
                >
                  <Ionicons
                    name="help"
                    size={21}
                    color={
                      decision === 'unsure'
                        ? COLORS.white
                        : '#B96800'
                    }
                  />
                </View>
                <Text
                  style={[
                    styles.decisionButtonText,
                    decision === 'unsure' &&
                      styles.selectedDecisionText,
                  ]}
                >
                  Unsure
                </Text>
              </TouchableOpacity>
            </View>
            )}
          </View>
        )}

        {/* FULL EVIDENCE
            Hidden in study trials: it shows every source in full without counting any,
            so participants open each source with "View source", which is what the
            source-use metric counts (like opening each page in the browser condition). */}
        {hasEvidence && !studyContext && (
          <TouchableOpacity
            activeOpacity={0.88}
            style={styles.evidenceButtonWrapper}
            onPress={handleViewFullEvidence}
          >
            <LinearGradient
              colors={['#3478F6', '#2563EB']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.evidenceButton}
            >
              <View style={styles.evidenceButtonIcon}>
                <Ionicons
                  name="reader-outline"
                  size={22}
                  color={COLORS.white}
                />
              </View>

              <View style={styles.evidenceButtonTextArea}>
                <Text style={styles.evidenceButtonText}>
                  View Full Evidence
                </Text>
                <Text style={styles.evidenceButtonSubtitle}>
                  Explore all sources and evidence details
                </Text>
              </View>

              <Ionicons
                name="arrow-forward"
                size={21}
                color={COLORS.white}
              />
            </LinearGradient>
          </TouchableOpacity>
        )}

        {evaluationStatus ? (
          <Text
            accessibilityRole="alert"
            style={styles.evaluationStatus}
          >
            {evaluationStatus}
            {sharingIntention
              ? ` Sharing intention: ${sharingIntention}/7.`
              : ''}
          </Text>
        ) : null}

        {evaluationComplete &&
        studyContext?.trialIndex !== undefined ? (
          <Text style={styles.evaluationStatus}>
            Trial {studyContext.trialIndex}
          </Text>
        ) : evaluationComplete &&
          localTrialNumber !== null ? (
          <Text style={styles.evaluationStatus}>
            Check {localTrialNumber}
          </Text>
        ) : null}

        {retryRecordId && !evaluationComplete ? (
          <TouchableOpacity
            accessibilityRole="button"
            activeOpacity={0.85}
            disabled={isSubmittingEvaluation}
            style={[
              styles.scanAgainButton,
              styles.scanAgainPrimary,
            ]}
            onPress={() =>
              void handleRetryEvaluation()
            }
          >
            <Text style={styles.scanAgainPrimaryText}>
              {isSubmittingEvaluation
                ? 'Retrying saved decision…'
                : 'Retry Saved Submission'}
            </Text>
          </TouchableOpacity>
        ) : null}

        {!isWalkthrough &&
          (!hasEvaluation || evaluationComplete) && (
            <>
              {!studyContext ? (
                <TouchableOpacity
                  activeOpacity={0.85}
                  style={[
                    styles.scanAgainButton,
                    styles.scanAgainPrimary,
                  ]}
                  onPress={() =>
                    navigation.navigate('Camera')
                  }
                >
                  <Ionicons
                    name="scan-outline"
                    size={20}
                    color={COLORS.white}
                  />
                  <Text style={styles.scanAgainPrimaryText}>
                    Scan Another Claim
                  </Text>
                </TouchableOpacity>
              ) : (
                <Text style={styles.evaluationStatus}>
                  This assigned trial is recorded.
                  Continue only with the next official
                  study assignment.
                </Text>
              )}

              <TouchableOpacity
                activeOpacity={0.85}
                style={styles.homeButton}
                onPress={() => {
                  if (studyContext) {
                    navigation.reset({
                      index: 0,
                      routes: [
                        {
                          name: 'StudyFlow',
                          params: {
                            participantId: studyContext.participantId,
                            conditionOrder: studyContext.conditionOrder,
                            setOrder: studyContext.setOrder,
                            completedTrialIndex: studyContext.trialIndex,
                          },
                        },
                      ],
                    });
                    return;
                  }

                  navigation.navigate('Home');
                }}
              >
                <Text style={styles.homeButtonText}>
                  {studyContext ? 'Continue Study' : 'Home'}
                </Text>
              </TouchableOpacity>
            </>
          )}
      </ScrollView>

      {(hasEvaluation || isWalkthrough) && (
        <SharingIntentionModal
          visible={isSharingModalVisible}
          isSubmitting={isSubmittingEvaluation}
          onSelect={handleSharingIntention}
          practice={isWalkthrough}
          onSkip={
            isWalkthrough
              ? () => void skipTour()
              : undefined
          }
        />
      )}

      {isWalkthrough &&
        tourStep !== 'result_sharing' && (
          <WalkthroughOverlay
            mode={
              tourStep === 'complete'
                ? 'complete'
                : 'spotlight'
            }
            step={tourStep}
            targetRef={
              activeTourTarget ?? undefined
            }
            measurementVersion={tourVersion}
            title={
              tourStep === 'result_match'
                ? 'Understand the match'
                : tourStep === 'result_source'
                  ? 'Open a practice source'
                  : tourStep === 'result_decision'
                    ? 'Make your decision'
                    : 'You are ready to use FactTrace!'
            }
            message={
              tourStep === 'result_match'
                ? 'This is a fictional 92% claim wording match. A strong match means similar wording — it does NOT prove the claim is true. Always inspect evidence.'
                : tourStep === 'result_source'
                  ? 'Tap the highlighted practice source to inspect its details. This example is not a real publication.'
                  : tourStep === 'result_decision'
                    ? "You decide: Trust, Don't Trust, or Unsure. Tap one of the highlighted choices based on what you learned."
                    : 'Great job! You typed a claim, reviewed an example match, inspected a source, and made a decision. Real checks appear in History; this practice did not save one.'
            }
            onContinue={
              tourStep === 'result_match'
                ? () =>
                    void updateTourStep(
                      'result_source',
                    )
                : tourStep === 'result_source'
                  ? () => {
                      const source = result.evidence[0];
                      if (source) {
                        void handleOpenSource(source.id);
                      }
                    }
                  : tourStep === 'result_decision'
                    ? () =>
                        void handleDecision('unsure')
                    : undefined
            }
            onFinish={
              tourStep === 'complete'
                ? () => void finishTour()
                : undefined
            }
            onSkip={() => void skipTour()}
          />
        )}
    </SafeAreaView>
  );
}

const createStyles = (COLORS: ThemeColors, isDark: boolean) => StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollView: { flex: 1 },
  content: {
    paddingHorizontal: 22,
    paddingBottom: 40,
  },
  header: {
    paddingTop: 12,
    paddingHorizontal: 22,
    paddingBottom: 8,
    backgroundColor: COLORS.background,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    width: 45,
    height: 45,
    borderRadius: 15,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#1B3655',
    shadowOpacity: 0.07,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  headerTextArea: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    color: COLORS.textPrimary,
    fontSize: 21,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    marginTop: 2,
    color: COLORS.textSecondary,
    fontSize: 11.5,
  },
  headerSpacer: { width: 45 },
  progressRow: {
    marginTop: 22,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  progressItem: {
    alignItems: 'center',
  },
  progressComplete: {
    width: 29,
    height: 29,
    borderRadius: 15,
    backgroundColor: COLORS.blue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressCurrent: {
    width: 29,
    height: 29,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: COLORS.blue,
    backgroundColor: isDark ? COLORS.surfaceElevated : '#EAF1FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressCurrentNumber: {
    color: COLORS.blue,
    fontSize: 12,
    fontWeight: '800',
  },
  progressCompleteText: {
    marginTop: 4,
    color: COLORS.blue,
    fontSize: 10,
    fontWeight: '700',
  },
  progressCurrentText: {
    marginTop: 4,
    color: COLORS.textPrimary,
    fontSize: 10,
    fontWeight: '700',
  },
  progressLineActive: {
    flex: 1,
    height: 2,
    backgroundColor: COLORS.blue,
    marginHorizontal: 7,
    marginBottom: 15,
  },

  /* CLAIM */
  claimCard: {
    marginTop: 22,
    borderRadius: 18,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: isDark ? COLORS.border : '#E1E8F0',
    padding: 15,
  },
  claimTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  claimIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: isDark ? COLORS.surfaceElevated : '#EDF4FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  claimLabel: {
    marginLeft: 9,
    color: COLORS.textSecondary,
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  claimText: {
    marginTop: 12,
    color: COLORS.textPrimary,
    fontSize: 16,
    lineHeight: 23,
    fontWeight: '600',
  },

  /* MATCH */
  matchCard: {
    marginTop: 16,
    borderRadius: 22,
    padding: 18,
    overflow: 'hidden',
    shadowColor: '#0B2542',
    shadowOpacity: 0.18,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: 7 },
    elevation: 6,
  },
  matchCircleOne: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    borderWidth: 24,
    borderColor: 'rgba(255,255,255,0.03)',
    right: -50,
    top: -60,
  },
  matchCircleTwo: {
    position: 'absolute',
    width: 75,
    height: 75,
    borderRadius: 38,
    backgroundColor: 'rgba(255,255,255,0.025)',
    right: 20,
    bottom: -28,
  },
  matchTopRow: {
    gap: 8,
    flexWrap: 'wrap',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  matchBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  matchDot: {
    marginRight: 6,
  },
  matchBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.7,
  },
  matchScore: {
    alignItems: 'flex-end',
  },
  matchScoreNumber: {
    color: COLORS.white,
    fontSize: 22,
    fontWeight: '800',
  },
  matchScoreLabel: {
    marginTop: -1,
    color: '#C7D6E6',
    fontSize: 12,
  },
  matchScoreNote: {
    marginTop: 10,
    color: '#C7D6E6',
    fontSize: 12.5,
    lineHeight: 17,
    maxWidth: '96%',
  },
  noticeBox: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  noticeText: {
    flex: 1,
    color: COLORS.textSecondary,
    fontSize: 13.5,
    lineHeight: 19,
  },
  factCheckCard: {
    marginTop: 14,
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    gap: 6,
  },
  factCheckLabel: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  factCheckPublisher: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  factCheckRating: {
    color: COLORS.textPrimary,
    fontSize: 14,
    lineHeight: 20,
  },
  factCheckNote: {
    color: COLORS.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },
  factCheckButton: {
    marginTop: 6,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 44,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: COLORS.blue,
  },
  factCheckButtonText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '700',
  },
  matchTitle: {
    marginTop: 16,
    color: COLORS.white,
    fontSize: 22,
    fontWeight: '800',
  },
  matchDescription: {
    marginTop: 7,
    color: '#C7D6E6',
    fontSize: 12.5,
    lineHeight: 17,
    maxWidth: '92%',
  },
  matchedClaimBox: {
    marginTop: 14,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    borderRadius: 13,
    padding: 11,
  },
  matchedClaimLabel: {
    color: '#AFC8E0',
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 0.7,
  },
  matchedClaimText: {
    marginTop: 5,
    color: '#E7F0F8',
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '600',
  },

  /* SECTION */
  sectionHeader: {
    marginTop: 22,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    color: COLORS.textPrimary,
    fontSize: 18,
    fontWeight: '800',
  },
  sectionSubtitle: {
    marginTop: 2,
    color: COLORS.textSecondary,
    fontSize: 11,
  },
  sourceCount: {
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 9,
    backgroundColor: isDark ? COLORS.surfaceElevated : '#EAF1FF',
  },
  sourceCountText: {
    color: COLORS.blue,
    fontSize: 10,
    fontWeight: '700',
  },

  /* EVIDENCE */
  evidenceCard: {
    marginBottom: 11,
    borderRadius: 17,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: isDark ? COLORS.border : '#E1E8F0',
    padding: 14,
    shadowColor: '#18334E',
    shadowOpacity: 0.035,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 1,
  },
  evidenceTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sourceIconBlue: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: isDark ? COLORS.surfaceElevated : '#EDF4FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sourceIconPurple: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: isDark ? COLORS.surfaceElevated : '#F2EEFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sourceInfo: { flex: 1, marginLeft: 10 },
  sourceName: {
    color: COLORS.textPrimary,
    fontSize: 13.5,
    fontWeight: '700',
  },
  sourceMeta: {
    marginTop: 2,
    color: COLORS.textMuted,
    fontSize: 10,
  },
  evidenceTitle: {
    marginTop: 12,
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  evidencePreview: {
    marginTop: 5,
    color: COLORS.textSecondary,
    fontSize: 11.5,
    lineHeight: 16,
  },
  evidenceFooter: {
    marginTop: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  provenanceChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: isDark ? COLORS.surfaceElevated : '#F1F6FD',
    borderRadius: 9,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  provenanceText: {
    marginLeft: 5,
    color: COLORS.blue,
    fontSize: 9.5,
    fontWeight: '600',
  },
  readMore: {
    color: COLORS.blue,
    fontSize: 10.5,
    fontWeight: '700',
  },

  /* EMPTY */
  emptyCard: {
    borderRadius: 18,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: isDark ? COLORS.border : '#E1E8F0',
    paddingHorizontal: 20,
    paddingVertical: 28,
    alignItems: 'center',
  },
  emptyIcon: {
    width: 50,
    height: 50,
    borderRadius: 16,
    backgroundColor: isDark ? COLORS.surfaceElevated : '#EDF4FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    marginTop: 12,
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: '800',
  },
  emptyText: {
    marginTop: 6,
    color: COLORS.textSecondary,
    fontSize: 12,
    lineHeight: 17,
    textAlign: 'center',
  },

  /* DECISION */
  decisionSection: { marginTop: 10 },
  decisionHeader: { marginBottom: 11 },
  decisionTitle: {
    color: COLORS.textPrimary,
    fontSize: 18,
    fontWeight: '800',
  },
  decisionSubtitle: {
    marginTop: 3,
    color: COLORS.textSecondary,
    fontSize: 11,
  },
  decisionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  decisionButton: {
    flex: 1,
    minHeight: 88,
    borderRadius: 15,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: isDark ? COLORS.border : '#E1E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  decisionIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: isDark ? COLORS.surfaceElevated : '#F1F4F7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  decisionButtonText: {
    marginTop: 7,
    color: COLORS.textPrimary,
    fontSize: 11,
    fontWeight: '700',
  },
  trustSelected: {
    backgroundColor: isDark ? COLORS.surfaceElevated : '#EAF8F2',
    borderColor: isDark ? COLORS.border : '#8AD5B1',
  },
  trustIconSelected: {
    backgroundColor: '#249664',
  },
  dontTrustSelected: {
    backgroundColor: isDark ? COLORS.surfaceElevated : '#FDEEEE',
    borderColor: isDark ? COLORS.border : '#E9AAAA',
  },
  dontTrustIconSelected: {
    backgroundColor: '#C84C4C',
  },
  unsureSelected: {
    backgroundColor: isDark ? COLORS.surfaceElevated : '#FFF7E9',
    borderColor: isDark ? COLORS.border : '#F0CA8C',
  },
  unsureIconSelected: {
    backgroundColor: '#CB7A17',
  },
  selectedDecisionText: { fontWeight: '800' },

  /* FULL EVIDENCE */
  evidenceButtonWrapper: {
    marginTop: 20,
    shadowColor: COLORS.blue,
    shadowOpacity: 0.2,
    shadowRadius: 11,
    shadowOffset: { width: 0, height: 6 },
    elevation: 5,
  },
  evidenceButton: {
    minHeight: 68,
    borderRadius: 17,
    paddingHorizontal: 15,
    flexDirection: 'row',
    alignItems: 'center',
  },
  evidenceButtonIcon: {
    width: 40,
    height: 40,
    borderRadius: 11,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  evidenceButtonTextArea: {
    flex: 1,
    marginLeft: 11,
  },
  evidenceButtonText: {
    color: COLORS.white,
    fontSize: 15.5,
    fontWeight: '700',
  },
  evidenceButtonSubtitle: {
    marginTop: 2,
    color: '#DCE8FF',
    fontSize: 10.5,
  },

  /* SCAN AGAIN */
  scanAgainButton: {
    marginTop: 11,
    minHeight: 52,
    borderRadius: 15,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: isDark ? COLORS.border : '#E1E8F0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanAgainPrimary: {
    backgroundColor: COLORS.blue,
    borderWidth: 0,
  },
  scanAgainPrimaryText: {
    marginLeft: 7,
    color: COLORS.white,
    fontSize: 13,
    fontWeight: '700',
  },
  homeButton: {
    marginTop: 10,
    minHeight: 50,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 15,
    borderWidth: 1,
    borderColor: isDark ? COLORS.border : '#E1E8F0',
    backgroundColor: COLORS.surface,
  },
  homeButtonText: {
    color: COLORS.textPrimary,
    fontSize: 13,
    fontWeight: '700',
  },
  evaluationStatus: {
    marginTop: 14,
    color: COLORS.textSecondary,
    fontSize: 12,
    lineHeight: 18,
  },
});