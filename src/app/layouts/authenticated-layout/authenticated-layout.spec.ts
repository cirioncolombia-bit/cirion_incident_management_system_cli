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
  it('does not expose global user administration to external accounts',()=>{
    expect(setup(['users.manage','catalogs.manage','deliveries.read'],true).links()).toEqual(['/delivery']);
  });
  it('keeps module links hidden until account permissions load',()=>{
    const {links,user,fixture}=setup([],false,true);expect(links()).toEqual([]);
    user.set({fullName:'Ana',firstName:'Ana',email:'ana@example.com',roles:[],permissions:['dashboard.read']} as unknown as CurrentUser);
    fixture.detectChanges();expect(links()).toEqual(['/dashboard']);
  });
  it('keeps Profile and Logout available without module permissions',()=>{
    const {fixture,links}=setup([]);expect(links()).toEqual([]);
    expect(fixture.nativeElement.querySelector('a[href="/profile"]')).not.toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Logout');
  });
});
