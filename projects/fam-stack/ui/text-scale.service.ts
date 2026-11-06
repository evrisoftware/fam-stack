import {computed, DOCUMENT, inject, Injectable, InjectionToken, signal} from '@angular/core';
import {FAM_TEXT, readLocal, writeLocal} from 'fam-stack/core';

/** The three factors, smallest first. The middle one is the app as designed. */
export const TEXT_SCALE_FACTORS = [.9, 1, 1.15] as const;

/** Where the chosen step is remembered on this device. */
export const TEXT_SCALE_STORAGE_KEY = new InjectionToken<string>('TEXT_SCALE_STORAGE_KEY', {
  providedIn: 'root',
  factory: () => 'fam.text-scale'
});

const DEFAULT_STEP = 1;

/**
 * Three text sizes, starting at the middle one. Sets `--fam-text-scale` on `<html>`,
 * which scales the root font size, and stores the step in `localStorage`. Started at
 * bootstrap by `provideFamStack`.
 */
@Injectable({providedIn: 'root'})
export class TextScaleService {
  private readonly document = inject(DOCUMENT);
  private readonly storageKey = inject(TEXT_SCALE_STORAGE_KEY);
  private readonly text = inject(FAM_TEXT);
  private readonly step = signal<number>(this.restore());
  /** The current step's name, from `FAM_TEXT`. */
  readonly label = computed<string>(() => this.text.textScale.steps[this.step()]);
  readonly canGrow = computed<boolean>(() => this.step() < TEXT_SCALE_FACTORS.length - 1);
  readonly canShrink = computed<boolean>(() => this.step() > 0);

  constructor() {
    this.apply();
  }

  grow(): void {
    this.move(1);
  }

  shrink(): void {
    this.move(-1);
  }

  private move(delta: number): void {
    const next = Math.min(Math.max(this.step() + delta, 0), TEXT_SCALE_FACTORS.length - 1);
    if (next === this.step()) return;
    this.step.set(next);
    this.apply();
    writeLocal(this.storageKey, `${next}`);
  }

  private apply(): void {
    this.document.documentElement.style.setProperty('--fam-text-scale', `${TEXT_SCALE_FACTORS[this.step()]}`);
  }

  /* The stored step if valid, else the default; absent or empty storage is not step 0. */
  private restore(): number {
    const raw = readLocal(this.storageKey);
    const stored = raw ? Number(raw) : NaN;
    return Number.isInteger(stored) && stored >= 0 && stored < TEXT_SCALE_FACTORS.length ? stored : DEFAULT_STEP;
  }
}
