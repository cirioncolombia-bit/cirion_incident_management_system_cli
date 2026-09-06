import { Component, inject, signal } from '@angular/core';
import {
  Router,
  RouterLink,
  RouterLinkActive,
  RouterOutlet,
} from '@angular/router';

@Component({
  selector: 'app-authenticated-layout',
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
  ],
  templateUrl: './authenticated-layout.html',
  styleUrl: './authenticated-layout.scss',
})
export class AuthenticatedLayout {
  private readonly router = inject(Router);

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
    this.closeSidebar();
    this.closeUserMenu();

    void this.router.navigate(['/login']);
  }
}