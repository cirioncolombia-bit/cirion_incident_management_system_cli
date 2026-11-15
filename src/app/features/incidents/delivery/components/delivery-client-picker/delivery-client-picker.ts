import { Component, DestroyRef, ElementRef, computed, inject, output, signal, viewChild } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, ValidatorFn, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, catchError, map, of, switchMap } from 'rxjs';
import { DeliveryService } from '../../services/delivery.service';
import { DeliveryClient } from '../../models/delivery-client-lookup';

const clientSearch: ValidatorFn = control => {
  const value = String(control.value ?? '').trim();
  if (!value || (!/^\d+$/.test(value) && value.length < 3)) return { clientSearch: true };
  if (/^\d+$/.test(value) && (Number(value) < 1 || Number(value) > 2147483647)) return { clientSearch: true };
  return null;
};

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
  readonly searchForm = inject(FormBuilder).nonNullable.group({ search: ['', [Validators.maxLength(200), clientSearch]] });
  readonly rows = signal<DeliveryClient[]>([]);
  readonly pending = signal<DeliveryClient | null>(null);
  readonly loading = signal(false);
  readonly error = signal('');
  readonly page = signal(1);
  readonly hasNextPage = signal(false);
  readonly searched = signal(false);
  readonly firstResult = computed(() => (this.page() - 1) * 10 + 1);
  readonly opened = signal(false);
  private appliedSearch = '';

  constructor() {
    this.requests.pipe(
      switchMap(query => query === null ? of(null) : this.api.lookupClients(query.page, query.search).pipe(
        map(data => ({ data, error: '' })),
        catchError((error: unknown) => of({ data: null, error: this.lookupError(error) })),
      )),
      takeUntilDestroyed(inject(DestroyRef)),
    ).subscribe(result => {
      this.loading.set(false);
      if (result === null) return;
      if (result.error || !result.data) {
        this.page.set(1);
        this.hasNextPage.set(false);
        this.error.set(result.error || 'Clients could not be loaded. Please try searching again.');
        return;
      }
      this.rows.set(result.data.rows);
      this.page.set(result.data.page);
      this.hasNextPage.set(result.data.hasNextPage);
    });
  }

  private lookupError(error: unknown): string {
    if (!(error instanceof HttpErrorResponse)) return 'Clients could not be loaded. Please try searching again.';
    switch (error.status) {
      case 0: return 'Cannot connect to the client search service. Check that the backend is running and reachable.';
      case 401: return 'Your session has expired. Sign in again to search clients.';
      case 403: return 'You do not have permission to search clients.';
      case 404: return 'Client search is unavailable (HTTP 404). Check that the backend includes the client-lookup endpoint.';
      default: return `Clients could not be loaded (HTTP ${error.status}). Please retry or report this error to support.`;
    }
  }

  open(): void {
    if (this.opened()) return;
    this.opened.set(true);
    this.searchForm.reset();
    this.rows.set([]);
    this.pending.set(null);
    this.error.set('');
    this.page.set(1);
    this.hasNextPage.set(false);
    this.searched.set(false);
    this.appliedSearch = '';
    this.panel().nativeElement.showModal();
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
    if (this.loading() || !this.searched() || this.error() || page < 1
      || (page !== this.page() - 1 && !(page === this.page() + 1 && this.hasNextPage()))) return;
    this.load(page);
  }

  private load(page: number): void {
    this.pending.set(null);
    this.rows.set([]);
    this.error.set('');
    this.page.set(page);
    this.hasNextPage.set(false);
    this.searched.set(true);
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
