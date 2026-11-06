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

  const serialMode =
    scanModeService.configuration()?.captureMethod === 'SERIAL';

  const allowedPath = serialMode
    ? '/access-scanner/multi'
    : '/access-scanner';

  if (state.url.split('?')[0] === allowedPath) {
    return true;
  }

  return router.createUrlTree([allowedPath]);
};