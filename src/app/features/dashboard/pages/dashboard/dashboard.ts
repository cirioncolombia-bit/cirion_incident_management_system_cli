import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subject, catchError, map, of, switchMap } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  LocationOption,
  CityRank,
  currentMonth,
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
import { CityRanking } from '../../components/city-ranking';
import { IndicatorPicker } from '../../components/indicator-picker';
@Component({
  selector: 'app-dashboard',
  imports: [
    RouterLink,
    CityRanking,
    ReactiveFormsModule,
    IndicatorsNav,
    LocationSelect,
    IndicatorPicker,
  ],
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
  readonly rankingResult = signal<Page<CityRank> | null>(null);
  readonly appliedView = signal<'city' | 'timeline'>('city');
  readonly appliedNode = signal<number | null>(null);
  readonly pageInfo = computed(() =>
    this.appliedView() === 'city' ? this.rankingResult() : this.result(),
  );
  readonly result = signal<Page<ChartSeries> | null>(null);
  readonly loading = signal(false);
  readonly error = signal('');
  readonly filters = inject(FormBuilder).group({
    view: ['city' as 'city' | 'timeline'],
    year: [
      currentYear(),
      [Validators.required, Validators.min(1), Validators.max(9999), Validators.pattern(/^\d+$/)],
    ],
    month: [currentMonth() as number | null],
  });
  private applied = {
    view: 'city' as 'city' | 'timeline',
    year: currentYear(),
    month: currentMonth() as number | null,
    indicatorId: null as number | null,
    cityId: null as number | null,
    nodeId: null as number | null,
  };
  readonly appliedYear = signal(currentYear());
  readonly appliedMonth = signal(currentMonth());
  private readonly requests = new Subject<{
    view: 'city' | 'timeline';
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
        switchMap(({ view, ...query }) =>
          (view === 'city'
            ? this.api.cityCharts({ ...query, pageSize: 6 }).pipe(
                map((data) => ({
                  city: data as Page<CityRank> | null,
                  timeline: null as Page<ChartSeries> | null,
                  error: '',
                })),
              )
            : this.api.charts({ ...query, pageSize: 6 }).pipe(
                map((data) => ({
                  city: null as Page<CityRank> | null,
                  timeline: data as Page<ChartSeries> | null,
                  error: '',
                })),
              )
          ).pipe(
            catchError((error) => of({ city: null, timeline: null, error: requestError(error) })),
          ),
        ),
        takeUntilDestroyed(this.destroy),
      )
      .subscribe(({ city, timeline, error }) => {
        this.rankingResult.set(city);
        this.result.set(timeline);
        this.error.set(error);
        this.loading.set(false);
      });
    this.load();
  }
  load(page = 1) {
    this.loading.set(true);
    this.error.set('');
    this.appliedView.set(this.applied.view);
    this.appliedNode.set(this.applied.nodeId);
    this.appliedYear.set(this.applied.year);
    this.appliedMonth.set(this.applied.month ?? currentMonth());
    this.requests.next({ ...this.applied, page });
  }
  search() {
    this.filters.markAllAsTouched();
    if (
      this.filters.invalid ||
      (this.filters.controls.view.value === 'city' && !this.filters.controls.month.value)
    )
      return;
    const value = this.filters.getRawValue();
    this.applied = {
      view: value.view ?? 'city',
      year: value.year!,
      month: value.month,
      indicatorId: this.selected()?.id ?? null,
      cityId: this.city()?.id ?? null,
      nodeId: this.node()?.id ?? null,
    };
    this.load();
  }
  viewChanged() {
    if (this.filters.controls.view.value === 'city' && !this.filters.controls.month.value)
      this.filters.controls.month.setValue(currentMonth());
  }
  chooseCity(row: LocationOption | null) {
    this.city.set(row);
    this.node.set(null);
  }
  clear() {
    this.city.set(null);
    this.node.set(null);
    this.filters.reset({ view: 'city', year: currentYear(), month: currentMonth() });
    this.selected.set(null);
    this.search();
  }
  valueLabel(row: MonthlyRecord) {
    return `${months[row.month - 1]}: ${formatValue(row.value, row.measurementType)}`;
  }
}
