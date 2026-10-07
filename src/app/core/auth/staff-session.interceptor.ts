import {
  HttpErrorResponse,
  HttpInterceptorFn
} from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import {
  catchError,
  throwError
} from 'rxjs';
import { AuthService } from './auth.service';

let redirectingToLogin = false;

export const staffSessionInterceptor: HttpInterceptorFn = (
  request,
  next
) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return next(request).pipe(
    catchError((error: unknown) => {
      if (
        error instanceof HttpErrorResponse &&
        error.status === 401 &&
        shouldHandleStaffSessionExpiration(
          request.url,
          authService
        )
      ) {
        authService.clearLocalSession();

        if (!redirectingToLogin) {
          redirectingToLogin = true;

          const currentUrl = router.url;
          const returnUrl =
            currentUrl &&
            !currentUrl.startsWith('/login')
              ? currentUrl
              : undefined;

          void router.navigate(
            ['/login'],
            {
              queryParams: returnUrl
                ? {
                    returnUrl
                  }
                : undefined,
              replaceUrl: true
            }
          ).finally(() => {
            redirectingToLogin = false;
          });
        }
      }

      return throwError(() => error);
    })
  );
};

function shouldHandleStaffSessionExpiration(
  requestUrl: string,
  authService: AuthService
): boolean {
  if (requestUrl.includes('/api/v1/auth/me')) {
    return true;
  }

  if (!authService.authenticated()) {
    return false;
  }

  return !isGuardianPortalRequest(requestUrl);
}

function isGuardianPortalRequest(
  requestUrl: string
): boolean {
  return requestUrl.includes('/api/v1/guardian-auth/')
    || requestUrl.includes('/api/v1/guardian/')
    || requestUrl.includes(
      '/api/v1/guardian-device-enrollments/complete'
    )
    || requestUrl.includes(
      '/api/v1/guardian-device-enrollments/status'
    )
    || requestUrl.includes(
      '/api/v1/guardian-registration/'
    );
}
