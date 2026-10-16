import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { of, Subject, throwError } from 'rxjs';
import { vi } from 'vitest';
import { AuthService } from '../../auth/services/auth.service';
import { NetworkAdministration } from './network';
import { NetworkService } from './services/network.service';
import { NetworkPage, NetworkRecord } from './network.models';

const city: NetworkRecord = {
  id: 2,
  name: 'City A',
  isActive: true,
  parentId: 1,
  parentName: 'Country A',
};
const country: NetworkRecord = { id: 1, name: 'Country A', isActive: true };
const port: NetworkRecord = {
  id: 10,
  name: 'Port 1',
  isActive: true,
  parentId: 5,
  parentName: 'TRAY A',
  portNumberId: 8,
  portNumber: 1,
  statusId: 6,
  statusName: 'LIBRE',
  equipmentId: null,
  conduitId: 21,
  conduitName: '01 ROJO',
  fiberColorId: 22,
  fiberColorName: 'AZUL',
  rowVersion: 'AAAAAAAAAAE=',
};

describe('Network administration workflow', () => {
  function setup(permissions = ['catalogs.read', 'catalogs.manage'], external = false) {
    const api = {
      list: vi.fn(() => of<NetworkPage>({ rows: [city], page: 1, totalCount: 1, totalPages: 1 })),
      detail: vi.fn(() => of<NetworkRecord>(city)),
      ancestors: vi.fn(() => of<NetworkRecord[]>([country])),
      save: vi.fn(() => of({ data: 2 })),
      deactivate: vi.fn(() => of<void>(undefined)),
    };
    TestBed.configureTestingModule({
      imports: [NetworkAdministration],
      providers: [
        { provide: NetworkService, useValue: api },
        {
          provide: AuthService,
          useValue: { loadCurrentUser: () => of({ permissions, isExternal: external }) },
        },
      ],
    });
    const fixture = TestBed.createComponent(NetworkAdministration);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    component.editor.nativeElement.showModal = vi.fn();
    component.editor.nativeElement.close = vi.fn();
    component.confirmation.nativeElement.showModal = vi.fn();
    component.confirmation.nativeElement.close = vi.fn();
    return { fixture, component, api };
  }

  it('does not request records or allow writes without internal catalog access', () => {
    const { component, api } = setup(['catalogs.read', 'catalogs.manage'], true);
    component.openEditor(city);
    component.confirmDeactivation(city);
    component.save();
    expect(api.list).not.toHaveBeenCalled();
    expect(api.detail).not.toHaveBeenCalled();
    expect(api.save).not.toHaveBeenCalled();
  });
  it('allows consultation but hides mutation controls from catalog readers', () => {
    const { component, fixture, api } = setup(['catalogs.read']);
    expect(api.list).toHaveBeenCalled();
    expect(fixture.nativeElement.querySelector('.record-actions')).toBeNull();
    expect(fixture.nativeElement.querySelector('.create')).toBeNull();
    component.openEditor(city);
    expect(api.detail).not.toHaveBeenCalled();
  });
  it('keeps countries read-only even for managers', () => {
    const { component, api, fixture } = setup();
    component.changeCatalog('Countries');
    fixture.detectChanges();
    component.openEditor(country);
    component.confirmDeactivation(country);
    component.save();
    expect(fixture.nativeElement.querySelector('.create')).toBeNull();
    expect(api.save).not.toHaveBeenCalled();
  });
  it('restores the edited record and its selected ancestor labels', () => {
    const { component } = setup();
    component.openEditor(city);
    expect(component.form.controls.name.value).toBe('City A');
    expect(component.locationId('countryId')).toBe(1);
    expect(component.selections().countryId?.name).toBe('Country A');
  });
  it('rejects blank and oversized city names before sending a transaction', () => {
    const { component, api } = setup();
    component.openEditor();
    component.form.patchValue({ countryId: '1', name: '   ' });
    component.save();
    expect(component.invalid('name')).toBe(true);
    expect(api.save).not.toHaveBeenCalled();
    component.form.controls.name.setValue('a'.repeat(51));
    component.save();
    expect(api.save).not.toHaveBeenCalled();
  });
  it('saves a city through the existing contract with trimmed text', () => {
    const { component, api } = setup();
    component.openEditor(city);
    component.form.controls.name.setValue(' Updated City ');
    component.save();
    expect(api.save).toHaveBeenCalledWith('Cities', 2, { cityName: 'Updated City', countryId: 1 });
    expect(component.editor.nativeElement.close).toHaveBeenCalled();
  });
  it('clears lower locations when a parent changes', () => {
    const { component } = setup();
    component.changeCatalog('Ports');
    component.openEditor();
    component.form.patchValue({
      countryId: '1',
      cityId: '2',
      nodeId: '3',
      gcoId: '4',
      fiberTrayId: '5',
    });
    component.chooseLocation('cityId', { id: 99, name: 'New City', isActive: true });
    expect(component.locationId('countryId')).toBe(1);
    expect(component.locationId('cityId')).toBe(99);
    expect(component.locationId('nodeId')).toBeNull();
    expect(component.locationId('gcoId')).toBeNull();
    expect(component.locationId('fiberTrayId')).toBeNull();
  });
  it('preserves the port version and can clear optional equipment and optical links', () => {
    const { component, api } = setup();
    component.changeCatalog('Ports');
    api.detail.mockReturnValue(of(port));
    component.openEditor(port);
    component.form.patchValue({
      countryId: '1',
      cityId: '2',
      nodeId: '3',
      gcoId: '4',
      fiberTrayId: '5',
    });
    component.chooseReference('conduitId', null);
    component.chooseReference('fiberColorId', null);
    component.save();
    expect(api.save).toHaveBeenCalledWith('Ports', 10, {
      fiberTrayId: 5,
      portNumberId: 8,
      statusId: 6,
      equipmentId: null,
      conduitId: null,
      fiberColorId: null,
      rowVersion: port.rowVersion,
    });
  });
  it('requires equipment for occupied administrative ports', () => {
    const { component, api } = setup();
    component.changeCatalog('Ports');
    api.detail.mockReturnValue(of(port));
    component.openEditor(port);
    component.form.patchValue({
      countryId: '1',
      cityId: '2',
      nodeId: '3',
      gcoId: '4',
      fiberTrayId: '5',
    });
    component.chooseReference('statusId', { id: 7, name: ' OCUPADO ', isActive: true });
    component.save();
    expect(component.invalid('equipmentId')).toBe(true);
    expect(api.save).not.toHaveBeenCalled();
    component.chooseReference('equipmentId', { id: 12, name: 'Equipment A', isActive: true });
    component.save();
    expect(api.save).toHaveBeenCalledWith(
      'Ports',
      10,
      expect.objectContaining({ equipmentId: 12, statusId: 7 }),
    );
  });
  it('does not save after an editor preparation error', () => {
    const { component, api } = setup();
    api.detail.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 404 })));
    component.openEditor(city);
    component.save();
    expect(component.formReady()).toBe(false);
    expect(api.save).not.toHaveBeenCalled();
  });
  it('keeps the editor open and displays dependency counts from a conflict', () => {
    const { component, api } = setup();
    component.openEditor(city);
    api.save.mockReturnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 409,
            error: { message: 'Resolve dependent records first: Nodes: 2.' },
          }),
      ),
    );
    component.save();
    expect(component.formError()).toContain('Nodes: 2');
    expect(component.editor.nativeElement.close).not.toHaveBeenCalled();
  });
  it('requires deactivation confirmation and preserves the record on a dependency conflict', () => {
    const { component, api } = setup();
    component.confirmDeactivation(city);
    expect(api.deactivate).not.toHaveBeenCalled();
    api.deactivate.mockReturnValue(
      throwError(
        () => new HttpErrorResponse({ status: 409, error: { message: 'Active nodes exist.' } }),
      ),
    );
    component.deactivate();
    expect(component.deletionError()).toBe('Active nodes exist.');
    expect(component.confirmation.nativeElement.close).not.toHaveBeenCalled();
  });
  it('prevents duplicate saves while the first request is pending', () => {
    const { component, api } = setup();
    component.openEditor(city);
    api.save.mockReturnValue(new Subject<{ data: number }>());
    component.save();
    component.save();
    expect(api.save).toHaveBeenCalledTimes(1);
  });
  it('ignores stale list responses after switching catalogs', () => {
    const { component, api } = setup();
    const pending = new Subject<NetworkPage>();
    api.list.mockReturnValueOnce(pending);
    component.reload();
    component.changeCatalog('Equipment');
    pending.next({ rows: [port], page: 1, totalCount: 1, totalPages: 1 });
    pending.complete();
    expect(component.rows()).toEqual([city]);
  });
});
