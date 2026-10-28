import React, { useEffect, useRef, useState } from 'react';

import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { RootStackParamList } from '../navigation/types';
import { COLORS } from '../constants/app';
import { MatchStatus } from '../types/verification';
import { useAuth } from '../hooks/useAuth';
import { saveVerificationHistory } from '../services/historyService';
import SharingIntentionModal, {
  SharingIntention,
} from '../components/SharingIntentionModal';
import { saveEvaluationDecision } from '../services/evaluationService';

type Props = NativeStackScreenProps<
  RootStackParamList,
  'VerificationResults'
>;

type Decision =
  | 'trust'
  | 'dont-trust'
  | 'unsure'
  | null;

type MatchTheme = {
  label: string;
  title: string;
  description: string;
  dotColor: string;
  badgeBackground: string;
  badgeBorder: string;
  badgeText: string;
};

function getMatchTheme(
  status: MatchStatus,
): MatchTheme {
  switch (status) {
    case 'strong_match':
      return {
        label: 'STRONG MATCH',
        title: 'Relevant evidence found',
        description:
          'FactTrace found a closely matching claim and relevant evidence for you to review.',
        dotColor: '#57D394',
        badgeBackground:
          'rgba(55, 201, 129, 0.13)',
        badgeBorder:
          'rgba(102, 230, 166, 0.24)',
        badgeText: '#B9F3D5',
      };

    case 'weak_match':
      return {
        label: 'POSSIBLE MATCH',
        title: 'Possible evidence found',
        description:
          'FactTrace found evidence that may be related to your claim. Review the sources carefully.',
        dotColor: '#F7B955',
        badgeBackground:
          'rgba(247, 185, 85, 0.13)',
        badgeBorder:
          'rgba(247, 185, 85, 0.28)',
        badgeText: '#FFE1A6',
      };

    case 'no_match':
      return {
        label: 'NO MATCH',
        title: 'No close match found',
        description:
          'FactTrace could not find a closely matching claim. Try changing the wording or scanning another claim.',
        dotColor: '#AAB8C7',
        badgeBackground:
          'rgba(170, 184, 199, 0.13)',
        badgeBorder:
          'rgba(170, 184, 199, 0.25)',
        badgeText: '#DCE5EE',
      };
  }
}

