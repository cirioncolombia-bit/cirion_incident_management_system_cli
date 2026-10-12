import { Component, DestroyRef, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { AuthService } from '../../../auth/services/auth.service';
import { CurrentUser, OwnProfileWrite } from '../../../auth/models/current-user';
@Component({
  selector: 'app-profile',
  imports: [ReactiveFormsModule, DatePipe],
  styleUrl: './profile.scss',
  templateUrl: './profile.html',
})
export class Profile {
  private readonly auth = inject(AuthService);
  private readonly fb = inject(FormBuilder);
  private readonly destroy = inject(DestroyRef);
  readonly user = this.auth.currentUser;
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly optionsReady = signal(false);
  readonly error = signal('');
  readonly notice = signal('');
  readonly passwordError = signal('');
  readonly areas = signal<{ id: number; name: string }[]>([]);
  readonly form = this.fb.nonNullable.group({
    firstName: ['', [Validators.required, Validators.maxLength(100)]],
    secondName: ['', Validators.maxLength(100)],
    firstSurname: ['', [Validators.required, Validators.maxLength(100)]],
    secondSurname: ['', Validators.maxLength(100)],
    email: ['', [Validators.required, Validators.email, Validators.maxLength(255)]],
    areaId: ['', Validators.required],
  });
  readonly password = this.fb.nonNullable.group({
    currentPassword: ['', Validators.required],
    newPassword: ['', Validators.required],
    confirmPassword: ['', Validators.required],
  });
  constructor() {
    this.load();
  }
  load() {
    this.loading.set(true);
    this.error.set('');
    this.auth
      .loadCurrentUser()
      .pipe(
        takeUntilDestroyed(this.destroy),
        finalize(() => this.loading.set(false)),
      )
      .subscribe({ next: (u) => this.fill(u), error: (e) => this.error.set(this.message(e)) });
    this.optionsReady.set(false);
    this.auth
      .profileOptions()
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: (a) => {
          this.areas.set(a);
          this.optionsReady.set(true);
        },
        error: (e) => this.error.set(this.message(e)),
      });
  }
  private fill(u: CurrentUser) {
    this.form.reset({
      firstName: u.firstName,
      secondName: u.secondName ?? '',
      firstSurname: u.firstSurname,
      secondSurname: u.secondSurname ?? '',
      email: u.email,
      areaId: String(u.areaId),
    });
  }
  hasArea(id: number) {
    return this.areas().some((a) => a.id === id);
  }
  save() {
    if (this.saving() || this.loading() || !this.user() || !this.optionsReady()) return;
    this.form.markAllAsTouched();
    this.error.set('');
    this.notice.set('');
    const v = this.form.getRawValue();
    if (this.form.invalid || !v.firstName.trim() || !v.firstSurname.trim()) {
      this.error.set('Completa los datos obligatorios y revisa el formato del correo.');
      return;
    }
    const body: OwnProfileWrite = {
      firstName: v.firstName.trim(),
      secondName: v.secondName.trim(),
      firstSurname: v.firstSurname.trim(),
      secondSurname: v.secondSurname.trim(),
      email: v.email.trim().toLowerCase(),
      areaId: Number(v.areaId),
    };
    const emailChanged = body.email !== this.user()!.email;
    this.saving.set(true);
    this.auth
      .updateProfile(body)
      .pipe(
        takeUntilDestroyed(this.destroy),
        finalize(() => this.saving.set(false)),
      )
      .subscribe({
        next: (u) => {
          if (emailChanged) {
            this.auth.signInAgain(
              'Tu correo se actualizó correctamente. Inicia sesión con el nuevo correo.',
            );
            return;
          }
          this.fill(u);
          this.notice.set('Tu perfil se actualizó correctamente.');
        },
        error: (e) => this.error.set(this.message(e)),
      });
  }
  changePassword() {
    if (this.saving() || this.loading() || !this.user()) return;
    this.password.markAllAsTouched();
    this.passwordError.set('');
    const v = this.password.getRawValue();
    if (this.password.invalid || !v.newPassword.trim()) {
      this.passwordError.set('Completa la contraseña actual, la nueva y su confirmación.');
      return;
    }
    if (v.newPassword !== v.confirmPassword) {
      this.passwordError.set('La nueva contraseña y su confirmación no coinciden.');
      return;
    }
    this.saving.set(true);
    this.auth
      .changePassword(v.currentPassword, v.newPassword)
      .pipe(
        takeUntilDestroyed(this.destroy),
        finalize(() => this.saving.set(false)),
      )
      .subscribe({
        next: () => {
          this.password.reset();
          this.auth.signInAgain(
            'Tu contraseña se actualizó correctamente. Inicia sesión nuevamente.',
          );
        },
        error: (e) =>
          this.passwordError.set(
            e instanceof HttpErrorResponse && e.status === 400
              ? 'La contraseña actual no es correcta o los datos no son válidos.'
              : this.message(e),
          ),
      });
  }
  private message(e: unknown) {
    if (!(e instanceof HttpErrorResponse))
      return 'No se pudo completar la operación. Inténtalo nuevamente.';
    if (e.status === 0) return 'No se pudo conectar con el servidor.';
    if (e.status === 409)
      return 'El correo ya está registrado o hubo un cambio simultáneo. Revisa los datos.';
    if (e.status === 403) return 'No tienes permiso para realizar esta operación.';
    if (e.status === 400)
      return (
        e.error?.message ||
        Object.values(e.error?.errors ?? {})
          .flat()
          .join(' ') ||
        'Revisa los datos del formulario.'
      );
    return 'No se pudo completar la operación. Inténtalo nuevamente.';
  }
}
