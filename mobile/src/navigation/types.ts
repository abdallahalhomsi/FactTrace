import { VerificationResult } from '../types/verification';

export type RootStackParamList = {
  Home: undefined;

  Camera: undefined;

  ClaimReview: {
    claimText?: string;
    imageUri?: string;
  };

  VerificationResults: {
    result: VerificationResult;
  };

  EvidenceDetails: {
    result?: VerificationResult;
    sourceId?: string;
  };

  VerificationHistory: undefined;

  Profile: undefined;

  Login: undefined;

  SignUp: undefined;
};