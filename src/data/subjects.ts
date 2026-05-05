import { Subject } from '../types';

export const SUBJECTS: Subject[] = [
  {
    id: 'biology-s3-t1',
    code: '553',
    name: 'Biology',
    class: 'S3',
    term: 1,
    aoi_max: 3,
    levels: [
      { level: 1, name: 'Imitation', sc_max: 7, gs_max: 5 },
      { level: 2, name: 'Manipulation', sc_max: 7, gs_max: 5 },
      { level: 3, name: 'Precision', sc_max: 7, gs_max: 5 },
      { level: 4, name: 'Articulation', sc_max: 7, gs_max: 5 },
      { level: 5, name: 'Naturalisation', sc_max: 7, gs_max: 5 }
    ]
  },
  {
    id: 'chemistry-s4-t2',
    code: '545',
    name: 'Chemistry',
    class: 'S4',
    term: 2,
    aoi_max: 3,
    levels: [
      { level: 1, name: 'Imitation', sc_max: 8, gs_max: 6 },
      { level: 2, name: 'Manipulation', sc_max: 8, gs_max: 6 },
      { level: 3, name: 'Precision', sc_max: 8, gs_max: 6 },
      { level: 4, name: 'Articulation', sc_max: 8, gs_max: 6 },
      { level: 5, name: 'Naturalisation', sc_max: 8, gs_max: 6 }
    ]
  }
];
