import { Type } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../../auth/services/auth.service';
import { Indicator, MonthlyRecord, Page } from '../models/indicators';
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
    locations: vi.fn(() => of(page([{ id: 1, name: 'Bogotá', cityId: null as number | null }]))),
    list: vi.fn(() => of(page([indicator]))),
    records: vi.fn(() => of(page([record]))),
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
  it('shows real records for inactive indicators and links to both CRUD pages', () => {
    const { component, element } = setup(Dashboard);
    expect(element.textContent).toContain('Inactivo');
    expect(element.querySelectorAll('svg circle')).toHaveLength(1);
    expect(element.querySelector('a[href="/dashboard/indicators"]')).not.toBeNull();
    expect(element.querySelector('a[href="/dashboard/records"]')).not.toBeNull();
    expect(component.series()[0].records[0].value).toBe('1972082.25');
    expect(element.textContent).not.toContain('Open incidents');
  });
  it('filters by year, month and indicator and never invents zero values for missing months', () => {
    const { component, api } = setup(Dashboard);
    component.selected.set(indicator);
    component.filters.setValue({ year: 2025, month: 11 });
    component.search();
    expect(api.charts).toHaveBeenLastCalledWith({
      cityId: null,
      nodeId: null,
      year: 2025,
      month: 11,
      indicatorId: 7,
      page: 1,
      pageSize: 6,
    });
    expect(component.series()[0].points).toHaveLength(1);
    expect(component.series()[0].path).toMatch(/^M/);
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
