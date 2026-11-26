import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  Alert,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import { ThemeColors } from '../constants/app';
import { useAppTheme } from '../theme/AppTheme';

import {
  DeviceDecision,
  getDeviceStatus,
  startDeviceTrial,
} from '../services/deviceService';

//in study trials the decision comes from the device buttons in both conditions, so the input is the same;
//this panel replaces the on-screen buttons, waits for the press and shows a neutral confirmation (never right or wrong)

const RETRY_MS = 1000; //pause before asking again after an error or a wrong trial (normal requests wait on the server)
const OFFLINE_FALLBACK_MS = 5000; //offer the researcher fallback after this long without a connected device

export const DEVICE_DECISION_LABELS: Record<DeviceDecision, string> = {
  trust: 'Trust',
  dont_trust: "Don't trust",
  unsure: 'Unsure',
};

type Props = {
  //the study trial this screen belongs to (the screen's study context)
  trial: {
    participantId: string;
    trialIndex: number;
    claimId: string;
    condition: 'app' | 'browser';
  };

  //the press is kept by the backend either way; this only stops the panel from handing it on twice
  decision: DeviceDecision | null;

  onDecision: (decision: DeviceDecision) => void;

  //researcher fallback when the device does not work: the screen shows its on-screen buttons instead
  onUseScreenButtons: () => void;
};

type Problem =
  | 'none'
  | 'offline'
  | 'server'
  | 'other_trial';

export default function DeviceDecisionPanel({
  trial,
  decision,
  onDecision,
  onUseScreenButtons,
}: Props) {
  const { colors: COLORS } = useAppTheme();
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);

  const [problem, setProblem] = useState<Problem>('none');
  const [problemSince, setProblemSince] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());
  const [restartCount, setRestartCount] = useState(0);
  const [isRestarting, setIsRestarting] = useState(false);
  const trialIndex = trial.trialIndex;

  const waiting = decision === null;
  const onDecisionRef = useRef(onDecision);
  onDecisionRef.current = onDecision;

  //while there is a problem, tick once a second so the researcher fallback appears on time
  useEffect(() => {
    if (problem === 'none') {
      return;
    }

    const tick = setInterval(() => setNow(Date.now()), 1000);

    return () => clearInterval(tick);
  }, [problem]);

  //asks while no decision is held; if the screen drops its decision (for example a failed save),
  //polling starts again and picks up the same press, which the backend keeps for this trial
  useEffect(() => {
    if (!waiting) {
      return;
    }

    let active = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let online = true; //what the app last saw; the server answers as soon as this changes

    const report = (next: Problem) => {
      setProblem(next);
      setProblemSince(current =>
        next === 'none' ? null : current ?? Date.now(),
      );
      setNow(Date.now());
    };

    const poll = async () => {
      let delay = 0;

      try {
        const status = await getDeviceStatus({
          trialIndex,
          online,
        });

        if (!active) {
          return;
        }

        online = status.deviceOnline;

        if (status.trialIndex !== trialIndex) {
          //a backend restart or another app started a different trial
          report('other_trial');
          delay = RETRY_MS;
        } else if (
          status.decisionRecorded &&
          status.decision
        ) {
          report('none');
          onDecisionRef.current(status.decision);
          return;
        } else {
          report(status.deviceOnline ? 'none' : 'offline');
        }
      } catch {
        if (!active) {
          return;
        }

        report('server');
        delay = RETRY_MS;
      }

      timer = setTimeout(() => void poll(), delay);
    };

    void poll();

    return () => {
      active = false;

      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [trialIndex, waiting, restartCount]);

  //the server lost this trial (for example after a restart): start it again so the light and the press match it
  const restartTrial = async () => {
    setIsRestarting(true);

    try {
      await startDeviceTrial(trial);
      setProblem('none');
      setProblemSince(null);
      setRestartCount(count => count + 1);
    } catch {
      setProblem('server');
    } finally {
      setIsRestarting(false);
    }
  };

  const confirmFallback = () => {
    const title = 'Use on-screen buttons?';
    const message =
      'For the researcher only. Use this if the device cannot be fixed now. The decision is still saved, but without the device timing.';

    //alert buttons do nothing on web, so the browser's own confirm box is used there
    if (Platform.OS === 'web') {
      if (window.confirm(`${title}\n\n${message}`)) {
        onUseScreenButtons();
      }
      return;
    }

    Alert.alert(title, message, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Use on-screen buttons', onPress: onUseScreenButtons },
    ]);
  };

  if (decision) {
    return (
      <View
        style={styles.card}
        accessibilityLiveRegion="polite"
        accessible
        accessibilityLabel={`You chose ${DEVICE_DECISION_LABELS[decision]}. Recorded.`}
      >
        <View style={styles.row}>
          <Ionicons name="checkmark-circle-outline" size={24} color={COLORS.blue} />
          <Text style={styles.title}>
            You chose {DEVICE_DECISION_LABELS[decision]}. Recorded.
          </Text>
        </View>
      </View>
    );
  }

  const problemText: Record<Exclude<Problem, 'none'>, string> = {
    offline: 'The device is not connected. Check that it is powered and on the same Wi-Fi. Waiting for it to reconnect.',
    server: 'Cannot reach the server. Waiting to reconnect.',
    other_trial: 'The server is not on this trial (for example after a server restart). Restart it on the device.',
  };

  const showFallback =
    problem !== 'none' &&
    problemSince !== null &&
    now - problemSince >= OFFLINE_FALLBACK_MS;

  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <Ionicons name="hardware-chip-outline" size={24} color={COLORS.blue} />
        <Text style={styles.title}>Press a button on the device</Text>
      </View>

      <Text style={styles.text}>
        Trust, Unsure or Don't trust. Your choice is recorded as soon as you press.
      </Text>

      {problem !== 'none' ? (
        <Text
          style={styles.problem}
          accessibilityRole="alert"
        >
          {problemText[problem]}
        </Text>
      ) : null}

      {problem === 'other_trial' ? (
        <TouchableOpacity
          accessibilityRole="button"
          style={styles.fallbackButton}
          disabled={isRestarting}
          onPress={() => void restartTrial()}
        >
          <Text style={styles.fallbackText}>
            {isRestarting ? 'Restarting…' : 'Restart this trial on the device'}
          </Text>
        </TouchableOpacity>
      ) : null}

      {showFallback ? (
        <TouchableOpacity
          accessibilityRole="button"
          style={styles.fallbackButton}
          onPress={confirmFallback}
        >
          <Text style={styles.fallbackText}>
            Researcher: use on-screen buttons
          </Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const createStyles = (COLORS: ThemeColors) =>
  StyleSheet.create({
    card: {
      backgroundColor: COLORS.surface,
      borderColor: COLORS.border,
      borderWidth: 1,
      borderRadius: 16,
      padding: 18,
      gap: 10,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    title: {
      flex: 1,
      color: COLORS.textPrimary,
      fontSize: 17,
      fontWeight: '700',
    },
    text: {
      color: COLORS.textSecondary,
      fontSize: 15,
      lineHeight: 21,
    },
    problem: {
      color: COLORS.textPrimary,
      backgroundColor: COLORS.lightButton,
      borderRadius: 10,
      padding: 12,
      fontSize: 15,
      lineHeight: 21,
    },
    fallbackButton: {
      alignSelf: 'flex-start',
      paddingVertical: 10,
      paddingHorizontal: 14,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: COLORS.border,
    },
    fallbackText: {
      color: COLORS.textSecondary,
      fontSize: 14,
      fontWeight: '600',
    },
  });
