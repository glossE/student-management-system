import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

// Wraps every HTTP call: ensures the auth cookie travels with the request, and
// if any response comes back 401, clears the session and sends the user to login.
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const auth = inject(AuthService);

  const authReq = req.clone({ withCredentials: true });

  return next(authReq).pipe(
    catchError((err: HttpErrorResponse) => {
      // Skip the /api/auth/* calls — their own callers handle those failures.
      if (err.status === 401 && !req.url.includes('/api/auth/')) {
        auth.clear();
        router.navigate(['/login']);
      }
      return throwError(() => err);
    }),
  );
};
