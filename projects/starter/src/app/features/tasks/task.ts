import {asFlag, asList, asText, isUuidv7} from 'fam-stack/core';
import {FamUser} from 'fam-stack/auth';

/** The collection, spelled once. Its rules block is in `firestore.rules`. */
export const TASKS_COLLECTION = 'tasks';

/* Bounds; `firestore.rules` mirrors them more loosely. */
export const TASK_TITLE_MAX = 120;
export const TASK_NOTES_MAX = 500;
export const TASK_ESTIMATE_MAX = 999;

/** A task as stored. Times are Unix ms on the writing device, bounded by the rules against server time. */
export interface TaskDocument {
  readonly title: string;
  readonly notes: string;
  /** Minutes, or `null` when nobody estimated it. */
  readonly estimate: number | null;
  readonly done: boolean;
  readonly createdAt: number;
  readonly createdBy: FamUser;
  readonly updatedAt: number;
  readonly updatedBy: FamUser;
}

/** A task as the screens read it: the document id (a UUID v7), shaped. */
export interface Task extends TaskDocument {
  readonly id: string;
}

/** What the editor hands back. */
export interface TaskDraft {
  readonly title: string;
  readonly notes: string;
  readonly estimate: number | null;
}

/** The task changed on another device after this one read it. */
export class TaskConflictError extends Error {
  constructor() {
    super('The task changed on another device.');
    this.name = 'TaskConflictError';
  }
}

const asUser = (value: unknown): FamUser => {
  const user = (typeof value === 'object' && value !== null ? value : {}) as Partial<FamUser>;
  return {uid: asText(user.uid), email: asText(user.email)};
};

const asTime = (value: unknown): number => {
  const time = Number(value);
  return Number.isFinite(time) && time > 0 ? time : 0;
};

/* Whole minutes within bounds, or `null` when absent or not a number. */
const asEstimate = (value: unknown): number | null => {
  const minutes = Number(value);
  return value === null || value === undefined || !Number.isFinite(minutes)
    ? null
    : Math.min(Math.max(0, Math.round(minutes)), TASK_ESTIMATE_MAX);
};

/* A stored document read defensively, or `null` when its id is not a UUID v7. */
export const shapeTask = (raw: Partial<Record<keyof TaskDocument, unknown>> & {id?: unknown}): Task | null => {
  if (!isUuidv7(raw.id)) return null;
  return {
    id: raw.id,
    title: asText(raw.title, TASK_TITLE_MAX),
    notes: asText(raw.notes, TASK_NOTES_MAX),
    estimate: asEstimate(raw.estimate),
    done: asFlag(raw.done),
    createdAt: asTime(raw.createdAt),
    createdBy: asUser(raw.createdBy),
    updatedAt: asTime(raw.updatedAt),
    updatedBy: asUser(raw.updatedBy)
  };
};

/** Every showable task, each id once. */
export const shapeTasks = (documents: readonly unknown[]): readonly Task[] => {
  const seen = new Set<string>();
  const tasks: Task[] = [];
  for (const document of asList(documents)) {
    const task = typeof document === 'object' && document !== null ? shapeTask(document) : null;
    if (task === null || seen.has(task.id)) continue;
    seen.add(task.id);
    tasks.push(task);
  }
  return tasks;
};

/** The draft's words, trimmed and bounded the same way the rules bound them. */
export const cleanDraft = (draft: TaskDraft): TaskDraft => ({
  title: asText(draft.title, TASK_TITLE_MAX),
  notes: asText(draft.notes, TASK_NOTES_MAX),
  estimate: asEstimate(draft.estimate)
});
