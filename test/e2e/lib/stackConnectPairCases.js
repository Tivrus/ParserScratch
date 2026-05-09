// @ts-check

/**
 * Якорь уже на полотне; второй блок тащим с палитры (`relation` относительно якоря).
 *
 * @typedef {{
 *   title: string;
 *   anchorCategory: string;
 *   anchorId: string;
 *   dragCategory: string;
 *   dragId: string;
 *   relation: 'below' | 'above';
 *   expectedSnapMode: 'below' | 'above';
 * }} StackConnectPairCase
 */

/** @type {StackConnectPairCase[]} */
export const STACK_CONNECT_PAIR_CASES = [
  {
    title: 'default + default снизу',
    anchorCategory: 'Motion',
    anchorId: 'motion_move_steps',
    dragCategory: 'Motion',
    dragId: 'turn_right_steps',
    relation: 'below',
    expectedSnapMode: 'below',
  },
  {
    title: 'default + default сверху',
    anchorCategory: 'Motion',
    anchorId: 'motion_move_steps',
    dragCategory: 'Motion',
    dragId: 'turn_left_steps',
    relation: 'above',
    expectedSnapMode: 'above',
  },
  {
    title: 'default + start сверху',
    anchorCategory: 'Motion',
    anchorId: 'motion_move_steps',
    dragCategory: 'Motion',
    dragId: 'motion_start',
    relation: 'above',
    expectedSnapMode: 'above',
  },
  {
    title: 'start + default снизу',
    anchorCategory: 'Motion',
    anchorId: 'motion_start',
    dragCategory: 'Motion',
    dragId: 'motion_move_steps',
    relation: 'below',
    expectedSnapMode: 'below',
  },
  {
    title: 'default + stop снизу',
    anchorCategory: 'Motion',
    anchorId: 'motion_move_steps',
    dragCategory: 'Control',
    dragId: 'control_stop',
    relation: 'below',
    expectedSnapMode: 'below',
  },
  {
    title: 'stop + default сверху',
    anchorCategory: 'Control',
    anchorId: 'control_stop',
    dragCategory: 'Control',
    dragId: 'motion_smth',
    relation: 'above',
    expectedSnapMode: 'above',
  },
  {
    title: 'default + c-block снизу',
    anchorCategory: 'Motion',
    anchorId: 'motion_move_steps',
    dragCategory: 'Control',
    dragId: 'control_repeat',
    relation: 'below',
    expectedSnapMode: 'below',
  },
  {
    title: 'default + c-block сверху',
    anchorCategory: 'Motion',
    anchorId: 'motion_move_steps',
    dragCategory: 'Control',
    dragId: 'control_repeat',
    relation: 'above',
    expectedSnapMode: 'above',
  },
  {
    title: 'c-block + default снизу',
    anchorCategory: 'Control',
    anchorId: 'control_repeat',
    dragCategory: 'Control',
    dragId: 'motion_smth',
    relation: 'below',
    expectedSnapMode: 'below',
  },
  {
    title: 'c-block + default сверху',
    anchorCategory: 'Control',
    anchorId: 'control_repeat',
    dragCategory: 'Control',
    dragId: 'motion_smth',
    relation: 'above',
    expectedSnapMode: 'above',
  },
  {
    title: 'start + stop снизу',
    anchorCategory: 'Motion',
    anchorId: 'motion_start',
    dragCategory: 'Control',
    dragId: 'control_stop',
    relation: 'below',
    expectedSnapMode: 'below',
  },
  {
    title: 'stop + start сверху',
    anchorCategory: 'Control',
    anchorId: 'control_stop',
    dragCategory: 'Motion',
    dragId: 'motion_start',
    relation: 'above',
    expectedSnapMode: 'above',
  },
  {
    title: 'c-block + start сверху',
    anchorCategory: 'Control',
    anchorId: 'control_repeat',
    dragCategory: 'Motion',
    dragId: 'motion_start',
    relation: 'above',
    expectedSnapMode: 'above',
  },
  {
    title: 'start + c-block снизу',
    anchorCategory: 'Motion',
    anchorId: 'motion_start',
    dragCategory: 'Control',
    dragId: 'control_repeat',
    relation: 'below',
    expectedSnapMode: 'below',
  },
  {
    title: 'c-block + stop снизу',
    anchorCategory: 'Control',
    anchorId: 'control_repeat',
    dragCategory: 'Control',
    dragId: 'control_stop',
    relation: 'below',
    expectedSnapMode: 'below',
  },
  {
    title: 'stop + c-block сверху',
    anchorCategory: 'Control',
    anchorId: 'control_stop',
    dragCategory: 'Control',
    dragId: 'control_repeat',
    relation: 'above',
    expectedSnapMode: 'above',
  },
];
