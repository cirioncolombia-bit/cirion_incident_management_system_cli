import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router } from '@angular/router';

import { LoginRequest } from '../../models/login-request';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login {
  private readonly formBuilder = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly isLoading = signal(false);
  readonly errorMessage = signal<string | null>(null);

  readonly form = this.formBuilder.nonNullable.group({
    email: [
      '',
      [
        Validators.required,
        Validators.email,
      ],
    ],

    password: [
      '',
      [
        Validators.required,
      ],
    ],

    rememberMe: [false],
  });

  onSubmit(): void {
    if (this.isLoading()) return;

    this.errorMessage.set(null);

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const formValue = this.form.getRawValue();

    const credentials: LoginRequest = {
      email: formValue.email.trim(),
      password: formValue.password,
    };

    this.isLoading.set(true);

    this.authService.login(credentials).subscribe({
      next: (response) => {
        this.isLoading.set(false);

        this.authService.saveSession(response.accessToken, formValue.rememberMe);

        void this.router.navigate(['/dashboard']);
      },

      error: (error: HttpErrorResponse) => {
        this.isLoading.set(false);


        if (error.status === 401) {
          this.errorMessage.set(
            'El correo electrónico o la contraseña son incorrectos.',
          );
          return;
        }

        if (error.status === 0) {
          this.errorMessage.set(
            'No fue posible conectar con el servidor.',
          );
          return;
        }

        this.errorMessage.set(
          'Ocurrió un error al iniciar sesión. Intenta nuevamente.',
        );
      },
    });
  }
}