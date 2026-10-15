import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors, HttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { vi } from 'vitest';
import { environment } from '../../../environments/environment';
import { LoadingService } from './loading.service';
import { loadingInterceptor } from './loading.interceptor';
import { LoadingProgress } from './loading-progress';

describe('Global loading lifecycle', () => {
  let loading: LoadingService, http: HttpClient, requests: HttpTestingController;
  const api = `${environment.apiUrl}/api/Incident`;
  beforeEach(() => {
    vi.useFakeTimers();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([loadingInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    loading = TestBed.inject(LoadingService);
    http = TestBed.inject(HttpClient);
    requests = TestBed.inject(HttpTestingController);
  });
  afterEach(() => {
    requests.verify({ ignoreCancelled: true });
    vi.useRealTimers();
  });
  it('avoids flicker for fast reads', () => {
    http.get(api).subscribe();
    requests.expectOne(api).flush({});
    vi.advanceTimersByTime(200);
    expect(loading.visible()).toBe(false);
  });
  it('shows after the delay and closes after a read completes', () => {
    http.get(api).subscribe();
    const r = requests.expectOne(api);
    vi.advanceTimersByTime(150);
    expect(loading.visible()).toBe(true);
    r.flush({});
    expect(loading.visible()).toBe(false);
  });
  it('tracks writes as well as reads', () => {
    http.post(api, {}).subscribe();
    const r = requests.expectOne(api);
    vi.advanceTimersByTime(150);
    expect(loading.visible()).toBe(true);
    r.flush({});
    expect(loading.visible()).toBe(false);
  });
  it('remains visible until all simultaneous requests finish', () => {
    http.get(api).subscribe();
    http.put(api + '/1', {}).subscribe();
    const read = requests.expectOne(api),
      write = requests.expectOne(api + '/1');
    vi.advanceTimersByTime(150);
    read.flush({});
    expect(loading.visible()).toBe(true);
    write.flush({});
    expect(loading.visible()).toBe(false);
  });
  it('closes on server errors without swallowing the error', () => {
    let status = 0;
    http.get(api).subscribe({ error: (e) => (status = e.status) });
    const r = requests.expectOne(api);
    vi.advanceTimersByTime(150);
    r.flush({}, { status: 500, statusText: 'Error' });
    expect(status).toBe(500);
    expect(loading.visible()).toBe(false);
  });
  it('closes on cancelled subscriptions', () => {
    const subscription = http.get(api).subscribe();
    requests.expectOne(api);
    vi.advanceTimersByTime(150);
    subscription.unsubscribe();
    expect(loading.visible()).toBe(false);
  });
  it('does not count an observable before it is subscribed', () => {
    http.get(api);
    vi.advanceTimersByTime(200);
    expect(loading.visible()).toBe(false);
  });
  it('ignores non-API resources', () => {
    http.get('/asset.json').subscribe();
    const r = requests.expectOne('/asset.json');
    vi.advanceTimersByTime(200);
    expect(loading.visible()).toBe(false);
    r.flush({});
  });
  it('handles each subscription independently', () => {
    const request = http.get(api);
    const first = request.subscribe(),
      second = request.subscribe();
    requests.match(api);
    vi.advanceTimersByTime(150);
    first.unsubscribe();
    expect(loading.visible()).toBe(true);
    second.unsubscribe();
    expect(loading.visible()).toBe(false);
  });
  it('completion callbacks are idempotent', () => {
    const finish = loading.begin();
    finish();
    finish();
    const other = loading.begin();
    vi.advanceTimersByTime(150);
    expect(loading.visible()).toBe(true);
    other();
    expect(loading.visible()).toBe(false);
  });
});

describe('Loading progress presentation', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());
  it('opens a native modal above page dialogs and closes after loading', () => {
    TestBed.configureTestingModule({ imports: [LoadingProgress] });
    const fixture = TestBed.createComponent(LoadingProgress);
    fixture.detectChanges();
    const dialog = fixture.nativeElement.querySelector('dialog') as HTMLDialogElement;
    dialog.showModal = vi.fn(() => (dialog.open = true));
    dialog.close = vi.fn(() => (dialog.open = false));
    const finish = TestBed.inject(LoadingService).begin();
    vi.advanceTimersByTime(150);
    fixture.detectChanges();
    expect(dialog.showModal).toHaveBeenCalledTimes(1);
    expect(dialog.textContent).toContain('Processing request');
    finish();
    fixture.detectChanges();
    expect(dialog.close).toHaveBeenCalledTimes(1);
  });
  it('does not let Escape dismiss a pending request', () => {
    TestBed.configureTestingModule({ imports: [LoadingProgress] });
    const fixture = TestBed.createComponent(LoadingProgress);
    fixture.detectChanges();
    const event = new Event('cancel', { cancelable: true });
    fixture.nativeElement.querySelector('dialog').dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
  });
});
