
import AsyncStorage from '@react-native-async-storage/async-storage';

import { DecisionRequest } from '../types/api';
import { apiRequest } from './api';

const EVALUATION_STORAGE_KEY = '@facttrace/evaluation-records';
const PARTICIPANT_ID_PATTERN = /^P\d{1,3}$/i;

// Extra study fields are optional so existing app/guest evaluations keep working.
// The backend accepts these fields on POST /api/decisions.
export type EvaluationPayload = Omit<DecisionRequest, 'participantId'> & {
  clientRecordId?: string;
  trialIndex?: number;
  isPractice?: boolean;
  matchScore?: number;
  weakReason?: 'low_similarity' | 'low_ocr_confidence' | 'both' | null;
};
export type EvaluationRecord = EvaluationPayload & {
  recordId: string;
  savedAt: string;
  durationMs: number;
  sourcesConsulted?: { title: string; url: string }[];
  // Client-only identifier for one particular attempt. This is NOT a backend
  // session/assignment ID and must never be sent in place of a real claimId.
  localTrialKey?: string;
  localTrialNumber?: number;
  participantId?: string;
  serverStatus: 'pending' | 'submitted' | 'not_submitted' | 'failed';
  serverMessage: string;
  serverDecisionId?: string;
};

export type EvaluationSubmissionResult = {
  saved: boolean;
  message: string;
  recordId: string;
  serverStatus: EvaluationRecord['serverStatus'];
  reusedExisting?: boolean;
  localTrialNumber?: number;
};

type DecisionApiResponse = {
  success: boolean;
  data?: { decisionId: string; durationMs: number };
  error?: string | { code: string; message: string };
};

type LocalDetails = {
  sourcesConsulted?: EvaluationRecord['sourcesConsulted'];
  localTrialKey?: string;
};

let storageQueue: Promise<void> = Promise.resolve();

function runExclusive<T>(operation: () => Promise<T>): Promise<T> {
  const result = storageQueue.then(operation);
  storageQueue = result.then(() => undefined, () => undefined);
  return result;
}

function isEvaluationRecord(value: unknown): value is EvaluationRecord {
  if (typeof value !== 'object' || value === null) return false;
  const r = value as Record<string, unknown>;
  return (
    typeof r.recordId === 'string' &&
    typeof r.savedAt === 'string' &&
    typeof r.durationMs === 'number' &&
    ['pending', 'submitted', 'not_submitted', 'failed'].includes(
      String(r.serverStatus),
    ) &&
    typeof r.serverMessage === 'string' &&
    typeof r.claimText === 'string' &&
    ['trust', 'dont_trust', 'unsure'].includes(String(r.decision)) &&
    ['yes', 'no', 'not_sure'].includes(String(r.sharingIntention)) &&
    (r.localTrialKey === undefined || typeof r.localTrialKey === 'string') &&
    (r.localTrialNumber === undefined ||
      (typeof r.localTrialNumber === 'number' &&
        Number.isInteger(r.localTrialNumber) &&
        r.localTrialNumber > 0)) &&
    (r.sourcesConsulted === undefined ||
      (Array.isArray(r.sourcesConsulted) &&
        r.sourcesConsulted.every(
          (s: unknown) =>
            typeof s === 'object' &&
            s !== null &&
            typeof (s as { title?: unknown }).title === 'string' &&
            typeof (s as { url?: unknown }).url === 'string',
        )))
  );
}

async function readRecords(): Promise<EvaluationRecord[]> {
  const stored = await AsyncStorage.getItem(EVALUATION_STORAGE_KEY);
  if (!stored) return [];
  try {
    const parsed: unknown = JSON.parse(stored);
    if (!Array.isArray(parsed)) {
      throw new Error('Stored evaluation records are not a list.');
    }
    return parsed.filter(isEvaluationRecord);
  } catch (error) {
    console.warn('Local evaluation records were malformed and were cleared.', error);
    await AsyncStorage.removeItem(EVALUATION_STORAGE_KEY);
    return [];
  }
}

async function writeRecord(record: EvaluationRecord): Promise<void> {
  const records = await readRecords();
  const next = records.some(item => item.recordId === record.recordId)
    ? records.map(item => (item.recordId === record.recordId ? record : item))
    : [record, ...records];
  await AsyncStorage.setItem(EVALUATION_STORAGE_KEY, JSON.stringify(next));
}

function resultFor(
  record: EvaluationRecord,
  reusedExisting = false,
): EvaluationSubmissionResult {
  return {
    saved: true,
    recordId: record.recordId,
    message: record.serverMessage,
    serverStatus: record.serverStatus,
    ...(reusedExisting ? { reusedExisting: true } : {}),
    ...(record.localTrialNumber !== undefined
      ? { localTrialNumber: record.localTrialNumber }
      : {}),
  };
}

