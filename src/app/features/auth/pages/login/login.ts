import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-login',
  imports: [],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login {
  private readonly router = inject(Router);

  onSubmit(event: SubmitEvent): void {
    event.preventDefault();

    void this.router.navigate(['/dashboard']);
  }
}