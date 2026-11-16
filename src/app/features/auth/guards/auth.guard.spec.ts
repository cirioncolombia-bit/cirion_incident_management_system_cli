import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree, provideRouter } from '@angular/router';
import { Observable, firstValueFrom, of, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { authGuard } from './auth.guard';

describe('Module route permissions', () => {
  async function access(permission: string, permissions: string[], valid = true, fail = false, internalOnly = false, isExternal = false) {
    TestBed.configureTestingModule({providers:[provideRouter([]),{provide:AuthService,useValue:{
      isSessionValid:()=>valid,clearSession:()=>{},
      loadCurrentUser:()=>fail ? throwError(()=>new Error('Unavailable')) : of({permissions,isExternal}),
    }}]});
    const result = TestBed.runInInjectionContext(()=>authGuard({data:{permission,internalOnly}} as unknown as ActivatedRouteSnapshot, {} as RouterStateSnapshot));
    const value = result instanceof Observable ? await firstValueFrom(result) : result;
    return value instanceof UrlTree ? TestBed.inject(Router).serializeUrl(value) : value;
  }
  it('permits a Viewer to open the read route', async()=>expect(await access('deliveries.read',['deliveries.read'])).toBe(true));
  it('rejects a Viewer opening a create or edit URL directly', async()=>expect(await access('deliveries.write',['deliveries.read'])).toBe('/profile'));
  it('permits Admin grants even when combined with Viewer grants', async()=>expect(await access('deliveries.write',['deliveries.read','deliveries.write'])).toBe(true));
  it('does not grant Delivery editing from another module Admin', async()=>expect(await access('deliveries.write',['assignments.read','assignments.write'])).toBe('/profile'));
  it('returns to login if permissions cannot be loaded', async()=>expect(await access('deliveries.write',[],true,true)).toBe('/login'));
  it('rejects an expired session', async()=>expect(await access('deliveries.read',['deliveries.read'],false)).toBe('/login'));
  it('blocks external users from global indicator pages even with dashboard permissions', async()=>expect(await access('dashboard.read',['dashboard.read'],true,false,true,true)).toBe('/profile'));

});
