import {
  Component,
  computed,
  inject,
} from '@angular/core';
import {
  ActivatedRoute,
  RouterLink,
} from '@angular/router';

// ======================================================
// TYPES
// ======================================================

type DeliveryType =
  | 'PREVENTA'
  | 'SAVING';

type DeliveryStatus =
  | 'EN PROCESO'
  | 'DETENIDO'
  | 'DETENIDO CLIENTE'
  | 'TERMINADO';

type DeliveryTechnology =
  | 'METRO2'
  | 'METRO3'
  | 'DWDM'
  | 'TRANSPORTE'
  | 'FIBRA OSCURA';

type InstallationCostCause =
  | 'CIVIL_WORKS'
  | 'ADDITIONAL_MATERIALS'
  | 'ADDITIONAL_FIBER'
  | 'LABOR'
  | 'TRANSPORTATION'
  | 'PERMITS'
  | 'EQUIPMENT'
  | 'INFRASTRUCTURE_ADAPTATION'
  | 'TECHNICAL_REWORK'
  | 'CLIENT_REQUIREMENT'
  | 'LANDLORD_REQUIREMENT'
  | 'OTHER';

interface LandlordConsecutive {
  readonly landlord: string;
  readonly consecutive: string;
}

interface InstallationCost {
  readonly cause: InstallationCostCause;
  readonly amount: string;
}

interface DeliveryStatusHistory {
  readonly status: DeliveryStatus;
  readonly startedAt: string;
  readonly endedAt: string | null;
}

interface DeliveryItem {
  readonly id: number;

  // Identification
  readonly dkoTkt: string;
  readonly rfsFiberChain: string;
  readonly soSap: string;

  // Client & Location
  readonly clientName: string;
  readonly buildingName: string;
  readonly address: string;
  readonly city: string;
  readonly node: string;
  readonly revenue: string;

  // Contact
  readonly contact: string;
  readonly email: string;
  readonly phone: string;

  // Classification
  readonly type: DeliveryType;
  readonly status: DeliveryStatus;
  readonly technology: DeliveryTechnology;

  // Landlords & Consecutives
  readonly landlordConsecutives:
    readonly LandlordConsecutive[];

  // Assignment
  readonly eaim: string;
  readonly responsible: string;

  // Dates & Status History
  readonly statusHistory:
    readonly DeliveryStatusHistory[];

  // Costs
  readonly surveyCost: string;
  readonly installationBudget: string;
  readonly installationCosts:
    readonly InstallationCost[];

  // Observations
  readonly observations: string;
}

