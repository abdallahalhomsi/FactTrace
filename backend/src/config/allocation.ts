//block-randomised allocation of participants to the 4 counterbalanced groups (see STUDY_GROUPS in study.ts)
//made in advance by src/scripts/make-allocation.ts with a fixed seed, so it can be reproduced and reported
//each block of 4 holds every group once in a random order: after every 4th participant the groups are balanced,
//and the next participant's group cannot be guessed from the previous one (unlike a fixed 1, 2, 3, 4 rotation)
//do not edit or regenerate once real participants have been run
export const ALLOCATION_SEED = 4492026;

export const ALLOCATION: readonly (1 | 2 | 3 | 4)[] = [
  1, 4, 2, 3, //P01 to P04
  4, 1, 3, 2, //P05 to P08
  1, 2, 4, 3, //P09 to P12
  1, 4, 2, 3, //P13 to P16
  2, 4, 3, 1, //P17 to P20
  2, 3, 4, 1, //P21 to P24
  1, 2, 3, 4, //P25 to P28
  4, 3, 1, 2, //P29 to P32
  1, 2, 4, 3, //P33 to P36
  1, 2, 4, 3, //P37 to P40
  3, 2, 4, 1, //P41 to P44
  4, 2, 1, 3, //P45 to P48
  4, 2, 1, 3, //P49 to P52
  4, 2, 1, 3, //P53 to P56
  1, 4, 2, 3, //P57 to P60
];
