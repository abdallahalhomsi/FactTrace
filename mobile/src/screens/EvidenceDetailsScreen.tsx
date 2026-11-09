import React, { useEffect, useRef, useState, useMemo } from 'react';

import {
  Alert,
  Linking,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type ScrollViewInstance,
  type ViewInstance,
} from 'react-native';

import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { RootStackParamList } from '../navigation/types';
import { ThemeColors } from '../constants/app';
import { useAppTheme } from '../theme/AppTheme';
import { EvidenceSource } from '../types/evidence';
import WalkthroughOverlay from '../components/WalkthroughOverlay';

import {
  getWalkthroughState,
  saveWalkthroughState,
} from '../services/walkthroughService';

import {
  recordEvidenceSourceOpened,
} from '../services/evidenceTrackingService';

type Props = NativeStackScreenProps<
  RootStackParamList,
  'EvidenceDetails'
>;

type TourStep = 'evidence_details' | 'evidence_return';

export default function EvidenceDetailsScreen({
  navigation,
  route,
}: Props) {
  const { colors: COLORS, isDark } = useAppTheme();

  const styles = useMemo(
    () => createStyles(COLORS, isDark),
    [COLORS, isDark],
  );

  const result = route.params?.result;
  const sourceId = route.params?.sourceId;
  const evidenceTrackingKey = route.params?.evidenceTrackingKey;

  const isWalkthrough =
    Boolean(route.params?.walkthrough) &&
    !route.params?.studyContext;

  const [tourStep, setTourStep] =
    useState<TourStep>('evidence_details');

  const scrollRef = useRef<ScrollViewInstance>(null);
  const practiceEvidenceRef = useRef<ViewInstance>(null);
  const backToResultsRef = useRef<ViewInstance>(null);
  const [measurementVersion, setMeasurementVersion] = useState(0);

  const allSources = result?.evidence ?? [];

  const selectedSource = sourceId
    ? allSources.find(source => source.id === sourceId)
    : undefined;

  const displayedSources: EvidenceSource[] = selectedSource
    ? [selectedSource]
    : allSources;

  useEffect(() => {
    if (!isWalkthrough) return;

    let active = true;

    void getWalkthroughState()
      .then(state => {
        if (!active) return;

        if (
          state?.status === 'in_progress' &&
          state.step === 'evidence_return'
        ) {
          setTourStep('evidence_return');
        }
      })
      .catch(error => {
        console.warn(
          'Could not restore evidence walkthrough.',
          error,
        );
      });

    return () => {
      active = false;
    };
  }, [isWalkthrough]);

  useEffect(() => {
    if (!isWalkthrough) return;

    if (tourStep === 'evidence_details') {
      requestAnimationFrame(() => {
        const scrollView = scrollRef.current;
        if (!scrollView) return;

        practiceEvidenceRef.current?.measureLayout(
          scrollView,
          (_x, y) => {
            scrollView.scrollTo({
              y: Math.max(0, y - 16),
              animated: false,
            });
            requestAnimationFrame(() => {
              setMeasurementVersion(version => version + 1);
            });
          },
        );
      });
      return;
    }

    requestAnimationFrame(() => {
      scrollRef.current?.scrollToEnd({ animated: false });
      requestAnimationFrame(() => {
        setMeasurementVersion(version => version + 1);
      });
    });
  }, [isWalkthrough, tourStep]);

  const continueTour = async () => {
    try {
      await saveWalkthroughState({
        status: 'in_progress',
        step: 'evidence_return',
      });

      setTourStep('evidence_return');

      requestAnimationFrame(() => {
        scrollRef.current?.scrollToEnd({
          animated: true,
        });
      });
    } catch (error) {
      console.warn(
        'Could not save evidence walkthrough step.',
        error,
      );

      Alert.alert(
        'Walkthrough error',
        'Could not save your progress. Please try again.',
      );
    }
  };

  const returnFromTour = async () => {
    if (isWalkthrough) {
      try {
        await saveWalkthroughState({
          status: 'in_progress',
          step:
            tourStep === 'evidence_return'
              ? 'result_decision'
              : 'result_source',
        });
      } catch (error) {
        console.warn(
          'Could not save walkthrough return step.',
          error,
        );

        return;
      }
    }

    navigation.goBack();
  };

  const skipTour = async () => {
    try {
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

      Alert.alert(
        'Walkthrough error',
        'Could not skip the walkthrough. Please try again.',
      );
    }
  };

  const openSource = async (source: EvidenceSource) => {
    if (isWalkthrough) return;

    const url = source.originalUrl;

    if (!url) return;

    try {
      const parsedUrl = new URL(url);

      if (
        parsedUrl.protocol !== 'http:' &&
        parsedUrl.protocol !== 'https:'
      ) {
        throw new Error(
          'Source links must use http or https.',
        );
      }

      if (Platform.OS === 'web') {
        const openedWindow = window.open(
          parsedUrl.toString(),
          '_blank',
        );

        if (!openedWindow) {
          throw new Error(
            'Your browser blocked the source tab.',
          );
        }

        openedWindow.opener = null;
      } else {
        await Linking.openURL(parsedUrl.toString());
      }

      if (evidenceTrackingKey) {
        void recordEvidenceSourceOpened(
          evidenceTrackingKey,
          source.sourceId ?? source.id,
        );
      }
    } catch (error) {
      console.warn(
        'Could not open source:',
        error,
      );

      Alert.alert(
        'Unable to open source',
        'FactTrace could not open this source. Please try again.',
      );
    }
  };

  if (!result) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar style={isDark ? 'light' : 'dark'} />

        <View style={styles.errorScreen}>
          <View style={styles.errorIcon}>
            <Ionicons
              name="alert-circle-outline"
              size={30}
              color={COLORS.blue}
            />
          </View>

          <Text style={styles.errorTitle}>
            Evidence unavailable
          </Text>

          <Text style={styles.errorText}>
            FactTrace could not load the evidence details for this claim.
          </Text>

          <TouchableOpacity
            activeOpacity={0.8}
            style={styles.errorButton}
            onPress={() => void returnFromTour()}
          >
            <Text style={styles.errorButtonText}>
              Go Back
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style={isDark ? 'light' : 'dark'} />

      <ScrollView
        ref={scrollRef}
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <TouchableOpacity
            activeOpacity={0.8}
            style={styles.backButton}
            onPress={() => void returnFromTour()}
          >
            <Ionicons
              name="arrow-back"
              size={23}
              color={COLORS.textPrimary}
            />
          </TouchableOpacity>

          <View style={styles.headerTextArea}>
            <Text style={styles.headerTitle}>
              {selectedSource
                ? 'Source Details'
                : 'Full Evidence'}
            </Text>

            <Text style={styles.headerSubtitle}>
              {selectedSource
                ? 'Review this source and its provenance'
                : 'Review sources and supporting details'}
            </Text>
          </View>

          <View style={styles.headerSpacer} />
        </View>

        {isWalkthrough ? (
          <View style={styles.practiceGuide}>
            <View style={styles.practiceGuideHeader}>
              <Text style={styles.practiceGuideTitle}>
                {tourStep === 'evidence_details'
                  ? 'Practice: inspect the evidence'
                  : 'Great! Return to your results'}
              </Text>

              <TouchableOpacity
                accessibilityRole="button"
                onPress={() => void skipTour()}
              >
                <Text style={styles.practiceSkip}>
                  Skip Walkthrough
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.practiceGuideText}>
              {tourStep === 'evidence_details'
                ? 'Read the source information, evidence text, and provenance below. This is a fictional teaching example, not a real publication. When you finish, tap Continue after the source.'
                : 'You have finished inspecting the practice source. Tap Back to Evidence Results at the bottom of the page to make your decision.'}
            </Text>
          </View>
        ) : null}

        <LinearGradient
          colors={['#102B49', '#123D67', '#17568C']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroCard}
        >
          <View style={styles.heroCircleLarge} />
          <View style={styles.heroCircleSmall} />

          <View style={styles.heroIcon}>
            <Ionicons
              name="reader-outline"
              size={25}
              color={COLORS.white}
            />
          </View>

          <Text style={styles.heroTitle}>
            {selectedSource
              ? 'Inspect the source'
              : 'Explore the evidence'}
          </Text>

          <Text style={styles.heroDescription}>
            {selectedSource
              ? 'Review the source information, evidence, publication details and provenance.'
              : 'Review each source, its publication details, and the evidence connected to the matched claim.'}
          </Text>

          <View style={styles.heroStats}>
            <View style={styles.heroStat}>
              <Text style={styles.heroStatNumber}>
                {selectedSource
                  ? 1
                  : result.evidence.length}
              </Text>

              <Text style={styles.heroStatLabel}>
                {selectedSource
                  ? 'Source'
                  : 'Sources'}
              </Text>
            </View>

            <View style={styles.heroDivider} />

            <View style={styles.heroStat}>
              <Text style={styles.heroStatNumber}>
                {result.matchScore !== undefined
                  ? `${Math.round(result.matchScore)}%`
                  : '—'}
              </Text>

              <Text style={styles.heroStatLabel}>
                Match
              </Text>
            </View>

            <View style={styles.heroDivider} />

            <View style={styles.heroStat}>
              <Ionicons
                name="link-outline"
                size={19}
                color="#DCEBFF"
              />

              <Text style={styles.heroStatLabel}>
                Traceable
              </Text>
            </View>
          </View>
        </LinearGradient>

        <View style={styles.claimCard}>
          <View style={styles.claimHeader}>
            <View style={styles.claimIcon}>
              <Ionicons
                name="document-text-outline"
                size={21}
                color={COLORS.blue}
              />
            </View>

            <View style={styles.claimHeaderText}>
              <Text style={styles.claimLabel}>
                YOUR CLAIM
              </Text>

              <Text style={styles.claimHelper}>
                The claim you submitted
              </Text>
            </View>
          </View>

          <Text style={styles.claimText}>
            “{result.originalClaim}”
          </Text>
        </View>

        {result.matchedClaim ? (
          <View style={styles.matchedClaimCard}>
            <View style={styles.matchedClaimHeader}>
              <View style={styles.matchedClaimIcon}>
                <Ionicons
                  name="git-compare-outline"
                  size={21}
                  color="#7357D9"
                />
              </View>

              <View style={styles.matchedClaimHeaderText}>
                <Text style={styles.matchedClaimLabel}>
                  MATCHED CLAIM
                </Text>

                <Text style={styles.matchedClaimHelper}>
                  Closest claim found in the evidence record
                </Text>
              </View>
            </View>

            <Text style={styles.matchedClaimText}>
              “{result.matchedClaim}”
            </Text>
          </View>
        ) : null}

        {displayedSources.length > 0 ? (
          displayedSources.map((source, index) => (
            <React.Fragment key={source.id}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionHeaderText}>
                  <Text style={styles.sectionTitle}>
                    {source.isPrimary
                      ? 'Primary source'
                      : 'Supporting source'}
                  </Text>

                  <Text style={styles.sectionSubtitle}>
                    {source.isPrimary
                      ? 'Main evidence linked to the claim'
                      : 'Additional context related to the claim'}
                  </Text>
                </View>

                {source.isPrimary ? (
                  <View style={styles.primaryBadge}>
                    <Ionicons
                      name="star"
                      size={12}
                      color="#B66D00"
                    />

                    <Text style={styles.primaryBadgeText}>
                      PRIMARY
                    </Text>
                  </View>
                ) : null}
              </View>

              <View
                style={styles.sourceCard}
              >
                <View style={styles.sourceTop}>
                  <View
                    style={
                      source.isPrimary
                        ? styles.sourceIconBlue
                        : styles.sourceIconPurple
                    }
                  >
                    <Ionicons
                      name={
                        source.isPrimary
                          ? 'newspaper-outline'
                          : 'library-outline'
                      }
                      size={24}
                      color={
                        source.isPrimary
                          ? COLORS.blue
                          : '#7357D9'
                      }
                    />
                  </View>

                  <View style={styles.sourceIdentity}>
                    <Text style={styles.sourceName}>
                      {source.sourceName}
                    </Text>

                    <Text style={styles.sourceOrganization}>
                      {source.organization ||
                        'Published source'}
                    </Text>
                  </View>

                  {!isWalkthrough ? (
                    <View style={styles.verifiedSourceIcon}>
                      <Ionicons
                        name="checkmark-circle"
                        size={22}
                        color="#28A36A"
                      />
                    </View>
                  ) : null}
                </View>

                <View style={styles.sourceTitleBlock}>
                  <Text style={styles.sourceTitleLabel}>
                    SOURCE TITLE
                  </Text>

                  <Text style={styles.sourceTitleText}>
                    {source.title}
                  </Text>
                </View>

                <View style={styles.metadataGrid}>
                  <View style={styles.metadataItem}>
                    <Ionicons
                      name="calendar-outline"
                      size={17}
                      color={COLORS.textSecondary}
                    />

                    <View style={styles.metadataTextArea}>
                      <Text style={styles.metadataLabel}>
                        Published
                      </Text>

                      <Text
                        style={styles.metadataValue}
                        numberOfLines={2}
                      >
                        {source.publicationDate ||
                          'Not available'}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.metadataItem}>
                    <Ionicons
                      name={
                        source.author
                          ? 'person-outline'
                          : 'business-outline'
                      }
                      size={17}
                      color={COLORS.textSecondary}
                    />

                    <View style={styles.metadataTextArea}>
                      <Text style={styles.metadataLabel}>
                        {source.author
                          ? 'Author'
                          : 'Organization'}
                      </Text>

                      <Text
                        style={styles.metadataValue}
                        numberOfLines={2}
                      >
                        {source.author ||
                          source.organization ||
                          'Not available'}
                      </Text>
                    </View>
                  </View>
                </View>

                {source.summary ? (
                  <View style={styles.summaryBlock}>
                    <View style={styles.evidenceBlockHeader}>
                      <Ionicons
                        name="information-circle-outline"
                        size={18}
                        color={COLORS.blue}
                      />

                      <Text style={styles.evidenceBlockTitle}>
                        Source summary
                      </Text>
                    </View>

                    <Text style={styles.evidenceText}>
                      {source.summary}
                    </Text>
                  </View>
                ) : null}

                <View
                  ref={
                    isWalkthrough &&
                    tourStep === 'evidence_details' &&
                    index === 0
                      ? practiceEvidenceRef
                      : undefined
                  }
                  style={[
                    styles.evidenceBlock,
                    isWalkthrough &&
                    tourStep === 'evidence_details' &&
                    index === 0
                      ? styles.walkthroughHighlight
                      : undefined,
                  ]}
                >
                  <View style={styles.evidenceBlockHeader}>
                    <Ionicons
                      name="document-text-outline"
                      size={18}
                      color={COLORS.blue}
                    />

                    <Text style={styles.evidenceBlockTitle}>
                      Evidence
                    </Text>
                  </View>

                  <Text style={styles.evidenceText}>
                    {source.evidenceText}
                  </Text>

                  {source.stance ? (
                    <Text style={styles.evidenceStance}>
                      {source.stance === 'supports'
                        ? 'Supports the submitted claim'
                        : source.stance === 'contradicts'
                          ? 'Contradicts the submitted claim'
                          : 'Provides context for the submitted claim'}
                    </Text>
                  ) : null}
                </View>

                <View style={styles.provenanceBlock}>
                  <View style={styles.provenanceHeader}>
                    <View style={styles.provenanceIcon}>
                      <Ionicons
                        name="git-branch-outline"
                        size={19}
                        color="#7357D9"
                      />
                    </View>

                    <View style={styles.provenanceHeaderText}>
                      <Text style={styles.provenanceTitle}>
                        Source provenance
                      </Text>

                      <Text style={styles.provenanceSubtitle}>
                        Where this evidence comes from
                      </Text>
                    </View>
                  </View>

                  <View style={styles.provenanceRow}>
                    <View style={styles.provenanceDot} />

                    <View style={styles.provenanceStep}>
                      <Text style={styles.provenanceStepTitle}>
                        {isWalkthrough
                          ? 'Practice source'
                          : 'Original publication'}
                      </Text>

                      <Text style={styles.provenanceStepText}>
                        {isWalkthrough
                          ? 'This is a fictional example created for the FactTrace tutorial.'
                          : source.organization
                            ? `Published by ${source.organization}`
                            : `Published by ${source.sourceName}`}
                      </Text>
                    </View>
                  </View>

                  {source.provenance ? (
                    <>
                      <View style={styles.provenanceLine} />

                      <View style={styles.provenanceRow}>
                        <View style={styles.provenanceDot} />

                        <View style={styles.provenanceStep}>
                          <Text style={styles.provenanceStepTitle}>
                            Evidence record
                          </Text>

                          <Text style={styles.provenanceStepText}>
                            {source.provenance}
                          </Text>
                        </View>
                      </View>
                    </>
                  ) : null}
                </View>

                {!isWalkthrough && source.originalUrl ? (
                  <TouchableOpacity
                    activeOpacity={0.85}
                    style={
                      source.isPrimary
                        ? styles.openSourceButton
                        : styles.secondarySourceButton
                    }
                    onPress={() => void openSource(source)}
                  >
                    <View
                      style={
                        source.isPrimary
                          ? styles.openSourceIcon
                          : styles.secondaryOpenSourceIcon
                      }
                    >
                      <Ionicons
                        name="open-outline"
                        size={20}
                        color={
                          source.isPrimary
                            ? COLORS.white
                            : COLORS.blue
                        }
                      />
                    </View>

                    <Text
                      style={
                        source.isPrimary
                          ? styles.openSourceText
                          : styles.secondarySourceText
                      }
                    >
                      Open Original Source
                    </Text>

                    <Ionicons
                      name={
                        source.isPrimary
                          ? 'arrow-forward'
                          : 'chevron-forward'
                      }
                      size={19}
                      color={
                        source.isPrimary
                          ? COLORS.white
                          : COLORS.blue
                      }
                    />
                  </TouchableOpacity>
                ) : null}
              </View>

              {isWalkthrough &&
              index === 0 &&
              tourStep === 'evidence_details' ? (
              <TouchableOpacity
                accessibilityRole="button"
                  activeOpacity={0.85}
                  style={styles.practiceContinue}
                  onPress={() => void continueTour()}
                >
                  <Text style={styles.practiceContinueText}>
                    I've reviewed this source — Continue
                  </Text>

                  <Ionicons
                    name="arrow-forward"
                    size={20}
                    color={COLORS.white}
                  />
                </TouchableOpacity>
              ) : null}
            </React.Fragment>
          ))
        ) : (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIcon}>
              <Ionicons
                name="search-outline"
                size={27}
                color={COLORS.blue}
              />
            </View>

            <Text style={styles.emptyTitle}>
              No evidence available
            </Text>

            <Text style={styles.emptyText}>
              FactTrace did not receive any evidence sources for this claim.
            </Text>
          </View>
        )}

        <View
          style={
            isWalkthrough &&
            tourStep === 'evidence_return'
              ? styles.walkthroughHighlight
              : undefined
          }
        >
          <TouchableOpacity
            ref={backToResultsRef}
            activeOpacity={0.8}
            style={styles.backToResultsButton}
            onPress={() => void returnFromTour()}
          >
            <Ionicons
              name="arrow-back"
              size={19}
              color={COLORS.textPrimary}
            />

            <Text style={styles.backToResultsText}>
              Back to Evidence Results
            </Text>
          </TouchableOpacity>
        </View>

        {isWalkthrough ? (
          <TouchableOpacity
            accessibilityRole="button"
            style={styles.bottomSkip}
            onPress={() => void skipTour()}
          >
            <Text style={styles.practiceSkip}>
              Skip Walkthrough
            </Text>
          </TouchableOpacity>
        ) : null}
      </ScrollView>

      {isWalkthrough ? (
        <WalkthroughOverlay
          mode="spotlight"
          step={tourStep}
          targetRef={
            tourStep === 'evidence_details'
              ? practiceEvidenceRef
              : backToResultsRef
          }
          measurementVersion={measurementVersion}
          title={
            tourStep === 'evidence_details'
              ? 'Review the source'
              : 'Return to your results'
          }
          message={
            tourStep === 'evidence_details'
              ? 'Review the evidence shown here. Tap Continue when you are ready to return to the results.'
              : 'Tap Back to Evidence Results to continue the walkthrough and make your decision.'
          }
          onContinue={() => {
            if (tourStep === 'evidence_details') {
              void continueTour();
            } else {
              void returnFromTour();
            }
          }}
          onSkip={() => void skipTour()}
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

    scrollView: {
      flex: 1,
    },

    content: {
      paddingHorizontal: 22,
      paddingBottom: 40,
    },

    practiceGuide: {
      marginTop: 16,
      padding: 15,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: isDark
        ? COLORS.border
        : '#EDCC77',
      backgroundColor: isDark
        ? COLORS.surfaceElevated
        : '#FFF9EB',
    },

    practiceGuideHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 12,
    },

    practiceGuideTitle: {
      flex: 1,
      color: isDark
        ? COLORS.textPrimary
        : '#162E4A',
      fontSize: 15,
      fontWeight: '800',
    },

    practiceGuideText: {
      marginTop: 9,
      color: isDark
        ? COLORS.textSecondary
        : '#785814',
      fontSize: 12,
      lineHeight: 18,
    },

    practiceSkip: {
      color: COLORS.blue,
      fontSize: 12,
      fontWeight: '700',
    },

    walkthroughHighlight: {
      borderWidth: 3,
      borderColor: isDark
        ? COLORS.border
        : '#FFD166',
      borderRadius: 18,
      padding: 3,
    },

    practiceContinue: {
      marginTop: 14,
      minHeight: 54,
      borderRadius: 15,
      backgroundColor: COLORS.blue,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 18,
    },

    practiceContinueText: {
      flex: 1,
      marginRight: 10,
      color: COLORS.white,
      fontSize: 13,
      fontWeight: '700',
    },

    bottomSkip: {
      minHeight: 44,
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: 8,
    },

    header: {
      marginTop: 12,
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
      borderWidth: 1,
      borderColor: COLORS.border,
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

    heroCard: {
      marginTop: 23,
      borderRadius: 23,
      padding: 19,
      overflow: 'hidden',
      shadowColor: '#0B2542',
      shadowOpacity: 0.18,
      shadowRadius: 15,
      shadowOffset: {
        width: 0,
        height: 7,
      },
      elevation: 6,
    },

    heroCircleLarge: {
      position: 'absolute',
      width: 150,
      height: 150,
      borderRadius: 75,
      borderWidth: 24,
      borderColor: 'rgba(255,255,255,0.03)',
      right: -45,
      top: -60,
    },

    heroCircleSmall: {
      position: 'absolute',
      width: 75,
      height: 75,
      borderRadius: 38,
      backgroundColor: 'rgba(255,255,255,0.025)',
      right: 18,
      bottom: -26,
    },

    heroIcon: {
      width: 45,
      height: 45,
      borderRadius: 14,
      backgroundColor: 'rgba(255,255,255,0.12)',
      alignItems: 'center',
      justifyContent: 'center',
    },

    heroTitle: {
      marginTop: 15,
      color: COLORS.white,
      fontSize: 24,
      fontWeight: '800',
    },

    heroDescription: {
      marginTop: 7,
      color: '#C7D6E6',
      fontSize: 13,
      lineHeight: 18,
      maxWidth: '94%',
    },

    heroStats: {
      marginTop: 18,
      flexDirection: 'row',
      alignItems: 'center',
    },

    heroStat: {
      flex: 1,
      alignItems: 'center',
    },

    heroStatNumber: {
      color: COLORS.white,
      fontSize: 19,
      fontWeight: '800',
    },

    heroStatLabel: {
      marginTop: 3,
      color: '#B8CDE2',
      fontSize: 10.5,
      fontWeight: '600',
    },

    heroDivider: {
      width: 1,
      height: 30,
      backgroundColor: 'rgba(255,255,255,0.15)',
    },

    claimCard: {
      marginTop: 17,
      borderRadius: 18,
      backgroundColor: COLORS.surface,
      borderWidth: 1,
      borderColor: COLORS.border,
      padding: 15,
    },

    claimHeader: {
      flexDirection: 'row',
      alignItems: 'center',
    },

    claimHeaderText: {
      flex: 1,
    },

    claimIcon: {
      width: 36,
      height: 36,
      borderRadius: 11,
      backgroundColor: isDark
        ? COLORS.surfaceElevated
        : '#EDF4FF',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 10,
    },

    claimLabel: {
      color: COLORS.textSecondary,
      fontSize: 10.5,
      fontWeight: '800',
      letterSpacing: 0.8,
    },

    claimHelper: {
      marginTop: 2,
      color: COLORS.textMuted,
      fontSize: 10,
    },

    claimText: {
      marginTop: 13,
      color: COLORS.textPrimary,
      fontSize: 15,
      lineHeight: 22,
      fontWeight: '600',
    },

    matchedClaimCard: {
      marginTop: 11,
      borderRadius: 18,
      backgroundColor: isDark
        ? COLORS.surfaceElevated
        : '#F6F3FF',
      borderWidth: 1,
      borderColor: COLORS.border,
      padding: 15,
    },

    matchedClaimHeader: {
      flexDirection: 'row',
      alignItems: 'center',
    },

    matchedClaimHeaderText: {
      flex: 1,
    },

    matchedClaimIcon: {
      width: 36,
      height: 36,
      borderRadius: 11,
      backgroundColor: isDark
        ? COLORS.surface
        : '#E9E2FF',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 10,
    },

    matchedClaimLabel: {
      color: isDark
        ? '#C4B5FD'
        : '#6553A6',
      fontSize: 10.5,
      fontWeight: '800',
      letterSpacing: 0.8,
    },

    matchedClaimHelper: {
      marginTop: 2,
      color: COLORS.textMuted,
      fontSize: 10,
    },

    matchedClaimText: {
      marginTop: 13,
      color: COLORS.textPrimary,
      fontSize: 14,
      lineHeight: 21,
      fontWeight: '600',
    },

    sectionHeader: {
      marginTop: 23,
      marginBottom: 10,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },

    sectionHeaderText: {
      flex: 1,
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

    primaryBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: isDark
        ? COLORS.surfaceElevated
        : '#FFF4DF',
      paddingHorizontal: 8,
      paddingVertical: 6,
      borderRadius: 9,
      marginLeft: 8,
    },

    primaryBadgeText: {
      marginLeft: 4,
      color: isDark
        ? COLORS.orange
        : '#A56200',
      fontSize: 9,
      fontWeight: '800',
      letterSpacing: 0.4,
    },

    sourceCard: {
      borderRadius: 19,
      backgroundColor: COLORS.surface,
      borderWidth: 1,
      borderColor: COLORS.border,
      padding: 15,
    },

    sourceTop: {
      flexDirection: 'row',
      alignItems: 'center',
    },

    sourceIconBlue: {
      width: 43,
      height: 43,
      borderRadius: 13,
      backgroundColor: isDark
        ? COLORS.surfaceElevated
        : '#EDF4FF',
      alignItems: 'center',
      justifyContent: 'center',
    },

    sourceIconPurple: {
      width: 43,
      height: 43,
      borderRadius: 13,
      backgroundColor: isDark
        ? COLORS.surfaceElevated
        : '#F2EEFF',
      alignItems: 'center',
      justifyContent: 'center',
    },

    sourceIdentity: {
      flex: 1,
      marginLeft: 11,
    },

    sourceName: {
      color: COLORS.textPrimary,
      fontSize: 14,
      fontWeight: '700',
    },

    sourceOrganization: {
      marginTop: 3,
      color: COLORS.textSecondary,
      fontSize: 11,
    },

    verifiedSourceIcon: {
      marginLeft: 8,
    },

    sourceTitleBlock: {
      marginTop: 15,
      padding: 12,
      borderRadius: 14,
      backgroundColor: isDark
        ? COLORS.surfaceElevated
        : '#F7F9FC',
    },

    sourceTitleLabel: {
      color: COLORS.textMuted,
      fontSize: 9.5,
      fontWeight: '800',
      letterSpacing: 0.7,
    },

    sourceTitleText: {
      marginTop: 5,
      color: COLORS.textPrimary,
      fontSize: 13,
      lineHeight: 18,
      fontWeight: '700',
    },

    metadataGrid: {
      marginTop: 12,
      flexDirection: 'row',
      gap: 9,
    },

    metadataItem: {
      flex: 1,
      minHeight: 62,
      borderRadius: 13,
      backgroundColor: isDark
        ? COLORS.surfaceElevated
        : '#F6F8FB',
      paddingHorizontal: 10,
      paddingVertical: 9,
      flexDirection: 'row',
      alignItems: 'center',
    },

    metadataTextArea: {
      flex: 1,
      marginLeft: 8,
    },

    metadataLabel: {
      color: COLORS.textMuted,
      fontSize: 9.5,
      fontWeight: '600',
    },

    metadataValue: {
      marginTop: 2,
      color: COLORS.textPrimary,
      fontSize: 11,
      lineHeight: 14,
      fontWeight: '600',
    },

    summaryBlock: {
      marginTop: 15,
      borderRadius: 15,
      backgroundColor: COLORS.background,
      padding: 13,
    },

    evidenceBlock: {
      marginTop: 12,
      borderRadius: 15,
      backgroundColor: COLORS.background,
      padding: 13,
    },

    evidenceBlockHeader: {
      flexDirection: 'row',
      alignItems: 'center',
    },

    evidenceBlockTitle: {
      marginLeft: 7,
      color: COLORS.textPrimary,
      fontSize: 13,
      fontWeight: '700',
    },

    evidenceText: {
      marginTop: 9,
      color: COLORS.textSecondary,
      fontSize: 12,
      lineHeight: 18,
    },

    evidenceStance: {
      marginTop: 14,
      color: COLORS.textPrimary,
      fontSize: 13,
      fontWeight: '700',
    },

    provenanceBlock: {
      marginTop: 15,
      borderRadius: 15,
      backgroundColor: isDark
        ? COLORS.surfaceElevated
        : '#F6F3FF',
      padding: 13,
    },

    provenanceHeader: {
      flexDirection: 'row',
      alignItems: 'center',
    },

    provenanceIcon: {
      width: 36,
      height: 36,
      borderRadius: 11,
      backgroundColor: isDark
        ? COLORS.surface
        : '#E9E2FF',
      alignItems: 'center',
      justifyContent: 'center',
    },

    provenanceHeaderText: {
      marginLeft: 9,
      flex: 1,
    },

    provenanceTitle: {
      color: COLORS.textPrimary,
      fontSize: 13,
      fontWeight: '700',
    },

    provenanceSubtitle: {
      marginTop: 2,
      color: COLORS.textSecondary,
      fontSize: 10.5,
    },

    provenanceRow: {
      marginTop: 14,
      flexDirection: 'row',
      alignItems: 'flex-start',
    },

    provenanceDot: {
      width: 9,
      height: 9,
      borderRadius: 5,
      backgroundColor: '#7357D9',
      marginTop: 4,
    },

    provenanceStep: {
      flex: 1,
      marginLeft: 9,
    },

    provenanceStepTitle: {
      color: COLORS.textPrimary,
      fontSize: 11.5,
      fontWeight: '700',
    },

    provenanceStepText: {
      marginTop: 2,
      color: COLORS.textSecondary,
      fontSize: 10.5,
      lineHeight: 15,
    },

    provenanceLine: {
      width: 1,
      height: 18,
      marginLeft: 4,
      marginTop: 3,
      marginBottom: -7,
      backgroundColor: isDark
        ? COLORS.border
        : '#CFC4F5',
    },

    openSourceButton: {
      marginTop: 16,
      minHeight: 56,
      borderRadius: 15,
      backgroundColor: COLORS.blue,
      paddingHorizontal: 13,
      flexDirection: 'row',
      alignItems: 'center',
    },

    openSourceIcon: {
      width: 35,
      height: 35,
      borderRadius: 10,
      backgroundColor: 'rgba(255,255,255,0.16)',
      alignItems: 'center',
      justifyContent: 'center',
    },

    openSourceText: {
      flex: 1,
      marginLeft: 10,
      color: COLORS.white,
      fontSize: 14,
      fontWeight: '700',
    },

    secondarySourceButton: {
      marginTop: 16,
      minHeight: 52,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: COLORS.border,
      backgroundColor: isDark
        ? COLORS.surfaceElevated
        : '#F4F8FE',
      paddingHorizontal: 13,
      flexDirection: 'row',
      alignItems: 'center',
    },

    secondaryOpenSourceIcon: {
      width: 35,
      height: 35,
      borderRadius: 10,
      backgroundColor: isDark
        ? COLORS.surface
        : '#E7F0FF',
      alignItems: 'center',
      justifyContent: 'center',
    },

    secondarySourceText: {
      flex: 1,
      marginLeft: 9,
      color: COLORS.blue,
      fontSize: 13,
      fontWeight: '700',
    },

    backToResultsButton: {
      marginTop: 18,
      minHeight: 52,
      borderRadius: 15,
      borderWidth: 1,
      borderColor: COLORS.border,
      backgroundColor: COLORS.surface,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
    },

    backToResultsText: {
      marginLeft: 8,
      color: COLORS.textPrimary,
      fontSize: 13,
      fontWeight: '700',
    },

    emptyCard: {
      marginTop: 22,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: COLORS.border,
      backgroundColor: COLORS.surface,
      padding: 24,
      alignItems: 'center',
    },

    emptyIcon: {
      width: 52,
      height: 52,
      borderRadius: 16,
      backgroundColor: isDark
        ? COLORS.surfaceElevated
        : '#EDF4FF',
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

    errorScreen: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 35,
    },

    errorIcon: {
      width: 62,
      height: 62,
      borderRadius: 19,
      backgroundColor: isDark
        ? COLORS.surfaceElevated
        : '#EDF4FF',
      alignItems: 'center',
      justifyContent: 'center',
    },

    errorTitle: {
      marginTop: 16,
      color: COLORS.textPrimary,
      fontSize: 20,
      fontWeight: '800',
    },

    errorText: {
      marginTop: 7,
      color: COLORS.textSecondary,
      fontSize: 13,
      lineHeight: 19,
      textAlign: 'center',
    },

    errorButton: {
      marginTop: 20,
      paddingHorizontal: 22,
      paddingVertical: 13,
      borderRadius: 13,
      backgroundColor: COLORS.blue,
    },

    errorButtonText: {
      color: COLORS.white,
      fontSize: 13,
      fontWeight: '700',
    },
  });