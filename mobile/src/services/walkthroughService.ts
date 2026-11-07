
import AsyncStorage from '@react-native-async-storage/async-storage';

const WALKTHROUGH_STORAGE_KEY = '@facttrace/interactive-walkthrough';

// Serialize tutorial writes so a late keystroke save cannot overwrite Skip
// or Completed status. This queue touches no verification or study data.
let lastWalkthroughWrite: Promise<void> = Promise.resolve();

export type WalkthroughStep =
  | 'scan'
  | 'manual'
  | 'practice_claim'
  | 'practice_check'
  | 'practice_pending'
  | 'result_match'
  | 'result_source'
  | 'evidence_details'
  | 'evidence_return'
  | 'result_decision'
  | 'result_sharing'
  | 'history'
  | 'browser'
  | 'ready'
  | 'complete';

export const PRACTICE_CLAIM =
  'Honey never spoils if it is stored in a sealed container.';

export type WalkthroughStatus =
  | 'in_progress'
  | 'skipped'
  | 'completed';

export type WalkthroughState = {
  status: WalkthroughStatus;
  step?: WalkthroughStep;
  practiceClaim?: string;
  practiceDecision?: 'trust' | 'dont-trust' | 'unsure';
};

export async function getWalkthroughState(): Promise<WalkthroughState | null> {
  const stored = await AsyncStorage.getItem(WALKTHROUGH_STORAGE_KEY);

  if (!stored) {
    return null;
  }

  const parsed: unknown = JSON.parse(stored);

  if (typeof parsed !== 'object' || parsed === null) {
    throw new Error('Saved walkthrough progress is invalid.');
  }

  const state = parsed as Record<string, unknown>;

  if (state.status === 'skipped' || state.status === 'completed') {
    return { status: state.status };
  }

  if (
    state.status === 'in_progress' &&
    (state.step === 'scan' ||
      state.step === 'manual' ||
      state.step === 'practice_claim' ||
      state.step === 'practice_check' ||
      state.step === 'practice_pending' ||
      state.step === 'result_match' ||
      state.step === 'result_source' ||
      state.step === 'evidence_details' ||
      state.step === 'evidence_return' ||
      state.step === 'result_decision' ||
      state.step === 'result_sharing' ||
      state.step === 'history' ||
      state.step === 'browser' ||
      state.step === 'ready' ||
      state.step === 'complete')
  ) {
    return {
      status: 'in_progress',
      step: state.step,
      ...(typeof state.practiceClaim === 'string'
        ? { practiceClaim: state.practiceClaim }
        : {}),
      ...((state.practiceDecision === 'trust' ||
        state.practiceDecision === 'dont-trust' ||
        state.practiceDecision === 'unsure')
        ? { practiceDecision: state.practiceDecision }
        : {}),
    };
  }

  throw new Error('Saved walkthrough progress is invalid.');
}

export function saveWalkthroughState(
  state: WalkthroughState,
): Promise<void> {
  const value = JSON.stringify(state);

  const nextWrite = lastWalkthroughWrite
    .catch(() => undefined)
    .then(() =>
      AsyncStorage.setItem(WALKTHROUGH_STORAGE_KEY, value),
    );

  lastWalkthroughWrite = nextWrite;

  return nextWrite;
}
