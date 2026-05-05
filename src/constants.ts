/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export const LEVEL_WEIGHTS = {
  1: 1.25, // Imitation
  2: 1.10, // Manipulation
  3: 1.00, // Precision
  4: 0.85, // Articulation
  5: 0.70  // Naturalisation
};

export const DIFFICULTY_ORDER = [1, 2, 3, 4, 5];

export const DEFAULT_COLUMN_ORDER = ['index', 'name', 'stream', 'aoi', 'totals', 'l1', 'l2', 'l3', 'l4', 'l5'];

export const STORAGE_KEYS = {
  LEARNERS: 'cai_learners',
  SCORES: 'cai_scores',
  REVERSE_SCORES: 'cai_reverse_scores',
  SELECTED_SUBJECT: 'cai_selected_subject',
  COLUMN_ORDER: 'cai_column_order',
  CUSTOM_COLUMNS: 'cai_custom_columns'
};
