export type EvidenceSource = {
  id: string;

  title: string;

  sourceName: string;

  organization?: string;

  author?: string;

  publicationDate?: string;

  summary: string;

  evidenceText: string;

  originalUrl?: string;

  provenance?: string;

  isPrimary: boolean;
};