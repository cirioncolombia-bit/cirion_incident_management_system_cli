import { DestroyRef, Injectable, inject, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class LoadingService {
  private pending = 0;
  private timer?: ReturnType<typeof setTimeout>;
  private readonly showing = signal(false);
  readonly visible = this.showing.asReadonly();

  constructor() {
    inject(DestroyRef).onDestroy(() => clearTimeout(this.timer));
  }

  begin(): () => void {
    this.pending++;
    if (this.pending === 1) {
      // Fast responses finish before the overlay appears, avoiding flicker.
      this.timer = setTimeout(() => this.showing.set(true), 150);
    }
    let finished = false;
    return () => {
      if (finished) return;
      finished = true;
      this.pending--;
      if (this.pending === 0) {
        clearTimeout(this.timer);
        this.showing.set(false);
      }
    };
  }
}
