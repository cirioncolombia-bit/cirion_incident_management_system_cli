import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { of, Subject, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { vi } from 'vitest';
import { Profile } from './profile';
import { AuthService } from '../../../auth/services/auth.service';
import { CurrentUser } from '../../../auth/models/current-user';
export const profileUser: CurrentUser = {
  id: 3,
  firstName: 'Pruebas',
  secondName: null,
  firstSurname: 'Torres',
  secondSurname: null,
  fullName: 'Pruebas Torres',
  email: 'pruebas@example.com',
  areaId: 1,
  areaName: 'Operaciones',
  userType: 1,
  isExternal: false,
  eaimId: null,
  eaimName: null,
  eaimIsActive: false,
  roles: [{ id: 1, name: 'Administrator', description: 'Admin' }],
  permissions: ['users.manage'],
  isActive: true,
  createAt: '2026-01-01T00:00:00Z',
  createdBy: 3,
  updatedAt: null,
  updatedBy: null,
  lastLoginAt: null,
  isLocked: false,
  lockedUntil: null,
  failedLoginAttempts: 0,
};
describe('Own profile', () => {
  function setup() {
    const currentUser = signal<CurrentUser | null>(profileUser);
    const auth = {
      currentUser,
      loadCurrentUser: vi.fn(() => of(profileUser)),
      profileOptions: vi.fn(() => of([{ id: 1, name: 'Operaciones' }])),
      updateProfile: vi.fn(() => of(profileUser)),
      changePassword: vi.fn(() => of<void>(void 0)),
      signInAgain: vi.fn(),
    };
    TestBed.configureTestingModule({
      imports: [Profile],
      providers: [{ provide: AuthService, useValue: auth }],
    });
    const fixture = TestBed.createComponent(Profile);
    fixture.detectChanges();
    return { auth, fixture, component: fixture.componentInstance };
  }
  it('renders actual logged-in user and fills editable names', () => {
    const { component, fixture } = setup();
    expect(fixture.nativeElement.textContent).toContain('Pruebas Torres');
    expect(component.form.controls.firstName.value).toBe('Pruebas');
    expect(fixture.nativeElement.textContent).not.toContain('Pedro García');
  });
  it('sends only personal fields without user ID, roles, permissions or EAIM', () => {
    const { component, auth } = setup();
    component.form.controls.firstName.setValue('Nombre nuevo');
    component.save();
    expect(auth.updateProfile).toHaveBeenCalledWith({
      firstName: 'Nombre nuevo',
      secondName: '',
      firstSurname: 'Torres',
      secondSurname: '',
      email: 'pruebas@example.com',
      areaId: 1,
    });
  });
  it('access information has no edit controls', () => {
    const { fixture } = setup();
    const access = fixture.nativeElement.querySelector('.access');
    expect(access.querySelector('input, select, button')).toBeNull();
    expect(access.textContent).toContain('Administrator');
  });
  it('does not sign out after changing names only', () => {
    const { component, auth } = setup();
    component.form.controls.firstName.setValue('Nombre nuevo');
    component.save();
    expect(auth.signInAgain).not.toHaveBeenCalled();
    expect(component.notice()).toContain('actualizó');
  });
  it('returns to login after email changes invalidate existing sessions', () => {
    const { component, auth } = setup();
    component.form.controls.email.setValue('new@example.com');
    component.save();
    expect(auth.signInAgain).toHaveBeenCalledWith(expect.stringContaining('nuevo correo'));
  });
  it('blocks repeated profile saves while pending', () => {
    const { component, auth } = setup();
    auth.updateProfile.mockReturnValue(new Subject<CurrentUser>());
    component.save();
    component.save();
    expect(auth.updateProfile).toHaveBeenCalledTimes(1);
  });
  it('does not call password endpoint for unmatched confirmation', () => {
    const { component, auth } = setup();
    component.password.setValue({
      currentPassword: 'current',
      newPassword: 'new',
      confirmPassword: 'other',
    });
    component.changePassword();
    expect(auth.changePassword).not.toHaveBeenCalled();
    expect(component.passwordError()).toContain('no coinciden');
  });
  it('uses existing password endpoint and clears session only after success', () => {
    const { component, auth } = setup();
    component.password.setValue({
      currentPassword: 'current',
      newPassword: 'new',
      confirmPassword: 'new',
    });
    component.changePassword();
    expect(auth.changePassword).toHaveBeenCalledWith('current', 'new');
    expect(auth.signInAgain).toHaveBeenCalledWith(expect.stringContaining('contraseña'));
    expect(component.password.controls.newPassword.value).toBe('');
  });
  it('preserves session when current password is incorrect', () => {
    const { component, auth } = setup();
    auth.changePassword.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 400 })));
    component.password.setValue({
      currentPassword: 'wrong',
      newPassword: 'new',
      confirmPassword: 'new',
    });
    component.changePassword();
    expect(auth.signInAgain).not.toHaveBeenCalled();
    expect(component.passwordError()).toContain('actual');
  });
  it('keeps entered personal data on save failure', () => {
    const { component, auth } = setup();
    auth.updateProfile.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 409 })));
    component.form.controls.email.setValue('taken@example.com');
    component.save();
    expect(component.form.controls.email.value).toBe('taken@example.com');
    expect(auth.signInAgain).not.toHaveBeenCalled();
  });
});
