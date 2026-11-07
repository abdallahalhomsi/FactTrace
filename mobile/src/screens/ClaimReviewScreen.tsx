
import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
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

import {
  RootStackParamList,
  StudyTrialContext,
} from '../navigation/types';
import { COLORS } from '../constants/app';
import { verifyClaim } from '../services/verificationService';
import { extractTextFromImage } from '../services/ocrService';
import { createHistoryEntryId } from '../services/historyService';
import { PRACTICE_RESULT } from '../services/walkthroughData';
import WalkthroughOverlay from '../components/WalkthroughOverlay';

import {
  getWalkthroughState,
  PRACTICE_CLAIM,
  saveWalkthroughState,
  type WalkthroughStep,
} from '../services/walkthroughService';

import {
  ApiResponse,
  BackendOcrResult,
  OcrResponse,
} from '../types/api';

type Props = NativeStackScreenProps<
  RootStackParamList,
  'ClaimReview'
>;

function getVerificationErrorMessage(message: string): string {
  if (/failed to fetch|network request failed|networkerror/i.test(message)) {
    const apiBaseUrl =
      process.env.EXPO_PUBLIC_API_BASE_URL?.trim() ||
      (Platform.OS === 'web' ? 'http://localhost:3000' : null);

    return `FactTrace could not reach ${
      apiBaseUrl ?? 'the configured backend'
    }${
      apiBaseUrl ? '/api/verify' : ''
    }. Start the backend with “npm run dev” in the backend folder, check EXPO_PUBLIC_API_BASE_URL, then try again.`;
  }

  return message;
}

function getApiErrorMessage(
  error: ApiResponse<unknown>['error'],
  fallback: string,
): string {
  if (typeof error === 'string') {
    return error;
  }

  return error?.message ?? fallback;
}

function isPracticeClaim(value: string): boolean {
  const normalize = (text: string) =>
    text
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/[.!?;:,]+$/, '')
      .toLowerCase();

  return normalize(value) === normalize(PRACTICE_CLAIM);
}

