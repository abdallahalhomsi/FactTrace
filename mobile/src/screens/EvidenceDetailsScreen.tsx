import React from 'react';

import {
  Linking,
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
import { EvidenceSource } from '../types/evidence';

type Props = NativeStackScreenProps<
  RootStackParamList,
  'EvidenceDetails'
>;

export default function EvidenceDetailsScreen({
  navigation,
  route,
}: Props) {
  const result = route.params?.result;
  const sourceId = route.params?.sourceId;

  const allSources = result?.evidence ?? [];

  const selectedSource = sourceId
    ? allSources.find(
        source => source.id === sourceId,
      )
    : undefined;

  const displayedSources: EvidenceSource[] =
    selectedSource
      ? [selectedSource]
      : allSources;

  const openSource = async (
    url?: string,
  ) => {
    if (!url) {
      return;
    }

    try {
      const supported =
        await Linking.canOpenURL(url);

      if (supported) {
        await Linking.openURL(url);
      }
    } catch (error) {
      console.log(
        'Could not open source:',
        error,
      );
    }
  };

  if (!result) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar style="dark" />

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
            FactTrace could not load the evidence
            details for this claim.
          </Text>

          <TouchableOpacity
            activeOpacity={0.8}
            style={styles.errorButton}
            onPress={() =>
              navigation.goBack()
            }
          >
            <Text
              style={styles.errorButtonText}
            >
              Go Back
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

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
              {selectedSource
                ? 'Source Details'
                : 'Full Evidence'}
            </Text>

            <Text
              style={
                styles.headerSubtitle
              }
            >
              {selectedSource
                ? 'Review this source and its provenance'
                : 'Review sources and supporting details'}
            </Text>
          </View>

          <View
            style={
              styles.headerSpacer
            }
          />
        </View>

        {/* HERO */}
        <LinearGradient
          colors={[
            '#102B49',
            '#123D67',
            '#17568C',
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroCard}
        >
          <View
            style={
              styles.heroCircleLarge
            }
          />

          <View
            style={
              styles.heroCircleSmall
            }
          />

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

          <Text
            style={
              styles.heroDescription
            }
          >
            {selectedSource
              ? 'Review the source information, evidence, publication details and provenance.'
              : 'Review each source, its publication details, and the evidence connected to the matched claim.'}
          </Text>

          <View style={styles.heroStats}>
            <View style={styles.heroStat}>
              <Text
                style={
                  styles.heroStatNumber
                }
              >
                {selectedSource
                  ? 1
                  : result.evidence.length}
              </Text>

              <Text
                style={
                  styles.heroStatLabel
                }
              >
                {selectedSource
                  ? 'Source'
                  : 'Sources'}
              </Text>
            </View>

            <View
              style={styles.heroDivider}
            />

            <View style={styles.heroStat}>
              <Text
                style={
                  styles.heroStatNumber
                }
              >
                {result.matchScore !==
                undefined
                  ? `${Math.round(
                      result.matchScore,
                    )}%`
                  : '—'}
              </Text>

              <Text
                style={
                  styles.heroStatLabel
                }
              >
                Match
              </Text>
            </View>

            <View
              style={styles.heroDivider}
            />

            <View style={styles.heroStat}>
              <Ionicons
                name="link-outline"
                size={19}
                color="#DCEBFF"
              />

              <Text
                style={
                  styles.heroStatLabel
                }
              >
                Traceable
              </Text>
            </View>
          </View>
        </LinearGradient>

        {/* ORIGINAL CLAIM */}
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

              <Text
                style={
                  styles.claimHelper
                }
              >
                The claim you submitted
              </Text>
            </View>
          </View>

          <Text style={styles.claimText}>
            “{result.originalClaim}”
          </Text>
        </View>

        {/* MATCHED CLAIM */}
        {result.matchedClaim && (
          <View
            style={
              styles.matchedClaimCard
            }
          >
            <View
              style={
                styles.matchedClaimHeader
              }
            >
              <View
                style={
                  styles.matchedClaimIcon
                }
              >
                <Ionicons
                  name="git-compare-outline"
                  size={21}
                  color="#7357D9"
                />
              </View>

              <View>
                <Text
                  style={
                    styles.matchedClaimLabel
                  }
                >
                  MATCHED CLAIM
                </Text>

                <Text
                  style={
                    styles.matchedClaimHelper
                  }
                >
                  Closest claim found in the evidence record
                </Text>
              </View>
            </View>

            <Text
              style={
                styles.matchedClaimText
              }
            >
              “{result.matchedClaim}”
            </Text>
          </View>
        )}

        {/* SOURCES */}
        {displayedSources.length > 0 ? (
          displayedSources.map(
            (source, index) => (
              <React.Fragment
                key={source.id}
              >
                <View
                  style={
                    styles.sectionHeader
                  }
                >
                  <View>
                    <Text
                      style={
                        styles.sectionTitle
                      }
                    >
                      {source.isPrimary
                        ? 'Primary source'
                        : 'Supporting source'}
                    </Text>

                    <Text
                      style={
                        styles.sectionSubtitle
                      }
                    >
                      {source.isPrimary
                        ? 'Main evidence linked to the claim'
                        : 'Additional context related to the claim'}
                    </Text>
                  </View>

                  {source.isPrimary && (
                    <View
                      style={
                        styles.primaryBadge
                      }
                    >
                      <Ionicons
                        name="star"
                        size={12}
                        color="#B66D00"
                      />

                      <Text
                        style={
                          styles.primaryBadgeText
                        }
                      >
                        PRIMARY
                      </Text>
                    </View>
                  )}
                </View>

                <View
                  style={styles.sourceCard}
                >
                  <View
                    style={styles.sourceTop}
                  >
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

                    <View
                      style={
                        styles.sourceIdentity
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
                          styles.sourceOrganization
                        }
                      >
                        {source.organization ||
                          'Published source'}
                      </Text>
                    </View>

                    <View
                      style={
                        styles.verifiedSourceIcon
                      }
                    >
                      <Ionicons
                        name="checkmark-circle"
                        size={22}
                        color="#28A36A"
                      />
                    </View>
                  </View>

                  {/* SOURCE TITLE */}
                  <View
                    style={
                      styles.sourceTitleBlock
                    }
                  >
                    <Text
                      style={
                        styles.sourceTitleLabel
                      }
                    >
                      SOURCE TITLE
                    </Text>

                    <Text
                      style={
                        styles.sourceTitleText
                      }
                    >
                      {source.title}
                    </Text>
                  </View>

                  {/* METADATA */}
                  <View
                    style={
                      styles.metadataGrid
                    }
                  >
                    <View
                      style={
                        styles.metadataItem
                      }
                    >
                      <Ionicons
                        name="calendar-outline"
                        size={17}
                        color={
                          COLORS.textSecondary
                        }
                      />

                      <View
                        style={
                          styles.metadataTextArea
                        }
                      >
                        <Text
                          style={
                            styles.metadataLabel
                          }
                        >
                          Published
                        </Text>

                        <Text
                          style={
                            styles.metadataValue
                          }
                          numberOfLines={2}
                        >
                          {source.publicationDate ||
                            'Not available'}
                        </Text>
                      </View>
                    </View>

                    <View
                      style={
                        styles.metadataItem
                      }
                    >
                      <Ionicons
                        name={
                          source.author
                            ? 'person-outline'
                            : 'business-outline'
                        }
                        size={17}
                        color={
                          COLORS.textSecondary
                        }
                      />

                      <View
                        style={
                          styles.metadataTextArea
                        }
                      >
                        <Text
                          style={
                            styles.metadataLabel
                          }
                        >
                          {source.author
                            ? 'Author'
                            : 'Organization'}
                        </Text>

                        <Text
                          style={
                            styles.metadataValue
                          }
                          numberOfLines={2}
                        >
                          {source.author ||
                            source.organization ||
                            'Not available'}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* SUMMARY */}
                  {source.summary && (
                    <View
                      style={
                        styles.summaryBlock
                      }
                    >
                      <View
                        style={
                          styles.evidenceBlockHeader
                        }
                      >
                        <Ionicons
                          name="information-circle-outline"
                          size={18}
                          color={COLORS.blue}
                        />

                        <Text
                          style={
                            styles.evidenceBlockTitle
                          }
                        >
                          Source summary
                        </Text>
                      </View>

                      <Text
                        style={
                          styles.evidenceText
                        }
                      >
                        {source.summary}
                      </Text>
                    </View>
                  )}

                  {/* EVIDENCE */}
                  <View
                    style={
                      styles.evidenceBlock
                    }
                  >
                    <View
                      style={
                        styles.evidenceBlockHeader
                      }
                    >
                      <Ionicons
                        name="document-text-outline"
                        size={18}
                        color={COLORS.blue}
                      />

                      <Text
                        style={
                          styles.evidenceBlockTitle
                        }
                      >
                        Evidence
                      </Text>
                    </View>

                    <Text
                      style={
                        styles.evidenceText
                      }
                    >
                      {source.evidenceText}
                    </Text>
                  </View>

                  {/* PROVENANCE */}
                  <View
                    style={
                      styles.provenanceBlock
                    }
                  >
                    <View
                      style={
                        styles.provenanceHeader
                      }
                    >
                      <View
                        style={
                          styles.provenanceIcon
                        }
                      >
                        <Ionicons
                          name="git-branch-outline"
                          size={19}
                          color="#7357D9"
                        />
                      </View>

                      <View
                        style={
                          styles.provenanceHeaderText
                        }
                      >
                        <Text
                          style={
                            styles.provenanceTitle
                          }
                        >
                          Source provenance
                        </Text>

                        <Text
                          style={
                            styles.provenanceSubtitle
                          }
                        >
                          Where this evidence comes from
                        </Text>
                      </View>
                    </View>

                    <View
                      style={
                        styles.provenanceRow
                      }
                    >
                      <View
                        style={
                          styles.provenanceDot
                        }
                      />

                      <View
                        style={
                          styles.provenanceStep
                        }
                      >
                        <Text
                          style={
                            styles.provenanceStepTitle
                          }
                        >
                          Original publication
                        </Text>

                        <Text
                          style={
                            styles.provenanceStepText
                          }
                        >
                          {source.organization
                            ? `Published by ${source.organization}`
                            : `Published by ${source.sourceName}`}
                        </Text>
                      </View>
                    </View>

                    <View
                      style={
                        styles.provenanceLine
                      }
                    />

                    <View
                      style={
                        styles.provenanceRow
                      }
                    >
                      <View
                        style={
                          styles.provenanceDot
                        }
                      />

                      <View
                        style={
                          styles.provenanceStep
                        }
                      >
                        <Text
                          style={
                            styles.provenanceStepTitle
                          }
                        >
                          Evidence record
                        </Text>

                        <Text
                          style={
                            styles.provenanceStepText
                          }
                        >
                          {source.provenance ||
                            'Source details linked to the FactTrace evidence record.'}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* OPEN SOURCE */}
                  {source.originalUrl && (
                    <TouchableOpacity
                      activeOpacity={0.85}
                      style={
                        source.isPrimary
                          ? styles.openSourceButton
                          : styles.secondarySourceButton
                      }
                      onPress={() =>
                        openSource(
                          source.originalUrl,
                        )
                      }
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
                  )}
                </View>
              </React.Fragment>
            ),
          )
        ) : (
          <View
            style={styles.emptyCard}
          >
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
              FactTrace did not receive any
              evidence sources for this claim.
            </Text>
          </View>
        )}

        {/* BACK */}
        <TouchableOpacity
          activeOpacity={0.8}
          style={
            styles.backToResultsButton
          }
          onPress={() =>
            navigation.goBack()
          }
        >
          <Ionicons
            name="arrow-back"
            size={19}
            color={
              COLORS.textPrimary
            }
          />

          <Text
            style={
              styles.backToResultsText
            }
          >
            Back to Evidence Results
          </Text>
        </TouchableOpacity>
      </ScrollView>
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

  /* HERO */

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
    borderColor:
      'rgba(255,255,255,0.03)',
    right: -45,
    top: -60,
  },

  heroCircleSmall: {
    position: 'absolute',
    width: 75,
    height: 75,
    borderRadius: 38,
    backgroundColor:
      'rgba(255,255,255,0.025)',
    right: 18,
    bottom: -26,
  },

  heroIcon: {
    width: 45,
    height: 45,
    borderRadius: 14,
    backgroundColor:
      'rgba(255,255,255,0.12)',
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
    backgroundColor:
      'rgba(255,255,255,0.15)',
  },

  /* CLAIM */

  claimCard: {
    marginTop: 17,
    borderRadius: 18,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: '#E1E8F0',
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
    backgroundColor: '#EDF4FF',
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

  /* MATCHED CLAIM */

  matchedClaimCard: {
    marginTop: 11,
    borderRadius: 18,
    backgroundColor: '#F6F3FF',
    borderWidth: 1,
    borderColor: '#E4DDFB',
    padding: 15,
  },

  matchedClaimHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  matchedClaimIcon: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: '#E9E2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },

  matchedClaimLabel: {
    color: '#6553A6',
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

  /* SECTION */

  sectionHeader: {
    marginTop: 23,
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

  primaryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF4DF',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 9,
  },

  primaryBadgeText: {
    marginLeft: 4,
    color: '#A56200',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.4,
  },

  /* SOURCE */

  sourceCard: {
    borderRadius: 19,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: '#E1E8F0',
    padding: 15,

    shadowColor: '#18334E',
    shadowOpacity: 0.04,
    shadowRadius: 9,
    shadowOffset: {
      width: 0,
      height: 3,
    },

    elevation: 1,
  },

  sourceTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  sourceIconBlue: {
    width: 43,
    height: 43,
    borderRadius: 13,
    backgroundColor: '#EDF4FF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  sourceIconPurple: {
    width: 43,
    height: 43,
    borderRadius: 13,
    backgroundColor: '#F2EEFF',
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
    backgroundColor: '#F7F9FC',
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

  /* METADATA */

  metadataGrid: {
    marginTop: 12,
    flexDirection: 'row',
    gap: 9,
  },

  metadataItem: {
    flex: 1,
    minHeight: 62,
    borderRadius: 13,
    backgroundColor: '#F6F8FB',
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

  /* SUMMARY / EVIDENCE */

  summaryBlock: {
    marginTop: 15,
    borderRadius: 15,
    backgroundColor: '#F5F8FC',
    padding: 13,
  },

  evidenceBlock: {
    marginTop: 12,
    borderRadius: 15,
    backgroundColor: '#F5F8FC',
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

  /* PROVENANCE */

  provenanceBlock: {
    marginTop: 15,
    borderRadius: 15,
    backgroundColor: '#F6F3FF',
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
    backgroundColor: '#E9E2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  provenanceHeaderText: {
    marginLeft: 9,
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
    backgroundColor: '#CFC4F5',
  },

  /* BUTTONS */

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
    backgroundColor:
      'rgba(255,255,255,0.16)',
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
    borderColor: '#D7E3F4',
    backgroundColor: '#F4F8FE',
    paddingHorizontal: 13,
    flexDirection: 'row',
    alignItems: 'center',
  },

  secondaryOpenSourceIcon: {
    width: 35,
    height: 35,
    borderRadius: 10,
    backgroundColor: '#E7F0FF',
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
    borderColor: '#E1E8F0',
    backgroundColor: COLORS.white,
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

  /* EMPTY */

  emptyCard: {
    marginTop: 22,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E1E8F0',
    backgroundColor: COLORS.white,
    padding: 24,
    alignItems: 'center',
  },

  emptyIcon: {
    width: 52,
    height: 52,
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

  /* ERROR */

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
    backgroundColor: '#EDF4FF',
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