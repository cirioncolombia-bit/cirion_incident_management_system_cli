import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { EMPTY } from 'rxjs';
import { AuthService } from '../../features/auth/services/auth.service';
import { CurrentUser } from '../../features/auth/models/current-user';
import { AuthenticatedLayout } from './authenticated-layout';

describe('Navigation by effective permissions', () => {
  function setup(permissions: string[], external = false, pending = false) {
    const user = signal<CurrentUser | null>(pending ? null : {
      fullName:'Ana Torres',firstName:'Ana',firstSurname:'Torres',email:'ana@example.com',
      isExternal:external,roles:[],permissions,
    } as unknown as CurrentUser);
    TestBed.configureTestingModule({imports:[AuthenticatedLayout],providers:[provideRouter([]),
      {provide:AuthService,useValue:{currentUser:user,loadCurrentUser:()=>EMPTY,clearSession:()=>{}}},
    ]});
    const fixture=TestBed.createComponent(AuthenticatedLayout);fixture.detectChanges();
    const links=()=>[...fixture.nativeElement.querySelectorAll('nav a')].map((a:any)=>a.getAttribute('href'));
    return {fixture,user,links};
  }
  it('shows only the module a Viewer can read',()=>{
    const {links}=setup(['assignments.read']);expect(links()).toEqual(['/assignments']);
  });
  it('combines module permissions without granting unrelated menus',()=>{
    const {links}=setup(['assignments.read','assignments.write','incidents.read']);
    expect(links()).toEqual(['/incidents','/assignments']);
  });
  it('shows every module to an administrator with the corresponding grants',()=>{
    const {links}=setup(['dashboard.read','incidents.read','assignments.read','deliveries.read','users.manage']);
    expect(links()).toEqual(['/dashboard','/incidents','/assignments','/delivery','/users']);
  });
  it('allows internal catalog managers to access the Users module',()=>{
    expect(setup(['catalogs.manage']).links()).toEqual(['/users']);
  });
  it('shows Network inside Admin for internal catalog readers', () => {
    const { fixture, links } = setup(['catalogs.read']);
    expect(links()).toEqual(['/admin/network']);
    expect(fixture.nativeElement.querySelector('#admin-submenu a[href="/admin/network"]')).not.toBeNull();
  });
  it('shows Network and Users when both permissions are available', () => {
    expect(setup(['catalogs.read', 'catalogs.manage']).links()).toEqual(['/users', '/admin/network']);
  });
  it('hides Network from external accounts even with catalog permissions', () => {
    expect(setup(['catalogs.read', 'catalogs.manage'], true).links()).toEqual([]);
  });
  it('does not expose global user administration to external accounts',()=>{
    expect(setup(['users.manage','catalogs.manage','deliveries.read'],true).links()).toEqual(['/delivery']);
  });
  it('keeps module links hidden until account permissions load',()=>{
    const {links,user,fixture}=setup([],false,true);expect(links()).toEqual([]);
    user.set({fullName:'Ana',firstName:'Ana',email:'ana@example.com',roles:[],permissions:['dashboard.read']} as unknown as CurrentUser);
    fixture.detectChanges();expect(links()).toEqual(['/dashboard']);
  });
  it('groups Users inside Admin and supports opening and closing the submenu',()=>{
    const {fixture}=setup(['users.manage']);
    const admin=fixture.nativeElement.querySelector('button[aria-controls="admin-submenu"]') as HTMLButtonElement;
    const submenu=fixture.nativeElement.querySelector('#admin-submenu') as HTMLElement;
    expect(submenu.querySelector('a[href="/users"]')).not.toBeNull();
    expect(admin.getAttribute('aria-expanded')).toBe('true');admin.click();fixture.detectChanges();
    expect(submenu.hidden).toBe(true);admin.click();fixture.detectChanges();expect(submenu.hidden).toBe(false);
  });
  it('hides the complete Admin section when Users is unavailable',()=>{
    const {fixture}=setup(['deliveries.read']);expect(fixture.nativeElement.querySelector('.app-sidebar__admin')).toBeNull();
  });
  it('expands the sidebar when opening Admin from collapsed mode',()=>{
    const {fixture}=setup(['users.manage']);const component=fixture.componentInstance;
    component.sidebarCollapsed.set(true);component.adminOpen.set(false);component.toggleAdmin();
    expect(component.sidebarCollapsed()).toBe(false);expect(component.adminOpen()).toBe(true);
  });
  it('keeps Profile and Logout available without module permissions',()=>{
    const {fixture,links}=setup([]);expect(links()).toEqual([]);
    expect(fixture.nativeElement.querySelector('a[href="/profile"]')).not.toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Logout');
  });
});
