import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { catchError, forkJoin, of, skip, switchMap, takeUntil } from 'rxjs';
import {
  DeliveryCreateOptions,
  NodeSelectOption,
  SelectOption,
} from '../../models/delivery-create-options';
import {
  DeliveryConsecutiveEdit,
  DeliveryEditData,
  DeliveryInstallationCostEdit,
  UpdateDeliveryEdit,
} from '../../models/delivery-edit';
import { DeliveryService } from '../../services/delivery.service';

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

type LandlordConsecutiveForm = FormGroup<{
  id: FormControl<number | null>;
  landlord: FormControl<number | null>;
  consecutive: FormControl<string>;
  metersCoundiut: FormControl<number | null>;
  postsQuantity: FormControl<number | null>;
  aditionalNumber: FormControl<number | null>;
}>;
type InstallationCostForm = FormGroup<{
  id: FormControl<number | null>;
  cause: FormControl<number | null>;
  amount: FormControl<number | null>;
}>;

const noWhitespace: ValidatorFn = (control) =>
  control.value && !String(control.value).trim() ? { whitespace: true } : null;
const finiteNumber: ValidatorFn = (control) =>
  control.value !== null && control.value !== '' && !Number.isFinite(control.value)
    ? { finite: true }
    : null;
const integer: ValidatorFn = (control) =>
  control.value !== null && !Number.isInteger(control.value) ? { integer: true } : null;

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
  private readonly destroyRef = inject(DestroyRef);
  private readonly service = inject(DeliveryService);

  readonly delivery = signal<DeliveryEditData | null>(null);
  readonly options = signal<DeliveryCreateOptions | null>(null);
  readonly loading = signal(true);
  readonly loadError = signal('');
  readonly saveError = signal('');
  readonly saving = signal(false);
  readonly saved = signal(false);
  readonly submitted = signal(false);
  readonly openSection = signal<DeliverySection | null>('identification');

  get cities() {
    return this.options()?.cities ?? [];
  }
  get nodes(): NodeSelectOption[] {
    return (this.options()?.nodes ?? []).filter(
      (x) => x.cityId === this.editForm.controls.city.value,
    );
  }
  get types() {
    return this.options()?.deliveryTypes ?? [];
  }
  get statuses() {
    return this.options()?.deliveryStatuses ?? [];
  }
  get technologies() {
    return this.options()?.deliveryTechnologies ?? [];
  }
  get landlords() {
    return this.options()?.landlords ?? [];
  }
  get contractors() {
    return this.options()?.eaims ?? [];
  }
  get responsibles() {
    return this.options()?.responsibles ?? [];
  }
  get installationCostCauses() {
    return this.options()?.deliveryCauses ?? [];
  }

  private selection(options: () => SelectOption[]) {
    return this.formBuilder.control<number | null>(null, [
      Validators.required,
      (control) =>
        control.value !== null && !this.hasOption(options(), control.value)
          ? { unavailable: true }
          : null,
    ]);
  }

  readonly editForm = this.formBuilder.nonNullable.group({
    rfsFiberChain: ['', [Validators.required, noWhitespace, Validators.maxLength(50)]],
    soSap: ['', Validators.maxLength(10)],
    clientName: ['', [Validators.required, noWhitespace, Validators.maxLength(50)]],
    buildingName: ['', [Validators.required, noWhitespace, Validators.maxLength(150)]],
    address: ['', [Validators.required, noWhitespace, Validators.maxLength(150)]],
    city: this.selection(() => this.cities),
    node: this.selection(() => this.nodes),
    revenue: this.formBuilder.control<number | null>(null, finiteNumber),
    contact: ['', [Validators.required, noWhitespace, Validators.maxLength(50)]],
    email: ['', [Validators.required, Validators.email, Validators.maxLength(200)]],
    phone: [
      '',
      [
        Validators.required,
        Validators.pattern(/^\+?\d[\d\s-]*$/),
        (control) => {
          const digits = String(control.value ?? '').replace(/[^0-9]/g, '');
          return digits && !Number.isSafeInteger(Number(digits)) ? { integer: true } : null;
        },
      ],
    ],
    type: this.selection(() => this.types),
    status: this.selection(() => this.statuses),
    technology: this.selection(() => this.technologies),
    landlordConsecutives: this.formBuilder.array<LandlordConsecutiveForm>([]),
    eaim: this.selection(() => this.contractors),
    responsible: this.selection(() => this.responsibles),
    surveyCost: this.formBuilder.control<number | null>(null, [Validators.required, finiteNumber]),
    installationBudget: this.formBuilder.control<number | null>(null, [
      Validators.required,
      finiteNumber,
    ]),
    installationCosts: this.formBuilder.array<InstallationCostForm>([]),
    observations: ['', Validators.maxLength(500)],
  });

  constructor() {
    this.editForm.controls.city.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.editForm.controls.node.setValue(null);
      });

    this.route.paramMap
      .pipe(
        switchMap((params) => {
          this.delivery.set(null);
          this.options.set(null);
          this.loading.set(true);
          this.loadError.set('');
          this.saveError.set('');
          this.saved.set(false);
          this.saving.set(false);
          this.submitted.set(false);
          const rawId = params.get('id') ?? '';
          const id = Number(rawId);
          if (!/^\d+$/.test(rawId) || !Number.isInteger(id) || id <= 0 || id > 2147483647) {
            this.loading.set(false);
            this.loadError.set('The delivery identifier is invalid.');
            return of(null);
          }
          return forkJoin({
            delivery: this.service.getEdit(id),
            options: this.service.getCreateOptions(),
          }).pipe(
            catchError((error: HttpErrorResponse) => {
              this.loading.set(false);
              this.loadError.set(this.errorMessage(error, 'The delivery could not be loaded.'));
              return of(null);
            }),
          );
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((result) => {
        if (!result) return;
        this.options.set(result.options);
        this.loadDelivery(result.delivery);
        this.delivery.set(result.delivery);
        this.loading.set(false);
      });
  }

  get landlordConsecutives() {
    return this.editForm.controls.landlordConsecutives;
  }
  get installationCosts() {
    return this.editForm.controls.installationCosts;
  }

  hasOption(options: readonly SelectOption[], id: number | null): boolean {
    return options.some((option) => option.id === id);
  }

  private quantity(value: number) {
    return this.formBuilder.control<number | null>(value, [
      Validators.required,
      integer,
      Validators.min(-2147483648),
      Validators.max(2147483647),
    ]);
  }

  private createLandlordConsecutiveGroup(value?: DeliveryConsecutiveEdit): LandlordConsecutiveForm {
    return this.formBuilder.group({
      id: this.formBuilder.control<number | null>(value?.id ?? null),
      landlord: this.selection(() => this.landlords),
      consecutive: this.formBuilder.nonNullable.control(value?.consecutive ?? '', [
        Validators.required,
        noWhitespace,
        Validators.maxLength(50),
      ]),
      metersCoundiut: this.quantity(value?.metersCoundiut ?? 0),
      postsQuantity: this.quantity(value?.postsQuantity ?? 0),
      aditionalNumber: this.quantity(value?.aditionalNumber ?? 0),
    });
  }

  private createInstallationCostGroup(value?: DeliveryInstallationCostEdit): InstallationCostForm {
    return this.formBuilder.group({
      id: this.formBuilder.control<number | null>(value?.id ?? null),
      cause: this.selection(() => this.installationCostCauses),
      amount: this.formBuilder.control<number | null>(value?.cost ?? null, [
        Validators.required,
        finiteNumber,
      ]),
    });
  }

  addLandlordConsecutive(): void {
    this.landlordConsecutives.push(this.createLandlordConsecutiveGroup());
    this.openSection.set('landlordConsecutives');
  }
  removeLandlordConsecutive(index: number): void {
    this.landlordConsecutives.removeAt(index);
  }
  addInstallationCost(): void {
    this.installationCosts.push(this.createInstallationCostGroup());
    this.openSection.set('costs');
  }
  removeInstallationCost(index: number): void {
    this.installationCosts.removeAt(index);
  }
  toggleSection(section: DeliverySection): void {
    this.openSection.update((current) => (current === section ? null : section));
  }
  isSectionOpen(section: DeliverySection): boolean {
    return this.openSection() === section;
  }

  private loadDelivery(delivery: DeliveryEditData): void {
    this.editForm.enable({ emitEvent: false });
    this.editForm.reset(
      {
        rfsFiberChain: delivery.rfsFiberChain,
        soSap: delivery.soSap ?? '',
        clientName: delivery.clientName,
        buildingName: delivery.buildingSite,
        address: delivery.address,
        city: delivery.cityId,
        node: delivery.nodeId,
        revenue: delivery.revenue,
        contact: delivery.contactName,
        email: delivery.email,
        phone: String(delivery.mobilePhone),
        type: delivery.typeId,
        status: delivery.statusId,
        technology: delivery.technologyId,
        eaim: delivery.eaimId,
        responsible: delivery.userId,
        surveyCost: delivery.surveryCost,
        installationBudget: delivery.installationBudget,
        observations: delivery.observation,
      },
      { emitEvent: false },
    );
    this.landlordConsecutives.clear();
    for (const item of delivery.consecutives) {
      const group = this.createLandlordConsecutiveGroup(item);
      group.controls.landlord.setValue(item.landlordId);
      this.landlordConsecutives.push(group);
    }
    this.installationCosts.clear();
    for (const item of delivery.installationCosts) {
      const group = this.createInstallationCostGroup(item);
      group.controls.cause.setValue(item.causeId);
      this.installationCosts.push(group);
    }
    this.editForm.markAsPristine();
    this.editForm.markAsUntouched();
  }

  save(): void {
    const delivery = this.delivery();
    if (!delivery || this.loading() || this.saving() || this.saved()) return;
    this.submitted.set(true);
    this.saveError.set('');
    this.editForm.markAllAsTouched();
    if (this.editForm.invalid) {
      this.openFirstInvalidSection();
      return;
    }
    const value = this.editForm.getRawValue();
    const request: UpdateDeliveryEdit = {
      workOrderId: delivery.workOrderId,
      rfsFiberChain: value.rfsFiberChain.trim(),
      soSap: value.soSap.trim() || null,
      clientName: value.clientName.trim(),
      buildingSite: value.buildingName.trim(),
      address: value.address.trim(),
      cityId: value.city!,
      nodeId: value.node!,
      revenue: value.revenue,
      contactName: value.contact.trim(),
      email: value.email.trim(),
      mobilePhone: Number(value.phone.replace(/[^0-9]/g, '')),
      typeId: value.type!,
      statusId: value.status!,
      technologyId: value.technology!,
      eaimId: value.eaim!,
      userId: value.responsible!,
      surveryCost: value.surveyCost!,
      installationBudget: value.installationBudget!,
      observation: value.observations.trim(),
      consecutives: value.landlordConsecutives.map((item) => ({
        ...(item.id === null ? {} : { id: item.id }),
        landlordId: item.landlord!,
        consecutive: item.consecutive.trim(),
        metersCoundiut: item.metersCoundiut!,
        postsQuantity: item.postsQuantity!,
        aditionalNumber: item.aditionalNumber!,
      })),
      installationCosts: value.installationCosts.map((item) => ({
        ...(item.id === null ? {} : { id: item.id }),
        causeId: item.cause!,
        cost: item.amount!,
      })),
    };
    this.saving.set(true);
    this.editForm.disable({ emitEvent: false });
    this.service
      .updateEdit(delivery.id, request)
      .pipe(takeUntil(this.route.paramMap.pipe(skip(1))), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.saved.set(true);
          void this.goToDelivery();
        },
        error: (error: HttpErrorResponse) => {
          this.saving.set(false);
          this.editForm.enable({ emitEvent: false });
          this.saveError.set(
            this.errorMessage(error, 'Changes could not be saved. Please try again.'),
          );
        },
      });
  }

  async goToDelivery(): Promise<void> {
    try {
      const navigated = await this.router.navigate(['/delivery'], {
        queryParams: { deliveryId: this.delivery()?.id },
      });
      if (!navigated)
        this.saveError.set(
          this.saved()
            ? 'Changes were saved. Use Back to Delivery to return to the list.'
            : 'The delivery list could not be opened. Please try again.',
        );
    } catch {
      this.saveError.set(
        this.saved()
          ? 'Changes were saved. Use Back to Delivery to return to the list.'
          : 'The delivery list could not be opened. Please try again.',
      );
    }
  }

  cancel(): void {
    if (!this.saving()) void this.goToDelivery();
  }

  private errorMessage(error: HttpErrorResponse, fallback: string): string {
    if (error.status === 401) return 'Your session has expired. Sign in again.';
    if (error.status === 403) return 'You do not have permission to edit this delivery.';
    if (error.status === 404) return 'The delivery does not exist or is no longer active.';
    if (error.status === 400) {
      const messages = Object.values(error.error?.errors ?? {})
        .flat()
        .filter((x) => typeof x === 'string');
      return messages.length
        ? messages.join(' ')
        : (error.error?.message ?? 'Review the delivery information.');
    }
    return fallback;
  }

  private openFirstInvalidSection(): void {
    const sections: [DeliverySection, AbstractControl[]][] = [
      ['identification', [this.editForm.controls.rfsFiberChain, this.editForm.controls.soSap]],
      [
        'clientLocation',
        ['clientName', 'buildingName', 'address', 'city', 'node', 'revenue'].map((name) =>
          this.editForm.get(name)!,
        ),
      ],
      ['contact', ['contact', 'email', 'phone'].map((name) => this.editForm.get(name)!)],
      ['classification', ['type', 'status', 'technology'].map((name) => this.editForm.get(name)!)],
      ['landlordConsecutives', [this.landlordConsecutives]],
      ['assignment', [this.editForm.controls.eaim, this.editForm.controls.responsible]],
      [
        'costs',
        [
          this.editForm.controls.surveyCost,
          this.editForm.controls.installationBudget,
          this.installationCosts,
        ],
      ],
      ['observations', [this.editForm.controls.observations]],
    ];
    const invalid = sections.find(([, controls]) => controls.some((control) => control.invalid));
    if (invalid) this.openSection.set(invalid[0]);
  }
}
