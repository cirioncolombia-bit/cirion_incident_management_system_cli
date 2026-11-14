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
    api.getPage({ page: 3, pageSize: 20, search: ' Client ', status: 'EN PROCESO', deliveryId: 42 })
      .subscribe(page => total = page.totalCount);
    const request = http.expectOne(req => req.url === `${environment.apiUrl}/api/Delivery/paged`);
    expect(request.request.params.get('Page')).toBe('3');
    expect(request.request.params.get('PageSize')).toBe('20');
    expect(request.request.params.get('Search')).toBe('Client');
    expect(request.request.params.get('Status')).toBe('EN PROCESO');
    expect(request.request.params.get('DeliveryId')).toBe('42');
    request.flush({ data: { rows: [], totalCount: 80 } });
    expect(total).toBe(80);
    http.verify();
  });
});
