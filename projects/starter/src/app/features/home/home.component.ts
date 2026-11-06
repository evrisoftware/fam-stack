import {ChangeDetectionStrategy, Component, computed, inject} from '@angular/core';
import {RouterLink} from '@angular/router';
import {MatButtonModule} from '@angular/material/button';
import {MatIconModule} from '@angular/material/icon';
import {clockSignal} from 'fam-stack/core';
import {AuthService} from 'fam-stack/auth';
import {LoadStatusComponent} from 'fam-stack/a11y';
import {EmailNamePipe} from 'fam-stack/ui';
import {SCREENS} from '@app/screens';
import {TasksService} from '@app/features/tasks/tasks.service';
import {AGE_REFRESH_MS, ageLabel, durationLabel, taskTitle} from '@app/features/tasks/task-labels';

/**
 * A summary of the live list. Nothing here is fetched or stored: every figure is a
 * `computed()` over `TasksService`, so it can never disagree with the Tasks screen.
 */
@Component({
  selector: 'app-home',
  imports: [MatButtonModule, MatIconModule, RouterLink, LoadStatusComponent, EmailNamePipe],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HomeComponent {
  protected readonly tasks = inject(TasksService);
  protected readonly auth = inject(AuthService);
  protected readonly tasksUrl = SCREENS.url('tasks');
  private readonly now = clockSignal(AGE_REFRESH_MS);

  protected readonly workLeft = computed(() => {
    const minutes = this.tasks.openTasks().reduce((sum, task) => sum + (task.estimate ?? 0), 0);
    return minutes > 0 ? durationLabel(minutes) : '—';
  });

  /* The list is newest first, so the oldest open task is the last one. */
  protected readonly oldest = computed(() => {
    const task = this.tasks.openTasks().at(-1);
    return task ? {title: taskTitle(task), age: ageLabel(task.createdAt, this.now())} : null;
  });
}
