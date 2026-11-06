import {inject, Injectable} from '@angular/core';
import {MatDialog} from '@angular/material/dialog';

/**
 * A dialog that handles the back gesture itself. `onBackGesture` returns true when it
 * stayed open, false to be closed. `onForwardGesture` re-enters a page left by back.
 */
export interface BackGestureHandler {
  onBackGesture(): boolean;
  onForwardGesture?(): boolean;
}

const handlesBack = (instance: unknown): instance is BackGestureHandler =>
  typeof (instance as Partial<BackGestureHandler> | null)?.onBackGesture === 'function';

/* An open dialog or menu: one history marker, plus one per page entered inside it. */
interface Layer {
  close(): void;
  instance?: unknown;
  steps: number;
}

const markerDepth = (): number => {
  const state = history.state as {famLayer?: unknown; depth?: unknown} | null;
  return state?.famLayer && typeof state.depth === 'number' ? state.depth : 0;
};

/**
 * The back gesture closes the topmost dialog or menu instead of leaving the page.
 *
 * Each open dialog or tracked menu pushes a same-URL history marker. A popstate while
 * layers are open closes the newest one; a layer closed another way consumes its
 * marker with `history.go(-n)`.
 *
 * Requires `closeOnNavigation: false` (set by `provideFamStack`), URL changes only
 * through the router, and menus joined through `MenuBackGestureDirective`.
 * Instantiated eagerly by `provideFamStack`.
 */
@Injectable({providedIn: 'root'})
export class DialogHistoryService {
  private readonly layers: Layer[] = [];
  /* A consuming traversal is in flight. */
  private consuming = false;
  /* Markers of closed layers not consumed yet. */
  private unclaimedMarkers = 0;
  /* Layers opened during a consume, whose markers are pushed once it lands. */
  private owedMarkers = 0;
  /* Depth of the current marker; a popstate landing above it went forward. */
  private depth = markerDepth();

  constructor() {
    inject(MatDialog).afterOpened.subscribe(ref => {
      const layer: Layer = {close: () => ref.close(), instance: ref.componentInstance, steps: 0};
      this.push(layer);
      ref.beforeClosed().subscribe(() => this.release(layer));
    });
    window.addEventListener('popstate', () => this.onPopState());
    this.consumeStaleMarker();
  }

  /** Adds a menu to the stack. Call the returned function when the menu closes in any way. */
  trackMenu(close: () => void): () => void {
    const layer: Layer = {close, steps: 0};
    this.push(layer);
    return () => this.release(layer);
  }

  /** Gives a page inside an open dialog its own marker. Ignored for a component that is no open dialog's. */
  enterStep(instance: object): void {
    const layer = this.layerOf(instance);
    if (!layer) return;
    layer.steps++;
    this.claimMarker();
  }

  /** Releases the marker of the dialog's current page, for its own back arrow. */
  leaveStep(instance: object): void {
    const layer = this.layerOf(instance);
    if (!layer || layer.steps === 0) return;
    layer.steps--;
    this.freeMarkers(1);
  }

  private layerOf(instance: object): Layer | undefined {
    return this.layers.find(layer => layer.instance === instance);
  }

  private push(layer: Layer): void {
    this.claimMarker();
    this.layers.push(layer);
  }

  /* Reuses an unclaimed marker, waits for an in-flight consume, or pushes a new one. */
  private claimMarker(): void {
    if (this.unclaimedMarkers > 0) {
      this.unclaimedMarkers--;
    } else if (this.consuming) {
      this.owedMarkers++;
    } else {
      this.pushMarker();
    }
  }

  private pushMarker(): void {
    this.depth++;
    history.pushState({famLayer: true, depth: this.depth}, '');
  }

  private release(layer: Layer): void {
    const index = this.layers.indexOf(layer);
    if (index === -1) return;
    this.layers.splice(index, 1);
    this.freeMarkers(1 + layer.steps);
  }

  /* Freed markers are consumed two microtasks later unless a new layer claims them first. */
  private freeMarkers(count: number): void {
    const settled = Math.min(count, this.owedMarkers);
    this.owedMarkers -= settled;
    if (settled === count) return;
    this.unclaimedMarkers += count - settled;
    queueMicrotask(() => queueMicrotask(() => this.consumeUnclaimed()));
  }

  /* All unclaimed markers in one `history.go(-n)`, never while another consume is in flight. */
  private consumeUnclaimed(): void {
    if (this.unclaimedMarkers === 0 || this.consuming) return;
    const markers = this.unclaimedMarkers;
    this.unclaimedMarkers = 0;
    this.consume(markers);
  }

  private consume(markers: number): void {
    this.consuming = true;
    history.go(-markers);
  }

  private onPopState(): void {
    const from = this.depth;
    this.depth = markerDepth();
    if (this.consuming) {
      this.consuming = false;
      for (; this.owedMarkers > 0; this.owedMarkers--) {
        this.pushMarker();
      }
      this.consumeUnclaimed();
    } else if (this.depth > from && this.layers.length > 0) {
      this.onForward(this.depth - from);
      return;
    } else {
      const newest = this.layers[this.layers.length - 1];
      const instance = newest?.instance;
      if (newest && handlesBack(instance) && instance.onBackGesture()) {
        if (newest.steps > 0) newest.steps--;
        else this.pushMarker();
        return;
      }
      const closing = this.layers.pop();
      if (closing) this.freeMarkers(closing.steps);
      closing?.close();
    }
    this.consumeStaleMarker();
  }

  /* One entry forward goes to the newest dialog's `onForwardGesture`; anything else is walked back. */
  private onForward(entries: number): void {
    const newest = this.layers[this.layers.length - 1];
    const instance = newest.instance;
    if (entries === 1 && handlesBack(instance) && instance.onForwardGesture?.()) {
      newest.steps++;
      return;
    }
    this.consume(entries);
  }

  /* Steps off a marker no layer owns. */
  private consumeStaleMarker(): void {
    if (this.layers.length === 0 && !this.consuming && this.unclaimedMarkers === 0
      && history.state?.famLayer) {
      this.consume(1);
    }
  }
}
