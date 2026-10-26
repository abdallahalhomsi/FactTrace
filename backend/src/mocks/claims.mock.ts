//mock data only: placeholder claims so the frontend has realistic data to build screens with
//all outlets and links are invented (example.org), none of this is a real source
//this file gets replaced by the mysql seed data once the database schema is final

import { ClaimAnswer, Evidence, OverallStance, ProvenanceSignal, Source } from "../types/api"; //shapes the data must follow

//one stored claim, including the answer that is never sent to the app
export interface MockClaim {
  claimId: string; //id, also what a qr code would contain
  text: string; //the claim text that matching compares against
  correctAnswer: ClaimAnswer; //for scoring accuracy only, never sent to the app
  origin: { outlet: string | null; author: string | null; firstSeenAt: string | null; url: string | null }; //where it first appeared
  overallStance: OverallStance; //what the evidence points to overall
  summary: string; //short "what we found" text
  provenanceSignals: ProvenanceSignal[]; //cues shown to the user
  evidence: Evidence[]; //findings shown to the user
  sources: Source[]; //sources behind the evidence
}

//added to every claim so users always know results come from a prepared dataset (the ta asked for this transparency)
const DATASET_SIGNAL: ProvenanceSignal = {
  key: "dataset",
  label: "Curated dataset",
  detail: "This result comes from a curated set of claims prepared by the research team for this study.",
  level: "neutral",
};

//the three mock claims: one misleading, one false, one true
export const MOCK_CLAIMS: MockClaim[] = [
  {
    claimId: "claim_01",
    text: "Drinking eight glasses of water a day is required for good health.",
    correctAnswer: "misleading",
    origin: { outlet: "Example Wellness Blog", author: null, firstSeenAt: "2024-03-10", url: "https://example.org/wellness/water" },
    overallStance: "contradicts",
    summary: "Fluid needs vary by person and come from food and other drinks too. No source supports a fixed eight-glass rule for everyone.",
    provenanceSignals: [
      { key: "original_source", label: "Original source found", detail: "Traced to a wellness blog post with no cited study.", level: "warning" },
      { key: "claim_date", label: "First seen March 2024", detail: "Earliest version found in this dataset.", level: "neutral" },
      { key: "independent_sources", label: "2 independent sources", detail: "Two sources address this claim directly.", level: "positive" },
      DATASET_SIGNAL,
    ],
    evidence: [
      { id: "ev_01a", summary: "Health guidance says fluid needs vary by person and include water from food and other drinks.", stance: "contradicts", sourceId: "src_01a" },
      { id: "ev_01b", summary: "Staying hydrated is beneficial, but no fixed glass count is universally required.", stance: "context", sourceId: "src_01b" },
    ],
    sources: [
      { id: "src_01a", title: "How much water do you need?", outlet: "Example Health Agency", author: null, publishedAt: "2023-06-01", url: "https://example.org/health/water-needs", isPrimary: true, type: "official" },
      { id: "src_01b", title: "The eight glasses rule, checked", outlet: "Example Fact Check", author: "A. Writer", publishedAt: "2024-04-02", url: "https://example.org/factcheck/eight-glasses", isPrimary: false, type: "fact_check" },
    ],
  },
  {
    claimId: "claim_02",
    text: "Sabancı University campus will be closed to all students for the entire month of December.",
    correctAnswer: "false",
    origin: { outlet: null, author: null, firstSeenAt: "2026-10-01", url: null },
    overallStance: "contradicts",
    summary: "The official academic calendar lists regular classes and exams in December, so the campus is not closed for the month.",
    provenanceSignals: [
      { key: "original_source", label: "No original source", detail: "Claim circulated without a link or named author.", level: "warning" },
      { key: "independent_sources", label: "1 official source", detail: "An official calendar contradicts the claim.", level: "positive" },
      DATASET_SIGNAL,
    ],
    evidence: [
      { id: "ev_02a", summary: "The official academic calendar lists regular classes and exams in December.", stance: "contradicts", sourceId: "src_02a" },
    ],
    sources: [
      { id: "src_02a", title: "Academic calendar 2026-27", outlet: "Example University Registrar", author: null, publishedAt: "2026-08-15", url: "https://example.org/registrar/calendar", isPrimary: true, type: "official" },
    ],
  },
  {
    claimId: "claim_03",
    text: "Honey never spoils if it is stored in a sealed container.",
    correctAnswer: "true",
    origin: { outlet: "Example Science Weekly", author: "B. Author", firstSeenAt: "2022-11-20", url: "https://example.org/science/honey" },
    overallStance: "supports",
    summary: "Sealed honey resists spoilage because of its low moisture and acidity. It can crystallize, but that is not spoiling.",
    provenanceSignals: [
      { key: "original_source", label: "Original source found", detail: "Traced to a science magazine article citing research.", level: "positive" },
      { key: "independent_sources", label: "2 independent sources", detail: "Both sources agree on the core claim.", level: "positive" },
      { key: "source_types", label: "Academic + news", detail: "Mix of academic and news sources.", level: "positive" },
      DATASET_SIGNAL,
    ],
    evidence: [
      { id: "ev_03a", summary: "Honey's low moisture and acidity prevent most microbial growth when sealed.", stance: "supports", sourceId: "src_03a" },
      { id: "ev_03b", summary: "Honey may crystallize over time, which changes texture but is not spoilage.", stance: "context", sourceId: "src_03b" },
    ],
    sources: [
      { id: "src_03a", title: "Why honey lasts", outlet: "Example Journal of Food Science", author: "C. Researcher", publishedAt: "2021-05-12", url: "https://example.org/journal/honey", isPrimary: true, type: "academic" },
      { id: "src_03b", title: "Crystallized honey explained", outlet: "Example Science Weekly", author: "B. Author", publishedAt: "2022-11-20", url: "https://example.org/science/honey", isPrimary: false, type: "news" },
    ],
  },
];
