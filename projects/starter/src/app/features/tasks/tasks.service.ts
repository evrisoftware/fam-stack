import {computed, DestroyRef, inject, Injectable, signal} from '@angular/core';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {
  collection,
  deleteDoc,
  doc,
  DocumentReference,
  Firestore,
  limit,
  orderBy,
  query,
  setDoc
} from 'firebase/firestore';
import {takeUntil} from 'rxjs';
import {uuidv7} from 'fam-stack/core';
import {LinkService, retryLiveStream} from 'fam-stack/backend';
import {collectionData, mutateDocument} from 'fam-stack/firebase';
import {AuthService, FamUser} from 'fam-stack/auth';
import {cleanDraft, shapeTasks, Task, TASKS_COLLECTION, TaskConflictError, TaskDocument, TaskDraft} from './task';

const STREAM = 'tasks';

/**
 * The live task list and every write to it. Provided by the shell; the listener ends
 * on `signingOut$` or when the shell is destroyed. `tasks` is set only from the listener.
 */
@Injectable()
export class TasksService {
  private readonly firestore = inject(Firestore);
  private readonly auth = inject(AuthService);
  private readonly link = inject(LinkService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly collection = collection(this.firestore, TASKS_COLLECTION);
  /** The list's query; also the shell's link probe. */
  readonly query = query(this.collection, orderBy('createdAt', 'desc'), limit(500));

  /* `null` until the server answers or the cache has tasks. */
  private readonly snapshot = signal<readonly Task[] | null>(null);
  readonly isLoading = computed(() => this.snapshot() === null);
  readonly tasks = computed<readonly Task[]>(() => this.snapshot() ?? []);
  readonly openTasks = computed(() => this.tasks().filter(task => !task.done));
  readonly doneTasks = computed(() => this.tasks().filter(task => task.done));

  /** Opens the listener. Call once, after `AuthService.loadUser()` has resolved. */
  load(): void {
    collectionData<unknown>(this.query, {idField: 'id'}).pipe(
      retryLiveStream(error => this.link.reportBroken(STREAM, error)),
      takeUntil(this.auth.signingOut$),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(({data, fromCache}) => {
      if (!fromCache) this.link.reportAlive(STREAM);
      if (fromCache && data.length === 0 && this.snapshot() === null) return;
      this.snapshot.set(shapeTasks(data));
    });
  }

  /** Creates a task. Works offline (the write is queued). */
  async create(draft: TaskDraft): Promise<void> {
    const user = this.requireUser();
    const now = Date.now();
    const id = uuidv7();
    const task: TaskDocument = {...cleanDraft(draft), done: false, createdAt: now, createdBy: user, updatedAt: now, updatedBy: user};
    await setDoc(this.reference(id), task);
  }

  /**
   * Saves an edit made from `task`. Throws `TaskConflictError` when the stored task
   * changed since; answers whether anything was written.
   */
  update(task: Task, draft: TaskDraft): Promise<boolean> {
    const user = this.requireUser();
    const clean = cleanDraft(draft);
    return mutateDocument<TaskDocument>(this.firestore, this.reference(task.id), current => {
      if (current.updatedAt !== task.updatedAt) throw new TaskConflictError();
      if (current.title === clean.title && current.notes === clean.notes && current.estimate === clean.estimate) {
        return current;
      }
      return stamped(current, clean, user);
    });
  }

  /** Sets the task's `done`; writes nothing when it already has that value. */
  setDone(task: Task, done: boolean): Promise<boolean> {
    const user = this.requireUser();
    return mutateDocument<TaskDocument>(this.firestore, this.reference(task.id), current =>
      current.done === done ? current : stamped(current, {done}, user));
  }

  remove(task: Task): Promise<void> {
    return deleteDoc(this.reference(task.id));
  }

  private reference(id: string): DocumentReference {
    return doc(this.collection, id);
  }

  private requireUser(): FamUser {
    const user = this.auth.currentUser();
    if (!user) throw new Error('No signed-in user.');
    return user;
  }
}

/* `current` with `changes`, signed by `user`, `updatedAt` strictly after the stored one. */
const stamped = (current: TaskDocument, changes: Partial<TaskDocument>, user: FamUser): TaskDocument => ({
  ...current,
  ...changes,
  updatedAt: Math.max(Date.now(), (Number(current.updatedAt) || 0) + 1),
  updatedBy: user
});
