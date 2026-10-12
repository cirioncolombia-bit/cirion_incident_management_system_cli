import { Component, ElementRef, afterRenderEffect, inject, viewChild } from '@angular/core';
import { LoadingService } from './loading.service';

@Component({
  selector: 'app-loading-progress',
  templateUrl: './loading-progress.html',
  styleUrl: './loading-progress.scss',
})
export class LoadingProgress {
  private readonly loading = inject(LoadingService);
  private readonly panel = viewChild.required<ElementRef<HTMLDialogElement>>('panel');

  constructor() {
    afterRenderEffect(() => {
      const element = this.panel().nativeElement;
      if (this.loading.visible() && !element.open) element.showModal();
      else if (!this.loading.visible() && element.open) element.close();
    });
  }
}
