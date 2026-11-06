import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { signal } from '@angular/core';
import { of } from 'rxjs';
import { vi } from 'vitest';

import { AuthService } from '../../../core/auth/auth.service';
import { ScanModeService } from '../../../core/scan-mode/scan-mode.service';
import { AccessEvent, AccessEventType } from '../access-event.models';
import { AccessEventService } from '../access-event.service';
import { MultiSerialReadersService } from './multi-serial-readers.service';
import { MultiSerialScannerComponent } from './multi-serial-scanner.component';

describe('MultiSerialScannerComponent', () => {
  let fixture: ComponentFixture<MultiSerialScannerComponent>;
  let component: MultiSerialScannerComponent;
  let scanMode: ScanModeService;

  const callbacks = new Map<number, (token: string, id: number) => void>();
  const readerState = signal<Array<{
    id: number;
    name: string;
    eventType: AccessEventType;
    status: 'connected' | 'disconnected';
  }>>([]);
  const serialMock = {
    supported: true,
    readers: readerState.asReadonly(),
    connect: vi.fn(),
    disconnect: vi.fn(async () => {}),
    disconnectAll: vi.fn(async () => readerState.set([]))
  };
  const scan = vi.fn();
  const login = vi.fn();
  const currentUser = () => ({
    id: 7, schoolId: 44, schoolName: 'Secundaria 44',
    fullName: 'Operador prueba', email: 'operador@example.test',
    role: 'OPERATOR', moduleKeys: ['ACCESS_SCANNER']
  });
  const event: AccessEvent = {
    id: 2, studentId: 11, studentName: 'Alumno Demo',
    enrollmentNumber: '261A01', credentialId: 1,
    eventType: 'ENTRY', captureMethod: 'QR_USB',
    occurredAt: '2026-11-06T08:00:00-06:00',
    deviceName: 'Entrada principal', notes: null, recordedByUserId: 7,
    recordedByUserName: 'Operador', notificationsQueued: 1
  };

  beforeEach(async () => {
    window.localStorage.clear();
    callbacks.clear();
    readerState.set([]);
    serialMock.connect.mockReset();
    serialMock.disconnectAll.mockClear();
    scan.mockReset();
    login.mockReset();
    scan.mockReturnValue(of(event));
    login.mockReturnValue(of(currentUser()));

    serialMock.connect.mockImplementation(
      async (
        name: string,
        eventType: AccessEventType,
        onRead: (token: string, id: number) => void
      ) => {
        const id = readerState().length + 1;
        callbacks.set(id, onRead);
        readerState.update(current => [
          ...current,
          { id, name, eventType, status: 'connected' }
        ]);
        return id;
      }
    );

    await TestBed.configureTestingModule({
      imports: [MultiSerialScannerComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: { currentUser, login } },
        { provide: MultiSerialReadersService, useValue: serialMock },
        { provide: AccessEventService, useValue: { scan } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(MultiSerialScannerComponent);
    component = fixture.componentInstance;
    scanMode = TestBed.inject(ScanModeService);
    fixture.detectChanges();
  });

  afterEach(() => {
    window.localStorage.clear();
  });

  it('connects two readers with independent entry/exit roles', async () => {
    component.readerForm.controls.name.setValue('Entrada principal');
    await component.addReader();

    component.readerForm.controls.name.setValue('Salida principal');
    component.readerForm.controls.eventType.setValue('EXIT');
    await component.addReader();

    expect(component.connectedCount()).toBe(2);
    expect(scan).not.toHaveBeenCalled();

    component.start();
    expect(scanMode.configuration()?.captureMethod).toBe('SERIAL');

    callbacks.get(1)?.('QR_ENTRY', 1);
    callbacks.get(2)?.('QR_EXIT', 2);

    await new Promise(resolve => setTimeout(resolve, 0));
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(scan).toHaveBeenCalledTimes(2);
    expect(scan.mock.calls[0][0]).toEqual({
      qrToken: 'QR_ENTRY',
      eventType: 'ENTRY',
      captureMethod: 'QR_USB',
      deviceName: 'Entrada principal',
      notes: null
    });
    expect(scan.mock.calls[1][0]).toEqual({
      qrToken: 'QR_EXIT',
      eventType: 'EXIT',
      captureMethod: 'QR_USB',
      deviceName: 'Salida principal',
      notes: null
    });
  });

  it('requires password to stop a locked session', async () => {
    component.readerForm.controls.name.setValue('Puerta 1');
    await component.addReader();
    component.start();

    expect(scanMode.active()).toBe(true);
    component.requestUnlock();
    component.password.setValue('password-demo');

    await component.unlock();

    expect(login).toHaveBeenCalledWith('operador@example.test', 'password-demo');
    expect(serialMock.disconnectAll).toHaveBeenCalled();
    expect(scanMode.active()).toBe(false);
  });
});
