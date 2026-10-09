import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { catchError, of, switchMap } from 'rxjs';
import { DeliveryEditData, DeliveryInstallationCostEdit } from '../../models/delivery-edit';
import { DeliveryService } from '../../services/delivery.service';

@Component({
  selector: 'app-delivery-detail',
  imports: [RouterLink],
  templateUrl: './delivery-detail.html',
  styleUrl: './delivery-detail.scss',
})
export class DeliveryDetail {
  private readonly route = inject(ActivatedRoute);
  private readonly service = inject(DeliveryService);
  private readonly destroyRef = inject(DestroyRef);

  readonly delivery = signal<DeliveryEditData | null>(null);
  readonly loading = signal(true);
  readonly loadError = signal('');

  constructor() {
    this.route.paramMap
      .pipe(
        switchMap((params) => {
          this.delivery.set(null);
          this.loading.set(true);
          this.loadError.set('');
          const rawId = params.get('id') ?? '';
          const id = Number(rawId);
          if (!/^\d+$/.test(rawId) || !Number.isInteger(id) || id <= 0 || id > 2147483647) {
            this.loadError.set('The delivery identifier is invalid.');
            return of(null);
          }
          // The existing aggregate read includes all parent fields, active children and labels.
          return this.service.getEdit(id).pipe(
            catchError((error: HttpErrorResponse) => {
              this.loadError.set(
                error.status === 404
                  ? 'The delivery does not exist or is no longer active.'
                  : error.status === 401
                    ? 'Your session has expired. Sign in again.'
                    : 'The delivery information could not be loaded.',
              );
              return of(null);
            }),
          );
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((delivery) => {
        this.delivery.set(delivery);
        this.loading.set(false);
      });
  }

  formatCurrency(value: number | null): string {
    if (value === null || !Number.isFinite(value)) return '—';
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 2,
    }).format(value);
  }

  totalInstallationCost(costs: readonly DeliveryInstallationCostEdit[]): string {
    return this.formatCurrency(costs.reduce((total, item) => total + item.cost, 0));
  }

  displayValue(value: string | null): string {
    return value?.trim() || '—';
  }
}
