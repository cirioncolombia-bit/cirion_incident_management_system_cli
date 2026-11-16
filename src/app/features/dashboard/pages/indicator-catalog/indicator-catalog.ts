import { Component, DestroyRef, computed, inject, signal, viewChild } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subject, catchError, map, of, switchMap } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthService } from '../../../auth/services/auth.service';
import {
  Indicator,
  MeasurementType,
  Page,
  measurementTypes,
  requestError,
  typeLabel,
} from '../../models/indicators';
import { IndicatorsService } from '../../services/indicators.service';
import { IndicatorsNav } from '../../components/indicators-nav';
import { DeleteConfirm } from '../../components/delete-confirm';
@Component({
  selector: 'app-indicator-catalog',
  imports: [ReactiveFormsModule, IndicatorsNav, DeleteConfirm],
  templateUrl: './indicator-catalog.html',
  styleUrl: '../../indicators-shared.scss',
})
export class IndicatorCatalog {
  private readonly api = inject(IndicatorsService);
  private readonly auth = inject(AuthService);
  private readonly destroy = inject(DestroyRef);
  readonly canManage = computed(() => {
    const user = this.auth.currentUser();
    return (
      !!user &&
      !user.isExternal &&
      user.permissions.includes('catalogs.manage') &&
      user.permissions.includes('dashboard.read')
    );
  });
  readonly types = measurementTypes;
  readonly typeLabel = typeLabel;
  readonly form = inject(FormBuilder).nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(200), Validators.pattern(/\S/)]],
    measurementType: [3 as MeasurementType, Validators.required],
  });
  readonly filters = inject(FormBuilder).nonNullable.group({
    search: ['', Validators.maxLength(200)],
    includeInactive: [true],
  });
  readonly result = signal<Page<Indicator> | null>(null);
  readonly editing = signal<Indicator | null>(null);
  readonly error = signal('');
  readonly saveError = signal('');
  readonly success = signal('');
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly deleteTarget = signal<Indicator | null>(null);
  private readonly confirm = viewChild.required(DeleteConfirm);
  private readonly requests = new Subject<{
    page: number;
    search: string;
    includeInactive: boolean;
  }>();
  private applied = { search: '', includeInactive: true };
  constructor() {
    this.requests
      .pipe(
        switchMap((query) =>
          this.api.list(query).pipe(
            map((data) => ({ data, error: '' })),
            catchError((error) => of({ data: null, error: requestError(error) })),
          ),
        ),
        takeUntilDestroyed(this.destroy),
      )
      .subscribe(({ data, error }) => {
        this.result.set(data);
        this.error.set(error);
        this.loading.set(false);
      });
    this.load(1);
  }
  load(page = 1) {
    this.loading.set(true);
    this.error.set('');
    this.requests.next({ ...this.applied, page });
  }
  search() {
    if (this.filters.invalid) return;
    this.applied = this.filters.getRawValue();
    this.load(1);
  }
  edit(row: Indicator) {
    if (!this.canManage() || !row.isActive || this.saving()) return;
    this.editing.set(row);
    this.form.patchValue({ name: row.name, measurementType: row.measurementType });
    row.hasRecords
      ? this.form.controls.measurementType.disable()
      : this.form.controls.measurementType.enable();
    this.saveError.set('');
    this.success.set('');
  }
  reset() {
    this.editing.set(null);
    this.form.controls.measurementType.enable();
    this.form.reset({ name: '', measurementType: 3 });
    this.saveError.set('');
  }
  save() {
    this.form.markAllAsTouched();
    if (!this.canManage() || this.saving() || this.form.invalid) return;
    this.saving.set(true);
    this.saveError.set('');
    this.success.set('');
    const row = this.editing();
    this.api
      .saveIndicator(row?.id ?? null, { ...this.form.getRawValue(), rowVersion: row?.rowVersion })
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.reset();
          this.success.set('Indicador guardado.');
          this.load();
        },
        error: (error) => {
          this.saving.set(false);
          this.saveError.set(requestError(error));
        },
      });
  }
  askDelete(row: Indicator) {
    if (!this.canManage() || this.saving()) return;
    this.deleteTarget.set(row);
    this.confirm().open();
  }
  remove() {
    const row = this.deleteTarget();
    if (!row || !this.canManage() || this.saving()) return;
    this.saving.set(true);
    this.saveError.set('');
    this.success.set('');
    this.api
      .deleteIndicator(row)
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: () => {
          this.saving.set(false);
          if (this.editing()?.id === row.id) this.reset();
          this.success.set('Indicador desactivado. Sus registros permanecen en los gráficos.');
          this.load();
        },
        error: (error) => {
          this.saving.set(false);
          this.saveError.set(requestError(error));
        },
      });
  }
}
