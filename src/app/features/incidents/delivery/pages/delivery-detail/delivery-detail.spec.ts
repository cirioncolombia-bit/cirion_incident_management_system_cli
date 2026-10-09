import { Component } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { DeliveryDetail } from './delivery-detail';
import { Delivery } from '../delivery/delivery';
import { DeliveryEditData } from '../../models/delivery-edit';
import { environment } from '../../../../../../environments/environment';

@Component({ template: '' })
class EditStub {}

const record: DeliveryEditData = {
  id: 42,
  workOrderId: 'DKO-42',
  rfsFiberChain: 'RFS-42',
  soSap: null,
  clientName: 'Actual client',
  buildingSite: 'Actual site',
  address: 'Actual address',
  cityId: 1,
  nodeId: 4,
  revenue: 100.25,
  contactName: 'Actual contact',
  email: 'contact@example.com',
  mobilePhone: 573001234567,
  typeId: 6,
  statusId: 7,
  technologyId: 8,
  eaimId: 10,
  userId: 11,
  surveryCost: 12.5,
  installationBudget: 1000.75,
  observation: 'Actual observation',
  isActive: true,
  cityName: 'Bogotá',
  nodeName: 'Node A',
  typeDescription: 'PREVENTA',
  statusDescription: 'EN PROCESO',
  technologyDescription: 'DWDM',
  eaimName: 'EAIM A',
  responsibleName: 'Responsible A',
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
      causeDescription: 'Additional materials',
      cost: 99.75,
      isActive: true,
    },
  ],
};

describe('DeliveryDetail', () => {
  let http: HttpTestingController;
  let harness: RouterTestingHarness;
  let component: DeliveryDetail;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([
          { path: 'delivery', component: Delivery },
          { path: 'delivery/:id', component: DeliveryDetail },
          { path: 'delivery/:id/edit', component: EditStub },
        ]),
      ],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
    harness = await RouterTestingHarness.create();
  });
  afterEach(() => http.verify({ ignoreCancelled: true }));

  async function load(data = record) {
    component = await harness.navigateByUrl('/delivery/42', DeliveryDetail);
    const request = http.expectOne(environment.apiUrl + '/api/Delivery/42/edit');
    expect(request.request.method).toBe('GET');
    request.flush({ data, message: '' });
    harness.detectChanges();
  }

  it('loads all real information organized by sections with descriptive labels and quantities', async () => {
    await load();
    const page = harness.routeNativeElement!;
    for (const text of [
      'DKO-42',
      'Actual client',
      'Actual site',
      'Actual address',
      'Actual contact',
      '573001234567',
      'Bogotá',
      'Node A',
      'PREVENTA',
      'DWDM',
      'EAIM A',
      'Responsible A',
      'Landlord A',
      'APR-21',
      'Additional materials',
      'Conduit meters',
      '120',
      'Posts quantity',
      'Additional number',
      'Actual observation',
    ]) {
      expect(page.textContent).toContain(text);
    }
    expect(page.querySelectorAll('.detail-section').length).toBe(9);
    expect(page.textContent).toContain('Status history is not available yet.');
    expect(page.textContent).not.toContain('Banco de la Nación');
    expect(component.formatCurrency(100.25)).toContain('100,25');
    expect(component.formatCurrency(0)).not.toBe('—');
    expect(component.formatCurrency(null)).toBe('—');
    expect(component.totalInstallationCost(record.installationCosts)).toContain('99,75');
  });

  it('opens the selected real detail from the mobile View Details link and offers editing at the top', async () => {
    await harness.navigateByUrl('/delivery', Delivery);
    http.expectOne(environment.apiUrl + '/api/Delivery').flush({ data: [record], message: '' });
    harness.detectChanges();
    const page = harness.routeNativeElement!;
    expect(page.querySelector('.delivery-card__edit')).toBeNull();
    const view = page.querySelector<HTMLAnchorElement>('.delivery-card__view')!;
    expect(view.textContent).toContain('View Details');
    view.click();
    await harness.fixture.whenStable();
    expect(TestBed.inject(Router).url).toBe('/delivery/42');
    http
      .expectOne(environment.apiUrl + '/api/Delivery/42/edit')
      .flush({ data: record, message: '' });
    harness.detectChanges();
    const edit = harness.routeNativeElement!.querySelector<HTMLAnchorElement>(
      '.delivery-detail__header .delivery-detail__edit',
    )!;
    expect(edit.getAttribute('href')).toBe('/delivery/42/edit');
    edit.click();
    await harness.fixture.whenStable();
    expect(TestBed.inject(Router).url).toBe('/delivery/42/edit');
  });

  it('handles optional fields, unavailable descriptions and empty child collections', async () => {
    await load({
      ...record,
      consecutives: [],
      installationCosts: [],
      revenue: null,
      cityName: null,
      responsibleName: null,
      observation: '',
    });
    expect(harness.routeNativeElement!.textContent).toContain('No consecutives registered.');
    expect(harness.routeNativeElement!.textContent).toContain(
      'No additional installation costs registered.',
    );
    expect(component.displayValue(null)).toBe('—');
    expect(component.displayValue('')).toBe('—');
    expect(component.totalInstallationCost([])).not.toBe('—');
  });

  it('shows loading and missing record states without example data', async () => {
    component = await harness.navigateByUrl('/delivery/42', DeliveryDetail);
    expect(component.loading()).toBe(true);
    harness.detectChanges();
    expect(harness.routeNativeElement!.textContent).toContain('Loading delivery details');
    http
      .expectOne(environment.apiUrl + '/api/Delivery/42/edit')
      .flush({}, { status: 404, statusText: 'Not Found' });
    harness.detectChanges();
    expect(component.delivery()).toBeNull();
    expect(component.loading()).toBe(false);
    expect(harness.routeNativeElement!.textContent).toContain('no longer active');
    expect(harness.routeNativeElement!.querySelector('.delivery-detail__edit')).toBeNull();
  });

  it('shows an expired session error', async () => {
    component = await harness.navigateByUrl('/delivery/42', DeliveryDetail);
    http
      .expectOne(environment.apiUrl + '/api/Delivery/42/edit')
      .flush({}, { status: 401, statusText: 'Unauthorized' });
    expect(component.loadError()).toContain('session has expired');
  });

  it('rejects malformed IDs without making a request', async () => {
    component = await harness.navigateByUrl('/delivery/invalid', DeliveryDetail);
    expect(component.loadError()).toContain('identifier is invalid');
    http.expectNone(environment.apiUrl + '/api/Delivery/invalid/edit');
  });

  it('reloads when navigating between IDs using the same component', async () => {
    await load();
    const reused = await harness.navigateByUrl('/delivery/43', DeliveryDetail);
    expect(reused).toBe(component);
    expect(component.delivery()).toBeNull();
    http
      .expectOne(environment.apiUrl + '/api/Delivery/43/edit')
      .flush({ data: { ...record, id: 43, workOrderId: 'DKO-43' }, message: '' });
    harness.detectChanges();
    expect(harness.routeNativeElement!.textContent).toContain('DKO-43');
  });
});
