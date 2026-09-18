import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  FormArray,
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { CurrencyInputDirective } from '../delivery-new/currency-input.directive';

// ======================================================
// TYPES
// ======================================================

type DeliveryType = 'PREVENTA' | 'SAVING';

type DeliveryStatus = 'EN PROCESO' | 'DETENIDO' | 'DETENIDO CLIENTE' | 'TERMINADO';

type DeliveryTechnology = 'METRO2' | 'METRO3' | 'DWDM' | 'TRANSPORTE' | 'FIBRA OSCURA';

type DeliverySection =
  | 'identification'
  | 'clientLocation'
  | 'contact'
  | 'classification'
  | 'dates'
  | 'landlordConsecutives'
  | 'assignment'
  | 'costs'
  | 'observations';

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

  // Status History
  readonly statusHistory: readonly DeliveryStatusHistory[];

  // Landlords & Consecutives
  readonly landlordConsecutives: readonly LandlordConsecutive[];

  // Assignment
  readonly eaim: string;
  readonly responsible: string;

  // Costs
  readonly surveyCost: string;
  readonly installationBudget: string;
  readonly installationCosts: readonly InstallationCost[];

  // Observations
  readonly observations: string;
}

type LandlordConsecutiveForm = FormGroup<{
  landlord: FormControl<string>;
  consecutive: FormControl<string>;
}>;

type InstallationCostForm = FormGroup<{
  cause: FormControl<InstallationCostCause | ''>;
  amount: FormControl<string>;
}>;

// ======================================================
// CONSTANTS
// ======================================================

const COMPLETED_STATUS: DeliveryStatus = 'TERMINADO';

// ======================================================
// VALIDATORS
// ======================================================

const noWhitespaceValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const value = String(control.value ?? '');

  if (value.length === 0) {
    return null;
  }

  return value.trim().length > 0 ? null : { whitespace: true };
};

// ======================================================
// COMPONENT
// ======================================================

@Component({
  selector: 'app-delivery-edit',
  imports: [ReactiveFormsModule, RouterLink, CurrencyInputDirective],
  templateUrl: './delivery-edit.html',
  styleUrl: './delivery-edit.scss',
})
export class DeliveryEdit {
  private readonly route = inject(ActivatedRoute);

  private readonly router = inject(Router);

  private readonly formBuilder = inject(FormBuilder);

  private readonly destroyRef = inject(DestroyRef);

  readonly submitted = signal(false);

  readonly openSection = signal<DeliverySection | null>('identification');

  // ====================================================
  // OPTIONS
  // ====================================================

  readonly types: readonly DeliveryType[] = ['PREVENTA', 'SAVING'];

  readonly statuses: readonly DeliveryStatus[] = [
    'EN PROCESO',
    'DETENIDO',
    'DETENIDO CLIENTE',
    'TERMINADO',
  ];

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

  readonly installationCostCauses: readonly InstallationCostCause[] = [
    'CIVIL_WORKS',
    'ADDITIONAL_MATERIALS',
    'ADDITIONAL_FIBER',
    'LABOR',
    'TRANSPORTATION',
    'PERMITS',
    'EQUIPMENT',
    'INFRASTRUCTURE_ADAPTATION',
    'TECHNICAL_REWORK',
    'CLIENT_REQUIREMENT',
    'LANDLORD_REQUIREMENT',
    'OTHER',
  ];

  // ====================================================
  // TEMPORARY MOCK DATA
  // Replace with API later.
  // ====================================================

