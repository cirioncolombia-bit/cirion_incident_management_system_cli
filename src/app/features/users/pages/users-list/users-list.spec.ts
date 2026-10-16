import { TestBed } from '@angular/core/testing';
import { of, throwError, Subject } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { UsersList } from './users-list';
import { UsersAdminService, UserRecord } from './services/users-admin.service';
import { vi } from 'vitest';
const user = {
  id: 3,
  firstName: 'Ana',
  secondName: null,
  firstSurname: 'Torres',
  secondSurname: null,
  email: 'ana@example.com',
  areaId: 1,
  areaName: 'Operaciones',
  eaimId: null,
  eaimName: null,
  userType: 1,
  roles: [{ id: 2, name: 'Viewer' }],
  isActive: true,
  createAt: '2026-01-01',
  lockedUntil: null,
  isLocked: false,
  lastLoginAt: null,
  failedLoginAttempts: 0,
} satisfies UserRecord;
describe('Users administration', () => {
  function setup(permissions = ['users.manage', 'catalogs.manage'], external = false) {
    const api = {
      me: vi.fn(() => of({ id: 3, isExternal: external, permissions })),
      users: vi.fn(() => of({ rows: [user], totalCount: 1, totalPages: 1, page: 1 })),
      options: vi.fn(() =>
        of({
          areas: [{ id: 1, name: 'Operaciones' }],
          roles: [{ id: 2, name: 'Viewer' }],
          eaims: [{ id: 8, name: 'Empresa' }],
        }),
      ),
      user: vi.fn(() => of(user)),
      catalogs: vi.fn(() => of([])),
      save: vi.fn(() => of({})),
      roles: vi.fn(() => of({})),
      deactivate: vi.fn(() => of(null)),
    };
    TestBed.configureTestingModule({
      imports: [UsersList],
      providers: [{ provide: UsersAdminService, useValue: api }],
    });
    const fixture = TestBed.createComponent(UsersList);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    // jsdom has no native modal implementation; browser coverage exercises the real dialogs.
    component.editor.nativeElement.showModal = vi.fn();
    component.editor.nativeElement.close = vi.fn();
    component.confirmation.nativeElement.showModal = vi.fn();
    component.confirmation.nativeElement.close = vi.fn();
    return { api, fixture, component };
  }
  it('denies global administration to external users, even with administrative grants', () => {
    const { component, api } = setup(['users.manage', 'catalogs.manage'], true);
    expect(component.allowed('users')).toBe(false);
    expect(component.allowed('eaims')).toBe(false);
    expect(api.users).not.toHaveBeenCalled();
  });
  it('limits EAIM-only administrators to that catalog', () => {
    const { component, api } = setup(['catalogs.manage']);
    expect(component.section()).toBe('eaims');
    expect(api.users).not.toHaveBeenCalled();
    expect(api.catalogs).toHaveBeenCalledWith('eaims');
  });
  it('creates user with numeric foreign keys, optional null EAIM, password and selected roles', () => {
    const { component, api } = setup();
    component.openNew();
    component.form.patchValue({
      firstName: 'Ana',
      firstSurname: 'Torres',
      email: 'ana@example.com',
      areaId: '1',
      userType: '1',
      password: 'test-value',
    });
    component.toggle(2, true);
    component.save();
    expect(api.save).toHaveBeenCalledWith(
      'users',
      null,
      expect.objectContaining({
        areaId: 1,
        eaimId: null,
        userType: 1,
        roleIds: [2],
        password: 'test-value',
      }),
    );
  });
  it('requires an EAIM for external users before saving', () => {
    const {component, api, fixture} = setup(); component.openNew(); component.toggle(2, true);
    component.form.patchValue({firstName:'Ana',firstSurname:'Torres',email:'ana@example.com',areaId:'1',userType:'2',password:'test-value'});
    component.save(); fixture.detectChanges();
    expect(api.save).not.toHaveBeenCalled();
    expect(component.form.controls.eaimId.hasError('required')).toBe(true);
    expect(component.editor.nativeElement.querySelector('[formControlName="eaimId"]')).not.toBeNull();
    component.form.controls.eaimId.setValue('8'); component.save();
    expect(api.save).toHaveBeenCalledWith('users', null, expect.objectContaining({userType:2,eaimId:8}));
  });
  it('clears and hides EAIM when changing to Internal and requires a new choice on External', () => {
    const {component, fixture, api} = setup(); component.openNew(); component.toggle(2, true);
    component.form.patchValue({firstName:'Ana',firstSurname:'Torres',email:'ana@example.com',areaId:'1',userType:'2',password:'test-value'});
    component.form.controls.eaimId.setValue('8'); component.form.controls.userType.setValue('1'); fixture.detectChanges();
    expect(component.form.controls.eaimId.value).toBe('');
    expect(component.editor.nativeElement.querySelector('[formControlName="eaimId"]')).toBeNull();
    component.save(); expect(api.save).toHaveBeenCalledWith('users',null,expect.objectContaining({eaimId:null}));
    component.form.controls.userType.setValue('2'); expect(component.form.controls.eaimId.hasError('required')).toBe(true);
  });
  it('blocks creating a user without roles and preserves the entered data', () => {
    const { component, api } = setup(); component.openNew();
    component.form.patchValue({ firstName:'Ana', firstSurname:'Torres', email:'ana@example.com', areaId:'1', userType:'1', password:'test-value' });
    const entered = component.form.getRawValue();
    component.save();
    expect(api.save).not.toHaveBeenCalled();
    expect(component.formError()).toBe('Select at least one role to create the user.');
    expect(component.form.getRawValue()).toEqual(entered);
    expect(component.editor.nativeElement.close).not.toHaveBeenCalled();
    component.toggle(2, true); component.save();
    expect(api.save).toHaveBeenCalledWith('users',null,expect.objectContaining({roleIds:[2]}));
  });
  it('blocks creation if the final selected role is removed', () => {
    const { component, api } = setup(); component.openNew();
    component.form.patchValue({ firstName:'Ana', firstSurname:'Torres', email:'ana@example.com', areaId:'1', userType:'1', password:'test-value' });
    component.toggle(2,true); component.toggle(2,false); component.save();
    expect(api.save).not.toHaveBeenCalled();
    expect(component.formError()).toContain('at least one role');
  });
  it('does not send password or role changes when editing the profile', () => {
    const { component, api } = setup();
    component.openUser(user, 'edit');
    component.save();
    const body = api.save.mock.calls[0] as unknown as [string, number, object];
    expect(body[2]).not.toHaveProperty('password');
    expect(body[2]).not.toHaveProperty('roleIds');
    expect(api.roles).not.toHaveBeenCalled();
  });
  it('uses separate role replacement endpoint and allows removing every role', () => {
    const { component, api } = setup();
    component.openUser(user, 'roles');
    component.toggle(2, false);
    component.save();
    expect(api.roles).toHaveBeenCalledWith(3, []);
    expect(api.save).not.toHaveBeenCalled();
  });
  it('blocks a second submission while the first request is pending', () => {
    const { component, api } = setup();
    const pending = new Subject<{}>();
    api.roles.mockReturnValue(pending);
    component.openUser(user, 'roles');
    component.save();
    component.save();
    expect(api.roles).toHaveBeenCalledTimes(1);
  });
  it('never deactivates until the confirmation is accepted', () => {
    const { component, api } = setup();
    component.confirmDelete(3, 'Ana');
    expect(api.deactivate).not.toHaveBeenCalled();
    component.deactivate();
    expect(api.deactivate).toHaveBeenCalledWith('users', 3);
  });
  it('keeps the form open and shows a useful conflict message', () => {
    const { component, api } = setup();
    api.roles.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 409, error: { message: 'Conflicto' } })),
    );
    component.openUser(user, 'roles');
    component.save();
    expect(component.formError()).toBe('Conflicto');
    expect(component.editor.nativeElement.close).not.toHaveBeenCalled();
  });
  it('cannot save role grants when loading the permission catalog fails', () => {
    const { component, api } = setup();
    component.switchSection('roles');
    api.catalogs.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 500 })));
    component.open({ id: 5, name: 'Admin', permissionIds: [4] });
    component.save();
    expect(api.save).not.toHaveBeenCalled();
  });
});
