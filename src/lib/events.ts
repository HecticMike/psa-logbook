import { v4 as uuid } from 'uuid';
import { db, type EventRecord } from './db';
import { utils, write } from 'xlsx-js-style';
import {
  ACTION_OPTIONS,
  drilldownsFor,
  jointsForRegion,
  labelForKey,
  OTHER_KEY,
  REGION_OPTIONS,
  SYMPTOM_OPTIONS,
  TRIGGER_OPTIONS
} from './lookups';
import type { DrillLevel, Option, TimeframeKey } from './lookups';

export type { EventRecord };

export type EventFormValues = {
  startAt: number;
  endAt?: number | null;
  pain: number;
  region: string;
  regionKey?: string;
  jointKey?: string;
  symptomKey?: string;
  symptomCustom?: string;
  triggerKey?: string;
  triggerCustom?: string;
  actionKey?: string;
  actionCustom?: string;
  side?: '' | 'left' | 'right' | 'both';
  drill1Key?: string;
  drill1Custom?: string;
  drill2Key?: string;
  drill2Custom?: string;
  notes: string;
};

export type EventFilter = {
  days?: number;
  regionKey?: string;
  jointKey?: string;
  minPain?: number;
};

export type ExportOptions = {
  timeframe: TimeframeKey;
  regionKey?: string;
  jointKey?: string;
};

export type ExportedEvents = {
  schemaVersion: 1;
  exportedAt: number;
  options: ExportOptions;
  events: EventRecord[];
};

export async function createEvent(values: EventFormValues): Promise<EventRecord> {
  const now = Date.now();
  const event: EventRecord = {
    id: uuid(),
    ...values,
    side: values.side ?? '',
    drill1Key: values.drill1Key,
    drill1Custom: values.drill1Custom,
    drill2Key: values.drill2Key,
    drill2Custom: values.drill2Custom,
    createdAt: now,
    updatedAt: now
  };
  await db.events.add(event);
  return event;
}

export async function updateEvent(id: string, values: Partial<EventFormValues>): Promise<EventRecord> {
  const current = await db.events.get(id);
  if (!current) {
    throw new Error('Event not found');
  }
  const updatedAt = Date.now();
  const updated: EventRecord = {
    ...current,
    ...values,
    side: values.side ?? current.side ?? '',
    drill1Key: values.drill1Key ?? current.drill1Key,
    drill1Custom: values.drill1Custom ?? current.drill1Custom,
    drill2Key: values.drill2Key ?? current.drill2Key,
    drill2Custom: values.drill2Custom ?? current.drill2Custom,
    updatedAt
  };
  await db.events.put(updated);
  return updated;
}

export async function deleteEvent(id: string): Promise<void> {
  await db.events.delete(id);
}

export async function getEventById(id: string): Promise<EventRecord | undefined> {
  return db.events.get(id);
}

const DAY_MS = 24 * 60 * 60 * 1000;

export function getTimeframeRange(timeframe: TimeframeKey): [number | null, number] {
  if (timeframe === 'all') {
    return [null, Date.now()];
  }
  const now = Date.now();
  let days = 0;
  switch (timeframe) {
    case 'year':
      days = 365;
      break;
    case 'm6':
      days = 183;
      break;
    case 'month':
      days = 30;
      break;
    case 'week':
      days = 7;
      break;
  }
  const start = now - days * DAY_MS;
  return [start, now];
}

function matchesFilter(event: EventRecord, filters: EventFilter): boolean {
  const { minPain = 0, days, regionKey, jointKey } = filters;
  if (event.pain < minPain) {
    return false;
  }
  if (typeof days === 'number' && days > 0) {
    const threshold = Date.now() - days * DAY_MS;
    if (event.startAt < threshold) {
      return false;
    }
  }
  if (regionKey && event.regionKey !== regionKey) {
    return false;
  }
  if (jointKey && event.jointKey !== jointKey) {
    return false;
  }
  return true;
}

export async function listEvents(filters: EventFilter = {}): Promise<EventRecord[]> {
  const allEvents = await db.events.toArray();
  const filtered = allEvents.filter((event) => matchesFilter(event, filters));
  return filtered.sort((a, b) => b.startAt - a.startAt);
}

export async function exportEventsAsJson(options: ExportOptions): Promise<string> {
  const events = await filterByExportOptions(options);
  const payload: ExportedEvents = {
    schemaVersion: 1,
    exportedAt: Date.now(),
    options,
    events
  };
  return JSON.stringify(payload, null, 2);
}


const MONTH_ABBREVIATIONS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const formatDateForExport = (value?: number): string => {
  if (!value) return '';
  const date = new Date(value);
  const day = String(date.getDate()).padStart(2, '0');
  const month = MONTH_ABBREVIATIONS[date.getMonth()];
  const year = date.getFullYear().toString().slice(-2);
  return `${day}-${month}-${year}`;
};

const formatOptionWithCustom = (key: string | undefined, custom: string | undefined, options: Option[]): string => {
  if (!key) return 'Unspecified';
  if (key === OTHER_KEY) {
    if (custom && custom.trim()) {
      return custom.trim();
    }
    return 'Other';
  }
  const label = labelForKey(options, key);
  if (custom && custom.trim()) {
    return `${label} (${custom.trim()})`;
  }
  return label;
};