  readonly deliveries: readonly DeliveryItem[] = [
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

      observations: 'Site inspection completed. Installation activities are currently in progress.',
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

      landlordConsecutives: [
        {
          landlord: 'Vendor 2',

          consecutive: 'APR-001236',
        },
      ],

      eaim: 'Contractor 2',

      responsible: 'Juan Pérez',

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

      observations: 'Work is currently stopped while vendor approval is pending.',
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

      landlordConsecutives: [
        {
          landlord: 'Vendor 1',

          consecutive: 'APR-001237',
        },
      ],

      eaim: 'Contractor 1',

      responsible: 'Laura Martínez',

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

      observations: 'Installation completed successfully and delivery documentation was closed.',
    },
  ];

  // ====================================================
  // CURRENT DELIVERY
  // ====================================================

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

  // ====================================================
  // FORM
  // ====================================================

  readonly editForm = this.formBuilder.nonNullable.group({
    // 1. Identification

    rfsFiberChain: ['', [Validators.required, noWhitespaceValidator]],

    soSap: ['', [noWhitespaceValidator]],

    // 2. Client & Location

    clientName: ['', [Validators.required, noWhitespaceValidator]],

    buildingName: ['', [Validators.required, noWhitespaceValidator]],

    address: ['', [Validators.required, noWhitespaceValidator]],

    city: ['', Validators.required],

    node: ['', Validators.required],

    revenue: ['', [Validators.pattern(/^\d+$/), Validators.min(0)]],

    // 3. Contact

    contact: ['', [Validators.required, noWhitespaceValidator]],

    email: ['', [Validators.required, Validators.email]],

    phone: [
      '',
      [Validators.required, Validators.pattern(/^(?:\+57[\s-]?)?3\d{2}[\s-]?\d{3}[\s-]?\d{4}$/)],
    ],

    // 4. Classification

    type: ['', Validators.required],

    status: ['', Validators.required],

    technology: ['', Validators.required],

    // 5. Status History
    //
    // There are intentionally NO controls
    // for startedAt, endedAt or duration.
    //
    // The user cannot manually modify
    // status-history dates or durations.

    // 6. Landlords & Consecutives

    landlordConsecutives: this.formBuilder.array<LandlordConsecutiveForm>([]),

    // 7. Assignment

    eaim: ['', Validators.required],

    responsible: ['', Validators.required],

    // 8. Costs

    surveyCost: ['', [Validators.required, Validators.pattern(/^\d+$/), Validators.min(0)]],

    installationBudget: ['', [Validators.required, Validators.pattern(/^\d+$/), Validators.min(0)]],

    installationCosts: this.formBuilder.array<InstallationCostForm>([]),

    // 9. Observations

    observations: ['', [Validators.required, noWhitespaceValidator]],
  });

  // ====================================================
  // CONSTRUCTOR
  // ====================================================

  constructor() {
    const delivery = this.delivery();

    if (delivery) {
      this.loadDelivery(delivery);
    }

    this.editForm.controls.status.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((status) => {
        this.updateCompletionValidators(status);
      });

    this.updateCompletionValidators(this.editForm.controls.status.value);
  }

  // ====================================================
  // FORM ARRAYS
  // ====================================================

  get landlordConsecutives(): FormArray<LandlordConsecutiveForm> {
    return this.editForm.controls.landlordConsecutives;
  }

  get installationCosts(): FormArray<InstallationCostForm> {
    return this.editForm.controls.installationCosts;
  }

  // ====================================================
  // LANDLORDS
  // ====================================================

  addLandlordConsecutive(): void {
    this.landlordConsecutives.push(this.createLandlordConsecutiveGroup(this.isCompleted()));

    this.openSection.set('landlordConsecutives');
  }

  removeLandlordConsecutive(index: number): void {
    if (this.landlordConsecutives.length === 1) {
      return;
    }

    this.landlordConsecutives.removeAt(index);
  }

  // ====================================================
  // INSTALLATION COSTS
  // ====================================================

  addInstallationCost(): void {
    this.installationCosts.push(this.createInstallationCostGroup());

    this.openSection.set('costs');
  }

  removeInstallationCost(index: number): void {
    if (this.installationCosts.length === 1) {
      return;
    }

    this.installationCosts.removeAt(index);
  }

  // ====================================================
  // ACCORDION
  // ====================================================

  toggleSection(section: DeliverySection): void {
    this.openSection.update((current) => (current === section ? null : section));
  }

  isSectionOpen(section: DeliverySection): boolean {
    return this.openSection() === section;
  }

  // ====================================================
  // SAVE
  // ====================================================

  save(): void {
    this.submitted.set(true);

    this.updateCompletionValidators(this.editForm.controls.status.value);

    this.editForm.markAllAsTouched();

    if (this.editForm.invalid) {
      this.openFirstInvalidSection();
      return;
    }

    const delivery = this.delivery();

    if (!delivery) {
      return;
    }

    const value = this.editForm.getRawValue();

    // --------------------------------------------------
    // Validate typed values before creating the domain
    // object.
    // --------------------------------------------------

    if (!this.isDeliveryType(value.type)) {
      this.openSection.set('classification');

      return;
    }

    if (!this.isDeliveryStatus(value.status)) {
      this.openSection.set('classification');

      return;
    }

    if (!this.isDeliveryTechnology(value.technology)) {
      this.openSection.set('classification');

      return;
    }

    const installationCosts: InstallationCost[] = [];

    for (const installationCost of value.installationCosts) {
      if (!this.isInstallationCostCause(installationCost.cause)) {
        this.openSection.set('costs');

        return;
      }

      installationCosts.push({
        cause: installationCost.cause,

        amount: installationCost.amount,
      });
    }

    const newStatus = value.status;

    const updatedStatusHistory = this.buildUpdatedStatusHistory(delivery, newStatus);

    const updatedDelivery: DeliveryItem = {
      ...delivery,

      // DKO/TKT remains immutable.
      dkoTkt: delivery.dkoTkt,

      rfsFiberChain: value.rfsFiberChain,

      soSap: value.soSap,

      clientName: value.clientName,

      buildingName: value.buildingName,

      address: value.address,

      city: value.city,

      node: value.node,

      revenue: value.revenue,

      contact: value.contact,

      email: value.email,

      phone: value.phone,

      type: value.type,

      status: newStatus,

      technology: value.technology,

      // Generated by the application.
      // Never received from editable controls.
      statusHistory: updatedStatusHistory,

      landlordConsecutives: value.landlordConsecutives.map((item) => ({
        landlord: item.landlord,

        consecutive: item.consecutive,
      })),

      eaim: value.eaim,

      responsible: value.responsible,

      surveyCost: value.surveyCost,

      installationBudget: value.installationBudget,

      installationCosts,

      observations: value.observations,
    };

    console.log('Updated delivery:', updatedDelivery);

    void this.router.navigate(['/delivery', delivery.id]);
  }

  // ====================================================
  // CANCEL
  // ====================================================

  cancel(): void {
    const id = this.deliveryId();

    if (id === null) {
      void this.router.navigate(['/delivery']);

      return;
    }

    void this.router.navigate(['/delivery', id]);
  }

  // ====================================================
  // LABELS
  // ====================================================

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

      'DETENIDO CLIENTE': 'Stopped by Client',

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

  installationCostCauseLabel(cause: InstallationCostCause): string {
    const labels: Record<InstallationCostCause, string> = {
      CIVIL_WORKS: 'Civil Works',

      ADDITIONAL_MATERIALS: 'Additional Materials',

      ADDITIONAL_FIBER: 'Additional Fiber',

      LABOR: 'Labor',

      TRANSPORTATION: 'Transportation',

      PERMITS: 'Permits',

      EQUIPMENT: 'Equipment',

      INFRASTRUCTURE_ADAPTATION: 'Infrastructure Adaptation',

      TECHNICAL_REWORK: 'Technical Rework',

      CLIENT_REQUIREMENT: 'Client Requirement',

      LANDLORD_REQUIREMENT: 'Landlord Requirement',

      OTHER: 'Other',
    };

    return labels[cause];
  }

  // ====================================================
  // STATUS HISTORY PRESENTATION
  // ====================================================

  formatDateTime(value: string): string {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return '—';
    }

    return new Intl.DateTimeFormat('en', {
      year: 'numeric',

      month: 'short',

      day: '2-digit',

      hour: '2-digit',

      minute: '2-digit',
    }).format(date);
  }

  formatStatusDuration(history: DeliveryStatusHistory): string {
    const start = new Date(history.startedAt).getTime();

    const end = history.endedAt ? new Date(history.endedAt).getTime() : Date.now();

    if (Number.isNaN(start) || Number.isNaN(end) || end < start) {
      return '—';
    }

    const totalMinutes = Math.floor((end - start) / 60_000);

    const days = Math.floor(totalMinutes / 1_440);

    const hours = Math.floor((totalMinutes % 1_440) / 60);

    const minutes = totalMinutes % 60;

    return (
      `${days}d ` + `${String(hours).padStart(2, '0')}h ` + `${String(minutes).padStart(2, '0')}m`
    );
  }

  // ====================================================
  // INITIAL DATA
  // ====================================================

  private loadDelivery(delivery: DeliveryItem): void {
    this.editForm.patchValue({
      rfsFiberChain: delivery.rfsFiberChain,

      soSap: delivery.soSap,

      clientName: delivery.clientName,

      buildingName: delivery.buildingName,

      address: delivery.address,

      city: delivery.city,

      node: delivery.node,

      revenue: delivery.revenue,

      contact: delivery.contact,

      email: delivery.email,

      phone: delivery.phone,

      type: delivery.type,

      status: delivery.status,

      technology: delivery.technology,

      eaim: delivery.eaim,

      responsible: delivery.responsible,

      surveyCost: delivery.surveyCost,

      installationBudget: delivery.installationBudget,

      observations: delivery.observations,
    });

    // --------------------------------------------------
    // Landlords & consecutives
    // --------------------------------------------------

    this.landlordConsecutives.clear();

    for (const item of delivery.landlordConsecutives) {
      this.landlordConsecutives.push(
        this.createLandlordConsecutiveGroup(delivery.status === COMPLETED_STATUS, item),
      );
    }

    if (this.landlordConsecutives.length === 0) {
      this.landlordConsecutives.push(
        this.createLandlordConsecutiveGroup(delivery.status === COMPLETED_STATUS),
      );
    }

    // --------------------------------------------------
    // Installation costs
    // --------------------------------------------------

    this.installationCosts.clear();

    for (const item of delivery.installationCosts) {
      this.installationCosts.push(this.createInstallationCostGroup(item));
    }

    if (this.installationCosts.length === 0) {
      this.installationCosts.push(this.createInstallationCostGroup());
    }
  }

  // ====================================================
  // CONDITIONAL COMPLETION VALIDATION
  // ====================================================

  private isCompleted(): boolean {
    return this.editForm.controls.status.value === COMPLETED_STATUS;
  }

  private updateCompletionValidators(status: string): void {
    const isCompleted = status === COMPLETED_STATUS;

    this.updateSoSapValidators(isCompleted);

    this.updateRevenueValidators(isCompleted);

    this.updateLandlordValidators(isCompleted);
  }

  private updateSoSapValidators(isCompleted: boolean): void {
    const control = this.editForm.controls.soSap;

    if (isCompleted) {
      control.setValidators([Validators.required, noWhitespaceValidator]);
    } else {
      control.setValidators([noWhitespaceValidator]);
    }

    control.updateValueAndValidity({
      emitEvent: false,
    });
  }

  private updateRevenueValidators(isCompleted: boolean): void {
    const control = this.editForm.controls.revenue;

    if (isCompleted) {
      control.setValidators([Validators.required, Validators.pattern(/^\d+$/), Validators.min(0)]);
    } else {
      control.setValidators([Validators.pattern(/^\d+$/), Validators.min(0)]);
    }

    control.updateValueAndValidity({
      emitEvent: false,
    });
  }

  private updateLandlordValidators(isCompleted: boolean): void {
    for (const group of this.landlordConsecutives.controls) {
      const landlord = group.controls.landlord;

      const consecutive = group.controls.consecutive;

      if (isCompleted) {
        landlord.setValidators([Validators.required]);

        consecutive.setValidators([Validators.required, noWhitespaceValidator]);
      } else {
        landlord.clearValidators();

        consecutive.setValidators([noWhitespaceValidator]);
      }

      landlord.updateValueAndValidity({
        emitEvent: false,
      });

      consecutive.updateValueAndValidity({
        emitEvent: false,
      });
    }
  }

  // ====================================================
  // FORM FACTORIES
  // ====================================================

  private createLandlordConsecutiveGroup(
    required = false,
    value?: LandlordConsecutive,
  ): LandlordConsecutiveForm {
    return this.formBuilder.nonNullable.group({
      landlord: [value?.landlord ?? '', required ? [Validators.required] : []],

      consecutive: [
        value?.consecutive ?? '',
        required ? [Validators.required, noWhitespaceValidator] : [noWhitespaceValidator],
      ],
    });
  }

  private createInstallationCostGroup(value?: InstallationCost): InstallationCostForm {
    return this.formBuilder.nonNullable.group({
      cause: new FormControl<InstallationCostCause | ''>(value?.cause ?? '', {
        nonNullable: true,

        validators: [Validators.required],
      }),

      amount: [
        value?.amount ?? '',
        [Validators.required, Validators.pattern(/^\d+$/), Validators.min(0)],
      ],
    });
  }

  // ====================================================
  // TYPE GUARDS
  // ====================================================

  private isDeliveryType(value: string): value is DeliveryType {
    return this.types.some((type) => type === value);
  }

  private isDeliveryStatus(value: string): value is DeliveryStatus {
    return this.statuses.some((status) => status === value);
  }

  private isDeliveryTechnology(value: string): value is DeliveryTechnology {
    return this.technologies.some((technology) => technology === value);
  }

  private isInstallationCostCause(value: string): value is InstallationCostCause {
    return this.installationCostCauses.some((cause) => cause === value);
  }

  // ====================================================
  // STATUS HISTORY
  // ====================================================

  private buildUpdatedStatusHistory(
    delivery: DeliveryItem,
    newStatus: DeliveryStatus,
  ): readonly DeliveryStatusHistory[] {
    // If status did not change,
    // history must remain untouched.
    if (delivery.status === newStatus) {
      return delivery.statusHistory;
    }

    const now = new Date().toISOString();

    const history: DeliveryStatusHistory[] = [...delivery.statusHistory];

    const lastIndex = history.length - 1;

    if (lastIndex >= 0) {
      const current = history[lastIndex];

      history[lastIndex] = {
        ...current,

        endedAt: current.endedAt ?? now,
      };
    }

    history.push({
      status: newStatus,

      startedAt: now,

      endedAt: newStatus === COMPLETED_STATUS ? now : null,
    });

    return history;
  }

  // ====================================================
  // INVALID SECTION NAVIGATION
  // ====================================================

  private openFirstInvalidSection(): void {
    if (this.editForm.controls.rfsFiberChain.invalid || this.editForm.controls.soSap.invalid) {
      this.openSection.set('identification');

      return;
    }

    if (
      this.editForm.controls.clientName.invalid ||
      this.editForm.controls.buildingName.invalid ||
      this.editForm.controls.address.invalid ||
      this.editForm.controls.city.invalid ||
      this.editForm.controls.node.invalid ||
      this.editForm.controls.revenue.invalid
    ) {
      this.openSection.set('clientLocation');

      return;
    }

    if (
      this.editForm.controls.contact.invalid ||
      this.editForm.controls.email.invalid ||
      this.editForm.controls.phone.invalid
    ) {
      this.openSection.set('contact');

      return;
    }

    if (
      this.editForm.controls.type.invalid ||
      this.editForm.controls.status.invalid ||
      this.editForm.controls.technology.invalid
    ) {
      this.openSection.set('classification');

      return;
    }

    if (this.landlordConsecutives.invalid) {
      this.openSection.set('landlordConsecutives');

      return;
    }

    if (this.editForm.controls.eaim.invalid || this.editForm.controls.responsible.invalid) {
      this.openSection.set('assignment');

      return;
    }

    if (
      this.editForm.controls.surveyCost.invalid ||
      this.editForm.controls.installationBudget.invalid ||
      this.installationCosts.invalid
    ) {
      this.openSection.set('costs');

      return;
    }

    if (this.editForm.controls.observations.invalid) {
      this.openSection.set('observations');
    }
  }
}
