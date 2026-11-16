import { Component, DestroyRef, computed, inject, signal, viewChild } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subject, catchError, map, of, switchMap } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthService } from '../../../auth/services/auth.service';
import {
  Indicator,
  MonthlyRecord,
  Page,
  currentMonth,
  currentYear,
  formatValue,
  months,
  requestError,
  typeLabel,
  validValue,
} from '../../models/indicators';
import { IndicatorsService } from '../../services/indicators.service';
import { IndicatorsNav } from '../../components/indicators-nav';
import { IndicatorPicker } from '../../components/indicator-picker';
import { DeleteConfirm } from '../../components/delete-confirm';
@Component({
  selector: 'app-monthly-records',
  imports: [ReactiveFormsModule, IndicatorsNav, IndicatorPicker, DeleteConfirm],
  templateUrl: './monthly-records.html',
  styleUrl: '../../indicators-shared.scss',
})
export class MonthlyRecords {
  private readonly api = inject(IndicatorsService);
  private readonly auth = inject(AuthService);
  private readonly destroy = inject(DestroyRef);
  readonly canManage = computed(() => {
    const user = this.auth.currentUser();
    return (
      !!user &&
      !user.isExternal &&
      user.permissions.includes('dashboard.read') &&
      user.permissions.includes('catalogs.manage')
    );
  });
  readonly months = months;
  readonly formatValue = formatValue;
  readonly typeLabel = typeLabel;
  readonly selected = signal<Indicator | null>(null);
  readonly editing = signal<MonthlyRecord | null>(null);
  readonly form = inject(FormBuilder).nonNullable.group({
    year: [
      currentYear(),
      [Validators.required, Validators.min(1), Validators.max(9999), Validators.pattern(/^\d+$/)],
    ],
    month: [currentMonth(), [Validators.required, Validators.min(1), Validators.max(12)]],
    value: [
      '',
      [
        Validators.required,
        (control) =>
          this.selected() && validValue(control.value, this.selected()!.measurementType)
            ? null
            : { value: true },
      ],
    ],
  });
  readonly filters = inject(FormBuilder).group({
    year: [
      currentYear(),
      [Validators.required, Validators.min(1), Validators.max(9999), Validators.pattern(/^\d+$/)],
    ],
    month: [null as number | null],
    search: ['', Validators.maxLength(200)],
  });
  readonly result = signal<Page<MonthlyRecord> | null>(null);
  readonly error = signal('');
  readonly saveError = signal('');
  readonly success = signal('');
  readonly loading = signal(false);
  readonly saving = signal(false);
  private readonly confirm = viewChild.required(DeleteConfirm);
  private deleteTarget: MonthlyRecord | null = null;
  private applied = { year: currentYear(), month: null as number | null, search: '' };
  private readonly requests = new Subject<{
    page: number;
    year: number;
    month: number | null;
    search: string;
  }>();
  constructor() {
    this.requests
      .pipe(
        switchMap((query) =>
          this.api.records(query).pipe(
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
    this.load();
  }
  choose(row: Indicator | null) {
    this.selected.set(row);
    this.form.controls.value.updateValueAndValidity();
  }
  load(page = 1) {
    this.loading.set(true);
    this.error.set('');
    this.requests.next({ ...this.applied, page });
  }
  search() {
    this.filters.markAllAsTouched();
    if (this.filters.invalid) return;
    const value = this.filters.getRawValue();
    this.applied = { year: value.year!, month: value.month, search: value.search ?? '' };
    this.load();
  }
  clearFilters() {
    this.filters.reset({ year: currentYear(), month: null, search: '' });
    this.search();
  }
  reset() {
    this.editing.set(null);
    this.choose(null);
    this.form.reset({ year: currentYear(), month: currentMonth(), value: '' });
    this.saveError.set('');
  }
  edit(row: MonthlyRecord) {
    if (!this.canManage() || this.saving()) return;
    this.editing.set(row);
    this.choose({
      id: row.indicatorId,
      name: row.indicatorName,
      measurementType: row.measurementType,
      isActive: row.indicatorIsActive,
      hasRecords: true,
      rowVersion: '',
    });
    this.form.patchValue({ year: row.year, month: row.month, value: row.value });
    this.saveError.set('');
    this.success.set('');
  }
  save() {
    this.form.markAllAsTouched();
    if (!this.canManage() || this.saving() || this.form.invalid || !this.selected()?.isActive)
      return;
    const value = this.form.getRawValue();
    const row = this.editing();
    this.saving.set(true);
    this.saveError.set('');
    this.success.set('');
    this.api
      .saveRecord(row?.id ?? null, {
        ...value,
        indicatorId: this.selected()!.id,
        value: value.value.replace(',', '.'),
        rowVersion: row?.rowVersion,
      })
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.reset();
          this.success.set('Registro mensual guardado.');
          this.filters.patchValue({ year: value.year, month: null });
          this.search();
        },
        error: (error) => {
          this.saving.set(false);
          this.saveError.set(requestError(error));
        },
      });
  }
  askDelete(row: MonthlyRecord) {
    if (!this.canManage() || this.saving()) return;
    this.deleteTarget = row;
    this.confirm().open();
  }
  remove() {
    const row = this.deleteTarget;
    if (!row || !this.canManage() || this.saving()) return;
    this.saving.set(true);
    this.saveError.set('');
    this.success.set('');
    this.api
      .deleteRecord(row)
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: () => {
          this.saving.set(false);
          if (this.editing()?.id === row.id) this.reset();
          this.success.set('Registro eliminado.');
          this.load();
        },
        error: (error) => {
          this.saving.set(false);
          this.saveError.set(requestError(error));
        },
      });
  }
}
