import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthService } from '../../features/auth/services/auth.service';
import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-authenticated-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './authenticated-layout.html',
  styleUrl: './authenticated-layout.scss',
})
export class AuthenticatedLayout {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly currentUser = this.authService.currentUser;
  readonly accountError = signal('');
  readonly displayName = computed(
    () => this.currentUser()?.fullName || this.currentUser()?.email || 'Cuenta',
  );
  readonly greeting = computed(
    () => this.currentUser()?.firstName || this.currentUser()?.fullName || '',
  );
  readonly initials = computed(() => {
    const user = this.currentUser();
    return user
      ? `${user.firstName?.[0] ?? ''}${user.firstSurname?.[0] ?? ''}`.toUpperCase() ||
          user.email[0].toUpperCase()
      : '…';
  });
  readonly roleNames = computed(() =>
    this.currentUser()
      ? this.currentUser()!
          .roles.map((r) => r.name)
          .join(', ') || 'No roles assigned'
      : 'Loading account…',
  );
  private readonly destroy = inject(DestroyRef);

  constructor() {
    this.loadAccount();
  }

  loadAccount(): void {
    this.accountError.set('');
    this.authService
      .loadCurrentUser()
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        error: () => this.accountError.set('Your account information could not be loaded.'),
      });
  }

  readonly sidebarOpen = signal(false);
  readonly userMenuOpen = signal(false);
  readonly sidebarCollapsed = signal(false);

  openSidebar(): void {
    this.sidebarOpen.set(true);
  }

  closeSidebar(): void {
    this.sidebarOpen.set(false);
  }

  toggleUserMenu(): void {
    this.userMenuOpen.update((isOpen) => !isOpen);
  }

  closeUserMenu(): void {
    this.userMenuOpen.set(false);
  }

  toggleSidebarCollapsed(): void {
    this.sidebarCollapsed.update((collapsed) => !collapsed);
  }

  logout(): void {
    this.authService.clearSession();
    this.closeSidebar();
    this.closeUserMenu();

    void this.router.navigate(['/login']);
  }
}
