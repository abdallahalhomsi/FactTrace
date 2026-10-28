import { useSyncExternalStore } from 'react';

import {
  getCurrentAuthenticatedUser,
  subscribeToAuthChanges,
} from '../services/authService';

export function useAuth() {
  return useSyncExternalStore(
    subscribeToAuthChanges,
    getCurrentAuthenticatedUser,
    getCurrentAuthenticatedUser,
  );
}