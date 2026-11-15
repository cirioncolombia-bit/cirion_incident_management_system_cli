import { TestBed } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';
import { DeliveryClientPicker } from './delivery-client-picker';
import { DeliveryService } from '../../services/delivery.service';
import { DeliveryClientPage } from '../../models/delivery-client-lookup';

const first = { id: 7, name: 'Client A', siteType: 'Office', address: 'Address A' };
const second = { id: 8, name: 'Client B', siteType: 'Branch', address: 'Address B' };

describe('Delivery client picker', () => {
  function setup() {
    const api = { lookupClients: vi.fn((page: number, search: string) => of({ rows: [first, second], page,
      pageSize: 10, totalCount: 25, totalPages: 3 } as DeliveryClientPage)) };
    TestBed.configureTestingModule({ imports: [DeliveryClientPicker], providers: [{ provide: DeliveryService, useValue: api }] });
    const fixture = TestBed.createComponent(DeliveryClientPicker); fixture.detectChanges();
    const component = fixture.componentInstance;
    const dialog = fixture.nativeElement.querySelector('dialog') as HTMLDialogElement;
    // jsdom lacks the native dialog top-layer behavior; real focus/Escape is checked in Chromium.
    dialog.showModal = vi.fn(() => dialog.setAttribute('open', ''));
    dialog.close = vi.fn(() => dialog.removeAttribute('open'));
    return { api, fixture, component, dialog };
  }

  it('does not fetch clients until opened and displays a bounded results table', () => {
    const { api, fixture, component, dialog } = setup();
    expect(api.lookupClients).not.toHaveBeenCalled();
    component.open(); fixture.detectChanges();
    expect(dialog.showModal).toHaveBeenCalledTimes(1);
    expect(api.lookupClients).toHaveBeenCalledWith(1, '');
    expect(dialog.querySelectorAll('tbody tr')).toHaveLength(2);
    expect(dialog.textContent).toContain('Address A');
    expect(dialog.querySelector('button.primary[type="button"]')?.hasAttribute('disabled')).toBe(true);
  });

  it('selects only one client and emits the confirmed row', () => {
    const { component, fixture, dialog } = setup();
    const selected = vi.fn(); component.selected.subscribe(selected);
    component.open(); fixture.detectChanges();
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
    component.open(); expect(old.observed).toBe(true);
    api.lookupClients.mockReturnValueOnce(throwError(() => new Error('Unavailable')));
    component.searchClients(); expect(old.observed).toBe(false);
    expect(component.error()).toContain('could not be loaded');
    api.lookupClients.mockReturnValueOnce(of({ rows: [], page: 1, pageSize: 10, totalCount: 0, totalPages: 0 }));
    component.searchClients();
    expect(component.error()).toBe(''); expect(component.rows()).toEqual([]);
    expect(component.loading()).toBe(false);
  });

  it('cancel and Escape do not emit a selection and cancel pending lookup', () => {
    const { api, component, dialog } = setup(); const selected = vi.fn(); component.selected.subscribe(selected);
    const pending = new Subject<DeliveryClientPage>(); api.lookupClients.mockReturnValueOnce(pending);
    component.open(); expect(pending.observed).toBe(true);
    dialog.dispatchEvent(new Event('cancel', { cancelable: true }));
    expect(pending.observed).toBe(false); expect(selected).not.toHaveBeenCalled();
    expect(component.opened()).toBe(false);
  });
});
