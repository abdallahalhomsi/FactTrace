import AsyncStorage from '@react-native-async-storage/async-storage';

import type { AuthenticatedUser } from './authService';
import type { VerificationResult } from '../types/verification';

const HISTORY_STORAGE_PREFIX = '@facttrace/verification-history/';

export type VerificationHistoryEntry = {
  id: string;
  timestamp: string;
  result: VerificationResult;
};

let storageQueue: Promise<void> = Promise.resolve();

function runExclusive<T>(
  operation: () => Promise<T>,
): Promise<T> {
  const result = storageQueue.then(operation);
  storageQueue = result.then(
    () => undefined,
    () => undefined,
  );
  return result;
}

function getStorageKey(user: AuthenticatedUser): string {
  const userId = user.id.trim();

  if (!userId) {
    throw new Error('An authenticated user ID is required.');
  }

  return `${HISTORY_STORAGE_PREFIX}${encodeURIComponent(userId)}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isVerificationResult(
  value: unknown,
): value is VerificationResult {
  if (
    !isRecord(value) ||
    typeof value.originalClaim !== 'string' ||
    (value.matchStatus !== 'strong_match' &&
      value.matchStatus !== 'weak_match' &&
      value.matchStatus !== 'no_match') ||
    (value.matchedClaim !== undefined &&
      typeof value.matchedClaim !== 'string') ||
    (value.matchScore !== undefined &&
      typeof value.matchScore !== 'number') ||
    (value.explanation !== undefined &&
      typeof value.explanation !== 'string') ||
    !Array.isArray(value.evidence)
  ) {
    return false;
  }

  return value.evidence.every(
    source =>
      isRecord(source) &&
      typeof source.id === 'string' &&
      (source.sourceId === undefined ||
        typeof source.sourceId === 'string') &&
      (source.stance === undefined ||
        source.stance === 'supports' ||
        source.stance === 'contradicts' ||
        source.stance === 'context') &&
      (source.sourceType === undefined ||
        source.sourceType === 'news' ||
        source.sourceType === 'fact_check' ||
        source.sourceType === 'official' ||
        source.sourceType === 'academic' ||
        source.sourceType === 'social') &&
      (source.publishedAt === undefined ||
        source.publishedAt === null ||
        typeof source.publishedAt === 'string') &&
      typeof source.title === 'string' &&
      typeof source.sourceName === 'string' &&
      typeof source.summary === 'string' &&
      typeof source.evidenceText === 'string' &&
      typeof source.isPrimary === 'boolean' &&
      (source.organization === undefined ||
        typeof source.organization === 'string') &&
      (source.author === undefined ||
        typeof source.author === 'string') &&
      (source.publicationDate === undefined ||
        typeof source.publicationDate === 'string') &&
      (source.originalUrl === undefined ||
        typeof source.originalUrl === 'string') &&
      (source.provenance === undefined ||
        typeof source.provenance === 'string'),
  );
}

function isHistoryEntry(
  value: unknown,
): value is VerificationHistoryEntry {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    value.id.trim().length > 0 &&
    typeof value.timestamp === 'string' &&
    Number.isFinite(Date.parse(value.timestamp)) &&
    isVerificationResult(value.result)
  );
}

function sortNewestFirst(
  entries: VerificationHistoryEntry[],
): VerificationHistoryEntry[] {
  return entries.sort(
    (left, right) =>
      Date.parse(right.timestamp) - Date.parse(left.timestamp),
  );
}

async function readEntries(
  key: string,
): Promise<VerificationHistoryEntry[]> {
  const storedValue = await AsyncStorage.getItem(key);

  if (storedValue === null) {
    return [];
  }

  let parsedValue: unknown;

  try {
    parsedValue = JSON.parse(storedValue);
  } catch (error) {
    console.warn(
      'Verification history data was malformed and will be cleared.',
      error,
    );
    await AsyncStorage.removeItem(key);
    return [];
  }

  if (!Array.isArray(parsedValue)) {
    console.warn(
      'Verification history data had an invalid shape and will be cleared.',
    );
    await AsyncStorage.removeItem(key);
    return [];
  }

  const validEntries = parsedValue.filter(isHistoryEntry);
  const sortedEntries = sortNewestFirst(validEntries);
  const isOutOfOrder = sortedEntries.some(
    (entry, index) => entry.id !== validEntries[index]?.id,
  );

  if (
    validEntries.length !== parsedValue.length ||
    isOutOfOrder
  ) {
    console.warn(
      'Invalid or unordered verification history entries were cleaned up.',
    );
    await AsyncStorage.setItem(
      key,
      JSON.stringify(sortedEntries),
    );
  }

  return sortedEntries;
}

export function createHistoryEntryId(): string {
  return `${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2)}`;
}

export function getVerificationHistory(
  user: AuthenticatedUser,
): Promise<VerificationHistoryEntry[]> {
  return runExclusive(() => readEntries(getStorageKey(user)));
}

export function saveVerificationHistory(
  user: AuthenticatedUser,
  id: string,
  result: VerificationResult,
): Promise<void> {
  if (!id.trim()) {
    return Promise.reject(
      new Error('A history entry ID is required.'),
    );
  }

  return runExclusive(async () => {
    const key = getStorageKey(user);
    const entries = await readEntries(key);

    if (entries.some(entry => entry.id === id)) {
      return;
    }

    const newEntry: VerificationHistoryEntry = {
      id,
      timestamp: new Date().toISOString(),
      result,
    };

    await AsyncStorage.setItem(
      key,
      JSON.stringify(
        sortNewestFirst([newEntry, ...entries]),
      ),
    );
  });
}

export function deleteVerificationHistoryEntry(
  user: AuthenticatedUser,
  id: string,
): Promise<void> {
  return runExclusive(async () => {
    const key = getStorageKey(user);
    const entries = await readEntries(key);
    const updatedEntries = entries.filter(
      entry => entry.id !== id,
    );

    if (updatedEntries.length !== entries.length) {
      await AsyncStorage.setItem(
        key,
        JSON.stringify(updatedEntries),
      );
    }
  });
}