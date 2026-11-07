
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_PREFIX = '@facttrace/opened-evidence/';

const openedByTrial = new Map<string, Set<string>>();
const pendingWrites = new Map<string, Promise<void>>();

function storageKey(trialKey: string): string {
  return STORAGE_PREFIX + encodeURIComponent(trialKey);
}

async function readPersistedIds(trialKey: string): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(storageKey(trialKey));

    if (!raw) return [];

    const parsed: unknown = JSON.parse(raw);

    return Array.isArray(parsed)
      ? parsed.filter(
          (value): value is string => typeof value === 'string',
        )
      : [];
  } catch (error) {
    console.warn('Could not read opened evidence IDs.', error);
    return [];
  }
}

export function recordEvidenceSourceOpened(
  trialKey: string,
  sourceId: string,
): void {
  if (!trialKey || !sourceId) return;

  const opened = openedByTrial.get(trialKey) ?? new Set<string>();

  opened.add(sourceId);
  openedByTrial.set(trialKey, opened);

  const previous = pendingWrites.get(trialKey) ?? Promise.resolve();

  const write = previous
    .catch(() => undefined)
    .then(async () => {
      const persisted = await readPersistedIds(trialKey);
      const current = openedByTrial.get(trialKey) ?? new Set<string>();

      const merged = [...new Set([...persisted, ...current])];

      await AsyncStorage.setItem(
        storageKey(trialKey),
        JSON.stringify(merged),
      );
    });

  pendingWrites.set(trialKey, write);

  void write
    .catch(error =>
      console.warn('Could not save opened evidence IDs.', error),
    )
    .finally(() => {
      if (pendingWrites.get(trialKey) === write) {
        pendingWrites.delete(trialKey);
      }
    });
}

export async function getOpenedEvidenceSourceIds(
  trialKey: string,
): Promise<string[]> {
  if (!trialKey) return [];

  try {
    await pendingWrites.get(trialKey);
  } catch {
    // Continue with in-memory data if persistence fails.
  }

  const opened = openedByTrial.get(trialKey) ?? new Set<string>();
  const persisted = await readPersistedIds(trialKey);

  persisted.forEach(id => opened.add(id));
  openedByTrial.set(trialKey, opened);

  return [...opened];
}
