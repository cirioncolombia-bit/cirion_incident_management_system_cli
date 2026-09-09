import { Component, computed, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

type DeliveryStatus =
  | 'EN PROCESO'
  | 'DETENIDO'
  | 'TERMINADO';

type DeliveryTechnology =
  | 'METRO2'
  | 'METRO3'
  | 'DWDM'
  | 'TRANSPORTE'
  | 'FIBRA OSCURA'
  | 'SAVING';

interface DeliveryItem {
  readonly id: number;
  readonly dkoTkt: string;
  readonly client: string;
  readonly building: string;
  readonly city: string;
  readonly technology: DeliveryTechnology;
  readonly type: 'DELIVERY' | 'PREVENTA';
  readonly status: DeliveryStatus;
  readonly responsible: string;
  readonly assignmentDate: string;
}

@Component({
  selector: 'app-delivery',
  imports: [RouterLink],
  templateUrl: './delivery.html',
  styleUrl: './delivery.scss',
})
export class Delivery {
  readonly searchTerm = signal('');
  readonly selectedStatus = signal<DeliveryStatus | 'TODOS'>('TODOS');
  readonly currentPage = signal(1);

  readonly deliveries = signal<readonly DeliveryItem[]>([
    {
      id: 1,
      dkoTkt: 'DKO-2024-001235',
      client: 'Banco de la Nación',
      building: 'Edificio Central',
      city: 'Lima',
      technology: 'METRO2',
      type: 'DELIVERY',
      status: 'EN PROCESO',
      responsible: 'María Torres',
      assignmentDate: '10/02/2024',
    },
    {
      id: 2,
      dkoTkt: 'DKO-2024-001236',
      client: 'Telefónica',
      building: 'Sede Norte',
      city: 'Bogotá',
      technology: 'DWDM',
      type: 'DELIVERY',
      status: 'DETENIDO',
      responsible: 'Juan Pérez',
      assignmentDate: '12/02/2024',
    },
    {
      id: 3,
      dkoTkt: 'DKO-2024-001237',
      client: 'Claro',
      building: 'Torre Empresarial',
      city: 'Santiago',
      technology: 'FIBRA OSCURA',
      type: 'PREVENTA',
      status: 'EN PROCESO',
      responsible: 'Ana López',
      assignmentDate: '15/02/2024',
    },
    {
      id: 4,
      dkoTkt: 'DKO-2024-001238',
      client: 'Banco BBVA',
      building: 'Torre 1',
      city: 'Lima',
      technology: 'TRANSPORTE',
      type: 'DELIVERY',
      status: 'TERMINADO',
      responsible: 'Carlos Mendoza',
      assignmentDate: '18/02/2024',
    },
    {
      id: 5,
      dkoTkt: 'DKO-2024-001239',
      client: 'Entel',
      building: 'Edificio Principal',
      city: 'Madrid',
      technology: 'METRO3',
      type: 'DELIVERY',
      status: 'EN PROCESO',
      responsible: 'María Torres',
      assignmentDate: '20/02/2024',
    },
    {
      id: 6,
      dkoTkt: 'DKO-2024-001240',
      client: 'Grupo Aval',
      building: 'Sede Centro',
      city: 'Bogotá',
      technology: 'SAVING',
      type: 'DELIVERY',
      status: 'DETENIDO',
      responsible: 'Juan Pérez',
      assignmentDate: '22/02/2024',
    },
    {
      id: 7,
      dkoTkt: 'DKO-2024-001241',
      client: 'Movistar',
      building: 'Torre Empresarial',
      city: 'Lima',
      technology: 'DWDM',
      type: 'DELIVERY',
      status: 'EN PROCESO',
      responsible: 'Ana López',
      assignmentDate: '25/02/2024',
    },
    {
      id: 8,
      dkoTkt: 'DKO-2024-001242',
      client: 'Empresa XYZ',
      building: 'Edificio Corporativo',
      city: 'Santiago',
      technology: 'FIBRA OSCURA',
      type: 'DELIVERY',
      status: 'TERMINADO',
      responsible: 'Carlos Mendoza',
      assignmentDate: '28/02/2024',
    },
  ]);

  readonly filteredDeliveries = computed(() => {
    const search = this.searchTerm()
      .trim()
      .toLocaleLowerCase();

    const selectedStatus = this.selectedStatus();

    return this.deliveries().filter((delivery) => {
      const matchesStatus =
        selectedStatus === 'TODOS'
        || delivery.status === selectedStatus;

      const matchesSearch =
        !search
        || delivery.dkoTkt.toLocaleLowerCase().includes(search)
        || delivery.client.toLocaleLowerCase().includes(search)
        || delivery.building.toLocaleLowerCase().includes(search)
        || delivery.city.toLocaleLowerCase().includes(search);

      return matchesStatus && matchesSearch;
    });
  });

  readonly totalDeliveries = computed(
    () => this.deliveries().length,
  );

  readonly inProgressDeliveries = computed(
    () =>
      this.deliveries().filter(
        (delivery) => delivery.status === 'EN PROCESO',
      ).length,
  );

  readonly stoppedDeliveries = computed(
    () =>
      this.deliveries().filter(
        (delivery) => delivery.status === 'DETENIDO',
      ).length,
  );

  readonly completedDeliveries = computed(
    () =>
      this.deliveries().filter(
        (delivery) => delivery.status === 'TERMINADO',
      ).length,
  );

  onSearch(event: Event): void {
    const input = event.target as HTMLInputElement;

    this.searchTerm.set(input.value);
    this.currentPage.set(1);
  }

  filterByStatus(
    status: DeliveryStatus | 'TODOS',
  ): void {
    this.selectedStatus.set(status);
    this.currentPage.set(1);
  }

  clearFilters(): void {
    this.searchTerm.set('');
    this.selectedStatus.set('TODOS');
    this.currentPage.set(1);
  }

  goToPage(page: number): void {
    this.currentPage.set(page);
  }
}