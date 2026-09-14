import { Component, computed, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { RouterLink } from '@angular/router';

type DeliveryStatus = 'EN PROCESO' | 'DETENIDO' | 'TERMINADO';

type DeliveryTechnology = 'METRO2' | 'METRO3' | 'DWDM' | 'TRANSPORTE' | 'FIBRA OSCURA';

type DeliveryType = 'PREVENTA' | 'SAVING';

interface DeliveryItem {
  readonly id: number;

  // 1. Identification
  readonly dkoTkt: string;
  readonly rfsFiberChain: string;
  readonly consecutive: string;
  readonly soSap: string;

  // 2. Client & Location
  readonly clientName: string;
  readonly buildingName: string;
  readonly address: string;
  readonly city: string;
  readonly node: string;
  readonly revenue: string;

  // 3. Classification
  readonly type: DeliveryType;
  readonly status: DeliveryStatus;
  readonly technology: DeliveryTechnology;

  // 4. Assignment
  readonly landlord: string;
  readonly eaim: string;
  readonly responsible: string;

  // 5. Dates
  readonly dkoAssignmentDate: string;
  readonly eaimSurveyRequestDate: string;
  readonly installationDate: string;

  // 6. Costs
  readonly surveyCost: string;
  readonly installationBudget: string;
  readonly installationCost: string;

  // 7. Contact
  readonly email: string;
  readonly contact: string;
  readonly phone: string;

  // 8. Observations
  readonly observations: string;
}

const noWhitespaceValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const value = String(control.value ?? '').trim();

  return value.length > 0 ? null : { whitespace: true };
};

function createMockDelivery(
  delivery: Pick<
    DeliveryItem,
    | 'id'
    | 'dkoTkt'
    | 'clientName'
    | 'buildingName'
    | 'city'
    | 'technology'
    | 'type'
    | 'status'
    | 'responsible'
    | 'dkoAssignmentDate'
  >,
): DeliveryItem {
  const suffix = String(delivery.id).padStart(4, '0');

  return {
    ...delivery,

    rfsFiberChain: `RFS-2024-${suffix}`,
    consecutive: `APP-${suffix}`,
    soSap: `SO-${suffix}`,

    address: `Business Address ${delivery.id}`,
    node: `Node ${delivery.id}`,
    revenue: String(15_000_000 + delivery.id * 1_250_000),

    landlord: delivery.id % 2 === 0 ? 'Vendor 2' : 'Vendor 1',

    eaim: delivery.id % 2 === 0 ? 'Contractor 2' : 'Contractor 1',

    eaimSurveyRequestDate: '2024-02-20',
    installationDate: '2024-03-15',

    surveyCost: String(500_000 + delivery.id * 50_000),

    installationBudget: String(5_000_000 + delivery.id * 250_000),

    installationCost: String(4_800_000 + delivery.id * 200_000),

    email: `contact${delivery.id}@example.com`,
    contact: `Contact ${delivery.id}`,
    phone: `30012345${String(delivery.id).padStart(2, '0')}`,

    observations: 'Mock delivery information for frontend development.',
  };
}

@Component({
  selector: 'app-delivery',
  imports: [RouterLink, ReactiveFormsModule],
  templateUrl: './delivery.html',
  styleUrl: './delivery.scss',
})
export class Delivery {
  private readonly formBuilder = inject(FormBuilder);

  readonly searchTerm = signal('');

  readonly selectedStatus = signal<DeliveryStatus | 'TODOS'>('TODOS');

  readonly currentPage = signal(1);

  readonly editingDeliveryId = signal<number | null>(null);

  readonly editAttempted = signal(false);

  readonly deliveryTypes: readonly DeliveryType[] = ['PREVENTA', 'SAVING'];

  readonly deliveryStatuses: readonly DeliveryStatus[] = ['EN PROCESO', 'DETENIDO', 'TERMINADO'];

  readonly technologies: readonly DeliveryTechnology[] = [
    'METRO2',
    'METRO3',
    'DWDM',
    'TRANSPORTE',
    'FIBRA OSCURA',
  ];

  readonly cities = ['Bogotá', 'Medellín', 'Cali', 'Lima', 'Santiago', 'Madrid'] as const;

  readonly nodes = [
    'Node 1',
    'Node 2',
    'Node 3',
    'Node 4',
    'Node 5',
    'Node 6',
    'Node 7',
    'Node 8',
  ] as const;

  readonly landlords = ['Vendor 1', 'Vendor 2'] as const;

  readonly eaimOptions = ['Contractor 1', 'Contractor 2'] as const;

  readonly responsibleOptions = [
    'María Torres',
    'Juan Pérez',
    'Ana López',
    'Carlos Mendoza',
  ] as const;

