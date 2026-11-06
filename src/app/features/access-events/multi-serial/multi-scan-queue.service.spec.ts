import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { Observable, of, Subject, throwError } from 'rxjs';
import { vi } from 'vitest';
import { AccessEvent, ScanAccessEventRequest } from '../access-event.models';
import { AccessEventService } from '../access-event.service';
import { MultiScanQueueService } from './multi-scan-queue.service';

describe('MultiScanQueueService', () => {
  let queue: MultiScanQueueService;
  const scan = vi.fn<(request: ScanAccessEventRequest) => Observable<AccessEvent>>();

  const recorded: AccessEvent = {
    id: 1,
    studentId: 1,
    studentName: 'Alumno Demo',
    enrollmentNumber: '261001',
    credentialId: 55,
    eventType: 'ENTRY',
    captureMethod: 'QR_USB',
    occurredAt: new Date().toISOString(),
    deviceName: 'Puerta 1',
    notes: null,
    recordedByUserId: 7,
    recordedByUserName: 'Operador',
    notificationsQueued: 1
  };

  beforeEach(() => {
    scan.mockReset();
    TestBed.configureTestingModule({
      providers: [
        MultiScanQueueService,
        { provide: AccessEventService, useValue: { scan } }
      ]
    });
    queue = TestBed.inject(MultiScanQueueService);
  });

  const settle = async () => {
    await new Promise(resolve => setTimeout(resolve, 0));
  };

  it('keeps simultaneous port scans and posts each exactly once in FIFO order', async () => {
    const first = new Subject<AccessEvent>();
    scan.mockImplementationOnce(() => first.asObservable())
      .mockReturnValueOnce(of({ ...recorded, id: 2, eventType: 'EXIT' }));

    queue.enqueue('AAA_123', 'Lector Entrada', 'ENTRY');
    queue.enqueue('BBB_789', 'Lector Salida', 'EXIT');
    expect(queue.pending()).toBe(2);
    expect(scan).toHaveBeenCalledTimes(1);
    expect(scan.mock.calls[0][0]).toEqual({
      qrToken: 'AAA_123',
      eventType: 'ENTRY',
      captureMethod: 'QR_USB',
      deviceName: 'Lector Entrada',
      notes: null
    });

    first.next(recorded);
    first.complete();
    await settle();
    await settle();

    expect(scan).toHaveBeenCalledTimes(2);
    expect(scan.mock.calls[1][0]).toEqual({
      qrToken: 'BBB_789',
      eventType: 'EXIT',
      captureMethod: 'QR_USB',
      deviceName: 'Lector Salida',
      notes: null
    });
    expect(queue.pending()).toBe(0);
    expect(queue.results().filter(result => result.status === 'registered'))
      .toHaveLength(2);
  });

  it('rejects duplicate pending and recently registered movements, not opposite types', async () => {
    const first = new Subject<AccessEvent>();
    scan.mockImplementationOnce(() => first.asObservable())
      .mockReturnValue(of(recorded));

    queue.enqueue('QR_123', 'Entrada 1', 'ENTRY');
    queue.enqueue('QR_123', 'Entrada 1', 'ENTRY');
    queue.enqueue('QR_123', 'Salida 2', 'EXIT');

    expect(queue.pending()).toBe(2);
    expect(queue.results().some(row => row.status === 'ignored')).toBe(true);
    first.next(recorded);
    first.complete();
    await settle();
    await settle();

    queue.enqueue('QR_123', 'Entrada 1', 'ENTRY');
    expect(scan).toHaveBeenCalledTimes(2);
    expect(queue.results().filter(row => row.status === 'ignored')).toHaveLength(2);
  });

  it('pauses unsent scans after a connection failure and never retries the failed POST', async () => {
    scan.mockReturnValueOnce(throwError(() => new HttpErrorResponse({ status: 0 })))
      .mockReturnValueOnce(of(recorded));

    queue.enqueue('QR_A', 'Entrada', 'ENTRY');
    queue.enqueue('QR_B', 'Entrada', 'ENTRY');
    await settle();

    expect(queue.paused()).toBe(true);
    expect(queue.pending()).toBe(1);
    expect(scan).toHaveBeenCalledTimes(1);
    expect(queue.results()[0].message).toContain('Verifica');

    queue.resume();
    await settle();

    expect(queue.pending()).toBe(0);
    expect(scan).toHaveBeenCalledTimes(2);
    expect(scan.mock.calls[0][0].qrToken).toBe('QR_A');
    expect(scan.mock.calls[1][0].qrToken).toBe('QR_B');
  });

  it('never sends invalid QR data to the access endpoint', () => {
    queue.enqueue('ABC 123', 'Entrada', 'ENTRY');
    queue.enqueue('a'.repeat(101), 'Entrada', 'ENTRY');
    expect(scan).not.toHaveBeenCalled();
    expect(queue.results().every(row => row.status === 'error')).toBe(true);
  });
});
