import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { DeliveryService } from './delivery.service';
import { environment } from '../../../../../environments/environment';

describe('Paged delivery API', () => {
  it('sends pagination and all filters and unwraps server counts', () => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    const http = TestBed.inject(HttpTestingController);
    const api = TestBed.inject(DeliveryService);
    let total = 0;
    api.getPage({ page: 3, pageSize: 20, search: ' Client ', year: 2026, month: 11, day: 14, statusId: 99, cityId: 1, nodeId: 2, eaimId: 3, createdBy: 4, deliveryId: 42 })
      .subscribe(page => total = page.totalCount);
    const request = http.expectOne(req => req.url === `${environment.apiUrl}/api/Delivery/paged`);
    expect(request.request.params.get('Page')).toBe('3');
    expect(request.request.params.get('PageSize')).toBe('20');
    expect(request.request.params.get('Search')).toBe('Client');
    for (const [key, value] of Object.entries({ year: '2026', month: '11', day: '14', statusId: '99', cityId: '1', nodeId: '2', eaimId: '3', createdBy: '4' })) {
      expect(request.request.params.get(key)).toBe(value);
    }
    expect(request.request.params.get('DeliveryId')).toBe('42');
    request.flush({ data: { rows: [], totalCount: 80 } });
    expect(total).toBe(80);
    http.verify();
  });
});

describe('Client lookup API for delivery', () => {
  it('requests a bounded name/code search and unwraps the client data', () => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    const http = TestBed.inject(HttpTestingController);
    const api = TestBed.inject(DeliveryService);
    let clientId: number | undefined;
    api.lookupClients(2, ' 7 ').subscribe(page => clientId = page.rows[0]?.id);
    const request = http.expectOne(req => req.url === `${environment.apiUrl}/api/Delivery/client-lookup`);
    expect(request.request.params.get('Page')).toBe('2');
    expect(request.request.params.get('PageSize')).toBe('10');
    expect(request.request.params.get('Search')).toBe('7');
    request.flush({ data: { rows: [{ id: 7, name: 'Client', siteType: 'Office', address: 'Address' }], page: 2,
      pageSize: 10, hasNextPage: false } });
    expect(clientId).toBe(7);
    http.verify();
  });
});
