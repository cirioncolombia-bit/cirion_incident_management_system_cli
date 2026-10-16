import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { IncidentsService } from './incidents.service';
import { environment } from '../../../../../environments/environment';
describe('IncidentsService contracts', () => {
  let api: IncidentsService, http: HttpTestingController;
  const base = `${environment.apiUrl}/api/Incident`;
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    api = TestBed.inject(IncidentsService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());
  it('uses paginated response and backend filter names', () => {
    api.list(2, { search: 'Ana Torres', typeId: '7', statusId: '42', assigneeId: '3' }).subscribe();
    const r = http.expectOne((req) => req.url === base);
    expect(r.request.params.get('Page')).toBe('2');
    expect(r.request.params.get('search')).toBe('Ana Torres');
    expect(r.request.params.get('assigneeId')).toBe('3');
    expect(r.request.params.get('statusId')).toBe('42');
    r.flush({ rows: [], page: 2, pageSize: 12, totalCount: 0, totalPages: 0 });
  });
  it('unwraps form options without inventing catalog values', () => {
    api.options().subscribe((o) => expect(o.statuses[0].id).toBe(42));
    http
      .expectOne(`${base}/form-options`)
      .flush({
        data: {
          types: [],
          users: [],
          statuses: [{ id: 42, name: 'Configurado', isInitial: true }],
        },
      });
  });
  it('uploads multipart with a file field and no manual content-type boundary', () => {
    const file = new File(['data'], 'report.txt');
    api.upload(1, file).subscribe();
    const r = http.expectOne(`${base}/1/attachments`);
    expect(r.request.body instanceof FormData).toBe(true);
    expect(r.request.body.get('file').name).toBe('report.txt');
    expect(r.request.headers.has('Content-Type')).toBe(false);
    r.flush({ data: 4 });
  });
  it('downloads through HttpClient and the authenticated API route, never a supplied URL', () => {
    api.download(1, 4).subscribe();
    const r = http.expectOne(`${base}/1/attachments/4/content`);
    expect(r.request.responseType).toBe('blob');
    r.flush(new Blob(['data']));
  });
  it('deactivates through DELETE with no audit fields', () => {
    api.deactivate(1).subscribe();
    const r = http.expectOne(`${base}/1`);
    expect(r.request.method).toBe('DELETE');
    expect(r.request.body).toBeNull();
    r.flush(null, { status: 204, statusText: 'No Content' });
  });
  it('assignment null removes the assignee using existing endpoint', () => {
    api.assign(1, null).subscribe();
    const r = http.expectOne(`${base}/1/assignment`);
    expect(r.request.body).toEqual({ userId: null });
    r.flush(null, { status: 204, statusText: 'No Content' });
  });
});
