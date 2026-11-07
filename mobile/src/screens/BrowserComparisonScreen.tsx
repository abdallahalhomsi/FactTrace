import React, { useEffect, useRef, useState, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Alert,
  Linking,
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

import SharingIntentionModal, {
  SharingIntention,
} from '../components/SharingIntentionModal';
import { ThemeColors } from '../constants/app';
import { useAppTheme } from '../theme/AppTheme';
import { RootStackParamList } from '../navigation/types';
import { exportEvaluationRecords } from '../services/evaluationExport';
import {
  getEvaluationRecordByLocalTrialKey,
  retryEvaluationSubmission,
  saveEvaluationDecision,
} from '../services/evaluationService';
import { verifyClaim } from '../services/verificationService';
import { DecisionRequest } from '../types/api';
import { saveWalkthroughState } from '../services/walkthroughService';

type Props = NativeStackScreenProps<
  RootStackParamList,
  'BrowserComparison'
>;

type Verdict = DecisionRequest['decision'];

type ConsultedSource = {
  title: string;
  url: string;
};

const VERDICTS: {
  value: Verdict;
  label: string;
}[] = [
  {
    value: 'trust',
    label: 'Trust',
  },
  {
    value: 'dont_trust',
    label: "Don't Trust",
  },
  {
    value: 'unsure',
    label: 'Unsure',
  },
];

type BrowserStudyContext = {
  participantId: string;
  conditionOrder: 'app_first' | 'browser_first';
  claimId: string;
  claimText: string;
  trialIndex: number;
  isPractice: boolean;
  sessionId?: string;
  trialId?: string;
  startedAt?: string;
};

type BrowserDraft = {
  localTrialKey: string;
  claimText: string;
  participantCode: string;
  startedAt: string;
  sources: ConsultedSource[];
  studySignature?: string;
};

const BROWSER_DRAFT_KEY =
  '@facttrace/browser-comparison/active-draft';

const STUDY_CODE_PATTERN = /^[pP]\d{1,3}$/;

let draftWriteQueue: Promise<void> =
  Promise.resolve();

function storeDraft(
  draft: BrowserDraft | null,
): Promise<void> {
  draftWriteQueue = draftWriteQueue
    .catch(() => undefined)
    .then(() =>
      draft
        ? AsyncStorage.setItem(
            BROWSER_DRAFT_KEY,
            JSON.stringify(draft),
          )
        : AsyncStorage.removeItem(
            BROWSER_DRAFT_KEY,
          ),
    );

  return draftWriteQueue;
}

function trialSignature(
  study: BrowserStudyContext | undefined,
): string | undefined {
  if (!study) {
    return undefined;
  }

  return JSON.stringify([
    study.sessionId ?? null,
    study.trialId ?? null,
    study.participantId.toUpperCase(),
    study.claimId,
    study.claimText,
    study.trialIndex,
    study.isPractice,
  ]);
}

function newLocalTrialKey(): string {
  return `${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2)}`;
}

export default function BrowserComparisonScreen({
  navigation,
  route,
}: Props) {
  const {
    colors: COLORS,
    isDark,
  } = useAppTheme();

  const styles = useMemo(
    () =>
      createStyles(
        COLORS,
        isDark,
      ),
    [COLORS, isDark],
  );

  const studyContext = (
    route.params as unknown as
      | {
          studyContext?: BrowserStudyContext;
        }
      | undefined
  )?.studyContext;

  const isWalkthrough =
    Boolean(route.params?.walkthrough) &&
    !studyContext;

  const signature =
    trialSignature(studyContext);

  const [
    claimText,
    setClaimText,
  ] = useState(
    studyContext?.claimText ?? '',
  );

  const [
    participantCode,
    setParticipantCode,
  ] = useState(
    studyContext?.participantId ?? '',
  );

  const [
    startedAt,
    setStartedAt,
  ] = useState<string | null>(
    null,
  );

  const [
    localTrialKey,
    setLocalTrialKey,
  ] = useState<string | null>(
    null,
  );

  const [
    localTrialNumber,
    setLocalTrialNumber,
  ] = useState<number | null>(
    null,
  );

  const [
    sourceTitle,
    setSourceTitle,
  ] = useState('');

  const [
    sourceUrl,
    setSourceUrl,
  ] = useState('');

  const [
    sources,
    setSources,
  ] = useState<ConsultedSource[]>(
    [],
  );

  const [
    decision,
    setDecision,
  ] = useState<Verdict | null>(
    null,
  );

  const [
    isSharingModalVisible,
    setSharingModalVisible,
  ] = useState(false);

  const [
    isSubmitting,
    setIsSubmitting,
  ] = useState(false);

  const [
    hasSubmitted,
    setHasSubmitted,
  ] = useState(false);

  const [
    recordIdToRetry,
    setRecordIdToRetry,
  ] = useState<string | null>(
    null,
  );

  const [
    isRestoring,
    setIsRestoring,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState<string | null>(
    null,
  );

  const [
    status,
    setStatus,
  ] = useState<string | null>(
    null,
  );

  const submissionAttempted =
    useRef(false);

  const allowLeaving =
    useRef(false);

  const verdictSelectedAt =
    useRef<string | null>(
      null,
    );

  useEffect(() => {
    let alive = true;

    if (isWalkthrough) {
      setClaimText('');
      setParticipantCode('');
      setStartedAt(null);
      setLocalTrialKey(null);
      setLocalTrialNumber(null);
      setSourceTitle('');
      setSourceUrl('');
      setSources([]);
      setDecision(null);
      setHasSubmitted(false);
      setRecordIdToRetry(null);
      setSharingModalVisible(false);
      setStatus(null);
      setError(null);
      setIsRestoring(false);

      return () => {
        alive = false;
      };
    }

    setIsRestoring(true);
    setClaimText(
      studyContext?.claimText ?? '',
    );
    setParticipantCode(
      studyContext?.participantId ?? '',
    );
    setStartedAt(null);
    setLocalTrialKey(null);
    setLocalTrialNumber(null);
    setSourceTitle('');
    setSourceUrl('');
    setSources([]);
    setDecision(null);
    setHasSubmitted(false);
    setRecordIdToRetry(null);
    setStatus(null);
    setError(null);

    submissionAttempted.current =
      false;

    allowLeaving.current =
      false;

    verdictSelectedAt.current =
      null;

    const restore =
      async () => {
        try {
          await draftWriteQueue.catch(
            () => undefined,
          );

          const raw =
            await AsyncStorage.getItem(
              BROWSER_DRAFT_KEY,
            );

          if (!raw) {
            return;
          }

          const draft =
            JSON.parse(
              raw,
            ) as Partial<BrowserDraft>;

          if (
            typeof draft.localTrialKey !==
              'string' ||
            typeof draft.startedAt !==
              'string' ||
            typeof draft.claimText !==
              'string' ||
            typeof draft.participantCode !==
              'string' ||
            !Array.isArray(
              draft.sources,
            ) ||
            draft.studySignature !==
              signature
          ) {
            return;
          }

          if (!alive) {
            return;
          }

          setLocalTrialKey(
            draft.localTrialKey,
          );

          setClaimText(
            draft.claimText,
          );

          setParticipantCode(
            draft.participantCode,
          );

          setStartedAt(
            draft.startedAt,
          );

          setSources(
            draft.sources.filter(
              source =>
                typeof source.url ===
                  'string' &&
                typeof source.title ===
                  'string',
            ),
          );

          const saved =
            await getEvaluationRecordByLocalTrialKey(
              draft.localTrialKey,
            );

          if (
            !alive ||
            !saved
          ) {
            return;
          }

          if (
            saved.serverStatus ===
              'submitted' ||
            saved.serverStatus ===
              'not_submitted'
          ) {
            setHasSubmitted(
              true,
            );

            setLocalTrialNumber(
              saved.localTrialNumber ??
                null,
            );

            setStatus(
              saved.serverMessage,
            );
          } else {
            setRecordIdToRetry(
              saved.recordId,
            );

            setStatus(
              'This trial already has a locally saved decision. Retry the same submission; do not create a new answer.',
            );

            submissionAttempted.current =
              true;
          }
        } catch (
          restoreError
        ) {
          console.warn(
            'Could not restore the unfinished browser trial.',
            restoreError,
          );

          if (alive) {
            setError(
              'The previous browser task could not be restored from this device.',
            );
          }
        } finally {
          if (alive) {
            setIsRestoring(false);
          }
        }
      };

    void restore();

    return () => {
      alive = false;
    };
  }, [
    isWalkthrough,
    signature,
  ]);

  useEffect(() => {
    if (
      isWalkthrough ||
      isRestoring ||
      !startedAt ||
      !localTrialKey
    ) {
      return;
    }

    const draft: BrowserDraft = {
      localTrialKey,
      claimText,
      participantCode,
      startedAt,
      sources,
      studySignature:
        signature,
    };

    void storeDraft(
      draft,
    ).catch(saveError =>
      console.warn(
        'Could not persist browser trial draft.',
        saveError,
      ),
    );
  }, [
    claimText,
    participantCode,
    startedAt,
    sources,
    signature,
    localTrialKey,
    isRestoring,
    isWalkthrough,
  ]);

  useEffect(() => {
    return navigation.addListener(
      'beforeRemove',
      event => {
        if (
          isWalkthrough ||
          !startedAt ||
          hasSubmitted ||
          allowLeaving.current
        ) {
          return;
        }

        event.preventDefault();

        const message =
          recordIdToRetry
            ? 'This decision is saved locally but not confirmed by the server. You can return and retry later.'
            : 'Your research task is unfinished. Leaving now may interrupt the trial.';

        if (
          Platform.OS ===
          'web'
        ) {
          if (
            window.confirm(
              `${message} Leave anyway?`,
            )
          ) {
            allowLeaving.current =
              true;

            navigation.dispatch(
              event.data.action,
            );
          }
        } else {
          Alert.alert(
            'Leave this task?',
            message,
            [
              {
                text: 'Stay',
                style: 'cancel',
              },
              {
                text: 'Leave',
                style:
                  'destructive',
                onPress: () => {
                  allowLeaving.current =
                    true;

                  navigation.dispatch(
                    event.data
                      .action,
                  );
                },
              },
            ],
          );
        }
      },
    );
  }, [
    isWalkthrough,
    navigation,
    startedAt,
    hasSubmitted,
    recordIdToRetry,
  ]);

  const startTask = () => {
    if (isWalkthrough) {
      return;
    }

    if (
      isRestoring ||
      startedAt ||
      isSubmitting
    ) {
      return;
    }

    if (
      !claimText.trim()
    ) {
      setError(
        'Enter the claim you are about to research.',
      );

      return;
    }

    const code =
      participantCode.trim();

    if (
      code &&
      !STUDY_CODE_PATTERN.test(
        code,
      )
    ) {
      setError(
        'Use the study participant code provided to you (for example, P01), or leave it blank to save locally only.',
      );

      return;
    }

    if (
      studyContext &&
      !code
    ) {
      setError(
        'This assigned trial requires a valid study participant code.',
      );

      return;
    }

    setError(null);

    setStartedAt(
      studyContext?.startedAt ??
        new Date().toISOString(),
    );

    setLocalTrialKey(
      newLocalTrialKey(),
    );
  };

  const openSource =
    async () => {
      if (isWalkthrough) {
        return;
      }

      const url =
        sourceUrl.trim();

      try {
        const parsed =
          new URL(url);

        if (
          parsed.protocol !==
            'http:' &&
          parsed.protocol !==
            'https:'
        ) {
          throw new Error(
            'Use an http or https source URL.',
          );
        }

        const normalizedUrl =
          parsed.toString();

        if (
          Platform.OS ===
          'web'
        ) {
          const opened =
            window.open(
              normalizedUrl,
              '_blank',
            );

          if (!opened) {
            throw new Error(
              'Your browser blocked the new tab. Allow pop-ups and try again.',
            );
          }

          opened.opener =
            null;
        } else {
          await Linking.openURL(
            normalizedUrl,
          );
        }

        setSources(
          current =>
            current.some(
              source =>
                source.url ===
                normalizedUrl,
            )
              ? current
              : [
                  ...current,
                  {
                    title:
                      sourceTitle.trim() ||
                      parsed.hostname,
                    url:
                      normalizedUrl,
                  },
                ],
        );

        setSourceTitle('');
        setSourceUrl('');
        setError(null);
      } catch (
        openError
      ) {
        setError(
          openError instanceof
          Error
            ? openError.message
            : 'FactTrace could not open that source URL.',
        );
      }
    };

  const addConsultedSource =
    () => {
      if (isWalkthrough) {
        return;
      }

      const title =
        sourceTitle.trim();

      const url =
        sourceUrl.trim();

      if (
        !title ||
        !url
      ) {
        setError(
          'Enter a source name and URL after consulting the source.',
        );

        return;
      }

      try {
        const parsed =
          new URL(url);

        if (
          parsed.protocol !==
            'http:' &&
          parsed.protocol !==
            'https:'
        ) {
          throw new Error(
            'Source URLs must use http or https.',
          );
        }

        const normalizedUrl =
          parsed.toString();

        setSources(
          current =>
            current.some(
              source =>
                source.url ===
                normalizedUrl,
            )
              ? current
              : [
                  ...current,
                  {
                    title,
                    url:
                      normalizedUrl,
                  },
                ],
        );

        setSourceTitle('');
        setSourceUrl('');
        setError(null);
      } catch (
        validationError
      ) {
        setError(
          validationError instanceof
          Error
            ? validationError.message
            : 'Enter a valid source URL.',
        );
      }
    };

  const chooseVerdict = (
    value: Verdict,
  ) => {
    if (isWalkthrough) {
      return;
    }

    if (
      hasSubmitted ||
      isSubmitting ||
      recordIdToRetry
    ) {
      return;
    }

    verdictSelectedAt.current =
      new Date().toISOString();

    setDecision(value);

    setSharingModalVisible(
      true,
    );
  };

  const recordIntention =
    async (
      intention: SharingIntention,
    ) => {
      if (isWalkthrough) {
        return;
      }

      if (
        !startedAt ||
        !localTrialKey ||
        !decision ||
        isSubmitting ||
        hasSubmitted ||
        submissionAttempted.current
      ) {
        return;
      }

      const endedAt =
        verdictSelectedAt.current ??
        new Date().toISOString();

      submissionAttempted.current =
        true;

      setIsSubmitting(
        true,
      );

      setError(null);

      try {
        let resolvedClaimId:
          | string
          | null =
          studyContext?.claimId ??
          null;

        if (!studyContext) {
          try {
            const verification =
              await verifyClaim(
                claimText.trim(),
                {
                  source:
                    'manual',
                },
              );

            resolvedClaimId =
              verification.success
                ? verification.data
                    ?.claimId ??
                  null
                : null;
          } catch (
            lookupError
          ) {
            console.warn(
              'Browser claim-ID lookup unavailable; saving the decision without an unverified ID.',
              lookupError,
            );
          }
        }

        const result =
          await saveEvaluationDecision(
            {
              condition:
                'browser',

              claimId:
                resolvedClaimId,

              claimText:
                claimText.trim(),

              inputSource:
                'manual',

              decision,

              sharingIntention:
                intention,

              sourcesOpened:
                sources.map(
                  source =>
                    source.url,
                ),

              startedAt,

              endedAt,

              ...(studyContext
                ? {
                    trialIndex:
                      studyContext.trialIndex,

                    isPractice:
                      studyContext.isPractice,
                  }
                : {}),
            },

            participantCode,

            {
              sourcesConsulted:
                sources,

              localTrialKey,
            },
          );

        setStatus(
          result.message,
        );

        setLocalTrialNumber(
          result.localTrialNumber ??
            null,
        );

        setSharingModalVisible(
          false,
        );

        if (
          result.serverStatus ===
            'submitted' ||
          result.serverStatus ===
            'not_submitted'
        ) {
          setHasSubmitted(
            true,
          );
        } else {
          setRecordIdToRetry(
            result.recordId,
          );
        }
      } catch (
        saveError
      ) {
        const existing =
          await getEvaluationRecordByLocalTrialKey(
            localTrialKey,
          ).catch(
            () => undefined,
          );

        if (existing) {
          setRecordIdToRetry(
            existing.recordId,
          );

          setStatus(
            'A previous decision was saved locally. Please retry that same decision.',
          );
        } else {
          submissionAttempted.current =
            false;
        }

        setError(
          saveError instanceof
          Error
            ? saveError.message
            : 'Could not save this decision.',
        );
      } finally {
        setIsSubmitting(
          false,
        );
      }
    };

  const retrySubmission =
    async () => {
      if (isWalkthrough) {
        return;
      }

      if (
        !recordIdToRetry ||
        isSubmitting
      ) {
        return;
      }

      setIsSubmitting(
        true,
      );

      setError(null);

      try {
        const result =
          await retryEvaluationSubmission(
            recordIdToRetry,
          );

        setStatus(
          result.message,
        );

        setLocalTrialNumber(
          result.localTrialNumber ??
            null,
        );

        if (
          result.serverStatus ===
          'submitted'
        ) {
          setHasSubmitted(
            true,
          );

          setRecordIdToRetry(
            null,
          );
        }
      } catch (
        retryError
      ) {
        setError(
          retryError instanceof
          Error
            ? retryError.message
            : 'Could not retry the saved decision.',
        );
      } finally {
        setIsSubmitting(
          false,
        );
      }
    };

  const exportRecords =
    async () => {
      if (isWalkthrough) {
        return;
      }

      try {
        const count =
          await exportEvaluationRecords();

        if (count > 0) {
          setStatus(
            `Exported ${count} locally saved evaluation record(s).`,
          );
        }
      } catch (
        exportError
      ) {
        Alert.alert(
          'Evaluation export unavailable',
          exportError instanceof
          Error
            ? exportError.message
            : 'Could not export local evaluation records.',
        );
      }
    };

  const startAnotherTask =
    async () => {
      if (
        isWalkthrough ||
        studyContext
      ) {
        return;
      }

      try {
        await storeDraft(
          null,
        );
      } catch (
        clearError
      ) {
        console.warn(
          'Could not clear previous browser draft.',
          clearError,
        );
      }

      setClaimText('');
      setParticipantCode('');
      setStartedAt(null);
      setLocalTrialKey(null);
      setLocalTrialNumber(null);
      setSourceTitle('');
      setSourceUrl('');
      setSources([]);
      setDecision(null);
      setHasSubmitted(false);
      setRecordIdToRetry(null);

      submissionAttempted.current =
        false;

      verdictSelectedAt.current =
        null;

      setStatus(null);
      setError(null);
    };

  const returnFromWalkthrough =
    async () => {
      try {
        await saveWalkthroughState({
          status:
            'in_progress',
          step: 'ready',
        });

        navigation.reset({
          index: 0,
          routes: [
            {
              name: 'Home',
              params: {
                walkthroughContinue:
                  true,
              },
            },
          ],
        });
      } catch (
        returnError
      ) {
        console.warn(
          'Could not continue walkthrough from Browser Comparison.',
          returnError,
        );

        setError(
          'Could not save walkthrough progress. Please try again.',
        );
      }
    };

  const skipWalkthrough =
    async () => {
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
      } catch (
        skipError
      ) {
        console.warn(
          'Could not skip walkthrough.',
          skipError,
        );

        setError(
          'Could not skip the walkthrough. Please try again.',
        );
      }
    };

  return (
    <SafeAreaView
      style={
        styles.safeArea
      }
    >
      <StatusBar
        style={
          isDark
            ? 'light'
            : 'dark'
        }
      />

      <ScrollView
        contentContainerStyle={
          styles.content
        }
        keyboardShouldPersistTaps="handled"
      >
        <View
          style={styles.header}
        >
          <TouchableOpacity
            accessibilityRole="button"
            style={
              styles.backButton
            }
            onPress={() =>
              isWalkthrough
                ? void returnFromWalkthrough()
                : navigation.goBack()
            }
          >
            <Ionicons
              name="arrow-back"
              size={22}
              color={
                COLORS.textPrimary
              }
            />
          </TouchableOpacity>

          <View
            style={
              styles.headerCopy
            }
          >
            <Text
              style={
                styles.title
              }
            >
              Browser Comparison
            </Text>

            <Text
              style={
                styles.subtitle
              }
            >
              Record only the sources
              you actually consult.
            </Text>
          </View>
        </View>

        {isWalkthrough ? (
          <View
            style={
              styles.notice
            }
          >
            <Text
              style={
                styles.noticeText
              }
            >
              Browser Comparison lets
              you manually research a
              claim and record the
              sources you consult for
              comparison with
              FactTrace. This
              walkthrough visit will
              not create or save a
              research record.
            </Text>

            <TouchableOpacity
              accessibilityRole="button"
              style={
                styles.walkthroughHomeButton
              }
              onPress={() =>
                void returnFromWalkthrough()
              }
            >
              <Text
                style={
                  styles.primaryButtonText
                }
              >
                Back to Home
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              accessibilityRole="button"
              style={
                styles.walkthroughSkip
              }
              onPress={() =>
                void skipWalkthrough()
              }
            >
              <Text
                style={
                  styles.secondaryButtonText
                }
              >
                Skip Walkthrough
              </Text>
            </TouchableOpacity>
          </View>
        ) : null}

        <View
          style={styles.notice}
        >
          <Text
            style={
              styles.noticeText
            }
          >
            This screen does not
            search the web for you.
            Opened links and websites
            you report are saved
            locally. Server submission
            requires a valid
            participant code.
          </Text>
        </View>

        {studyContext ? (
          <View
            style={styles.notice}
          >
            <Text
              style={
                styles.noticeText
              }
            >
              Assigned{' '}
              {studyContext.isPractice
                ? 'practice '
                : ''}
              trial{' '}
              {
                studyContext.trialIndex
              }
              {' · '}Claim{' '}
              {
                studyContext.claimId
              }
            </Text>
          </View>
        ) : null}

        <View
          style={styles.card}
        >
          <Text
            style={
              styles.sectionTitle
            }
          >
            {startedAt
              ? 'Research task'
              : 'Start a task'}
          </Text>

          <TextInput
            style={[
              styles.input,
              styles.multiline,
            ]}
            placeholder="Claim to research"
            placeholderTextColor={
              COLORS.textSecondary
            }
            value={claimText}
            onChangeText={
              setClaimText
            }
            editable={
              !isWalkthrough &&
              !startedAt &&
              !studyContext
            }
            multiline
            textAlignVertical="top"
            accessibilityLabel="Claim to research"
          />

          {!startedAt ? (
            <>
              <TextInput
                style={
                  styles.input
                }
                placeholder="Research-issued participant code (optional)"
                placeholderTextColor={
                  COLORS.textSecondary
                }
                value={
                  participantCode
                }
                onChangeText={
                  setParticipantCode
                }
                editable={
                  !isWalkthrough &&
                  !studyContext
                }
                autoCapitalize="characters"
                accessibilityLabel="Research-issued participant code"
              />

              <TouchableOpacity
                accessibilityRole="button"
                style={[
                  styles.primaryButton,
                  styles.startTaskButton,
                ]}
                onPress={
                  startTask
                }
                disabled={
                  isWalkthrough ||
                  isRestoring ||
                  isSubmitting
                }
              >
                <Text
                  style={
                    styles.primaryButtonText
                  }
                >
                  Start Task
                </Text>
              </TouchableOpacity>
            </>
          ) : (
            <Text
              style={
                styles.helper
              }
            >
              Started{' '}
              {new Date(
                startedAt,
              ).toLocaleTimeString()}
              {' · '}elapsed time is
              recorded when you finish.
            </Text>
          )}
        </View>

        {startedAt &&
        !hasSubmitted &&
        !recordIdToRetry ? (
          <>
            <View
              style={styles.card}
            >
              <Text
                style={
                  styles.sectionTitle
                }
              >
                Sources consulted
              </Text>

              <Text
                style={
                  styles.helper
                }
              >
                Opening a URL here
                records it
                automatically. You can
                also add websites you
                consulted outside the
                app.
              </Text>

              <TextInput
                style={
                  styles.input
                }
                placeholder="Source title or organization"
                placeholderTextColor={
                  COLORS.textSecondary
                }
                value={
                  sourceTitle
                }
                onChangeText={
                  setSourceTitle
                }
                accessibilityLabel="Source title"
              />

              <TextInput
                style={
                  styles.input
                }
                placeholder="https://example.com/article"
                placeholderTextColor={
                  COLORS.textSecondary
                }
                value={
                  sourceUrl
                }
                onChangeText={
                  setSourceUrl
                }
                autoCapitalize="none"
                keyboardType="url"
                accessibilityLabel="Source URL"
              />

              <View
                style={
                  styles.sourceActions
                }
              >
                <TouchableOpacity
                  accessibilityRole="button"
                  style={[
                    styles.secondaryButton,
                    styles.sourceActionButton,
                  ]}
                  onPress={() =>
                    void openSource()
                  }
                >
                  <Text
                    style={
                      styles.secondaryButtonText
                    }
                  >
                    Open URL
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  accessibilityRole="button"
                  style={[
                    styles.primaryButton,
                    styles.sourceActionButton,
                  ]}
                  onPress={
                    addConsultedSource
                  }
                >
                  <Text
                    style={
                      styles.primaryButtonText
                    }
                  >
                    Add Consulted Source
                  </Text>
                </TouchableOpacity>
              </View>

              {sources.map(
                (
                  source,
                  index,
                ) => (
                  <View
                    key={`${source.url}-${index}`}
                    style={
                      styles.sourceRow
                    }
                  >
                    <View
                      style={
                        styles.sourceCopy
                      }
                    >
                      <Text
                        style={
                          styles.sourceTitle
                        }
                      >
                        {
                          source.title
                        }
                      </Text>
                    </View>

                    <TouchableOpacity
                      accessibilityRole="button"
                      accessibilityLabel={`Remove ${source.title}`}
                      disabled={
                        isSubmitting ||
                        Boolean(
                          recordIdToRetry,
                        )
                      }
                      onPress={() =>
                        setSources(
                          current =>
                            current.filter(
                              (
                                _,
                                sourceIndex,
                              ) =>
                                sourceIndex !==
                                index,
                            ),
                        )
                      }
                    >
                      <Ionicons
                        name="close-circle-outline"
                        size={22}
                        color={
                          COLORS.red
                        }
                      />
                    </TouchableOpacity>
                  </View>
                ),
              )}

              <Text
                style={
                  styles.helper
                }
              >
                {sources.length}{' '}
                source(s) recorded. If
                you did not consult any
                sources, leave the list
                empty.
              </Text>
            </View>

            <View
              style={styles.card}
            >
              <Text
                style={
                  styles.sectionTitle
                }
              >
                Your final decision
              </Text>

              <Text
                style={
                  styles.helper
                }
              >
                Choose your own
                decision after
                researching the claim.
              </Text>

              <View
                style={
                  styles.verdicts
                }
              >
                {VERDICTS.map(
                  option => (
                    <TouchableOpacity
                      key={
                        option.value
                      }
                      accessibilityRole="button"
                      style={[
                        styles.verdictButton,
                        decision ===
                          option.value &&
                          styles.verdictSelected,
                      ]}
                      onPress={() =>
                        chooseVerdict(
                          option.value,
                        )
                      }
                    >
                      <Text
                        style={[
                          styles.verdictText,
                          decision ===
                            option.value &&
                            styles.verdictTextSelected,
                        ]}
                      >
                        {
                          option.label
                        }
                      </Text>
                    </TouchableOpacity>
                  ),
                )}
              </View>
            </View>
          </>
        ) : null}

        {error ? (
          <Text
            accessibilityRole="alert"
            style={
              styles.error
            }
          >
            {error}
          </Text>
        ) : null}

        {status ? (
          <Text
            accessibilityRole="alert"
            style={
              styles.status
            }
          >
            {status}
          </Text>
        ) : null}

        {recordIdToRetry &&
        !hasSubmitted ? (
          <TouchableOpacity
            accessibilityRole="button"
            style={
              styles.primaryButton
            }
            disabled={
              isSubmitting
            }
            onPress={() =>
              void retrySubmission()
            }
          >
            <Text
              style={
                styles.primaryButtonText
              }
            >
              {isSubmitting
                ? 'Retrying saved decision…'
                : 'Retry Saved Submission'}
            </Text>
          </TouchableOpacity>
        ) : null}

        {hasSubmitted &&
        !studyContext ? (
          <View
            style={styles.card}
          >
            <Text
              style={
                styles.sectionTitle
              }
            >
              Browser task complete
            </Text>

            {localTrialNumber !==
            null ? (
              <Text
                style={
                  styles.helper
                }
              >
                Check{' '}
                {
                  localTrialNumber
                }
              </Text>
            ) : null}

            <Text
              style={
                styles.helper
              }
            >
              Your research decision
              has been saved. You can
              start a new task or
              return to Home.
            </Text>

            <TouchableOpacity
              accessibilityRole="button"
              style={[
                styles.secondaryButton,
                {
                  marginTop: 12,
                },
              ]}
              onPress={() =>
                void startAnotherTask()
              }
            >
              <Text
                style={
                  styles.secondaryButtonText
                }
              >
                Start Another Task
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              accessibilityRole="button"
              style={[
                styles.secondaryButton,
                {
                  marginTop: 8,
                },
              ]}
              onPress={() =>
                navigation.navigate(
                  'Home',
                )
              }
            >
              <Text
                style={
                  styles.secondaryButtonText
                }
              >
                Return to Home
              </Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {hasSubmitted &&
        studyContext ? (
          <View
            style={styles.card}
          >
            <Text
              style={
                styles.sectionTitle
              }
            >
              Browser trial complete
            </Text>

            <Text
              style={
                styles.helper
              }
            >
              Trial{' '}
              {
                studyContext.trialIndex
              }
            </Text>

            <Text
              style={
                styles.helper
              }
            >
              Your browser comparison
              decision has been saved.
              Continue to the next
              study instruction.
            </Text>

            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Continue study"
              style={[
                styles.secondaryButton,
                {
                  marginTop: 12,
                },
              ]}
              onPress={() =>
                navigation.reset({
                  index: 0,
                  routes: [
                    {
                      name:
                        'StudyFlow',
                      params: {
                        participantId:
                          studyContext.participantId,

                        conditionOrder:
                          studyContext.conditionOrder,

                        completedTrialIndex:
                          studyContext.trialIndex,
                      },
                    },
                  ],
                })
              }
            >
              <Text
                style={
                  styles.secondaryButtonText
                }
              >
                Continue Study
              </Text>
            </TouchableOpacity>
          </View>
        ) : null}

        <TouchableOpacity
          accessibilityRole="button"
          style={
            styles.exportButton
          }
          disabled={
            isWalkthrough
          }
          onPress={() =>
            void exportRecords()
          }
        >
          <Ionicons
            name="download-outline"
            size={19}
            color={
              COLORS.blue
            }
          />

          <Text
            style={
              styles.exportText
            }
          >
            Export Local Evaluation
            JSON
          </Text>
        </TouchableOpacity>
      </ScrollView>

      <SharingIntentionModal
        visible={
          isSharingModalVisible
        }
        isSubmitting={
          isSubmitting
        }
        onSelect={
          intention =>
            void recordIntention(
              intention,
            )
        }
      />
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
      backgroundColor:
        COLORS.background,
    },

    content: {
      padding: 20,
      paddingBottom: 36,
      rowGap: 14,
    },

    header: {
      flexDirection: 'row',
      alignItems: 'center',
      columnGap: 12,
    },

    backButton: {
      width: 40,
      height: 40,
      justifyContent:
        'center',
    },

    headerCopy: {
      flex: 1,
    },

    title: {
      color:
        COLORS.textPrimary,
      fontSize: 24,
      fontWeight: '800',
    },

    subtitle: {
      marginTop: 3,
      color:
        COLORS.textSecondary,
      fontSize: 13,
    },

    notice: {
      borderRadius: 13,
      backgroundColor:
        COLORS.blueLight,
      padding: 14,
    },

    noticeText: {
      color:
        COLORS.textPrimary,
      fontSize: 13,
      lineHeight: 19,
    },

    card: {
      borderRadius: 18,
      backgroundColor:
        COLORS.surface,
      padding: 16,
    },

    sectionTitle: {
      marginBottom: 10,
      color:
        COLORS.textPrimary,
      fontSize: 17,
      fontWeight: '800',
    },

    helper: {
      marginTop: 6,
      color:
        COLORS.textSecondary,
      fontSize: 13,
      lineHeight: 19,
    },

    input: {
      minHeight: 48,
      marginTop: 10,
      borderWidth: 1,
      borderColor:
        COLORS.border,
      borderRadius: 12,
      backgroundColor:
        COLORS.surface,
      paddingHorizontal: 13,
      color:
        COLORS.textPrimary,
    },

    multiline: {
      minHeight: 88,
      paddingTop: 12,
    },

    primaryButton: {
      minHeight: 45,
      alignItems: 'center',
      justifyContent:
        'center',
      borderRadius: 12,
      backgroundColor:
        COLORS.blue,
      paddingHorizontal: 14,
    },

    startTaskButton: {
      marginTop: 14,
    },

    walkthroughHomeButton: {
      minHeight: 45,
      marginTop: 12,
      alignItems: 'center',
      justifyContent:
        'center',
      borderRadius: 12,
      backgroundColor:
        COLORS.blue,
    },

    walkthroughSkip: {
      minHeight: 40,
      alignItems: 'center',
      justifyContent:
        'center',
      marginTop: 4,
    },

    primaryButtonText: {
      color:
        COLORS.white,
      fontSize: 13,
      fontWeight: '700',
    },

    secondaryButton: {
      minHeight: 44,
      alignItems: 'center',
      justifyContent:
        'center',
      borderWidth: 1,
      borderColor:
        COLORS.border,
      borderRadius: 12,
      backgroundColor:
        COLORS.surface,
      paddingHorizontal: 14,
    },

    secondaryButtonText: {
      color:
        COLORS.textPrimary,
      fontSize: 13,
      fontWeight: '700',
    },

    sourceActions: {
      flexDirection: 'row',
      columnGap: 8,
      marginTop: 10,
    },

    sourceActionButton: {
      flex: 1,
      paddingHorizontal: 8,
    },

    sourceRow: {
      flexDirection: 'row',
      alignItems: 'center',
      columnGap: 10,
      marginTop: 12,
      borderTopWidth: 1,
      borderTopColor:
        COLORS.border,
      paddingTop: 12,
    },

    sourceCopy: {
      flex: 1,
    },

    sourceTitle: {
      color:
        COLORS.textPrimary,
      fontSize: 13,
      fontWeight: '700',
    },

    verdicts: {
      flexDirection: 'row',
      columnGap: 8,
      marginTop: 14,
    },

    verdictButton: {
      flex: 1,
      minHeight: 45,
      alignItems: 'center',
      justifyContent:
        'center',
      borderWidth: 1,
      borderColor:
        COLORS.border,
      borderRadius: 12,
      paddingHorizontal: 3,
    },

    verdictSelected: {
      borderColor:
        COLORS.blue,
      backgroundColor:
        COLORS.blue,
    },

    verdictText: {
      color:
        COLORS.textPrimary,
      fontSize: 12,
      fontWeight: '700',
    },

    verdictTextSelected: {
      color:
        COLORS.white,
    },

    error: {
      color: COLORS.red,
      fontSize: 13,
      lineHeight: 18,
    },

    status: {
      color:
        COLORS.textPrimary,
      fontSize: 13,
      lineHeight: 19,
    },

    exportButton: {
      minHeight: 46,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent:
        'center',
      columnGap: 8,
      borderWidth: 1,
      borderColor:
        COLORS.border,
      borderRadius: 12,
      backgroundColor:
        COLORS.surface,
    },

    exportText: {
      color:
        COLORS.blue,
      fontSize: 13,
      fontWeight: '700',
    },
  });