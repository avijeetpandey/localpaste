import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

import { AuthStore } from '../services/auth.store';
import { ToastService } from '../services/toast.service';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const store = inject(AuthStore);
  const router = inject(Router);
  const toast = inject(ToastService);

  return next(req).pipe(
    catchError((err: HttpErrorResponse) => {
      const isAuthEndpoint = req.url.includes('/auth/login') || req.url.includes('/auth/register');
      if (err.status === 401 && !isAuthEndpoint) {
        store.clear();
        router.navigate(['/auth']);
        toast.error('Your session has ended. Please sign in again.');
      } else if (err.status === 0) {
        toast.error('Cannot reach server. Check your connection.');
      } else if (err.status >= 500) {
        toast.error('Something went wrong on the server.');
      } else if (err.status === 429) {
        toast.error('Too many requests. Please wait a moment.');
      }
      return throwError(() => err);
    }),
  );
};
