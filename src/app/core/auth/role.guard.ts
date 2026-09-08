import { inject } from '@angular/core';
import {
  CanActivateFn,
  Router
} from '@angular/router';
import { AppUserRole } from './auth.models';
import { AuthService } from './auth.service';

export const roleGuard: CanActivateFn = (
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

  const allowedRoles =
    route.data['roles'] as AppUserRole[] | undefined;

  if (
    allowedRoles &&
    !allowedRoles.includes(currentUser.role)
  ) {
    return router.createUrlTree(['/dashboard']);
  }

  return true;
};