import { currentPeriod, formatDuration, DeliveryStatusHistoryData } from '../../models/delivery-status-history';
import { HttpErrorResponse } from '@angular/common/http';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { DeliveryService } from '../../services/delivery.service';
import { DeliverySummary } from '../../models/delivery-summary';
import { Component, computed, effect, untracked, DestroyRef, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

type DeliveryStatus = string;
type DeliveryTechnology = string;
type DeliveryType = string;

interface DeliveryStatusHistory {
  readonly status: DeliveryStatus;
  readonly startedAt: string;
  readonly endedAt: string | null;
}

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
  readonly revenue: string | null;

  // 3. Classification
  readonly type: DeliveryType;
  readonly status: DeliveryStatus;
  readonly technology: DeliveryTechnology;

  // Status lifecycle
  readonly statusHistory: readonly DeliveryStatusHistory[];

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
  readonly installationCost: string | null;

  // 7. Contact
  readonly email: string;
  readonly contact: string;
  readonly phone: string;

  // 8. Observations
  readonly observations: string;
}

const noWhitespaceValidator: ValidatorFn = (
  control: AbstractControl,
): ValidationErrors | null => {
  const value = String(control.value ?? '').trim();

  return value.length > 0
    ? null
    : { whitespace: true };
};

@Component({
  selector: 'app-delivery',
  imports: [
    RouterLink,
    ReactiveFormsModule,
  ],
  templateUrl: './delivery.html',
  styleUrl: './delivery.scss',
})
export class Delivery {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly queryParams = toSignal(this.route.queryParamMap, {
    initialValue: this.route.snapshot.queryParamMap,
  });
  readonly filteredDeliveryId = computed(() => {
    const raw = this.queryParams().get('deliveryId');
    if (raw === null || !/^\d+$/.test(raw)) return null;
    const id = Number(raw);
    return Number.isInteger(id) && id > 0 && id <= 2147483647 ? id : null;
  });
  readonly invalidDeliveryIdFilter = computed(() =>
    this.queryParams().has('deliveryId') && this.filteredDeliveryId() === null,
  );

  private readonly formBuilder =
    inject(FormBuilder);

  readonly searchTerm = signal('');

  readonly selectedStatus =
    signal<DeliveryStatus | 'TODOS'>(
      'TODOS',
    );

  readonly currentPage = signal(1);

  readonly editingDeliveryId =
    signal<number | null>(null);

  readonly editAttempted =
    signal(false);

  readonly deliveryTypes:
    readonly DeliveryType[] = [
      'PREVENTA',
      'SAVING',
    ];

  readonly deliveryStatuses:
    readonly DeliveryStatus[] = [
      'EN PROCESO',
      'DETENIDO',
      'TERMINADO',
    ];

  readonly technologies:
    readonly DeliveryTechnology[] = [
      'METRO2',
      'METRO3',
      'DWDM',
      'TRANSPORTE',
      'FIBRA OSCURA',
    ];

  readonly cities = [
    'Bogotá',
    'Medellín',
    'Cali',
    'Lima',
    'Santiago',
    'Madrid',
  ] as const;

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

  readonly landlords = [
    'Vendor 1',
    'Vendor 2',
  ] as const;

  readonly eaimOptions = [
    'Contractor 1',
    'Contractor 2',
  ] as const;

  readonly responsibleOptions = [
    'María Torres',
    'Juan Pérez',
    'Ana López',
    'Carlos Mendoza',
  ] as const;

  private readonly deliveryService = inject(DeliveryService);
  private readonly destroyRef = inject(DestroyRef);
  readonly loading = signal(false);
  readonly loadError = signal<string | null>(null);
  readonly deliveries = signal<readonly DeliveryItem[]>([]);

  private readonly histories = signal<Record<number, { data: DeliveryStatusHistoryData; receivedAt: number }>>({});
  private readonly requestedHistories = new Set<number>();
  private readonly now = signal(Date.now());

