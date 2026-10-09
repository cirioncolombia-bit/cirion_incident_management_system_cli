import { CreateDelivery } from '../../models/create-delivery';
import { HttpErrorResponse } from '@angular/common/http';
import { DeliveryService } from '../../services/delivery.service';
import { DeliveryCreateOptions } from '../../models/delivery-create-options';
import { AuthService } from '../../../../auth/services/auth.service';
import { Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
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
import { RouterLink } from '@angular/router';

import { CurrencyInputDirective } from './currency-input.directive';

// ======================================================
// TYPES
// ======================================================

type DeliverySection =
  | 'identification'
  | 'clientLocation'
  | 'contact'
  | 'classification'
  | 'landlordConsecutives'
  | 'assignment'
  | 'costs'
  | 'observations';

type LandlordConsecutiveForm = FormGroup<{
  landlord: FormControl<number | null>;
  consecutive: FormControl<string>;
  metersCoundiut: FormControl<number>;
  postsQuantity: FormControl<number>;
  aditionalNumber: FormControl<number>;
}>;

type InstallationCostForm = FormGroup<{
  cause: FormControl<number | null>;
  amount: FormControl<string>;
}>;

// ======================================================
// CONSTANTS
// ======================================================

const COMPLETED_STATUS = 'TERMINADO';

// ======================================================
// CUSTOM VALIDATORS
// ======================================================

const noWhitespaceValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const value = String(control.value ?? '');

  if (value.length === 0) {
    return null;
  }

  return value.trim().length > 0
    ? null
    : { whitespace: true };
};

const optionalConsecutiveValidator: ValidatorFn = (control) => {
  const value = control.value;
  const empty = value.landlord == null && !String(value.consecutive ?? '').trim()
    && !value.metersCoundiut && !value.postsQuantity && !value.aditionalNumber;
  return empty || (value.landlord != null && String(value.consecutive ?? '').trim())
    ? null : { incompleteConsecutive: true };
};

const optionalCostValidator: ValidatorFn = (control) => {
  const value = control.value;
  const amount = String(value.amount ?? '').trim();
  return (value.cause == null && !amount) || (value.cause != null && amount)
    ? null : { incompleteCost: true };
};

// ======================================================
// COMPONENT
// ======================================================

