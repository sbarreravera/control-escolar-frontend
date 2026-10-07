import { inject } from '@angular/core';
import {
  CanActivateFn,
  Router
} from '@angular/router';
import { AuthService } from './auth.service';

export const moduleGuard: CanActivateFn = (
  route,
  state
) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const currentUser = authService.currentUser();

  if (!currentUser) {
    return router.createUrlTree(
      ['/login'],
      {
        queryParams: {
          returnUrl: state.url
        }
      }
    );
  }

  const moduleKey =
    route.data['moduleKey'] as string | undefined;

  if (!moduleKey) {
    return true;
  }

  if (
    currentUser.role === 'SUPER_ADMIN' &&
    currentUser.schoolId === null
  ) {
    return moduleKey === 'DASHBOARD'
      ? true
      : router.createUrlTree(['/schools']);
  }

  if (
    currentUser.role === 'ADMIN' ||
    currentUser.role === 'SUPER_ADMIN' ||
    authService.hasModule(moduleKey)
  ) {
    return true;
  }

  return router.createUrlTree([
    authService.defaultRoute()
  ]);
};
