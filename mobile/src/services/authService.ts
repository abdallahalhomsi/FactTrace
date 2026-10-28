import AsyncStorage from '@react-native-async-storage/async-storage';

const authenticatedUserBrand: unique symbol = Symbol(
  'local-demo-user',
);

export type AuthenticatedUser = {
  readonly id: string;
  readonly email: string;
  readonly displayName: string;
  readonly [authenticatedUserBrand]: true;
};

type StoredDemoProfile = {
  id: string;
  email: string;
  displayName: string;
};

const PROFILES_KEY = '@facttrace/demo-profiles';
const SESSION_KEY = '@facttrace/demo-session';

let currentUser: AuthenticatedUser | null = null;
let initialization: Promise<void> | null = null;
let operationQueue: Promise<void> = Promise.resolve();
const listeners = new Set<() => void>();

function runExclusive<T>(operation: () => Promise<T>): Promise<T> {
  const result = operationQueue.then(operation);
  operationQueue = result.then(
    () => undefined,
    () => undefined,
  );
  return result;
}

function isStoredProfile(value: unknown): value is StoredDemoProfile {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    typeof value.id === 'string' &&
    'email' in value &&
    typeof value.email === 'string' &&
    'displayName' in value &&
    typeof value.displayName === 'string'
  );
}

async function readProfiles(): Promise<StoredDemoProfile[]> {
  const stored = await AsyncStorage.getItem(PROFILES_KEY);
  if (!stored) {
    return [];
  }

  try {
    const parsed: unknown = JSON.parse(stored);
    if (!Array.isArray(parsed)) {
      throw new Error('Stored accounts are not a list.');
    }
    return parsed.filter(isStoredProfile);
  } catch (error) {
    console.warn('Stored accounts were malformed and were cleared.', error);
    await AsyncStorage.removeItem(PROFILES_KEY);
    return [];
  }
}

function toAuthenticatedUser(
  profile: StoredDemoProfile,
): AuthenticatedUser {
  return {
    ...profile,
    [authenticatedUserBrand]: true,
  };
}

function publishUser(user: AuthenticatedUser | null): void {
  currentUser = user;
  listeners.forEach(listener => listener());
}

export function initializeAuth(): Promise<void> {
  if (!initialization) {
    initialization = runExclusive(async () => {
      const sessionId = await AsyncStorage.getItem(SESSION_KEY);
      if (!sessionId) {
        publishUser(null);
        return;
      }

      const profile = (await readProfiles()).find(
        candidate => candidate.id === sessionId,
      );
      if (!profile) {
        await AsyncStorage.removeItem(SESSION_KEY);
        publishUser(null);
        return;
      }

      publishUser(toAuthenticatedUser(profile));
    }).catch(error => {
      initialization = null;
      throw error;
    });
  }
  return initialization;
}

export function getCurrentAuthenticatedUser():
  | AuthenticatedUser
  | null {
  return currentUser;
}

export function subscribeToAuthChanges(
  listener: () => void,
): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export async function signIn(email: string): Promise<AuthenticatedUser> {
  return runExclusive(async () => {
    const normalizedEmail = email.trim().toLowerCase();
    const profile = (await readProfiles()).find(
      candidate => candidate.email === normalizedEmail,
    );
    if (!profile) {
      throw new Error(
        'We couldn’t find an account with that email. Create an account first.',
      );
    }

    await AsyncStorage.setItem(SESSION_KEY, profile.id);
    const user = toAuthenticatedUser(profile);
    publishUser(user);
    return user;
  });
}

export async function signUp(
  name: string,
  email: string,
): Promise<AuthenticatedUser> {
  return runExclusive(async () => {
    const normalizedEmail = email.trim().toLowerCase();
    const profiles = await readProfiles();
    if (profiles.some(profile => profile.email === normalizedEmail)) {
      throw new Error(
        'An account already uses that email. Log in instead.',
      );
    }

    const profile: StoredDemoProfile = {
      id: `${Date.now().toString(36)}-${Math.random()
        .toString(36)
        .slice(2)}`,
      email: normalizedEmail,
      displayName: name.trim(),
    };

    await AsyncStorage.setItem(
      PROFILES_KEY,
      JSON.stringify([...profiles, profile]),
    );
    await AsyncStorage.setItem(SESSION_KEY, profile.id);
    const user = toAuthenticatedUser(profile);
    publishUser(user);
    return user;
  });
}

export async function signOut(): Promise<void> {
  await runExclusive(async () => {
    await AsyncStorage.removeItem(SESSION_KEY);
    publishUser(null);
  });
}