async function submitRecord(
  record: EvaluationRecord,
): Promise<EvaluationSubmissionResult> {
  if (!record.participantId) return resultFor(record);
  if (record.serverStatus === 'submitted') return resultFor(record, true);

  const pending: EvaluationRecord = {
    ...record,
    serverStatus: 'pending',
    serverMessage: 'Saved locally; waiting for server confirmation.',
  };
  await writeRecord(pending);

  // Always send exactly the same stored evaluation with the SAME clientRecordId.
  // Do not recalculate endedAt, replace the answer, or regenerate an ID on retry.
  const payload: EvaluationPayload & { participantId: string } = {
    ...record,
    participantId: record.participantId,
    clientRecordId: record.recordId,
  };

  // Strip client-only metadata; only API fields should reach the backend.
  const {
    recordId: _recordId,
    savedAt: _savedAt,
    durationMs: _durationMs,
    sourcesConsulted: _sourcesConsulted,
    localTrialKey: _localTrialKey,
    localTrialNumber: _localTrialNumber,
    serverStatus: _serverStatus,
    serverMessage: _serverMessage,
    serverDecisionId: _serverDecisionId,
    ...requestBody
  } = payload as EvaluationRecord & { participantId: string };

  let response: DecisionApiResponse;
  try {
    response = await apiRequest<DecisionApiResponse>('/api/decisions', {
      method: 'POST',
      body: JSON.stringify(requestBody),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Network request failed';

    const failed: EvaluationRecord = {
      ...pending,
      serverStatus: 'failed',
      serverMessage:
        `Saved locally, but submission is unconfirmed: ${message}. ` +
        'You can retry safely.',
    };
    await writeRecord(failed);
    return resultFor(failed);
  }

  if (!response.success || typeof response.data?.decisionId !== 'string') {
    const apiError =
      typeof response.error === 'string'
        ? response.error
        : response.error?.message ??
          'The server did not confirm this decision.';

    const failed: EvaluationRecord = {
      ...pending,
      serverStatus: 'failed',
      serverMessage:
        `Saved locally, but submission is unconfirmed: ${apiError} ` +
        'You can retry safely.',
    };
    await writeRecord(failed);
    return resultFor(failed);
  }

  const submitted: EvaluationRecord = {
    ...pending,
    serverStatus: 'submitted',
    serverMessage: 'Saved locally and confirmed by the evaluation service.',
    serverDecisionId: response.data.decisionId,
    durationMs: response.data.durationMs,
  };

  try {
    await writeRecord(submitted);
  } catch (error) {
    console.warn(
      'The server accepted the decision, but local status could not be updated.',
      error,
    );
    return {
      ...resultFor(submitted),
      message:
        'Server confirmed the decision, but local status update failed. ' +
        'Do not create another record.',
    };
  }

  return resultFor(submitted);
}

export function getEvaluationRecords(): Promise<EvaluationRecord[]> {
  return runExclusive(readRecords);
}

export function getEvaluationRecordByLocalTrialKey(
  localTrialKey: string,
): Promise<EvaluationRecord | undefined> {
  return runExclusive(async () =>
    (await readRecords()).find(record => record.localTrialKey === localTrialKey),
  );
}

export function retryEvaluationSubmission(
  recordId: string,
): Promise<EvaluationSubmissionResult> {
  return runExclusive(async () => {
    const existing = (await readRecords()).find(
      item => item.recordId === recordId,
    );

    if (!existing) {
      throw new Error('The locally saved decision could not be found.');
    }

    if (!existing.participantId) {
      throw new Error(
        'This decision has no valid participant code and cannot be sent to the study server.',
      );
    }

    return submitRecord(existing);
  });
}

export function saveEvaluationDecision(
  decision: EvaluationPayload,
  suppliedParticipantId?: string,
  localDetails?: LocalDetails,
): Promise<EvaluationSubmissionResult> {
  return runExclusive(async () => {
    const configuredId =
      process.env.EXPO_PUBLIC_STUDY_PARTICIPANT_ID?.trim();

    const candidateId = suppliedParticipantId?.trim() || configuredId;

    const participantId =
      candidateId && PARTICIPANT_ID_PATTERN.test(candidateId)
        ? candidateId.toUpperCase()
        : undefined;

    // Only reuse a local record belonging to the exact same on-device trial.
    // A new study session/new trial must use a NEW localTrialKey.
    if (localDetails?.localTrialKey) {
      const existing = (await readRecords()).find(
        item =>
          item.localTrialKey === localDetails.localTrialKey &&
          item.participantId === participantId,
      );

      if (existing) {
        if (
          existing.serverStatus === 'submitted' ||
          !existing.participantId
        ) {
          return resultFor(existing, true);
        }

        const retried = await submitRecord(existing);
        return { ...retried, reusedExisting: true };
      }
    }

    const recordId = `${Date.now().toString(36)}-${Math.random()
      .toString(36)
      .slice(2)}`;
    const records = await readRecords();
    const isOfficialTrial = decision.trialIndex !== undefined;
    const matchingLocalRecords = records.filter(
      item =>
        item.participantId === participantId &&
        item.trialIndex === undefined,
    );

    // Count earlier local checks once, including records saved before
    // automatic numbering was added.
    const usedLocalNumbers = new Set(
      matchingLocalRecords
        .map(item => item.localTrialNumber)
        .filter((number): number is number => number !== undefined),
    );

    let nextLocalTrialNumber = matchingLocalRecords.length + 1;

    // Avoid reusing a number that was assigned by the previous logic.
    while (usedLocalNumbers.has(nextLocalTrialNumber)) {
      nextLocalTrialNumber += 1;
    }


    const record: EvaluationRecord = {
      ...decision,
      recordId,
      savedAt: new Date().toISOString(),
      durationMs: Math.max(
        0,
        Date.parse(decision.endedAt) - Date.parse(decision.startedAt),
      ),
      ...localDetails,

      ...(!isOfficialTrial
        ? {
            localTrialNumber: nextLocalTrialNumber,
          }
        : {}),

      ...(participantId ? { participantId } : {}),
      serverStatus: participantId ? 'pending' : 'not_submitted',
      serverMessage: participantId
        ? 'Saved locally; server submission is pending.'
        : 'Saved locally only. No valid study participant code was supplied.',
    };

    // Persist FIRST, before network traffic.
    await writeRecord(record);

    if (!participantId) return resultFor(record);

    return submitRecord(record);
  });
}
