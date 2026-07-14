import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';

// Only a PRINCIPAL may open the route; anyone else is bounced to the home page.
// (The backend enforces this too — this guard just keeps the UI honest.)
export const principalGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  return auth.ensureLoaded().pipe(
    map((user) => (user?.role === 'PRINCIPAL' ? true : router.createUrlTree(['/']))),
  );
};
