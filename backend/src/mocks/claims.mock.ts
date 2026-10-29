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

//mock claims covering every answer (true, false, misleading) and every overall stance (supports, contradicts, mixed, unclear)
//claim_04 is the claim used in the figma screens, so the demo matches the designs
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
  {
    claimId: "claim_04",
    text: "The city will introduce free public transport next month.",
    correctAnswer: "misleading",
    origin: { outlet: "Example Social Post", author: null, firstSeenAt: "2026-10-12", url: "https://example.org/social/post-free-transport" },
    overallStance: "contradicts",
    summary: "A public announcement describes a limited pilot, not free public transport for all residents.",
    provenanceSignals: [
      { key: "original_source", label: "Original source found", detail: "Traced to an official transport announcement that the post exaggerates.", level: "positive" },
      { key: "claim_date", label: "First seen October 2026", detail: "The social post appeared two days after the official announcement.", level: "neutral" },
      { key: "independent_sources", label: "2 independent sources", detail: "An official update and a local news report describe the same pilot.", level: "positive" },
      DATASET_SIGNAL,
    ],
    evidence: [
      { id: "ev_04a", summary: "The announcement discusses a temporary pilot for a limited group. It does not support the broader claim that every resident will receive free transport.", stance: "contradicts", sourceId: "src_04a" },
      { id: "ev_04b", summary: "Local reporting confirms the pilot covers students and seniors on two bus lines for three months.", stance: "context", sourceId: "src_04b" },
    ],
    sources: [
      { id: "src_04a", title: "Municipal transport update", outlet: "Example City Transport Office", author: null, publishedAt: "2026-10-10", url: "https://example.org/city/transport-update", isPrimary: true, type: "official" },
      { id: "src_04b", title: "Free bus pilot limited to two lines", outlet: "Example City News", author: "D. Reporter", publishedAt: "2026-10-11", url: "https://example.org/news/bus-pilot", isPrimary: false, type: "news" },
    ],
  },
  {
    claimId: "claim_05",
    text: "A new study proves that using your phone before bed causes permanent memory loss.",
    correctAnswer: "false",
    origin: { outlet: "Example Viral Video", author: null, firstSeenAt: "2026-09-03", url: "https://example.org/social/phone-memory-video" },
    overallStance: "contradicts",
    summary: "The study behind this post looked at sleep quality, not memory loss, and found no permanent effects.",
    provenanceSignals: [
      { key: "original_source", label: "Original source misrepresented", detail: "The cited study does not measure memory at all.", level: "warning" },
      { key: "claim_date", label: "First seen September 2026", detail: "Spread mainly through short video reposts.", level: "neutral" },
      { key: "source_types", label: "Academic + fact check", detail: "The original study and a fact check both contradict the claim.", level: "positive" },
      DATASET_SIGNAL,
    ],
    evidence: [
      { id: "ev_05a", summary: "The study measured how screen use before bed affects sleep quality and found short term effects only.", stance: "contradicts", sourceId: "src_05a" },
      { id: "ev_05b", summary: "A fact check found no study showing permanent memory loss from phone use at night.", stance: "contradicts", sourceId: "src_05b" },
    ],
    sources: [
      { id: "src_05a", title: "Evening screen use and sleep quality in young adults", outlet: "Example Journal of Sleep Research", author: "E. Scientist", publishedAt: "2026-07-21", url: "https://example.org/journal/screen-sleep", isPrimary: true, type: "academic" },
      { id: "src_05b", title: "No, phones at night do not cause permanent memory loss", outlet: "Example Fact Check", author: "F. Checker", publishedAt: "2026-09-10", url: "https://example.org/factcheck/phone-memory", isPrimary: false, type: "fact_check" },
    ],
  },
  {
    claimId: "claim_06",
    text: "Working from home makes employees more productive.",
    correctAnswer: "misleading",
    origin: { outlet: "Example Business Blog", author: "G. Writer", firstSeenAt: "2025-02-14", url: "https://example.org/blog/remote-productivity" },
    overallStance: "mixed",
    summary: "Research shows mixed results. Some jobs see higher productivity at home and others see lower, so the claim is too general.",
    provenanceSignals: [
      { key: "original_source", label: "Original source found", detail: "Traced to a blog post that cites only one survey.", level: "warning" },
      { key: "independent_sources", label: "2 independent sources", detail: "The two sources reach different conclusions.", level: "neutral" },
      DATASET_SIGNAL,
    ],
    evidence: [
      { id: "ev_06a", summary: "A survey of office workers found self reported productivity went up when working remotely.", stance: "supports", sourceId: "src_06a" },
      { id: "ev_06b", summary: "A study of call centre staff measured lower output for remote teams in the first months.", stance: "contradicts", sourceId: "src_06b" },
    ],
    sources: [
      { id: "src_06a", title: "Remote work survey 2025", outlet: "Example Workplace Institute", author: null, publishedAt: "2025-01-30", url: "https://example.org/institute/remote-survey", isPrimary: true, type: "official" },
      { id: "src_06b", title: "Measuring output in remote call centre teams", outlet: "Example Journal of Labour Studies", author: "H. Researcher", publishedAt: "2024-11-05", url: "https://example.org/journal/remote-output", isPrimary: false, type: "academic" },
    ],
  },
  {
    claimId: "claim_07",
    text: "The campus library will stay open 24 hours a day during final exams.",
    correctAnswer: "true",
    origin: { outlet: "Example Student Newsletter", author: null, firstSeenAt: "2026-10-20", url: "https://example.org/newsletter/library-hours" },
    overallStance: "unclear",
    summary: "Only one source mentions the extended hours and the official schedule has not been published yet, so the evidence is limited.",
    provenanceSignals: [
      { key: "original_source", label: "Single source", detail: "Only a student newsletter reports this so far.", level: "warning" },
      { key: "claim_date", label: "First seen October 2026", detail: "Recent claim, official confirmation may still be coming.", level: "neutral" },
      DATASET_SIGNAL,
    ],
    evidence: [
      { id: "ev_07a", summary: "The student newsletter quotes library staff saying opening hours will be extended for the exam period.", stance: "supports", sourceId: "src_07a" },
    ],
    sources: [
      { id: "src_07a", title: "Library to extend hours for finals", outlet: "Example Student Newsletter", author: null, publishedAt: "2026-10-20", url: "https://example.org/newsletter/library-hours", isPrimary: true, type: "news" },
    ],
  },
];