  readonly deliveries = signal<readonly DeliveryItem[]>([
    createMockDelivery({
      id: 1,
      dkoTkt: 'DKO-2024-001235',
      clientName: 'Banco de la Nación',
      buildingName: 'Edificio Central',
      city: 'Lima',
      technology: 'METRO2',
      type: 'SAVING',
      status: 'EN PROCESO',
      responsible: 'María Torres',
      dkoAssignmentDate: '2024-02-10',
    }),

    createMockDelivery({
      id: 2,
      dkoTkt: 'DKO-2024-001236',
      clientName: 'Telefónica',
      buildingName: 'Sede Norte',
      city: 'Bogotá',
      technology: 'DWDM',
      type: 'SAVING',
      status: 'DETENIDO',
      responsible: 'Juan Pérez',
      dkoAssignmentDate: '2024-02-12',
    }),

    createMockDelivery({
      id: 3,
      dkoTkt: 'DKO-2024-001237',
      clientName: 'Claro',
      buildingName: 'Torre Empresarial',
      city: 'Santiago',
      technology: 'FIBRA OSCURA',
      type: 'PREVENTA',
      status: 'EN PROCESO',
      responsible: 'Ana López',
      dkoAssignmentDate: '2024-02-15',
    }),

    createMockDelivery({
      id: 4,
      dkoTkt: 'DKO-2024-001238',
      clientName: 'Banco BBVA',
      buildingName: 'Torre 1',
      city: 'Lima',
      technology: 'TRANSPORTE',
      type: 'SAVING',
      status: 'TERMINADO',
      responsible: 'Carlos Mendoza',
      dkoAssignmentDate: '2024-02-18',
    }),

    createMockDelivery({
      id: 5,
      dkoTkt: 'DKO-2024-001239',
      clientName: 'Entel',
      buildingName: 'Edificio Principal',
      city: 'Madrid',
      technology: 'METRO3',
      type: 'SAVING',
      status: 'EN PROCESO',
      responsible: 'María Torres',
      dkoAssignmentDate: '2024-02-20',
    }),

    createMockDelivery({
      id: 6,
      dkoTkt: 'DKO-2024-001240',
      clientName: 'Grupo Aval',
      buildingName: 'Sede Centro',
      city: 'Bogotá',
      technology: 'METRO2',
      type: 'SAVING',
      status: 'DETENIDO',
      responsible: 'Juan Pérez',
      dkoAssignmentDate: '2024-02-22',
    }),

    createMockDelivery({
      id: 7,
      dkoTkt: 'DKO-2024-001241',
      clientName: 'Movistar',
      buildingName: 'Torre Empresarial',
      city: 'Lima',
      technology: 'DWDM',
      type: 'SAVING',
      status: 'EN PROCESO',
      responsible: 'Ana López',
      dkoAssignmentDate: '2024-02-25',
    }),

    createMockDelivery({
      id: 8,
      dkoTkt: 'DKO-2024-001242',
      clientName: 'Empresa XYZ',
      buildingName: 'Edificio Corporativo',
      city: 'Santiago',
      technology: 'FIBRA OSCURA',
      type: 'SAVING',
      status: 'TERMINADO',
      responsible: 'Carlos Mendoza',
      dkoAssignmentDate: '2024-02-28',
    }),
  ]);

  readonly editForm = this.formBuilder.nonNullable.group({
    rfsFiberChain: ['', [Validators.required, noWhitespaceValidator]],

    consecutive: ['', [Validators.required, noWhitespaceValidator]],

    soSap: ['', [Validators.required, noWhitespaceValidator]],

    clientName: ['', [Validators.required, noWhitespaceValidator]],

    buildingName: ['', [Validators.required, noWhitespaceValidator]],

    address: ['', [Validators.required, noWhitespaceValidator]],

    city: ['', Validators.required],

    node: ['', Validators.required],

    revenue: ['', [Validators.required, Validators.pattern(/^\d+$/), Validators.min(0)]],

    type: ['', Validators.required],

    status: ['', Validators.required],

    technology: ['', Validators.required],

    landlord: ['', Validators.required],

    eaim: ['', Validators.required],

    responsible: ['', Validators.required],

    dkoAssignmentDate: ['', Validators.required],

    eaimSurveyRequestDate: ['', Validators.required],

    installationDate: ['', Validators.required],

    surveyCost: ['', [Validators.required, Validators.pattern(/^\d+$/), Validators.min(0)]],

    installationBudget: ['', [Validators.required, Validators.pattern(/^\d+$/), Validators.min(0)]],

    installationCost: ['', [Validators.required, Validators.pattern(/^\d+$/), Validators.min(0)]],

    email: ['', [Validators.required, Validators.email]],

    contact: ['', [Validators.required, noWhitespaceValidator]],

    phone: [
      '',
      [Validators.required, Validators.pattern(/^(?:\+57[\s-]?)?3\d{2}[\s-]?\d{3}[\s-]?\d{4}$/)],
    ],

    observations: ['', [Validators.required, noWhitespaceValidator]],
  });

  readonly filteredDeliveries = computed(() => {
    const search = this.searchTerm().trim().toLocaleLowerCase();

    const selectedStatus = this.selectedStatus();

    return this.deliveries().filter((delivery) => {
      const matchesStatus = selectedStatus === 'TODOS' || delivery.status === selectedStatus;

      const matchesSearch =
        !search ||
        delivery.dkoTkt.toLocaleLowerCase().includes(search) ||
        delivery.rfsFiberChain.toLocaleLowerCase().includes(search) ||
        delivery.clientName.toLocaleLowerCase().includes(search) ||
        delivery.buildingName.toLocaleLowerCase().includes(search) ||
        delivery.city.toLocaleLowerCase().includes(search) ||
        delivery.responsible.toLocaleLowerCase().includes(search);

      return matchesStatus && matchesSearch;
    });
  });

