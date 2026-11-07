import { VerificationResult } from '../types/verification';
import { VerificationEvaluationContext } from '../types/api';

export type StudyTrialContext = {
  participantId: string;
  conditionOrder:
    | 'app_first'
    | 'browser_first';
  condition: 'app' | 'browser';
  claimId: string;
  claimText: string;
  trialIndex: number;
  isPractice: boolean;
  sessionId?: string;
  trialId?: string;
  startedAt?: string;
};

export type RootStackParamList = {
  StudyFlow:
    | {
        participantId?: string;
        conditionOrder?:
          | 'app_first'
          | 'browser_first';
        completedTrialIndex?: number;
        walkthrough?: boolean;
      }
    | undefined;

  Home:
    | {
        studyContext?: StudyTrialContext;
        walkthroughReplay?: boolean;
        walkthroughContinue?: boolean;
      }
    | undefined;

  Camera:
    | {
        studyContext?: StudyTrialContext;
      }
    | undefined;

  ClaimReview: {
    claimText?: string;
    imageUri?: string;
    studyContext?: StudyTrialContext;
    walkthrough?: boolean;
  };

  VerificationResults: {
    result: VerificationResult;
    walkthrough?: boolean;
    historyEntryId?: string;
    evaluation?: VerificationEvaluationContext;
    studyContext?: StudyTrialContext;
  };

  EvidenceDetails: {
    result?: VerificationResult;
    sourceId?: string;
    evidenceTrackingKey?: string;
    walkthrough?: boolean;
    studyContext?: StudyTrialContext;
  };

  VerificationHistory:
    | {
        walkthrough?: boolean;
      }
    | undefined;

  BrowserComparison:
    | {
        studyContext?: StudyTrialContext;
        walkthrough?: boolean;
      }
    | undefined;

  Profile: undefined;
  Login: undefined;
  SignUp: undefined;
};