const formatSideLabel = (side: '' | 'left' | 'right' | 'both'): string => {
  switch (side) {
    case 'left':
      return 'Left';
    case 'right':
      return 'Right';
    case 'both':
      return 'Left & Right';
    default:
      return '';
  }
};

const getDrillLabelForExport = (event: EventRecord, level: DrillLevel): string => {
  const key = level.field === 'drill1' ? event.drill1Key : event.drill2Key;
  const custom = level.field === 'drill1' ? event.drill1Custom : event.drill2Custom;
  if (!key) return '';
  if (key === OTHER_KEY) {
    if (custom && custom.trim()) return custom.trim();
    const otherOption = level.options.find((option) => option.key === OTHER_KEY);
    return otherOption?.label ?? 'Other';
  }
  const option = level.options.find((entry) => entry.key === key);
  return option ? option.label : key;
};

const COLUMN_HEADERS = [
  'Start date',
  'End date',
  'Region',
  'Joint',
  'Detail 1',
  'Detail 2',
  'Side',
  'Symptom',
  'Pain (0-10)',
  'Stiffness (min)',
  'Swelling (0-3)',
  'Trigger',
  'Action taken',
  'Notes'
];

export async function exportEventsAsXlsx(options: ExportOptions): Promise<Blob> {
  const events = await filterByExportOptions(options);
  const rows = events.map((event) => {
    const regionLabel = event.regionKey
      ? labelForKey(REGION_OPTIONS, event.regionKey)
      : event.region;
    const jointOptions = jointsForRegion(event.regionKey ?? '');
    const jointLabel = event.jointKey
      ? labelForKey(jointOptions ?? [], event.jointKey)
      : event.jointKey ?? '';
    const drillLevels = drilldownsFor(event.regionKey ?? '', event.jointKey ?? '');
    const detailLabels = drillLevels.map((level) => getDrillLabelForExport(event, level));
    return [
      formatDateForExport(event.startAt),
      event.endAt ? formatDateForExport(event.endAt) : '',
      regionLabel,
      jointLabel,
      detailLabels[0] ?? '',
      detailLabels[1] ?? '',
      formatSideLabel(event.side ?? ''),
      formatOptionWithCustom(event.symptomKey, event.symptomCustom, SYMPTOM_OPTIONS),
      event.pain.toString(),
      '',
      '',
      formatOptionWithCustom(event.triggerKey, event.triggerCustom, TRIGGER_OPTIONS),
      formatOptionWithCustom(event.actionKey, event.actionCustom, ACTION_OPTIONS),
      event.notes ?? ''
    ];
  });
  const table = [COLUMN_HEADERS, ...rows];
  const ws = utils.aoa_to_sheet(table);
  const headerStyle = {
    font: { bold: true },
    fill: { patternType: 'solid', fgColor: { rgb: 'FFF4F5F7' } }
  };
  COLUMN_HEADERS.forEach((_, columnIndex) => {
    const address = utils.encode_cell({ c: columnIndex, r: 0 });
    const cell = ws[address];
    if (cell) {
      cell.s = headerStyle;
    }
  });
  ws['!cols'] = [
    { wch: 12 },
    { wch: 12 },
    { wch: 12 },
    { wch: 12 },
    { wch: 18 },
    { wch: 18 },
    { wch: 12 },
    { wch: 16 },
    { wch: 10 },
    { wch: 14 },
    { wch: 14 },
    { wch: 16 },
    { wch: 16 },
    { wch: 30 }
  ];
  ws['!views'] = [{ state: 'frozen', ySplit: 1 }];
  const wb = utils.book_new();
  utils.book_append_sheet(wb, ws, 'PsA Logbook');
  const arrayBuffer = write(wb, { bookType: 'xlsx', type: 'array' });
  return new Blob([arrayBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });
}

async function filterByExportOptions(options: ExportOptions): Promise<EventRecord[]> {
  const raw = await db.events.toArray();
  const [start, end] = getTimeframeRange(options.timeframe);
  const filtered = raw.filter((event) => {
    if (start !== null && event.startAt < start) {
      return false;
    }
    if (event.startAt > end) {
      return false;
    }
    if (options.regionKey && event.regionKey !== options.regionKey) {
      return false;
    }
    if (options.jointKey && event.jointKey !== options.jointKey) {
      return false;
    }
    return true;
  });
  return filtered.sort((a, b) => a.startAt - b.startAt);
}

export async function exportAllEventsAsJson(): Promise<ExportedEvents> {
  const payload: ExportedEvents = {
    schemaVersion: 1,
    exportedAt: Date.now(),
    options: { timeframe: 'all' },
    events: await db.events.toArray()
  };
  return payload;
}

export async function importEventsFromJson(payload: ExportedEvents): Promise<{ imported: number }> {
  if (!payload || !Array.isArray(payload.events)) {
    throw new Error('Invalid import payload');
  }
  let imported = 0;
  await db.transaction('rw', db.events, async () => {
    for (const incoming of payload.events) {
      if (!incoming.id) continue;
      const existing = await db.events.get(incoming.id);
      if (!existing) {
        await db.events.add(incoming);
        imported += 1;
        continue;
      }
      if ((incoming.updatedAt ?? incoming.createdAt ?? 0) > existing.updatedAt) {
        await db.events.put({
          ...existing,
          ...incoming,
          updatedAt: incoming.updatedAt ?? Date.now()
        });
        imported += 1;
      }
    }
  });
  return { imported };
}
