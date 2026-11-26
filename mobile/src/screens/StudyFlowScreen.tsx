import React, {
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { StatusBar } from 'expo-status-bar';

import { Ionicons } from '@expo/vector-icons';

import {
  NativeStackScreenProps,
} from '@react-navigation/native-stack';

import {
  ThemeColors,
} from '../constants/app';

import {
  useAppTheme,
} from '../theme/AppTheme';

import {
  RootStackParamList,
  StudyTrialContext,
} from '../navigation/types';

import {
  ConditionOrder,
  EducationLevel,
  GenderOption,
  getStudyClaims,
  getCompletedQuestionnaires,
  getStudyAssignment,
  createStudySession,
  ParticipantInformation,
  SetOrder,
  SmartphoneUseRange,
  SocialMediaUseRange,
  StudyAssignment,
  StudyClaim,
  StudyClaims,
} from '../services/studyService';

import {
  saveWalkthroughState,
} from '../services/walkthroughService';

import BlockQuestionnaire from '../components/BlockQuestionnaire';

type Props =
  NativeStackScreenProps<
    RootStackParamList,
    'StudyFlow'
  >;

type PlannedTrial = {
  claim: StudyClaim;
  trialIndex: number;
  isPractice: boolean;
  condition: 'app' | 'browser';
  phaseLabel: string;
};

type YesNo =
  | 'yes'
  | 'no'
  | null;

const PARTICIPANT_PATTERN =
  /^[pP]\d{1,3}$/;

const GENDER_OPTIONS: Array<{
  value: GenderOption;
  label: string;
}> = [
  {
    value: 'female',
    label: 'Female',
  },
  {
    value: 'male',
    label: 'Male',
  },
];

const EDUCATION_OPTIONS: Array<{
  value: EducationLevel;
  label: string;
}> = [
  {
    value: 'undergraduate',
    label: 'Undergraduate',
  },
  {
    value: 'graduate',
    label: 'Graduate',
  },
  {
    value: 'other',
    label: 'Other',
  },
];

const SMARTPHONE_OPTIONS: Array<{
  value: SmartphoneUseRange;
  label: string;
}> = [
  {
    value: 'lt_1',
    label: 'Less than 1 hour',
  },
  {
    value: '1_3',
    label: '1–3 hours',
  },
  {
    value: '3_5',
    label: '3–5 hours',
  },
  {
    value: '5_7',
    label: '5–7 hours',
  },
  {
    value: 'gt_7',
    label: 'More than 7 hours',
  },
];

const SOCIAL_MEDIA_OPTIONS: Array<{
  value: SocialMediaUseRange;
  label: string;
}> = [
  {
    value: 'lt_1',
    label: 'Less than 1 hour',
  },
  {
    value: '1_2',
    label: '1–2 hours',
  },
  {
    value: '2_4',
    label: '2–4 hours',
  },
  {
    value: '4_6',
    label: '4–6 hours',
  },
  {
    value: 'gt_6',
    label: 'More than 6 hours',
  },
];

const FREQUENCY_LABELS:
Record<number, string> = {
  1: 'Never',
  2: 'Rarely',
  3: 'Occasionally',
  4: 'Sometimes',
  5: 'Often',
  6: 'Very often',
  7: 'Always',
};

function buildPlan(
  claims: StudyClaims,
  conditionOrder: ConditionOrder,
  setOrder: SetOrder,
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

  const practice =
    claims.practice.map(
      (claim, index) => ({
        claim,

        trialIndex:
          index + 1,

        isPractice: true,

        condition:
          index === 0
            ? firstCondition
            : secondCondition,

        phaseLabel:
          `Practice ${index + 1}`,
      }),
    );

  //block 1 uses the first set with the first tool, block 2 the other set with the other tool
  const firstSet =
    setOrder === 'b_first'
      ? { claims: claims.setB, label: 'Study Set B' }
      : { claims: claims.setA, label: 'Study Set A' };

  const secondSet =
    setOrder === 'b_first'
      ? { claims: claims.setA, label: 'Study Set A' }
      : { claims: claims.setB, label: 'Study Set B' };

  const block1 =
    firstSet.claims.map(
      (claim, index) => ({
        claim,

        trialIndex:
          practice.length +
          index +
          1,

        isPractice: false,

        condition:
          firstCondition,

        phaseLabel:
          `Block 1 · ${firstSet.label}`,
      }),
    );

  const block2 =
    secondSet.claims.map(
      (claim, index) => ({
        claim,

        trialIndex:
          practice.length +
          block1.length +
          index +
          1,

        isPractice: false,

        condition:
          secondCondition,

        phaseLabel:
          `Block 2 · ${secondSet.label}`,
      }),
    );

  return [
    ...practice,
    ...block1,
    ...block2,
  ];
}

//"FactTrace with Set A, then Browser with Set B", shown to the researcher
function describeOrder(
  conditionOrder: ConditionOrder,
  setOrder: SetOrder,
): string {
  const tools =
    conditionOrder === 'app_first'
      ? ['FactTrace', 'Browser']
      : ['Browser', 'FactTrace'];

  const sets =
    setOrder === 'a_first'
      ? ['Set A', 'Set B']
      : ['Set B', 'Set A'];

  return `${tools[0]} with ${sets[0]}, then ${tools[1]} with ${sets[1]}`;
}

export default function StudyFlowScreen({
  navigation,
  route,
}: Props) {
  const {
    colors: COLORS,
    isDark,
  } = useAppTheme();

  const styles =
    useMemo(
      () =>
        createStyles(
          COLORS,
          isDark,
        ),
      [
        COLORS,
        isDark,
      ],
    );

  const walkthrough =
    route.params?.walkthrough ===
    true;

  const resumedParticipantId =
    route.params?.participantId;

  const resumedConditionOrder =
    route.params?.conditionOrder;

  //sessions started before set order was passed along ran Set A first
  const resumedSetOrder:
  SetOrder =
    route.params?.setOrder ??
    'a_first';

  const completedTrialIndex =
    route.params
      ?.completedTrialIndex ??
    0;

  const [
    participantInput,
    setParticipantInput,
  ] = useState(
    resumedParticipantId ?? '',
  );

  const [
    conditionOrder,
    setConditionOrder,
  ] =
    useState<ConditionOrder>(
      resumedConditionOrder ??
        'app_first',
    );

  //the counterbalanced group from the backend, loaded when the researcher confirms the code
  const [
    assignment,
    setAssignment,
  ] =
    useState<
      StudyAssignment | null
    >(null);

  const [
    isAssigning,
    setIsAssigning,
  ] =
    useState(false);

  /*
   * Before a real session is created,
   * the flow has two stages:
   *
   * 1. researcher setup
   * 2. participant information form
   */
  const [
    setupConfirmed,
    setSetupConfirmed,
  ] =
    useState(false);

  const [
    ageInput,
    setAgeInput,
  ] =
    useState('');

  const [
    gender,
    setGender,
  ] =
    useState<
      GenderOption | undefined
    >(undefined);

  const [
    educationLevel,
    setEducationLevel,
  ] =
    useState<
      EducationLevel | null
    >(null);

  const [
    smartphoneUse,
    setSmartphoneUse,
  ] =
    useState<
      SmartphoneUseRange | null
    >(null);

  const [
    socialMediaUse,
    setSocialMediaUse,
  ] =
    useState<
      SocialMediaUseRange | null
    >(null);

  const [
    factCheckFrequency,
    setFactCheckFrequency,
  ] =
    useState<
      number | null
    >(null);

  const [
    sourceCheckFrequency,
    setSourceCheckFrequency,
  ] =
    useState<
      number | null
    >(null);

  const [
    multiSourceFrequency,
    setMultiSourceFrequency,
  ] =
    useState<
      number | null
    >(null);

  const [
    usedFactCheckTool,
    setUsedFactCheckTool,
  ] =
    useState<YesNo>(null);

  const [
    factCheckToolName,
    setFactCheckToolName,
  ] =
    useState('');

  const [
    usedFactTraceBefore,
    setUsedFactTraceBefore,
  ] =
    useState<YesNo>(null);

  const [
    claimFamiliarity,
    setClaimFamiliarity,
  ] =
    useState<boolean | null>(null);

  const [
    claims,
    setClaims,
  ] =
    useState<
      StudyClaims | null
    >(null);

  const [
    isLoading,
    setIsLoading,
  ] =
    useState(
      !walkthrough,
    );

  const [
    isStarting,
    setIsStarting,
  ] =
    useState(false);

  const [
    error,
    setError,
  ] =
    useState<
      string | null
    >(null);

  const participantId =
    resumedParticipantId
      ?.toUpperCase();

  const sessionStarted =
    Boolean(
      participantId &&
      resumedConditionOrder,
    );

  useEffect(() => {
    if (walkthrough) {
      return;
    }

    let active = true;

    void getStudyClaims()
      .then(data => {
        if (!active) {
          return;
        }

        setClaims(data);

        setError(null);
      })
      .catch(
        loadError => {
          if (!active) {
            return;
          }

          setError(
            loadError instanceof
            Error
              ? loadError.message
              : 'Could not load the study claims.',
          );
        },
      )
      .finally(() => {
        if (active) {
          setIsLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [
    walkthrough,
  ]);

  useEffect(() => {
    setClaimFamiliarity(null);
  }, [
    completedTrialIndex,
  ]);

  //blocks whose SUS and NASA-TLX the server has confirmed, null until read from the phone
  const [
    completedQuestionnaires,
    setCompletedQuestionnaires,
  ] =
    useState<
      number[] | null
    >(null);

  useEffect(() => {
    if (!participantId) {
      return;
    }

    let active = true;

    void getCompletedQuestionnaires(
      participantId,
    )
      .then(done => {
        if (active) {
          setCompletedQuestionnaires(done);
        }
      })
      .catch(() => {
        if (active) {
          setCompletedQuestionnaires([]);
        }
      });

    return () => {
      active = false;
    };
  }, [
    participantId,
  ]);

  const plan =
    useMemo(() => {
      if (!claims) {
        return [];
      }

      return buildPlan(
        claims,
        resumedConditionOrder ??
          conditionOrder,
        resumedSetOrder,
      );
    }, [
      claims,
      conditionOrder,
      resumedConditionOrder,
      resumedSetOrder,
    ]);

  const nextTrial =
    plan.find(
      trial =>
        trial.trialIndex ===
        completedTrialIndex +
          1,
    );

  /*
   * A block ends after its last study trial: block 1 after set A,
   * block 2 after set B. The questionnaire for that block is shown
   * before the next trial (or before "Study complete").
   */
  const block1EndIndex =
    claims
      ? claims.practice.length +
        (resumedSetOrder === 'b_first'
          ? claims.setB.length
          : claims.setA.length)
      : 0;

  const pendingQuestionnaire:
    | {
        blockIndex: 1 | 2;
        condition: 'app' | 'browser';
      }
    | null =
    (() => {
      if (
        !sessionStarted ||
        !claims ||
        plan.length === 0 ||
        completedQuestionnaires === null
      ) {
        return null;
      }

      const firstCondition =
        resumedConditionOrder ===
        'app_first'
          ? 'app'
          : 'browser';

      const secondCondition =
        firstCondition === 'app'
          ? 'browser'
          : 'app';

      if (
        completedTrialIndex >=
          block1EndIndex &&
        !completedQuestionnaires.includes(1)
      ) {
        return {
          blockIndex: 1,
          condition: firstCondition,
        };
      }

      if (
        completedTrialIndex >=
          plan.length &&
        !completedQuestionnaires.includes(2)
      ) {
        return {
          blockIndex: 2,
          condition: secondCondition,
        };
      }

      return null;
    })();

  const studyComplete =
    sessionStarted &&
    plan.length > 0 &&
    completedTrialIndex >=
      plan.length;

  const normalizedParticipantInput =
    participantInput
      .trim()
      .toUpperCase();

  const finishWalkthroughStudyIntro =
    async () => {
      try {
        await saveWalkthroughState({
          status:
            'in_progress',

          step:
            'ready',
        });

        navigation.reset({
          index: 0,

          routes: [
            {
              name:
                'Home',

              params: {
                walkthroughContinue:
                  true,
              },
            },
          ],
        });
      } catch (
        walkthroughError
      ) {
        Alert.alert(
          'Could not finish walkthrough step',

          walkthroughError instanceof
          Error
            ? walkthroughError.message
            : 'Please try again.',
        );
      }
    };

  /*
   * Researcher setup happens first.
   *
   * The participant does not need to
   * see or choose their condition order.
   */
  const continueToInformationForm =
    async () => {
      if (
        !PARTICIPANT_PATTERN.test(
          normalizedParticipantInput,
        ) ||
        Number(
          normalizedParticipantInput.slice(1),
        ) < 1
      ) {
        Alert.alert(
          'Invalid participant ID',

          'Use an anonymous code such as P01, P12, or P105.',
        );

        return;
      }

      setIsAssigning(true);

      setError(null);

      try {
        const group =
          await getStudyAssignment(
            normalizedParticipantInput,
          );

        setAssignment(group);

        setConditionOrder(
          group.conditionOrder,
        );

        setSetupConfirmed(true);
      } catch (
        assignError
      ) {
        setError(
          assignError instanceof
          Error
            ? assignError.message
            : 'Could not load the participant group.',
        );
      } finally {
        setIsAssigning(false);
      }
    };

  const validateInformationForm =
    ():
      | ParticipantInformation
      | null => {
      const age =
        Number(
          ageInput.trim(),
        );

      if (
        !Number.isInteger(age) ||
        age < 18 ||
        age > 100
      ) {
        Alert.alert(
          'Check age',

          'Enter an age from 18 to 100.',
        );

        return null;
      }

      if (
        !educationLevel
      ) {
        Alert.alert(
          'Missing answer',

          'Select the participant’s education level.',
        );

        return null;
      }

      if (
        !smartphoneUse
      ) {
        Alert.alert(
          'Missing answer',

          'Select daily smartphone use.',
        );

        return null;
      }

      if (
        !socialMediaUse
      ) {
        Alert.alert(
          'Missing answer',

          'Select daily social-media use.',
        );

        return null;
      }

      if (
        factCheckFrequency ===
        null
      ) {
        Alert.alert(
          'Missing answer',

          'Answer the search/fact-check frequency question.',
        );

        return null;
      }

      if (
        sourceCheckFrequency ===
        null
      ) {
        Alert.alert(
          'Missing answer',

          'Answer the source-checking frequency question.',
        );

        return null;
      }

      if (
        multiSourceFrequency ===
        null
      ) {
        Alert.alert(
          'Missing answer',

          'Answer the multiple-source comparison question.',
        );

        return null;
      }

      if (
        usedFactCheckTool ===
        null
      ) {
        Alert.alert(
          'Missing answer',

          'Answer whether a fact-checking tool was used before.',
        );

        return null;
      }

      if (
        usedFactTraceBefore ===
        null
      ) {
        Alert.alert(
          'Missing answer',

          'Answer whether FactTrace was used before.',
        );

        return null;
      }

      return {
        age,

        gender,

        educationLevel,

        smartphoneUse,

        socialMediaUse,

        factCheckFrequency,

        sourceCheckFrequency,

        multiSourceFrequency,

        usedFactCheckTool:
          usedFactCheckTool ===
          'yes',

        factCheckToolName:
          usedFactCheckTool ===
            'yes' &&
          factCheckToolName
            .trim()
            .length > 0
            ? factCheckToolName
                .trim()
            : undefined,

        usedFactTraceBefore:
          usedFactTraceBefore ===
          'yes',
      };
    };

  const startSession =
    async () => {
      if (
        !PARTICIPANT_PATTERN.test(
          normalizedParticipantInput,
        )
      ) {
        Alert.alert(
          'Invalid participant ID',

          'Use an anonymous code such as P01, P12, or P105.',
        );

        setSetupConfirmed(
          false,
        );

        return;
      }

      if (
        !assignment ||
        assignment.participantId !==
          normalizedParticipantInput
      ) {
        setSetupConfirmed(false);

        return;
      }

      const participantInformation =
        validateInformationForm();

      if (
        !participantInformation
      ) {
        return;
      }

      setIsStarting(true);

      setError(null);

      try {
        await createStudySession(
          normalizedParticipantInput,
          assignment.conditionOrder,
          assignment.setOrder,
          participantInformation,
        );

        navigation.replace(
          'StudyFlow',
          {
            participantId:
              normalizedParticipantInput,

            conditionOrder:
              assignment.conditionOrder,

            setOrder:
              assignment.setOrder,

            completedTrialIndex:
              0,
          },
        );
      } catch (
        startError
      ) {
        setError(
          startError instanceof
          Error
            ? startError.message
            : 'Could not start the study session.',
        );
      } finally {
        setIsStarting(false);
      }
    };

  const launchNextTrial =
    () => {
      if (
        !participantId ||
        !resumedConditionOrder ||
        !nextTrial
      ) {
        return;
      }

      if (
        !nextTrial.isPractice &&
        claimFamiliarity === null
      ) {
        Alert.alert(
          'Claim familiarity',

          'Please answer whether you had seen or heard this claim before.',
        );

        return;
      }

      const studyContext:
      StudyTrialContext = {
        participantId,

        conditionOrder:
          resumedConditionOrder,

        setOrder:
          resumedSetOrder,

        condition:
          nextTrial.condition,

        claimId:
          nextTrial
            .claim
            .claimId,

        claimText:
          nextTrial
            .claim
            .text,

        trialIndex:
          nextTrial
            .trialIndex,

        isPractice:
          nextTrial
            .isPractice,

        ...(
          !nextTrial.isPractice &&
          claimFamiliarity !== null
            ? {
                claimFamiliarity,
              }
            : {}
        ),

        startedAt:
          new Date()
            .toISOString(),
      };

      if (
        nextTrial.condition ===
        'browser'
      ) {
        navigation.navigate(
          'BrowserComparison',
          {
            studyContext,
          },
        );

        return;
      }

      navigation.navigate(
        'Camera',
        {
          studyContext,
        },
      );
    };

  const renderChoiceButtons =
    <T extends string>(
      options: Array<{
        value: T;
        label: string;
      }>,

      selected:
        | T
        | null
        | undefined,

      onSelect:
        (
          value: T,
        ) => void,
    ) => (
      <View
        style={
          styles.choiceWrap
        }
      >
        {options.map(
          option => {
            const isSelected =
              selected ===
              option.value;

            return (
              <TouchableOpacity
                key={
                  option.value
                }

                accessibilityRole="button"

                accessibilityState={{
                  selected:
                    isSelected,
                }}

                style={[
                  styles.choiceButton,

                  isSelected &&
                    styles.choiceButtonSelected,
                ]}

                onPress={() =>
                  onSelect(
                    option.value,
                  )
                }
              >
                <Text
                  style={[
                    styles.choiceButtonText,

                    isSelected &&
                      styles.choiceButtonTextSelected,
                  ]}
                >
                  {
                    option.label
                  }
                </Text>
              </TouchableOpacity>
            );
          },
        )}
      </View>
    );

  const renderFrequencyScale =
    (
      selected:
        number | null,

      onSelect:
        (
          value: number,
        ) => void,
    ) => (
      <>
        <View
          style={
            styles.scaleRow
          }
        >
          {[
            1,
            2,
            3,
            4,
            5,
            6,
            7,
          ].map(
            value => {
              const isSelected =
                selected ===
                value;

              return (
                <TouchableOpacity
                  key={value}

                  accessibilityRole="button"

                  accessibilityLabel={
                    `${value}, ${FREQUENCY_LABELS[value]}`
                  }

                  accessibilityState={{
                    selected:
                      isSelected,
                  }}

                  style={[
                    styles.scaleButton,

                    isSelected &&
                      styles.scaleButtonSelected,
                  ]}

                  onPress={() =>
                    onSelect(
                      value,
                    )
                  }
                >
                  <Text
                    style={[
                      styles.scaleButtonText,

                      isSelected &&
                        styles.scaleButtonTextSelected,
                    ]}
                  >
                    {value}
                  </Text>
                </TouchableOpacity>
              );
            },
          )}
        </View>

        <View
          style={
            styles.scaleLabelsRow
          }
        >
          <Text
            style={
              styles.scaleAnchor
            }
          >
            1 = Never
          </Text>

          <Text
            style={
              styles.scaleAnchor
            }
          >
            7 = Always
          </Text>
        </View>

        {selected !==
        null ? (
          <Text
            style={
              styles.selectedScaleText
            }
          >
            Selected:
            {' '}
            {selected}
            {' — '}
            {
              FREQUENCY_LABELS[
                selected
              ]
            }
          </Text>
        ) : null}
      </>
    );

  if (walkthrough) {
    return (
      <SafeAreaView
        style={
          styles.safeArea
        }
      >
        <StatusBar
          style={
            isDark
              ? 'light'
              : 'dark'
          }
        />

        <ScrollView
          contentContainerStyle={
            styles.content
          }
        >
          <View
            style={
              styles.walkthroughCard
            }
          >
            <View
              style={
                styles.walkthroughIcon
              }
            >
              <Ionicons
                name="flask-outline"

                size={34}

                color={
                  COLORS.blue
                }
              />
            </View>

            <Text
              style={
                styles.walkthroughEyebrow
              }
            >
              GUIDED WALKTHROUGH
            </Text>

            <Text
              style={
                styles.walkthroughTitle
              }
            >
              FactTrace vs Browser Study
            </Text>

            <Text
              style={
                styles.walkthroughText
              }
            >
              This is the research-study flow used to compare FactTrace with
              normal browser search. A participant receives an anonymous ID,
              completes a short participant information form and practice trials,
              then checks assigned claims in both conditions. The study keeps
              track of trial order, decisions, source use, timing, and sharing
              intention automatically.
            </Text>

            <View
              style={
                styles.walkthroughFlow
              }
            >
              <Text
                style={
                  styles.walkthroughFlowText
                }
              >
                Participant setup → Information form → Practice → FactTrace + Browser → Study complete
              </Text>
            </View>

            <Text
              style={
                styles.walkthroughNote
              }
            >
              This walkthrough only introduces the study. No participant session
              or trial is started here.
            </Text>

            <TouchableOpacity
              accessibilityRole="button"

              style={
                styles.primaryButton
              }

              onPress={() =>
                void finishWalkthroughStudyIntro()
              }
            >
              <Text
                style={
                  styles.primaryButtonText
                }
              >
                Done
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (isLoading) {
    return (
      <SafeAreaView
        style={
          styles.safeArea
        }
      >
        <StatusBar
          style={
            isDark
              ? 'light'
              : 'dark'
          }
        />

        <View
          style={
            styles.centered
          }
        >
          <ActivityIndicator
            size="large"

            color={
              COLORS.blue
            }
          />

          <Text
            style={
              styles.loadingText
            }
          >
            Loading study…
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={
        styles.safeArea
      }
    >
      <StatusBar
        style={
          isDark
            ? 'light'
            : 'dark'
        }
      />

      <ScrollView
        contentContainerStyle={
          styles.content
        }

        keyboardShouldPersistTaps="handled"
      >
        <TouchableOpacity
          style={
            styles.backButton
          }

          onPress={() =>
            navigation.navigate(
              'Home',
            )
          }

          accessibilityRole="button"

          accessibilityLabel="Back to Home"
        >
          <Ionicons
            name="arrow-back"

            size={22}

            color={
              COLORS.textPrimary
            }
          />

          <Text
            style={
              styles.backText
            }
          >
            Home
          </Text>
        </TouchableOpacity>

        <Text
          style={
            styles.title
          }
        >
          FactTrace Study
        </Text>

        <Text
          style={
            styles.subtitle
          }
        >
          Guided participant flow for the FactTrace vs browser comparison.
        </Text>

        {error ? (
          <View
            style={
              styles.errorBox
            }
          >
            <Text
              style={
                styles.errorText
              }
            >
              {error}
            </Text>
          </View>
        ) : null}

        {!sessionStarted ? (
          !setupConfirmed ? (
            <View
              style={
                styles.card
              }
            >
              <Text
                style={
                  styles.eyebrow
                }
              >
                Researcher setup
              </Text>

              <Text
                style={
                  styles.sectionTitle
                }
              >
                Prepare participant session
              </Text>

              <Text
                style={
                  styles.label
                }
              >
                Participant ID
              </Text>

              <TextInput
                value={
                  participantInput
                }

                onChangeText={
                  setParticipantInput
                }

                autoCapitalize="characters"

                autoCorrect={
                  false
                }

                placeholder="P01"

                placeholderTextColor={
                  COLORS.textMuted
                }

                style={
                  styles.input
                }

                maxLength={4}
              />

              <Text
                style={
                  styles.note
                }
              >
                Enter the anonymous participant code. The counterbalanced group
                (which tool and which claim set come first) is assigned
                automatically from the code, so it always matches the saved
                session. The participant information form appears next.
              </Text>

              <TouchableOpacity
                style={
                  styles.primaryButton
                }

                disabled={
                  isAssigning
                }

                onPress={() =>
                  void continueToInformationForm()
                }
              >
                <Text
                  style={
                    styles.primaryButtonText
                  }
                >
                  {isAssigning
                    ? 'Loading group…'
                    : 'Continue to Information Form'}
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View
              style={
                styles.card
              }
            >
              <Text
                style={
                  styles.eyebrow
                }
              >
                Before the study
              </Text>

              {assignment ? (
                <Text
                  style={
                    styles.formIntro
                  }
                >
                  {assignment.participantId}
                  {' · Group '}
                  {assignment.group}
                  {': '}
                  {describeOrder(
                    assignment.conditionOrder,
                    assignment.setOrder,
                  )}
                </Text>
              ) : null}

              <Text
                style={
                  styles.sectionTitle
                }
              >
                Participant Information Form
              </Text>

              <Text
                style={
                  styles.formIntro
                }
              >
                Please answer the following questions. Do not enter your name,
                student ID, email address, or other identifying information.
              </Text>

              <View
                style={
                  styles.participantCodeBox
                }
              >
                <Text
                  style={
                    styles.participantCodeLabel
                  }
                >
                  Participant code
                </Text>

                <Text
                  style={
                    styles.participantCodeValue
                  }
                >
                  {
                    normalizedParticipantInput
                  }
                </Text>
              </View>

              <Text
                style={
                  styles.label
                }
              >
                Age *
              </Text>

              <TextInput
                value={
                  ageInput
                }

                onChangeText={
                  text =>
                    setAgeInput(
                      text.replace(
                        /[^0-9]/g,
                        '',
                      ),
                    )
                }

                keyboardType="number-pad"

                placeholder="e.g. 21"

                placeholderTextColor={
                  COLORS.textMuted
                }

                style={
                  styles.input
                }

                maxLength={3}
              />

              <Text
                style={
                  styles.label
                }
              >
                Gender (optional)
              </Text>

              {renderChoiceButtons(
                GENDER_OPTIONS,

                gender,

                value =>
                  setGender(
                    current =>
                      current ===
                      value
                        ? undefined
                        : value,
                  ),
              )}

              <Text
                style={
                  styles.label
                }
              >
                Current education level *
              </Text>

              {renderChoiceButtons(
                EDUCATION_OPTIONS,

                educationLevel,

                setEducationLevel,
              )}

              <Text
                style={
                  styles.label
                }
              >
                Approximately how many hours per day do you use a smartphone? *
              </Text>

              {renderChoiceButtons(
                SMARTPHONE_OPTIONS,

                smartphoneUse,

                setSmartphoneUse,
              )}

              <Text
                style={
                  styles.label
                }
              >
                Approximately how many hours per day do you use social media? *
              </Text>

              {renderChoiceButtons(
                SOCIAL_MEDIA_OPTIONS,

                socialMediaUse,

                setSocialMediaUse,
              )}

              <Text
                style={
                  styles.questionText
                }
              >
                How often do you use a search engine to check whether an online claim is accurate? *
              </Text>

              {renderFrequencyScale(
                factCheckFrequency,

                setFactCheckFrequency,
              )}

              <Text
                style={
                  styles.questionText
                }
              >
                How often do you check the source of an online claim before deciding whether to trust it? *
              </Text>

              {renderFrequencyScale(
                sourceCheckFrequency,

                setSourceCheckFrequency,
              )}

              <Text
                style={
                  styles.questionText
                }
              >
                How often do you compare information from multiple sources when checking an online claim? *
              </Text>

              {renderFrequencyScale(
                multiSourceFrequency,

                setMultiSourceFrequency,
              )}

              <Text
                style={
                  styles.questionText
                }
              >
                Have you previously used a dedicated fact-checking website or application? *
              </Text>

              {renderChoiceButtons(
                [
                  {
                    value:
                      'yes' as const,

                    label:
                      'Yes',
                  },
                  {
                    value:
                      'no' as const,

                    label:
                      'No',
                  },
                ],

                usedFactCheckTool,

                setUsedFactCheckTool,
              )}

              {usedFactCheckTool ===
              'yes' ? (
                <>
                  <Text
                    style={
                      styles.label
                    }
                  >
                    If you remember, which fact-checking tool did you use? (optional)
                  </Text>

                  <TextInput
                    value={
                      factCheckToolName
                    }

                    onChangeText={
                      setFactCheckToolName
                    }

                    autoCapitalize="sentences"

                    autoCorrect

                    placeholder="Optional"

                    placeholderTextColor={
                      COLORS.textMuted
                    }

                    style={
                      styles.input
                    }

                    maxLength={
                      200
                    }
                  />
                </>
              ) : null}

              <Text
                style={
                  styles.questionText
                }
              >
                Before today, had you ever used FactTrace? *
              </Text>

              {renderChoiceButtons(
                [
                  {
                    value:
                      'yes' as const,

                    label:
                      'Yes',
                  },
                  {
                    value:
                      'no' as const,

                    label:
                      'No',
                  },
                ],

                usedFactTraceBefore,

                setUsedFactTraceBefore,
              )}

              <Text
                style={
                  styles.note
                }
              >
                * Required. Gender and the name of a previously used fact-checking
                tool are optional.
              </Text>

              <View
                style={
                  styles.formActionRow
                }
              >
                <TouchableOpacity
                  style={
                    styles.secondaryButton
                  }

                  disabled={
                    isStarting
                  }

                  onPress={() =>
                    setSetupConfirmed(
                      false,
                    )
                  }
                >
                  <Text
                    style={
                      styles.secondaryButtonText
                    }
                  >
                    Back
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.primaryButton,

                    styles.formPrimaryButton,

                    isStarting &&
                      styles.disabledButton,
                  ]}

                  disabled={
                    isStarting
                  }

                  onPress={() =>
                    void startSession()
                  }
                >
                  <Text
                    style={
                      styles.primaryButtonText
                    }
                  >
                    {
                      isStarting
                        ? 'Saving…'
                        : 'Save & Start Study'
                    }
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )
        ) : sessionStarted &&
          completedQuestionnaires === null ? (
          <ActivityIndicator
            size="large"
            color={
              COLORS.blue
            }
          />
        ) : pendingQuestionnaire &&
          participantId ? (
          <BlockQuestionnaire
            key={
              pendingQuestionnaire.blockIndex
            }
            participantId={
              participantId
            }
            condition={
              pendingQuestionnaire.condition
            }
            blockIndex={
              pendingQuestionnaire.blockIndex
            }
            onSubmitted={() =>
              setCompletedQuestionnaires(
                previous => [
                  ...(previous ?? []),
                  pendingQuestionnaire.blockIndex,
                ],
              )
            }
          />
        ) : studyComplete ? (
          <View
            style={
              styles.card
            }
          >
            <View
              style={
                styles.completeIcon
              }
            >
              <Ionicons
                name="checkmark-circle"

                size={56}

                color="#2E9D69"
              />
            </View>

            <Text
              style={
                styles.completeTitle
              }
            >
              Study complete
            </Text>

            <Text
              style={
                styles.completeText
              }
            >
              {participantId}
              {' '}
              completed all
              {' '}
              {plan.length}
              {' '}
              trials.
            </Text>

            <Text
              style={
                styles.note
              }
            >
              The participant can now be thanked and dismissed. Verify the saved
              rows in MySQL before starting the next participant.
            </Text>

            <TouchableOpacity
              style={
                styles.primaryButton
              }

              onPress={() =>
                navigation.replace(
                  'StudyFlow',
                  undefined,
                )
              }
            >
              <Text
                style={
                  styles.primaryButtonText
                }
              >
                Start Another Participant
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <View
              style={
                styles.progressCard
              }
            >
              <View>
                <Text
                  style={
                    styles.progressLabel
                  }
                >
                  Participant
                </Text>

                <Text
                  style={
                    styles.progressValue
                  }
                >
                  {
                    participantId
                  }
                </Text>
              </View>

              <View>
                <Text
                  style={
                    styles.progressLabel
                  }
                >
                  Progress
                </Text>

                <Text
                  style={
                    styles.progressValue
                  }
                >
                  {
                    completedTrialIndex
                  }
                  /
                  {
                    plan.length
                  }
                </Text>
              </View>

              <View>
                <Text
                  style={
                    styles.progressLabel
                  }
                >
                  Order
                </Text>

                <Text
                  style={
                    styles.progressValue
                  }
                >
                  {
                    resumedConditionOrder
                      ? describeOrder(
                          resumedConditionOrder,
                          resumedSetOrder,
                        )
                          .replace(' with ', ' ')
                          .replace(', then ', ' → ')
                          .replace(' with ', ' ')
                          .replace(/Set /g, '')
                      : ''
                  }
                </Text>
              </View>
            </View>

            {nextTrial ? (
              <View
                style={
                  styles.card
                }
              >
                <Text
                  style={
                    styles.eyebrow
                  }
                >
                  {
                    nextTrial.phaseLabel
                  }
                </Text>

                <Text
                  style={
                    styles.sectionTitle
                  }
                >
                  Trial
                  {' '}
                  {
                    nextTrial.trialIndex
                  }
                  {' '}
                  of
                  {' '}
                  {
                    plan.length
                  }
                </Text>

                <View
                  style={
                    styles.conditionBadge
                  }
                >
                  <Ionicons
                    name={
                      nextTrial.condition ===
                      'app'
                        ? 'camera-outline'
                        : 'search-outline'
                    }

                    size={18}

                    color={
                      COLORS.blue
                    }
                  />

                  <Text
                    style={
                      styles.conditionText
                    }
                  >
                    {
                      nextTrial.condition ===
                      'app'
                        ? 'FactTrace condition'
                        : 'Browser condition'
                    }
                  </Text>
                </View>

                <Text
                  style={
                    styles.claimLabel
                  }
                >
                  Assigned claim
                </Text>

                <Text
                  style={
                    styles.claimText
                  }
                >
                  {
                    nextTrial
                      .claim
                      .text
                  }
                </Text>

                {!nextTrial.isPractice ? (
                  <View
                    style={
                      styles.familiarityCard
                    }
                  >
                    <Text
                      style={
                        styles.familiarityLabel
                      }
                    >
                      BEFORE THIS STUDY
                    </Text>

                    <Text
                      style={
                        styles.familiarityQuestion
                      }
                    >
                      Had you seen or heard this claim before?
                    </Text>

                    <View
                      style={
                        styles.familiarityOptions
                      }
                    >
                      <TouchableOpacity
                        accessibilityRole="button"
                        accessibilityState={{
                          selected:
                            claimFamiliarity === true,
                        }}
                        style={[
                          styles.familiarityButton,
                          claimFamiliarity === true &&
                            styles.familiarityButtonSelected,
                        ]}
                        onPress={() =>
                          setClaimFamiliarity(true)
                        }
                      >
                        <Text
                          style={[
                            styles.familiarityButtonText,
                            claimFamiliarity === true &&
                              styles.familiarityButtonTextSelected,
                          ]}
                        >
                          Yes
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        accessibilityRole="button"
                        accessibilityState={{
                          selected:
                            claimFamiliarity === false,
                        }}
                        style={[
                          styles.familiarityButton,
                          claimFamiliarity === false &&
                            styles.familiarityButtonSelected,
                        ]}
                        onPress={() =>
                          setClaimFamiliarity(false)
                        }
                      >
                        <Text
                          style={[
                            styles.familiarityButtonText,
                            claimFamiliarity === false &&
                              styles.familiarityButtonTextSelected,
                          ]}
                        >
                          No
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : null}

                {
                  nextTrial.condition ===
                  'app'
                    ? (
                      <Text
                        style={
                          styles.note
                        }
                      >
                        Show this claim to the participant on the prepared printed
                        or on-screen study material. They should capture it using
                        the phone camera.
                      </Text>
                    )
                    : (
                      <Text
                        style={
                          styles.note
                        }
                      >
                        The browser screen will show this assigned claim. The
                        participant should research it using ordinary browser search
                        and record the sources they consulted.
                      </Text>
                    )
                }

                <TouchableOpacity
                  style={
                    styles.primaryButton
                  }

                  onPress={
                    launchNextTrial
                  }
                >
                  <Text
                    style={
                      styles.primaryButtonText
                    }
                  >
                    Start Trial
                    {' '}
                    {
                      nextTrial.trialIndex
                    }
                  </Text>
                </TouchableOpacity>
              </View>
            ) : null}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (
  COLORS: ThemeColors,
  isDark: boolean,
) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor:
        COLORS.background,
    },

    content: {
      padding: 20,
      paddingBottom: 40,
    },

    centered: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },

    loadingText: {
      marginTop: 12,
      color: COLORS.textMuted,
    },

    backButton: {
      alignSelf: 'flex-start',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingVertical: 8,
      marginBottom: 12,
    },

    backText: {
      color: COLORS.textPrimary,
      fontSize: 15,
      fontWeight: '600',
    },

    title: {
      color: COLORS.textPrimary,
      fontSize: 30,
      fontWeight: '800',
    },

    subtitle: {
      marginTop: 6,
      marginBottom: 20,
      color: COLORS.textMuted,
      fontSize: 15,
      lineHeight: 21,
    },

    card: {
      backgroundColor:
        COLORS.surface,
      borderRadius: 18,
      borderWidth: 1,
      borderColor:
        COLORS.border,
      padding: 18,
      marginBottom: 14,
    },

    sectionTitle: {
      color:
        COLORS.textPrimary,
      fontSize: 20,
      fontWeight: '800',
      marginBottom: 14,
    },

    formIntro: {
      color:
        COLORS.textSecondary,
      fontSize: 14,
      lineHeight: 20,
      marginBottom: 14,
    },

    participantCodeBox: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent:
        'space-between',
      borderRadius: 13,
      backgroundColor:
        COLORS.surfaceElevated,
      borderWidth: 1,
      borderColor:
        COLORS.border,
      padding: 13,
      marginBottom: 8,
    },

    participantCodeLabel: {
      color:
        COLORS.textMuted,
      fontSize: 13,
      fontWeight: '700',
    },

    participantCodeValue: {
      color:
        COLORS.textPrimary,
      fontSize: 16,
      fontWeight: '800',
    },

    label: {
      color:
        COLORS.textPrimary,
      fontSize: 13,
      fontWeight: '700',
      marginBottom: 7,
      marginTop: 14,
      lineHeight: 19,
    },

    questionText: {
      color:
        COLORS.textPrimary,
      fontSize: 14,
      fontWeight: '700',
      lineHeight: 20,
      marginTop: 22,
      marginBottom: 9,
    },

    input: {
      minHeight: 50,
      borderWidth: 1,
      borderColor:
        COLORS.border,
      borderRadius: 13,
      paddingHorizontal: 14,
      color:
        COLORS.textPrimary,
      backgroundColor:
        COLORS.surfaceElevated,
      fontSize: 16,
    },

    orderRow: {
      flexDirection: 'row',
      gap: 9,
    },

    orderButton: {
      flex: 1,
      borderWidth: 1,
      borderColor:
        COLORS.border,
      borderRadius: 13,
      paddingVertical: 13,
      paddingHorizontal: 10,
      alignItems: 'center',
      backgroundColor:
        COLORS.surfaceElevated,
    },

    orderButtonSelected: {
      borderColor:
        COLORS.blue,

      backgroundColor:
        isDark
          ? COLORS.surfaceElevated
          : '#EDF4FF',
    },

    orderButtonText: {
      color:
        COLORS.textMuted,
      fontWeight: '700',
      textAlign: 'center',
    },

    orderButtonTextSelected: {
      color:
        COLORS.blue,
    },

    choiceWrap: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },

    choiceButton: {
      minHeight: 44,
      borderWidth: 1,
      borderColor:
        COLORS.border,
      borderRadius: 12,
      backgroundColor:
        COLORS.surfaceElevated,
      paddingHorizontal: 12,
      paddingVertical: 10,
      justifyContent:
        'center',
    },

    choiceButtonSelected: {
      borderColor:
        COLORS.blue,

      backgroundColor:
        isDark
          ? COLORS.surfaceElevated
          : '#EDF4FF',
    },

    choiceButtonText: {
      color:
        COLORS.textMuted,
      fontSize: 13,
      fontWeight: '700',
    },

    choiceButtonTextSelected: {
      color:
        COLORS.blue,
    },

    scaleRow: {
      flexDirection: 'row',
      gap: 6,
    },

    scaleButton: {
      flex: 1,
      minHeight: 44,
      borderWidth: 1,
      borderColor:
        COLORS.border,
      borderRadius: 10,
      backgroundColor:
        COLORS.surfaceElevated,
      alignItems: 'center',
      justifyContent:
        'center',
    },

    scaleButtonSelected: {
      borderColor:
        COLORS.blue,

      backgroundColor:
        isDark
          ? COLORS.surfaceElevated
          : '#EDF4FF',
    },

    scaleButtonText: {
      color:
        COLORS.textMuted,
      fontWeight: '800',
    },

    scaleButtonTextSelected: {
      color:
        COLORS.blue,
    },

    scaleLabelsRow: {
      flexDirection: 'row',
      justifyContent:
        'space-between',
      marginTop: 6,
    },

    scaleAnchor: {
      color:
        COLORS.textMuted,
      fontSize: 11,
    },

    selectedScaleText: {
      marginTop: 6,
      color:
        COLORS.textSecondary,
      fontSize: 12,
      fontWeight: '600',
    },

    formActionRow: {
      flexDirection: 'row',
      gap: 10,
      marginTop: 18,
    },

    secondaryButton: {
      minHeight: 52,
      borderRadius: 14,
      borderWidth: 1,
      borderColor:
        COLORS.border,
      backgroundColor:
        COLORS.surfaceElevated,
      alignItems: 'center',
      justifyContent:
        'center',
      paddingHorizontal: 18,
    },

    secondaryButtonText: {
      color:
        COLORS.textPrimary,
      fontSize: 15,
      fontWeight: '800',
    },

    formPrimaryButton: {
      flex: 1,
      marginTop: 0,
    },

    note: {
      marginTop: 14,
      color:
        COLORS.textMuted,
      fontSize: 13,
      lineHeight: 19,
    },

    primaryButton: {
      marginTop: 18,
      minHeight: 52,
      borderRadius: 14,
      backgroundColor:
        COLORS.blue,
      alignItems: 'center',
      justifyContent:
        'center',
      paddingHorizontal: 16,
    },

    disabledButton: {
      opacity: 0.55,
    },

    primaryButtonText: {
      color:
        COLORS.white,
      fontSize: 16,
      fontWeight: '800',
      textAlign: 'center',
    },

    errorBox: {
      marginBottom: 14,
      borderRadius: 13,
      borderWidth: 1,

      borderColor:
        isDark
          ? COLORS.border
          : '#F3B7B7',

      backgroundColor:
        isDark
          ? COLORS.surfaceElevated
          : '#FFF3F3',

      padding: 13,
    },

    errorText: {
      color:
        isDark
          ? COLORS.red
          : '#9C2F2F',
      lineHeight: 19,
    },

    progressCard: {
      flexDirection: 'row',
      justifyContent:
        'space-between',

      backgroundColor:
        isDark
          ? COLORS.surfaceElevated
          : '#EAF2FF',

      borderRadius: 16,
      padding: 15,
      marginBottom: 14,
    },

    progressLabel: {
      color:
        COLORS.textMuted,
      fontSize: 11,
      fontWeight: '700',
      textTransform:
        'uppercase',
    },

    progressValue: {
      marginTop: 4,
      color:
        COLORS.textPrimary,
      fontSize: 14,
      fontWeight: '800',
    },

    eyebrow: {
      color:
        COLORS.blue,
      fontSize: 12,
      fontWeight: '800',
      textTransform:
        'uppercase',
      letterSpacing: 0.5,
      marginBottom: 6,
    },

    conditionBadge: {
      alignSelf:
        'flex-start',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 7,

      backgroundColor:
        isDark
          ? COLORS.surfaceElevated
          : '#EDF4FF',

      paddingHorizontal: 11,
      paddingVertical: 7,
      borderRadius: 999,
      marginBottom: 16,
    },

    conditionText: {
      color:
        COLORS.blue,
      fontSize: 13,
      fontWeight: '800',
    },

    claimLabel: {
      color:
        COLORS.textMuted,
      fontSize: 12,
      fontWeight: '700',
      textTransform:
        'uppercase',
      marginBottom: 6,
    },

    claimText: {
      color:
        COLORS.textPrimary,
      fontSize: 18,
      lineHeight: 25,
      fontWeight: '700',
    },

    familiarityCard: {
      marginTop: 18,
      borderRadius: 14,
      borderWidth: 1,
      borderColor:
        COLORS.border,
      backgroundColor:
        COLORS.surfaceElevated,
      padding: 14,
    },

    familiarityLabel: {
      color:
        COLORS.blue,
      fontSize: 10,
      fontWeight: '800',
      letterSpacing: 0.7,
    },

    familiarityQuestion: {
      marginTop: 6,
      color:
        COLORS.textPrimary,
      fontSize: 14,
      lineHeight: 20,
      fontWeight: '700',
    },

    familiarityOptions: {
      flexDirection: 'row',
      columnGap: 8,
      marginTop: 12,
    },

    familiarityButton: {
      flex: 1,
      minHeight: 44,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 12,
      borderWidth: 1,
      borderColor:
        COLORS.border,
      backgroundColor:
        COLORS.surface,
    },

    familiarityButtonSelected: {
      borderColor:
        COLORS.blue,
      backgroundColor:
        isDark
          ? COLORS.surface
          : '#EDF4FF',
    },

    familiarityButtonText: {
      color:
        COLORS.textSecondary,
      fontSize: 13,
      fontWeight: '700',
    },

    familiarityButtonTextSelected: {
      color:
        COLORS.blue,
    },

    completeIcon: {
      alignItems: 'center',
    },

    completeTitle: {
      marginTop: 8,
      color:
        COLORS.textPrimary,
      fontSize: 24,
      fontWeight: '800',
      textAlign: 'center',
    },

    completeText: {
      marginTop: 8,
      color:
        COLORS.textMuted,
      fontSize: 15,
      textAlign: 'center',
    },

    walkthroughCard: {
      marginTop: 42,
      backgroundColor:
        COLORS.surface,
      borderRadius: 22,
      borderWidth: 1,
      borderColor:
        COLORS.border,
      padding: 22,
    },

    walkthroughIcon: {
      width: 62,
      height: 62,
      borderRadius: 18,

      backgroundColor:
        isDark
          ? COLORS.surfaceElevated
          : '#EDF4FF',

      alignItems: 'center',
      justifyContent:
        'center',
      marginBottom: 18,
    },

    walkthroughEyebrow: {
      color:
        COLORS.blue,
      fontSize: 11,
      fontWeight: '800',
      letterSpacing: 0.8,
      marginBottom: 7,
    },

    walkthroughTitle: {
      color:
        COLORS.textPrimary,
      fontSize: 26,
      lineHeight: 32,
      fontWeight: '800',
    },

    walkthroughText: {
      marginTop: 12,
      color:
        COLORS.textSecondary,
      fontSize: 15,
      lineHeight: 22,
    },

    walkthroughFlow: {
      marginTop: 18,
      borderRadius: 14,
      backgroundColor:
        COLORS.background,
      padding: 14,
    },

    walkthroughFlowText: {
      color:
        COLORS.textPrimary,
      fontSize: 13,
      fontWeight: '700',
      lineHeight: 19,
      textAlign: 'center',
    },

    walkthroughNote: {
      marginTop: 16,
      color:
        COLORS.textMuted,
      fontSize: 13,
      lineHeight: 19,
    },
  });