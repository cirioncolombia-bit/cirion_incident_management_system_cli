import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { DeliveryNew } from './delivery-new';
import { DeliveryClientPicker } from '../../components/delivery-client-picker/delivery-client-picker';
import { DeliveryService } from '../../services/delivery.service';
import { AuthService } from '../../../../auth/services/auth.service';

const client = { id: 7, name: 'Selected client', siteType: 'Office', address: 'Client address' };

describe('New Delivery client selection', () => {
  function setup() {
    const api = {
      getCreateOptions: () => of({ cities: [{ id: 1, name: 'City' }], nodes: [{ id: 2, name: 'Node', cityId: 1 }],
        deliveryTypes: [{ id: 3, name: 'Type' }], deliveryStatuses: [{ id: 4, name: 'EN PROCESO' }],
        deliveryTechnologies: [{ id: 5, name: 'Technology' }], landlords: [], eaims: [{ id: 6, name: 'EAIM' }],
        deliveryCauses: [], responsibles: [{ id: 8, name: 'Responsible', eaimId: 6 }] }),
      lookupClients: vi.fn(() => of({ rows: [client], page: 1, pageSize: 10, hasNextPage: false })),
      create: vi.fn(() => of({ id: 42 })),
    };
    TestBed.configureTestingModule({ imports: [DeliveryNew], providers: [provideRouter([]),
      { provide: AuthService, useValue: { currentUser: () => ({ permissions: ['deliveries.read', 'deliveries.write'] }) } },
      { provide: DeliveryService, useValue: api }] });
    const fixture = TestBed.createComponent(DeliveryNew); fixture.detectChanges();
    const picker = fixture.debugElement.query(By.directive(DeliveryClientPicker)).componentInstance as DeliveryClientPicker;
    const element = fixture.nativeElement as HTMLElement;
    for (const dialog of element.querySelectorAll<HTMLDialogElement>('dialog')) {
      dialog.showModal = vi.fn(() => dialog.setAttribute('open', ''));
      dialog.close = vi.fn(() => dialog.removeAttribute('open'));
    }
    return { api, fixture, picker, element, component: fixture.componentInstance };
  }

  it('opens the picker from a sibling magnifier and fills only actual client-owned fields', () => {
    const { component, picker, element, fixture } = setup();
    component.form.patchValue({ city: 1, node: 2, revenue: '100' });
    element.querySelector<HTMLButtonElement>('button[aria-label="Search and select a client"]')!.click();
    expect(picker.opened()).toBe(true);
    expect(element.querySelector('.client-location-header button button')).toBeNull();
    picker.searchForm.controls.search.setValue('Selected'); picker.searchClients();
    picker.pending.set(client); picker.confirm(); fixture.detectChanges();
    expect(component.form.getRawValue()).toMatchObject({ clientId: 7, clientName: client.name,
      buildingName: client.siteType, address: client.address, city: 1, node: 2, revenue: '100' });
    expect(element.querySelector<HTMLInputElement>('#clientName')!.readOnly).toBe(true);
    expect(component.isSectionOpen('clientLocation')).toBe(true);
    expect(component.form.controls.clientId.valid).toBe(true);
    component.openClientPicker(); picker.pending.set(client); picker.close();
    expect(component.form.controls.clientId.value).toBe(7);
  });

  it('replaces the previous selection and submits ClientId and a text phone without duplicate client data', () => {
    const { component, api } = setup();
    component.selectClient({ ...client, id: 99, name: 'Previous client' });
    component.selectClient(client);
    component.form.patchValue({ dkoTkt: 'WO-1', rfsFiberChain: 'RFS-1', city: 1, node: 2,
      contact: 'Ana', email: 'ana@example.com', phone: '3001234567', type: 3, status: 4,
      technology: 5, eaim: 6, responsible: 8, surveyCost: '10', installationBudget: '20', observations: 'Observation' });
    component.submit();
    expect(api.create).toHaveBeenCalledTimes(1);
    const body = (api.create.mock.calls as unknown as [[Record<string, unknown>]])[0][0];
    expect(body['clientId']).toBe(7);
    expect(body['mobilePhone']).toBe('3001234567');
    expect(body).not.toHaveProperty('clientName'); expect(body).not.toHaveProperty('buildingSite');
    expect(body).not.toHaveProperty('address');
  });

  it('requires a selected client instead of a manually entered name', () => {
    const { component, api } = setup();
    component.form.patchValue({ dkoTkt: 'WO-1', rfsFiberChain: 'RFS-1', city: 1, node: 2,
      contact: 'Ana', email: 'ana@example.com', phone: '3001234567', type: 3, status: 4,
      technology: 5, eaim: 6, responsible: 8, surveyCost: '10', installationBudget: '20', observations: 'Observation' });
    component.form.controls.clientName.setValue('Typed name');
    component.submit();
    expect(component.form.controls.clientId.invalid).toBe(true);
    expect(component.isSectionOpen('clientLocation')).toBe(true);
    expect(api.create).not.toHaveBeenCalled();
  });
});
