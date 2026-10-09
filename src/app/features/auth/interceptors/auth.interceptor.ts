import { catchError, throwError } from 'rxjs';
import { inject } from '@angular/core';
import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const auth = inject(AuthService);
  const apiRoot = `${environment.apiUrl.replace(/\/$/, '')}/api/`;
  const token = auth.getAccessToken();

  const protectedRequest = request.url.startsWith(apiRoot) && request.url !== `${apiRoot}Auth/login`;

  if (token && protectedRequest) {
    request = request.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
  }

  return next(request).pipe(
    catchError((error: unknown) => {
      if (protectedRequest && token && error instanceof HttpErrorResponse && error.status === 401
          && auth.getAccessToken() === token) {
        auth.expireSession();
      }
      return throwError(() => error);
    }),
  );
};