export default function VerificationResultsScreen({
  navigation,
  route,
}: Props) {
  const { result } = route.params;
  const authenticatedUser = useAuth();

  const [decision, setDecision] =
    useState<Decision>(null);

  const [isSharingModalVisible, setIsSharingModalVisible] =
    useState(false);
  const [isSubmittingEvaluation, setIsSubmittingEvaluation] =
    useState(false);
  const [evaluationComplete, setEvaluationComplete] =
    useState(false);
  const [evaluationStatus, setEvaluationStatus] =
    useState<string | null>(null);
  const [sharingIntention, setSharingIntention] =
    useState<SharingIntention | null>(null);

  const evaluationSubmissionAttempted = useRef(false);
  const openedSourceIds = useRef(new Set<string>());
  const evaluation = route.params.evaluation;
  const hasEvaluation = Boolean(evaluation);

  const attemptedHistoryEntryIds = useRef(new Set<string>());
  const historyEntryId = route.params.historyEntryId;

  useEffect(() => {
    if (
      !historyEntryId ||
      attemptedHistoryEntryIds.current.has(historyEntryId)
    ) {
      return;
    }

    if (!authenticatedUser) {
      return;
    }

    attemptedHistoryEntryIds.current.add(historyEntryId);
    void saveVerificationHistory(
      authenticatedUser,
      historyEntryId,
      result,
    ).catch(error => {
      console.warn('Could not save verification history.', error);
    });
  }, [authenticatedUser, historyEntryId, result]);

  const matchTheme = getMatchTheme(
    result.matchStatus,
  );

  const hasEvidence =
    result.evidence.length > 0;

  const matchScore =
    result.matchScore !== undefined
      ? `${Math.round(
          result.matchScore,
        )}%`
      : '—';

  const handleOpenSource = (
    sourceId: string,
  ) => {
    const source = result.evidence.find(
      evidence => evidence.id === sourceId,
    );
    openedSourceIds.current.add(
      source?.sourceId ?? sourceId,
    );
    navigation.navigate(
      'EvidenceDetails',
      {
        result,
        sourceId,
      },
    );
  };

  const handleViewFullEvidence = () => {
    result.evidence.forEach(source =>
      openedSourceIds.current.add(
        source.sourceId ?? source.id,
      ),
    );
    navigation.navigate(
      'EvidenceDetails',
      {
        result,
      },
    );
  };

  const handleDecision = (value: Exclude<Decision, null>) => {
    if (decision || !hasEvaluation) {
      return;
    }

    setDecision(value);
    setIsSharingModalVisible(true);
  };

  const handleSharingIntention = async (
    intention: SharingIntention,
  ) => {
    if (
      evaluationSubmissionAttempted.current ||
      !decision ||
      !evaluation
    ) {
      return;
    }

    evaluationSubmissionAttempted.current = true;
    setSharingIntention(intention);
    setIsSubmittingEvaluation(true);

    try {
      const response = await saveEvaluationDecision({
        condition: 'app',
        claimId: result.claimId ?? null,
        claimText: result.originalClaim,
        originalOcrText: evaluation.originalOcrText,
        inputSource: evaluation.inputSource,
        matchStatus: result.matchStatus,
        ocrEngine: evaluation.ocrEngine ?? null,
        ocrError: evaluation.ocrError ?? null,
        decision:
          decision === 'dont-trust'
            ? 'dont_trust'
            : decision,
        sharingIntention: intention,
        sourcesOpened: [...openedSourceIds.current],
        startedAt: evaluation.startedAt,
        endedAt: new Date().toISOString(),
      });

      setEvaluationStatus(response.message);
    } catch (error) {
      setEvaluationStatus(
        error instanceof Error
          ? `Evaluation logging could not be confirmed: ${error.message}`
          : 'Evaluation logging could not be confirmed. No retry was made to avoid duplicate submissions.',
      );
    } finally {
      setIsSubmittingEvaluation(false);
      setEvaluationComplete(true);
      setIsSharingModalVisible(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={
          styles.content
        }
        showsVerticalScrollIndicator={false}
      >
        {/* HEADER */}
        <View style={styles.header}>
          <TouchableOpacity
            activeOpacity={0.8}
            style={styles.backButton}
            onPress={() =>
              navigation.goBack()
            }
          >
            <Ionicons
              name="arrow-back"
              size={23}
              color={
                COLORS.textPrimary
              }
            />
          </TouchableOpacity>

          <View
            style={
              styles.headerTextArea
            }
          >
            <Text
              style={
                styles.headerTitle
              }
            >
              Evidence Results
            </Text>

            <Text
              style={
                styles.headerSubtitle
              }
            >
              Review the match and supporting sources
            </Text>
          </View>

          <View
            style={
              styles.headerSpacer
            }
          />
        </View>

        {/* PROGRESS */}
        <View
          style={styles.progressRow}
        >
          <View
            style={styles.progressItem}
          >
            <View
              style={
                styles.progressComplete
              }
            >
              <Ionicons
                name="checkmark"
                size={15}
                color={COLORS.white}
              />
            </View>

            <Text
              style={
                styles.progressCompleteText
              }
            >
              Capture
            </Text>
          </View>

          <View
            style={
              styles.progressLineActive
            }
          />

          <View
            style={styles.progressItem}
          >
            <View
              style={
                styles.progressComplete
              }
            >
              <Ionicons
                name="checkmark"
                size={15}
                color={COLORS.white}
              />
            </View>

            <Text
              style={
                styles.progressCompleteText
              }
            >
              Review
            </Text>
          </View>

          <View
            style={
              styles.progressLineActive
            }
          />

          <View
            style={styles.progressItem}
          >
            <View
              style={
                styles.progressCurrent
              }
            >
              <Text
                style={
                  styles.progressCurrentNumber
                }
              >
                3
              </Text>
            </View>

            <Text
              style={
                styles.progressCurrentText
              }
            >
              Evidence
            </Text>
          </View>
        </View>

        {result.datasetNotice ? (
          <View style={styles.datasetNotice}>
            <Text style={styles.datasetNoticeText}>
              DEMONSTRATION DATA · {result.datasetNotice}
            </Text>
          </View>
        ) : null}

        {/* YOUR CLAIM */}
        <View style={styles.claimCard}>
          <View style={styles.claimTop}>
            <View
              style={styles.claimIcon}
            >
              <Ionicons
                name="document-text-outline"
                size={21}
                color={COLORS.blue}
              />
            </View>

            <Text
              style={styles.claimLabel}
            >
              YOUR CLAIM
            </Text>
          </View>

          <Text
            style={styles.claimText}
          >
            “{result.originalClaim}”
          </Text>
        </View>

        {/* MATCH */}
        <LinearGradient
          colors={[
            '#102B49',
            '#123D67',
            '#17568C',
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.matchCard}
        >
          <View
            style={
              styles.matchCircleOne
            }
          />

          <View
            style={
              styles.matchCircleTwo
            }
          />

          <View
            style={
              styles.matchTopRow
            }
          >
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
              <View
                style={[
                  styles.matchDot,
                  {
                    backgroundColor:
                      matchTheme.dotColor,
                  },
                ]}
              />

              <Text
                style={[
                  styles.matchBadgeText,
                  {
                    color:
                      matchTheme.badgeText,
                  },
                ]}
              >
                {matchTheme.label}
              </Text>
            </View>

            <View
              style={styles.matchScore}
            >
              <Text
                style={
                  styles.matchScoreNumber
                }
              >
                {matchScore}
              </Text>

              <Text
                style={
                  styles.matchScoreLabel
                }
              >
                match
              </Text>
            </View>
          </View>

          <Text
            style={styles.matchTitle}
          >
            {matchTheme.title}
          </Text>

          <Text
            style={
              styles.matchDescription
            }
          >
            {result.explanation ||
              matchTheme.description}
          </Text>

          {result.matchedClaim && (
            <View
              style={
                styles.matchedClaimBox
              }
            >
              <Text
                style={
                  styles.matchedClaimLabel
                }
              >
                MATCHED CLAIM
              </Text>

              <Text
                style={
                  styles.matchedClaimText
                }
              >
                {result.matchedClaim}
              </Text>
            </View>
          )}
        </LinearGradient>

        {/* EVIDENCE HEADER */}
        <View
          style={styles.sectionHeader}
        >
          <View>
            <Text
              style={styles.sectionTitle}
            >
              Evidence
            </Text>

            <Text
              style={
                styles.sectionSubtitle
              }
            >
              {hasEvidence
                ? 'Sources related to this matched claim'
                : 'No evidence sources available'}
            </Text>
          </View>

          <View
            style={styles.sourceCount}
          >
            <Text
              style={
                styles.sourceCountText
              }
            >
              {result.evidence.length}{' '}
              {result.evidence.length ===
              1
                ? 'source'
                : 'sources'}
            </Text>
          </View>
        </View>

        {/* EVIDENCE CARDS */}
        {hasEvidence ? (
          result.evidence.map(
            (source, index) => (
              <TouchableOpacity
                key={source.id}
                activeOpacity={0.82}
                style={
                  styles.evidenceCard
                }
                onPress={() =>
                  handleOpenSource(
                    source.id,
                  )
                }
              >
                <View
                  style={
                    styles.evidenceTop
                  }
                >
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

                  <View
                    style={
                      styles.sourceInfo
                    }
                  >
                    <Text
                      style={
                        styles.sourceName
                      }
                    >
                      {source.sourceName}
                    </Text>

                    <Text
                      style={
                        styles.sourceMeta
                      }
                    >
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
                    color={
                      COLORS.textMuted
                    }
                  />
                </View>

                <Text
                  style={
                    styles.evidenceTitle
                  }
                >
                  {source.title}
                </Text>

                <Text
                  style={
                    styles.evidencePreview
                  }
                  numberOfLines={3}
                >
                  {source.summary}
                </Text>

                <View
                  style={
                    styles.evidenceFooter
                  }
                >
                  <View
                    style={
                      styles.provenanceChip
                    }
                  >
                    <Ionicons
                      name="link-outline"
                      size={14}
                      color={COLORS.blue}
                    />

                    <Text
                      style={
                        styles.provenanceText
                      }
                    >
                      Source details available
                    </Text>
                  </View>

                  <Text
                    style={
                      styles.readMore
                    }
                  >
                    View source
                  </Text>
                </View>
              </TouchableOpacity>
            ),
          )
        ) : (
          <View
            style={styles.emptyCard}
          >
            <View
              style={
                styles.emptyIcon
              }
            >
              <Ionicons
                name="search-outline"
                size={25}
                color={COLORS.blue}
              />
            </View>

            <Text
              style={
                styles.emptyTitle
              }
            >
              No evidence found
            </Text>

            <Text
              style={styles.emptyText}
            >
              Try changing the wording of
              the claim or scan a different
              statement.
            </Text>
          </View>
        )}

        {/* DECISION */}
        {hasEvaluation && (
          <View
            style={
              styles.decisionSection
            }
          >
            <View
              style={
                styles.decisionHeader
              }
            >
              <Text
                style={
                  styles.decisionTitle
                }
              >
                What do you think?
              </Text>

              <Text
                style={
                  styles.decisionSubtitle
                }
              >
                {hasEvidence
                  ? 'Based on the evidence you reviewed, record your decision.'
                  : 'Record your decision based on the information available.'}
              </Text>
            </View>

            <View
              style={
                styles.decisionButtons
              }
            >
              <TouchableOpacity
                activeOpacity={0.8}
                disabled={Boolean(decision)}
                style={[
                  styles.decisionButton,

                  decision ===
                    'trust' &&
                    styles.trustSelected,
                ]}
                onPress={() => handleDecision('trust')}
              >
                <View
                  style={[
                    styles.decisionIcon,

                    decision ===
                      'trust' &&
                      styles.trustIconSelected,
                  ]}
                >
                  <Ionicons
                    name="checkmark"
                    size={21}
                    color={
                      decision ===
                      'trust'
                        ? COLORS.white
                        : '#16855A'
                    }
                  />
                </View>

                <Text
                  style={[
                    styles.decisionButtonText,

                    decision ===
                      'trust' &&
                      styles.selectedDecisionText,
                  ]}
                >
                  Trust
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.8}
                disabled={Boolean(decision)}
                style={[
                  styles.decisionButton,

                  decision ===
                    'dont-trust' &&
                    styles.dontTrustSelected,
                ]}
                onPress={() => handleDecision('dont-trust')}
              >
                <View
                  style={[
                    styles.decisionIcon,

                    decision ===
                      'dont-trust' &&
                      styles.dontTrustIconSelected,
                  ]}
                >
                  <Ionicons
                    name="close"
                    size={22}
                    color={
                      decision ===
                      'dont-trust'
                        ? COLORS.white
                        : '#C24545'
                    }
                  />
                </View>

                <Text
                  style={[
                    styles.decisionButtonText,

                    decision ===
                      'dont-trust' &&
                      styles.selectedDecisionText,
                  ]}
                >
                  Don't Trust
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.8}
                disabled={Boolean(decision)}
                style={[
                  styles.decisionButton,

                  decision ===
                    'unsure' &&
                    styles.unsureSelected,
                ]}
                onPress={() => handleDecision('unsure')}
              >
                <View
                  style={[
                    styles.decisionIcon,

                    decision ===
                      'unsure' &&
                      styles.unsureIconSelected,
                  ]}
                >
                  <Ionicons
                    name="help"
                    size={21}
                    color={
                      decision ===
                      'unsure'
                        ? COLORS.white
                        : '#B96800'
                    }
                  />
                </View>

                <Text
                  style={[
                    styles.decisionButtonText,

                    decision ===
                      'unsure' &&
                      styles.selectedDecisionText,
                  ]}
                >
                  Unsure
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* FULL EVIDENCE */}
        {hasEvidence && (
          <TouchableOpacity
            activeOpacity={0.88}
            style={
              styles.evidenceButtonWrapper
            }
            onPress={
              handleViewFullEvidence
            }
          >
            <LinearGradient
              colors={[
                '#3478F6',
                '#2563EB',
              ]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={
                styles.evidenceButton
              }
            >
              <View
                style={
                  styles.evidenceButtonIcon
                }
              >
                <Ionicons
                  name="reader-outline"
                  size={22}
                  color={COLORS.white}
                />
              </View>

              <View
                style={
                  styles.evidenceButtonTextArea
                }
              >
                <Text
                  style={
                    styles.evidenceButtonText
                  }
                >
                  View Full Evidence
                </Text>

                <Text
                  style={
                    styles.evidenceButtonSubtitle
                  }
                >
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
              ? ` Sharing intention: ${
                  sharingIntention === 'not_sure'
                    ? 'Not Sure'
                    : sharingIntention === 'yes'
                      ? 'Yes'
                      : 'No'
                }.`
              : ''}
          </Text>
        ) : null}

        {(!hasEvaluation || evaluationComplete) && (
          <>
            <TouchableOpacity
              activeOpacity={0.85}
              style={[styles.scanAgainButton, styles.scanAgainPrimary]}
              onPress={() => navigation.navigate('Camera')}
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
            <TouchableOpacity
              activeOpacity={0.85}
              style={styles.homeButton}
              onPress={() => navigation.navigate('Home')}
            >
              <Text style={styles.homeButtonText}>Home</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>

      {hasEvaluation && (
        <SharingIntentionModal
          visible={isSharingModalVisible}
          isSubmitting={isSubmittingEvaluation}
          onSelect={handleSharingIntention}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F5F8FC',
  },

  scrollView: {
    flex: 1,
  },

  content: {
    paddingHorizontal: 22,
    paddingBottom: 40,
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
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',

    shadowColor: '#1B3655',
    shadowOpacity: 0.07,
    shadowRadius: 10,
    shadowOffset: {
      width: 0,
      height: 4,
    },

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
    backgroundColor: '#EAF1FF',
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
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: '#E1E8F0',
    padding: 15,
  },

  datasetNotice: {
    marginTop: 16,
    borderRadius: 12,
    backgroundColor: '#FFF4E8',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },

  datasetNoticeText: {
    color: '#A64B00',
    fontSize: 10,
    lineHeight: 15,
    fontWeight: '800',
  },

  claimTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  claimIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#EDF4FF',
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
    shadowOffset: {
      width: 0,
      height: 7,
    },

    elevation: 6,
  },

  matchCircleOne: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    borderWidth: 24,
    borderColor:
      'rgba(255,255,255,0.03)',
    right: -50,
    top: -60,
  },

  matchCircleTwo: {
    position: 'absolute',
    width: 75,
    height: 75,
    borderRadius: 38,
    backgroundColor:
      'rgba(255,255,255,0.025)',
    right: 20,
    bottom: -28,
  },

  matchTopRow: {
    flexDirection: 'row',
    justifyContent:
      'space-between',
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
    width: 7,
    height: 7,
    borderRadius: 4,
    marginRight: 6,
  },

  matchBadgeText: {
    fontSize: 10,
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
    color: '#AFC3D8',
    fontSize: 10,
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
    backgroundColor:
      'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor:
      'rgba(255,255,255,0.10)',
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
    justifyContent:
      'space-between',
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
    backgroundColor: '#EAF1FF',
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
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: '#E1E8F0',
    padding: 14,

    shadowColor: '#18334E',
    shadowOpacity: 0.035,
    shadowRadius: 8,
    shadowOffset: {
      width: 0,
      height: 3,
    },

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
    backgroundColor: '#EDF4FF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  sourceIconPurple: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#F2EEFF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  sourceInfo: {
    flex: 1,
    marginLeft: 10,
  },

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
    justifyContent:
      'space-between',
    alignItems: 'center',
  },

  provenanceChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F6FD',
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
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: '#E1E8F0',
    paddingHorizontal: 20,
    paddingVertical: 28,
    alignItems: 'center',
  },

  emptyIcon: {
    width: 50,
    height: 50,
    borderRadius: 16,
    backgroundColor: '#EDF4FF',
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

  decisionSection: {
    marginTop: 10,
  },

  decisionHeader: {
    marginBottom: 11,
  },

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
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: '#E1E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },

  decisionIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#F1F4F7',
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
    backgroundColor: '#EAF8F2',
    borderColor: '#8AD5B1',
  },

  trustIconSelected: {
    backgroundColor: '#249664',
  },

  dontTrustSelected: {
    backgroundColor: '#FDEEEE',
    borderColor: '#E9AAAA',
  },

  dontTrustIconSelected: {
    backgroundColor: '#C84C4C',
  },

  unsureSelected: {
    backgroundColor: '#FFF7E9',
    borderColor: '#F0CA8C',
  },

  unsureIconSelected: {
    backgroundColor: '#CB7A17',
  },

  selectedDecisionText: {
    fontWeight: '800',
  },

  /* FULL EVIDENCE */

  evidenceButtonWrapper: {
    marginTop: 20,

    shadowColor: COLORS.blue,
    shadowOpacity: 0.2,
    shadowRadius: 11,
    shadowOffset: {
      width: 0,
      height: 6,
    },

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
    backgroundColor:
      'rgba(255,255,255,0.16)',
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
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: '#E1E8F0',
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
    borderColor: '#E1E8F0',
    backgroundColor: COLORS.white,
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