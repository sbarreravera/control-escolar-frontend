import { inject } from '@angular/core';
import {
  CanActivateFn,
  Router
} from '@angular/router';
import {
  catchError,
  map,
  of
} from 'rxjs';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = (
  _route,
  state
) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.authenticated()) {
    return true;
  }

  return authService.loadCurrentUser().pipe(
    map(() => true),
    catchError(() => {
      authService.clearLocalSession();

      return of(
        router.createUrlTree(
          ['/login'],
          {
            queryParams: {
              returnUrl: state.url
            }
          }
        )
      );
    })
  );
};