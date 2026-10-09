import { Component } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { DeliveryEdit } from './delivery-edit';
import { Delivery } from '../delivery/delivery';
import { DeliveryCreateOptions } from '../../models/delivery-create-options';
import { DeliveryEditData } from '../../models/delivery-edit';
import { environment } from '../../../../../../environments/environment';

@Component({ template: '' })
class DeliveryListStub {}

const options: DeliveryCreateOptions = {
  cities: [
    { id: 1, name: 'Bogotá' },
    { id: 2, name: 'Cali' },
  ],
  nodes: [
    { id: 4, cityId: 1, name: 'Node A' },
    { id: 5, cityId: 2, name: 'Node B' },
  ],
  deliveryTypes: [{ id: 6, name: 'PREVENTA' }],
  deliveryStatuses: [{ id: 7, name: 'TERMINADO' }],
  deliveryTechnologies: [{ id: 8, name: 'DWDM' }],
  landlords: [{ id: 9, name: 'Landlord A' }],
  eaims: [{ id: 10, name: 'EAIM A' }],
  responsibles: [{ id: 11, name: 'User A' }],
  deliveryCauses: [{ id: 12, name: 'Materials' }],
};
const record: DeliveryEditData = {
  id: 42,
  workOrderId: 'DKO-42',
  rfsFiberChain: 'RFS-42',
  soSap: null,
  clientName: 'Client',
  buildingSite: 'Site',
  address: 'Address',
  cityId: 1,
  nodeId: 4,
  revenue: 100.25,
  contactName: 'Contact',
  email: 'contact@example.com',
  mobilePhone: 573001234567,
  typeId: 6,
  statusId: 7,
  technologyId: 8,
  eaimId: 10,
  userId: 11,
  surveryCost: 12.5,
  installationBudget: 1000.75,
  observation: '',
  isActive: true,
  cityName: 'Bogotá',
  nodeName: 'Node A',
  typeDescription: 'PREVENTA',
  statusDescription: 'TERMINADO',
  technologyDescription: 'DWDM',
  eaimName: 'EAIM A',
  responsibleName: 'User A',
  consecutives: [
    {
      id: 21,
      deliveryId: 42,
      landlordId: 9,
      landlordName: 'Landlord A',
      consecutive: 'APR-21',
      metersCoundiut: 120,
      postsQuantity: 3,
      aditionalNumber: 5,
      isActive: true,
    },
  ],
  installationCosts: [
    {
      id: 31,
      deliveryId: 42,
      causeId: 12,
      causeDescription: 'Materials',
      cost: 99.75,
      isActive: true,
    },
  ],
};

