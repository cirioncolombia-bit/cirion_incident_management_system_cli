import {
  Component,
  inject,
  signal,
} from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { RouterLink } from '@angular/router';

import { CurrencyInputDirective } from './currency-input.directive';

type DeliverySection =
  | 'identification'
  | 'clientLocation'
  | 'classification'
  | 'assignment'
  | 'dates'
  | 'costs'
  | 'contact'
  | 'observations';

const noWhitespaceValidator: ValidatorFn = (
  control: AbstractControl,
): ValidationErrors | null => {
  const value = String(control.value ?? '').trim();

  return value.length > 0
    ? null
    : { whitespace: true };
};

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

  readonly submitted = signal(false);

  readonly openSection =
    signal<DeliverySection | null>('identification');

  readonly form = this.formBuilder.nonNullable.group({
    // 1. Identification
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

    // 2. Client & Location
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
    city: ['', Validators.required],
    node: ['', Validators.required],
    revenue: [
      '',
      [
        Validators.required,
        Validators.pattern(/^\d+$/),
        Validators.min(0),
      ],
    ],

    // 3. Classification
    type: ['', Validators.required],
    status: ['', Validators.required],
    technology: ['', Validators.required],

    // 4. Assignment
    landlord: ['', Validators.required],
    eaim: ['', Validators.required],
    responsible: ['', Validators.required],

    // 5. Dates
    dkoAssignmentDate: ['', Validators.required],
    eaimSurveyRequestDate: ['', Validators.required],
    installationDate: ['', Validators.required],

    // 6. Costs
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

    // 7. Contact
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

    // 8. Observations
    observations: [
      '',
      [
        Validators.required,
        noWhitespaceValidator,
      ],
    ],
  });

  toggleSection(section: DeliverySection): void {
    this.openSection.update((currentSection) =>
      currentSection === section
        ? null
        : section,
    );
  }

  isSectionOpen(section: DeliverySection): boolean {
    return this.openSection() === section;
  }

  submit(): void {
    this.submitted.set(true);
    this.form.markAllAsTouched();

    if (this.form.invalid) {
      this.openFirstInvalidSection();
      return;
    }

    const delivery = this.form.getRawValue();

    console.log('New Delivery:', delivery);
  }

  private openFirstInvalidSection(): void {
    if (
      this.form.controls.dkoTkt.invalid
      || this.form.controls.rfsFiberChain.invalid
      || this.form.controls.consecutive.invalid
      || this.form.controls.soSap.invalid
    ) {
      this.openSection.set('identification');
      return;
    }

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

    if (
      this.form.controls.type.invalid
      || this.form.controls.status.invalid
      || this.form.controls.technology.invalid
    ) {
      this.openSection.set('classification');
      return;
    }

    if (
      this.form.controls.landlord.invalid
      || this.form.controls.eaim.invalid
      || this.form.controls.responsible.invalid
    ) {
      this.openSection.set('assignment');
      return;
    }

    if (
      this.form.controls.dkoAssignmentDate.invalid
      || this.form.controls.eaimSurveyRequestDate.invalid
      || this.form.controls.installationDate.invalid
    ) {
      this.openSection.set('dates');
      return;
    }

    if (
      this.form.controls.surveyCost.invalid
      || this.form.controls.installationBudget.invalid
      || this.form.controls.installationCost.invalid
    ) {
      this.openSection.set('costs');
      return;
    }

    if (
      this.form.controls.email.invalid
      || this.form.controls.contact.invalid
      || this.form.controls.phone.invalid
    ) {
      this.openSection.set('contact');
      return;
    }

    if (this.form.controls.observations.invalid) {
      this.openSection.set('observations');
    }
  }
}