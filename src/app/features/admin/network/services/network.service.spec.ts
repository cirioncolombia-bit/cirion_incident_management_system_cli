import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { NetworkService } from './network.service';
import { environment } from '../../../../../environments/environment';

describe('Network API contracts', () => {
  let api: NetworkService, http: HttpTestingController;
  const base = `${environment.apiUrl}/api`;
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    api = TestBed.inject(NetworkService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('sends SQL search, parent, inactive and pagination filters to the network endpoint', () => {
    api
      .list('Ports', { page: 2, search: ' Port 1 ', parentId: 4, includeInactive: true })
      .subscribe();
    const request = http.expectOne((req) => req.url === `${base}/NetworkConfiguration/Ports`);
    expect(request.request.params.get('Search')).toBe('Port 1');
    expect(request.request.params.get('ParentId')).toBe('4');
    expect(request.request.params.get('Page')).toBe('2');
    expect(request.request.params.get('PageSize')).toBe('20');
    expect(request.request.params.get('IncludeInactive')).toBe('true');
    request.flush({ rows: [], page: 2, totalPages: 0, totalCount: 0 });
  });
  it('reuses City and Node write controllers', () => {
    api.save('Cities', null, { cityName: 'City', countryId: 1 }).subscribe();
    const city = http.expectOne(`${base}/City`);
    expect(city.request.method).toBe('POST');
    city.flush({ data: { id: 1 } });
    api.save('Nodes', 2, { nodeName: 'Node', cityId: 1, address: 'Address' }).subscribe();
    const node = http.expectOne(`${base}/Node/2`);
    expect(node.request.method).toBe('PUT');
    node.flush({ id: 2 });
  });
  it('includes the expected rowversion when deactivating a physical port', () => {
    api
      .deactivate('Ports', { id: 10, name: 'Port 1', isActive: true, rowVersion: 'AAAAAAAAAAE=' })
      .subscribe();
    const request = http.expectOne(`${base}/NetworkConfiguration/Ports/10`);
    expect(request.request.method).toBe('DELETE');
    expect(request.request.body).toEqual({ rowVersion: 'AAAAAAAAAAE=' });
    request.flush(null, { status: 204, statusText: 'No Content' });
  });
  it('resolves only the current ancestor chain in parent order', () => {
    let result: number[] = [];
    api.ancestors('Gcos', 3).subscribe((records) => (result = records.map((record) => record.id)));
    http.expectOne(`${base}/NetworkConfiguration/Nodes/3`).flush({ data: { id: 3, parentId: 2 } });
    http.expectOne(`${base}/NetworkConfiguration/Cities/2`).flush({ data: { id: 2, parentId: 1 } });
    http.expectOne(`${base}/NetworkConfiguration/Countries/1`).flush({ data: { id: 1 } });
    expect(result).toEqual([1, 2, 3]);
  });
  it('does not allow countries to be written', () => {
    expect(() => api.save('Countries', null, {})).toThrow('read-only');
    expect(() => api.deactivate('Countries', { id: 1, name: 'Country', isActive: true })).toThrow(
      'read-only',
    );
  });
});
