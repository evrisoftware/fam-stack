import {inject, Injectable, signal} from '@angular/core';
import {MatSnackBar, MatSnackBarRef} from '@angular/material/snack-bar';
import {Notice, NOTICE_PANEL_CLASS, NoticeComponent, NoticeData} from './notice.component';

/* How long one sentence stays up, and its colour class (`notice.component.scss`). */
interface Voice {
  readonly duration: number;
  readonly voiceClass: string;
}

interface Queued extends Notice {
  readonly spoken: Voice;
  readonly sentences: readonly string[];
  /* Raised by `arrival()`. */
  readonly arrival: boolean;
}

/* What the current task raised: sentences per voice, and the newest arrival. */
interface Raised {
  said: {spoken: Voice; sentences: string[]}[];
  arrival: string | null;
}

/**
 * Transient feedback by intent: `success`, `deleted`, `error`, `warn`, `arrival`.
 *
 * Messages are shown one at a time in a single snackbar (`NoticeComponent`):
 * - Sentences of one voice raised in one task join into one message (up to three).
 * - A repeated warning is not queued again; a repeated confirmation is.
 * - An arrival waits behind every reply, only the newest is kept, and one on screen
 *   gives way to the next reply.
 */
@Injectable({providedIn: 'root'})
export class NotificationService {
  private static readonly SUCCESS: Voice = {duration: 3000, voiceClass: 'fam-voice-success'};
  private static readonly DANGER: Voice = {duration: 3000, voiceClass: 'fam-voice-danger'};
  private static readonly WARNING: Voice = {duration: 5000, voiceClass: 'fam-voice-warning'};
  private static readonly MAX_JOINED = 3;
  private readonly snackBar = inject(MatSnackBar);
  private raised: Raised | null = null;
  private readonly current = signal<Queued | null>(null);
  private readonly waiting = signal<readonly Queued[]>([]);
  private readonly data: NoticeData = {current: this.current.asReadonly(), waiting: this.waiting.asReadonly()};
  private snack: MatSnackBarRef<NoticeComponent> | null = null;
  private leaving = false;
  private turn: ReturnType<typeof setTimeout> | undefined;
  private lastId = 0;

  /** A completed action ("Saved."). */
  success(message: string): void {
    this.show(message, NotificationService.SUCCESS);
  }

  /** A completed destructive action ("Deleted."). */
  deleted(message: string): void {
    this.show(message, NotificationService.DANGER);
  }

  /** A failed action the user should retry. */
  error(message: string): void {
    this.show(message, NotificationService.WARNING);
  }

  /** A validation guard ("The title is required."). */
  warn(message: string): void {
    this.show(message, NotificationService.WARNING);
  }

  /** Something that happened on another device or remotely. */
  arrival(message: string): void {
    this.raise().arrival = message;
  }

  private show(message: string, spoken: Voice): void {
    const said = this.raise().said;
    const batch = said.find(entry => entry.spoken === spoken);
    if (batch === undefined) said.push({spoken, sentences: [message]});
    else if (!batch.sentences.includes(message)) batch.sentences.push(message);
  }

  /* The current task's record; queued in a microtask once the task ends. */
  private raise(): Raised {
    if (this.raised === null) {
      this.raised = {said: [], arrival: null};
      queueMicrotask(() => this.enqueue());
    }
    return this.raised;
  }

  private enqueue(): void {
    const raised = this.raised;
    this.raised = null;
    if (raised === null) return;
    let replies = this.waiting().filter(entry => !entry.arrival);
    let arrival = this.waiting().find(entry => entry.arrival);
    for (const {spoken, sentences} of raised.said) {
      const fresh = spoken === NotificationService.WARNING
        ? sentences.filter(sentence =>
          !replies.some(entry => entry.spoken === spoken && entry.sentences.includes(sentence)))
        : sentences;
      if (fresh.length === 0) continue;
      const last = replies.at(-1);
      const joins = last !== undefined && last.spoken === spoken
        && last.sentences.length + fresh.length <= NotificationService.MAX_JOINED
        && !fresh.some(sentence => last.sentences.includes(sentence));
      replies = joins
        ? [...replies.slice(0, -1), this.queued(spoken, [...last.sentences, ...fresh], false, last.id)]
        : [...replies, this.queued(spoken, fresh)];
    }
    /* A newer arrival replaces the waiting one, keeping its id. */
    if (raised.arrival !== null) {
      arrival = this.queued(NotificationService.WARNING, [raised.arrival], true, arrival?.id);
    }
    this.waiting.set(arrival === undefined ? replies : [...replies, arrival]);
    if (raised.said.length > 0 && this.current()?.arrival && !this.leaving) this.advance();
    this.open();
  }

  private open(): void {
    if (this.snack !== null) return;
    const [first, ...rest] = this.waiting();
    if (first === undefined) return;
    this.waiting.set(rest);
    this.current.set(first);
    const snack = this.snackBar.openFromComponent(NoticeComponent, {data: this.data, panelClass: NOTICE_PANEL_CLASS});
    this.snack = snack;
    this.leaving = false;
    snack.afterDismissed().subscribe(() => {
      this.snack = null;
      this.leaving = false;
      this.current.set(null);
      /* The next snackbar opens in a microtask, never inside this callback. */
      queueMicrotask(() => this.open());
    });
    this.giveTurn(first);
  }

  private advance(): void {
    clearTimeout(this.turn);
    const [next, ...rest] = this.waiting();
    if (next === undefined) {
      this.leaving = true;
      this.snack?.dismiss();
      return;
    }
    this.waiting.set(rest);
    this.current.set(next);
    this.giveTurn(next);
  }

  private giveTurn(notice: Queued): void {
    clearTimeout(this.turn);
    this.turn = setTimeout(() => this.advance(),
      notice.spoken.duration * Math.min(notice.sentences.length, NotificationService.MAX_JOINED));
  }

  private queued(spoken: Voice, sentences: readonly string[], arrival = false, id = ++this.lastId): Queued {
    return {id, spoken, sentences, arrival, voice: spoken.voiceClass, message: sentences.join(' ')};
  }
}
