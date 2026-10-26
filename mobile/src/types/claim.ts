export type ClaimInput = {
  claimText: string;
};

export type ScannedClaim = {
  imageUri: string;

  extractedText?: string;
};