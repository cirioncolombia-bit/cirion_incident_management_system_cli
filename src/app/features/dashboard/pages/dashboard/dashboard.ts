import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subject, catchError, map, of, switchMap } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  LocationOption,
  ChartSeries,
  Indicator,
  MonthlyRecord,
  Page,
  currentYear,
  decimalUnits,
  formatValue,
  months,
  requestError,
  typeLabel,
} from '../../models/indicators';
import { IndicatorsService } from '../../services/indicators.service';
import { IndicatorsNav } from '../../components/indicators-nav';
import { LocationSelect } from '../../components/location-select';
import { IndicatorPicker } from '../../components/indicator-picker';
@Component({
  selector: 'app-dashboard',
  imports: [ReactiveFormsModule, IndicatorsNav, LocationSelect, IndicatorPicker],
  templateUrl: './dashboard.html',
  styleUrls: ['../../indicators-shared.scss', './dashboard.scss'],
})
export class Dashboard {
  private readonly api = inject(IndicatorsService);
  private readonly destroy = inject(DestroyRef);
  readonly months = months;
  readonly formatValue = formatValue;
  readonly typeLabel = typeLabel;
  readonly city = signal<LocationOption | null>(null);
  readonly node = signal<LocationOption | null>(null);
  readonly selected = signal<Indicator | null>(null);
  readonly result = signal<Page<ChartSeries> | null>(null);
  readonly loading = signal(false);
  readonly error = signal('');
  readonly filters = inject(FormBuilder).group({
    year: [
      currentYear(),
      [Validators.required, Validators.min(1), Validators.max(9999), Validators.pattern(/^\d+$/)],
    ],
    month: [null as number | null],
  });
  private applied = {
    year: currentYear(),
    month: null as number | null,
    indicatorId: null as number | null,
    cityId: null as number | null,
    nodeId: null as number | null,
  };
  readonly appliedYear = signal(currentYear());
  private readonly requests = new Subject<{
    cityId: number | null;
    nodeId: number | null;
    year: number;
    month: number | null;
    indicatorId: number | null;
    page: number;
  }>();
  readonly series = computed(() =>
    (this.result()?.rows ?? []).map((series) => {
      const values = series.records.map((x) => Number(x.value));
      const min = Math.min(0, ...values),
        max = Math.max(0, ...values);
      const range = max - min || 1;
      const y = (value: number) => 190 - ((value - min) / range) * 160;
      const maxValue = series.records.reduce(
        (best, row) => (decimalUnits(row.value) > decimalUnits(best) ? row.value : best),
        '0',
      );
      const points = series.records.map((record) => ({
        record,
        x: 45 + (record.month - 1) * 46,
        y: y(Number(record.value)),
      }));
      let previous = -1;
      const path = points
        .map((point) => {
          const command = point.record.month === previous + 1 ? 'L' : 'M';
          previous = point.record.month;
          return `${command}${point.x},${point.y}`;
        })
        .join(' ');
      return {
        ...series,
        key: `${series.indicator.id}-${series.cityId ?? 0}-${series.nodeId ?? 0}`,
        points,
        path,
        zero: y(0),
        min,
        max,
        maxValue,
      };
    }),
  );
  constructor() {
    this.requests
      .pipe(
        switchMap((query) =>
          this.api.charts({ ...query, pageSize: 6 }).pipe(
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
  load(page = 1) {
    this.loading.set(true);
    this.error.set('');
    this.appliedYear.set(this.applied.year);
    this.requests.next({ ...this.applied, page });
  }
  search() {
    this.filters.markAllAsTouched();
    if (this.filters.invalid) return;
    const value = this.filters.getRawValue();
    this.applied = {
      year: value.year!,
      month: value.month,
      indicatorId: this.selected()?.id ?? null,
      cityId: this.city()?.id ?? null,
      nodeId: this.node()?.id ?? null,
    };
    this.load();
  }
  chooseCity(row: LocationOption | null) {
    this.city.set(row);
    this.node.set(null);
  }
  clear() {
    this.city.set(null);
    this.node.set(null);
    this.filters.reset({ year: currentYear(), month: null });
    this.selected.set(null);
    this.search();
  }
  valueLabel(row: MonthlyRecord) {
    return `${months[row.month - 1]}: ${formatValue(row.value, row.measurementType)}`;
  }
}
