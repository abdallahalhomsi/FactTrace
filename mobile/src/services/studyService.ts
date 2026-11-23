import { apiRequest } from './api';

export type ConditionOrder =
  | 'app_first'
  | 'browser_first';

export type GenderOption =
  | 'female'
  | 'male';

export type EducationLevel =
  | 'undergraduate'
  | 'graduate'
  | 'other';

export type SmartphoneUseRange =
  | 'lt_1'
  | '1_3'
  | '3_5'
  | '5_7'
  | 'gt_7';

export type SocialMediaUseRange =
  | 'lt_1'
  | '1_2'
  | '2_4'
  | '4_6'
  | 'gt_6';

export type ParticipantInformation = {
  age: number;

  gender?: GenderOption;

  educationLevel: EducationLevel;

  smartphoneUse: SmartphoneUseRange;

  socialMediaUse: SocialMediaUseRange;

  factCheckFrequency: number;

  sourceCheckFrequency: number;

  multiSourceFrequency: number;

  usedFactCheckTool: boolean;

  factCheckToolName?: string;

  usedFactTraceBefore: boolean;
};

export type StudyClaim = {
  claimId: string;
  text: string;
  position: number;
};

export type StudyClaims = {
  practice: StudyClaim[];
  setA: StudyClaim[];
  setB: StudyClaim[];
};

type StudyClaimsApiResponse = {
  success: boolean;

  data?: StudyClaims;

  error?:
    | string
    | {
        code: string;
        message: string;
      };
};

type SessionApiResponse = {
  success: boolean;

  data?: {
    participantId: string;
    saved: true;
  };

  error?:
    | string
    | {
        code: string;
        message: string;
      };
};

function getApiError(
  error:
    | StudyClaimsApiResponse['error']
    | SessionApiResponse['error'],
  fallback: string,
): string {
  if (typeof error === 'string') {
    return error;
  }

  if (
    error &&
    typeof error.message === 'string'
  ) {
    return error.message;
  }

  return fallback;
}

export async function getStudyClaims():
Promise<StudyClaims> {
  const response =
    await apiRequest<StudyClaimsApiResponse>(
      '/api/study/claims',
    );

  if (
    !response.success ||
    !response.data
  ) {
    throw new Error(
      getApiError(
        response.error,
        'Could not load study claims.',
      ),
    );
  }

  return response.data;
}

export async function createStudySession(
  participantId: string,
  conditionOrder: ConditionOrder,
  participantInformation:
    ParticipantInformation,
): Promise<void> {
  const response =
    await apiRequest<SessionApiResponse>(
      '/api/sessions',
      {
        method: 'POST',

        body: JSON.stringify({
          participantId,
          conditionOrder,

          ...participantInformation,

          notes:
            'Started from the FactTrace mobile study flow',
        }),
      },
    );

  if (
    !response.success ||
    !response.data?.saved
  ) {
    throw new Error(
      getApiError(
        response.error,
        'Could not create study session.',
      ),
    );
  }
}