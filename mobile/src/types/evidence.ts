export type EvidenceSource = {
  id: string;

  sourceId?: string;

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

  stance?: 'supports' | 'contradicts' | 'context';

  sourceType?: 'news' | 'fact_check' | 'official' | 'academic' | 'social';

  publishedAt?: string | null;
};