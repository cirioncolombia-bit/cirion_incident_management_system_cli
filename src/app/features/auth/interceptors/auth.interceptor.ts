import { inject } from '@angular/core';
import { HttpInterceptorFn } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const auth = inject(AuthService);
  const apiRoot = `${environment.apiUrl.replace(/\/$/, '')}/api/`;
  const token = auth.getAccessToken();

  if (token && request.url.startsWith(apiRoot) && request.url !== `${apiRoot}Auth/login`) {
    request = request.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
  }

  return next(request);
};