  constructor() {
    const timer = setInterval(() => this.now.set(Date.now()), 60_000);
    this.destroyRef.onDestroy(() => clearInterval(timer));
    effect(() => {
      const visible = this.pagedDeliveries();
      untracked(() => {
        for (const delivery of visible) {
          if (this.requestedHistories.has(delivery.id)) continue;
          this.requestedHistories.add(delivery.id);
          this.deliveryService.getStatusHistory(delivery.id)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
              next: (data) => this.histories.update((values) => ({ ...values, [delivery.id]: { data, receivedAt: Date.now() } })),
              error: () => {},
            });
        }
      });
    });
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.searchTerm.set('');
      this.selectedStatus.set('TODOS');
      this.currentPage.set(1);
    });
    this.loadDeliveries();
  }

  loadDeliveries(): void {
    if (this.loading()) return;
    this.loading.set(true);
    this.loadError.set(null);
    this.deliveries.set([]);
    this.histories.set({});
    this.requestedHistories.clear();
    this.deliveryService.getAll()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (deliveries) => {
          this.deliveries.set(deliveries.map((delivery) => this.toItem(delivery)));
          this.currentPage.set(1);
          this.loading.set(false);
        },
        error: (error: HttpErrorResponse) => {
          this.loading.set(false);
          this.loadError.set(error.status === 401
            ? 'Your session is missing or expired. Please sign in again.'
            : 'Unable to load deliveries. Please try again.');
        },
      });
  }

  private toItem(delivery: DeliverySummary): DeliveryItem {
    const label = (value: string | null | undefined) => value?.trim().replace(/\s+/g, ' ') || '—';
    return {
      id: delivery.id,
      dkoTkt: delivery.workOrderId,
      rfsFiberChain: delivery.rfsFiberChain,
      soSap: delivery.soSap ?? '—',
      clientName: delivery.clientName,
      buildingName: delivery.buildingSite,
      address: delivery.address,
      city: label(delivery.cityName),
      node: label(delivery.nodeName),
      revenue: delivery.revenue == null ? null : String(delivery.revenue),
      type: label(delivery.typeDescription),
      status: label(delivery.statusDescription),
      technology: label(delivery.technologyDescription),
      eaim: label(delivery.eaimName),
      responsible: label(delivery.responsibleName),
      surveyCost: String(delivery.surveryCost),
      installationBudget: String(delivery.installationBudget),
      email: delivery.email,
      contact: delivery.contactName,
      phone: String(delivery.mobilePhone),
      observations: delivery.observation,
      consecutive: '—', landlord: '—', installationCost: null,
      dkoAssignmentDate: '—', eaimSurveyRequestDate: '—', installationDate: '—',
      statusHistory: [],
    };
  }

  readonly editForm =
    this.formBuilder.nonNullable.group({
      rfsFiberChain: [
        '',
        [
          Validators.required,
          noWhitespaceValidator,
        ],
      ],

      consecutive: [
        '',
        [
          Validators.required,
          noWhitespaceValidator,
        ],
      ],

      soSap: [
        '',
        [
          Validators.required,
          noWhitespaceValidator,
        ],
      ],

      clientName: [
        '',
        [
          Validators.required,
          noWhitespaceValidator,
        ],
      ],

      buildingName: [
        '',
        [
          Validators.required,
          noWhitespaceValidator,
        ],
      ],

      address: [
        '',
        [
          Validators.required,
          noWhitespaceValidator,
        ],
      ],

      city: [
        '',
        Validators.required,
      ],

      node: [
        '',
        Validators.required,
      ],

      revenue: [
        '',
        [
          Validators.required,
          Validators.pattern(/^\d+$/),
          Validators.min(0),
        ],
      ],

      type: [
        '',
        Validators.required,
      ],

      status: [
        '',
        Validators.required,
      ],

      technology: [
        '',
        Validators.required,
      ],

      landlord: [
        '',
        Validators.required,
      ],

      eaim: [
        '',
        Validators.required,
      ],

      responsible: [
        '',
        Validators.required,
      ],

      dkoAssignmentDate: [
        '',
        Validators.required,
      ],

      eaimSurveyRequestDate: [
        '',
        Validators.required,
      ],

      installationDate: [
        '',
        Validators.required,
      ],

      surveyCost: [
        '',
        [
          Validators.required,
          Validators.pattern(/^\d+$/),
          Validators.min(0),
        ],
      ],

      installationBudget: [
        '',
        [
          Validators.required,
          Validators.pattern(/^\d+$/),
          Validators.min(0),
        ],
      ],

      installationCost: [
        '',
        [
          Validators.required,
          Validators.pattern(/^\d+$/),
          Validators.min(0),
        ],
      ],

      email: [
        '',
        [
          Validators.required,
          Validators.email,
        ],
      ],

      contact: [
        '',
        [
          Validators.required,
          noWhitespaceValidator,
        ],
      ],

      phone: [
        '',
        [
          Validators.required,
          Validators.pattern(
            /^(?:\+57[\s-]?)?3\d{2}[\s-]?\d{3}[\s-]?\d{4}$/,
          ),
        ],
      ],

      observations: [
        '',
        [
          Validators.required,
          noWhitespaceValidator,
        ],
      ],
    });

  readonly filteredDeliveries =
    computed(() => {
      const search =
        this.searchTerm()
          .trim()
          .toLocaleLowerCase();

      const selectedStatus =
        this.selectedStatus();

      return this.deliveries().filter(
        (delivery) => {
          const matchesStatus =
            selectedStatus === 'TODOS'
            || delivery.status === selectedStatus;

          const matchesSearch =
            !search
            || delivery.dkoTkt
              .toLocaleLowerCase()
              .includes(search)
            || delivery.rfsFiberChain
              .toLocaleLowerCase()
              .includes(search)
            || delivery.clientName
              .toLocaleLowerCase()
              .includes(search)
            || delivery.buildingName
              .toLocaleLowerCase()
              .includes(search)
            || delivery.city
              .toLocaleLowerCase()
              .includes(search)
            || delivery.responsible
              .toLocaleLowerCase()
              .includes(search);

          const matchesId = !this.invalidDeliveryIdFilter()
            && (this.filteredDeliveryId() === null || delivery.id === this.filteredDeliveryId());
          return matchesId && matchesStatus && matchesSearch;
        },
      );
    });

  readonly availableStatuses = computed(() =>
    [...new Set(this.deliveries().map((delivery) => delivery.status))]
      .filter((status) => status !== '—').sort((a, b) => a.localeCompare(b)),
  );
  private readonly pageSize = 20;
  readonly totalPages = computed(() => Math.max(1, Math.ceil(this.filteredDeliveries().length / this.pageSize)));
  readonly pagedDeliveries = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize;
    return this.filteredDeliveries().slice(start, start + this.pageSize);
  });
  readonly pageNumbers = computed(() => {
    const first = Math.max(1, this.currentPage() - 2);
    const last = Math.min(this.totalPages(), first + 4);
    return Array.from({ length: last - first + 1 }, (_, i) => first + i);
  });

  onStatusChange(event: Event): void {
    const target = event.target;
    if (target instanceof HTMLSelectElement) this.filterByStatus(target.value);
  }

  readonly totalDeliveries =
    computed(
      () => this.deliveries().length,
    );

  readonly inProgressDeliveries =
    computed(
      () =>
        this.deliveries().filter(
          (delivery) =>
            delivery.status === 'EN PROCESO',
        ).length,
    );

  readonly stoppedDeliveries =
    computed(
      () =>
        this.deliveries().filter(
          (delivery) =>
            delivery.status === 'DETENIDO',
        ).length,
    );

  readonly completedDeliveries =
    computed(
      () =>
        this.deliveries().filter(
          (delivery) =>
            delivery.status === 'TERMINADO',
        ).length,
    );

  onSearch(event: Event): void {
    const target = event.target;

    if (!(target instanceof HTMLInputElement)) {
      return;
    }

    this.searchTerm.set(target.value);
    this.currentPage.set(1);
  }

  filterByStatus(
    status: DeliveryStatus | 'TODOS',
  ): void {
    this.selectedStatus.set(status);
    this.currentPage.set(1);
  }

  clearFilters(): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { deliveryId: null },
      queryParamsHandling: 'merge',
    });
    this.searchTerm.set('');
    this.selectedStatus.set('TODOS');
    this.currentPage.set(1);
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages()) {
      return;
    }

    this.currentPage.set(page);
  }

  startEdit(delivery: DeliveryItem): void {
    void this.router.navigate(['/delivery', delivery.id, 'edit']);
  }

  cancelEdit(): void {
    this.editingDeliveryId.set(null);
    this.editAttempted.set(false);
    this.editForm.reset();
  }

  saveEdit(): void {
    // This initial summary is read-only; never pretend an in-memory edit was saved.
  }

  isEditing(
    deliveryId: number,
  ): boolean {
    return (
      this.editingDeliveryId()
      === deliveryId
    );
  }

  formatCurrency(
    value: string | null,
  ): string {
    if (value == null || value.trim() === '') return '—';
    const numericValue =
      Number(value);

    if (
      !Number.isFinite(
        numericValue,
      )
    ) {
      return value;
    }

    return new Intl.NumberFormat(
      'es-CO',
      {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      },
    ).format(numericValue);
  }

  statusLabel(status: DeliveryStatus): string {
    return status;
  }

  typeLabel(type: DeliveryType): string {
    return type;
  }

  technologyLabel(technology: DeliveryTechnology): string {
    return technology;
  }

  timeInCurrentStatus(
    delivery: DeliveryItem,
  ): string {
    const history = this.histories()[delivery.id];
    const period = currentPeriod(history?.data);
    return period && history
      ? formatDuration(period.durationSeconds + Math.max(0, (this.now() - history.receivedAt) / 1000))
      : '—';
  }

  private currentStatusHistory(
    delivery: DeliveryItem,
  ): DeliveryStatusHistory | undefined {
    return delivery.statusHistory[
      delivery.statusHistory.length - 1
    ];
  }

  private updateStatusHistory(
    delivery: DeliveryItem,
    newStatus: DeliveryStatus,
  ): readonly DeliveryStatusHistory[] {
    if (
      delivery.status === newStatus
    ) {
      return delivery.statusHistory;
    }

    const now =
      new Date().toISOString();

    const history = [
      ...delivery.statusHistory,
    ];

    const lastIndex =
      history.length - 1;

    if (lastIndex >= 0) {
      history[lastIndex] = {
        ...history[lastIndex],

        endedAt:
          history[lastIndex].endedAt
          ?? now,
      };
    }

    history.push({
      status: newStatus,
      startedAt: now,

      endedAt:
        newStatus === 'TERMINADO'
          ? now
          : null,
    });

    return history;
  }
}