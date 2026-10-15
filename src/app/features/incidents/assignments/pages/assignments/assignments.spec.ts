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
            { id: 6, name: 'En uso' },
          ],
        }),
      ),
      list: vi.fn(() => of({ rows: [], totalCount: 0, totalPages: 0, page: 1 })),
      detail: vi.fn(),
      delivery: vi.fn(() => of(delivery)),
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
    component.confirmation.nativeElement.showModal = vi.fn();
    component.confirmation.nativeElement.close = vi.fn();
    return { component, fixture, api, params, router };
  }
  function choose(component: Assignments) {
    component.form.controls.deliveryId.setValue('128');
    component.lookup();
    component.form.controls.gcoId.setValue('3');
    component.gcoChanged();
    component.selectPort(port);
  }
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
  it('queries ports only after selecting a GCO', () => {
    const { component, api } = setup();
    component.form.controls.deliveryId.setValue('128');
    component.lookup();
    expect(api.ports).not.toHaveBeenCalled();
    component.form.controls.gcoId.setValue('3');
    component.gcoChanged();
    expect(api.ports).toHaveBeenCalledWith(128, 3, 1, '');
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
    expect(api.save).toHaveBeenCalledWith(null, expect.objectContaining({ equipmentName: null }));
  });
  it('prevents duplicate saves while the first request is pending', () => {
    const { component, api } = setup();
    choose(component);
    api.save.mockReturnValue(new Subject<number>());
    component.save();
    component.save();
    expect(api.save).toHaveBeenCalledTimes(1);
  });
  it('keeps the form on a concurrency error', () => {
    const { component, api } = setup();
    choose(component);
    api.save.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 409 })));
    component.save();
    expect(component.selectedPort()?.id).toBe(10);
    expect(component.error()).toContain('cambió');
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
  it('does not allow a readonly user to save', () => {
    const { component, api } = setup(['assignments.read']);
    choose(component);
    component.save();
    expect(api.save).not.toHaveBeenCalled();
  });
});
