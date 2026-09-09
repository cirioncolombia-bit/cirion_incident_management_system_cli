import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

@Component({
  selector: 'app-delivery-new',
  imports: [ReactiveFormsModule],
  templateUrl: './delivery-new.html',
  styleUrl: './delivery-new.scss',
})
export class DeliveryNew {
  private readonly formBuilder = inject(FormBuilder);

  readonly submitted = signal(false);

  readonly form = this.formBuilder.nonNullable.group({
    dkoTkt: ['', Validators.required],
    rfsFiberChain: ['', Validators.required],
    consecutive: [''],
    soSap: [''],
  });

  submit(): void {
    this.submitted.set(true);

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const delivery = this.form.getRawValue();

    console.log('Nuevo Delivery:', delivery);
  }

  readonly identificationOpen = signal(true);

  toggleIdentification(): void {
    this.identificationOpen.update((open) => !open);
  }
}
