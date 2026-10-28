import { Platform } from 'react-native';

import { API_TIMEOUT_MS } from '../constants/api';

const configuredBaseUrl =
  process.env.EXPO_PUBLIC_API_BASE_URL?.trim();

export function getApiBaseUrl(): string {
  const baseUrl =
    configuredBaseUrl ||
    (Platform.OS === 'web'
      ? 'http://localhost:3000'
      : undefined);

  if (!baseUrl) {
    throw new Error(
      'Set EXPO_PUBLIC_API_BASE_URL to the backend URL reachable from this device.',
    );
  }

  let parsedUrl: URL;

  try {
    parsedUrl = new URL(baseUrl);
  } catch {
    throw new Error(
      'EXPO_PUBLIC_API_BASE_URL must be a valid http:// or https:// URL.',
    );
  }

  if (
    parsedUrl.protocol !== 'http:' &&
    parsedUrl.protocol !== 'https:'
  ) {
    throw new Error(
      'EXPO_PUBLIC_API_BASE_URL must use http:// or https://.',
    );
  }

  return baseUrl.replace(/\/+$/, '');
}

function getErrorMessage(
  body: unknown,
  status: number,
): string {
  if (
    typeof body === 'object' &&
    body !== null &&
    'error' in body
  ) {
    const error = body.error;

    if (typeof error === 'string') {
      return error;
    }

    if (
      typeof error === 'object' &&
      error !== null &&
      'message' in error &&
      typeof error.message === 'string'
    ) {
      return error.message;
    }
  }

  return `Request failed with status ${status}.`;
}

export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const controller = new AbortController();

  const timeout = setTimeout(
    () => controller.abort(),
    API_TIMEOUT_MS,
  );

  const bodyIsFormData =
    typeof FormData !== 'undefined' &&
    options.body instanceof FormData;

  try {
    const response = await fetch(
      `${getApiBaseUrl()}${endpoint}`,
      {
        ...options,
        signal: controller.signal,
        headers: {
          ...(bodyIsFormData
            ? {}
            : { 'Content-Type': 'application/json' }),
          ...options.headers,
        },
      },
    );

    let responseBody: unknown;

    try {
      responseBody = await response.json();
    } catch {
      throw new Error(
        response.ok
          ? 'The server returned an invalid response.'
          : `Request failed with status ${response.status}.`,
      );
    }

    if (!response.ok) {
      throw new Error(
        getErrorMessage(
          responseBody,
          response.status,
        ),
      );
    }

    return responseBody as T;
  } catch (error) {
    if (
      error instanceof Error &&
      error.name === 'AbortError'
    ) {
      throw new Error(
        'The request timed out. Please try again.',
      );
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }
}
