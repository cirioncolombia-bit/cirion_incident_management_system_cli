import { Component, computed, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

type DeliveryType = 'PREVENTA' | 'SAVING';

type DeliveryStatus = 'EN PROCESO' | 'DETENIDO' | 'TERMINADO';

type DeliveryTechnology = 'METRO2' | 'METRO3' | 'DWDM' | 'TRANSPORTE' | 'FIBRA OSCURA';

type DeliverySection =
  | 'identification'
  | 'clientLocation'
  | 'classification'
  | 'assignment'
  | 'dates'
  | 'costs'
  | 'contact'
  | 'observations';

interface DeliveryItem {
  readonly id: number;
  readonly dkoTkt: string;
  readonly rfsFiberChain: string;
  readonly consecutive: string;
  readonly soSap: string;

  readonly clientName: string;
  readonly buildingName: string;
  readonly address: string;
  readonly city: string;
  readonly node: string;
  readonly revenue: string;

  readonly type: DeliveryType;
  readonly status: DeliveryStatus;
  readonly technology: DeliveryTechnology;

  readonly landlord: string;
  readonly eaim: string;
  readonly responsible: string;

  readonly dkoAssignmentDate: string;
  readonly eaimSurveyRequestDate: string;
  readonly installationDate: string;

  readonly surveyCost: string;
  readonly installationBudget: string;
  readonly installationCost: string;

  readonly email: string;
  readonly contact: string;
  readonly phone: string;

  readonly observations: string;
}

const noWhitespaceValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const value = control.value;

  if (typeof value === 'string' && value.trim().length === 0) {
    return {
      whitespace: true,
    };
  }

  return null;
};

@Component({
  selector: 'app-delivery-edit',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './delivery-edit.html',
  styleUrl: './delivery-edit.scss',
})
export class DeliveryEdit {
  private readonly route = inject(ActivatedRoute);

  private readonly router = inject(Router);

  private readonly formBuilder = inject(FormBuilder);

  readonly submitted = signal(false);

  readonly openSection = signal<DeliverySection | null>('identification');

  readonly deliveries: readonly DeliveryItem[] = [
    {
      id: 1,
      dkoTkt: 'DKO-2024-001235',
      rfsFiberChain: 'RFS-2024-0001',
      consecutive: 'APR-001235',
      soSap: 'SO-100235',

      clientName: 'Banco de la Nación',
      buildingName: 'Edificio Central',
      address: 'Carrera 7 # 72-41',
      city: 'Bogotá',
      node: 'Node 1',
      revenue: '16250000',

      type: 'SAVING',
      status: 'EN PROCESO',
      technology: 'METRO2',

      landlord: 'Vendor 1',
      eaim: 'Contractor 1',
      responsible: 'María Torres',

      dkoAssignmentDate: '2024-02-10',
      eaimSurveyRequestDate: '2024-02-14',
      installationDate: '2024-03-01',

      surveyCost: '1800000',
      installationBudget: '12000000',
      installationCost: '11500000',

      email: 'contact@example.com',
      contact: 'Carlos Rodríguez',
      phone: '3001234501',

      observations: 'Site inspection completed. Installation activities are currently in progress.',
    },

    {
      id: 2,
      dkoTkt: 'DKO-2024-001236',
      rfsFiberChain: 'RFS-2024-0002',
      consecutive: 'APR-001236',
      soSap: 'SO-100236',

      clientName: 'Telefónica',
      buildingName: 'Sede Norte',
      address: 'Calle 100 # 19-61',
      city: 'Bogotá',
      node: 'Node 2',
      revenue: '14500000',

      type: 'PREVENTA',
      status: 'DETENIDO',
      technology: 'DWDM',

      landlord: 'Vendor 2',
      eaim: 'Contractor 2',
      responsible: 'Juan Pérez',

      dkoAssignmentDate: '2024-02-12',
      eaimSurveyRequestDate: '2024-02-16',
      installationDate: '2024-03-05',

      surveyCost: '2100000',
      installationBudget: '15000000',
      installationCost: '14800000',

      email: 'network@example.com',
      contact: 'Andrea Gómez',
      phone: '3101234502',

      observations: 'Work is currently stopped while vendor approval is pending.',
    },

    {
      id: 3,
      dkoTkt: 'DKO-2024-001237',
      rfsFiberChain: 'RFS-2024-0003',
      consecutive: 'APR-001237',
      soSap: 'SO-100237',

      clientName: 'Retail Colombia',
      buildingName: 'Operations Center',
      address: 'Avenida El Dorado # 68C-61',
      city: 'Bogotá',
      node: 'Node 1',
      revenue: '52000000',

      type: 'SAVING',
      status: 'TERMINADO',
      technology: 'FIBRA OSCURA',

      landlord: 'Vendor 1',
      eaim: 'Contractor 1',
      responsible: 'Laura Martínez',

      dkoAssignmentDate: '2024-01-25',
      eaimSurveyRequestDate: '2024-01-29',
      installationDate: '2024-02-20',

      surveyCost: '2500000',
      installationBudget: '18000000',
      installationCost: '17600000',

      email: 'operations@example.com',
      contact: 'Miguel Herrera',
      phone: '3151234503',

      observations: 'Installation completed successfully and delivery documentation was closed.',
    },
  ];

  readonly deliveryId = computed(() => {
    const id = Number(this.route.snapshot.paramMap.get('id'));

    return Number.isFinite(id) ? id : null;
  });

  readonly delivery = computed(() => {
    const id = this.deliveryId();

    if (id === null) {
      return undefined;
    }

    return this.deliveries.find((delivery) => delivery.id === id);
  });

