import { inject } from '@angular/core';
import { CanActivateChildFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateChildFn = (route) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.isSessionValid()) {
    const permission = route.data['permission'] as string | undefined;
    if (!permission) return true;
    return auth.loadCurrentUser().pipe(
      map(user => user.permissions.includes(permission) ? true : router.createUrlTree(['/profile'])),
      catchError(() => of(router.createUrlTree(['/login']))),
    );
  }
  auth.clearSession();
  return router.createUrlTree(['/login']);
};