export default function ClaimReviewScreen({
  navigation,
  route,
}: Props) {
  const imageUri = route.params?.imageUri;
  const studyContext = route.params?.studyContext;

  // Tutorial practice is completely separate from official study trials.
  const isWalkthrough =
    Boolean(route.params?.walkthrough) && !studyContext;

  // For manual entry in an assigned trial, show the actual assigned claim.
  // Camera OCR still runs and fills the editable text field normally.
  const initialClaim = isWalkthrough
    ? ''
    : route.params?.claimText ||
      (!imageUri ? studyContext?.claimText : '') ||
      '';

  const [claimText, setClaimText] = useState(initialClaim);

  const [walkthroughStep, setWalkthroughStep] =
    useState<WalkthroughStep | null>(
      isWalkthrough ? 'practice_claim' : null,
    );
  const [practicePromptFeedback, setPracticePromptFeedback] =
    useState<string | null>(null);
  const [measurementVersion, setMeasurementVersion] = useState(0);

  const [isChecking, setIsChecking] = useState(false);

  const [verificationError, setVerificationError] =
    useState<string | null>(null);

  const [isExtracting, setIsExtracting] = useState(false);
  const [ocrError, setOcrError] = useState<string | null>(null);

  const [originalOcrText, setOriginalOcrText] =
    useState<string | undefined>();

  const [ocrMetadata, setOcrMetadata] =
    useState<OcrResponse['data'] | null>(null);

  const [ocrErrorCode, setOcrErrorCode] =
    useState<BackendOcrResult['error']>(null);

  const taskStartedAt = useRef(
    studyContext?.startedAt ?? new Date().toISOString(),
  );

  const walkthroughReady = useRef(false);
  const claimTextRef = useRef(initialClaim);
  const scrollViewRef = useRef<ScrollViewInstance>(null);
  const inputTargetRef = useRef<ViewInstance>(null);
  const checkButtonRef = useRef<ViewInstance>(null);
  const scrollOffset = useRef(0);
  const { height: windowHeight } = useWindowDimensions();

  const revealCheckButton = useCallback(() => {
    requestAnimationFrame(() => {
      checkButtonRef.current?.measureInWindow((_x, y, _width, buttonHeight) => {
        const visibleBottom = windowHeight - 80;
        const overflow = y + buttonHeight - visibleBottom;

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

  /*
    WALKTHROUGH PROGRESS

    Restore the practice claim only once.

    The user remains in control of the text field. A correct claim
    advances the spotlight to the Check Evidence button.
  */
  useEffect(() => {
    if (!isWalkthrough) return;

    let active = true;

    void getWalkthroughState()
      .then(savedState => {
        if (!active) return;

        const savedClaim =
          savedState?.status === 'in_progress'
            ? savedState.practiceClaim ?? ''
            : '';

        const claimAlreadyTyped = claimTextRef.current.length > 0;
        const restoredClaim = claimAlreadyTyped
          ? claimTextRef.current
          : savedClaim;
        const validSavedClaim = isPracticeClaim(restoredClaim);

        claimTextRef.current = restoredClaim;
        setClaimText(restoredClaim);

        setWalkthroughStep('practice_claim');

        walkthroughReady.current = true;
        if (claimAlreadyTyped) {
          void saveWalkthroughState({
            status: 'in_progress',
            step: 'practice_claim',
            practiceClaim: restoredClaim,
          }).catch(error => {
            console.warn('Could not save practice claim progress.', error);
          });
        }

        if (
          savedState?.status === 'in_progress' &&
          savedState.step === 'practice_pending' &&
          validSavedClaim
        ) {
          void saveWalkthroughState({
            status: 'in_progress',
            step: 'result_match',
            practiceClaim: savedClaim,
          })
            .then(() => {
              if (active) {
                navigation.replace('VerificationResults', {
                  result: PRACTICE_RESULT,
                  walkthrough: true,
                });
              }
            })
            .catch(error => {
              console.warn(
                'Could not resume practice results.',
                error,
              );

              if (active) {
                setVerificationError(
                  'Could not resume the practice results. Please try again.',
                );
              }
            });
        }
      })
      .catch(error => {
        console.warn(
          'Could not restore walkthrough progress.',
          error,
        );

        if (active) {
          setVerificationError(
            'Walkthrough progress could not be restored. You can skip and continue normally.',
          );

          walkthroughReady.current = true;
        }
      });

    return () => {
      active = false;
    };
  }, [isWalkthrough, navigation, revealCheckButton]);

  useEffect(() => {
    if (!isWalkthrough) return;

    const showSubscription = Keyboard.addListener(
      'keyboardDidShow',
      () => setMeasurementVersion(version => version + 1),
    );
    const hideSubscription = Keyboard.addListener(
      'keyboardDidHide',
      () => {
        if (walkthroughStep === 'practice_check') {
          revealCheckButton();
        } else {
          setMeasurementVersion(version => version + 1);
        }
      },
    );

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, [isWalkthrough, revealCheckButton, walkthroughStep]);

  /*
    CLAIM TEXT

    In walkthrough mode:
    - The user types the claim themselves.
    - Text is saved locally as walkthrough progress.
    - No real verification is performed.
    - A valid sample claim advances focus to Check Evidence.
  */
  const handlePracticeClaimChange = (value: string) => {
    claimTextRef.current = value;
    setClaimText(value);
    setVerificationError(null);
    setPracticePromptFeedback(null);

    if (!isWalkthrough || !walkthroughReady.current) {
      return;
    }

    setWalkthroughStep('practice_claim');

    void saveWalkthroughState({
      status: 'in_progress',
      step: 'practice_claim',
      practiceClaim: value,
    }).catch(error => {
      console.warn(
        'Could not save practice claim progress.',
        error,
      );

      setVerificationError(
        'Walkthrough progress could not be saved. Please try again.',
      );
    });

  };

  const continuePractice = async () => {
    await handleCheckEvidence();
  };

  /*
    SKIP WALKTHROUGH

    Only walkthrough status is changed.
    No real evaluation, history, or study data is touched.
  */
  const skipWalkthrough = async () => {
    try {
      Keyboard.dismiss();

      await saveWalkthroughState({
        status: 'skipped',
      });

      navigation.reset({
        index: 0,
        routes: [{ name: 'Home' }],
      });
    } catch (error) {
      console.warn(
        'Could not skip walkthrough.',
        error,
      );

      setVerificationError(
        'The walkthrough could not be skipped because its status could not be saved.',
      );
    }
  };

  const activeStudyContext:
    | StudyTrialContext
    | undefined = studyContext
    ? {
        ...studyContext,
        startedAt: taskStartedAt.current,
      }
    : undefined;

  const isFromCamera = Boolean(imageUri);
  const hasOcrText = Boolean(originalOcrText?.trim());

  /*
    OCR RESPONSE

    Preserve the original OCR handling for normal camera checks.
  */
  const applyOcrResponse = (response: OcrResponse) => {
    setOcrMetadata(response.data ?? null);

    setOcrErrorCode(
      response.data?.ocrError ??
        (response.success ? null : 'OCR_FAILED'),
    );

    setOriginalOcrText(
      response.data?.extractedText || undefined,
    );

    if (
      response.success &&
      response.data?.extractedText
    ) {
      setClaimText(response.data.extractedText);

      setOcrError(
        response.data.ocrError === 'PARTIAL'
          ? 'Some text may be incomplete. Review and correct it before verifying.'
          : null,
      );

      return;
    }

    setOcrError(
      getApiErrorMessage(
        response.error,
        'No readable text was detected. You can enter the claim manually.',
      ),
    );
  };

  /*
    AUTOMATIC OCR

    When CameraScreen passes an imageUri,
    run OCR automatically and populate
    the editable text field.
  */
  useEffect(() => {
    if (!imageUri || isWalkthrough) return;

    let active = true;

    const runOcr = async () => {
      setIsExtracting(true);
      setOcrError(null);

      try {
        const response = await extractTextFromImage(imageUri);

        if (active) {
          applyOcrResponse(response);
        }
      } catch (error) {
        console.warn('OCR error:', error);

        if (active) {
          setOcrError(
            'FactTrace could not extract text from this image.',
          );
        }
      } finally {
        if (active) {
          setIsExtracting(false);
        }
      }
    };

    void runOcr();

    return () => {
      active = false;
    };
  }, [imageUri, isWalkthrough]);

  /*
    RETRY OCR
  */
  const handleRetryOcr = async () => {
    if (
      !imageUri ||
      isExtracting ||
      isWalkthrough
    ) {
      return;
    }

    setIsExtracting(true);
    setOcrError(null);

    try {
      const response = await extractTextFromImage(imageUri);
      applyOcrResponse(response);
    } catch (error) {
      console.warn('OCR retry error:', error);

      setOcrError(
        'FactTrace could not extract text from this image.',
      );
    } finally {
      setIsExtracting(false);
    }
  };

  /*
    CHECK EVIDENCE

    WALKTHROUGH:
    Open controlled practice results only.

    NORMAL MODE:
    Preserve the existing backend verification and evaluation context.
  */
  const handleCheckEvidence = async () => {
    const submittedClaim = isWalkthrough
      ? claimTextRef.current
      : claimText;
    const cleanedClaim = submittedClaim.trim();

    if (
      !cleanedClaim ||
      isChecking ||
      isExtracting
    ) {
      return;
    }

    if (isWalkthrough) {
      if (!isPracticeClaim(cleanedClaim)) {
        setPracticePromptFeedback(
          'Enter the honey practice claim shown above, then tap Continue.',
        );
        return;
      }

      try {
        Keyboard.dismiss();

        await saveWalkthroughState({
          status: 'in_progress',
          step: 'result_match',
          practiceClaim: submittedClaim,
        });

        navigation.navigate('VerificationResults', {
          result: PRACTICE_RESULT,
          walkthrough: true,
        });
      } catch (error) {
        console.warn(
          'Could not save practice completion state.',
          error,
        );

        setVerificationError(
          'The practice step could not be saved. Please try again.',
        );
      }

      return;
    }

    // Normal verification
    setVerificationError(null);

    try {
      setIsChecking(true);

      const response = await verifyClaim(cleanedClaim, {
        source: hasOcrText ? 'ocr' : 'manual',
        ...(hasOcrText
          ? {
              originalOcrText,
              ocrConfidence: ocrMetadata?.confidence,
            }
          : {}),
      });

      if (!response.success || !response.data) {
        setVerificationError(
          getVerificationErrorMessage(
            response.message ||
              getApiErrorMessage(
                response.error,
                'FactTrace could not check this claim. Please try again.',
              ),
          ),
        );

        return;
      }

      if (
        activeStudyContext &&
        response.data.claimId &&
        response.data.claimId !== activeStudyContext.claimId
      ) {
        setVerificationError(
          'This result matched a different claim than the one assigned for this trial. Check the scanned or entered wording before continuing.',
        );

        return;
      }

      navigation.navigate('VerificationResults', {
        result: response.data,

        ...(activeStudyContext
          ? {
              studyContext: activeStudyContext,
            }
          : {}),

        historyEntryId: createHistoryEntryId(),

        evaluation: {
          inputSource: hasOcrText ? 'ocr' : 'manual',

          ...(hasOcrText
            ? {
                originalOcrText,
                ocrEngine: ocrMetadata?.engine,
                ocrError: ocrErrorCode,
              }
            : {}),

          startedAt: taskStartedAt.current,
        },
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'FactTrace could not check the claim.';

      setVerificationError(
        getVerificationErrorMessage(message),
      );
    } finally {
      setIsChecking(false);
    }
  };

  const buttonDisabled =
    !claimText.trim() ||
    isChecking ||
    isExtracting ||
    (isWalkthrough && !isPracticeClaim(claimText));

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={
          Platform.OS === 'ios'
            ? 'padding'
            : undefined
        }
      >
        <ScrollView
          ref={scrollViewRef}
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          scrollEventThrottle={16}
          onScroll={event => {
            scrollOffset.current = event.nativeEvent.contentOffset.y;
            setMeasurementVersion(version => version + 1);
          }}
        >
          {/* HEADER */}
          <View style={styles.header}>
            <TouchableOpacity
              activeOpacity={0.8}
              style={styles.backButton}
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
                Review Claim
              </Text>

              <Text style={styles.headerSubtitle}>
                Make sure the extracted text is correct
              </Text>
            </View>

            <View style={styles.headerSpacer} />
          </View>

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
              <View style={styles.progressCurrent}>
                <Text style={styles.progressCurrentNumber}>
                  2
                </Text>
              </View>

              <Text style={styles.progressCurrentText}>
                Review
              </Text>
            </View>

            <View style={styles.progressLine} />

            <View style={styles.progressItem}>
              <View style={styles.progressInactive}>
                <Text style={styles.progressInactiveNumber}>
                  3
                </Text>
              </View>

              <Text style={styles.progressInactiveText}>
                Evidence
              </Text>
            </View>
          </View>

          {/* CAPTURED IMAGE */}
          {isFromCamera && (
            <View style={styles.imageCard}>
              <Image
                source={{ uri: imageUri }}
                style={styles.image}
                resizeMode="cover"
              />

              <View style={styles.imageOverlay}>
                <View style={styles.capturedBadge}>
                  <Ionicons
                    name="camera-outline"
                    size={15}
                    color={COLORS.white}
                  />

                  <Text style={styles.capturedBadgeText}>
                    CAPTURED CLAIM
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                activeOpacity={0.8}
                style={styles.retakeButton}
                onPress={() =>
                  navigation.replace(
                    'Camera',
                    activeStudyContext
                      ? {
                          studyContext: activeStudyContext,
                        }
                      : undefined,
                  )
                }
              >
                <Ionicons
                  name="camera-reverse-outline"
                  size={19}
                  color={COLORS.textPrimary}
                />

                <Text style={styles.retakeText}>
                  Retake
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* OCR STATUS */}
          <View style={styles.statusCard}>
            <View style={styles.statusIcon}>
              {isExtracting ? (
                <ActivityIndicator
                  size="small"
                  color={COLORS.blue}
                />
              ) : (
                <Ionicons
                  name={
                    isFromCamera
                      ? 'document-text-outline'
                      : 'create-outline'
                  }
                  size={22}
                  color={COLORS.blue}
                />
              )}
            </View>

            <View style={styles.statusTextArea}>
              <Text style={styles.statusTitle}>
                {isExtracting
                  ? 'Extracting text...'
                  : isFromCamera
                    ? 'Extracted text'
                    : 'Enter your claim'}
              </Text>

              <Text style={styles.statusDescription}>
                {isExtracting
                  ? 'FactTrace is reading the claim from your captured image.'
                  : isFromCamera
                    ? 'Review the text below and correct anything the scan may have captured incorrectly.'
                    : 'Type or paste the exact claim you want to check.'}
              </Text>
            </View>

            <View style={styles.statusBadge}>
              <View
                style={[
                  styles.statusDot,
                  ocrError && styles.statusDotError,
                  isExtracting && styles.statusDotLoading,
                ]}
              />

              <Text style={styles.statusBadgeText}>
                {isFromCamera ? 'OCR' : 'MANUAL'}
              </Text>
            </View>
          </View>

          {/* OCR ERROR */}
          {ocrError && (
            <View style={styles.ocrErrorCard}>
              <View style={styles.ocrErrorIcon}>
                <Ionicons
                  name="alert-circle-outline"
                  size={21}
                  color="#C15B34"
                />
              </View>

              <View style={styles.ocrErrorTextArea}>
                <Text style={styles.ocrErrorTitle}>
                  {ocrErrorCode === 'PARTIAL' && hasOcrText
                    ? 'Text may be incomplete'
                    : 'Text extraction failed'}
                </Text>

                <Text style={styles.ocrErrorText}>
                  {ocrError}
                </Text>
              </View>

              <TouchableOpacity
                activeOpacity={0.8}
                style={styles.retryButton}
                onPress={() => void handleRetryOcr()}
              >
                <Text style={styles.retryButtonText}>
                  Retry
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* EDITOR */}
          <View style={styles.editorSection}>
            <View style={styles.editorHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.sectionLabel}>
                  {isFromCamera
                    ? 'EXTRACTED CLAIM TEXT'
                    : 'CLAIM TEXT'}
                </Text>

                <Text style={styles.editorHint}>
                  {isFromCamera
                    ? 'Make sure this matches the claim shown in the photo'
                    : 'Enter the wording as accurately as possible'}
                </Text>
              </View>

              {claimText.length > 0 && !isExtracting && (
                <TouchableOpacity
                  activeOpacity={0.75}
                  style={styles.clearButton}
                  onPress={() =>
                    handlePracticeClaimChange('')
                  }
                >
                  <Text style={styles.clearText}>
                    Clear
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            <View
              ref={inputTargetRef}
              collapsable={false}
              onLayout={() =>
                setMeasurementVersion(version => version + 1)
              }
              style={styles.textInputCard}
            >
              {isExtracting ? (
                <View style={styles.extractingArea}>
                  <ActivityIndicator
                    size="large"
                    color={COLORS.blue}
                  />

                  <Text style={styles.extractingTitle}>
                    Reading your claim
                  </Text>

                  <Text style={styles.extractingText}>
                    Extracting readable text from the captured image...
                  </Text>
                </View>
              ) : (
                <>
                  <TextInput
                    style={styles.textInput}
                    value={claimText}
                    onChangeText={handlePracticeClaimChange}
                    placeholder={
                      isFromCamera
                        ? 'Extracted text will appear here...'
                        : 'Type or paste your claim here...'
                    }
                    placeholderTextColor="#A2ADBA"
                    multiline
                    textAlignVertical="top"
                    maxLength={800}
                  />

                  <View style={styles.inputFooter}>
                    <View style={styles.editableRow}>
                      <Ionicons
                        name="create-outline"
                        size={15}
                        color={COLORS.textMuted}
                      />

                      <Text style={styles.editableText}>
                        Tap to edit
                      </Text>
                    </View>

                    <Text style={styles.characterCount}>
                      {claimText.length}/800
                    </Text>
                  </View>
                </>
              )}
            </View>
          </View>

          {/* NOTE */}
          <View style={styles.noteCard}>
            <View style={styles.noteIcon}>
              <Ionicons
                name="information-circle-outline"
                size={21}
                color="#B96800"
              />
            </View>

            <View style={styles.noteContent}>
              <Text style={styles.noteTitle}>
                Check the text
              </Text>

              <Text style={styles.noteText}>
                Correct any mistakes before continuing.
              </Text>
            </View>
          </View>

          {/* CHECK EVIDENCE */}
          <View
            ref={checkButtonRef}
            collapsable={false}
            onLayout={() =>
              setMeasurementVersion(version => version + 1)
            }
          >
            <TouchableOpacity
              activeOpacity={0.88}
              disabled={buttonDisabled}
              style={[
                styles.verifyWrapper,
                buttonDisabled && styles.verifyWrapperDisabled,
              ]}
              onPress={() => void handleCheckEvidence()}
            >
              <LinearGradient
                colors={
                  !buttonDisabled
                    ? ['#3478F6', '#2563EB']
                    : ['#AEBAC8', '#9FAAB7']
                }
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.verifyButton}
              >
                <View style={styles.verifyIcon}>
                  {isChecking ? (
                    <ActivityIndicator
                      size="small"
                      color={COLORS.white}
                    />
                  ) : (
                    <Ionicons
                      name="search-outline"
                      size={23}
                      color={COLORS.white}
                    />
                  )}
                </View>

                <View style={styles.verifyTextArea}>
                  <Text style={styles.verifyTitle}>
                    {isChecking
                      ? 'Checking Evidence...'
                      : isExtracting
                        ? 'Extracting Text...'
                        : 'Check Evidence'}
                  </Text>

                  <Text style={styles.verifySubtitle}>
                    {isChecking
                      ? 'Looking for relevant sources'
                      : isExtracting
                        ? 'Finish OCR before checking evidence'
                        : 'Find relevant evidence for this claim'}
                  </Text>
                </View>

                {!isChecking && !isExtracting && (
                  <Ionicons
                    name="arrow-forward"
                    size={22}
                    color={COLORS.white}
                  />
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* VERIFICATION ERROR */}
          {verificationError ? (
            <View
              accessibilityRole="alert"
              style={styles.verificationErrorCard}
            >
              <Ionicons
                name="alert-circle-outline"
                size={21}
                color={COLORS.red}
              />

              <View style={styles.verificationErrorContent}>
                <Text style={styles.verificationErrorTitle}>
                  Could not check evidence
                </Text>

                <Text style={styles.verificationErrorText}>
                  {verificationError}
                </Text>

                <TouchableOpacity
                  accessibilityRole="button"
                  disabled={buttonDisabled}
                  onPress={() => void handleCheckEvidence()}
                >
                  <Text style={styles.verificationRetryText}>
                    Try Again
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
      {isWalkthrough &&
      (walkthroughStep === 'practice_claim' ||
        walkthroughStep === 'practice_check') ? (
        <WalkthroughOverlay
          mode="spotlight"
          step={walkthroughStep}
          targetRef={
            walkthroughStep === 'practice_check'
              ? checkButtonRef
              : inputTargetRef
          }
          measurementVersion={measurementVersion}
          title={
            walkthroughStep === 'practice_check'
              ? 'Now check the practice claim'
              : 'Type the practice claim'
          }
          message={
            walkthroughStep === 'practice_check'
              ? 'Your claim is ready. Tap Continue to open the practice results, or tap the highlighted Check Evidence button.'
              : `${practicePromptFeedback ?? 'Type this practice claim:'}\n"${PRACTICE_CLAIM}"`
          }
          onContinue={() => void continuePractice()}
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

  keyboardView: {
    flex: 1,
  },

  scrollView: {
    flex: 1,
  },

  scrollContent: {
    paddingHorizontal: 22,
    paddingBottom: 35,
  },

  /* HEADER */

  header: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },

  backButton: {
    width: 45,
    height: 45,
    borderRadius: 15,
    backgroundColor: COLORS.white,
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

  headerSpacer: {
    width: 45,
  },

  /* PROGRESS */

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
    backgroundColor: '#3C78F2',
    alignItems: 'center',
    justifyContent: 'center',
  },

  progressCurrent: {
    width: 29,
    height: 29,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: COLORS.blue,
    backgroundColor: '#EAF1FF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  progressInactive: {
    width: 29,
    height: 29,
    borderRadius: 15,
    backgroundColor: '#E8EDF3',
    alignItems: 'center',
    justifyContent: 'center',
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

  progressInactiveText: {
    marginTop: 4,
    color: COLORS.textMuted,
    fontSize: 10,
    fontWeight: '600',
  },

  progressCurrentNumber: {
    color: COLORS.blue,
    fontSize: 12,
    fontWeight: '800',
  },

  progressInactiveNumber: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: '700',
  },

  progressLine: {
    flex: 1,
    height: 2,
    backgroundColor: '#DFE5EC',
    marginHorizontal: 7,
    marginBottom: 15,
  },

  progressLineActive: {
    flex: 1,
    height: 2,
    backgroundColor: COLORS.blue,
    marginHorizontal: 7,
    marginBottom: 15,
  },

  /* CAPTURED IMAGE */

  imageCard: {
    marginTop: 22,
    height: 185,
    borderRadius: 22,
    overflow: 'hidden',
    backgroundColor: '#DCE3EB',
    shadowColor: '#18334E',
    shadowOpacity: 0.12,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 5 },
    elevation: 4,
  },

  image: {
    width: '100%',
    height: '100%',
  },

  imageOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    padding: 12,
    flexDirection: 'row',
  },

  capturedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(8, 25, 43, 0.72)',
    borderRadius: 10,
    paddingHorizontal: 9,
    paddingVertical: 6,
  },

  capturedBadgeText: {
    marginLeft: 5,
    color: COLORS.white,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.6,
  },

  retakeButton: {
    position: 'absolute',
    right: 12,
    bottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 11,
    paddingHorizontal: 11,
    paddingVertical: 8,
  },

  retakeText: {
    marginLeft: 5,
    color: COLORS.textPrimary,
    fontSize: 11.5,
    fontWeight: '700',
  },

  /* STATUS */

  statusCard: {
    marginTop: 18,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF4FB',
    borderRadius: 16,
    paddingHorizontal: 13,
    paddingVertical: 12,
  },

  statusIcon: {
    width: 41,
    height: 41,
    borderRadius: 12,
    backgroundColor: '#E0EBFA',
    alignItems: 'center',
    justifyContent: 'center',
  },

  statusTextArea: {
    flex: 1,
    marginLeft: 10,
  },

  statusTitle: {
    color: COLORS.textPrimary,
    fontSize: 13.5,
    fontWeight: '700',
  },

  statusDescription: {
    marginTop: 2,
    color: COLORS.textSecondary,
    fontSize: 10.5,
    lineHeight: 15,
  },

  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 9,
    backgroundColor: COLORS.white,
  },

  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#35B873',
    marginRight: 5,
  },

  statusDotError: {
    backgroundColor: '#D96C48',
  },

  statusDotLoading: {
    backgroundColor: '#5D8DEB',
  },

  statusBadgeText: {
    color: COLORS.textSecondary,
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 0.5,
  },

  /* OCR ERROR */

  ocrErrorCard: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 15,
    backgroundColor: '#FFF1EC',
    borderWidth: 1,
    borderColor: '#F2D0C3',
    padding: 11,
  },

  ocrErrorIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#FFE0D4',
    alignItems: 'center',
    justifyContent: 'center',
  },

  ocrErrorTextArea: {
    flex: 1,
    marginLeft: 9,
  },

  ocrErrorTitle: {
    color: '#8A422A',
    fontSize: 12,
    fontWeight: '700',
  },

  ocrErrorText: {
    marginTop: 2,
    color: '#A05D46',
    fontSize: 10.5,
    lineHeight: 14,
  },

  retryButton: {
    marginLeft: 8,
    backgroundColor: COLORS.white,
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 9,
  },

  retryButtonText: {
    color: '#C15B34',
    fontSize: 11,
    fontWeight: '700',
  },

  /* EDITOR */

  editorSection: {
    marginTop: 20,
  },

  editorHeader: {
    marginBottom: 9,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },

  sectionLabel: {
    color: COLORS.textPrimary,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.8,
  },

  editorHint: {
    marginTop: 3,
    color: COLORS.textMuted,
    fontSize: 10.5,
  },

  clearButton: {
    paddingHorizontal: 10,
    paddingVertical: 5,
  },

  clearText: {
    color: COLORS.blue,
    fontSize: 11.5,
    fontWeight: '700',
  },

  textInputCard: {
    minHeight: 175,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: '#DCE4ED',
    borderRadius: 18,
    padding: 14,
    shadowColor: '#18334E',
    shadowOpacity: 0.035,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 1,
  },

  textInput: {
    minHeight: 118,
    color: COLORS.textPrimary,
    fontSize: 16,
    lineHeight: 23,
    fontWeight: '500',
  },

  extractingArea: {
    minHeight: 145,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },

  extractingTitle: {
    marginTop: 12,
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: '700',
  },

  extractingText: {
    marginTop: 4,
    color: COLORS.textSecondary,
    fontSize: 11.5,
    lineHeight: 16,
    textAlign: 'center',
  },

  inputFooter: {
    marginTop: 7,
    paddingTop: 9,
    borderTopWidth: 1,
    borderTopColor: '#EDF1F5',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  editableRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  editableText: {
    marginLeft: 5,
    color: COLORS.textMuted,
    fontSize: 10,
  },

  characterCount: {
    color: COLORS.textMuted,
    fontSize: 10,
  },

  /* NOTE */

  noteCard: {
    marginTop: 15,
    flexDirection: 'row',
    borderRadius: 15,
    backgroundColor: '#FFF7E9',
    padding: 12,
    borderWidth: 1,
    borderColor: '#F5E4C3',
  },

  noteIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#FFEDCC',
    alignItems: 'center',
    justifyContent: 'center',
  },

  noteContent: {
    flex: 1,
    marginLeft: 10,
  },

  noteTitle: {
    color: '#7A4A0A',
    fontSize: 12.5,
    fontWeight: '700',
  },

  noteText: {
    marginTop: 3,
    color: '#956522',
    fontSize: 10.5,
    lineHeight: 14,
  },

  /* CHECK BUTTON */

  verifyWrapper: {
    marginTop: 20,
    shadowColor: COLORS.blue,
    shadowOpacity: 0.22,
    shadowRadius: 11,
    shadowOffset: { width: 0, height: 6 },
    elevation: 5,
  },

  verifyWrapperDisabled: {
    shadowOpacity: 0,
    elevation: 0,
  },

  verifyButton: {
    minHeight: 68,
    borderRadius: 18,
    paddingHorizontal: 15,
    flexDirection: 'row',
    alignItems: 'center',
  },

  verifyIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  verifyTextArea: {
    flex: 1,
    marginLeft: 11,
  },

  verifyTitle: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '700',
  },

  verifySubtitle: {
    marginTop: 3,
    color: '#DCE8FF',
    fontSize: 11,
  },

  /* VERIFICATION ERROR */

  verificationErrorCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    columnGap: 10,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#F3C6C3',
    borderRadius: 14,
    backgroundColor: '#FFF5F4',
    padding: 14,
  },

  verificationErrorContent: {
    flex: 1,
  },

  verificationErrorTitle: {
    color: COLORS.red,
    fontSize: 14,
    fontWeight: '700',
  },

  verificationErrorText: {
    marginTop: 4,
    color: '#713B38',
    fontSize: 13,
    lineHeight: 19,
  },

  verificationRetryText: {
    alignSelf: 'flex-start',
    marginTop: 10,
    color: COLORS.blue,
    fontSize: 13,
    fontWeight: '700',
  },
});
