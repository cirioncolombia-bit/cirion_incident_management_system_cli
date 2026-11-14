import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AuthService } from '../../../../auth/services/auth.service';
import { Delivery } from './delivery';
import { DeliveryService } from '../../services/delivery.service';
import { DeliverySummary } from '../../models/delivery-summary';

describe('Delivery summary', () => {
  function setup(totalInstallationCost: number | undefined = 125000, permissions = ['deliveries.read', 'deliveries.write'], overrides: Partial<DeliverySummary> = {}) {
    const record = {
      id: 42, workOrderId: 'DKO-100', rfsFiberChain: 'RFS-1', clientId: 7, clientName: 'Client', siteType: 'Site',
      buildingSite: 'Site', address: 'Address', cityName: 'Bogotá', nodeName: 'SUBA',
      revenue: 1000, surveryCost: 0, installationBudget: 0, totalInstallationCost,
      statusDescription: 'DETENIDO CLIENTE', email: 'contact@example.com', contactName: 'Ana', mobilePhone: 3001234567,
      ...overrides,
    } as DeliverySummary;
    TestBed.configureTestingModule({ imports: [Delivery], providers: [provideRouter([]), {provide: AuthService, useValue: {currentUser: () => ({permissions})}},
      { provide: DeliveryService, useValue: { getAll: () => of([record]), getStatusHistory: () => throwError(() => new Error('Not available')) } },
    ] });
    const fixture = TestBed.createComponent(Delivery); fixture.detectChanges();
    return { fixture, component: fixture.componentInstance, element: fixture.nativeElement as HTMLElement };
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
    component.searchTerm.set('empresa vinculada');
    fixture.detectChanges();
    expect(component.filteredDeliveries().length).toBe(1);
    component.searchTerm.set('other client');
    expect(component.filteredDeliveries()).toEqual([]);
  });

  it('keeps deliveries without a client visible and searchable without errors', () => {
    const { component, fixture, element } = setup(0, ['deliveries.read'], {
      clientId: null, clientName: null, siteType: null,
    });
    expect(component.deliveries()[0].clientName).toBe('—');
    expect(element.querySelector('.delivery-card__header p')?.textContent?.trim()).toBe('—');
    component.searchTerm.set('not present');
    expect(() => fixture.detectChanges()).not.toThrow();
    expect(component.filteredDeliveries()).toEqual([]);
    component.searchTerm.set('dko-100');
    expect(component.filteredDeliveries().length).toBe(1);
  });

});
