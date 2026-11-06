import {ChangeDetectionStrategy, Component, computed, inject, signal} from '@angular/core';
import {MatDialog} from '@angular/material/dialog';
import {MatButtonModule} from '@angular/material/button';
import {MatCheckboxModule} from '@angular/material/checkbox';
import {MatIconModule} from '@angular/material/icon';
import {clockSignal} from 'fam-stack/core';
import {LoadStatusComponent} from 'fam-stack/a11y';
import {askConfirmation, emailName, NotificationService, SHEET_DIALOG_CONFIG} from 'fam-stack/ui';
import {Task, TaskDraft} from './task';
import {TasksService} from './tasks.service';
import {TaskDialogComponent, TaskDialogData} from './task-dialog.component';
import {taskWriteFailure} from './task-errors';
import {AGE_REFRESH_MS, ageLabel, durationLabel, taskTitle} from './task-labels';

const MATERIAL_MODULES = [MatButtonModule, MatCheckboxModule, MatIconModule];

/* One row as the template renders it. The template never reads a stored document. */
interface TaskRow {
  readonly task: Task;
  readonly title: string;
  readonly notes: string;
  readonly estimate: string;
  readonly meta: string;
}

interface TaskSection {
  readonly id: string;
  readonly label: string;
  readonly chip: string;
  readonly rows: readonly TaskRow[];
  readonly emptyHint: string;
}

@Component({
  selector: 'app-tasks',
  imports: [MATERIAL_MODULES, LoadStatusComponent],
  templateUrl: './tasks.component.html',
  styleUrl: './tasks.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TasksComponent {
  protected readonly tasks = inject(TasksService);
  private readonly dialog = inject(MatDialog);
  private readonly notification = inject(NotificationService);
  private readonly now = clockSignal(AGE_REFRESH_MS);
  /* Tasks with a write in flight: their controls rest until it settles. */
  protected readonly pending = signal<ReadonlySet<string>>(new Set());

  /* Open always shows (it says when it is empty); Done only once it holds something. */
  protected readonly sections = computed<readonly TaskSection[]>(() => {
    const open = this.tasks.openTasks().map(task => this.row(task));
    const done = this.tasks.doneTasks().map(task => this.row(task));
    const sections: TaskSection[] = [
      {id: 'open', label: 'Open', chip: 'fam-chip--warning', rows: open, emptyHint: 'Nothing open right now.'}
    ];
    if (done.length > 0) sections.push({id: 'done', label: 'Done', chip: 'fam-chip--positive', rows: done, emptyHint: ''});
    return sections;
  });
  protected readonly isEmpty = computed(() => this.tasks.tasks().length === 0);

  /** Opens the editor on `task`, or on a new one. */
  protected edit(task?: Task): void {
    const data: TaskDialogData = {task};
    this.dialog.open<TaskDialogComponent, TaskDialogData, TaskDraft>(TaskDialogComponent, {...SHEET_DIALOG_CONFIG, data})
      .afterClosed()
      .subscribe(draft => {
        if (!draft) return;
        if (task) {
          void this.run(task, () => this.tasks.update(task, draft), 'Task updated.');
        } else {
          this.tasks.create(draft).then(() => this.notification.success('Task added.'), error => this.fail(error));
        }
      });
  }

  protected setDone(task: Task, done: boolean): void {
    void this.run(task, () => this.tasks.setDone(task, done), done ? 'Marked as done.' : 'Reopened.');
  }

  protected async remove(task: Task): Promise<void> {
    const confirmed = await askConfirmation(this.dialog, {
      title: 'Delete task',
      description: ['Delete ', {bold: taskTitle(task)}, ' for everyone?']
    });
    if (!confirmed) return;
    await this.run(task, () => this.tasks.remove(task), 'Task deleted.', 'deleted');
  }

  protected isPending(task: Task): boolean {
    return this.pending().has(task.id);
  }

  /* One write, its feedback, and the row resting while it is in flight. A write that
   * answers `false` changed nothing and says nothing: it is not news. */
  private async run(
    task: Task,
    write: () => Promise<boolean | void>,
    said: string,
    voice: 'success' | 'deleted' = 'success'
  ): Promise<void> {
    this.pending.update(ids => new Set(ids).add(task.id));
    try {
      if (await write() === false) return;
      this.notification[voice](said);
    } catch (error: unknown) {
      this.fail(error);
    } finally {
      this.pending.update(ids => {
        const next = new Set(ids);
        next.delete(task.id);
        return next;
      });
    }
  }

  private fail(error: unknown): void {
    console.error(error);
    this.notification.error(taskWriteFailure(error));
  }

  private row(task: Task): TaskRow {
    const author = emailName(task.createdBy.email) || 'someone';
    return {
      task,
      title: taskTitle(task),
      notes: task.notes,
      estimate: task.estimate === null ? '' : durationLabel(task.estimate),
      meta: `${author} · ${task.createdAt ? ageLabel(task.createdAt, this.now()) : 'unknown time'}`
    };
  }
}
