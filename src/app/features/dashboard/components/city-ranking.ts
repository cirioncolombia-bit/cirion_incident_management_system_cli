import { Component, DestroyRef, computed, effect, inject, input, signal } from '@angular/core';
import { Subject, catchError, map, of, switchMap } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CityRank, formatValue, months, requestError, typeLabel } from '../models/indicators';
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
    <p class="axis-title">{{ typeLabel(chart().indicator.measurementType) }}</p>
    <div
      class="chart-scroll"
      tabindex="0"
      role="region"
      [attr.aria-label]="'Gráfico de barras verticales de nodos de ' + chart().cityName"
    >
      <div class="vertical-chart" [style.min-width.px]="chartWidth()">
        <div class="y-axis" aria-hidden="true">
          @for (tick of scale().ticks; track tick.value) {
            <span [style.bottom.%]="tick.position">{{
              formatValue(tick.value, chart().indicator.measurementType)
            }}</span>
          }
        </div>
        <div class="plot">
          <div class="grid-lines" aria-hidden="true">
            @for (tick of scale().ticks; track tick.value) {
              <span [style.bottom.%]="tick.position"></span>
            }
            <span class="zero-line" [style.bottom.%]="scale().zero"></span>
          </div>
          <ol
            class="columns"
            [style.grid-template-columns]="
              'repeat(' + Math.max(1, chart().nodes.length) + ', minmax(0, 1fr))'
            "
            [attr.start]="(chart().nodePage - 1) * chart().nodePageSize + 1"
            [attr.aria-label]="'Nodos de ' + chart().cityName"
          >
            @for (node of bars(); track node.nodeId) {
              <li>
                <div class="column">
                  <strong
                    class="value"
                    [class.negative]="node.negative"
                    [style.bottom.%]="node.negative ? node.bottom : node.bottom + node.height"
                    >{{ formatValue(node.value, chart().indicator.measurementType) }}</strong
                  >
                  <span
                    class="bar"
                    aria-hidden="true"
                    [class.negative]="node.negative"
                    [style.bottom.%]="node.bottom"
                    [style.height.%]="node.height"
                    [title]="
                      node.nodeName +
                      ': ' +
                      formatValue(node.value, chart().indicator.measurementType)
                    "
                  ></span>
                </div>
                <span class="node-name" [title]="node.nodeName">{{ node.nodeName }}</span>
              </li>
            } @empty {
              <li>No hay nodos en esta página.</li>
            }
          </ol>
          <p class="x-axis-title">Nodos</p>
        </div>
      </div>
    </div>
    <small class="scroll-hint">Desplaza el gráfico horizontalmente para ver todos los nodos.</small>
    <details>
      <summary>Ver valores</summary>
      <div
        class="table-scroll"
        tabindex="0"
        role="region"
        [attr.aria-label]="'Valores de nodos de ' + chart().cityName"
      >
        <table>
          <thead>
            <tr>
              <th>Nodo</th>
              <th>Valor</th>
            </tr>
          </thead>
          <tbody>
            @for (node of chart().nodes; track node.nodeId) {
              <tr>
                <td>{{ node.nodeName }}</td>
                <td>{{ formatValue(node.value, chart().indicator.measurementType) }}</td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    </details>
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
    header {
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
    .badge {
      font-size: 0.75rem;
    }
    .axis-title {
      margin: 1rem 0 0;
      color: #58718e;
      font-size: 0.8rem;
    }
    .chart-scroll {
      overflow: auto;
      max-width: 100%;
      padding: 2rem 0 0.5rem;
      margin-top: 0.5rem;
    }
    .vertical-chart {
      display: grid;
      grid-template-columns: 90px minmax(0, 1fr);
      gap: 0;
      padding-top: 0.5rem;
    }
    .y-axis {
      height: 18rem;
      position: relative;
      font-size: 0.75rem;
      color: #58718e;
    }
    .y-axis span {
      position: absolute;
      right: 0.75rem;
      transform: translateY(50%);
      white-space: nowrap;
    }
    .plot {
      position: relative;
      min-width: 0;
    }
    .grid-lines {
      position: absolute;
      left: 0;
      right: 0;
      top: 0;
      height: 18rem;
      pointer-events: none;
    }
    .grid-lines span {
      position: absolute;
      left: 0;
      right: 0;
      border-bottom: 1px solid #e1e9f3;
    }
    .grid-lines .zero-line {
      border-color: #71849b;
    }
    .columns {
      position: relative;
      display: grid;
      list-style: none;
      margin: 0;
      padding: 0;
      gap: 0.75rem;
    }
    .columns li {
      min-width: 0;
      text-align: center;
    }
    .column {
      height: 18rem;
      position: relative;
      margin: 0 0.75rem;
    }
    .bar {
      position: absolute;
      width: 70%;
      max-width: 4.5rem;
      background: #1268bc;
      border-radius: 0.3rem 0.3rem 0 0;
      transform: translateX(-50%);
      left: 50%;
    }
    .bar.negative {
      background: #a52332;
      border-radius: 0 0 0.3rem 0.3rem;
    }
    .value {
      position: absolute;
      left: 50%;
      transform: translate(-50%, -0.35rem);
      font-size: 0.8rem;
      white-space: nowrap;
      z-index: 1;
    }
    .value.negative {
      transform: translate(-50%, calc(100% + 0.35rem));
    }
    .node-name {
      display: block;
      margin-top: 2rem;
      min-height: 3rem;
      overflow-wrap: anywhere;
      font-size: 0.8rem;
      padding: 0 0.2rem;
    }
    .x-axis-title {
      text-align: center;
      color: #58718e;
      font-size: 0.8rem;
      margin-top: 1rem;
    }
    .scroll-hint {
      color: #58718e;
      font-size: 0.75rem;
      margin: 0.5rem 0 1rem;
    }
    summary {
      cursor: pointer;
      padding: 0.75rem 0;
      color: #003f7d;
    }
    .table-scroll table {
      min-width: 20rem;
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
  readonly Math = Math;
  readonly typeLabel = typeLabel;
  readonly chartWidth = computed(() => {
    const data = this.chart();
    const labelWidth = Math.max(
      112,
      ...data.nodes.map(
        (node) => formatValue(node.value, data.indicator.measurementType).length * 7 + 24,
      ),
    );
    return Math.max(420, data.nodes.length * labelWidth + 90);
  });
  axisLabel(value: string): string {
    return Math.abs(Number(value)) >= 1000
      ? new Intl.NumberFormat('es-CO', { notation: 'compact', maximumFractionDigits: 1 }).format(
          Number(value),
        )
      : formatValue(value, this.chart().indicator.measurementType);
  }
  readonly scale = computed(() => {
    const data = this.chart();
    const rawMin = Math.min(0, Number(data.minValue));
    const rawMax = Math.max(0, Number(data.maxValue));
    const rawStep = (rawMax - rawMin) / 4 || 1;
    const magnitude = 10 ** Math.floor(Math.log10(rawStep));
    const nice = [1, 2, 5, 10].find((factor) => factor * magnitude >= rawStep) ?? 10;
    const step = Math.max(data.indicator.measurementType === 3 ? 1 : 0.01, nice * magnitude);
    const min = Math.floor(rawMin / step) * step;
    const max = Math.max(min + step, Math.ceil(rawMax / step) * step);
    const range = max - min;
    const count = Math.round(range / step);
    const ticks = Array.from({ length: count + 1 }, (_, i) => ({
      value: (min + i * step).toFixed(2),
      position: (i / count) * 100,
    }));
    return { min, max, range, zero: (-min / range) * 100, ticks };
  });
  readonly bars = computed(() => {
    const scale = this.scale();
    return this.chart().nodes.map((node) => ({
      ...node,
      negative: Number(node.value) < 0,
      bottom: ((Math.min(0, Number(node.value)) - scale.min) / scale.range) * 100,
      height: (Math.abs(Number(node.value)) / scale.range) * 100,
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
