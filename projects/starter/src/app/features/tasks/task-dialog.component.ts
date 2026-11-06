import {ChangeDetectionStrategy, Component, computed, inject, signal} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {MAT_DIALOG_DATA, MatDialogModule, MatDialogRef} from '@angular/material/dialog';
import {MatButtonModule} from '@angular/material/button';
import {MatInputModule} from '@angular/material/input';
import {NumberFormatDirective, parseNumberField} from 'fam-stack/ui';
import {Task, TASK_ESTIMATE_MAX, TASK_NOTES_MAX, TASK_TITLE_MAX, TaskDraft} from './task';

const MATERIAL_MODULES = [MatButtonModule, MatDialogModule, MatInputModule];

export interface TaskDialogData {
  /** The task being edited; absent for a new one. */
  readonly task?: Task;
}

/** The task editor sheet. Closes with a `TaskDraft`, or nothing; `save()` parses the estimate text. */
@Component({
  selector: 'app-task-dialog',
  imports: [FormsModule, MATERIAL_MODULES, NumberFormatDirective],
  templateUrl: './task-dialog.component.html',
  styleUrl: './task-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TaskDialogComponent {
  private readonly data = inject<TaskDialogData>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject<MatDialogRef<TaskDialogComponent, TaskDraft>>(MatDialogRef);
  protected readonly editing = this.data.task !== undefined;
  protected readonly titleMax = TASK_TITLE_MAX;
  protected readonly notesMax = TASK_NOTES_MAX;
  protected readonly estimateMax = TASK_ESTIMATE_MAX;

  protected readonly title = signal(this.data.task?.title ?? '');
  protected readonly notes = signal(this.data.task?.notes ?? '');
  protected readonly estimateText = signal(this.data.task?.estimate?.toString() ?? '');
  protected readonly canSave = computed(() => this.title().trim().length > 0);

  protected save(): void {
    if (!this.canSave()) return;
    this.dialogRef.close({
      title: this.title(),
      notes: this.notes(),
      estimate: parseNumberField(this.estimateText(), TASK_ESTIMATE_MAX)
    });
  }
}