// ======================================================
// COMPONENT
// ======================================================

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

  // ====================================================
  // TEMPORARY MOCK DATA
  // Later this collection should come from the API.
  // ====================================================

  private readonly deliveries:
    readonly DeliveryItem[] = [
    {
      id: 1,

      dkoTkt: 'DKO-2026-001235',
      rfsFiberChain: 'RFS-001235',
      soSap: '',

      clientName: 'Banco de la Nación',
      buildingName: 'Edificio Central',
      address: 'Carrera 7 # 72-41',
      city: 'Bogotá',
      node: 'Node 1',
      revenue: '',

      contact: 'Carlos Rodríguez',
      email: 'contact@example.com',
      phone: '3001234501',

      type: 'SAVING',
      status: 'EN PROCESO',
      technology: 'METRO2',

      landlordConsecutives: [
        {
          landlord: 'Vendor 1',
          consecutive: 'APR-001235',
        },
        {
          landlord: 'Vendor 2',
          consecutive: 'APR-001236',
        },
      ],

      eaim: 'Contractor 1',
      responsible: 'María Torres',

      statusHistory: [
        {
          status: 'EN PROCESO',
          startedAt: '2026-09-01T08:30:00',
          endedAt: '2026-09-04T16:15:00',
        },
        {
          status: 'DETENIDO CLIENTE',
          startedAt: '2026-09-04T16:15:00',
          endedAt: '2026-09-08T10:45:00',
        },
        {
          status: 'EN PROCESO',
          startedAt: '2026-09-08T10:45:00',
          endedAt: null,
        },
      ],

      surveyCost: '1800000',
      installationBudget: '12000000',

      installationCosts: [
        {
          cause: 'CIVIL_WORKS',
          amount: '3500000',
        },
        {
          cause: 'ADDITIONAL_FIBER',
          amount: '2100000',
        },
        {
          cause: 'TRANSPORTATION',
          amount: '850000',
        },
      ],

      observations:
        'Site inspection completed. Installation activities are currently in progress.',
    },

    {
      id: 2,

      dkoTkt: 'DKO-2026-001236',
      rfsFiberChain: 'RFS-001236',
      soSap: '',

      clientName: 'Global Finance',
      buildingName: 'North Campus',
      address: 'Calle 100 # 19-61',
      city: 'Bogotá',
      node: 'Node 2',
      revenue: '',

      contact: 'Andrea Gómez',
      email: 'network@example.com',
      phone: '3101234502',

      type: 'PREVENTA',
      status: 'DETENIDO',
      technology: 'DWDM',

      landlordConsecutives: [
        {
          landlord: 'Vendor 2',
          consecutive: 'APR-001236',
        },
      ],

      eaim: 'Contractor 2',
      responsible: 'Juan Pérez',

      statusHistory: [
        {
          status: 'EN PROCESO',
          startedAt: '2026-08-20T09:00:00',
          endedAt: '2026-08-25T11:30:00',
        },
        {
          status: 'DETENIDO',
          startedAt: '2026-08-25T11:30:00',
          endedAt: null,
        },
      ],

      surveyCost: '2100000',
      installationBudget: '15000000',

      installationCosts: [
        {
          cause: 'PERMITS',
          amount: '1800000',
        },
        {
          cause: 'ADDITIONAL_MATERIALS',
          amount: '3200000',
        },
      ],

      observations:
        'Work is currently stopped while vendor approval is pending.',
    },

    {
      id: 3,

      dkoTkt: 'DKO-2026-001237',
      rfsFiberChain: 'RFS-001237',
      soSap: 'SO-100237',

      clientName: 'Retail Colombia',
      buildingName: 'Operations Center',
      address: 'Avenida El Dorado # 68C-61',
      city: 'Bogotá',
      node: 'Node 1',
      revenue: '52000000',

      contact: 'Miguel Herrera',
      email: 'operations@example.com',
      phone: '3151234503',

      type: 'SAVING',
      status: 'TERMINADO',
      technology: 'FIBRA OSCURA',

      landlordConsecutives: [
        {
          landlord: 'Vendor 1',
          consecutive: 'APR-001237',
        },
      ],

      eaim: 'Contractor 1',
      responsible: 'Laura Martínez',

      statusHistory: [
        {
          status: 'EN PROCESO',
          startedAt: '2026-07-10T08:00:00',
          endedAt: '2026-07-15T14:20:00',
        },
        {
          status: 'DETENIDO CLIENTE',
          startedAt: '2026-07-15T14:20:00',
          endedAt: '2026-07-18T09:00:00',
        },
        {
          status: 'EN PROCESO',
          startedAt: '2026-07-18T09:00:00',
          endedAt: '2026-07-25T17:30:00',
        },
        {
          status: 'TERMINADO',
          startedAt: '2026-07-25T17:30:00',
          endedAt: '2026-07-25T17:30:00',
        },
      ],

      surveyCost: '2500000',
      installationBudget: '18000000',

      installationCosts: [
        {
          cause: 'CIVIL_WORKS',
          amount: '7600000',
        },
        {
          cause: 'ADDITIONAL_MATERIALS',
          amount: '4300000',
        },
        {
          cause: 'TECHNICAL_REWORK',
          amount: '1700000',
        },
      ],

      observations:
        'Installation completed successfully and delivery documentation was closed.',
    },
  ];

  // ====================================================
  // DELIVERY
  // ====================================================

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

  // ====================================================
  // LABELS
  // ====================================================

  statusLabel(
    status: DeliveryStatus,
  ): string {
    const labels: Record<
      DeliveryStatus,
      string
    > = {
      'EN PROCESO': 'In Progress',
      DETENIDO: 'Stopped',
      'DETENIDO CLIENTE': 'Stopped by Client',
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

  installationCostCauseLabel(
    cause: InstallationCostCause,
  ): string {
    const labels: Record<
      InstallationCostCause,
      string
    > = {
      CIVIL_WORKS: 'Civil Works',
      ADDITIONAL_MATERIALS: 'Additional Materials',
      ADDITIONAL_FIBER: 'Additional Fiber',
      LABOR: 'Labor',
      TRANSPORTATION: 'Transportation',
      PERMITS: 'Permits',
      EQUIPMENT: 'Equipment',
      INFRASTRUCTURE_ADAPTATION:
        'Infrastructure Adaptation',
      TECHNICAL_REWORK: 'Technical Rework',
      CLIENT_REQUIREMENT: 'Client Requirement',
      LANDLORD_REQUIREMENT: 'Landlord Requirement',
      OTHER: 'Other',
    };

    return labels[cause];
  }

  // ====================================================
  // CURRENCY
  // ====================================================

  formatCurrency(
    value: string,
  ): string {
    if (!value) {
      return '—';
    }

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

  totalInstallationCost(
    costs: readonly InstallationCost[],
  ): string {
    const total = costs.reduce(
      (accumulator, cost) => {
        const amount = Number(cost.amount);

        return Number.isFinite(amount)
          ? accumulator + amount
          : accumulator;
      },
      0,
    );

    return this.formatCurrency(
      String(total),
    );
  }

  // ====================================================
  // DATE & TIME
  // ====================================================

  formatDateTime(
    value: string | null,
  ): string {
    if (!value) {
      return 'Current';
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return '—';
    }

    return new Intl.DateTimeFormat(
      'en-US',
      {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      },
    ).format(date);
  }

  formatStatusDuration(
    item: DeliveryStatusHistory,
  ): string {
    const start = new Date(
      item.startedAt,
    ).getTime();

    const end = item.endedAt
      ? new Date(item.endedAt).getTime()
      : Date.now();

    if (
      Number.isNaN(start)
      || Number.isNaN(end)
      || end < start
    ) {
      return '—';
    }

    const totalMinutes = Math.floor(
      (end - start) / 60_000,
    );

    const days = Math.floor(
      totalMinutes / 1_440,
    );

    const hours = Math.floor(
      (totalMinutes % 1_440) / 60,
    );

    const minutes =
      totalMinutes % 60;

    return `${days}d ${hours}h ${minutes}m`;
  }

  // ====================================================
  // OPTIONAL VALUES
  // ====================================================

  displayValue(
    value: string,
  ): string {
    const normalizedValue =
      value.trim();

    return normalizedValue
      ? normalizedValue
      : '—';
  }
}