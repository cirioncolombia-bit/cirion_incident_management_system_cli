import { Type } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../../auth/services/auth.service';
import { Indicator, MonthlyRecord, Page, currentYear } from '../models/indicators';
import { IndicatorsService } from '../services/indicators.service';
import { IndicatorCatalog } from './indicator-catalog/indicator-catalog';
import { MonthlyRecords } from './monthly-records/monthly-records';
import { Dashboard } from './dashboard/dashboard';
import { Subject } from 'rxjs';
import { LocationSelect } from '../components/location-select';
import { IndicatorPicker } from '../components/indicator-picker';
const indicator: Indicator = {
  id: 7,
  name: 'Costo operativo',
  measurementType: 2,
  isActive: true,
  hasRecords: true,
  rowVersion: 'AQIDBA==',
};
const record: MonthlyRecord = {
  cityId: 1,
  cityName: 'Bogotá',
  nodeId: 2,
  nodeName: 'Node A',
  id: 9,
  indicatorId: 7,
  indicatorName: indicator.name,
  measurementType: 2,
  indicatorIsActive: true,
  year: 2026,
  month: 11,
  value: '1972082.25',
  rowVersion: 'AQIDBA==',
};
const page = <T>(rows: T[]): Page<T> => ({
  rows,
  page: 1,
  pageSize: 20,
  totalCount: rows.length,
  totalPages: rows.length ? 1 : 0,
});
function setup<T>(type: Type<T>, manage = true) {
  const api = {
    years: vi.fn(() => of([2024, 2022])),
    locations: vi.fn(() => of(page([{ id: 1, name: 'Bogotá', cityId: null as number | null }]))),
    list: vi.fn(() => of(page([indicator]))),
    records: vi.fn(() => of(page([record]))),
    cityCharts: vi.fn(() =>
      of(
        page([
          {
            indicator,
            cityId: 1,
            cityName: 'Bogotá',
            year: 2026,
            month: 11,
            nodes: [{ nodeId: 2, nodeName: 'Node A', value: '1972082.25' }],
            nodePage: 1,
            nodePageSize: 20,
            nodeCount: 1,
            totalNodePages: 1,
            minValue: '1972082.25',
            maxValue: '1972082.25',
          },
        ]),
      ),
    ),
    charts: vi.fn(() =>
      of(
        page([
          {
            indicator: { ...indicator, isActive: false },
            records: [record],
            cityId: 1,
            cityName: 'Bogotá',
            nodeId: 2,
            nodeName: 'Node A',
          },
        ]),
      ),
    ),
    saveIndicator: vi.fn(() => of(indicator)),
    saveRecord: vi.fn(() => of(record)),
    deleteIndicator: vi.fn(() => of(null)),
    deleteRecord: vi.fn(() => of(null)),
  };
  TestBed.configureTestingModule({
    imports: [type],
    providers: [
      provideRouter([]),
      { provide: IndicatorsService, useValue: api },
      {
        provide: AuthService,
        useValue: {
          currentUser: () => ({
            isExternal: false,
            permissions: manage ? ['dashboard.read', 'catalogs.manage'] : ['dashboard.read'],
          }),
        },
      },
    ],
  });
  const fixture = TestBed.createComponent(type);
  fixture.detectChanges();
  for (const dialog of fixture.nativeElement.querySelectorAll(
    'dialog',
  ) as NodeListOf<HTMLDialogElement>) {
    dialog.showModal = vi.fn();
    dialog.close = vi.fn();
  }
  return {
    api,
    fixture,
    component: fixture.componentInstance,
    element: fixture.nativeElement as HTMLElement,
  };
}
describe('Indicator catalog', () => {
  it('locks the unit after records exist and allows renaming without changing the type', () => {
    const { component, api, fixture, element } = setup(IndicatorCatalog);
    component.edit(indicator);
    fixture.detectChanges();
    expect(component.form.controls.measurementType.disabled).toBe(true);
    expect(element.textContent).toContain('Crea un nuevo indicador');
    component.form.controls.name.setValue('Costo actualizado');
    component.save();
    expect(api.saveIndicator).toHaveBeenCalledWith(7, {
      name: 'Costo actualizado',
      measurementType: 2,
      rowVersion: 'AQIDBA==',
    });
    expect(component.success()).toContain('guardado');
  });
  it('creates a new definition with a chosen type and deactivates after confirmation', () => {
    const { component, api } = setup(IndicatorCatalog);
    component.form.setValue({ name: 'Zonas calientes', measurementType: 3 });
    component.save();
    expect(api.saveIndicator).toHaveBeenCalledWith(null, {
      name: 'Zonas calientes',
      measurementType: 3,
      rowVersion: undefined,
    });
    component.askDelete(indicator);
    component.remove();
    expect(api.deleteIndicator).toHaveBeenCalledWith(indicator);
  });
  it('is read only for dashboard viewers, including direct calls to mutation methods', () => {
    const { component, api, element } = setup(IndicatorCatalog, false);
    expect(element.textContent).not.toContain('Guardar indicador');
    component.form.setValue({ name: 'Name', measurementType: 3 });
    component.save();
    component.askDelete(indicator);
    component.remove();
    expect(api.saveIndicator).not.toHaveBeenCalled();
    expect(api.deleteIndicator).not.toHaveBeenCalled();
  });
});
describe('Monthly records', () => {
  it('sends decimal values as invariant strings and keeps the selected year visible', () => {
    const { component, api } = setup(MonthlyRecords);
    component.chooseCity({ id: 1, name: 'Bogotá', cityId: null as number | null });
    component.chooseNode({ id: 2, name: 'Node A', cityId: 1 });
    component.choose(indicator);
    component.form.patchValue({ year: 2025, month: 11, value: '1972082,00' });
    component.save();
    expect(api.saveRecord).toHaveBeenCalledWith(null, {
      cityId: 1,
      nodeId: 2,
      indicatorId: 7,
      year: 2025,
      month: 11,
      value: '1972082.00',
      rowVersion: undefined,
    });
    expect(component.filters.controls.year.value).toBe(2025);
  });
  it('rejects fractional integers and inactive indicators without a request', () => {
    const { component, api, fixture, element } = setup(MonthlyRecords);
    component.choose({ ...indicator, measurementType: 3 });
    component.form.controls.value.setValue('25.5');
    component.save();
    expect(api.saveRecord).not.toHaveBeenCalled();
    component.edit({ ...record, indicatorIsActive: false });
    fixture.detectChanges();
    expect(element.textContent).toContain('Este indicador está inactivo');
    component.save();
    expect(api.saveRecord).not.toHaveBeenCalled();
  });
  it('keeps entered values after a duplicate-period response and allows correction', () => {
    const { component, api } = setup(MonthlyRecords);
    api.saveRecord.mockReturnValueOnce(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 409,
            error: { message: 'A record already exists for this indicator, month and year.' },
          }),
      ),
    );
    component.edit(record);
    component.form.controls.value.setValue('100');
    component.save();
    expect(component.saveError()).toContain('already exists');
    expect(component.form.controls.value.value).toBe('100');
    expect(component.editing()?.id).toBe(9);
    component.form.controls.month.setValue(12);
    component.save();
    expect(api.saveRecord).toHaveBeenCalledTimes(2);
  });
  it('requires a city and node and clears the old node when the city changes', () => {
    const { component, api } = setup(MonthlyRecords);
    component.choose(indicator);
    component.form.controls.value.setValue('100');
    component.save();
    expect(api.saveRecord).not.toHaveBeenCalled();
    component.chooseCity({ id: 1, name: 'Bogotá', cityId: null as number | null });
    component.chooseNode({ id: 2, name: 'Node A', cityId: 1 });
    component.chooseCity({ id: 4, name: 'Cali', cityId: null });
    expect(component.node()).toBeNull();
    expect(component.form.controls.nodeId.value).toBeNull();
    component.save();
    expect(api.saveRecord).not.toHaveBeenCalled();
  });
  it('deletes a monthly value and reloads without changing its definition', () => {
    const { component, api } = setup(MonthlyRecords);
    component.askDelete(record);
    component.remove();
    expect(api.deleteRecord).toHaveBeenCalledWith(record);
    expect(api.deleteIndicator).not.toHaveBeenCalled();
  });
});
describe('Indicator dashboard', () => {
  it('selects recorded years as numbers and resets to the current year', () => {
    const { component, fixture, element, api } = setup(Dashboard);
    const select = element.querySelector<HTMLSelectElement>('select[formcontrolname="year"]')!;
    expect(select).not.toBeNull();
    expect(element.querySelector('input[formcontrolname="year"]')).toBeNull();
    expect(Array.from(select.options, x => Number(x.textContent))).toEqual(
      [...new Set([currentYear(), 2024, 2022])].sort((a, b) => b - a),
    );
    select.selectedIndex = Array.from(select.options).findIndex(x => x.textContent?.trim() === '2022');
    select.dispatchEvent(new Event('change'));
    component.search();
    expect(api.cityCharts).toHaveBeenLastCalledWith(expect.objectContaining({ year: 2022 }));
    component.clear();
    fixture.detectChanges();
    expect(component.filters.controls.year.value).toBe(currentYear());
    expect(Number(select.selectedOptions[0].textContent)).toBe(currentYear());
  });
  it('allows retrying a failed year lookup while retaining the current year', () => {
    const { component, api, fixture, element } = setup(Dashboard);
    api.years.mockReturnValueOnce(throwError(() => new Error('Network error')));
    component.loadYears();
    fixture.detectChanges();
    expect(element.querySelector('[role="alert"]')?.textContent).toContain('No fue posible cargar los años');
    expect(component.years()).toContain(currentYear());
    component.loadYears();
    fixture.detectChanges();
    expect(element.querySelector('[role="alert"]')).toBeNull();
  });
  it('shows real records for inactive indicators and links to both CRUD pages', () => {
    const { component, fixture, element } = setup(Dashboard);
    component.filters.controls.view.setValue('timeline');
    component.search();
    fixture.detectChanges();
    expect(element.textContent).toContain('Inactivo');
    expect(element.querySelectorAll('.timeline-point')).toHaveLength(1);
    expect(element.querySelector('a[href="/dashboard/indicators"]')).not.toBeNull();
    expect(element.querySelector('a[href="/dashboard/records"]')).not.toBeNull();
    expect(component.series()[0].records[0].value).toBe('1972082.25');
    expect(element.textContent).not.toContain('Open incidents');
  });
  it('distinguishes an empty period from a failed request without the permanent hot-zone instruction', () => {
    const { component, api, fixture, element } = setup(Dashboard);
    api.cityCharts.mockReturnValueOnce(of(page([])));
    component.filters.patchValue({ year: 2025, month: 10 });
    component.search();
    fixture.detectChanges();
    expect(element.textContent).toContain('No hay registros mensuales activos para Octubre 2025');
    expect(element.textContent).not.toContain('Selecciona «Zonas calientes»');
    component.filters.controls.month.setValue(11);
    fixture.detectChanges();
    expect(element.textContent).toContain('Octubre 2025');
    api.cityCharts.mockReturnValueOnce(
      throwError(() => new HttpErrorResponse({ status: 500, error: { message: 'Server error' } })),
    );
    component.search();
    fixture.detectChanges();
    expect(element.textContent).toContain('Server error');
    expect(element.textContent).not.toContain('No hay registros mensuales activos');
  });
  it('locks month to All months in timeline and restores an enabled month for city rankings', () => {
    const { component, fixture, element, api } = setup(Dashboard);
    component.filters.controls.month.setValue(5);
    component.filters.controls.view.setValue('timeline');
    fixture.detectChanges();
    const month = element.querySelector<HTMLSelectElement>('select[formcontrolname="month"]')!;
    expect(component.filters.controls.month.disabled).toBe(true);
    expect(component.filters.controls.month.value).toBeNull();
    expect(month.disabled).toBe(true);
    expect(month.selectedOptions[0].textContent).toContain('Todos los meses');
    component.search();
    expect(api.charts.mock.calls.at(-1)).toBeDefined();
    component.filters.controls.view.setValue('city');
    fixture.detectChanges();
    expect(month.disabled).toBe(false);
    expect(component.filters.controls.month.value).not.toBeNull();
    component.filters.controls.view.setValue('timeline');
    component.clear();
    fixture.detectChanges();
    expect(month.disabled).toBe(false);
    expect(component.filters.controls.view.value).toBe('city');
  });
  it('keeps the annual option selected for city rankings and sends no month', () => {
    const { component, api, fixture, element } = setup(Dashboard);
    component.filters.controls.month.setValue(null);
    component.search();
    fixture.detectChanges();
    expect(component.filters.controls.month.disabled).toBe(false);
    expect(component.filters.controls.month.value).toBeNull();
    const month = element.querySelector<HTMLSelectElement>('select[formcontrolname="month"]')!;
    expect(month.selectedOptions[0].textContent).toContain('Total anual');
    expect(api.cityCharts).toHaveBeenLastCalledWith(expect.objectContaining({ month: null }));
    expect(component.appliedPeriod()).toContain('Resumen anual');
    component.filters.controls.month.setValue(5);
    component.search();
    expect(api.cityCharts).toHaveBeenLastCalledWith(expect.objectContaining({ month: 5 }));
  });
  it('filters timeline by year and indicator while always requesting all months', () => {
    const { component, api } = setup(Dashboard);
    component.selected.set(indicator);
    component.filters.setValue({ view: 'timeline', year: 2025, month: 11 });
    component.search();
    expect(api.charts).toHaveBeenLastCalledWith({
      cityId: null,
      nodeId: null,
      year: 2025,
      month: null,
      indicatorId: 7,
      page: 1,
      pageSize: 6,
    });
    expect(component.series()[0].records).toHaveLength(1);
  });
});
describe('Location choices', () => {
  it('does not query nodes without a city and cancels stale queries when city changes', () => {
    const { component, fixture, api } = setup(LocationSelect);
    fixture.componentRef.setInput('kind', 'nodes');
    fixture.detectChanges();
    api.locations.mockClear();
    const old = new Subject<Page<{ id: number; name: string; cityId: number | null }>>();
    api.locations.mockReturnValueOnce(old);
    fixture.componentRef.setInput('parentCityId', 1);
    fixture.detectChanges();
    expect(old.observed).toBe(true);
    expect(api.locations).toHaveBeenLastCalledWith('nodes', {
      page: 1,
      pageSize: 20,
      cityId: 1,
      search: '',
      includeInactive: false,
    });
    fixture.componentRef.setInput('parentCityId', 2);
    fixture.detectChanges();
    expect(old.observed).toBe(false);
    fixture.componentRef.setInput('parentCityId', null);
    fixture.detectChanges();
    expect(component.result()).toBeNull();
  });
});

describe('Indicator picker', () => {
  it('queries active choices with bounded paging and keeps the applied search while paging', () => {
    const { component, api } = setup(IndicatorPicker);
    component.search.setValue('Costo');
    component.load(1);
    component.search.setValue('Unapplied');
    component.load(2);
    expect(api.list).toHaveBeenLastCalledWith({
      page: 2,
      pageSize: 20,
      search: 'Costo',
      includeInactive: false,
    });
  });
});
