import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  Injector,
  Signal,
  signal,
  untracked,
  viewChild
} from '@angular/core';
import {MAT_SNACK_BAR_DATA, MatSnackBarLabel} from '@angular/material/snack-bar';

/** A queued message: its id (kept while sentences join it), words and voice class. */
export interface Notice {
  readonly id: number;
  readonly message: string;
  readonly voice: string;
}

export interface NoticeData {
  /** The message on screen. */
  readonly current: Signal<Notice | null>;
  /** Messages waiting, oldest first. */
  readonly waiting: Signal<readonly Notice[]>;
}

/** The panel class `NotificationService` opens the snackbar with. */
export const NOTICE_PANEL_CLASS = 'fam-notice-snack-bar';

/**
 * The snackbar content: the current message in a pill, and up to two waiting messages
 * as blurred edges beneath it. A new message rolls the old one out and eases the pill's
 * height. Everything except the pill's words is `aria-hidden`.
 */
@Component({
  selector: 'fam-notice',
  imports: [MatSnackBarLabel],
  template: `
    <div class="notice">
      @for (notice of rising(); track notice.id) {
        <div (animationend)="rising.set([])" [class]="notice.voice" aria-hidden="true"
             class="notice-peek notice-peek--rising"></div>
      }
      <div #pill [class]="current()?.voice ?? ''" class="notice-pill">
        <div class="notice-pill__words" matSnackBarLabel>
          @for (notice of shown(); track notice.id) {
            <span [class.notice-pill__text--arriving]="advanced()" class="notice-pill__text">{{ notice.message }}</span>
          }
          @for (notice of departing(); track notice.id) {
            <div (animationend)="departing.set([])" [class]="notice.voice" aria-hidden="true"
                 class="notice-pill__face">{{ notice.message }}</div>
          }
        </div>
      </div>
      @for (notice of peeks(); track notice.id; let later = $odd) {
        <div [class]="notice.voice" [class.notice-peek--later]="later" aria-hidden="true" class="notice-peek">
          <span class="notice-peek__text">{{ notice.message }}</span>
        </div>
      }
    </div>
  `,
  styleUrl: './notice.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class NoticeComponent {
  private readonly data = inject<NoticeData>(MAT_SNACK_BAR_DATA);
  private readonly injector = inject(Injector);
  private readonly pill = viewChild.required<ElementRef<HTMLElement>>('pill');

  protected readonly current = this.data.current;
  /* Lists of one tracked by id, so new words are a new element. */
  protected readonly shown = computed<readonly Notice[]>(() => {
    const now = this.current();
    return now === null ? [] : [now];
  });
  protected readonly peeks = computed<readonly Notice[]>(() => this.data.waiting().slice(0, 2));
  protected readonly departing = signal<readonly Notice[]>([]);
  protected readonly rising = signal<readonly Notice[]>([]);
  /* False for the first message, whose words do not animate in. */
  protected readonly advanced = signal<boolean>(false);

  private shownBefore: Notice | null = null;
  private pillHeight = 0;
  private resize: Animation | null = null;

  constructor() {
    effect(() => {
      const now = this.current();
      untracked(() => this.follow(now));
    });
  }

  private follow(now: Notice | null): void {
    const before = this.shownBefore;
    this.shownBefore = now;
    if (before !== null && now !== null && before.id !== now.id) {
      this.advanced.set(true);
      this.departing.set([before]);
      this.rising.set([now]);
    }
    afterNextRender(() => this.fitPill(), {injector: this.injector});
  }

  /* Animates the pill's height to its new content using the design tokens; skipped under reduced motion. */
  private fitPill(): void {
    const pill = this.pill().nativeElement;
    const from = this.resize?.playState === 'running' ? pill.offsetHeight : this.pillHeight;
    this.resize?.cancel();
    this.resize = null;
    const to = pill.offsetHeight;
    this.pillHeight = to;
    const view = pill.ownerDocument.defaultView;
    if (from === 0 || from === to || view === null || view.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }
    const tokens = view.getComputedStyle(pill);
    this.resize = pill.animate([{height: `${from}px`}, {height: `${to}px`}], {
      duration: parseFloat(tokens.getPropertyValue('--fam-dur-med')) || 0,
      easing: tokens.getPropertyValue('--fam-ease-out').trim() || 'ease-out'
    });
  }
}