  readonly totalDeliveries = computed(() => this.deliveries().length);

  readonly inProgressDeliveries = computed(
    () => this.deliveries().filter((delivery) => delivery.status === 'EN PROCESO').length,
  );

  readonly stoppedDeliveries = computed(
    () => this.deliveries().filter((delivery) => delivery.status === 'DETENIDO').length,
  );

  readonly completedDeliveries = computed(
    () => this.deliveries().filter((delivery) => delivery.status === 'TERMINADO').length,
  );

  onSearch(event: Event): void {
    const input = event.target as HTMLInputElement;

    this.searchTerm.set(input.value);
    this.currentPage.set(1);
  }

  filterByStatus(status: DeliveryStatus | 'TODOS'): void {
    this.selectedStatus.set(status);
    this.currentPage.set(1);
  }

  clearFilters(): void {
    this.searchTerm.set('');
    this.selectedStatus.set('TODOS');
    this.currentPage.set(1);
  }

  goToPage(page: number): void {
    if (page < 1) {
      return;
    }

    this.currentPage.set(page);
  }

  startEdit(delivery: DeliveryItem): void {
    this.editAttempted.set(false);

    this.editForm.reset({
      rfsFiberChain: delivery.rfsFiberChain,

      consecutive: delivery.consecutive,

      soSap: delivery.soSap,

      clientName: delivery.clientName,

      buildingName: delivery.buildingName,

      address: delivery.address,

      city: delivery.city,

      node: delivery.node,

      revenue: delivery.revenue,

      type: delivery.type,

      status: delivery.status,

      technology: delivery.technology,

      landlord: delivery.landlord,

      eaim: delivery.eaim,

      responsible: delivery.responsible,

      dkoAssignmentDate: delivery.dkoAssignmentDate,

      eaimSurveyRequestDate: delivery.eaimSurveyRequestDate,

      installationDate: delivery.installationDate,

      surveyCost: delivery.surveyCost,

      installationBudget: delivery.installationBudget,

      installationCost: delivery.installationCost,

      email: delivery.email,

      contact: delivery.contact,

      phone: delivery.phone,

      observations: delivery.observations,
    });

    this.editingDeliveryId.set(delivery.id);
  }

  cancelEdit(): void {
    this.editingDeliveryId.set(null);
    this.editAttempted.set(false);
    this.editForm.reset();
  }

  saveEdit(): void {
    this.editAttempted.set(true);
    this.editForm.markAllAsTouched();

    if (this.editForm.invalid) {
      return;
    }

    const editingId = this.editingDeliveryId();

    if (editingId === null) {
      return;
    }

    const value = this.editForm.getRawValue();

    this.deliveries.update((deliveries) =>
      deliveries.map((delivery) => {
        if (delivery.id !== editingId) {
          return delivery;
        }

        return {
          ...delivery,

          rfsFiberChain: value.rfsFiberChain,
          consecutive: value.consecutive,
          soSap: value.soSap,

          clientName: value.clientName,
          buildingName: value.buildingName,
          address: value.address,
          city: value.city,
          node: value.node,
          revenue: value.revenue,

          type: value.type as DeliveryType,
          status: value.status as DeliveryStatus,
          technology: value.technology as DeliveryTechnology,

          landlord: value.landlord,
          eaim: value.eaim,
          responsible: value.responsible,

          dkoAssignmentDate: value.dkoAssignmentDate,
          eaimSurveyRequestDate: value.eaimSurveyRequestDate,
          installationDate: value.installationDate,

          surveyCost: value.surveyCost,
          installationBudget: value.installationBudget,
          installationCost: value.installationCost,

          email: value.email,
          contact: value.contact,
          phone: value.phone,

          observations: value.observations,
        };
      }),
    );

    this.editingDeliveryId.set(null);
    this.editAttempted.set(false);
  }

  isEditing(deliveryId: number): boolean {
    return this.editingDeliveryId() === deliveryId;
  }

  formatCurrency(value: string): string {
    const numericValue = Number(value);

    if (!Number.isFinite(numericValue)) {
      return value;
    }

    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(numericValue);
  }

  statusLabel(status: DeliveryStatus): string {
    switch (status) {
      case 'EN PROCESO':
        return 'In Progress';

      case 'DETENIDO':
        return 'Stopped';

      case 'TERMINADO':
        return 'Completed';
    }
  }

  typeLabel(type: DeliveryType): string {
    return type === 'PREVENTA' ? 'Pre-Sale' : 'Saving';
  }

  technologyLabel(technology: DeliveryTechnology): string {
    switch (technology) {
      case 'TRANSPORTE':
        return 'Transport';

      case 'FIBRA OSCURA':
        return 'Dark Fiber';

      default:
        return technology;
    }
  }
}
