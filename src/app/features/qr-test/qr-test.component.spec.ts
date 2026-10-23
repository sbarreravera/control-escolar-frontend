import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthService } from '../../core/auth/auth.service';
import { QrTestComponent } from './qr-test.component';
import { QrTestResponse, QrTestService } from './qr-test.service';

describe('QrTestComponent', () => {
  let fixture: ComponentFixture<QrTestComponent>;
  let component: QrTestComponent;
  const service = { validate: vi.fn() };
  const auth = {
    currentUser: vi.fn(() => ({
      schoolId: 44,
      schoolName: 'Técnica 44',
      role: 'ADMIN'
    }))
  };
  const valid: QrTestResponse = {
    valid: true,
    status: 'VALID',
    studentId: 1,
    studentName: 'Alumno Demo',
    enrollmentNumber: '261B01',
    schoolName: 'Técnica 44',
    gradeName: '1',
    groupName: 'B',
    credentialExpiresAt: null
  };

  beforeEach(async () => {
    service.validate.mockReset();
    await TestBed.configureTestingModule({
      imports: [QrTestComponent],
      providers: [
        { provide: QrTestService, useValue: service },
        { provide: AuthService, useValue: auth }
      ]
    }).compileComponents();
    fixture = TestBed.createComponent(QrTestComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('verifies a USB scan without creating any access event', () => {
    service.validate.mockReturnValue(of(valid));
    component.qrTokenControl.setValue('abc-123');
    component.submitUsbToken();

    expect(service.validate).toHaveBeenCalledWith('abc-123', 44);
    expect(component.result()?.enrollmentNumber).toBe('261B01');
    expect(component.processing()).toBe(false);
  });

  it('shows a safe error for an unknown token', () => {
    service.validate.mockReturnValue(throwError(
      () => new HttpErrorResponse({ status: 404 })
    ));
    component.qrTokenControl.setValue('unknown');
    component.submitUsbToken();
    expect(component.result()).toBeNull();
    expect(component.errorMessage()).toContain('No existe');
  });

  it('identifies inactive credentials', () => {
    service.validate.mockReturnValue(of({
      ...valid,
      valid: false,
      status: 'INACTIVE_CREDENTIAL'
    }));
    component.qrTokenControl.setValue('old-code');
    component.submitUsbToken();
    expect(component.result()?.valid).toBe(false);
    expect(component.statusLabel('INACTIVE_CREDENTIAL'))
      .toBe('Credencial desactivada');
  });
});
