/*
 * SUS (Brooke, 1996) and raw NASA-TLX (Hart & Staveland, 1988), filled in
 * after each block, about the tool used in that block.
 * No answer is pre-selected, so a default can not bias the response.
 * The scores are calculated by the backend, never shown to the participant.
 */
import React, {
  useMemo,
  useState,
} from 'react';

import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { ThemeColors } from '../constants/app';

import { useAppTheme } from '../theme/AppTheme';

import {
  StudyCondition,
  submitQuestionnaire,
  TlxRatings,
} from '../services/studyService';

type Props = {
  participantId: string;
  condition: StudyCondition;
  blockIndex: 1 | 2;
  onSubmitted: () => void;
};

//standard SUS wording, "system" replaced with the tool used in the block
function susItems(tool: string): string[] {
  return [
    `I think that I would like to use ${tool} frequently.`,
    `I found ${tool} unnecessarily complex.`,
    `I thought ${tool} was easy to use.`,
    `I think that I would need the support of a technical person to be able to use ${tool}.`,
    `I found the various functions in ${tool} were well integrated.`,
    `I thought there was too much inconsistency in ${tool}.`,
    `I would imagine that most people would learn to use ${tool} very quickly.`,
    `I found ${tool} very cumbersome to use.`,
    `I felt very confident using ${tool}.`,
    `I needed to learn a lot of things before I could get going with ${tool}.`,
  ];
}

const SUS_LABELS = [
  'Strongly disagree',
  'Disagree',
  'Neutral',
  'Agree',
  'Strongly agree',
];

const TLX_SCALES: Array<{
  key: keyof TlxRatings;
  title: string;
  question: string;
  low: string;
  high: string;
}> = [
  {
    key: 'mental',
    title: 'Mental demand',
    question: 'How mentally demanding was the task?',
    low: 'Very low',
    high: 'Very high',
  },
  {
    key: 'physical',
    title: 'Physical demand',
    question: 'How physically demanding was the task?',
    low: 'Very low',
    high: 'Very high',
  },
  {
    key: 'temporal',
    title: 'Temporal demand',
    question: 'How hurried or rushed was the pace of the task?',
    low: 'Very low',
    high: 'Very high',
  },
  {
    key: 'performance',
    title: 'Performance',
    question: 'How successful were you in accomplishing what you were asked to do?',
    low: 'Perfect',
    high: 'Failure',
  },
  {
    key: 'effort',
    title: 'Effort',
    question: 'How hard did you have to work to accomplish your level of performance?',
    low: 'Very low',
    high: 'Very high',
  },
  {
    key: 'frustration',
    title: 'Frustration',
    question: 'How insecure, discouraged, irritated, stressed, and annoyed were you?',
    low: 'Very low',
    high: 'Very high',
  },
];

//the 21 marks of the NASA-TLX scale: 0, 5, ..., 100
const TLX_MARKS = Array.from(
  { length: 21 },
  (_, index) => index * 5,
);

