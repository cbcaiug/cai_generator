/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface LevelConfig {
  level: number;
  name: string;
  sc_max: number;
  gs_max: number;
}

export interface Subject {
  id: string;
  code: string;
  name: string;
  class: string;
  term: number;
  aoi_max: number;
  levels: LevelConfig[];
}

export interface Learner {
  id: string;
  name: string;
  stream: string;
  customData?: Record<string, string>;
}

export interface ColumnConfig {
  id: string;
  title: string;
  isLocked?: boolean;
  dataType?: 'text' | 'number' | 'percentage' | 'formula';
  formula?: string;
}

export interface ScoreData {
  learnerId: string;
  aoi: number | null;
  // Indexed by level (1-5) and then 'sc' or 'gs'
  scores: {
    [level: number]: {
      sc: number | null;
      gs: number | null;
    };
  };
}

export interface ReverseScoreData {
  learnerId: string;
  aoiPercentage: number | null;
  caiPercentage: number | null;
}
