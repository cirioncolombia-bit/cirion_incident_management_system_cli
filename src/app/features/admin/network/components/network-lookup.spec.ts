import { TestBed } from '@angular/core/testing';
import { of, Subject } from 'rxjs';
import { vi } from 'vitest';
import { NetworkLookup } from './network-lookup';
import { NetworkService } from '../services/network.service';
import { NetworkPage } from '../network.models';

describe('Network relationship lookup', () => {
  function setup(disabled = false) {
    const api = {
      list: vi.fn(() =>
        of<NetworkPage>({
          rows: [{ id: 1, name: 'Tray A', isActive: true }],
          page: 1,
          totalCount: 42,
          totalPages: 3,
        }),
      ),
    };
    TestBed.configureTestingModule({
      imports: [NetworkLookup],
      providers: [{ provide: NetworkService, useValue: api }],
    });
    const fixture = TestBed.createComponent(NetworkLookup);
    fixture.componentRef.setInput('resource', 'FiberTrays');
    fixture.componentRef.setInput('label', 'FiberTray');
    fixture.componentRef.setInput('fieldId', 'tray');
    fixture.componentRef.setInput('parentId', 4);
    fixture.componentRef.setInput('disabled', disabled);
    fixture.detectChanges();
    return { fixture, component: fixture.componentInstance, api };
  }
  it('loads active options with server pagination and search', () => {
    const { component, api } = setup();
    expect(api.list).toHaveBeenCalledWith('FiberTrays', { parentId: 4, page: 1, search: '' });
    component.search.set('Tray');
    component.applySearch();
    component.paginate(1);
    expect(api.list).toHaveBeenLastCalledWith('FiberTrays', {
      parentId: 4,
      page: 2,
      search: 'Tray',
    });
  });
  it('does not query a child before its parent is selected', () => {
    const { api, component } = setup(true);
    component.load();
    expect(api.list).not.toHaveBeenCalled();
  });
  it('discards stale results when the parent changes', () => {
    const { fixture, component, api } = setup();
    const pending = new Subject<NetworkPage>();
    api.list.mockReturnValueOnce(pending);
    component.load();
    fixture.componentRef.setInput('parentId', 99);
    fixture.detectChanges();
    pending.next({
      rows: [{ id: 88, name: 'Old parent tray', isActive: true }],
      page: 1,
      totalCount: 1,
      totalPages: 1,
    });
    pending.complete();
    expect(component.rows().map((row) => row.id)).toEqual([1]);
  });
  it('keeps selected labels visible when searching another page', () => {
    const { fixture } = setup();
    fixture.componentRef.setInput('selected', { id: 99, name: 'Current tray' });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('select').textContent).toContain('Current tray');
    expect(fixture.nativeElement.querySelector('select').value).toBe('99');
  });
});
