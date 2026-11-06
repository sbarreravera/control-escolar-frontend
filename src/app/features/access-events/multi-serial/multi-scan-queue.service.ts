import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import {
  AccessEventType,
  ScanAccessEventRequest
} from '../access-event.models';
import { AccessEventService } from '../access-event.service';

export interface MultiScanResult {
  id: number;
  readerName: string;
  eventType: AccessEventType;
  status: 'registered' | 'error' | 'ignored';
  message: string;
  recordedAt: Date;
  enrollmentNumber?: string;
}

interface QueuedScan {
  qrToken: string;
  readerName: string;
  eventType: AccessEventType;
  key: string;
}

/**
 * One FIFO per screen; all serial ports remain readable while one HTTP
 * request is in flight. Never auto-retries an ambiguous POST.
 */
@Injectable()
export class MultiScanQueueService {
  private readonly items: QueuedScan[] = [];
  private readonly pendingKeys = new Set<string>();
  private readonly recentlyRegistered = new Map<string, number>();
  private resultId = 0;
  private sending = false;

  readonly pending = signal(0);
  readonly processing = signal(false);
  readonly paused = signal(false);
  readonly results = signal<readonly MultiScanResult[]>([]);
  readonly maxQueued = 100;
  private readonly duplicateWindowMs = 5000;

  constructor(private readonly accessEvents: AccessEventService) {}

  enqueue(qrToken: string, readerName: string, eventType: AccessEventType): void {
    const token = qrToken.trim();
    if (!token || token.length > 100 || !/^[A-Za-z0-9_-]+$/.test(token)) {
      this.addResult(readerName, eventType, 'error', 'QR inválido: no se envió al servidor.');
      return;
    }

    const key = eventType + ':' + token;
    const timestamp = this.recentlyRegistered.get(key);
    if (this.pendingKeys.has(key) ||
        (timestamp !== undefined && Date.now() - timestamp < this.duplicateWindowMs)) {
      this.addResult(
        readerName, eventType, 'ignored',
        'Lectura repetida ignorada para evitar registrar dos veces el mismo movimiento.'
      );
      return;
    }

    // Count the in-flight request as pending as well.
    if (this.pending() >= this.maxQueued) {
      this.addResult(
        readerName, eventType, 'error',
        'Cola llena. Esta lectura NO se registró; detén las lecturas y verifica el monitor.'
      );
      return;
    }

    this.items.push({ qrToken: token, readerName, eventType, key });
    this.pendingKeys.add(key);
    this.pending.update(value => value + 1);
    void this.pump();
  }

  resume(): void {
    this.paused.set(false);
    void this.pump();
  }

  /** Explicit operator action, only for unsent requests after a pause. */
  discardPending(): number {
    if (this.sending || !this.paused()) {
      return 0;
    }
    const count = this.items.length;
    for (const item of this.items) {
      this.pendingKeys.delete(item.key);
    }
    this.items.length = 0;
    this.pending.set(0);
    this.paused.set(false);
    if (count > 0) {
      this.addResult(
        'Sistema', 'ENTRY', 'error',
        `${count} lectura(s) pendientes descartadas sin registrar. Revisa el monitor.`
      );
    }
    return count;
  }

  recordReaderError(readerName: string, eventType: AccessEventType, message: string): void {
    this.addResult(readerName, eventType, 'error', message);
  }

  private async pump(): Promise<void> {
    if (this.sending || this.paused() || this.items.length === 0) {
      return;
    }

    this.sending = true;
    this.processing.set(true);
    const item = this.items.shift()!;
    const request: ScanAccessEventRequest = {
      qrToken: item.qrToken,
      eventType: item.eventType,
      captureMethod: 'QR_USB',
      deviceName: item.readerName.slice(0, 100),
      notes: null
    };

    try {
      const event = await firstValueFrom(this.accessEvents.scan(request));
      this.recentlyRegistered.set(item.key, Date.now());
      this.addResult(
        item.readerName,
        item.eventType,
        'registered',
        `${event.studentName}: ${item.eventType === 'ENTRY' ? 'entrada' : 'salida'} registrada. ` +
          `Notificaciones encoladas: ${event.notificationsQueued}.`,
        event.enrollmentNumber
      );
    } catch (cause: unknown) {
      const error = cause instanceof HttpErrorResponse ? cause : null;
      this.addResult(
        item.readerName, item.eventType, 'error',
        this.describeFailure(error)
      );

      // Pause without discarding unsent requests if the backend is unreachable
      // or authentication was rejected. Do NOT automatically repeat the failed
      // POST: the backend might already have committed it.
      if (error && [0, 401, 403].includes(error.status)) {
        this.paused.set(true);
      }
    } finally {
      this.pendingKeys.delete(item.key);
      this.pending.update(value => Math.max(0, value - 1));
      this.sending = false;
      this.processing.set(false);
      if (!this.paused()) {
        void this.pump();
      }
    }
  }

  private describeFailure(error: HttpErrorResponse | null): string {
    switch (error?.status) {
      case 0:
        return 'Sin respuesta del servidor. Verifica el Monitor antes de volver a escanear.';
      case 400:
        return 'Datos o QR inválidos. Movimiento no confirmado.';
      case 401:
        return 'Sesión expirada. Detén el registro y vuelve a autenticarte.';
      case 403:
        return 'No tienes autorización para registrar este movimiento.';
      case 404:
        return 'QR inexistente, inactivo o reemplazado.';
      case 409:
        return 'Credencial vencida o alumno inactivo; registro rechazado.';
      default:
        return 'Registro no confirmado. Comprueba el Monitor antes de repetir el QR.';
    }
  }

  private addResult(
    readerName: string,
    eventType: AccessEventType,
    status: MultiScanResult['status'],
    message: string,
    enrollmentNumber?: string
  ): void {
    const row: MultiScanResult = {
      id: ++this.resultId,
      readerName,
      eventType,
      status,
      message,
      recordedAt: new Date(),
      ...(enrollmentNumber ? { enrollmentNumber } : {})
    };
    this.results.update(previous => [row, ...previous].slice(0, 25));
  }
}
