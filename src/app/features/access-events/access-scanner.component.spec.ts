import { HttpErrorResponse } from '@angular/common/http';
import {
  ComponentFixture,
  TestBed
} from '@angular/core/testing';
import {
  of,
  throwError
} from 'rxjs';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi
} from 'vitest';

import {
  AuthenticatedUser
} from '../../core/auth/auth.models';
import {
  AuthService
} from '../../core/auth/auth.service';
import {
  AccessEvent
} from './access-event.models';
import {
  AccessEventService
} from './access-event.service';
import {
  AccessScannerComponent
} from './access-scanner.component';

describe('AccessScannerComponent', () => {

  let fixture:
    ComponentFixture<AccessScannerComponent>;

  let component: AccessScannerComponent;

  const authenticatedUser: AuthenticatedUser = {
    id: 1,
    schoolId: 1,
    schoolName: 'Escuela de prueba',
    fullName: 'Administrador de prueba',
    email: 'admin@control-escolar.test',
    role: 'ADMIN'
  };

  const accessEventServiceMock = {
    scan: vi.fn()
  };

  const authServiceMock = {
    currentUser: vi.fn(),
    login: vi.fn()
  };

  const accessEvent: AccessEvent = {
    id: 1,
    studentId: 1,
    studentName: 'Alumno De Prueba',
    enrollmentNumber: 'PRUEBA-2026-001',
    credentialId: 1,
    eventType: 'ENTRY',
    captureMethod: 'QR_USB',
    occurredAt: '2026-09-05T08:00:00',
    deviceName: 'Recepción web',
    notes: null,
    notificationsQueued: 1
  };

  beforeEach(async () => {
    window.localStorage.clear();

    accessEventServiceMock.scan.mockReset();
    authServiceMock.currentUser.mockReset();
    authServiceMock.login.mockReset();

    authServiceMock.currentUser.mockReturnValue(
      authenticatedUser
    );

    authServiceMock.login.mockReturnValue(
      of(authenticatedUser)
    );

    await TestBed.configureTestingModule({
      imports: [
        AccessScannerComponent
      ],
      providers: [
        {
          provide: AccessEventService,
          useValue: accessEventServiceMock
        },
        {
          provide: AuthService,
          useValue: authServiceMock
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(
      AccessScannerComponent
    );

    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    window.localStorage.clear();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should use entry and USB as defaults', () => {
    expect(
      component.scanForm.controls.eventType.value
    ).toBe('ENTRY');

    expect(
      component.scanForm.controls.deviceName.value
    ).toBe('Recepción web');

    expect(
      component.activeCaptureMethod()
    ).toBe('QR_USB');
  });

  it('should register an access event from USB', () => {
    accessEventServiceMock.scan.mockReturnValue(
      of(accessEvent)
    );

    component.usbForm.controls.qrToken.setValue(
      'secure-test-token'
    );

    component.submitUsbToken();

    expect(
      accessEventServiceMock.scan
    ).toHaveBeenCalledTimes(1);

    expect(
      accessEventServiceMock.scan
    ).toHaveBeenCalledWith({
      qrToken: 'secure-test-token',
      eventType: 'ENTRY',
      captureMethod: 'QR_USB',
      deviceName: 'Recepción web',
      notes: null
    });

    expect(component.lastEvent()).toEqual(
      accessEvent
    );

    expect(component.recentEvents()).toEqual([
      accessEvent
    ]);

    expect(component.successMessage()).toContain(
      'entrada registrada correctamente'
    );

    expect(
      component.usbForm.controls.qrToken.value
    ).toBe('');
  });

  it('should normalize USB keyboard substitutions', () => {
    accessEventServiceMock.scan.mockReturnValue(
      of(accessEvent)
    );

    component.usbForm.controls.qrToken.setValue(
      'abcdefghijklmnopqrstuvwxyz0123456789ABCDE\'?'
    );

    component.submitUsbToken();

    expect(
      accessEventServiceMock.scan
    ).toHaveBeenCalledWith({
      qrToken:
        'abcdefghijklmnopqrstuvwxyz0123456789ABCDE-_',
      eventType: 'ENTRY',
      captureMethod: 'QR_USB',
      deviceName: 'Recepción web',
      notes: null
    });
  });

  it('should extract one token from repeated USB reads', () => {
    const qrToken =
      'abcdefghijklmnopqrstuvwxyz0123456789ABCDEFG';

    const repeatedAndTruncatedValue =
      qrToken.repeat(3).slice(0, 100);

    accessEventServiceMock.scan.mockReturnValue(
      of(accessEvent)
    );

    component.usbForm.controls.qrToken.setValue(
      repeatedAndTruncatedValue
    );

    component.submitUsbToken();

    expect(
      accessEventServiceMock.scan
    ).toHaveBeenCalledTimes(1);

    expect(
      accessEventServiceMock.scan
    ).toHaveBeenCalledWith({
      qrToken,
      eventType: 'ENTRY',
      captureMethod: 'QR_USB',
      deviceName: 'Recepción web',
      notes: null
    });
  });

  it('should ignore the same movement scanned twice', () => {
    const qrToken =
      'abcdefghijklmnopqrstuvwxyz0123456789ABCDEFG';

    accessEventServiceMock.scan.mockReturnValue(
      of(accessEvent)
    );

    component.usbForm.controls.qrToken.setValue(
      qrToken
    );

    component.submitUsbToken();

    component.usbForm.controls.qrToken.setValue(
      qrToken
    );

    component.submitUsbToken();

    expect(
      accessEventServiceMock.scan
    ).toHaveBeenCalledTimes(1);

    expect(component.successMessage()).toContain(
      'Lectura repetida ignorada'
    );
  });

  it('should ignore an empty Enter from the USB reader', () => {
    accessEventServiceMock.scan.mockReturnValue(
      of(accessEvent)
    );

    component.usbForm.controls.qrToken.setValue(
      'secure-test-token'
    );

    component.submitUsbToken();

    const successfulMessage =
      component.successMessage();

    component.usbForm.controls.qrToken.setValue('');

    component.submitUsbToken();

    expect(
      accessEventServiceMock.scan
    ).toHaveBeenCalledTimes(1);

    expect(
      component.successMessage()
    ).toBe(successfulMessage);

    expect(component.errorMessage()).toBeNull();
  });

  it('should activate and persist secure mode', () => {
    component.activateSecureMode();

    expect(
      component.secureModeActive()
    ).toBe(true);

    expect(
      window.localStorage.getItem(
        'control-escolar.secure-scan-mode'
      )
    ).not.toBeNull();
  });

  it('should unlock secure mode with valid password', () => {
    component.activateSecureMode();
    component.requestUnlock();

    component.unlockForm.controls.password.setValue(
      'valid-test-password'
    );

    component.unlockSecureMode();

    expect(
      authServiceMock.login
    ).toHaveBeenCalledWith(
      authenticatedUser.email,
      'valid-test-password'
    );

    expect(
      component.secureModeActive()
    ).toBe(false);

    expect(
      component.unlockRequested()
    ).toBe(false);
  });

  it('should remain locked with invalid password', () => {
    authServiceMock.login.mockReturnValue(
      throwError(
        () => new HttpErrorResponse({
          status: 401
        })
      )
    );

    component.activateSecureMode();
    component.requestUnlock();

    component.unlockForm.controls.password.setValue(
      'invalid-test-password'
    );

    component.unlockSecureMode();

    expect(
      component.secureModeActive()
    ).toBe(true);

    expect(
      component.unlockRequested()
    ).toBe(true);

    expect(
      component.unlockErrorMessage()
    ).toBe(
      'La contraseña es incorrecta.'
    );
  });
});