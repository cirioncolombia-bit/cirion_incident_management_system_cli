import { Component, DestroyRef, ElementRef, inject, output, signal, viewChild } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, catchError, map, of, switchMap } from 'rxjs';
import { DeliveryService } from '../../services/delivery.service';
import { DeliveryClient } from '../../models/delivery-client-lookup';

@Component({
  selector: 'app-delivery-client-picker',
  imports: [ReactiveFormsModule],
  templateUrl: './delivery-client-picker.html',
  styleUrl: './delivery-client-picker.scss',
})
export class DeliveryClientPicker {
  private readonly api = inject(DeliveryService);
  private readonly panel = viewChild.required<ElementRef<HTMLDialogElement>>('panel');
  private readonly requests = new Subject<{ page: number; search: string } | null>();
  readonly selected = output<DeliveryClient>();
  readonly searchForm = inject(FormBuilder).nonNullable.group({ search: ['', Validators.maxLength(200)] });
  readonly rows = signal<DeliveryClient[]>([]);
  readonly pending = signal<DeliveryClient | null>(null);
  readonly loading = signal(false);
  readonly error = signal('');
  readonly page = signal(1);
  readonly pages = signal(0);
  readonly total = signal(0);
  readonly opened = signal(false);
  private appliedSearch = '';

  constructor() {
    this.requests.pipe(
      switchMap(query => query === null ? of(null) : this.api.lookupClients(query.page, query.search).pipe(
        map(data => ({ data, error: false })),
        catchError(() => of({ data: null, error: true })),
      )),
      takeUntilDestroyed(inject(DestroyRef)),
    ).subscribe(result => {
      this.loading.set(false);
      if (result === null) return;
      if (result.error || !result.data) {
        this.page.set(1);
        this.pages.set(0);
        this.total.set(0);
        this.error.set('Clients could not be loaded. Please try searching again.');
        return;
      }
      this.rows.set(result.data.rows);
      this.page.set(result.data.page);
      this.pages.set(result.data.totalPages);
      this.total.set(result.data.totalCount);
    });
  }

  open(): void {
    if (this.opened()) return;
    this.opened.set(true);
    this.searchForm.reset();
    this.panel().nativeElement.showModal();
    this.searchClients();
  }

  close(): void {
    this.opened.set(false);
    this.requests.next(null);
    this.pending.set(null);
    this.panel().nativeElement.close();
  }

  searchClients(): void {
    this.searchForm.markAllAsTouched();
    if (!this.opened() || this.searchForm.invalid) return;
    this.appliedSearch = this.searchForm.controls.search.value.trim();
    this.load(1);
  }

  paginate(page: number): void {
    if (this.loading() || page < 1 || page > this.pages()) return;
    this.load(page);
  }

  private load(page: number): void {
    this.pending.set(null);
    this.rows.set([]);
    this.error.set('');
    this.page.set(page);
    this.pages.set(0);
    this.total.set(0);
    this.loading.set(true);
    this.requests.next({ page, search: this.appliedSearch });
  }

  confirm(): void {
    if (this.loading() || this.error()) return;
    const client = this.rows().find(row => row.id === this.pending()?.id);
    if (!client) return;
    this.selected.emit(client);
    this.close();
  }
}