@Component({
  selector: 'app-delivery-new',
  imports: [ReactiveFormsModule, RouterLink, CurrencyInputDirective],
  templateUrl: './delivery-new.html',
  styleUrl: './delivery-new.scss',
})
export class DeliveryNew {
  private readonly formBuilder = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);

  private readonly deliveryService = inject(DeliveryService);
  private readonly authService = inject(AuthService);

  readonly options = signal<DeliveryCreateOptions | null>(null);
  readonly optionsLoading = signal(false);
  readonly optionsError = signal<string | null>(null);
  readonly submitted = signal(false);
  readonly saving = signal(false);
  readonly saveError = signal<string | null>(null);
  readonly createdDeliveryId = signal<number | null>(null);

  readonly openSection =
    signal<DeliverySection | null>('identification');

  // ====================================================
  // FORM
  // ====================================================

  readonly form = this.formBuilder.nonNullable.group({
    // ==================================================
    // 1. Identification
    // ==================================================

    dkoTkt: ['', [Validators.required, noWhitespaceValidator, Validators.maxLength(50)]],

    rfsFiberChain: ['', [Validators.required, noWhitespaceValidator, Validators.maxLength(50)]],

    soSap: ['', [noWhitespaceValidator, Validators.maxLength(10)]],

    // ==================================================
    // 2. Client & Location
    // ==================================================

    clientName: ['', [Validators.required, noWhitespaceValidator, Validators.maxLength(50)]],

    buildingName: ['', [Validators.required, noWhitespaceValidator, Validators.maxLength(150)]],

    address: ['', [Validators.required, noWhitespaceValidator, Validators.maxLength(150)]],

    city: this.formBuilder.control<number | null>(null, Validators.required),

    node: this.formBuilder.control<number | null>(null, Validators.required),

    revenue: ['', [Validators.pattern(/^\d+$/), Validators.min(0)]],

    // ==================================================
    // 3. Contact Information
    // ==================================================

    contact: ['', [Validators.required, noWhitespaceValidator, Validators.maxLength(50)]],

    email: ['', [Validators.required, Validators.email, Validators.maxLength(200)]],

    phone: [
      '',
      [Validators.required, Validators.pattern(/^(?:\+57[\s-]?)?3\d{2}[\s-]?\d{3}[\s-]?\d{4}$/)],
    ],

    // ==================================================
    // 4. Classification
    // ==================================================

    type: this.formBuilder.control<number | null>(null, Validators.required),

    status: this.formBuilder.control<number | null>(null, Validators.required),

    technology: this.formBuilder.control<number | null>(null, Validators.required),

    // ==================================================
    // 5. Landlords & Consecutives
    // ==================================================

    landlordConsecutives:
      this.formBuilder.array<LandlordConsecutiveForm>([
        this.createLandlordConsecutiveGroup(),
      ]),

    // ==================================================
    // 6. Assignment
    // ==================================================

    eaim: this.formBuilder.control<number | null>(null, Validators.required),

    responsible: this.formBuilder.control<number | null>(null, Validators.required),

    // ==================================================
    // 7. Costs
    // ==================================================

    surveyCost: ['', [Validators.required, Validators.pattern(/^\d+$/), Validators.min(0)]],

    installationBudget: ['', [Validators.required, Validators.pattern(/^\d+$/), Validators.min(0)]],

    installationCosts:
      this.formBuilder.array<InstallationCostForm>([
        this.createInstallationCostGroup(),
      ]),

    // ==================================================
    // 8. Observations
    // ==================================================

    observations: ['', [Validators.required, noWhitespaceValidator, Validators.maxLength(500)]],
  });

  // ====================================================
  // CONSTRUCTOR
  // ====================================================

  private readonly selectedCity = toSignal(this.form.controls.city.valueChanges, {
    initialValue: this.form.controls.city.value,
  });

  readonly filteredNodes = computed(() =>
    (this.options()?.nodes ?? []).filter((node) => node.cityId === this.selectedCity()),
  );

  constructor() {
    this.form.controls.city.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.form.controls.node.reset(null));
    this.loadOptions();
    this.form.controls.status.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((status) => {
        this.updateCompletionValidators(status);
      });

    this.updateCompletionValidators(this.form.controls.status.value);
  }

  loadOptions(): void {
    if (this.optionsLoading()) return;
    this.optionsLoading.set(true);
    this.optionsError.set(null);
    this.deliveryService
      .getCreateOptions()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (options) => {
          this.options.set(options);
          this.optionsLoading.set(false);
          this.updateCompletionValidators(this.form.controls.status.value);
        },
        error: (error: HttpErrorResponse) => {
          this.optionsLoading.set(false);
          if (error.status === 401) {
            this.authService.clearSession();
            this.optionsError.set('Your session is missing or expired. Please sign in again.');
          } else {
            this.optionsError.set('Unable to load delivery options. Please try again.');
          }
        },
      });
  }

  // ====================================================
  // LANDLORDS & CONSECUTIVES
  // ====================================================

  get landlordConsecutives():
    FormArray<LandlordConsecutiveForm> {
    return this.form.controls.landlordConsecutives;
  }

  addLandlordConsecutive(): void {
    this.landlordConsecutives.push(this.createLandlordConsecutiveGroup());

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

  get installationCosts():
    FormArray<InstallationCostForm> {
    return this.form.controls.installationCosts;
  }

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
    this.openSection.update((currentSection) => (currentSection === section
          ? null
          : section));
  }

  isSectionOpen(section: DeliverySection): boolean {
    return this.openSection() === section;
  }

  // ====================================================
  // SUBMIT
  // ====================================================

  submit(): void {
    if (this.saving() || this.createdDeliveryId() !== null
      || this.optionsLoading() || !this.options() || this.optionsError()) return;

    this.submitted.set(true);
    this.saveError.set(null);
    this.updateCompletionValidators(this.form.controls.status.value);
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      this.openFirstInvalidSection();
      return;
    }

    const value = this.form.getRawValue();
    // Select controls are nullable until a choice is made; never send a placeholder ID.
    if (value.city == null || value.node == null || value.type == null || value.status == null
      || value.technology == null || value.eaim == null || value.responsible == null) return;
    const request: CreateDelivery = {
      workOrderId: value.dkoTkt.trim(),
      rfsFiberChain: value.rfsFiberChain.trim(),
      soSap: value.soSap.trim() || null,
      clientName: value.clientName.trim(),
      buildingSite: value.buildingName.trim(),
      address: value.address.trim(),
      cityId: value.city,
      nodeId: value.node,
      revenue: value.revenue === '' ? null : Number(value.revenue),
      contactName: value.contact.trim(),
      email: value.email.trim(),
      mobilePhone: Number(value.phone.replace(/[^0-9]/g, '')),
      typeId: value.type,
      statusId: value.status,
      technologyId: value.technology,
      eaimId: value.eaim,
      userId: value.responsible,
      surveryCost: Number(value.surveyCost),
      installationBudget: Number(value.installationBudget),
      observation: value.observations.trim(),
      consecutives: value.landlordConsecutives
        .filter((row) => row.landlord != null)
        .map((row) => ({
          landlordId: row.landlord!, consecutive: row.consecutive.trim(),
          metersCoundiut: row.metersCoundiut ?? 0, postsQuantity: row.postsQuantity ?? 0,
          aditionalNumber: row.aditionalNumber ?? 0,
        })),
      installationCosts: value.installationCosts
        .filter((row) => row.cause != null)
        .map((row) => ({ causeId: row.cause!, cost: Number(row.amount) })),
    };
    this.saving.set(true);
    this.deliveryService.create(request)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (delivery) => {
          this.saving.set(false);
          this.createdDeliveryId.set(delivery.id);
        },
        error: (error: HttpErrorResponse) => {
          this.saving.set(false);
          if (error.status === 401) {
            this.authService.clearSession();
            this.saveError.set('Your session has expired. Sign in again to save this delivery.');
          } else if (error.status === 400) {
            const messages = Object.values(error.error?.errors ?? {}).flat();
            this.saveError.set(messages.length ? messages.join(' ')
              : error.error?.message ?? 'Review the delivery information and try again.');
          } else {
            this.saveError.set('Unable to confirm delivery creation. Your form is preserved. Check whether it was created before retrying.');
          }
        },
      });
  }

  // ====================================================
  // CONDITIONAL VALIDATION
  // ====================================================

  protected isCompleted(): boolean {
    return (
      this.options()
        ?.deliveryStatuses.find((option) => option.id === this.form.controls.status.value)
        ?.name.trim()
        .toUpperCase() === COMPLETED_STATUS
    );
  }

  private updateCompletionValidators(status: number | null): void {
    const isCompleted =
      this.options()
        ?.deliveryStatuses.find((option) => option.id === status)
        ?.name.trim()
        .toUpperCase() === COMPLETED_STATUS;

    this.updateSoSapValidators(isCompleted);

    this.updateRevenueValidators(isCompleted);


  }

  private updateSoSapValidators(isCompleted: boolean): void {
    const control = this.form.controls.soSap;

    if (isCompleted) {
      control.setValidators([Validators.required, noWhitespaceValidator, Validators.maxLength(10)]);
    } else {
      control.setValidators([noWhitespaceValidator, Validators.maxLength(10)]);
    }

    control.updateValueAndValidity({
      emitEvent: false,
    });
  }

  private updateRevenueValidators(isCompleted: boolean): void {
    const control = this.form.controls.revenue;

    const numericValidators = [Validators.pattern(/^\d+$/), Validators.min(0)];

    if (isCompleted) {
      control.setValidators([Validators.required, ...numericValidators]);
    } else {
      control.setValidators(numericValidators);
    }

    control.updateValueAndValidity({
      emitEvent: false,
    });
  }

  // ====================================================
  // LANDLORD FORM FACTORY
  // ====================================================

  private createLandlordConsecutiveGroup(): LandlordConsecutiveForm {
    const integerValidators = [Validators.pattern(/^-?\d+$/), Validators.min(-2147483648), Validators.max(2147483647)];
    return this.formBuilder.nonNullable.group({
      landlord: this.formBuilder.control<number | null>(null),
      consecutive: ['', [noWhitespaceValidator, Validators.maxLength(50)]],
      metersCoundiut: [0, integerValidators],
      postsQuantity: [0, integerValidators],
      aditionalNumber: [0, integerValidators],
    }, { validators: optionalConsecutiveValidator });
  }

  private createInstallationCostGroup(): InstallationCostForm {
    return this.formBuilder.nonNullable.group({
      cause: new FormControl<number | null>(null),
      amount: ['', [Validators.pattern(/^\d+$/), Validators.min(0)]],
    }, { validators: optionalCostValidator });
  }

  // ====================================================
  // VALIDATION NAVIGATION
  // ====================================================

  private openFirstInvalidSection(): void {
    // 1. Identification

    if (
      this.form.controls.dkoTkt.invalid
      || this.form.controls.rfsFiberChain.invalid
      || this.form.controls.soSap.invalid
    ) {
      this.openSection.set('identification');
      return;
    }

    // 2. Client & Location

    if (
      this.form.controls.clientName.invalid
      || this.form.controls.buildingName.invalid
      || this.form.controls.address.invalid
      || this.form.controls.city.invalid
      || this.form.controls.node.invalid
      || this.form.controls.revenue.invalid
    ) {
      this.openSection.set('clientLocation');
      return;
    }

    // 3. Contact Information

    if (
      this.form.controls.contact.invalid
      || this.form.controls.email.invalid
      || this.form.controls.phone.invalid
    ) {
      this.openSection.set('contact');
      return;
    }

    // 4. Classification

    if (
      this.form.controls.type.invalid
      || this.form.controls.status.invalid
      || this.form.controls.technology.invalid
    ) {
      this.openSection.set('classification');
      return;
    }

    // 5. Landlords & Consecutives

    if (this.landlordConsecutives.invalid) {
      this.openSection.set('landlordConsecutives');
      return;
    }

    // 6. Assignment

    if (
      this.form.controls.eaim.invalid
      || this.form.controls.responsible.invalid
    ) {
      this.openSection.set('assignment');
      return;
    }

    // 7. Costs

    if (
      this.form.controls.surveyCost.invalid
      || this.form.controls.installationBudget.invalid
      || this.installationCosts.invalid
    ) {
      this.openSection.set('costs');
      return;
    }

    // 8. Observations

    if (this.form.controls.observations.invalid) {
      this.openSection.set('observations');
    }
  }
}