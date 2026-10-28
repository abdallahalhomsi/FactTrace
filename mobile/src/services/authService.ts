import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import { pbkdf2Async } from '@noble/hashes/pbkdf2';
import { sha256 } from '@noble/hashes/sha256';
import { bytesToHex, hexToBytes } from '@noble/hashes/utils';

const authenticatedUserBrand: unique symbol = Symbol(
  'local-demo-user',
);

export type AuthenticatedUser = {
  readonly id: string;
  readonly email: string;
  readonly displayName: string;
  readonly [authenticatedUserBrand]: true;
};

export const MIN_PASSWORD_LENGTH = 8;

type StoredDemoProfile = {
  id: string;
  email: string;
  displayName: string;
  passwordSalt?: string;
  passwordHash?: string;
};

const PROFILES_KEY = '@facttrace/demo-profiles';
const SESSION_KEY = '@facttrace/demo-session';
const PASSWORD_HASH_ITERATIONS = 600_000;
const PASSWORD_SALT_BYTES = 16;
const PASSWORD_HASH_BYTES = 32;

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
  const hasPasswordCredentials =
    typeof value === 'object' &&
    value !== null &&
    ('passwordSalt' in value || 'passwordHash' in value);
  const hasValidPasswordCredentials =
    hasPasswordCredentials &&
    'passwordSalt' in value &&
    typeof value.passwordSalt === 'string' &&
    /^[\da-f]{32}$/i.test(value.passwordSalt) &&
    'passwordHash' in value &&
    typeof value.passwordHash === 'string' &&
    /^[\da-f]{64}$/i.test(value.passwordHash);

  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    typeof value.id === 'string' &&
    'email' in value &&
    typeof value.email === 'string' &&
    'displayName' in value &&
    typeof value.displayName === 'string' &&
    (!hasPasswordCredentials || hasValidPasswordCredentials)
  );
}

async function derivePasswordHash(
  password: string,
  salt: Uint8Array,
): Promise<string> {
  const hash = await pbkdf2Async(sha256, password, salt, {
    c: PASSWORD_HASH_ITERATIONS,
    dkLen: PASSWORD_HASH_BYTES,
  });
  return bytesToHex(hash);
}

async function createPasswordCredentials(
  password: string,
): Promise<{ passwordSalt: string; passwordHash: string }> {
  const salt = await Crypto.getRandomBytesAsync(PASSWORD_SALT_BYTES);
  return {
    passwordSalt: bytesToHex(salt),
    passwordHash: await derivePasswordHash(password, salt),
  };
}

function hashesMatch(expected: string, actual: string): boolean {
  if (expected.length !== actual.length) {
    return false;
  }

  let difference = 0;
  for (let index = 0; index < expected.length; index += 1) {
    difference |= expected.charCodeAt(index) ^ actual.charCodeAt(index);
  }
  return difference === 0;
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
    id: profile.id,
    email: profile.email,
    displayName: profile.displayName,
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

export async function signIn(
  email: string,
  password: string,
): Promise<AuthenticatedUser> {
  return runExclusive(async () => {
    if (password.length < MIN_PASSWORD_LENGTH) {
      throw new Error(
        `Password must be at least ${MIN_PASSWORD_LENGTH} characters long.`,
      );
    }

    const normalizedEmail = email.trim().toLowerCase();
    const profiles = await readProfiles();
    const profileIndex = profiles.findIndex(
      candidate => candidate.email === normalizedEmail,
    );
    if (profileIndex === -1) {
      throw new Error(
        'We couldn’t find an account with that email. Create an account first.',
      );
    }

    const profile = profiles[profileIndex];
    if (!profile) {
      throw new Error('This account is unavailable. Please try again.');
    }

    if (profile.passwordHash && profile.passwordSalt) {
      const passwordHash = await derivePasswordHash(
        password,
        hexToBytes(profile.passwordSalt),
      );
      if (!hashesMatch(profile.passwordHash, passwordHash)) {
        throw new Error('That password doesn’t match this account.');
      }
    } else {
      const credentials = await createPasswordCredentials(password);
      profiles[profileIndex] = { ...profile, ...credentials };
      await AsyncStorage.setItem(PROFILES_KEY, JSON.stringify(profiles));
    }

    await AsyncStorage.setItem(SESSION_KEY, profile.id);
    const updatedProfile = profiles[profileIndex];
    if (!updatedProfile) {
      throw new Error('This account is unavailable. Please try again.');
    }
    const user = toAuthenticatedUser(updatedProfile);
    publishUser(user);
    return user;
  });
}

export async function signUp(
  name: string,
  email: string,
  password: string,
): Promise<AuthenticatedUser> {
  return runExclusive(async () => {
    if (password.length < MIN_PASSWORD_LENGTH) {
      throw new Error(
        `Password must be at least ${MIN_PASSWORD_LENGTH} characters long.`,
      );
    }

    const normalizedEmail = email.trim().toLowerCase();
    const profiles = await readProfiles();
    if (profiles.some(profile => profile.email === normalizedEmail)) {
      throw new Error(
        'An account already uses that email. Log in instead.',
      );
    }

    const credentials = await createPasswordCredentials(password);
    const profile: StoredDemoProfile = {
      id: `${Date.now().toString(36)}-${Math.random()
        .toString(36)
        .slice(2)}`,
      email: normalizedEmail,
      displayName: name.trim(),
      ...credentials,
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
