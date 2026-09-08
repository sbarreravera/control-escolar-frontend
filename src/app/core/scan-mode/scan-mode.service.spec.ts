import { TestBed } from '@angular/core/testing';
import {
  ScanModeService
} from './scan-mode.service';

describe('ScanModeService', () => {

  const storageKey =
    'control-escolar.secure-scan-mode';

  let service: ScanModeService;

  beforeEach(() => {
    window.localStorage.clear();

    TestBed.configureTestingModule({});

    service = TestBed.inject(ScanModeService);
  });

  afterEach(() => {
    window.localStorage.clear();
  });

  it('should start inactive', () => {
    expect(service.active()).toBe(false);
    expect(service.configuration()).toBeNull();
  });

  it('should activate and persist scan mode', () => {
    service.activate('ENTRY', 'USB');

    expect(service.active()).toBe(true);
    expect(
        service.configuration()?.eventType
    ).toBe('ENTRY');

    expect(
        service.configuration()?.captureMethod
    ).toBe('USB');

    const storedValue =
      window.localStorage.getItem(storageKey);

    expect(storedValue).not.toBeNull();
  });

  it('should restore a persisted configuration', () => {
    window.localStorage.setItem(
      storageKey,
      JSON.stringify({
        eventType: 'EXIT',
        captureMethod: 'CAMERA',
        activatedAt: '2026-09-05T00:00:00.000Z'
      })
    );

    const restoredService = new ScanModeService();

    expect(restoredService.active()).toBe(true);
    expect(restoredService.configuration()).toEqual({
      eventType: 'EXIT',
      captureMethod: 'CAMERA',
      activatedAt: '2026-09-05T00:00:00.000Z'
    });
  });

  it('should deactivate and remove persisted state', () => {
    service.activate('ENTRY', 'CAMERA');
    service.deactivate();

    expect(service.active()).toBe(false);
    expect(service.configuration()).toBeNull();
    expect(
      window.localStorage.getItem(storageKey)
    ).toBeNull();
  });

  it('should discard an invalid stored configuration', () => {
    window.localStorage.setItem(
      storageKey,
      JSON.stringify({
        eventType: 'INVALID',
        captureMethod: 'USB'
      })
    );

    const restoredService = new ScanModeService();

    expect(restoredService.active()).toBe(false);
    expect(restoredService.configuration()).toBeNull();
    expect(
      window.localStorage.getItem(storageKey)
    ).toBeNull();
  });
});