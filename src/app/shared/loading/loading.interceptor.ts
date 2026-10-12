import { inject } from '@angular/core';
import { HttpInterceptorFn } from '@angular/common/http';
import { defer, finalize } from 'rxjs';
import { environment } from '../../../environments/environment';
import { LoadingService } from './loading.service';

export const loadingInterceptor: HttpInterceptorFn = (request, next) => {
  const loading = inject(LoadingService);
  const apiRoot = `${environment.apiUrl.replace(/\/$/, '')}/api/`;
  if (!request.url.startsWith(apiRoot)) return next(request);
  return defer(() => {
    const finish = loading.begin();
    return defer(() => next(request)).pipe(finalize(finish));
  });
};