export default function BlockQuestionnaire({
  participantId,
  condition,
  blockIndex,
  onSubmitted,
}: Props) {
  const {
    colors: COLORS,
    isDark,
  } = useAppTheme();

  const styles = useMemo(
    () => createStyles(COLORS, isDark),
    [COLORS, isDark],
  );

  const tool =
    condition === 'app'
      ? 'FactTrace'
      : 'the browser search';

  const items = useMemo(
    () => susItems(tool),
    [tool],
  );

  const [sus, setSus] = useState<Array<number | null>>(
    Array(10).fill(null),
  );

  const [tlx, setTlx] = useState<Partial<TlxRatings>>({});

  const [isSaving, setIsSaving] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const susMissing = sus
    .map((value, index) => (value === null ? index + 1 : null))
    .filter((value): value is number => value !== null);

  const tlxMissing = TLX_SCALES.filter(
    scale => tlx[scale.key] === undefined,
  ).map(scale => scale.title);

  const complete =
    susMissing.length === 0 &&
    tlxMissing.length === 0;

  const submit = async () => {
    if (!complete || isSaving) {
      setError(
        [
          susMissing.length > 0
            ? `Usability statements still to answer: ${susMissing.join(', ')}.`
            : null,
          tlxMissing.length > 0
            ? `Workload scales still to rate: ${tlxMissing.join(', ')}.`
            : null,
        ]
          .filter(Boolean)
          .join(' '),
      );
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      await submitQuestionnaire({
        participantId,
        condition,
        blockIndex,
        sus: sus as number[],
        tlx: tlx as TlxRatings,
      });

      onSubmitted();
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? `${saveError.message} Your answers are still here, so you can try again.`
          : 'Could not save the questionnaire. Your answers are still here, so you can try again.',
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <View>
      <View style={styles.card}>
        <Text style={styles.eyebrow}>
          After block {blockIndex} of 2
        </Text>

        <Text style={styles.title}>
          About {tool}
        </Text>

        <Text style={styles.intro}>
          Please answer about the tool you just used ({tool}) for the claims in
          this block. There are no right or wrong answers.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>
          Part 1: Usability
        </Text>

        <Text style={styles.intro}>
          For each statement, choose how much you agree.
        </Text>

        {items.map((item, index) => (
          <View
            key={item}
            style={styles.question}
          >
            <Text style={styles.questionText}>
              {index + 1}. {item}
            </Text>

            <View style={styles.susRow}>
              {SUS_LABELS.map((label, labelIndex) => {
                const value = labelIndex + 1;
                const selected = sus[index] === value;

                return (
                  <TouchableOpacity
                    key={label}
                    accessibilityRole="radio"
                    accessibilityLabel={`${label}, statement ${index + 1}`}
                    accessibilityState={{ selected }}
                    style={[
                      styles.susButton,
                      selected && styles.optionSelected,
                    ]}
                    onPress={() =>
                      setSus(previous => {
                        const next = [...previous];
                        next[index] = value;
                        return next;
                      })
                    }
                  >
                    <Text
                      style={[
                        styles.susValue,
                        selected && styles.optionTextSelected,
                      ]}
                    >
                      {value}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.anchorRow}>
              <Text style={styles.anchor}>Strongly disagree</Text>
              <Text style={styles.anchor}>Strongly agree</Text>
            </View>
          </View>
        ))}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>
          Part 2: Workload
        </Text>

        <Text style={styles.intro}>
          Tap a mark on each scale, or use Lower / Higher to move in steps of 5.
          The scale goes from 0 to 100.
        </Text>

        {TLX_SCALES.map(scale => {
          const value = tlx[scale.key];

          return (
            <View
              key={scale.key}
              style={styles.question}
            >
              <Text style={styles.scaleTitle}>
                {scale.title}
                {value !== undefined ? `: ${value}` : ''}
              </Text>

              <Text style={styles.questionText}>
                {scale.question}
              </Text>

              <View
                style={styles.tlxRow}
                accessibilityRole="adjustable"
                accessibilityLabel={scale.title}
                accessibilityValue={
                  value !== undefined
                    ? { min: 0, max: 100, now: value }
                    : { text: 'Not rated' }
                }
                accessibilityActions={[
                  { name: 'increment' },
                  { name: 'decrement' },
                ]}
                onAccessibilityAction={event => {
                  const current = value ?? 50;
                  const next =
                    event.nativeEvent.actionName === 'increment'
                      ? Math.min(100, current + 5)
                      : Math.max(0, current - 5);
                  setTlx(previous => ({
                    ...previous,
                    [scale.key]: next,
                  }));
                }}
              >
                {TLX_MARKS.map(mark => {
                  const selected = value === mark;

                  return (
                    <TouchableOpacity
                      key={mark}
                      accessibilityElementsHidden
                      importantForAccessibility="no"
                      hitSlop={{ top: 8, bottom: 8 }}
                      style={[
                        styles.tlxMark,
                        mark === 50 && styles.tlxMarkMiddle,
                        selected && styles.tlxMarkSelected,
                      ]}
                      onPress={() =>
                        setTlx(previous => ({
                          ...previous,
                          [scale.key]: mark,
                        }))
                      }
                    />
                  );
                })}
              </View>

              <View style={styles.anchorRow}>
                <Text style={styles.anchor}>{scale.low}</Text>
                <Text style={styles.anchor}>{scale.high}</Text>
              </View>

              {/* the marks are narrow on a phone, so these full-size buttons do the same in steps of 5
                  (WCAG 2.2, 2.5.8: a small target is fine when an equivalent control is large enough) */}
              <View style={styles.stepRow}>
                {([-5, 5] as const).map(step => (
                  <TouchableOpacity
                    key={step}
                    accessibilityElementsHidden
                    importantForAccessibility="no"
                    style={styles.stepButton}
                    onPress={() =>
                      setTlx(previous => ({
                        ...previous,
                        [scale.key]: Math.min(
                          100,
                          Math.max(
                            0,
                            (previous[scale.key] ?? 50) + step,
                          ),
                        ),
                      }))
                    }
                  >
                    <Text style={styles.stepText}>
                      {step < 0 ? '−  Lower' : 'Higher  +'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          );
        })}
      </View>

      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      <TouchableOpacity
        accessibilityRole="button"
        accessibilityState={{ disabled: isSaving }}
        style={[
          styles.primaryButton,
          (!complete || isSaving) && styles.disabledButton,
        ]}
        onPress={() => void submit()}
      >
        {isSaving ? (
          <ActivityIndicator color={COLORS.white} />
        ) : (
          <Text style={styles.primaryButtonText}>
            Submit answers
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const createStyles = (
  COLORS: ThemeColors,
  isDark: boolean,
) =>
  StyleSheet.create({
    card: {
      backgroundColor: COLORS.surface,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: COLORS.border,
      padding: 18,
      marginBottom: 14,
    },

    eyebrow: {
      color: COLORS.blue,
      fontSize: 12,
      fontWeight: '800',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: 6,
    },

    title: {
      color: COLORS.textPrimary,
      fontSize: 22,
      fontWeight: '800',
      marginBottom: 8,
    },

    sectionTitle: {
      color: COLORS.textPrimary,
      fontSize: 18,
      fontWeight: '800',
      marginBottom: 6,
    },

    intro: {
      color: COLORS.textSecondary,
      fontSize: 14,
      lineHeight: 20,
    },

    question: {
      marginTop: 18,
    },

    questionText: {
      color: COLORS.textPrimary,
      fontSize: 15,
      lineHeight: 21,
      marginBottom: 10,
    },

    scaleTitle: {
      color: COLORS.textPrimary,
      fontSize: 15,
      fontWeight: '800',
      marginBottom: 4,
    },

    susRow: {
      flexDirection: 'row',
      gap: 8,
    },

    susButton: {
      flex: 1,
      minHeight: 44,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: COLORS.border,
      backgroundColor: COLORS.lightButton,
      alignItems: 'center',
      justifyContent: 'center',
    },

    susValue: {
      color: COLORS.textPrimary,
      fontSize: 16,
      fontWeight: '700',
    },

    optionSelected: {
      backgroundColor: COLORS.blue,
      borderColor: COLORS.blue,
    },

    optionTextSelected: {
      color: COLORS.white,
    },

    anchorRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 6,
    },

    anchor: {
      color: COLORS.textMuted,
      fontSize: 12,
    },

    tlxRow: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: 2,
      height: 44,
    },

    tlxMark: {
      flex: 1,
      height: 28,
      borderRadius: 3,
      backgroundColor: isDark
        ? COLORS.surfaceElevated
        : COLORS.lightButton,
      borderWidth: 1,
      borderColor: COLORS.border,
    },

    tlxMarkMiddle: {
      height: 40,
    },

    tlxMarkSelected: {
      height: 44,
      backgroundColor: COLORS.blue,
      borderColor: COLORS.blue,
    },

    stepRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: 12,
      marginTop: 10,
    },

    stepButton: {
      flex: 1,
      minHeight: 44,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: COLORS.border,
      backgroundColor: COLORS.lightButton,
      alignItems: 'center',
      justifyContent: 'center',
    },

    stepText: {
      color: COLORS.textPrimary,
      fontSize: 15,
      fontWeight: '700',
    },

    errorBox: {
      marginBottom: 14,
      borderRadius: 13,
      borderWidth: 1,
      borderColor: isDark ? COLORS.border : '#F3B7B7',
      backgroundColor: isDark ? COLORS.surfaceElevated : '#FFF3F3',
      padding: 14,
    },

    errorText: {
      color: COLORS.red,
      fontSize: 14,
      lineHeight: 20,
    },

    primaryButton: {
      minHeight: 52,
      borderRadius: 14,
      backgroundColor: COLORS.blue,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 16,
      marginBottom: 20,
    },

    disabledButton: {
      opacity: 0.55,
    },

    primaryButtonText: {
      color: COLORS.white,
      fontSize: 16,
      fontWeight: '800',
    },
  });
