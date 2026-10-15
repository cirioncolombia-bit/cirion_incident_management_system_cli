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
      this.error.set('Complete the required fields and check the email format.');
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
              'Your email was updated successfully. Sign in using your new email.',
            );
            return;
          }
          this.fill(u);
          this.notice.set('Your profile was updated successfully.');
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
      this.passwordError.set('Enter your current password, new password and confirmation.');
      return;
    }
    if (v.newPassword !== v.confirmPassword) {
      this.passwordError.set('The new password and confirmation do not match.');
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
            'Your password was updated successfully. Please sign in again.',
          );
        },
        error: (e) =>
          this.passwordError.set(
            e instanceof HttpErrorResponse && e.status === 400
              ? 'The current password is incorrect or the information is invalid.'
              : this.message(e),
          ),
      });
  }
  private message(e: unknown) {
    if (!(e instanceof HttpErrorResponse))
      return 'The operation could not be completed. Please try again.';
    if (e.status === 0) return 'Could not connect to the server.';
    if (e.status === 409)
      return 'The email is already registered or another update occurred. Review the information.';
    if (e.status === 403) return 'You do not have permission to perform this operation.';
    if (e.status === 400)
      return (
        e.error?.message ||
        Object.values(e.error?.errors ?? {})
          .flat()
          .join(' ') ||
        'Review the form information.'
      );
    return 'The operation could not be completed. Please try again.';
  }
}
