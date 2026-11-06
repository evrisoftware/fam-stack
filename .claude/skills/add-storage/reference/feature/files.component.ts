import {ChangeDetectionStrategy, Component, computed, DestroyRef, inject, signal} from '@angular/core';
import {MatDialog} from '@angular/material/dialog';
import {MatButtonModule} from '@angular/material/button';
import {MatIconModule} from '@angular/material/icon';
import {MatProgressBarModule} from '@angular/material/progress-bar';
import {Subscription} from 'rxjs';
import {LoadStatusComponent} from 'fam-stack/a11y';
import {askConfirmation, NotificationService} from 'fam-stack/ui';
import {refuseFile, StoredFile} from './stored-file';
import {FilesService} from './files.service';
import {FilePreviewComponent} from './file-preview.component';
import {fileFailure, uploadFailure} from './file-errors';

const MATERIAL_MODULES = [MatButtonModule, MatIconModule, MatProgressBarModule];

/* One row as the template renders it. */
interface FileRow {
  readonly file: StoredFile;
  readonly name: string;
  readonly size: string;
}

@Component({
  selector: 'app-files',
  imports: [MATERIAL_MODULES, LoadStatusComponent, FilePreviewComponent],
  templateUrl: './files.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FilesComponent {
  protected readonly files = inject(FilesService);
  private readonly dialog = inject(MatDialog);
  private readonly notification = inject(NotificationService);
  private upload: Subscription | null = null;
  /* Fraction sent while an upload runs, `null` otherwise. */
  private readonly sent = signal<number | null>(null);
  protected readonly uploading = computed(() => this.sent() !== null);
  protected readonly percent = computed(() => Math.round((this.sent() ?? 0) * 100));
  /* Cancel is offered until every byte is sent; the record write that follows runs to its end. */
  protected readonly cancellable = computed(() => (this.sent() ?? 1) < 1);
  protected readonly rows = computed<readonly FileRow[]>(() => this.files.files().map(file => ({
    file,
    name: file.name,
    size: `${Math.max(1, Math.round(file.size / 1024))} KB`
  })));

  constructor() {
    inject(DestroyRef).onDestroy(() => this.upload?.unsubscribe());
  }

  protected pick(input: HTMLInputElement): void {
    const file = input.files?.[0];
    input.value = '';
    if (!file || this.upload) return;
    const refused = refuseFile(file);
    if (refused) {
      this.notification.error(refused);
      return;
    }
    this.sent.set(0);
    this.upload = this.files.upload(file).subscribe({
      next: ({fraction, done}) => {
        this.sent.set(fraction);
        if (done) this.notification.success('File added.');
      },
      error: error => {
        const sentence = uploadFailure(error);
        if (sentence) this.notification.error(sentence);
        this.finish();
      },
      complete: () => this.finish()
    });
  }

  protected cancel(): void {
    this.upload?.unsubscribe();
    this.finish();
  }

  protected async remove(file: StoredFile): Promise<void> {
    const confirmed = await askConfirmation(this.dialog, {
      title: 'Delete file',
      description: ['Delete ', {bold: file.name}, ' for everyone?']
    });
    if (!confirmed) return;
    try {
      await this.files.remove(file);
      this.notification.deleted('File deleted.');
    } catch (error) {
      this.notification.error(fileFailure(error));
    }
  }

  private finish(): void {
    this.upload = null;
    this.sent.set(null);
  }
}
