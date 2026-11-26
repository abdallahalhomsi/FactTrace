import { apiRequest } from './api';

export type ConditionOrder =
  | 'app_first'
  | 'browser_first';

//tool order and claim-set order come from the participant number (GET /api/study/assignment)
export type SetOrder =
  | 'a_first'
  | 'b_first';

export type StudyAssignment = {
  participantId: string;
  group: 1 | 2 | 3 | 4;
  conditionOrder: ConditionOrder;
  setOrder: SetOrder;
};

export type GenderOption =
  | 'female'
  | 'male'
  | 'another'
  | 'prefer_not_to_say';

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

  faculty?: string;

  studyYear?: number;

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

type AssignmentApiResponse = {
  success: boolean;

  data?: StudyAssignment;

  error?: SessionApiResponse['error'];
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

//the counterbalanced group for a participant, so the researcher never picks the order by hand
export async function getStudyAssignment(
  participantId: string,
): Promise<StudyAssignment> {
  const response =
    await apiRequest<AssignmentApiResponse>(
      `/api/study/assignment?participantId=${encodeURIComponent(participantId)}`,
    );

  if (
    !response.success ||
    !response.data
  ) {
    throw new Error(
      getApiError(
        response.error,
        'Could not load the study group.',
      ),
    );
  }

  return response.data;
}

export async function createStudySession(
  participantId: string,
  conditionOrder: ConditionOrder,
  setOrder: SetOrder,
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
          setOrder,

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