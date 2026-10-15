import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AssignmentsService } from './assignments.service';
import { environment } from '../../../../../environments/environment';
describe('Assignments API contracts', () => {
  let api: AssignmentsService, http: HttpTestingController;
  const base = `${environment.apiUrl}/api/Assignment`;
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    api = TestBed.inject(AssignmentsService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());
  it('looks up Delivery using its ID', () => {
    api.delivery(128).subscribe();
    http.expectOne(`${base}/deliveries/128`).flush({ data: {} });
  });
  it('loads a paginated port list scoped to Delivery and GCO', () => {
    api.ports(128, 3, 2, 'equipo').subscribe();
    const r = http.expectOne((req) => req.url === `${base}/deliveries/128/gcos/3/ports`);
    expect(r.request.params.get('Page')).toBe('2');
    expect(r.request.params.get('Search')).toBe('equipo');
    r.flush({ rows: [] });
  });
  it('sends both concurrency versions when editing', () => {
    const body = {
      deliveryId: 128,
      portId: 10,
      statusId: 5,
      equipmentName: null,
      portVersion: 'port-version',
      rowVersion: 'assignment-version',
    };
    api.save(7, body).subscribe();
    const r = http.expectOne(`${base}/7`);
    expect(r.request.method).toBe('PUT');
    expect(r.request.body).toEqual(body);
    r.flush({ data: 7 });
  });
  it('includes expected assignment version with logical deactivation', () => {
    api.deactivate(7, 'version').subscribe();
    const r = http.expectOne(`${base}/7`);
    expect(r.request.method).toBe('DELETE');
    expect(r.request.body).toEqual({ rowVersion: 'version' });
    r.flush(null, { status: 204, statusText: 'No Content' });
  });
});