describe('DeliveryEdit API integration', () => {
  let http: HttpTestingController;
  let harness: RouterTestingHarness;
  let component: DeliveryEdit;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([
          { path: 'delivery/:id/edit', component: DeliveryEdit },
          { path: 'delivery', component: DeliveryListStub },
        ]),
      ],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
    harness = await RouterTestingHarness.create();
  });

  afterEach(() => http.verify({ ignoreCancelled: true }));

  async function load(data: DeliveryEditData = record, catalogs = options) {
    component = await harness.navigateByUrl('/delivery/42/edit', DeliveryEdit);
    const request = http.expectOne(environment.apiUrl + '/api/Delivery/42/edit');
    expect(request.request.method).toBe('GET');
    request.flush({ data, message: '' });
    http
      .expectOne(environment.apiUrl + '/api/deliveries/create-options')
      .flush({ data: catalogs, message: '' });
    harness.detectChanges();
  }

  it('prefills all real fields, labels, child IDs and quantities without losing decimals', async () => {
    await load();
    expect(component.editForm.valid).toBe(true);
    expect(component.editForm.controls.city.value).toBe(1);
    expect(component.editForm.controls.node.value).toBe(4);
    expect(component.editForm.controls.phone.value).toBe('573001234567');
    expect(component.editForm.controls.revenue.value).toBe(100.25);
    expect(component.landlordConsecutives.at(0).getRawValue()).toEqual({
      id: 21,
      landlord: 9,
      consecutive: 'APR-21',
      metersCoundiut: 120,
      postsQuantity: 3,
      aditionalNumber: 5,
    });
    expect(component.installationCosts.at(0).controls.amount.value).toBe(99.75);
    const page = harness.routeNativeElement!;
    expect(page.textContent).toContain('DKO-42');
    expect(page.textContent).toContain('Landlord A');
    expect(page.textContent).toContain('Status history is not available yet.');
    expect(page.querySelector<HTMLInputElement>('#revenue')!.value).toBe('100.25');
  });

  it('sends existing IDs, additions, decimal amounts and quantities, then filters the list', async () => {
    await load();
    component.addLandlordConsecutive();
    component.landlordConsecutives.at(1).patchValue({
      landlord: 9,
      consecutive: 'APR-new',
      metersCoundiut: 10,
      postsQuantity: 2,
      aditionalNumber: 1,
    });
    component.addInstallationCost();
    component.installationCosts.at(1).patchValue({ cause: 12, amount: 5.25 });
    component.save();
    component.save(); // An in-flight save must not issue a duplicate PUT.
    const request = http.expectOne(environment.apiUrl + '/api/Delivery/42/edit');
    expect(request.request.method).toBe('PUT');
    expect(request.request.body.workOrderId).toBe('DKO-42');
    expect(request.request.body.mobilePhone).toBe(573001234567);
    expect(request.request.body.surveryCost).toBe(12.5);
    expect(request.request.body.installationBudget).toBe(1000.75);
    expect(request.request.body.consecutives[0].id).toBe(21);
    expect(request.request.body.consecutives[1]).toEqual({
      landlordId: 9,
      consecutive: 'APR-new',
      metersCoundiut: 10,
      postsQuantity: 2,
      aditionalNumber: 1,
    });
    expect(request.request.body.installationCosts).toEqual([
      { id: 31, causeId: 12, cost: 99.75 },
      { causeId: 12, cost: 5.25 },
    ]);
    request.flush({ data: { id: 42 }, message: '' });
    await harness.fixture.whenStable();
    expect(TestBed.inject(Router).url).toBe('/delivery?deliveryId=42');
  });

  it('allows removal of the last child and sends empty arrays for soft deletion', async () => {
    await load();
    component.removeLandlordConsecutive(0);
    component.removeInstallationCost(0);
    component.save();
    const request = http.expectOne(environment.apiUrl + '/api/Delivery/42/edit');
    expect(request.request.body.consecutives).toEqual([]);
    expect(request.request.body.installationCosts).toEqual([]);
    request.flush({ message: 'Invalid reference.' }, { status: 400, statusText: 'Bad Request' });
  });

  it('does not require child rows, revenue or SO SAP, even for a completed record', async () => {
    await load({ ...record, consecutives: [], installationCosts: [], revenue: null });
    expect(component.landlordConsecutives.length).toBe(0);
    expect(component.installationCosts.length).toBe(0);
    expect(component.editForm.valid).toBe(true);
    component.addInstallationCost();
    component.save();
    http.expectNone(environment.apiUrl + '/api/Delivery/42/edit');
    expect(component.openSection()).toBe('costs');
  });

  it('preserves unavailable selection IDs and requires an active replacement', async () => {
    await load(record, { ...options, landlords: [] });
    expect(component.landlordConsecutives.at(0).controls.landlord.value).toBe(9);
    expect(component.editForm.invalid).toBe(true);
    expect(harness.routeNativeElement!.textContent).toContain('Current option unavailable');
    component.save();
    http.expectNone(environment.apiUrl + '/api/Delivery/42/edit');
    expect(component.openSection()).toBe('landlordConsecutives');
  });

  it('filters nodes by city and clears the old selection when city changes', async () => {
    await load();
    component.editForm.controls.city.setValue(2);
    expect(component.editForm.controls.node.value).toBeNull();
    expect(component.nodes.map((node) => node.id)).toEqual([5]);
    expect(component.editForm.invalid).toBe(true);
  });

  it('keeps edits after a failed save and permits retry', async () => {
    await load();
    component.editForm.controls.clientName.setValue('Changed client');
    component.save();
    http
      .expectOne(environment.apiUrl + '/api/Delivery/42/edit')
      .flush({ message: 'References must be active.' }, { status: 400, statusText: 'Bad Request' });
    expect(component.saveError()).toBe('References must be active.');
    expect(component.editForm.controls.clientName.value).toBe('Changed client');
    expect(component.editForm.enabled).toBe(true);
    expect(component.saving()).toBe(false);
    component.save();
    const retry = http.expectOne(environment.apiUrl + '/api/Delivery/42/edit');
    retry.flush({}, { status: 500, statusText: 'Server Error' });
  });

  it('reports missing delivery without showing example data', async () => {
    component = await harness.navigateByUrl('/delivery/42/edit', DeliveryEdit);
    http
      .expectOne(environment.apiUrl + '/api/deliveries/create-options')
      .flush({ data: options, message: '' });
    http
      .expectOne(environment.apiUrl + '/api/Delivery/42/edit')
      .flush({}, { status: 404, statusText: 'Not Found' });
    harness.detectChanges();
    expect(component.loading()).toBe(false);
    expect(component.delivery()).toBeNull();
    expect(harness.routeNativeElement!.textContent).toContain('no longer active');
  });

  it('rejects invalid route IDs without calling the API', async () => {
    component = await harness.navigateByUrl('/delivery/invalid/edit', DeliveryEdit);
    expect(component.loadError()).toContain('identifier is invalid');
    http.expectNone(environment.apiUrl + '/api/Delivery/invalid/edit');
    http.expectNone(environment.apiUrl + '/api/deliveries/create-options');
  });

  it('opens the real edit route when the Edit button is clicked in the list', async () => {
    const router = TestBed.inject(Router);
    router.resetConfig([
      { path: 'delivery', component: Delivery },
      { path: 'delivery/:id/edit', component: DeliveryEdit },
    ]);
    await harness.navigateByUrl('/delivery', Delivery);
    http.expectOne(environment.apiUrl + '/api/Delivery').flush({ data: [record], message: '' });
    harness.detectChanges();
    const edit =
      harness.routeNativeElement!.querySelector<HTMLButtonElement>('.delivery-table__edit')!;
    expect(edit.disabled).toBe(false);
    edit.click();
    await harness.fixture.whenStable();
    expect(router.url).toBe('/delivery/42/edit');
    http
      .expectOne(environment.apiUrl + '/api/Delivery/42/edit')
      .flush({ data: record, message: '' });
    http
      .expectOne(environment.apiUrl + '/api/deliveries/create-options')
      .flush({ data: options, message: '' });
    harness.detectChanges();
    expect(harness.routeNativeElement!.textContent).toContain('Edit Delivery');
  });

  it('does not repeat a successful save if navigation fails', async () => {
    await load();
    vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(false);
    component.save();
    http
      .expectOne(environment.apiUrl + '/api/Delivery/42/edit')
      .flush({ data: { id: 42 }, message: '' });
    await harness.fixture.whenStable();
    expect(component.saved()).toBe(true);
    expect(component.saveError()).toContain('Changes were saved');
    component.save();
    http.expectNone(environment.apiUrl + '/api/Delivery/42/edit');
  });

  it('cancels without saving and returns to the filtered list', async () => {
    await load();
    component.cancel();
    await harness.fixture.whenStable();
    http.expectNone(environment.apiUrl + '/api/Delivery/42/edit');
    expect(TestBed.inject(Router).url).toBe('/delivery?deliveryId=42');
  });

  it('reloads when the same component is reused for a different delivery ID', async () => {
    await load();
    const next = await harness.navigateByUrl('/delivery/43/edit', DeliveryEdit);
    expect(next).toBe(component);
    expect(component.loading()).toBe(true);
    expect(component.delivery()).toBeNull();
    http
      .expectOne(environment.apiUrl + '/api/Delivery/43/edit')
      .flush({ data: { ...record, id: 43, workOrderId: 'DKO-43' }, message: '' });
    http
      .expectOne(environment.apiUrl + '/api/deliveries/create-options')
      .flush({ data: options, message: '' });
    harness.detectChanges();
    expect(component.delivery()?.id).toBe(43);
    expect(harness.routeNativeElement!.textContent).toContain('DKO-43');
  });
});
