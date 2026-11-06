import {ChangeDetectionStrategy, Component, computed, inject, input, resource} from '@angular/core';
import {StoredFile} from './stored-file';
import {FilesService} from './files.service';
import {fileFailure} from './file-errors';

/** A file's image by download URL, requested once per file; says why when it cannot load. */
@Component({
  selector: 'app-file-preview',
  template: `
    @if (preview.hasValue()) {
      <img [alt]="alt()" [src]="preview.value()" class="file-preview" loading="lazy">
    } @else if (failure(); as sentence) {
      <p class="file-preview__failure">{{ sentence }}</p>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FilePreviewComponent {
  private readonly files = inject(FilesService);
  readonly file = input.required<StoredFile>();
  readonly alt = input('');
  /* Keyed by id: a new snapshot of the same file keeps the loaded URL. */
  protected readonly preview = resource({
    params: () => this.file().id,
    loader: ({params}) => this.files.url(params)
  });
  protected readonly failure = computed(() => {
    const error = this.preview.error();
    return error ? fileFailure(error) : null;
  });
}
