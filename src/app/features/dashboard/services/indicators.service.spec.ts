import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { IndicatorsService } from './indicators.service';
import { environment } from '../../../../environments/environment';
describe('Indicator API', () => {
  function setup() {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    return { api: TestBed.inject(IndicatorsService), http: TestBed.inject(HttpTestingController) };
  }
  it('sends filters, avoids null parameters and unwraps responses', () => {
    const { api, http } = setup();
    const received = vi.fn();
    api
      .charts({ year: 2026, month: null, indicatorId: 7, page: 2, pageSize: 6 })
      .subscribe(received);
    const req = http.expectOne((r) => r.url === environment.apiUrl + '/api/Indicators/charts');
    expect(req.request.params.get('year')).toBe('2026');
    expect(req.request.params.has('month')).toBe(false);
    expect(req.request.params.get('page')).toBe('2');
    req.flush({ data: { rows: [] } });
    expect(received).toHaveBeenCalledWith({ rows: [] });
    http.verify();
  });
  it('preserves decimal strings and includes concurrency tokens on edits and deletion', () => {
    const { api, http } = setup();
    api
      .saveRecord(9, {
        indicatorId: 7,
        year: 2026,
        month: 11,
        value: '1972082.00',
        rowVersion: 'AQ==',
      })
      .subscribe();
    const req = http.expectOne(environment.apiUrl + '/api/Indicators/records/9');
    expect(req.request.method).toBe('PUT');
    expect(req.request.body.value).toBe('1972082.00');
    req.flush({ data: {} });
    api.deleteRecord({ id: 9, rowVersion: 'AQ==' } as never).subscribe();
    const remove = http.expectOne((r) => r.url.endsWith('/records/9'));
    expect(remove.request.method).toBe('DELETE');
    expect(remove.request.params.get('rowVersion')).toBe('AQ==');
    remove.flush(null);
    http.verify();
  });
});
