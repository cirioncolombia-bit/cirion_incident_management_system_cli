import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { vi } from 'vitest';
import { AuthService } from './auth.service';
import { environment } from '../../../../environments/environment';
describe('Authenticated user state', () => {
  let auth: AuthService, http: HttpTestingController;
  const navigate = vi.fn(() => Promise.resolve(true));
  const base = `${environment.apiUrl}/api/Auth`;
  const token = `header.${btoa(JSON.stringify({ exp: Date.now() / 1000 + 3600 }))}.signature`;
  const user = {
    id: 3,
    firstName: 'Pruebas',
    fullName: 'Pruebas Torres',
    email: 'pruebas@example.com',
    roles: [],
  };
  beforeEach(() => {
    sessionStorage.setItem('cims.accessToken', token);
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: Router, useValue: { navigate } },
      ],
    });
    auth = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);
    navigate.mockClear();
  });
  afterEach(() => {
    http.verify();
    sessionStorage.clear();
    localStorage.clear();
  });
  it('shares current-user lookup between header and profile', () => {
    auth.loadCurrentUser().subscribe();
    auth.loadCurrentUser().subscribe();
    http.expectOne(`${base}/me`).flush({ data: user });
    expect(auth.currentUser()?.firstName).toBe('Pruebas');
    auth.loadCurrentUser().subscribe();
    http.expectNone(`${base}/me`);
  });
  it('clears identity on logout', () => {
    auth.loadCurrentUser().subscribe();
    http.expectOne(`${base}/me`).flush({ data: user });
    auth.clearSession();
    expect(auth.currentUser()).toBeNull();
  });
  it('does not reuse previous identity after a different session begins', () => {
    auth.loadCurrentUser().subscribe();
    const old = http.expectOne(`${base}/me`);
    auth.saveSession(token + '-new', false);
    old.flush({ data: user });
    expect(auth.currentUser()).toBeNull();
    auth.loadCurrentUser().subscribe();
    http.expectOne(`${base}/me`).flush({ data: { ...user, id: 9, firstName: 'Otra' } });
    expect(auth.currentUser()?.firstName).toBe('Otra');
  });
  it('updates shared identity after a personal profile save', () => {
    auth
      .updateProfile({
        firstName: 'Nuevo',
        secondName: '',
        firstSurname: 'Torres',
        secondSurname: '',
        email: user.email,
        areaId: 1,
      })
      .subscribe();
    const r = http.expectOne(`${base}/me`);
    expect(r.request.method).toBe('PUT');
    expect(r.request.body).not.toHaveProperty('id');
    expect(r.request.body).not.toHaveProperty('roleIds');
    r.flush({ data: { ...user, firstName: 'Nuevo', fullName: 'Nuevo Torres' } });
    expect(auth.currentUser()?.fullName).toBe('Nuevo Torres');
  });
  it('uses existing password endpoint without the client confirmation', () => {
    auth.changePassword('current', 'new').subscribe();
    const r = http.expectOne(`${base}/change-password`);
    expect(r.request.body).toEqual({ currentPassword: 'current', newPassword: 'new' });
    r.flush(null, { status: 204, statusText: 'No Content' });
  });
  it('returns to login with success notice and clears token/identity', () => {
    auth.signInAgain('Actualizado');
    expect(auth.getAccessToken()).toBeNull();
    expect(auth.currentUser()).toBeNull();
    expect(navigate).toHaveBeenCalledWith(['/login'], {
      replaceUrl: true,
      state: { notice: 'Actualizado' },
    });
  });
});
