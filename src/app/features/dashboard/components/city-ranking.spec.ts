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
    expect(component.bars()[0].width).toBe(100);
    expect(component.bars()[1].width).toBeCloseTo(33.3333, 3);
    expect(api.cityCharts).not.toHaveBeenCalled();
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
