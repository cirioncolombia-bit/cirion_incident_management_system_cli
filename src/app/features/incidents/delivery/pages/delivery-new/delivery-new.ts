import {
  Component,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
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
  landlord: FormControl<string>;
  consecutive: FormControl<string>;
}>;

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

type InstallationCostForm = FormGroup<{
  cause: FormControl<InstallationCostCause | ''>;
  amount: FormControl<string>;
}>;

// ======================================================
// CONSTANTS
// ======================================================

const COMPLETED_STATUS = 'TERMINADO';

// ======================================================
// CUSTOM VALIDATORS
// ======================================================

const noWhitespaceValidator: ValidatorFn = (
  control: AbstractControl,
): ValidationErrors | null => {
  const value = String(control.value ?? '');

  if (value.length === 0) {
    return null;
  }

  return value.trim().length > 0
    ? null
    : { whitespace: true };
};

// ======================================================
// COMPONENT
// ======================================================

@Component({
  selector: 'app-delivery-new',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    CurrencyInputDirective,
  ],
  templateUrl: './delivery-new.html',
  styleUrl: './delivery-new.scss',
})
export class DeliveryNew {
  private readonly formBuilder = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);

  readonly submitted = signal(false);

  readonly openSection =
    signal<DeliverySection | null>('identification');

  // ====================================================
  // FORM
  // ====================================================

  readonly form = this.formBuilder.nonNullable.group({
    // ==================================================
    // 1. Identification
    // ==================================================

    dkoTkt: [
      '',
      [
        Validators.required,
        noWhitespaceValidator,
      ],
    ],

    rfsFiberChain: [
      '',
      [
        Validators.required,
        noWhitespaceValidator,
      ],
    ],

    soSap: [
      '',
      [
        noWhitespaceValidator,
      ],
    ],

    // ==================================================
    // 2. Client & Location
    // ==================================================

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
        Validators.pattern(/^\d+$/),
        Validators.min(0),
      ],
    ],

    // ==================================================
    // 3. Contact Information
    // ==================================================

    contact: [
      '',
      [
        Validators.required,
        noWhitespaceValidator,
      ],
    ],

    email: [
      '',
      [
        Validators.required,
        Validators.email,
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

    // ==================================================
    // 4. Classification
    // ==================================================

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

    eaim: [
      '',
      Validators.required,
    ],

    responsible: [
      '',
      Validators.required,
    ],

    // ==================================================
    // 7. Costs
    // ==================================================

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

    installationCosts:
      this.formBuilder.array<InstallationCostForm>([
        this.createInstallationCostGroup(),
      ]),

    // ==================================================
    // 8. Observations
    // ==================================================

    observations: [
      '',
      [
        Validators.required,
        noWhitespaceValidator,
      ],
    ],
  });

  // ====================================================
  // CONSTRUCTOR
  // ====================================================

  constructor() {
    this.form.controls.status.valueChanges
      .pipe(
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((status) => {
        this.updateCompletionValidators(status);
      });

    this.updateCompletionValidators(
      this.form.controls.status.value,
    );
  }

  // ====================================================
  // LANDLORDS & CONSECUTIVES
  // ====================================================

  get landlordConsecutives():
    FormArray<LandlordConsecutiveForm> {
    return this.form.controls.landlordConsecutives;
  }

  addLandlordConsecutive(): void {
    this.landlordConsecutives.push(
      this.createLandlordConsecutiveGroup(
        this.isCompleted(),
      ),
    );

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
    this.installationCosts.push(
      this.createInstallationCostGroup(),
    );

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
    this.openSection.update(
      (currentSection) =>
        currentSection === section
          ? null
          : section,
    );
  }

  isSectionOpen(section: DeliverySection): boolean {
    return this.openSection() === section;
  }

  // ====================================================
  // SUBMIT
  // ====================================================

  submit(): void {
    this.submitted.set(true);

    this.updateCompletionValidators(
      this.form.controls.status.value,
    );

    this.form.markAllAsTouched();

    if (this.form.invalid) {
      this.openFirstInvalidSection();
      return;
    }

    const delivery = this.form.getRawValue();

    console.log('New Delivery:', delivery);
  }

  // ====================================================
  // CONDITIONAL VALIDATION
  // ====================================================

  private isCompleted(): boolean {
    return (
      this.form.controls.status.value
      === COMPLETED_STATUS
    );
  }

  private updateCompletionValidators(
    status: string,
  ): void {
    const isCompleted =
      status === COMPLETED_STATUS;

    this.updateSoSapValidators(isCompleted);

    this.updateRevenueValidators(isCompleted);

    this.updateLandlordConsecutiveValidators(
      isCompleted,
    );
  }

  private updateSoSapValidators(
    isCompleted: boolean,
  ): void {
    const control = this.form.controls.soSap;

    if (isCompleted) {
      control.setValidators([
        Validators.required,
        noWhitespaceValidator,
      ]);
    } else {
      control.setValidators([
        noWhitespaceValidator,
      ]);
    }

    control.updateValueAndValidity({
      emitEvent: false,
    });
  }

  private updateRevenueValidators(
    isCompleted: boolean,
  ): void {
    const control = this.form.controls.revenue;

    const numericValidators = [
      Validators.pattern(/^\d+$/),
      Validators.min(0),
    ];

    if (isCompleted) {
      control.setValidators([
        Validators.required,
        ...numericValidators,
      ]);
    } else {
      control.setValidators(
        numericValidators,
      );
    }

    control.updateValueAndValidity({
      emitEvent: false,
    });
  }

  private updateLandlordConsecutiveValidators(
    isCompleted: boolean,
  ): void {
    for (
      const group
      of this.landlordConsecutives.controls
    ) {
      this.applyLandlordConsecutiveValidators(
        group,
        isCompleted,
      );
    }
  }

  private applyLandlordConsecutiveValidators(
    group: LandlordConsecutiveForm,
    isCompleted: boolean,
  ): void {
    const landlordControl =
      group.controls.landlord;

    const consecutiveControl =
      group.controls.consecutive;

    if (isCompleted) {
      landlordControl.setValidators([
        Validators.required,
      ]);

      consecutiveControl.setValidators([
        Validators.required,
        noWhitespaceValidator,
      ]);
    } else {
      landlordControl.clearValidators();

      consecutiveControl.setValidators([
        noWhitespaceValidator,
      ]);
    }

    landlordControl.updateValueAndValidity({
      emitEvent: false,
    });

    consecutiveControl.updateValueAndValidity({
      emitEvent: false,
    });
  }

  // ====================================================
  // LANDLORD FORM FACTORY
  // ====================================================

  private createLandlordConsecutiveGroup(
    required = false,
  ): LandlordConsecutiveForm {
    return this.formBuilder.nonNullable.group({
      landlord: [
        '',
        required
          ? [Validators.required]
          : [],
      ],

      consecutive: [
        '',
        required
          ? [
              Validators.required,
              noWhitespaceValidator,
            ]
          : [
              noWhitespaceValidator,
            ],
      ],
    });
  }

  // ====================================================
  // INSTALLATION COST FORM FACTORY
  // ====================================================

  private createInstallationCostGroup():
    InstallationCostForm {
    return this.formBuilder.nonNullable.group({
      cause: new FormControl<
        InstallationCostCause | ''
      >(
        '',
        {
          nonNullable: true,
          validators: [
            Validators.required,
          ],
        },
      ),

      amount: [
        '',
        [
          Validators.required,
          Validators.pattern(/^\d+$/),
          Validators.min(0),
        ],
      ],
    });
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