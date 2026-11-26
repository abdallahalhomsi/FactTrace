import { apiRequest } from './api';

//the esp32 device: the app starts and ends trials, the device sends the button press,
//and the app reads the press back from the backend (see docs/device-signal-spec.md)

export type DeviceDecision =
  | 'trust'
  | 'dont_trust'
  | 'unsure';

export type DeviceStatus = {
  trialIndex: number | null;
  decisionRecorded: boolean;
  decision: DeviceDecision | null;
  state: string;
  deviceOnline: boolean;
};

type ApiResponse<T> = {
  success: boolean;

  data?: T;

  error?:
    | string
    | {
        code: string;
        message: string;
      };
};

function unwrap<T>(
  response: ApiResponse<T>,
  fallback: string,
): T {
  if (
    response.success &&
    response.data !== undefined
  ) {
    return response.data;
  }

  const error = response.error;

  throw new Error(
    typeof error === 'string'
      ? error
      : error?.message ?? fallback,
  );
}

//called at the start of every study trial, in both conditions: the light turns white (ready)
export async function startDeviceTrial(input: {
  participantId: string;
  trialIndex: number;
  claimId: string;
  condition: 'app' | 'browser';
}): Promise<void> {
  unwrap(
    await apiRequest<ApiResponse<{ started: true }>>(
      '/api/device/trial',
      {
        method: 'POST',
        body: JSON.stringify(input),
      },
    ),
    'Could not start the trial on the device.',
  );
}

//read while the app waits for a button press; with `wait`, the backend holds the request (up to 8 s)
//until the press arrives, the trial changes or the device connects or disconnects, so the app sends
//a few requests per trial instead of one every 300 ms
export async function getDeviceStatus(wait?: {
  trialIndex: number;
  online: boolean;
}): Promise<DeviceStatus> {
  const query = wait
    ? `?waitForTrial=${wait.trialIndex}&online=${wait.online ? 1 : 0}`
    : '';

  return unwrap(
    await apiRequest<ApiResponse<DeviceStatus>>(
      `/api/device/status${query}`,
    ),
    'Could not read the device status.',
  );
}

//called when the session ends or is left, so the light turns off
export async function endDeviceSession(): Promise<void> {
  unwrap(
    await apiRequest<ApiResponse<{ ended: true }>>(
      '/api/device/end',
      { method: 'POST' },
    ),
    'Could not end the device session.',
  );
}
