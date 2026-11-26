import React, {
  useMemo,
  useState,
} from 'react';

import {
  ActivityIndicator,
  Linking,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import { ThemeColors } from '../constants/app';
import { useAppTheme } from '../theme/AppTheme';

import {
  DebriefClaim,
  getDebrief,
} from '../services/studyService';

//shown at the end of the session: the right answers for every claim the participant saw,
//with the reason and the main source, so no one leaves believing a false or misleading claim.
//answers are never shown during the trials (no verdicts); the participant's own choices and
//score are not shown either, because the study compares the tools, not the person.

const ANSWER_LABELS: Record<DebriefClaim['answer'], string> = {
  true: 'True',
  false: 'False',
  misleading: 'Misleading',
};

type Props = {
  participantId: string;
};

export default function StudyDebrief({
  participantId,
}: Props) {
  const { colors: COLORS } = useAppTheme();
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);

  const [claims, setClaims] = useState<DebriefClaim[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setIsLoading(true);
    setError(null);

    try {
      setClaims(await getDebrief(participantId));
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : 'Could not load the answers.',
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (!claims) {
    return (
      <View style={styles.wrap}>
        <Text style={styles.title}>Debrief</Text>
        <Text style={styles.text}>
          Some of the claims in this study were false or misleading on purpose. Go through the answers together before the participant leaves.
        </Text>

        {error ? (
          <Text style={styles.error} accessibilityRole="alert">
            {error}
          </Text>
        ) : null}

        <TouchableOpacity
          accessibilityRole="button"
          style={styles.button}
          disabled={isLoading}
          onPress={() => void load()}
        >
          {isLoading ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <Text style={styles.buttonText}>Show the answers</Text>
          )}
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>The answers</Text>
      <Text style={styles.text}>
        These claims were chosen to be hard to judge. The study compares the two ways of checking, not how well you did.
      </Text>

      {claims.map(claim => (
        <View
          key={claim.claimId}
          style={styles.item}
          accessible
          accessibilityLabel={`${claim.text}. ${ANSWER_LABELS[claim.answer]}. ${claim.rationale ?? ''}`}
        >
          <View style={styles.itemTop}>
            <Text style={styles.trial}>
              {claim.isPractice ? 'Practice' : `Trial ${claim.trialIndex}`}
            </Text>
            <Text style={styles.answer}>
              {ANSWER_LABELS[claim.answer]}
            </Text>
          </View>

          <Text style={styles.claim}>“{claim.text}”</Text>

          {claim.rationale ? (
            <Text style={styles.reason}>Why: {claim.rationale}</Text>
          ) : null}

          {claim.source ? (
            <TouchableOpacity
              accessibilityRole="link"
              accessibilityLabel={`Read more: ${claim.source.outlet}`}
              style={styles.sourceLink}
              onPress={() => {
                void Linking.openURL(claim.source!.url).catch(() => undefined);
              }}
            >
              <Ionicons name="open-outline" size={16} color={COLORS.blue} />
              <Text style={styles.sourceText}>
                Read more: {claim.source.outlet}
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>
      ))}
    </View>
  );
}

const createStyles = (COLORS: ThemeColors) =>
  StyleSheet.create({
    wrap: {
      alignSelf: 'stretch',
      gap: 12,
      marginTop: 8,
    },
    title: {
      color: COLORS.textPrimary,
      fontSize: 20,
      fontWeight: '800',
    },
    text: {
      color: COLORS.textSecondary,
      fontSize: 15,
      lineHeight: 21,
    },
    error: {
      color: COLORS.textPrimary,
      backgroundColor: COLORS.lightButton,
      borderRadius: 10,
      padding: 12,
      fontSize: 15,
    },
    button: {
      minHeight: 48,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: COLORS.blue,
    },
    buttonText: {
      color: COLORS.white,
      fontSize: 16,
      fontWeight: '700',
    },
    item: {
      borderWidth: 1,
      borderColor: COLORS.border,
      borderRadius: 16,
      padding: 14,
      gap: 8,
      backgroundColor: COLORS.surface,
    },
    itemTop: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    trial: {
      color: COLORS.textMuted,
      fontSize: 13,
      fontWeight: '700',
    },
    //the answer is a word, not a colour: no green or red, like the rest of the app
    answer: {
      color: COLORS.textPrimary,
      fontSize: 14,
      fontWeight: '800',
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: COLORS.border,
      overflow: 'hidden',
    },
    claim: {
      color: COLORS.textPrimary,
      fontSize: 16,
      fontWeight: '600',
      lineHeight: 22,
    },
    reason: {
      color: COLORS.textSecondary,
      fontSize: 14,
      lineHeight: 20,
    },
    sourceLink: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      minHeight: 44,
    },
    sourceText: {
      color: COLORS.blue,
      fontSize: 14,
      fontWeight: '700',
    },
  });
