import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, Subject } from 'rxjs';
import { CityRanking } from './city-ranking';
import { CityRank, Page } from '../models/indicators';
import { IndicatorsService } from '../services/indicators.service';
const data: CityRank = {
  indicator: { id: 7, name: 'Zonas calientes', measurementType: 3, isActive: false },
  cityId: 1,
  cityName: 'Bogotá',
  year: 2026,
  month: 11,
  nodes: [
    { nodeId: 2, nodeName: 'Node A', value: '30' },
    { nodeId: 3, nodeName: 'Node B', value: '10' },
  ],
  nodePage: 1,
  nodePageSize: 20,
  nodeCount: 21,
  totalNodePages: 2,
  minValue: '0',
  maxValue: '30',
};
describe('City node comparison', () => {
  function setup() {
    const api = {
      cityCharts: vi.fn(() =>
        of({
          rows: [{ ...data, nodePage: 2, nodes: [{ nodeId: 4, nodeName: 'Node C', value: '5' }] }],
        } as Page<CityRank>),
      ),
    };
    TestBed.configureTestingModule({
      imports: [CityRanking],
      providers: [provideRouter([]), { provide: IndicatorsService, useValue: api }],
    });
    const fixture = TestBed.createComponent(CityRanking);
    fixture.componentRef.setInput('data', data);
    fixture.detectChanges();
    return {
      api,
      fixture,
      component: fixture.componentInstance,
      element: fixture.nativeElement as HTMLElement,
    };
  }
  it('shows one city with its ranked nodes, exact values and inactive indicator history', () => {
    const { api, component, element } = setup();
    expect(element.textContent).toContain('Bogotá');
    expect(element.textContent).toContain('Noviembre 2026');
    expect(element.textContent).toContain('Node A');
    expect(element.textContent).toContain('Node B');
    expect(element.textContent).toContain('Indicador inactivo');
    expect(component.bars()[0].height).toBe(100);
    expect(component.bars()[1].height).toBeCloseTo(33.3333, 3);
    expect(api.cityCharts).not.toHaveBeenCalled();
  });
  it('renders vertical columns with integer ticks and keeps zero and negative values accurate', () => {
    const { component, fixture, element } = setup();
    expect(element.querySelectorAll('.columns .bar')).toHaveLength(2);
    expect(element.querySelector('.bar')?.getAttribute('style')).toContain('height: 100%');
    fixture.componentRef.setInput('data', {
      ...data,
      minValue: '-5',
      maxValue: '5',
      nodes: [
        { nodeId: 1, nodeName: 'Positive', value: '5' },
        { nodeId: 2, nodeName: 'Zero', value: '0' },
        { nodeId: 3, nodeName: 'Negative', value: '-5' },
      ],
    });
    fixture.detectChanges();
    expect(component.bars()[1].height).toBe(0);
    expect(component.bars()[2].bottom).toBe(0);
    expect(component.bars()[2].negative).toBe(true);
    expect(component.scale().ticks.every((tick) => Number.isInteger(Number(tick.value)))).toBe(
      true,
    );
    expect(element.querySelector('.chart-scroll')?.getAttribute('tabindex')).toBe('0');
  });
  it('paginates nodes only within this indicator/city/month without truncating the city ranking', () => {
    const { api, component } = setup();
    component.load(2);
    expect(api.cityCharts).toHaveBeenCalledWith({
      year: 2026,
      month: 11,
      indicatorId: 7,
      cityId: 1,
      nodeId: null,
      page: 1,
      pageSize: 1,
      nodePage: 2,
      nodePageSize: 20,
    });
    expect(component.chart().nodes[0].nodeName).toBe('Node C');
  });
  it('keeps the global leader and position colors when moving to another node page', () => {
    const { component, fixture, element } = setup();
    expect(component.leader()?.nodeName).toBe('Node A');
    expect(component.bars()[0].rank).toBe(1);
    expect(element.querySelectorAll('.bar.rank-first')).toHaveLength(1);
    component.load(2);
    fixture.detectChanges();
    expect(component.leader()?.nodeName).toBe('Node A');
    expect(component.leader()?.value).toBe('30');
    expect(component.bars()[0].rank).toBe(21);
    expect(element.querySelector('.leader-name')?.textContent).toContain('Node A');
    expect(element.querySelectorAll('.bar.rank-first')).toHaveLength(0);
  });
  it('shows accessible node details with focus or touch, dismisses with Escape and resets for a new period', () => {
    const { component, fixture, element } = setup();
    const button = element.querySelector<HTMLButtonElement>('.column-target')!;
    button.dispatchEvent(new FocusEvent('focus'));
    fixture.detectChanges();
    const tooltip = element.querySelector('[role=tooltip]')!;
    expect(tooltip.textContent).toContain('Node A');
    expect(tooltip.textContent).toContain('Bogotá · Noviembre 2026');
    expect(button.getAttribute('aria-describedby')).toBe(tooltip.id);
    button.click();
    component.hidePreview();
    fixture.detectChanges();
    expect(button.getAttribute('aria-pressed')).toBe('true');
    expect(component.tooltipNode()?.nodeId).toBe(2);
    button.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    fixture.detectChanges();
    expect(element.querySelector('[role=tooltip]')).toBeNull();
    button.click();
    fixture.detectChanges();
    document.body.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }));
    fixture.detectChanges();
    expect(component.tooltipNode()).toBeNull();
    button.click();
    fixture.detectChanges();
    fixture.componentRef.setInput('data', { ...data, month: 12 });
    fixture.detectChanges();
    expect(component.tooltipNode()).toBeNull();
    expect(component.pinnedNodeId()).toBeNull();
  });
  it('labels annual totals and percentage averages and keeps the annual period when paging', () => {
    const { component, fixture, api, element } = setup();
    fixture.componentRef.setInput('data', {
      ...data,
      month: null,
      isAnnual: true,
      aggregation: 'sum',
      nodes: [{ nodeId: 2, nodeName: 'Node A', value: '70', monthsRecorded: 3 }],
    });
    fixture.detectChanges();
    expect(element.textContent).toContain('Total anual 2026');
    expect(element.textContent).toContain('Suma de meses registrados');
    component.load(2);
    expect(api.cityCharts).toHaveBeenLastCalledWith(expect.objectContaining({ month: null }));
    fixture.componentRef.setInput('data', {
      ...data,
      indicator: { ...data.indicator, measurementType: 1 },
      month: null,
      isAnnual: true,
      aggregation: 'average',
    });
    fixture.detectChanges();
    expect(element.textContent).toContain('Promedio anual 2026');
    expect(element.textContent).toContain('Promedio de meses registrados');
  });
  it('cancels an obsolete node page when the main filters change', () => {
    const { api, component, fixture } = setup();
    const pending = new Subject<Page<CityRank>>();
    api.cityCharts.mockReturnValueOnce(pending);
    component.load(2);
    expect(pending.observed).toBe(true);
    fixture.componentRef.setInput('data', { ...data, month: 12 });
    fixture.detectChanges();
    expect(pending.observed).toBe(false);
    expect(component.chart().month).toBe(12);
  });
});
