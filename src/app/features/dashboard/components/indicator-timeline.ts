import { Component, ElementRef, computed, effect, inject, input, signal } from '@angular/core';
import {
  ChartSeries,
  MonthlyRecord,
  decimalUnits,
  formatValue,
  months,
  typeLabel,
} from '../models/indicators';
interface TimelinePoint {
  record: MonthlyRecord;
  x: number;
  y: number;
  peak: boolean;
  latest: boolean;
}
@Component({
  selector: 'app-indicator-timeline',
  templateUrl: './indicator-timeline.html',
  styleUrls: ['../indicators-shared.scss', './indicator-timeline.scss'],
  host: {
    '(document:pointerdown)': 'outsidePointer($event)',
    '(window:scroll)': 'repositionTooltip()',
    '(window:resize)': 'dismissTooltip()',
    '(keydown.escape)': 'dismissTooltip()',
  },
})
export class IndicatorTimeline {
  readonly data = input.required<ChartSeries>();
  readonly year = input.required<number>();
  readonly formatValue = formatValue;
  readonly months = months;
  readonly typeLabel = typeLabel;
  private readonly hostElement = inject<ElementRef<HTMLElement>>(ElementRef);
  private anchor: Element | null = null;
  readonly active = signal<MonthlyRecord | null>(null);
  readonly pinned = signal<number | null>(null);
  readonly position = signal({ x: 12, y: 12 });
  readonly chartId = computed(
    () =>
      `timeline-${this.data().indicator.id}-${this.data().cityId ?? 0}-${this.data().nodeId ?? 0}-${this.year()}`,
  );
  readonly ordered = computed(() => [...this.data().records].sort((a, b) => a.month - b.month));
  readonly stats = computed(() => {
    const rows = this.ordered(),
      latest = rows.at(-1) ?? null;
    const maximum = rows.reduce<MonthlyRecord | null>(
      (best, row) => (!best || decimalUnits(row.value) > decimalUnits(best.value) ? row : best),
      null,
    );
    const peaks = maximum
      ? rows.filter((row) => decimalUnits(row.value) === decimalUnits(maximum.value))
      : [];
    return {
      latest,
      maximum,
      peakMonths: peaks.map((row) => months[row.month - 1].slice(0, 3)).join(' · '),
      count: rows.length,
    };
  });
  readonly geometry = computed(() => {
    const rows = this.ordered(),
      values = rows.map((row) => Number(row.value));
    const rawMin = Math.min(0, ...values),
      rawMax = Math.max(0, ...values),
      rawStep = (rawMax - rawMin) / 4 || 1;
    const magnitude = 10 ** Math.floor(Math.log10(rawStep));
    const step = Math.max(
      this.data().indicator.measurementType === 3 ? 1 : 0.01,
      ([1, 2, 5, 10].find((n) => n * magnitude >= rawStep) ?? 10) * magnitude,
    );
    const min = Math.floor(rawMin / step) * step,
      max = Math.max(min + step, Math.ceil(rawMax / step) * step),
      range = max - min;
    const y = (value: number) => 250 - ((value - min) / range) * 208;
    const points: TimelinePoint[] = rows.map((row) => ({
      record: row,
      x: 72 + (row.month - 1) * 50,
      y: y(Number(row.value)),
      peak:
        this.stats().maximum !== null &&
        decimalUnits(row.value) === decimalUnits(this.stats().maximum!.value),
      latest: row.id === this.stats().latest?.id,
    }));
    const segments: TimelinePoint[][] = [];
    for (const point of points) {
      const last = segments.at(-1);
      if (last && last.at(-1)!.record.month + 1 === point.record.month) last.push(point);
      else segments.push([point]);
    }
    const path = (segment: TimelinePoint[]) =>
      segment.map((p, i) => `${i ? 'L' : 'M'}${p.x},${p.y}`).join(' ');
    const line = segments.map(path).join(' ');
    const areas = segments
      .filter((segment) => segment.length > 1)
      .map(
        (segment) => `${path(segment)} L${segment.at(-1)!.x},${y(0)} L${segment[0].x},${y(0)} Z`,
      );
    const ticks = Array.from({ length: Math.round(range / step) + 1 }, (_, i) => ({
      value: min + i * step,
      y: y(min + i * step),
    }));
    return { points, line, areas, ticks, zero: y(0) };
  });
  constructor() {
    effect(() => {
      this.data();
      this.year();
      this.dismissTooltip();
    });
  }
  tickLabel(value: number) {
    return new Intl.NumberFormat('es-CO', {
      notation: Math.abs(value) >= 1000 ? 'compact' : 'standard',
      maximumFractionDigits: 2,
    }).format(value);
  }
  pointLabel(row: MonthlyRecord) {
    return `${months[row.month - 1]} ${row.year}: ${formatValue(row.value, row.measurementType)}. ${row.cityName}, ${row.nodeName}. Toca o pulsa Enter para ver el detalle.`;
  }
  private place(x: number, y: number) {
    const width = Math.min(288, window.innerWidth - 24);
    this.position.set({
      x: Math.max(12, Math.min(x - width / 2, window.innerWidth - width - 12)),
      y: Math.max(12, Math.min(y + 16, window.innerHeight - 212)),
    });
  }
  private show(row: MonthlyRecord, event: Event) {
    this.anchor = event.currentTarget as Element | null;
    const rect = this.anchor?.getBoundingClientRect();
    const pointer = event as PointerEvent;
    this.place(
      pointer.clientX || (rect ? rect.left + rect.width / 2 : 12),
      pointer.clientY || (rect ? rect.top + rect.height : 12),
    );
    this.active.set(row);
  }
  preview(row: MonthlyRecord, event: Event) {
    if (this.pinned() === null) this.show(row, event);
  }
  hidePreview() {
    if (this.pinned() === null) this.active.set(null);
  }
  toggle(row: MonthlyRecord, event: Event) {
    if (this.pinned() === row.id) {
      this.dismissTooltip();
      return;
    }
    this.pinned.set(row.id);
    this.show(row, event);
  }
  keyToggle(row: MonthlyRecord, event: Event) {
    event.preventDefault();
    this.toggle(row, event);
  }
  dismissTooltip() {
    this.anchor = null;
    this.active.set(null);
    this.pinned.set(null);
  }
  repositionTooltip() {
    if (!this.active() || !this.anchor) return;
    const rect = this.anchor.getBoundingClientRect();
    if (
      rect.bottom <= 0 ||
      rect.top >= window.innerHeight ||
      rect.right <= 0 ||
      rect.left >= window.innerWidth
    ) {
      this.dismissTooltip();
      return;
    }
    this.place(rect.left + rect.width / 2, Math.max(0, rect.top) + rect.height);
  }
  outsidePointer(event: PointerEvent) {
    const target = event.target;
    if (
      !(target instanceof Element) ||
      !this.hostElement.nativeElement.contains(target) ||
      !target.closest('.timeline-point')
    )
      this.dismissTooltip();
  }
}
