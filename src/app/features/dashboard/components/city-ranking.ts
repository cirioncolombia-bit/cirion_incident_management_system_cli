import { Component, DestroyRef, computed, effect, inject, input, signal } from '@angular/core';
import { Subject, catchError, map, of, switchMap } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CityRank, formatValue, months, requestError } from '../models/indicators';
import { IndicatorsService } from '../services/indicators.service';
@Component({
  selector: 'app-city-ranking',
  template: ` <article
    class="card ranking"
    [attr.aria-label]="chart().indicator.name + ' — ' + chart().cityName"
  >
    <header>
      <h2>{{ chart().cityName }}</h2>
      @if (!chart().indicator.isActive) {
        <span class="badge">Indicador inactivo</span>
      }
    </header>
    <p>{{ chart().indicator.name }} · {{ months[chart().month - 1] }} {{ chart().year }}</p>
    <small>Valores registrados · Mayor a menor · {{ chart().nodeCount }} nodos</small>
    @if (loading()) {
      <p role="status">Cargando nodos…</p>
    }
    @if (error()) {
      <p role="alert" class="error">{{ error() }}</p>
      <button type="button" (click)="load(chart().nodePage)">Reintentar</button>
    }
    <ol
      tabindex="0"
      class="bars"
      [attr.start]="(chart().nodePage - 1) * chart().nodePageSize + 1"
      [attr.aria-label]="'Nodos de ' + chart().cityName"
    >
      @for (node of bars(); track node.nodeId) {
        <li>
          <div class="bar-label">
            <span [title]="node.nodeName">{{ node.nodeName }}</span
            ><strong>{{ formatValue(node.value, chart().indicator.measurementType) }}</strong>
          </div>
          <div class="bar-track" aria-hidden="true">
            <span class="zero" [style.left.%]="node.zero"></span
            ><span
              class="bar"
              [class.negative]="node.negative"
              [style.left.%]="node.left"
              [style.width.%]="node.width"
            ></span>
          </div>
        </li>
      } @empty {
        <li>No hay nodos en esta página.</li>
      }
    </ol>
    <nav class="pagination" aria-label="Paginación de nodos">
      <span>Página {{ chart().nodePage }} de {{ chart().totalNodePages || 1 }}</span
      ><button
        type="button"
        [disabled]="loading() || chart().nodePage <= 1"
        (click)="load(chart().nodePage - 1)"
      >
        Anterior</button
      ><button
        type="button"
        [disabled]="loading() || chart().nodePage >= chart().totalNodePages"
        (click)="load(chart().nodePage + 1)"
      >
        Siguiente
      </button>
    </nav>
  </article>`,
  styleUrls: ['../indicators-shared.scss'],
  styles: `
    :host {
      display: block;
      min-width: 0;
    }
    .ranking {
      margin-bottom: 0;
    }
    header,
    .bar-label {
      display: flex;
      justify-content: space-between;
      gap: 0.75rem;
      align-items: baseline;
    }
    header h2 {
      margin: 0;
      overflow-wrap: anywhere;
    }
    p {
      margin: 0.5rem 0;
    }
    small {
      display: block;
    }
    .bars {
      padding-left: 1.5rem;
      margin: 1.25rem 0;
      max-height: 28rem;
      overflow: auto;
    }
    .bars li {
      padding: 0.5rem 0.2rem 0.75rem;
    }
    .bar-label span {
      overflow-wrap: anywhere;
    }
    .bar-label strong {
      white-space: nowrap;
      font-size: 0.9rem;
    }
    .bar-track {
      position: relative;
      height: 1rem;
      background: #eef3f9;
      border-radius: 0.25rem;
      margin-top: 0.5rem;
      overflow: hidden;
    }
    .bar {
      position: absolute;
      height: 100%;
      background: #1268bc;
      border-radius: 0.25rem;
    }
    .bar.negative {
      background: #a52332;
    }
    .zero {
      position: absolute;
      width: 1px;
      height: 100%;
      background: #71849b;
      z-index: 1;
    }
    .badge {
      font-size: 0.75rem;
    }
    @media (max-width: 480px) {
      .bar-label {
        flex-wrap: wrap;
        gap: 0.25rem;
      }
    }
  `,
})
export class CityRanking {
  readonly data = input.required<CityRank>();
  readonly filteredNodeId = input<number | null>(null);
  private readonly api = inject(IndicatorsService);
  private readonly page = signal<CityRank | null>(null);
  readonly chart = computed(() => this.page() ?? this.data());
  readonly formatValue = formatValue;
  readonly months = months;
  readonly loading = signal(false);
  readonly error = signal('');
  private readonly requests = new Subject<number | null>();
  readonly bars = computed(() => {
    const data = this.chart(),
      min = Math.min(0, Number(data.minValue)),
      max = Math.max(0, Number(data.maxValue)),
      range = max - min || 1;
    return data.nodes.map((n) => ({
      ...n,
      negative: Number(n.value) < 0,
      zero: (-min / range) * 100,
      left: ((Math.min(0, Number(n.value)) - min) / range) * 100,
      width: (Math.abs(Number(n.value)) / range) * 100,
    }));
  });
  constructor() {
    this.requests
      .pipe(
        switchMap((page) =>
          page === null
            ? of(null)
            : this.api
                .cityCharts({
                  year: this.data().year,
                  month: this.data().month,
                  indicatorId: this.data().indicator.id,
                  cityId: this.data().cityId,
                  nodeId: this.filteredNodeId(),
                  page: 1,
                  pageSize: 1,
                  nodePage: page,
                  nodePageSize: this.data().nodePageSize,
                })
                .pipe(
                  map((data) => ({ data: data.rows[0] ?? null, error: '' })),
                  catchError((error) => of({ data: null, error: requestError(error) })),
                ),
        ),
        takeUntilDestroyed(inject(DestroyRef)),
      )
      .subscribe((result) => {
        this.loading.set(false);
        if (result) {
          this.error.set(
            result.error ||
              (!result.data ? 'No hay datos para esta ciudad. Actualiza los filtros.' : ''),
          );
          if (result.data) this.page.set(result.data);
        }
      });
    effect(() => {
      this.data();
      this.requests.next(null);
      this.page.set(null);
      this.error.set('');
    });
  }
  load(page: number) {
    if (this.loading() || page < 1 || page > this.chart().totalNodePages) return;
    this.loading.set(true);
    this.error.set('');
    this.requests.next(page);
  }
}
