import {
  HttpErrorResponse,
  HttpInterceptorFn,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

import { AuthService } from './auth.service';

/**
 * Adds `Authorization: Bearer <token>` to every outgoing request and, on a 401
 * for a non-login request, clears the session and returns to /login.
 */
export const tokenInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  const token = auth.getToken();
  const authorizedRequest = token
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(authorizedRequest).pipe(
    catchError((error: unknown) => {
      const isLogin = req.url.includes('/auth/login');
      if (error instanceof HttpErrorResponse && error.status === 401 && !isLogin) {
        auth.logout();
        void router.navigateByUrl('/login');
      }
      return throwError(() => error);
    })
  );
};
