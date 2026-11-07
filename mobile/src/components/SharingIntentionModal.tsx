import React, { useMemo } from 'react';

import {
  ActivityIndicator,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { ThemeColors } from '../constants/app';
import { useAppTheme } from '../theme/AppTheme';

export type SharingIntention = 'yes' | 'no' | 'not_sure';

type Props = {
  visible: boolean;
  isSubmitting: boolean;
  error?: string | null;
  practice?: boolean;
  onSkip?: () => void;
  onSelect: (intention: SharingIntention) => void;
};

const OPTIONS: {
  value: SharingIntention;
  label: string;
}[] = [
  { value: 'yes', label: 'Yes' },
  { value: 'no', label: 'No' },
  { value: 'not_sure', label: 'Not Sure' },
];

export default function SharingIntentionModal({
  visible,
  isSubmitting,
  error,
  practice = false,
  onSkip,
  onSelect,
}: Props) {
  const { colors: COLORS, isDark } = useAppTheme();

  const styles = useMemo(
    () => createStyles(COLORS, isDark),
    [COLORS, isDark],
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={() => undefined}
    >
      <View style={styles.overlay}>
        <View
          accessibilityViewIsModal
          style={styles.card}
        >
          <Text style={styles.title}>
            Would you share this claim?
          </Text>

          <Text style={styles.description}>
            Now that you've reviewed the verification results and sources,
            would you share this claim with others?
          </Text>

          <Text style={styles.note}>
            {practice
              ? 'PRACTICE ONLY: choose whether you would share it. Nothing will be shared or saved.'
              : 'This will not share anything automatically.'}
          </Text>

          <View style={styles.options}>
            {OPTIONS.map(option => (
              <TouchableOpacity
                key={option.value}
                accessibilityRole="button"
                disabled={isSubmitting}
                activeOpacity={0.82}
                style={styles.option}
                onPress={() => onSelect(option.value)}
              >
                {isSubmitting ? (
                  <ActivityIndicator color={COLORS.blue} />
                ) : (
                  <Text style={styles.optionText}>
                    {option.label}
                  </Text>
                )}
              </TouchableOpacity>
            ))}
          </View>

          {error ? (
            <Text
              accessibilityRole="alert"
              style={styles.error}
            >
              {error}
            </Text>
          ) : null}

          <Text style={styles.footer}>
            Choose one answer to continue.
          </Text>

          {practice && onSkip ? (
            <TouchableOpacity
              accessibilityRole="button"
              onPress={onSkip}
              style={styles.practiceSkip}
            >
              <Text style={styles.practiceSkipText}>
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
      justifyContent: 'center',
      paddingHorizontal: 22,
      backgroundColor: 'rgba(16, 34, 56, 0.48)',
    },

    card: {
      minHeight: 360,
      justifyContent: 'center',
      borderRadius: 22,
      backgroundColor: COLORS.surface,
      borderWidth: isDark ? 1 : 0,
      borderColor: COLORS.border,
      padding: 22,
    },

    title: {
      color: COLORS.textPrimary,
      fontSize: 22,
      lineHeight: 28,
      fontWeight: '800',
    },

    description: {
      marginTop: 10,
      color: COLORS.textSecondary,
      fontSize: 15,
      lineHeight: 20,
    },

    note: {
      marginTop: 18,
      color: COLORS.textSecondary,
      fontSize: 12,
      lineHeight: 18,
    },

    options: {
      flexDirection: 'row',
      columnGap: 8,
      marginTop: 22,
    },

    option: {
      flex: 1,
      minHeight: 49,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 13,
      backgroundColor: COLORS.blueLight,
      paddingHorizontal: 4,
    },

    optionText: {
      color: COLORS.textPrimary,
      fontSize: 13,
      fontWeight: '700',
    },

    error: {
      marginTop: 12,
      color: COLORS.red,
      fontSize: 12,
      lineHeight: 17,
    },

    practiceSkip: {
      alignItems: 'center',
      paddingVertical: 12,
      marginTop: 10,
    },

    practiceSkipText: {
      color: COLORS.blue,
      fontSize: 14,
      fontWeight: '700',
    },

    footer: {
      marginTop: 24,
      color: COLORS.textSecondary,
      fontSize: 12,
    },
  });