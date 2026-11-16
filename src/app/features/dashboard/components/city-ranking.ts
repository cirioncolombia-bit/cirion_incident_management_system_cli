import {
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  input,
  signal,
  ElementRef,
} from '@angular/core';
import { Subject, catchError, map, of, switchMap } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  CityRank,
  CityNodeRank,
  formatValue,
  months,
  requestError,
  typeLabel,
  rankingPeriod,
} from '../models/indicators';
import { IndicatorsService } from '../services/indicators.service';
@Component({
  selector: 'app-city-ranking',
  host: {
    '(document:pointerdown)': 'outsidePointer($event)',
    '(window:scroll)': 'repositionTooltip()',
    '(window:resize)': 'dismissTooltip()',
    '(keydown.escape)': 'dismissTooltip()',
  },
  template: ` <article
    class="card ranking"
    [attr.aria-label]="chart().indicator.name + ' — ' + chart().cityName"
  >
    <header>
      <span class="city-marker" aria-hidden="true">▥</span>
      <h2>{{ chart().cityName }}</h2>
      @if (!chart().indicator.isActive) {
        <span class="badge">Indicador inactivo</span>
      }
    </header>
    <p>{{ chart().indicator.name }} · {{ rankingPeriod(chart()) }}</p>
    <small
      >{{
        chart().isAnnual
          ? chart().aggregation === 'average'
            ? 'Promedio de meses registrados'
            : 'Suma de meses registrados'
          : 'Valores registrados'
      }}
      · Mayor a menor · {{ chart().nodeCount }} nodos</small
    >
    <div class="city-highlights">
      @if (leader(); as node) {
        <div class="leader-summary">
          <span class="metric-label">Nodo líder · selección actual</span
          ><strong class="leader-name">{{ node.nodeName }}</strong
          ><span class="leader-value">{{
            formatValue(node.value, chart().indicator.measurementType)
          }}</span>
        </div>
      }
      <div class="node-summary">
        <span class="metric-label">Nodos con registro</span><strong>{{ chart().nodeCount }}</strong>
      </div>
    </div>
    <div class="rank-legend" aria-label="Colores por posición">
      <span class="legend-item first">1.º</span><span class="legend-item second">2.º</span
      ><span class="legend-item third">3.º</span><span class="legend-item other">Otros</span>
    </div>
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
      (scroll)="dismissTooltip()"
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
                  <button
                    type="button"
                    class="column-target"
                    [disabled]="loading()"
                    [class.is-selected]="tooltipNode()?.nodeId === node.nodeId"
                    [attr.aria-label]="nodeLabel(node)"
                    [attr.aria-describedby]="
                      tooltipNode()?.nodeId === node.nodeId ? tooltipId() : null
                    "
                    [attr.aria-pressed]="pinnedNodeId() === node.nodeId"
                    (pointerenter)="previewNode(node, $event)"
                    (pointerleave)="hidePreview()"
                    (focus)="previewNode(node, $event)"
                    (blur)="hidePreview()"
                    (click)="toggleNode(node, $event)"
                  >
                    <span
                      class="bar"
                      aria-hidden="true"
                      [class.negative]="node.negative"
                      [class.rank-first]="node.rank === 1"
                      [class.rank-second]="node.rank === 2"
                      [class.rank-third]="node.rank === 3"
                      [style.--bar-delay]="(node.index % 8) * 30 + 'ms'"
                      [style.bottom.%]="node.bottom"
                      [style.height.%]="node.height"
                    ></span>
                  </button>
                </div>
                <span class="node-name" [title]="node.nodeName"
                  ><span
                    class="node-rank"
                    [class.rank-first]="node.rank === 1"
                    [class.rank-second]="node.rank === 2"
                    [class.rank-third]="node.rank === 3"
                    >#{{ node.rank }}</span
                  >{{ node.nodeName }}</span
                >
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
    @if (tooltipNode(); as node) {
      <div
        role="tooltip"
        class="node-tooltip"
        [id]="tooltipId()"
        [style.left.px]="tooltipPosition().x"
        [style.top.px]="tooltipPosition().y"
      >
        <small>Posición {{ node.rank }}</small
        ><strong>{{ node.nodeName }}</strong
        ><span>{{ chart().cityName }} · {{ rankingPeriod(chart()) }}</span
        ><b>{{ formatValue(node.value, chart().indicator.measurementType) }}</b>
        @if (chart().isAnnual) {
          <small>{{ node.monthsRecorded ?? 1 }} meses con registro</small>
        }
      </div>
    }
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
    .ranking {
      border-top: 3px solid #9bb9e4;
      background: linear-gradient(150deg, #fff 70%, #f6f9ff);
      box-shadow: 0 8px 28px -20px #16477955;
    }
    header {
      align-items: center;
      justify-content: flex-start;
    }
    header h2 {
      flex: 1;
    }
    .city-marker {
      display: grid;
      place-items: center;
      width: 2.5rem;
      height: 2.5rem;
      border-radius: 0.75rem;
      background: #eaf2ff;
      color: #22558d;
      font-size: 1.5rem;
      flex: 0 0 auto;
    }
    .city-highlights {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 0.75rem;
      margin: 1.2rem 0;
    }
    .leader-summary,
    .node-summary {
      padding: 0.9rem 1rem;
      border-radius: 0.75rem;
      border: 1px solid #e3eaf4;
      background: #fff;
    }
    .leader-summary {
      border-left: 3px solid #e97751;
      background: linear-gradient(110deg, #fff2e9, #fff);
    }
    .metric-label {
      display: block;
      color: #61738e;
      font-size: 0.72rem;
      margin-bottom: 0.4rem;
    }
    .leader-name {
      display: block;
      overflow-wrap: anywhere;
      font-size: 0.95rem;
    }
    .leader-value {
      display: block;
      color: #af4329;
      font-size: 1.3rem;
      font-weight: 700;
      margin-top: 0.35rem;
      overflow-wrap: anywhere;
    }
    .node-summary strong {
      display: block;
      color: #245c97;
      font-size: 1.8rem;
    }
    .rank-legend {
      display: flex;
      gap: 0.75rem;
      flex-wrap: wrap;
      color: #61738e;
      font-size: 0.75rem;
    }
    .legend-item::before {
      content: '';
      display: inline-block;
      width: 0.55rem;
      height: 0.55rem;
      margin-right: 0.35rem;
      border-radius: 0.15rem;
      background: #7899c9;
    }
    .legend-item.first::before {
      background: #e76845;
    }
    .legend-item.second::before {
      background: #dfa331;
    }
    .legend-item.third::before {
      background: #239e8b;
    }
    .column-target {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      min-height: 0;
      padding: 0;
      margin: 0;
      border: 0;
      border-radius: 0.5rem;
      background: transparent;
      cursor: pointer;
    }
    .column-target:hover,
    .column-target.is-selected {
      background: #edf3fb77;
    }
    .column-target:focus-visible {
      outline: 2px solid #245c97;
      outline-offset: 3px;
    }
    .bar {
      background: linear-gradient(180deg, #95b7e6, #5d87be);
      border-radius: 0.55rem 0.55rem 0 0;
      box-shadow: 0 8px 14px -9px #25558a88;
      transform: translateX(-50%) scaleY(1);
      transform-origin: center bottom;
      animation: rise 0.45s cubic-bezier(0.2, 0.7, 0.3, 1) var(--bar-delay, 0ms) both;
    }
    .bar.rank-first {
      background: linear-gradient(180deg, #ffac7c, #dd6547);
    }
    .bar.rank-second {
      background: linear-gradient(180deg, #f8d875, #d9a031);
    }
    .bar.rank-third {
      background: linear-gradient(180deg, #6ed7bf, #229e8b);
    }
    .bar.negative {
      background: linear-gradient(180deg, #cc6776, #a74355);
      transform-origin: center top;
    }
    .node-rank {
      display: block;
      width: fit-content;
      margin: 0 auto 0.35rem;
      padding: 0.1rem 0.45rem;
      border-radius: 0.35rem;
      background: #edf3fa;
      color: #54749e;
      font-size: 0.68rem;
      font-weight: 700;
    }
    .node-rank.rank-first {
      background: #fff0e6;
      color: #a74125;
    }
    .node-rank.rank-second {
      background: #fff5d9;
      color: #866118;
    }
    .node-rank.rank-third {
      background: #e2f8ef;
      color: #197866;
    }
    .node-tooltip {
      position: fixed;
      z-index: 1200;
      width: min(288px, calc(100vw - 24px));
      box-sizing: border-box;
      max-height: calc(100dvh - 24px);
      padding: 0.9rem 1rem;
      border-radius: 0.75rem;
      background: #12365b;
      color: #fff;
      box-shadow: 0 8px 28px #00172e44;
      pointer-events: none;
      overflow-wrap: anywhere;
    }
    .node-tooltip small {
      color: #bcd4f4;
      font-size: 0.72rem;
    }
    .node-tooltip strong {
      display: block;
      margin: 0.3rem 0;
    }
    .node-tooltip span {
      display: block;
      font-size: 0.8rem;
      color: #d5e3f6;
    }
    .node-tooltip b {
      display: block;
      margin-top: 0.6rem;
      font-size: 1.1rem;
    }
    @keyframes rise {
      from {
        transform: translateX(-50%) scaleY(0);
      }
      to {
        transform: translateX(-50%) scaleY(1);
      }
    }
    @media (prefers-reduced-motion: reduce) {
      .bar {
        animation: none;
        transition: none;
      }
    }
    @media (max-width: 480px) {
      .city-highlights {
        grid-template-columns: minmax(0, 1fr);
      }
      .node-summary {
        display: flex;
        align-items: center;
        justify-content: space-between;
      }
      .node-summary .metric-label {
        margin: 0;
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
  readonly rankingPeriod = rankingPeriod;
  readonly loading = signal(false);
  readonly error = signal('');
  private readonly requests = new Subject<number | null>();
  private readonly hostElement = inject<ElementRef<HTMLElement>>(ElementRef);
  readonly leader = computed(() =>
    this.data().nodePage === 1 ? (this.data().nodes[0] ?? null) : null,
  );
  readonly tooltipNode = signal<(CityNodeRank & { rank: number }) | null>(null);
  readonly pinnedNodeId = signal<number | null>(null);
  readonly tooltipPosition = signal({ x: 12, y: 12 });
  readonly tooltipId = computed(
    () => `node-tooltip-${this.data().indicator.id}-${this.data().cityId}`,
  );
  nodeLabel(node: CityNodeRank & { rank: number }): string {
    const data = this.chart();
    return `Posición ${node.rank}. ${node.nodeName}: ${formatValue(node.value, data.indicator.measurementType)}. ${data.cityName}, ${rankingPeriod(data)}. Toca o pulsa Enter para ver el detalle.`;
  }
  private tooltipAnchor: HTMLElement | null = null;
  private showNode(node: CityNodeRank & { rank: number }, event: Event): void {
    const target = event.currentTarget as HTMLElement | null;
    this.tooltipAnchor = target;
    const rect = target?.getBoundingClientRect();
    const pointer = event as PointerEvent;
    const x = pointer.clientX || (rect ? rect.left + rect.width / 2 : 12);
    const y = pointer.clientY || (rect ? rect.top + 24 : 12);
    this.placeTooltip(x, y);
    this.tooltipNode.set(node);
  }
  private placeTooltip(x: number, y: number): void {
    const width = Math.min(288, window.innerWidth - 24);
    this.tooltipPosition.set({
      x: Math.max(12, Math.min(x - width / 2, window.innerWidth - width - 12)),
      y: Math.max(12, Math.min(y + 16, window.innerHeight - 212)),
    });
  }
  repositionTooltip(): void {
    if (!this.tooltipNode() || !this.tooltipAnchor) return;
    const rect = this.tooltipAnchor.getBoundingClientRect();
    if (
      rect.bottom <= 0 ||
      rect.top >= window.innerHeight ||
      rect.right <= 0 ||
      rect.left >= window.innerWidth
    ) {
      this.dismissTooltip();
      return;
    }
    this.placeTooltip(rect.left + rect.width / 2, Math.max(0, rect.top) + 24);
  }
  previewNode(node: CityNodeRank & { rank: number }, event: Event): void {
    if (!this.loading() && this.pinnedNodeId() === null) this.showNode(node, event);
  }
  toggleNode(node: CityNodeRank & { rank: number }, event: Event): void {
    if (this.loading()) return;
    if (this.pinnedNodeId() === node.nodeId) {
      this.dismissTooltip();
      return;
    }
    this.pinnedNodeId.set(node.nodeId);
    this.showNode(node, event);
  }
  hidePreview(): void {
    if (this.pinnedNodeId() === null) this.tooltipNode.set(null);
  }
  dismissTooltip(): void {
    this.tooltipAnchor = null;
    this.pinnedNodeId.set(null);
    this.tooltipNode.set(null);
  }
  outsidePointer(event: PointerEvent): void {
    const target = event.target;
    if (
      !(target instanceof Element) ||
      !this.hostElement.nativeElement.contains(target) ||
      !target.closest('.column-target')
    )
      this.dismissTooltip();
  }
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
    return this.chart().nodes.map((node, index) => ({
      index,
      rank: (this.chart().nodePage - 1) * this.chart().nodePageSize + index + 1,
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
      this.dismissTooltip();
      this.requests.next(null);
      this.page.set(null);
      this.error.set('');
    });
  }
  load(page: number) {
    if (this.loading() || page < 1 || page > this.chart().totalNodePages) return;
    this.dismissTooltip();
    this.loading.set(true);
    this.error.set('');
    this.requests.next(page);
  }
}
