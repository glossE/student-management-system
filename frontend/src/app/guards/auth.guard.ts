import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';

// Runs before a protected route activates. Asks the server who we are (once),
// then allows the route or redirects to /login.
export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  return auth.ensureLoaded().pipe(
    map((user) => (user ? true : router.createUrlTree(['/login']))),
  );
};
