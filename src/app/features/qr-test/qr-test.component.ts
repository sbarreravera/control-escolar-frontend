import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  AfterViewInit,
  Component,
  ElementRef,
  inject,
  OnDestroy,
  signal,
  ViewChild
} from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { BrowserQRCodeReader, IScannerControls } from '@zxing/browser';
import { finalize } from 'rxjs';

import { AuthService } from '../../core/auth/auth.service';
import { QrTestResponse, QrTestService, QrTestStatus } from './qr-test.service';

@Component({
  selector: 'app-qr-test',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './qr-test.component.html'
})
export class QrTestComponent implements AfterViewInit, OnDestroy {
  @ViewChild('scannerVideo')
  private scannerVideo?: ElementRef<HTMLVideoElement>;

  @ViewChild('qrInput')
  private qrInput?: ElementRef<HTMLInputElement>;

  private readonly auth = inject(AuthService);
  private readonly qrTest = inject(QrTestService);
  private readonly reader = new BrowserQRCodeReader();
  private scannerControls?: IScannerControls;
  private captured = false;
  private destroyed = false;

  readonly schoolName = this.auth.currentUser()?.schoolName ?? 'Escuela';
  readonly mode = signal<'usb' | 'camera'>('usb');
  readonly cameraActive = signal(false);
  readonly startingCamera = signal(false);
  readonly processing = signal(false);
  readonly result = signal<QrTestResponse | null>(null);
  readonly errorMessage = signal<string | null>(null);

  readonly qrTokenControl = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, Validators.maxLength(100)]
  });

  ngAfterViewInit(): void {
    this.focusInput();
  }

  selectMode(mode: 'usb' | 'camera'): void {
    if (mode === this.mode()) {
      return;
    }

    this.stopCamera();
    this.mode.set(mode);
    this.errorMessage.set(null);
    this.result.set(null);
    this.qrTokenControl.reset();

    if (mode === 'camera') {
      void this.startCamera();
    } else {
      this.focusInput();
    }
  }

  submitUsbToken(): void {
    if (this.processing()) {
      return;
    }

    const rawToken = this.qrTokenControl.value;
    this.qrTokenControl.reset();

    if (!rawToken.trim()) {
      this.focusInput();
      return;
    }

    this.validate(this.normalizeUsbToken(rawToken));
  }

  async startCamera(): Promise<void> {
    if (this.mode() !== 'camera' || this.startingCamera()) {
      return;
    }

    this.stopCamera();
    this.captured = false;
    this.startingCamera.set(true);
    this.errorMessage.set(null);

    if (!navigator.mediaDevices?.getUserMedia) {
      this.errorMessage.set('El navegador no permite acceder a la cámara.');
      this.startingCamera.set(false);
      return;
    }

    const video = this.scannerVideo?.nativeElement;
    if (!video) {
      this.errorMessage.set('No fue posible preparar el lector.');
      this.startingCamera.set(false);
      return;
    }

    try {
      const controls = await this.reader.decodeFromConstraints(
        {
          audio: false,
          video: { facingMode: { ideal: 'environment' } }
        },
        video,
        (decoded, _error, scannerControls) => {
          if (!decoded || this.captured || this.processing() || this.destroyed) {
            return;
          }

          this.captured = true;
          scannerControls.stop();
          this.scannerControls = undefined;
          this.releaseVideoStream();
          this.cameraActive.set(false);
          this.validate(decoded.getText());
        }
      );

      if (this.captured || this.destroyed) {
        controls.stop();
      } else {
        this.scannerControls = controls;
        this.cameraActive.set(true);
      }
    } catch {
      this.stopCamera();
      if (!this.destroyed) {
        this.errorMessage.set(
          'No fue posible abrir la cámara. Revisa los permisos del navegador.'
        );
      }
    } finally {
      this.startingCamera.set(false);
    }
  }

  stopCamera(): void {
    this.captured = true;
    this.scannerControls?.stop();
    this.scannerControls = undefined;
    this.releaseVideoStream();
    this.cameraActive.set(false);
  }

  validate(rawToken: string): void {
    if (this.processing()) {
      return;
    }

    const qrToken = rawToken.trim();
    if (!qrToken || qrToken.length > 100) {
      this.errorMessage.set('El código QR no tiene un formato válido.');
      this.focusInput();
      return;
    }

    const schoolId = this.auth.currentUser()?.schoolId;
    if (schoolId === null || schoolId === undefined) {
      this.errorMessage.set('Selecciona una escuela para hacer la prueba.');
      return;
    }

    this.processing.set(true);
    this.errorMessage.set(null);
    this.result.set(null);

    this.qrTest.validate(qrToken, schoolId)
      .pipe(finalize(() => {
        this.processing.set(false);
        this.focusInput();
      }))
      .subscribe({
        next: data => this.result.set(data),
        error: (error: HttpErrorResponse) => {
          const message = error.status === 404
            ? 'No existe una credencial registrada con este QR en la escuela seleccionada.'
            : error.status === 403
              ? 'Tu usuario no tiene permiso para probar este QR.'
              : error.status === 0
                ? 'No fue posible conectarse con el servidor.'
                : 'No fue posible verificar el código QR.';
          this.errorMessage.set(message);
        }
      });
  }

  statusLabel(status: QrTestStatus): string {
    switch (status) {
      case 'VALID': return 'Credencial válida';
      case 'EXPIRED': return 'Credencial vencida';
      case 'INACTIVE_CREDENTIAL': return 'Credencial desactivada';
      case 'INACTIVE_STUDENT': return 'Alumno inactivo';
    }
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    this.stopCamera();
  }

  private focusInput(): void {
    if (this.mode() !== 'usb') {
      return;
    }

    setTimeout(() => {
      if (!this.destroyed) {
        this.qrInput?.nativeElement.focus();
      }
    });
  }

  /**
   * Ajusta la distribución de teclado español de lectores QR USB.
   * Es equivalente al ajuste utilizado por Registrar acceso.
   */
  private normalizeUsbToken(value: string): string {
    const compact = value
      .replace(/'/g, '-')
      .replace(/\?/g, '_')
      .replace(/[^A-Za-z0-9_-]/g, '');

    const max = Math.min(100, Math.floor(compact.length / 2));
    for (let size = 32; size <= max; size += 1) {
      const candidate = compact.slice(0, size);
      let repeated = true;
      for (let i = size; i < compact.length; i += 1) {
        if (compact[i] !== candidate[i % size]) {
          repeated = false;
          break;
        }
      }
      if (repeated) {
        return candidate;
      }
    }

    return compact;
  }

  private releaseVideoStream(): void {
    const video = this.scannerVideo?.nativeElement;
    const stream = video?.srcObject;
    if (stream instanceof MediaStream) {
      stream.getTracks().forEach(track => track.stop());
    }
    if (video) {
      video.srcObject = null;
    }
  }
}
