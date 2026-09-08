import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  provideRouter,
  Router,
  RouterStateSnapshot,
  UrlTree
} from '@angular/router';
import {
  scanModeGuard
} from './scan-mode.guard';
import {
  ScanModeService
} from './scan-mode.service';

describe('scanModeGuard', () => {

  let router: Router;
  let scanModeService: ScanModeService;

  beforeEach(() => {
    window.localStorage.clear();

    TestBed.configureTestingModule({
      providers: [
        provideRouter([])
      ]
    });

    router = TestBed.inject(Router);
    scanModeService = TestBed.inject(ScanModeService);
  });

  afterEach(() => {
    window.localStorage.clear();
  });

  it('should allow navigation when scan mode is inactive', () => {
    const result = executeGuard('/students');

    expect(result).toBe(true);
  });

  it('should allow access to scanner when mode is active', () => {
    scanModeService.activate('ENTRY', 'USB');

    const result = executeGuard('/access-scanner');

    expect(result).toBe(true);
  });

  it('should redirect other routes while mode is active', () => {
    scanModeService.activate('EXIT', 'CAMERA');

    const result = executeGuard('/students');

    expect(result).toBeInstanceOf(UrlTree);
    expect(
      router.serializeUrl(result as UrlTree)
    ).toBe('/access-scanner');
  });

  function executeGuard(url: string) {
    return TestBed.runInInjectionContext(
      () => scanModeGuard(
        {} as ActivatedRouteSnapshot,
        {
          url
        } as RouterStateSnapshot
      )
    );
  }
});