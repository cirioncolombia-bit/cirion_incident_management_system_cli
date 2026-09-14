import {
  Component,
  computed,
  inject,
} from '@angular/core';
import {
  ActivatedRoute,
  RouterLink,
} from '@angular/router';

type DeliveryType =
  | 'PREVENTA'
  | 'SAVING';

type DeliveryStatus =
  | 'EN PROCESO'
  | 'DETENIDO'
  | 'TERMINADO';

type DeliveryTechnology =
  | 'METRO2'
  | 'METRO3'
  | 'DWDM'
  | 'TRANSPORTE'
  | 'FIBRA OSCURA';

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

@Component({
  selector: 'app-delivery-detail',
  imports: [
    RouterLink,
  ],
  templateUrl: './delivery-detail.html',
  styleUrl: './delivery-detail.scss',
})
export class DeliveryDetail {
  private readonly route = inject(ActivatedRoute);

  private readonly deliveries: readonly DeliveryItem[] = [
    {
      id: 1,
      dkoTkt: 'DKO-2024-001235',
      rfsFiberChain: 'RFS-001235',
      consecutive: 'APR-001235',
      soSap: 'SO-100235',

      clientName: 'Banco de la Nación',
      buildingName: 'Edificio Central',
      address: 'Carrera 7 # 72-41',
      city: 'Bogotá',
      node: 'Node 1',
      revenue: '45000000',

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

      observations:
        'Site inspection completed. Installation activities are currently in progress.',
    },
    {
      id: 2,
      dkoTkt: 'DKO-2024-001236',
      rfsFiberChain: 'RFS-001236',
      consecutive: 'APR-001236',
      soSap: 'SO-100236',

      clientName: 'Global Finance',
      buildingName: 'North Campus',
      address: 'Calle 100 # 19-61',
      city: 'Bogotá',
      node: 'Node 2',
      revenue: '38000000',

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

      observations:
        'Work is currently stopped while vendor approval is pending.',
    },
    {
      id: 3,
      dkoTkt: 'DKO-2024-001237',
      rfsFiberChain: 'RFS-001237',
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

      observations:
        'Installation completed successfully and delivery documentation was closed.',
    },
  ];

  readonly deliveryId = computed(() => {
    const id = Number(
      this.route.snapshot.paramMap.get('id'),
    );

    return Number.isFinite(id)
      ? id
      : null;
  });

  readonly delivery = computed(() => {
    const id = this.deliveryId();

    if (id === null) {
      return undefined;
    }

    return this.deliveries.find(
      (delivery) => delivery.id === id,
    );
  });

  statusLabel(
    status: DeliveryStatus,
  ): string {
    const labels: Record<
      DeliveryStatus,
      string
    > = {
      'EN PROCESO': 'In Progress',
      DETENIDO: 'Stopped',
      TERMINADO: 'Completed',
    };

    return labels[status];
  }

  typeLabel(
    type: DeliveryType,
  ): string {
    const labels: Record<
      DeliveryType,
      string
    > = {
      PREVENTA: 'Pre-Sale',
      SAVING: 'Saving',
    };

    return labels[type];
  }

  technologyLabel(
    technology: DeliveryTechnology,
  ): string {
    const labels: Record<
      DeliveryTechnology,
      string
    > = {
      METRO2: 'METRO2',
      METRO3: 'METRO3',
      DWDM: 'DWDM',
      TRANSPORTE: 'Transport',
      'FIBRA OSCURA': 'Dark Fiber',
    };

    return labels[technology];
  }

  formatCurrency(
    value: string,
  ): string {
    const numericValue = Number(value);

    if (!Number.isFinite(numericValue)) {
      return '—';
    }

    return new Intl.NumberFormat(
      'es-CO',
      {
        style: 'currency',
        currency: 'COP',
        maximumFractionDigits: 0,
      },
    ).format(numericValue);
  }

  formatDate(
    value: string,
  ): string {
    if (!value) {
      return '—';
    }

    const [
      year,
      month,
      day,
    ] = value.split('-');

    if (
      !year
      || !month
      || !day
    ) {
      return value;
    }

    return `${day}/${month}/${year}`;
  }
}