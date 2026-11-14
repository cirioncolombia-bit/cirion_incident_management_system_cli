import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError, Subject } from 'rxjs';
import { AuthService } from '../../../../auth/services/auth.service';
import { Delivery } from './delivery';
import { DeliveryService } from '../../services/delivery.service';
import { DeliverySummary, DeliveryListQuery, DeliveryPage } from '../../models/delivery-summary';

describe('Delivery summary', () => {
  afterEach(() => vi.useRealTimers());
  function setup(totalInstallationCost: number | undefined = 125000, permissions = ['deliveries.read', 'deliveries.write'], overrides: Partial<DeliverySummary> = {}) {
    const record = {
      id: 42, workOrderId: 'DKO-100', rfsFiberChain: 'RFS-1', clientId: 7, clientName: 'Client', siteType: 'Site',
      buildingSite: 'Site', address: 'Address', cityName: 'Bogotá', nodeName: 'SUBA',
      revenue: 1000, surveryCost: 0, installationBudget: 0, totalInstallationCost,
      statusDescription: 'DETENIDO CLIENTE', email: 'contact@example.com', contactName: 'Ana', mobilePhone: 3001234567,
      ...overrides,
    } as DeliverySummary;
    const api = {
      getPage: vi.fn((query: DeliveryListQuery) => {
        const term = query.search?.toLowerCase() ?? '';
        const haystack = [record.workOrderId, record.rfsFiberChain, record.clientName, record.siteType, record.cityName]
          .map(value => value?.replace(/\s+/g, ' ').toLowerCase() ?? '').join(' ');
        const matches = haystack.includes(term) && (!query.status || query.status === record.statusDescription);
        const rows = matches ? [record] : [];
        return of({ rows, page: query.page, pageSize: 20, totalCount: rows.length, totalPages: rows.length ? 1 : 0,
          totalActive: 1, statuses: [{ description: record.statusDescription, count: 1 }] } as DeliveryPage);
      }),
      getStatusHistory: vi.fn(() => throwError(() => new Error('Not available'))),
    };
    TestBed.configureTestingModule({ imports: [Delivery], providers: [provideRouter([]), {provide: AuthService, useValue: {currentUser: () => ({permissions})}},
      { provide: DeliveryService, useValue: api },
    ] });
    const fixture = TestBed.createComponent(Delivery); fixture.detectChanges();
    return { api, record, fixture, component: fixture.componentInstance, element: fixture.nativeElement as HTMLElement };
  }
  it('shows the identifier beside Workorder and keeps table columns aligned', () => {
    const {element} = setup();
    const headers = [...element.querySelectorAll('th')].map(h => h.textContent!.trim());
    expect(headers).not.toContain('Landlord'); expect(headers).not.toContain('Consecutive');
    const revenue = headers.indexOf('Revenue');
    expect(headers.slice(revenue + 1, revenue + 4)).toEqual(['Email', 'Contact Name', 'Mobile Phone']);
    const cells = [...element.querySelectorAll('tbody tr:first-child td')];
    expect(cells.length).toBe(headers.length);
    expect(cells[headers.indexOf('DKO/TKT')].textContent).toContain('DKO-100');
    expect(cells[headers.indexOf('DKO/TKT')].textContent).toContain('#42');
    expect(cells[headers.indexOf('Email')].textContent).toContain('contact@example.com');
    expect(cells[headers.indexOf('Installation Cost')].textContent).toContain('125.000');
  });
  it('keeps details available but hides creation and editing for a viewer', () => {
    const {element, component} = setup(125000, ['deliveries.read']);
    expect(component.canWrite()).toBe(false);
    expect(element.querySelector('.delivery-page__create')).toBeNull();
    expect(element.querySelector('button[title="Edit delivery"]')).toBeNull();
    expect(element.querySelector('a[title="View details"]')).not.toBeNull();
  });
  it('allows a module Admin with combined read/write grants to create and edit', () => {
    const {element, component} = setup();
    expect(component.canWrite()).toBe(true);
    expect(element.querySelector('.delivery-page__create')).not.toBeNull();
    expect(element.querySelector('button[title="Edit delivery"]')).not.toBeNull();
  });
  it('uses the service total and formats an empty cost total as zero pesos', () => {
    const {component} = setup(0);
    expect(component.deliveries()[0].installationCost).toBe('0');
    expect(component.formatCurrency(component.deliveries()[0].installationCost)).toContain('$');
    expect(component.formatCurrency(component.deliveries()[0].installationCost)).toContain('0');
  });
  it('distinguishes stopped by client and keeps readable fallback colors', () => {
    const {component, element} = setup();
    expect(element.querySelectorAll('.delivery-status--client-stopped').length).toBe(2);
    expect(component.statusTone('DETENIDO')).toBe('stopped');
    expect(component.statusTone('Stopped by client')).toBe('client-stopped');
    expect(component.statusTone('EN PROCESO')).toBe('progress');
    expect(component.statusTone('Completed')).toBe('completed');
    expect(component.statusTone('New catalog status')).toBe('neutral');
  });
  it('shows and searches the related client name instead of its identifier', () => {
    const { component, element, fixture } = setup(0, ['deliveries.read'], {
      clientId: 987, clientName: '  Empresa   vinculada  ', siteType: 'Office', address: 'Client address',
    });
    const item = component.deliveries()[0];
    expect(item.clientId).toBe(987);
    expect(item.clientName).toBe('Empresa vinculada');
    expect(item.buildingName).toBe('Office');
    expect(item.address).toBe('Client address');
    expect(element.querySelector('.delivery-card__header p')?.textContent).toContain('Empresa vinculada');
    const headers = [...element.querySelectorAll('th')].map(h => h.textContent!.trim());
    const cells = [...element.querySelectorAll('tbody tr:first-child td')];
    expect(cells[headers.indexOf('Client Name')].textContent?.trim()).toBe('Empresa vinculada');
    vi.useFakeTimers();
    const input = document.createElement('input');
    input.value = 'empresa vinculada';
    component.onSearch({ target: input } as unknown as Event);
    vi.advanceTimersByTime(300);
    fixture.detectChanges();
    expect(component.filteredDeliveries().length).toBe(1);
    input.value = 'other client';
    component.onSearch({ target: input } as unknown as Event);
    vi.advanceTimersByTime(300);
    expect(component.filteredDeliveries()).toEqual([]);
  });

  it('keeps deliveries without a client visible and searchable without errors', () => {
    const { component, fixture, element } = setup(0, ['deliveries.read'], {
      clientId: null, clientName: null, siteType: null,
    });
    expect(component.deliveries()[0].clientName).toBe('—');
    expect(element.querySelector('.delivery-card__header p')?.textContent?.trim()).toBe('—');
    vi.useFakeTimers();
    const input = document.createElement('input');
    input.value = 'not present';
    component.onSearch({ target: input } as unknown as Event);
    vi.advanceTimersByTime(300);
    expect(() => fixture.detectChanges()).not.toThrow();
    expect(component.filteredDeliveries()).toEqual([]);
    input.value = 'dko-100';
    component.onSearch({ target: input } as unknown as Event);
    vi.advanceTimersByTime(300);
    expect(component.filteredDeliveries().length).toBe(1);
  });

  it('requests a bounded page and obtains current duration without per-row history requests', () => {
    const { api, component } = setup(0, ['deliveries.read'], {
      currentStatusStartedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    });
    expect(api.getPage).toHaveBeenCalledTimes(1);
    expect(api.getPage.mock.calls[0][0]).toMatchObject({ page: 1, pageSize: 20 });
    expect(api.getStatusHistory).not.toHaveBeenCalled();
    expect(component.timeInCurrentStatus(component.deliveries()[0])).toBe('0d 02h 00m');
  });

  it('uses server totals and page results rather than slicing them again', () => {
    const { api, component, record } = setup();
    api.getPage.mockImplementation(query => of({ rows: [record], page: query.page, pageSize: 20,
      totalCount: 80, totalPages: 4, totalActive: 120,
      statuses: [{ description: 'EN PROCESO', count: 60 }, { description: 'DETENIDO', count: 40 },
        { description: 'TERMINADO', count: 20 }] }));
    component.loadDeliveries();
    component.goToPage(2);
    expect(api.getPage.mock.calls.at(-1)?.[0].page).toBe(2);
    expect(component.currentPage()).toBe(2);
    expect(component.pagedDeliveries().length).toBe(1);
    expect(component.totalCount()).toBe(80);
    expect(component.totalDeliveries()).toBe(120);
    expect(component.inProgressDeliveries()).toBe(60);
    expect(component.stoppedDeliveries()).toBe(40);
  });

  it('debounces search and sends status and search filters to the server', () => {
    vi.useFakeTimers();
    const { api, component } = setup();
    const input = document.createElement('input');
    input.value = 'Cli';
    component.onSearch({ target: input } as unknown as Event);
    input.value = 'Client';
    component.onSearch({ target: input } as unknown as Event);
    expect(api.getPage).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(300);
    expect(api.getPage).toHaveBeenCalledTimes(2);
    component.filterByStatus('DETENIDO CLIENTE');
    expect(api.getPage.mock.calls.at(-1)?.[0]).toMatchObject({ page: 1, search: 'Client', status: 'DETENIDO CLIENTE' });
  });

  it('cancels obsolete loads and recovers from an error when retried', () => {
    const { api, component, record } = setup();
    const previous = new Subject<DeliveryPage>();
    api.getPage.mockReturnValueOnce(previous);
    component.loadDeliveries();
    expect(previous.observed).toBe(true);
    api.getPage.mockReturnValueOnce(throwError(() => ({ status: 504 })));
    component.loadDeliveries();
    expect(previous.observed).toBe(false);
    expect(component.loading()).toBe(false);
    expect(component.loadError()).toContain('Unable to load');
    component.loadDeliveries();
    expect(component.loadError()).toBeNull();
    expect(component.deliveries()[0].id).toBe(record.id);
  });

});