  readonly types: readonly DeliveryType[] = ['PREVENTA', 'SAVING'];

  readonly statuses: readonly DeliveryStatus[] = ['EN PROCESO', 'DETENIDO', 'TERMINADO'];

  readonly technologies: readonly DeliveryTechnology[] = [
    'METRO2',
    'METRO3',
    'DWDM',
    'TRANSPORTE',
    'FIBRA OSCURA',
  ];

  readonly cities = ['Bogotá', 'Medellín', 'Cali'] as const;

  readonly nodes = ['Node 1', 'Node 2'] as const;

  readonly landlords = ['Vendor 1', 'Vendor 2'] as const;

  readonly contractors = ['Contractor 1', 'Contractor 2'] as const;

  readonly responsibles = ['María Torres', 'Juan Pérez', 'Laura Martínez'] as const;

  readonly editForm = this.formBuilder.nonNullable.group({
    rfsFiberChain: ['', [Validators.required, noWhitespaceValidator]],

    consecutive: ['', [Validators.required, noWhitespaceValidator]],

    soSap: ['', [Validators.required, noWhitespaceValidator]],

    clientName: ['', [Validators.required, noWhitespaceValidator]],

    buildingName: ['', [Validators.required, noWhitespaceValidator]],

    address: ['', [Validators.required, noWhitespaceValidator]],

    city: ['', Validators.required],

    node: ['', Validators.required],

    revenue: ['', [Validators.required, Validators.pattern(/^\d+$/)]],

    type: ['', Validators.required],

    status: ['', Validators.required],

    technology: ['', Validators.required],

    landlord: ['', Validators.required],

    eaim: ['', Validators.required],

    responsible: ['', Validators.required],

    dkoAssignmentDate: ['', Validators.required],

    eaimSurveyRequestDate: ['', Validators.required],

    installationDate: ['', Validators.required],

    surveyCost: ['', [Validators.required, Validators.pattern(/^\d+$/)]],

    installationBudget: ['', [Validators.required, Validators.pattern(/^\d+$/)]],

    installationCost: ['', [Validators.required, Validators.pattern(/^\d+$/)]],

    email: ['', [Validators.required, Validators.email]],

    contact: ['', [Validators.required, noWhitespaceValidator]],

    phone: ['', [Validators.required, Validators.pattern(/^3\d{9}$/)]],

    observations: ['', [Validators.required, noWhitespaceValidator]],
  });

  constructor() {
    const delivery = this.delivery();

    if (delivery) {
      this.editForm.patchValue({
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
    }
  }

  toggleSection(section: DeliverySection): void {
    this.openSection.update((currentSection) => (currentSection === section ? null : section));
  }

  isSectionOpen(section: DeliverySection): boolean {
    return this.openSection() === section;
  }

  typeLabel(type: DeliveryType): string {
    const labels: Record<DeliveryType, string> = {
      PREVENTA: 'Pre-Sale',
      SAVING: 'Saving',
    };

    return labels[type];
  }

  statusLabel(status: DeliveryStatus): string {
    const labels: Record<DeliveryStatus, string> = {
      'EN PROCESO': 'In Progress',
      DETENIDO: 'Stopped',
      TERMINADO: 'Completed',
    };

    return labels[status];
  }

  technologyLabel(technology: DeliveryTechnology): string {
    const labels: Record<DeliveryTechnology, string> = {
      METRO2: 'METRO2',
      METRO3: 'METRO3',
      DWDM: 'DWDM',
      TRANSPORTE: 'Transport',
      'FIBRA OSCURA': 'Dark Fiber',
    };

    return labels[technology];
  }

  save(): void {
    this.submitted.set(true);

    if (this.editForm.invalid) {
      this.editForm.markAllAsTouched();

      this.openFirstInvalidSection();

      return;
    }

    const delivery = this.delivery();

    if (!delivery) {
      return;
    }

    const value = this.editForm.getRawValue();

    const updatedDelivery: DeliveryItem = {
      id: delivery.id,

      // DKO/TKT stays immutable.
      dkoTkt: delivery.dkoTkt,

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

    console.log('Updated delivery:', updatedDelivery);

    void this.router.navigate(['/delivery', delivery.id]);
  }

  cancel(): void {
    const id = this.deliveryId();

    if (id === null) {
      void this.router.navigate(['/delivery']);

      return;
    }

    void this.router.navigate(['/delivery', id]);
  }

  private openFirstInvalidSection(): void {
    const sections: Array<{
      section: DeliverySection;
      controls: string[];
    }> = [
      {
        section: 'identification',
        controls: ['rfsFiberChain', 'consecutive', 'soSap'],
      },
      {
        section: 'clientLocation',
        controls: ['clientName', 'buildingName', 'address', 'city', 'node', 'revenue'],
      },
      {
        section: 'classification',
        controls: ['type', 'status', 'technology'],
      },
      {
        section: 'assignment',
        controls: ['landlord', 'eaim', 'responsible'],
      },
      {
        section: 'dates',
        controls: ['dkoAssignmentDate', 'eaimSurveyRequestDate', 'installationDate'],
      },
      {
        section: 'costs',
        controls: ['surveyCost', 'installationBudget', 'installationCost'],
      },
      {
        section: 'contact',
        controls: ['email', 'contact', 'phone'],
      },
      {
        section: 'observations',
        controls: ['observations'],
      },
    ];

    const invalidSection = sections.find(({ controls }) =>
      controls.some((controlName) => this.editForm.get(controlName)?.invalid),
    );

    if (invalidSection) {
      this.openSection.set(invalidSection.section);
    }
  }
}
