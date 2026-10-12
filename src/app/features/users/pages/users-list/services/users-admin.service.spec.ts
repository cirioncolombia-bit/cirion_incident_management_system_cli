import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { UsersAdminService } from './users-admin.service';
import { environment } from '../../../../../../environments/environment';
describe('UsersAdminService API contracts', () => {
  let api: UsersAdminService;
  let http: HttpTestingController;
  const base = `${environment.apiUrl}/api`;
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    api = TestBed.inject(UsersAdminService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());
  it('uses the paginated users envelope and sends all filters', () => {
    api
      .users(2, { search: 'Ana', eaimId: '8', roleId: '4', userType: '2', includeInactive: true })
      .subscribe((r) => expect(r.rows).toEqual([]));
    const req = http.expectOne((r) => r.url === `${base}/User`);
    expect(req.request.params.get('Page')).toBe('2');
    expect(req.request.params.get('IncludeInactive')).toBe('true');
    expect(req.request.params.get('eaimId')).toBe('8');
    req.flush({ rows: [], totalPages: 0, totalCount: 0, page: 2 });
  });
  it('uses existing EAIM route and unwraps data', () => {
    api.catalogs('eaims').subscribe((r) => expect(r).toEqual([{ id: 8, name: 'Empresa' }]));
    http.expectOne(`${base}/Eaim`).flush({ data: [{ id: 8, name: 'Empresa' }] });
  });
  it('sends empty role replacement without audit fields', () => {
    api.roles(3, []).subscribe();
    const req = http.expectOne(`${base}/User/3/roles`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ roleIds: [] });
    req.flush({});
  });
  it('uses DELETE for logical deactivation', () => {
    api.deactivate('permissions', 5).subscribe();
    const req = http.expectOne(`${base}/Permission/5`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null, { status: 204, statusText: 'No Content' });
  });
});
