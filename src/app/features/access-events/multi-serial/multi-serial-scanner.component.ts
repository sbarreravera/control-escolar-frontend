import { CommonModule } from '@angular/common';
import {
  Component,
  computed,
  HostListener,
  inject,
  OnDestroy,
  signal,
} from '@angular/core';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { AuthService } from '../../../core/auth/auth.service';
import { ScanModeService } from '../../../core/scan-mode/scan-mode.service';
import { AccessEventType } from '../access-event.models';
import { MultiScanQueueService } from './multi-scan-queue.service';
import { MultiSerialReadersService } from './multi-serial-readers.service';

@Component({
  selector: 'app-multi-serial-scanner',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  providers: [MultiScanQueueService],
  templateUrl: './multi-serial-scanner.component.html',
  styleUrl: './multi-serial-scanner.component.scss'
})
export class MultiSerialScannerComponent implements OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly mode = inject(ScanModeService);
  private readonly serial = inject(MultiSerialReadersService);
  private readonly router = inject(Router);

  readonly queue = inject(MultiScanQueueService);
  readonly readers = this.serial.readers;
  readonly supported = this.serial.supported;
  readonly sessionActive = computed(
    () => this.mode.configuration()?.captureMethod === 'SERIAL'
  );
  readonly connectedCount = computed(
    () => this.readers().filter(reader => reader.status === 'connected').length
  );

  readonly readerForm = this.fb.nonNullable.group({
    name: ['Lector 1', [Validators.required, Validators.maxLength(100)]],
    eventType: this.fb.nonNullable.control<AccessEventType>('ENTRY')
  });

  readonly connecting = signal(false);
  readonly disconnecting = signal(false);
  readonly finishing = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);

  readonly schoolName = computed(
    () => this.auth.currentUser()?.schoolName ?? 'Escuela seleccionada'
  );

  async addReader(): Promise<void> {
    if (!this.supported || this.sessionActive() ||
        this.readerForm.invalid || this.connecting() ||
        this.readers().length >= 6) {
      this.readerForm.markAllAsTouched();
      return;
    }

    const configuration = this.readerForm.getRawValue();
    const name = configuration.name.trim();
    if (this.readers().some(reader => reader.name.toLowerCase() === name.toLowerCase())) {
      this.errorMessage.set('Cada lector debe tener un nombre diferente.');
      return;
    }

    this.errorMessage.set(null);
    this.successMessage.set(null);
    this.connecting.set(true);

    try {
      await this.serial.connect(
        name,
        configuration.eventType,
        (token, readerId) => this.onScan(token, readerId),
        (reason, readerId) => this.onReaderError(reason, readerId)
      );
      this.readerForm.controls.name.setValue(
        `Lector ${this.readers().length + 1}`
      );
      this.successMessage.set(`${name} conectado. Listo para iniciar la sesión.`);
    } catch (error: unknown) {
      const reason = error instanceof Error ? error.message : '';
      if (error instanceof DOMException && error.name === 'NotFoundError') {
        this.errorMessage.set('No seleccionaste un puerto serial.');
      } else {
        this.errorMessage.set(
          reason || 'No fue posible abrir el puerto. Cierra cualquier otra terminal serial.'
        );
      }
    } finally {
      this.connecting.set(false);
    }
  }

  async removeReader(readerId: number): Promise<void> {
    if (this.sessionActive() || this.disconnecting()) {
      return;
    }
    this.disconnecting.set(true);
    try {
      await this.serial.disconnect(readerId);
    } finally {
      this.disconnecting.set(false);
    }
  }

  start(): void {
    if (!this.supported || this.sessionActive() || this.connectedCount() === 0 ||
        this.connecting() || this.queue.pending() !== 0) {
      this.errorMessage.set('Conecta al menos un lector USB-COM antes de iniciar.');
      return;
    }

    this.errorMessage.set(null);
    this.successMessage.set(null);

    // Existing lock/guard is reused; each port stores its OWN entry/exit role.
    // The legacy eventType property is irrelevant in SERIAL mode.
    this.mode.activate('ENTRY', 'SERIAL');
    if (typeof document !== 'undefined' && document.documentElement.requestFullscreen) {
      void document.documentElement.requestFullscreen().catch(() => undefined);
    }
  }

  /**
   * Finish multilector scanning immediately without a password.
   * Existing CAMERA/USB secure unlock remains unchanged.
   * Pending or in-flight POSTs must finish (or be explicitly discarded)
   * to avoid losing registrations or sending duplicate notifications.
   */
  finishSession(): void {
    if (!this.sessionActive() || this.finishing()) {
      return;
    }

    if (this.queue.pending() > 0 || this.queue.processing()) {
      this.errorMessage.set(
        'Hay lecturas pendientes. Espera a que terminen o resuelve la cola ' +
        'antes de finalizar; ningún registro se descarta automáticamente.'
      );
      return;
    }

    this.finishing.set(true);
    this.errorMessage.set(null);

    // Disarm the lock synchronously before the router guard runs.
    this.mode.deactivate();

    // ngOnDestroy closes all serial ports after navigation. Never wait for a
    // USB disconnect to navigate: a physically unplugged port may hang.
    void this.router.navigateByUrl('/access-scanner').then(navigated => {
      if (!navigated) {
        this.finishing.set(false);
        this.errorMessage.set(
          'No se pudo volver al escáner. Los lectores pueden desconectarse desde esta pantalla.'
        );
      }
    }).catch(() => {
      this.finishing.set(false);
      this.errorMessage.set(
        'No se pudo navegar al escáner normal. Intenta nuevamente.'
      );
    });
  }

  resumeQueue(): void {
    this.queue.resume();
  }

  discardQueue(): void {
    if (!this.queue.paused() || this.queue.processing()) {
      return;
    }
    if (typeof window !== 'undefined' &&
        window.confirm(
          'Estas lecturas pendientes NO se registrarán. ' +
          'Confirma que las revisarás manualmente en el monitor. ¿Descartar?'
        )) {
      this.queue.discardPending();
    }
  }

  eventLabel(eventType: AccessEventType): string {
    return eventType === 'ENTRY' ? 'Entrada' : 'Salida';
  }

  @HostListener('window:beforeunload', ['$event'])
  onBeforeUnload(event: BeforeUnloadEvent): void {
    // Warn before browser refresh/close: unsent HTTP requests cannot
    // be persisted safely or replayed without risking duplicate events.
    if ((this.sessionActive() && this.connectedCount() > 0) ||
        this.queue.pending() > 0) {
      event.preventDefault();
      event.returnValue = '';
    }
  }

  ngOnDestroy(): void {
    void this.serial.disconnectAll();
  }

  private onScan(token: string, readerId: number): void {
    const reader = this.readers().find(item => item.id === readerId);
    if (!reader || reader.status !== 'connected') {
      return;
    }

    if (!this.sessionActive() || this.finishing()) {
      return;
    }

    this.queue.enqueue(token, reader.name, reader.eventType);
  }

  private onReaderError(reason: string, readerId: number): void {
    const reader = this.readers().find(item => item.id === readerId);
    if (!reader) {
      return;
    }
    if (!this.sessionActive()) {
      this.errorMessage.set(`${reader.name}: ${reason}`);
    } else {
      this.queue.recordReaderError(reader.name, reader.eventType, reason);
    }
  }
}
