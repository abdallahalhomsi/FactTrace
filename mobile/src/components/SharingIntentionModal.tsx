import React, {
  useMemo,
} from 'react';

import {
  ActivityIndicator,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import {
  ThemeColors,
} from '../constants/app';

import {
  useAppTheme,
} from '../theme/AppTheme';

export type SharingIntention =
  | '1'
  | '2'
  | '3'
  | '4'
  | '5'
  | '6'
  | '7';

type Props = {
  visible: boolean;

  isSubmitting: boolean;

  error?: string | null;

  practice?: boolean;

  onSkip?: () => void;

  onSelect:
    (
      intention:
        SharingIntention,
    ) => void;
};

const OPTIONS: Array<{
  value:
    SharingIntention;

  label:
    string;
}> = [
  {
    value: '1',
    label: '1',
  },
  {
    value: '2',
    label: '2',
  },
  {
    value: '3',
    label: '3',
  },
  {
    value: '4',
    label: '4',
  },
  {
    value: '5',
    label: '5',
  },
  {
    value: '6',
    label: '6',
  },
  {
    value: '7',
    label: '7',
  },
];

export default function SharingIntentionModal({
  visible,
  isSubmitting,
  error,
  practice = false,
  onSkip,
  onSelect,
}: Props) {
  const {
    colors: COLORS,
    isDark,
  } =
    useAppTheme();

  const styles =
    useMemo(
      () =>
        createStyles(
          COLORS,
          isDark,
        ),
      [
        COLORS,
        isDark,
      ],
    );

  return (
    <Modal
      visible={
        visible
      }

      transparent

      animationType="fade"

      statusBarTranslucent

      onRequestClose={() =>
        undefined
      }
    >
      <View
        style={
          styles.overlay
        }
      >
        <View
          accessibilityViewIsModal

          style={
            styles.card
          }
        >
          <Text
            style={
              styles.eyebrow
            }
          >
            SHARING INTENTION
          </Text>

          <Text
            style={
              styles.title
            }
          >
            How likely would you be to share this claim on social media?
          </Text>

          <Text
            style={
              styles.description
            }
          >
            Choose one response from 1 to 7.
          </Text>

          <View
            style={
              styles.anchorRow
            }
          >
            <Text
              style={
                styles.anchorText
              }
            >
              1 = Extremely unlikely
            </Text>

            <Text
              style={
                styles.anchorTextRight
              }
            >
              7 = Extremely likely
            </Text>
          </View>

          <View
            style={
              styles.options
            }
          >
            {OPTIONS.map(
              option => (
                <TouchableOpacity
                  key={
                    option.value
                  }

                  accessibilityRole="button"

                  accessibilityLabel={
                    option.value ===
                    '1'
                      ? '1, extremely unlikely'
                      : option.value ===
                        '7'
                        ? '7, extremely likely'
                        : option.label
                  }

                  disabled={
                    isSubmitting
                  }

                  activeOpacity={
                    0.82
                  }

                  style={
                    styles.option
                  }

                  onPress={() =>
                    onSelect(
                      option.value,
                    )
                  }
                >
                  {isSubmitting ? (
                    <ActivityIndicator
                      size="small"

                      color={
                        COLORS.blue
                      }
                    />
                  ) : (
                    <Text
                      style={
                        styles.optionText
                      }
                    >
                      {
                        option.label
                      }
                    </Text>
                  )}
                </TouchableOpacity>
              ),
            )}
          </View>

          <View
            style={
              styles.middleAnchor
            }
          >
            <Text
              style={
                styles.middleAnchorText
              }
            >
              4 = Neither likely nor unlikely
            </Text>
          </View>

          {practice ? (
            <Text
              style={
                styles.note
              }
            >
              PRACTICE ONLY: this response is not included in the final study analysis.
            </Text>
          ) : (
            <Text
              style={
                styles.note
              }
            >
              Selecting a response does not share anything automatically.
            </Text>
          )}

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

          <Text
            style={
              styles.footer
            }
          >
            Choose one answer to continue.
          </Text>

          {practice &&
          onSkip ? (
            <TouchableOpacity
              accessibilityRole="button"

              onPress={
                onSkip
              }

              style={
                styles.practiceSkip
              }
            >
              <Text
                style={
                  styles.practiceSkipText
                }
              >
                Skip Walkthrough
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

const createStyles = (
  COLORS: ThemeColors,
  isDark: boolean,
) =>
  StyleSheet.create({
    overlay: {
      flex: 1,

      justifyContent:
        'center',

      paddingHorizontal:
        18,

      backgroundColor:
        'rgba(16, 34, 56, 0.55)',
    },

    card: {
      borderRadius:
        22,

      backgroundColor:
        COLORS.surface,

      borderWidth:
        isDark
          ? 1
          : 0,

      borderColor:
        COLORS.border,

      padding:
        22,
    },

    eyebrow: {
      color:
        COLORS.blue,

      fontSize:
        10,

      fontWeight:
        '800',

      letterSpacing:
        0.8,

      marginBottom:
        7,
    },

    title: {
      color:
        COLORS.textPrimary,

      fontSize:
        21,

      lineHeight:
        28,

      fontWeight:
        '800',
    },

    description: {
      marginTop:
        8,

      color:
        COLORS.textSecondary,

      fontSize:
        14,

      lineHeight:
        20,
    },

    anchorRow: {
      flexDirection:
        'row',

      justifyContent:
        'space-between',

      marginTop:
        22,

      columnGap:
        12,
    },

    anchorText: {
      flex: 1,

      color:
        COLORS.textSecondary,

      fontSize:
        10.5,

      lineHeight:
        15,

      fontWeight:
        '600',
    },

    anchorTextRight: {
      flex: 1,

      color:
        COLORS.textSecondary,

      fontSize:
        10.5,

      lineHeight:
        15,

      fontWeight:
        '600',

      textAlign:
        'right',
    },

    options: {
      flexDirection:
        'row',

      columnGap:
        5,

      marginTop:
        10,
    },

    option: {
      flex: 1,

      aspectRatio:
        1,

      maxHeight:
        48,

      alignItems:
        'center',

      justifyContent:
        'center',

      borderRadius:
        11,

      backgroundColor:
        COLORS.blueLight,

      borderWidth:
        1,

      borderColor:
        COLORS.border,
    },

    optionText: {
      color:
        COLORS.textPrimary,

      fontSize:
        15,

      fontWeight:
        '800',
    },

    middleAnchor: {
      alignItems:
        'center',

      marginTop:
        9,
    },

    middleAnchorText: {
      color:
        COLORS.textMuted,

      fontSize:
        10.5,
    },

    note: {
      marginTop:
        20,

      color:
        COLORS.textSecondary,

      fontSize:
        11.5,

      lineHeight:
        17,
    },

    error: {
      marginTop:
        12,

      color:
        COLORS.red,

      fontSize:
        12,

      lineHeight:
        17,
    },

    footer: {
      marginTop:
        18,

      color:
        COLORS.textMuted,

      fontSize:
        11.5,
    },

    practiceSkip: {
      alignItems:
        'center',

      paddingVertical:
        12,

      marginTop:
        8,
    },

    practiceSkipText: {
      color:
        COLORS.blue,

      fontSize:
        14,

      fontWeight:
        '700',
    },
  });