export const OTHER_KEY = 'other';

export type Option = {
  key: string;
  label: string;
};

export type TimeframeKey = 'all' | 'year' | 'm6' | 'month' | 'week';

export const TIMEFRAME_OPTIONS: Option[] = [
  { key: 'all', label: 'All time' },
  { key: 'year', label: 'Last year' },
  { key: 'm6', label: 'Last 6 months' },
  { key: 'month', label: 'Last month' },
  { key: 'week', label: 'Last week' }
];

export const REGION_OPTIONS: Option[] = [
  { key: 'hands', label: 'Hands' },
  { key: 'knees', label: 'Knees' },
  { key: 'spine', label: 'Spine' },
  { key: 'feet', label: 'Feet' },
  { key: 'neck', label: 'Neck' },
  { key: 'hips', label: 'Hips' }
];

export const JOINT_OPTIONS_BY_REGION: Record<string, Option[]> = {
  hands: [
    { key: 'fingers', label: 'Fingers' },
    { key: 'wrists', label: 'Wrists' },
  ],
  knees: [
    { key: 'left-knee', label: 'Left knee' },
    { key: 'right-knee', label: 'Right knee' },
  ],
  spine: [
    { key: 'lumbar', label: 'Lower back (lumbar)' },
    { key: 'thoracic', label: 'Mid-back (thoracic)' },
  ],
  feet: [
    { key: 'ankles', label: 'Ankles' },
    { key: 'toes', label: 'Toes' },
  ],
  neck: [
    { key: 'cervical', label: 'Cervical region' },
  ],
  hips: [{ key: 'hips', label: 'Hips' }]
};

export const SYMPTOM_OPTIONS: Option[] = [
  { key: 'pain', label: 'Pain' },
  { key: 'stiffness', label: 'Stiffness' },
  { key: 'swelling', label: 'Swelling' },
  { key: OTHER_KEY, label: 'Other symptom' }
];

export const TRIGGER_OPTIONS: Option[] = [
  { key: 'stress', label: 'Stress' },
  { key: 'activity', label: 'Activity' },
  { key: 'weather', label: 'Weather' },
  { key: OTHER_KEY, label: 'Other trigger' }
];

export const ACTION_OPTIONS: Option[] = [
  { key: 'medication', label: 'Medication' },
  { key: 'rest', label: 'Rest' },
  { key: 'exercise', label: 'Exercise/stretch' },
  { key: OTHER_KEY, label: 'Other action' }
];

export type DrillLevel = {
  field: 'drill1' | 'drill2';
  label: string;
  options: Option[];
};

export const DRILLDOWNS_BY_REGION_JOINT: Record<string, Record<string, DrillLevel[]>> = {
  hands: {
    fingers: [
      {
        field: 'drill1',
        label: 'Finger',
        options: [
          { key: 'thumb', label: 'Thumb' },
          { key: 'index', label: 'Index' },
          { key: 'middle', label: 'Middle' },
          { key: 'ring', label: 'Ring' },
          { key: 'little', label: 'Little' }
        ]
      },
      {
        field: 'drill2',
        label: 'Finger joint',
        options: [
          { key: 'mcp', label: 'MCP' },
          { key: 'pip', label: 'PIP' },
          { key: 'dip', label: 'DIP' },
          { key: 'ip', label: 'IP' },
          { key: 'cmc', label: 'CMC' }
        ]
      }
    ]
  },
  feet: {
    toes: [
      {
        field: 'drill1',
        label: 'Toe',
        options: [
          { key: 'big', label: 'Big toe' },
          { key: 'second', label: '2nd toe' },
          { key: 'third', label: '3rd toe' },
          { key: 'fourth', label: '4th toe' },
          { key: 'little', label: '5th toe' }
        ]
      },
      {
        field: 'drill2',
        label: 'Toe joint',
        options: [
          { key: 'mtp', label: 'MTP' },
          { key: 'pip', label: 'PIP' },
          { key: 'dip', label: 'DIP' },
          { key: 'ip', label: 'IP' }
        ]
      }
    ]
  }
};

export function drilldownsFor(regionKey?: string, jointKey?: string): DrillLevel[] {
  if (!regionKey || !jointKey) {
    return [];
  }
  return DRILLDOWNS_BY_REGION_JOINT[regionKey]?.[jointKey] ?? [];
}

export function labelForKey(list: Option[], key?: string): string {
  if (!key) return 'Unspecified';
  const match = list.find((item) => item.key === key);
  return match ? match.label : key;
}

export function jointsForRegion(regionKey?: string): Option[] | undefined {
  if (!regionKey) return undefined;
  return JOINT_OPTIONS_BY_REGION[regionKey];
}

export function hasOtherSelected(key?: string): boolean {
  return key === OTHER_KEY;
}

const SIDE_HIDE_REGIONS = new Set(['spine', 'neck']);

export function sideModeForSelection(regionKey?: string, jointKey?: string): 'show' | 'hide' {
  if (regionKey && SIDE_HIDE_REGIONS.has(regionKey)) {
    return 'hide';
  }
  if (jointKey) {
    const lowerKey = jointKey.toLowerCase();
    if (lowerKey.includes('left') || lowerKey.includes('right') || lowerKey.includes('both')) {
      return 'hide';
    }
    const jointOptions = jointsForRegion(regionKey);
    const match = jointOptions?.find((option) => option.key === jointKey);
    if (match && /(Left|Right|Both)/.test(match.label)) {
      return 'hide';
    }
  }
  return 'show';
}

// Add more entries above and restart Vite; the selectors and exports will
// automatically pick up any new Option items. Keep keys stable to preserve
// previously saved records.
