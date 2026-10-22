export type Unit = 'kg';
export type RoundingMode = 'auto' | number;

export interface Exercise {
  id: string;
  name: string;
  oneRM: number | null;
  impact: number;
  multiplier: number;
  rounding: RoundingMode;
  note?: string;
}

export interface DayTemplate {
  id: string;
  name: string;
}

export interface SetGroup {
  id: string;
  percent: number;
  reps: number;
  sets: number;
}

export interface Entry {
  id: string;
  exerciseId: string;
  groups: SetGroup[];
}

export interface WeekDay {
  dayTemplateId: string;
  entries: Entry[];
}

export interface Week {
  id: string;
  label: string;
  isDeload: boolean;
  days: WeekDay[];
}

export interface ProgressionConfig {
  mode: 'compound' | 'linear' | 'none';
  stepPercent: number;
  deload: {
    mode: 'hold' | 'reduce';
    reductionPercent: number;
  };
}

export interface TimeThreshold {
  belowPercent: number;
  factor: number;
}

export interface MetricsConfig {
  funtikovTable: number[];
  timeThresholds: TimeThreshold[];
  timeFallbackFactor: number;
  impactHeavyThreshold: number;
  impactLightThreshold: number;
  impactHeavyFactor: number;
  impactMediumFactor: number;
  impactLightFactor: number;
}

export interface Project {
  schemaVersion: 1;
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  unit: Unit;
  defaultRounding: RoundingMode;
  exercises: Exercise[];
  dayTemplates: DayTemplate[];
  weeks: Week[];
  progression: ProgressionConfig;
  metrics: MetricsConfig;
}

export interface ComputedGroup extends SetGroup {
  weight: number | null;
  tonnage: number | null;
  kpsh: number;
  funtikov: number | null;
  timeMinutes: number;
}

export interface ComputedEntry {
  entryId: string;
  exercise: Exercise;
  oneRM: number | null;
  groups: ComputedGroup[];
  tonnage: number;
  kpsh: number;
  funtikov: number;
  timeMinutes: number;
  avgWeight: number;
  relativeIntensity: number | null;
  hasMissingOneRM: boolean;
}

export interface ComputedDay {
  dayTemplateId: string;
  dayName: string;
  entries: ComputedEntry[];
  tonnage: number;
  kpsh: number;
  funtikov: number;
  timeMinutes: number;
  avgWeight: number;
}

export interface ComputedWeek {
  weekId: string;
  label: string;
  isDeload: boolean;
  oneRMByExercise: Record<string, number | null>;
  days: ComputedDay[];
  tonnage: number;
  kpsh: number;
  funtikov: number;
  timeMinutes: number;
  avgWeight: number;
}

export interface ComputedCycle {
  weeks: ComputedWeek[];
  tonnage: number;
  kpsh: number;
  funtikov: number;
  timeMinutes: number;
  avgWeight: number;
}

export type IssueSeverity = 'error' | 'warning';

export interface Issue {
  severity: IssueSeverity;
  code: string;
  message: string;
  exerciseId?: string;
  weekId?: string;
  dayTemplateId?: string;
  entryId?: string;
  groupId?: string;
}
