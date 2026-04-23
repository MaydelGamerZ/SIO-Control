import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = async (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  await auth.waitUntilReady();
  return auth.user() ? true : router.createUrlTree(['/login'], { queryParams: { redirect: state.url } });
};
