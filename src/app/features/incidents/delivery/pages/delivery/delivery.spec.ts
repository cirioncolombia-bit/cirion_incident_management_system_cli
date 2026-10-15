import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { Delivery } from './delivery';
import { DeliveryService } from '../../services/delivery.service';
import { DeliverySummary } from '../../models/delivery-summary';

describe('Delivery summary', () => {
  function setup(totalInstallationCost: number | undefined = 125000) {
    const record = {
      id: 42, workOrderId: 'DKO-100', rfsFiberChain: 'RFS-1', clientName: 'Client',
      buildingSite: 'Site', address: 'Address', cityName: 'Bogotá', nodeName: 'SUBA',
      revenue: 1000, surveryCost: 0, installationBudget: 0, totalInstallationCost,
      statusDescription: 'DETENIDO CLIENTE', email: 'contact@example.com', contactName: 'Ana', mobilePhone: 3001234567,
    } as DeliverySummary;
    TestBed.configureTestingModule({ imports: [Delivery], providers: [provideRouter([]),
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
});
