import { Subject, catchError, map, of, switchMap } from 'rxjs';
import { AuthService } from '../../../../auth/services/auth.service';
import { formatDuration } from '../../models/delivery-status-history';
import { HttpErrorResponse } from '@angular/common/http';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { DeliveryService } from '../../services/delivery.service';
import { DeliverySummary, DeliveryListQuery, DeliveryPage, DeliveryFilterOptions, DeliveryFilterOption } from '../../models/delivery-summary';
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

  private yearInColombia(): number {
    return Number(new Intl.DateTimeFormat('en', { timeZone: 'America/Bogota', year: 'numeric' }).format(new Date()));
  }
  readonly currentYear = signal(this.yearInColombia());
  readonly months = Array.from({ length: 12 }, (_, i) => i + 1);
  readonly days = Array.from({ length: 31 }, (_, i) => i + 1);
  readonly filterOptions = signal<DeliveryFilterOptions | null>(null);
  readonly optionsLoading = signal(false);
  readonly optionsError = signal('');
  readonly filterNodes = signal<DeliveryFilterOption[]>([]);
  readonly nodesLoading = signal(false);
  readonly nodesError = signal('');
  readonly yearOptions = computed(() => [...new Set([this.currentYear(), ...(this.filterOptions()?.years ?? [])])].sort((a, b) => b - a));
  readonly filters = this.formBuilder.nonNullable.group({
    year: this.currentYear(), month: '', day: '', statusId: '', cityId: '', nodeId: this.formBuilder.nonNullable.control({ value: '', disabled: true }), eaimId: '', createdBy: '', search: '',
  });
  private appliedFilters: Partial<DeliveryListQuery> = { year: this.currentYear() };
  private readonly nodeRequests = new Subject<number | null>();

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
  readonly totalPages = signal(1);
  private readonly now = signal(Date.now());
  private readonly responseClock = signal({ calculatedAt: Date.now(), receivedAt: Date.now() });
  private readonly requests = new Subject<DeliveryListQuery | null>();

  constructor() {
    const clock = setInterval(() => this.now.set(Date.now()), 60_000);
    this.destroyRef.onDestroy(() => clearInterval(clock));
    this.requests.pipe(
      switchMap(query => (query === null
        ? of({ rows: [], page: 1, pageSize: this.pageSize, totalCount: 0, totalPages: 0, totalActive: 0, statuses: [] } as DeliveryPage)
        : this.deliveryService.getPage(query)).pipe(
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

    });
    this.nodeRequests.pipe(
      switchMap(cityId => cityId === null ? of([] as DeliveryFilterOption[])
        : this.deliveryService.getFilterNodes(cityId).pipe(catchError(() => {
            this.nodesError.set('Nodes could not be loaded. Select the city again to retry.');
            return of([] as DeliveryFilterOption[]);
          }))),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(nodes => {
      this.filterNodes.set(nodes);
      this.nodesLoading.set(false);
      if (this.filters.controls.cityId.value && !this.nodesError()) this.filters.controls.nodeId.enable({ emitEvent: false });
    });
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.resetFilterValues();
      if (this.filterOptions()) this.search();
    });
    this.loadFilterOptions();
  }

  loadFilterOptions(): void {
    if (this.optionsLoading()) return;
    this.optionsLoading.set(true);
    this.optionsError.set('');
    this.deliveryService.getFilterOptions().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: options => {
        this.filterOptions.set(options);
        this.currentYear.set(options.currentYear);
        this.optionsLoading.set(false);
        this.filters.controls.year.setValue(options.currentYear);
        this.search();
      },
      error: () => {
        this.optionsLoading.set(false);
        this.optionsError.set('Delivery filter options could not be loaded.');
      },
    });
  }

  cityChanged(): void {
    this.filters.controls.nodeId.setValue('');
    this.filters.controls.nodeId.disable({ emitEvent: false });
    this.filterNodes.set([]);
    this.nodesError.set('');
    const cityId = Number(this.filters.controls.cityId.value) || null;
    this.nodesLoading.set(cityId !== null);
    this.nodeRequests.next(cityId);
  }

  search(): void {
    if (!this.filterOptions()) return;
    const value = this.filters.getRawValue();
    this.appliedFilters = { year: value.year, month: Number(value.month) || undefined,
      day: Number(value.day) || undefined, statusId: Number(value.statusId) || undefined,
      cityId: Number(value.cityId) || undefined, nodeId: Number(value.nodeId) || undefined,
      eaimId: Number(value.eaimId) || undefined, createdBy: Number(value.createdBy) || undefined,
      search: value.search.trim() };
    this.currentPage.set(1);
    this.loadDeliveries();
  }

  loadDeliveries(): void {
    if (!this.filterOptions()) { this.loadFilterOptions(); return; }
    this.loading.set(true);
    this.loadError.set(null);
    this.deliveries.set([]);
    this.requests.next(this.invalidDeliveryIdFilter() ? null : {
      ...this.appliedFilters, page: this.currentPage(), pageSize: this.pageSize,
      deliveryId: this.filteredDeliveryId() ?? undefined,
    });
  }

  private resetFilterValues(): void {
    this.filters.reset({ year: this.currentYear(), month: '', day: '', statusId: '', cityId: '', nodeId: '', eaimId: '', createdBy: '', search: '' });
    this.appliedFilters = { year: this.currentYear() };
    this.cityChanged();
    this.currentPage.set(1);
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
  readonly pageNumbers = computed(() => {
    const first = Math.max(1, this.currentPage() - 2);
    const last = Math.min(this.totalPages(), first + 4);
    return Array.from({ length: last - first + 1 }, (_, i) => first + i);
  });

  readonly totalDeliveries = computed(() => this.totalCount());

  clearFilters(): void {
    this.currentYear.set(this.yearInColombia());
    this.resetFilterValues();
    if (this.queryParams().has('deliveryId')) {
      void this.router.navigate([], { relativeTo: this.route, queryParams: { deliveryId: null }, queryParamsHandling: 'merge' });
    } else this.search();
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