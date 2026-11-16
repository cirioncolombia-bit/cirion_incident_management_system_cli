import { TestBed } from '@angular/core/testing';
import { IndicatorTimeline } from './indicator-timeline';
import { ChartSeries, MonthlyRecord } from '../models/indicators';
const row = (month: number, value: string): MonthlyRecord => ({
  id: month,
  indicatorId: 7,
  indicatorName: 'Zonas calientes',
  measurementType: 3,
  indicatorIsActive: false,
  cityId: 1,
  cityName: 'Bogotá',
  nodeId: 2,
  nodeName: 'AMERICAS',
  year: 2024,
  month,
  value,
  rowVersion: 'AQ==',
});
const data: ChartSeries = {
  indicator: { id: 7, name: 'Zonas calientes', measurementType: 3, isActive: false },
  cityId: 1,
  cityName: 'Bogotá',
  nodeId: 2,
  nodeName: 'AMERICAS',
  records: [row(1, '5'), row(2, '1'), row(4, '7'), row(5, '7'), row(12, '3')],
};
describe('Monthly indicator evolution', () => {
  function setup(series: ChartSeries = data) {
    TestBed.configureTestingModule({ imports: [IndicatorTimeline] });
    const fixture = TestBed.createComponent(IndicatorTimeline);
    fixture.componentRef.setInput('data', series);
    fixture.componentRef.setInput('year', 2024);
    fixture.detectChanges();
    return {
      fixture,
      component: fixture.componentInstance,
      element: fixture.nativeElement as HTMLElement,
    };
  }
  it('highlights all peak months and the actual latest recorded month', () => {
    const { component, element } = setup();
    expect(component.stats().maximum?.value).toBe('7');
    expect(component.stats().latest?.month).toBe(12);
    expect(component.stats().latest?.value).toBe('3');
    expect(component.stats().peakMonths).toBe('Abr · May');
    expect(element.querySelectorAll('.timeline-point.is-peak')).toHaveLength(2);
    expect(element.textContent).toContain('Último registro · Diciembre');
    expect(element.textContent).toContain('Inactivo');
  });
  it('splits the line and filled area at missing months without inserting zeroes', () => {
    const { component } = setup();
    const chart = component.geometry();
    expect(chart.points.map((p) => p.record.month)).toEqual([1, 2, 4, 5, 12]);
    expect(chart.line.match(/M/g)).toHaveLength(3);
    expect(chart.areas).toHaveLength(2);
  });
  it('keeps financial maxima exact even beyond JavaScript safe integer precision', () => {
    const records = [
      { ...row(1, '9999999999999999.98'), measurementType: 2 as const },
      { ...row(2, '9999999999999999.99'), measurementType: 2 as const },
    ];
    const { component, element } = setup({
      ...data,
      indicator: { ...data.indicator, measurementType: 2 },
      records,
    });
    expect(component.stats().maximum?.id).toBe(2);
    expect(element.textContent).toContain('$ 9.999.999.999.999.999,99 COP');
  });
  it('does not label zero as a maximum when all recorded values are negative', () => {
    const { component } = setup({ ...data, records: [row(1, '-5'), row(2, '-2')] });
    expect(component.stats().maximum?.value).toBe('-2');
    expect(component.geometry().points.filter((p) => p.peak)).toHaveLength(1);
  });
  it('shows an empty state without fictitious points', () => {
    const { element, component } = setup({ ...data, records: [] });
    expect(element.querySelector('.timeline-scroll svg')).toBeNull();
    expect(element.textContent).toContain('Sin registros');
    expect(component.stats().maximum).toBeNull();
  });
  it('supports focus, keyboard and touch details and clears them when the period changes', () => {
    const { component, fixture, element } = setup();
    const point = element.querySelector('.timeline-point')!;
    point.dispatchEvent(new FocusEvent('focus'));
    fixture.detectChanges();
    expect(element.querySelector('[role=tooltip]')?.textContent).toContain('Enero 2024');
    expect(point.getAttribute('aria-describedby')).toBe(component.chartId() + '-tooltip');
    point.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    fixture.detectChanges();
    expect(component.pinned()).toBe(1);
    point.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    fixture.detectChanges();
    expect(element.querySelector('[role=tooltip]')).toBeNull();
    point.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    fixture.detectChanges();
    expect(component.pinned()).toBe(1);
    fixture.componentRef.setInput('year', 2025);
    fixture.detectChanges();
    expect(component.active()).toBeNull();
    expect(component.pinned()).toBeNull();
  });
});
