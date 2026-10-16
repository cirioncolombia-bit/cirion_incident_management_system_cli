import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { vi } from 'vitest';
import { Assignments } from './assignments';
import { AssignmentsService, DeliveryLookup, PortOption } from '../../services/assignments.service';
const delivery: DeliveryLookup = {
  id: 128,
  workOrderId: 'DKO-42',
  clientName: 'Cliente',
  buildingSite: 'Sede',
  address: 'Dirección',
  cityId: 1,
  cityName: 'Bogotá',
  nodeId: 2,
  nodeName: 'SUBA',
  gcos: [{ id: 3, name: 'GCO 3' }],
};
const port: PortOption = {
  id: 10,
  fiberTrayId: 4,
  fiberTrayName: 'FIBER TRAY 156',
  gcoId: 3,
  portNumber: 2,
  equipmentName: null,
  statusId: 5,
  statusName: 'Disponible',
  rowVersion: 'AAAAAAAAAAE=',
};
describe('Assignments workflow', () => {
  function setup(permissions = ['assignments.read', 'assignments.write']) {
    const params = new Subject<ReturnType<typeof convertToParamMap>>();
    const api = {
      me: vi.fn(() => of({ permissions })),
      options: vi.fn(() =>
        of({
          statuses: [
            { id: 5, name: 'Disponible' },
            { id: 6, name: 'En uso', requiresEquipment: false },
            { id: 7, name: 'OCUPADO', requiresEquipment: true },
          ],
        }),
      ),
      list: vi.fn(() => of({ rows: [], totalCount: 0, totalPages: 0, page: 1 })),
      equipment: vi.fn(() =>
        of({ rows: [{ id: 12, name: 'Equipment A' }], page: 1, totalPages: 1, totalCount: 1 }),
      ),
      detail: vi.fn(),
      delivery: vi.fn(() => of(delivery)),
      fiberTrays: vi.fn(() =>
        of([
          { id: 4, name: 'FIBER TRAY 156' },
          { id: 8, name: 'FIBER TRAY 157' },
        ]),
      ),
      ports: vi.fn(() => of({ rows: [port], totalPages: 1, page: 1, totalCount: 1 })),
      save: vi.fn(() => of(7)),
      deactivate: vi.fn(() => of<void>(void 0)),
    };
    const router = { navigate: vi.fn(() => Promise.resolve(true)) };
    TestBed.configureTestingModule({
      imports: [Assignments],
      providers: [
        { provide: AssignmentsService, useValue: api },
        { provide: ActivatedRoute, useValue: { queryParamMap: params } },
        { provide: Router, useValue: router },
      ],
    });
    const fixture = TestBed.createComponent(Assignments);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    component.saveConfirmation.nativeElement.showModal = vi.fn();
    component.saveConfirmation.nativeElement.close = vi.fn();
    component.confirmation.nativeElement.showModal = vi.fn();
    component.confirmation.nativeElement.close = vi.fn();
    return { component, fixture, api, params, router };
  }
  function choose(component: Assignments) {
    component.form.controls.deliveryId.setValue('128');
    component.lookup();
    component.form.controls.gcoId.setValue('3');
    component.gcoChanged();
    component.form.controls.fiberTrayId.setValue('4');
    component.trayChanged();
    component.selectPort(port);
  }
  it('recognizes catalog colors with numbers, accents and different casing', () => {
    const { component } = setup();
    expect(component.portColor('01 ROJO')).toBe('#dc2626');
    expect(component.portColor('02AZUL')).toBe('#2563eb');
    expect(component.portColor(' Marrón ')).toBe('#92400e');
    expect(component.portColor('WHITE')).toBe('#ffffff');
    expect(component.portColor('Unknown')).toBe('#cbd5e1');
    expect(component.portColor(null)).toBe('#cbd5e1');
  });
  it('does not load assignments without permission', () => {
    const { api, component } = setup([]);
    expect(component.canRead()).toBe(false);
    expect(api.list).not.toHaveBeenCalled();
  });
  it('fills Delivery data and limits GCO options to server response', () => {
    const { component, api } = setup();
    component.form.controls.deliveryId.setValue('128');
    component.lookup();
    expect(api.delivery).toHaveBeenCalledWith(128);
    expect(component.delivery()?.nodeName).toBe('SUBA');
    expect(component.delivery()?.gcos.map((g) => g.id)).toEqual([3]);
  });
  it('queries ports only after selecting a GCO and FiberTray', () => {
    const { component, api } = setup();
    component.form.controls.deliveryId.setValue('128');
    component.lookup();
    expect(api.ports).not.toHaveBeenCalled();
    component.form.controls.gcoId.setValue('3');
    component.gcoChanged();
    expect(api.fiberTrays).toHaveBeenCalledWith(128, 3);
    expect(api.ports).not.toHaveBeenCalled();
    component.form.controls.fiberTrayId.setValue('4');
    component.trayChanged();
    expect(api.ports).toHaveBeenCalledWith(128, 3, 1, '', 4, undefined);
  });
  it('clears port and equipment when the Delivery or GCO changes', () => {
    const { component } = setup();
    choose(component);
    component.form.controls.equipmentName.setValue('Equipo');
    component.gcoChanged();
    expect(component.selectedPort()).toBeNull();
    expect(component.form.controls.equipmentName.value).toBe('');
    component.deliveryChanged();
    expect(component.delivery()).toBeNull();
  });
  it('requires equipment for occupied ports before confirmation, and removes that requirement for other states', () => {
    const { component, api } = setup();
    choose(component);
    component.form.patchValue({ statusId: '7', equipmentName: '   ' });
    component.save();
    expect(component.form.controls.equipmentName.hasError('required')).toBe(true);
    expect(component.saveConfirmation.nativeElement.showModal).not.toHaveBeenCalled();
    expect(api.save).not.toHaveBeenCalled();
    component.form.controls.equipmentName.setValue('New equipment');
    component.save();
    component.confirmSave();
    expect(api.save).toHaveBeenCalledWith(
      null,
      expect.objectContaining({ statusId: 7, equipmentName: 'New equipment' }),
    );
    component.form.patchValue({ statusId: '5', equipmentName: '' });
    expect(component.form.controls.equipmentName.valid).toBe(true);
  });
  it('loads equipment for the selected FiberTray and allows choosing a suggestion', () => {
    const { component, api } = setup();
    choose(component);
    component.openEquipment();
    expect(api.equipment).toHaveBeenCalledWith(128, 3, 4, '');
    component.chooseEquipment({ id: 12, name: 'Equipment A' });
    expect(component.form.controls.equipmentName.value).toBe('Equipment A');
    expect(component.equipmentOpen()).toBe(false);
    component.form.controls.fiberTrayId.setValue('8');
    component.trayChanged();
    expect(component.form.controls.equipmentName.value).toBe('');
    expect(component.equipmentOptions()).toEqual([]);
  });
  it('ignores equipment suggestions returned for a previous FiberTray', () => {
    const { component, api } = setup();
    choose(component);
    const pending = new Subject<{
      rows: { id: number; name: string }[];
      page: number;
      totalPages: number;
      totalCount: number;
    }>();
    api.equipment.mockReturnValue(pending);
    component.openEquipment();
    component.form.controls.fiberTrayId.setValue('8');
    component.trayChanged();
    pending.next({
      rows: [{ id: 99, name: 'Old tray equipment' }],
      page: 1,
      totalPages: 1,
      totalCount: 1,
    });
    pending.complete();
    expect(component.equipmentOptions()).toEqual([]);
  });
  it('requires confirmation and cancels without sending a request', () => {
    const { component, api } = setup();
    choose(component);
    component.save();
    expect(component.saveConfirmation.nativeElement.showModal).toHaveBeenCalled();
    expect(api.save).not.toHaveBeenCalled();
    component.cancelSave();
    component.confirmSave();
    expect(api.save).not.toHaveBeenCalled();
  });
  it('rejects saving without consulting and selecting a port', () => {
    const { component, api } = setup();
    component.save();
    expect(api.save).not.toHaveBeenCalled();
    expect(component.error()).not.toBe('');
  });
  it('sends the selected port and version with requested status and equipment', () => {
    const { component, api } = setup();
    choose(component);
    component.form.patchValue({ statusId: '6', equipmentName: ' Equipo nuevo ' });
    component.save();
    component.confirmSave();
    expect(api.save).toHaveBeenCalledWith(null, {
      deliveryId: 128,
      portId: 10,
      statusId: 6,
      equipmentName: 'Equipo nuevo',
      portVersion: port.rowVersion,
    });
  });
  it('does not send equipment when its name is blank', () => {
    const { component, api } = setup();
    choose(component);
    component.save();
    component.confirmSave();
    expect(api.save).toHaveBeenCalledWith(null, expect.objectContaining({ equipmentName: null }));
  });
  it('prevents duplicate saves while the first request is pending', () => {
    const { component, api } = setup();
    choose(component);
    api.save.mockReturnValue(new Subject<number>());
    component.save();
    component.confirmSave();
    component.confirmSave();
    expect(api.save).toHaveBeenCalledTimes(1);
  });
  it('keeps the form on a concurrency error', () => {
    const { component, api } = setup();
    choose(component);
    api.save.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 409 })));
    component.save();
    component.confirmSave();
    expect(component.selectedPort()?.id).toBe(10);
    expect(component.error()).toContain('changed');
  });
  it('ignores stale Delivery lookup responses', () => {
    const { component, api } = setup();
    const pending = new Subject<DeliveryLookup>();
    api.delivery.mockReturnValue(pending);
    component.form.controls.deliveryId.setValue('128');
    component.lookup();
    component.deliveryChanged();
    component.form.controls.deliveryId.setValue('129');
    pending.next(delivery);
    pending.complete();
    expect(component.delivery()).toBeNull();
    expect(component.lookupBusy()).toBe(false);
  });
  it('filters by state before pagination and clears the previous port', () => {
    const { component, api } = setup();
    choose(component);
    component.portPage.set(3);
    component.statusFilter.setValue('6');
    component.statusChanged();
    expect(component.selectedPort()).toBeNull();
    expect(api.ports).toHaveBeenLastCalledWith(128, 3, 1, '', 4, 6);
    component.statusFilter.setValue('');
    component.statusChanged();
    expect(api.ports).toHaveBeenLastCalledWith(128, 3, 1, '', 4, undefined);
  });
  it('clears downstream filters when the FiberTray or GCO changes', () => {
    const { component } = setup();
    choose(component);
    component.statusFilter.setValue('6');
    component.form.controls.fiberTrayId.setValue('8');
    component.trayChanged();
    expect(component.selectedPort()).toBeNull();
    expect(component.statusFilter.value).toBe('');
    component.gcoChanged();
    expect(component.form.controls.fiberTrayId.value).toBe('');
  });
  it('ignores a stale FiberTray response after changing Delivery', () => {
    const { component, api } = setup();
    const pending = new Subject<{ id: number; name: string }[]>();
    api.fiberTrays.mockReturnValue(pending);
    component.form.controls.deliveryId.setValue('128');
    component.lookup();
    component.form.controls.gcoId.setValue('3');
    component.gcoChanged();
    component.deliveryChanged();
    pending.next([{ id: 4, name: 'Old tray' }]);
    pending.complete();
    expect(component.fiberTrays()).toEqual([]);
    expect(component.traysBusy()).toBe(false);
  });
  it('restores the selected FiberTray and port when editing', () => {
    const { component } = setup();
    component.form.controls.deliveryId.setValue('128');
    component.lookup({ id: 7, deliveryId: 128, gcoId: 3, port } as any);
    expect(component.form.controls.fiberTrayId.value).toBe('4');
    expect(component.selectedPort()?.id).toBe(10);
  });
  it('does not allow a readonly user to save', () => {
    const { component, api } = setup(['assignments.read']);
    choose(component);
    component.save();
    expect(api.save).not.toHaveBeenCalled();
  });
});
