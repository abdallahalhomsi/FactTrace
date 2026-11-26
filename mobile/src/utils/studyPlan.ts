import type {
  ConditionOrder,
  SetOrder,
  StudyClaim,
  StudyClaims,
} from '../services/studyService';

export type PlannedTrial = {
  claim: StudyClaim;
  trialIndex: number;
  isPractice: boolean;
  condition: 'app' | 'browser';
  phaseLabel: string;
};

export function describeOrder(
  conditionOrder: ConditionOrder,
  setOrder: SetOrder,
): string {
  const first =
    conditionOrder === 'app_first'
      ? 'FactTrace'
      : 'Browser';
  const second =
    conditionOrder === 'app_first'
      ? 'Browser'
      : 'FactTrace';
  const firstSet =
    setOrder === 'a_first' ? 'A' : 'B';
  const secondSet =
    setOrder === 'a_first' ? 'B' : 'A';

  return `${first} (Set ${firstSet}) → ${second} (Set ${secondSet})`;
}

//small seeded random number generator (mulberry32), seeded from the participant id,
//so a participant's claim order is random but the same every time the plan is rebuilt after a trial
function seededRandom(text: string): () => number {
  let seed = 2166136261;
  for (let i = 0; i < text.length; i++) {
    seed = Math.imul(seed ^ text.charCodeAt(i), 16777619) >>> 0;
  }
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

//fisher-yates shuffle of a copy
function shuffled<T>(items: T[], random: () => number): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

//trial order: practice with the first tool, block 1, practice with the second tool, block 2
//each tool's practice claim runs right before its own block, so the second tool is not practised before block 1
//the claim set for each block follows the participant's set order, so set difficulty is not tied to block position
//claims inside each set are shuffled per participant, so no claim always sits in the same position
export function buildPlan(
  claims: StudyClaims,
  conditionOrder: ConditionOrder,
  setOrder: SetOrder,
  participantId: string,
): PlannedTrial[] {
  const firstCondition:
  'app' | 'browser' =
    conditionOrder === 'app_first'
      ? 'app'
      : 'browser';

  const secondCondition:
  'app' | 'browser' =
    firstCondition === 'app'
      ? 'browser'
      : 'app';

  const toolName = (
    condition: 'app' | 'browser',
  ) =>
    condition === 'app'
      ? 'FactTrace'
      : 'Browser';

  const random = seededRandom(
    participantId.toUpperCase(),
  );
  const setA = shuffled(claims.setA, random);
  const setB = shuffled(claims.setB, random);

  const [firstSet, secondSet] =
    setOrder === 'a_first'
      ? [setA, setB]
      : [setB, setA];

  const steps: Array<{
    claim: StudyClaim;
    isPractice: boolean;
    condition: 'app' | 'browser';
    phaseLabel: string;
  }> = [];

  const addPractice = (
    claim: StudyClaim | undefined,
    condition: 'app' | 'browser',
  ) => {
    if (claim) {
      steps.push({
        claim,
        isPractice: true,
        condition,
        phaseLabel: `Practice: ${toolName(condition)}`,
      });
    }
  };

  const addBlock = (
    set: StudyClaim[],
    condition: 'app' | 'browser',
    blockNumber: 1 | 2,
  ) => {
    for (const claim of set) {
      steps.push({
        claim,
        isPractice: false,
        condition,
        phaseLabel: `Block ${blockNumber}: ${toolName(condition)}`,
      });
    }
  };

  addPractice(claims.practice[0], firstCondition);
  addBlock(firstSet, firstCondition, 1);
  addPractice(claims.practice[1], secondCondition);
  addBlock(secondSet, secondCondition, 2);

  return steps.map(
    (step, index) => ({
      ...step,
      trialIndex: index + 1,
    }),
  );
}
