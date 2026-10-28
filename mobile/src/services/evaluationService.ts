import AsyncStorage from '@react-native-async-storage/async-storage';

import { DecisionRequest } from '../types/api';
import { apiRequest } from './api';

const EVALUATION_STORAGE_KEY = '@facttrace/evaluation-records';
const PARTICIPANT_ID_PATTERN = /^[pP]\d{1,3}$/;

export type EvaluationPayload = Omit<DecisionRequest, 'participantId'>;

export type EvaluationRecord = EvaluationPayload & {
  recordId: string;
  savedAt: string;
  durationMs: number;
  sourcesConsulted?: { title: string; url: string }[];
  participantId?: string;
  serverStatus: 'pending' | 'submitted' | 'not_submitted' | 'failed';
  serverMessage: string;
  serverDecisionId?: string;
};

type DecisionApiResponse = {
  success: boolean;
  data?: { decisionId: string; durationMs: number };
  error?: string | { code: string; message: string };
};

let storageQueue: Promise<void> = Promise.resolve();

function runExclusive<T>(operation: () => Promise<T>): Promise<T> {
  const result = storageQueue.then(operation);
  storageQueue = result.then(
    () => undefined,
    () => undefined,
  );
  return result;
}

function isEvaluationRecord(value: unknown): value is EvaluationRecord {
  return (
    typeof value === 'object' &&
    value !== null &&
    'recordId' in value &&
    typeof value.recordId === 'string' &&
    'savedAt' in value &&
    typeof value.savedAt === 'string' &&
    'durationMs' in value &&
    typeof value.durationMs === 'number' &&
    'serverStatus' in value &&
    (value.serverStatus === 'pending' ||
      value.serverStatus === 'submitted' ||
      value.serverStatus === 'not_submitted' ||
      value.serverStatus === 'failed') &&
    'serverMessage' in value &&
    typeof value.serverMessage === 'string' &&
    'claimText' in value &&
    typeof value.claimText === 'string' &&
    'decision' in value &&
    (value.decision === 'trust' ||
      value.decision === 'dont_trust' ||
      value.decision === 'unsure') &&
    'sharingIntention' in value &&
    (value.sharingIntention === 'yes' ||
      value.sharingIntention === 'no' ||
      value.sharingIntention === 'not_sure') &&
    (!('sourcesConsulted' in value) ||
      (Array.isArray(value.sourcesConsulted) &&
        value.sourcesConsulted.every(
          source =>
            typeof source === 'object' &&
            source !== null &&
            'title' in source &&
            typeof source.title === 'string' &&
            'url' in source &&
            typeof source.url === 'string',
        )))
  );
}

async function readRecords(): Promise<EvaluationRecord[]> {
  const stored = await AsyncStorage.getItem(EVALUATION_STORAGE_KEY);
  if (!stored) {
    return [];
  }

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
    ? records.map(item =>
        item.recordId === record.recordId ? record : item,
      )
    : [record, ...records];
  await AsyncStorage.setItem(
    EVALUATION_STORAGE_KEY,
    JSON.stringify(next),
  );
}

export function getEvaluationRecords(): Promise<EvaluationRecord[]> {
  return runExclusive(readRecords);
}

export function saveEvaluationDecision(
  decision: EvaluationPayload,
  suppliedParticipantId?: string,
  localDetails?: Pick<EvaluationRecord, 'sourcesConsulted'>,
): Promise<{ saved: boolean; message: string; recordId: string }> {
  return runExclusive(async () => {
    const configuredId = process.env.EXPO_PUBLIC_STUDY_PARTICIPANT_ID?.trim();
    const candidateId = suppliedParticipantId?.trim() || configuredId;
    const participantId =
      candidateId && PARTICIPANT_ID_PATTERN.test(candidateId)
        ? candidateId.toUpperCase()
        : undefined;

    const recordId = `${Date.now().toString(36)}-${Math.random()
      .toString(36)
      .slice(2)}`;
    const record: EvaluationRecord = {
      ...decision,
      recordId,
      savedAt: new Date().toISOString(),
      durationMs: Math.max(
        0,
        Date.parse(decision.endedAt) - Date.parse(decision.startedAt),
      ),
      ...localDetails,
      ...(participantId ? { participantId } : {}),
      serverStatus: participantId ? 'pending' : 'not_submitted',
      serverMessage: participantId
        ? 'Saved locally; server submission is pending.'
        : 'Saved locally. No valid study participant code was provided, so this record was not submitted.',
    };

    await writeRecord(record);

    if (!participantId) {
      return {
        saved: true,
        message: record.serverMessage,
        recordId,
      };
    }

    let response: DecisionApiResponse;
    try {
      response = await apiRequest<DecisionApiResponse>('/api/decisions', {
        method: 'POST',
        body: JSON.stringify({ ...decision, participantId }),
      });
    } catch (error) {
      const failedRecord: EvaluationRecord = {
        ...record,
        serverStatus: 'failed',
        serverMessage:
          error instanceof Error
            ? `Saved locally; server submission could not be confirmed: ${error.message}. Do not resubmit automatically.`
            : 'Saved locally; server submission could not be confirmed. Do not resubmit automatically.',
      };
      try {
        await writeRecord(failedRecord);
      } catch (storageError) {
        console.warn(
          'Could not update the local evaluation after an unconfirmed server request.',
          storageError,
        );
      }
      return {
        saved: true,
        message: failedRecord.serverMessage,
        recordId,
      };
    }

    if (
      !response.success ||
      !response.data ||
      typeof response.data.decisionId !== 'string'
    ) {
      const apiError =
        typeof response.error === 'string'
          ? response.error
          : response.error?.message;
      const failedRecord: EvaluationRecord = {
        ...record,
        serverStatus: 'failed',
        serverMessage:
          apiError
            ? `Saved locally; server submission could not be confirmed: ${apiError}. Do not resubmit automatically.`
            : 'Saved locally; the evaluation service did not confirm the response. Do not resubmit automatically.',
      };
      try {
        await writeRecord(failedRecord);
      } catch (storageError) {
        console.warn(
          'Could not update the local evaluation after an unconfirmed server response.',
          storageError,
        );
      }
      return {
        saved: true,
        message: failedRecord.serverMessage,
        recordId,
      };
    }

    const submittedRecord: EvaluationRecord = {
      ...record,
      serverStatus: 'submitted',
      serverMessage: 'Saved locally and submitted to the evaluation service.',
      serverDecisionId: response.data.decisionId,
    };
    try {
      await writeRecord(submittedRecord);
    } catch (storageError) {
      console.warn(
        'The server accepted the evaluation, but its local status could not be updated.',
        storageError,
      );
      return {
        saved: true,
        message:
          'The evaluation was submitted to the server, but the local export status could not be updated. Do not resubmit this answer.',
        recordId,
      };
    }
    return {
      saved: true,
      message: submittedRecord.serverMessage,
      recordId,
    };
  });
}
