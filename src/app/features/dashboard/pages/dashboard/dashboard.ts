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
  Page,
  currentYear,
  months,
  requestError,
} from '../../models/indicators';
import { IndicatorsService } from '../../services/indicators.service';
import { IndicatorsNav } from '../../components/indicators-nav';
import { LocationSelect } from '../../components/location-select';
import { IndicatorTimeline } from '../../components/indicator-timeline';
import { CityRanking } from '../../components/city-ranking';
import { IndicatorPicker } from '../../components/indicator-picker';
@Component({
  selector: 'app-dashboard',
  imports: [
    RouterLink,
    CityRanking,
    IndicatorTimeline,
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
  readonly appliedMonth = signal<number | null>(currentMonth());
  readonly appliedPeriod = computed(() =>
    this.appliedMonth() === null
      ? `Resumen anual ${this.appliedYear()}`
      : `${months[this.appliedMonth()! - 1]} ${this.appliedYear()}`,
  );
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
    (this.result()?.rows ?? []).map((series) => ({
      ...series,
      key: `${series.indicator.id}-${series.cityId ?? 0}-${series.nodeId ?? 0}`,
    })),
  );
  constructor() {
    this.filters.controls.view.valueChanges
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe(() => this.viewChanged());
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
    this.appliedMonth.set(this.applied.month);
    this.requests.next({ ...this.applied, page });
  }
  search() {
    this.viewChanged();
    this.filters.markAllAsTouched();
    if (this.filters.invalid) return;
    const value = this.filters.getRawValue();
    this.applied = {
      view: value.view ?? 'city',
      year: value.year!,
      month: value.view === 'timeline' ? null : value.month,
      indicatorId: this.selected()?.id ?? null,
      cityId: this.city()?.id ?? null,
      nodeId: this.node()?.id ?? null,
    };
    this.load();
  }
  viewChanged() {
    const month = this.filters.controls.month;
    if (this.filters.controls.view.value === 'timeline') {
      month.setValue(null, { emitEvent: false });
      month.disable({ emitEvent: false });
    } else {
      const wasDisabled = month.disabled;
      month.enable({ emitEvent: false });
      if (wasDisabled) month.setValue(currentMonth(), { emitEvent: false });
    }
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
}
