import { Subject, catchError, map, of, switchMap, timer } from 'rxjs';
import { AuthService } from '../../../../auth/services/auth.service';
import { formatDuration } from '../../models/delivery-status-history';
import { HttpErrorResponse } from '@angular/common/http';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { DeliveryService } from '../../services/delivery.service';
import { DeliverySummary, DeliveryListQuery, DeliveryPage } from '../../models/delivery-summary';
import { Component, computed, DestroyRef, inject, signal } from '@angular/core';
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
  readonly currentStatusStartedAt: string | null;
  readonly id: number;

  // 1. Identification
  readonly dkoTkt: string;
  readonly rfsFiberChain: string;
  readonly consecutive: string;
  readonly soSap: string;

  // 2. Client & Location
  readonly clientId: number | null;
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
  private readonly accessAuth = inject(AuthService);
  readonly canWrite = computed(() => this.accessAuth.currentUser()?.permissions.includes('deliveries.write') ?? false);
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

  private readonly pageSize = 20;
  readonly totalCount = signal(0);
  private readonly totalActive = signal(0);
  private readonly statusCounts = signal<DeliveryPage['statuses']>([]);
  readonly totalPages = signal(1);
  private readonly now = signal(Date.now());
  private readonly responseClock = signal({ calculatedAt: Date.now(), receivedAt: Date.now() });
  private readonly requests = new Subject<{ query: DeliveryListQuery | null; debounce: boolean }>();

  constructor() {
    const clock = setInterval(() => this.now.set(Date.now()), 60_000);
    this.destroyRef.onDestroy(() => clearInterval(clock));
    this.requests.pipe(
      switchMap(({ query, debounce }) => (debounce ? timer(300) : of(0)).pipe(
        switchMap(() => query === null
          ? of({ rows: [], page: 1, pageSize: this.pageSize, totalCount: 0, totalPages: 0, totalActive: 0, statuses: [] } as DeliveryPage)
          : this.deliveryService.getPage(query)),
        map(data => ({ data, error: null as HttpErrorResponse | null })),
        catchError((error: HttpErrorResponse) => of({ data: null, error })),
      )),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(({ data, error }) => {
      this.loading.set(false);
      if (error || !data) {
        this.loadError.set(error?.status === 401
          ? 'Your session is missing or expired. Please sign in again.'
          : 'Unable to load deliveries. Please try again.');
        return;
      }
      const receivedAt = Date.now();
      const calculatedAt = Date.parse(data.calculatedAt ?? '');
      this.responseClock.set({ calculatedAt: Number.isFinite(calculatedAt) ? calculatedAt : receivedAt, receivedAt });
      this.deliveries.set(data.rows.map(delivery => this.toItem(delivery)));
      this.currentPage.set(data.page);
      this.totalCount.set(data.totalCount);
      this.totalPages.set(Math.max(1, data.totalPages));
      this.totalActive.set(data.totalActive);
      this.statusCounts.set(data.statuses);
    });
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.searchTerm.set('');
      this.selectedStatus.set('TODOS');
      this.currentPage.set(1);
      this.loadDeliveries();
    });
  }

  loadDeliveries(debounce = false): void {
    this.loading.set(true);
    this.loadError.set(null);
    this.deliveries.set([]);
    const query = this.invalidDeliveryIdFilter() ? null : {
      page: this.currentPage(), pageSize: this.pageSize,
      search: this.searchTerm().trim(),
      status: this.selectedStatus() === 'TODOS' ? undefined : this.selectedStatus(),
      deliveryId: this.filteredDeliveryId() ?? undefined,
    };
    this.requests.next({ query, debounce });
  }

  private toItem(delivery: DeliverySummary): DeliveryItem {
    const label = (value: string | null | undefined) => value?.trim().replace(/\s+/g, ' ') || '—';
    return {
      id: delivery.id,
      currentStatusStartedAt: delivery.currentStatusStartedAt ?? null,
      dkoTkt: label(delivery.workOrderId),
      rfsFiberChain: label(delivery.rfsFiberChain),
      soSap: delivery.soSap ?? '—',
      clientId: delivery.clientId,
      clientName: label(delivery.clientName),
      buildingName: label(delivery.siteType),
      address: label(delivery.address),
      city: label(delivery.cityName),
      node: label(delivery.nodeName),
      revenue: delivery.revenue == null ? null : String(delivery.revenue),
      type: label(delivery.typeDescription),
      status: label(delivery.statusDescription),
      technology: label(delivery.technologyDescription),
      eaim: label(delivery.eaimName),
      responsible: label(delivery.responsibleName),
      surveyCost: delivery.surveryCost == null ? '—' : String(delivery.surveryCost),
      installationBudget: delivery.installationBudget == null ? '—' : String(delivery.installationBudget),
      email: label(delivery.email),
      contact: label(delivery.contactName),
      phone: delivery.mobilePhone == null ? '—' : label(String(delivery.mobilePhone)),
      observations: label(delivery.observation),
      consecutive: '—', landlord: '—', installationCost: delivery.totalInstallationCost == null ? null : String(delivery.totalInstallationCost),
      dkoAssignmentDate: delivery.dkoAssignmentDate ?? '—',
      eaimSurveyRequestDate: delivery.eaimSurveyRequestDate ?? '—',
      installationDate: delivery.installationDate ?? '—',
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

  // The server filters and limits the result; never slice or search only the loaded page.
  readonly filteredDeliveries = computed(() => this.deliveries());
  readonly pagedDeliveries = computed(() => this.deliveries());
  readonly availableStatuses = computed(() => this.statusCounts()
    .map(status => status.description).filter((description): description is string => !!description)
    .sort((a, b) => a.localeCompare(b)));
  readonly pageNumbers = computed(() => {
    const first = Math.max(1, this.currentPage() - 2);
    const last = Math.min(this.totalPages(), first + 4);
    return Array.from({ length: last - first + 1 }, (_, i) => first + i);
  });

  onStatusChange(event: Event): void {
    const target = event.target;
    if (target instanceof HTMLSelectElement) this.filterByStatus(target.value);
  }

  readonly totalDeliveries = computed(() => this.totalActive());
  readonly inProgressDeliveries = computed(() => this.countStatus('EN PROCESO'));
  readonly stoppedDeliveries = computed(() => this.countStatus('DETENIDO'));
  readonly completedDeliveries = computed(() => this.countStatus('TERMINADO'));

  private countStatus(description: string): number {
    return this.statusCounts().find(status => status.description === description)?.count ?? 0;
  }

  onSearch(event: Event): void {
    const target = event.target;

    if (!(target instanceof HTMLInputElement)) {
      return;
    }

    this.searchTerm.set(target.value);
    this.currentPage.set(1);
    this.loadDeliveries(true);
  }

  filterByStatus(
    status: DeliveryStatus | 'TODOS',
  ): void {
    this.selectedStatus.set(status);
    this.currentPage.set(1);
    this.loadDeliveries();
  }

  clearFilters(): void {
    this.searchTerm.set('');
    this.selectedStatus.set('TODOS');
    this.currentPage.set(1);
    if (this.queryParams().has('deliveryId')) {
      void this.router.navigate([], { relativeTo: this.route,
        queryParams: { deliveryId: null }, queryParamsHandling: 'merge' });
    } else this.loadDeliveries();
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages()) {
      return;
    }

    this.currentPage.set(page);
    this.loadDeliveries();
  }

  startEdit(delivery: DeliveryItem): void {
    if (this.canWrite()) void this.router.navigate(['/delivery', delivery.id, 'edit']);
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

  installationOverBudget(delivery: DeliveryItem): boolean {
    if (delivery.installationCost == null || delivery.installationBudget == null) return false;
    const cost = Number(delivery.installationCost), budget = Number(delivery.installationBudget);
    return Number.isFinite(cost) && Number.isFinite(budget) && cost > budget;
  }

  statusTone(status: DeliveryStatus): string {
    const normalized = status.trim().toUpperCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ');
    if (/CLIENT|CUSTOMER/.test(normalized) && /DETENID|STOP|HOLD|PAUS/.test(normalized)) return 'client-stopped';
    if (/DETENID|STOP|HOLD|PAUS/.test(normalized)) return 'stopped';
    if (/TERMINAD|COMPLET|FINALIZ/.test(normalized)) return 'completed';
    if (/PROCES|PROGRESS/.test(normalized)) return 'progress';
    return 'neutral';
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
    const start = delivery.currentStatusStartedAt ? Date.parse(delivery.currentStatusStartedAt) : NaN;
    const clock = this.responseClock();
    const current = clock.calculatedAt + Math.max(0, this.now() - clock.receivedAt);
    return Number.isFinite(start) ? formatDuration(Math.max(0, (current - start) / 1000)) : '—';
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