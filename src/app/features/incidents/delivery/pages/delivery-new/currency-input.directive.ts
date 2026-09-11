import {
  Directive,
  ElementRef,
  forwardRef,
  HostListener,
  inject,
} from '@angular/core';
import {
  ControlValueAccessor,
  NG_VALUE_ACCESSOR,
} from '@angular/forms';

@Directive({
  selector: 'input[cimsCurrencyInput]',
  standalone: true,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => CurrencyInputDirective),
      multi: true,
    },
  ],
})
export class CurrencyInputDirective implements ControlValueAccessor {
  private readonly element =
    inject<ElementRef<HTMLInputElement>>(ElementRef);

  private readonly formatter = new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

  private value = '';

  private onChange: (value: string) => void = () => {};
  private onTouched: () => void = () => {};

  writeValue(value: string | null): void {
    this.value = value ?? '';

    this.element.nativeElement.value = this.value
      ? this.formatter.format(Number(this.value))
      : '';
  }

  registerOnChange(
    callback: (value: string) => void,
  ): void {
    this.onChange = callback;
  }

  registerOnTouched(callback: () => void): void {
    this.onTouched = callback;
  }

  setDisabledState(disabled: boolean): void {
    this.element.nativeElement.disabled = disabled;
  }

  @HostListener('focus')
  handleFocus(): void {
    this.element.nativeElement.value = this.value;
  }

  @HostListener('input', ['$event'])
  handleInput(event: Event): void {
    const input = event.target as HTMLInputElement;

    const numericValue = input.value.replace(/\D/g, '');

    this.value = numericValue;
    input.value = numericValue;

    this.onChange(numericValue);
  }

  @HostListener('blur')
  handleBlur(): void {
    this.onTouched();

    this.element.nativeElement.value = this.value
      ? this.formatter.format(Number(this.value))
      : '';
  }
}