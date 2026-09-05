import { inject } from '@angular/core';
import {
  CanActivateChildFn,
  Router
} from '@angular/router';
import {
  ScanModeService
} from './scan-mode.service';

export const scanModeGuard: CanActivateChildFn = (
  _route,
  state
) => {
  const scanModeService = inject(ScanModeService);
  const router = inject(Router);

  if (!scanModeService.active()) {
    return true;
  }

  if (state.url.startsWith('/access-scanner')) {
    return true;
  }

  return router.createUrlTree(['/access-scanner']);
};