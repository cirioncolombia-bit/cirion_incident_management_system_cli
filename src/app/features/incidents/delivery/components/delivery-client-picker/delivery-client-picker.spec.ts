import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { of, Subject, throwError } from 'rxjs';
import { DeliveryClientPicker } from './delivery-client-picker';
import { DeliveryService } from '../../services/delivery.service';
import { DeliveryClientPage } from '../../models/delivery-client-lookup';

const first = { id: 7, name: 'Client A', siteType: 'Office', address: 'Address A' };
const second = { id: 8, name: 'Client B', siteType: 'Branch', address: 'Address B' };

describe('Delivery client picker', () => {
  function setup() {
    const api = { lookupClients: vi.fn((page: number, search: string) => of({ rows: [first, second], page,
      pageSize: 10, hasNextPage: true } as DeliveryClientPage)) };
    TestBed.configureTestingModule({ imports: [DeliveryClientPicker], providers: [{ provide: DeliveryService, useValue: api }] });
    const fixture = TestBed.createComponent(DeliveryClientPicker); fixture.detectChanges();
    const component = fixture.componentInstance;
    const dialog = fixture.nativeElement.querySelector('dialog') as HTMLDialogElement;
    // jsdom lacks the native dialog top-layer behavior; real focus/Escape is checked in Chromium.
    dialog.showModal = vi.fn(() => dialog.setAttribute('open', ''));
    dialog.close = vi.fn(() => dialog.removeAttribute('open'));
    return { api, fixture, component, dialog };
  }

  it('does not fetch on opening or typing and searches only on submit', () => {
    const { api, fixture, component, dialog } = setup();
    expect(api.lookupClients).not.toHaveBeenCalled();
    component.open(); fixture.detectChanges();
    expect(dialog.showModal).toHaveBeenCalledTimes(1);
    expect(api.lookupClients).not.toHaveBeenCalled();
    component.searchForm.controls.search.setValue('bancolombia');
    expect(api.lookupClients).not.toHaveBeenCalled();
    component.searchClients(); fixture.detectChanges();
    expect(api.lookupClients).toHaveBeenCalledWith(1, 'bancolombia');
    expect(dialog.querySelectorAll('tbody tr')).toHaveLength(2);
    expect(dialog.textContent).toContain('Address A');
    expect(dialog.querySelector('button.primary[type="button"]')?.hasAttribute('disabled')).toBe(true);
  });

  it('selects only one client and emits the confirmed row', () => {
    const { component, fixture, dialog } = setup();
    const selected = vi.fn(); component.selected.subscribe(selected);
    component.open(); component.searchForm.controls.search.setValue('Client'); component.searchClients(); fixture.detectChanges();
    const choices = dialog.querySelectorAll<HTMLInputElement>('input[type="radio"]');
    choices[0].click(); fixture.detectChanges();
    choices[1].click(); fixture.detectChanges();
    expect([...choices].filter(input => input.checked)).toHaveLength(1);
    expect(component.pending()?.id).toBe(8);
    component.confirm();
    expect(selected).toHaveBeenCalledWith(second);
    expect(dialog.close).toHaveBeenCalled();
    expect(component.opened()).toBe(false);
  });

  it('searches by name or numeric code, resets selection and pages using the applied search', () => {
    const { api, component } = setup(); component.open();
    component.pending.set(first);
    component.searchForm.controls.search.setValue('  7  ');
    component.searchClients();
    expect(api.lookupClients).toHaveBeenLastCalledWith(1, '7');
    expect(component.pending()).toBeNull();
    component.searchForm.controls.search.setValue('Unapplied');
    component.paginate(2);
    expect(api.lookupClients).toHaveBeenLastCalledWith(2, '7');
  });

  it('cancels obsolete requests, recovers from errors and reports empty results', () => {
    const { api, component } = setup();
    const old = new Subject<DeliveryClientPage>(); api.lookupClients.mockReturnValueOnce(old);
    component.open(); component.searchForm.controls.search.setValue('Client'); component.searchClients(); expect(old.observed).toBe(true);
    api.lookupClients.mockReturnValueOnce(throwError(() => new Error('Unavailable')));
    component.searchClients(); expect(old.observed).toBe(false);
    expect(component.error()).toContain('could not be loaded');
    api.lookupClients.mockReturnValueOnce(of({ rows: [], page: 1, pageSize: 10, hasNextPage: false }));
    component.searchClients();
    expect(component.error()).toBe(''); expect(component.rows()).toEqual([]);
    expect(component.loading()).toBe(false);
  });

  it('cancel and Escape do not emit a selection and cancel pending lookup', () => {
    const { api, component, dialog } = setup(); const selected = vi.fn(); component.selected.subscribe(selected);
    const pending = new Subject<DeliveryClientPage>(); api.lookupClients.mockReturnValueOnce(pending);
    component.open(); component.searchForm.controls.search.setValue('Client'); component.searchClients(); expect(pending.observed).toBe(true);
    dialog.dispatchEvent(new Event('cancel', { cancelable: true }));
    expect(pending.observed).toBe(false); expect(selected).not.toHaveBeenCalled();
    expect(component.opened()).toBe(false);
  });

  it.each([
    [0, 'Cannot connect'], [401, 'session has expired'], [403, 'permission'],
    [404, 'client-lookup endpoint'], [500, 'HTTP 500'],
  ])('distinguishes HTTP %s failures from no matching clients', (status, message) => {
    const { api, component, fixture, dialog } = setup();
    api.lookupClients.mockReturnValueOnce(throwError(() => new HttpErrorResponse({ status })));
    component.open(); component.searchForm.controls.search.setValue('bancolombia');
    component.searchClients(); fixture.detectChanges();
    expect(component.error()).toContain(message);
    expect(dialog.textContent).toContain('Search unavailable.');
    expect(dialog.textContent).not.toContain('No clients match this search.');
  });
  it('rejects broad searches, accepts a single digit Id and stops paging after the last page', () => {
    const { api, component } = setup(); component.open();
    for (const search of ['', '  ', 'ab', ' a ', '0', '2147483648']) {
      component.searchForm.controls.search.setValue(search); component.searchClients();
    }
    expect(api.lookupClients).not.toHaveBeenCalled();
    api.lookupClients.mockReturnValueOnce(of({ rows: [first], page: 1, pageSize: 10, hasNextPage: false }));
    component.searchForm.controls.search.setValue('7'); component.searchClients();
    expect(api.lookupClients).toHaveBeenCalledWith(1, '7');
    component.paginate(2); expect(api.lookupClients).toHaveBeenCalledTimes(1);
    component.close(); component.open();
    expect(component.rows()).toEqual([]); expect(component.searched()).toBe(false);
    expect(api.lookupClients).toHaveBeenCalledTimes(1);
  });

});
