import React from 'react';

import {
  ActivityIndicator,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { COLORS } from '../constants/app';

export type SharingIntention = 'yes' | 'no' | 'not_sure';

type Props = {
  visible: boolean;
  isSubmitting: boolean;
  error?: string | null;
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
  onSelect,
}: Props) {
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
          <Text style={styles.title}>Would you share this claim?</Text>
          <Text style={styles.description}>
            Now that you’ve reviewed the verification results and sources,
            would you share this claim with others?
          </Text>
          <Text style={styles.note}>
            This will not share anything automatically.
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
                  <Text style={styles.optionText}>{option.label}</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>

          {error ? (
            <Text accessibilityRole="alert" style={styles.error}>
              {error}
            </Text>
          ) : null}
          <Text style={styles.footer}>
            Choose one answer to continue.
          </Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
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
    backgroundColor: COLORS.white,
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
  footer: {
    marginTop: 24,
    color: COLORS.textSecondary,
    fontSize: 12,
  },
});
