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
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import {
  BrowserQRCodeReader,
  IScannerControls
} from '@zxing/browser';
import { finalize } from 'rxjs';

import {
  AuthService
} from '../../core/auth/auth.service';
import {
  ScanModeCaptureMethod,
  ScanModeService
} from '../../core/scan-mode/scan-mode.service';
import {
  AccessEvent,
  AccessEventType,
  CaptureMethod,
  ScanAccessEventRequest
} from './access-event.models';
import { AccessEventService } from './access-event.service';

@Component({
  selector: 'app-access-scanner',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule
  ],
  templateUrl: './access-scanner.component.html'
})
export class AccessScannerComponent
implements AfterViewInit, OnDestroy {

  @ViewChild('scannerVideo')
  private scannerVideo?: ElementRef<HTMLVideoElement>;

  @ViewChild('usbTokenInput')
  private usbTokenInput?: ElementRef<HTMLInputElement>;

  @ViewChild('unlockPasswordInput')
  private unlockPasswordInput?: ElementRef<HTMLInputElement>;

  private readonly formBuilder = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly scanModeService =
    inject(ScanModeService);
  private readonly accessEventService =
    inject(AccessEventService);

  private readonly qrReader = new BrowserQRCodeReader();
  private readonly duplicateScanWindowMs = 5000;
  private readonly cameraRestartDelayMs = 1200;

  private scannerControls?: IScannerControls;
  private cameraRestartTimer?: ReturnType<typeof setTimeout>;
  private cameraCaptureLocked = false;

  private lastSuccessfulToken: string | null = null;
  private lastSuccessfulEventType:
    AccessEventType | null = null;
  private lastSuccessfulAt = 0;

  readonly secureModeActive =
    this.scanModeService.active;

  readonly secureModeConfiguration =
    this.scanModeService.configuration;

  readonly activeCaptureMethod =
    signal<CaptureMethod>('QR_USB');

  readonly cameraActive = signal(false);
  readonly startingCamera = signal(false);
  readonly processing = signal(false);

  readonly unlockRequested = signal(false);
  readonly unlocking = signal(false);
  readonly unlockErrorMessage =
    signal<string | null>(null);

  readonly successMessage = signal<string | null>(null);
  readonly errorMessage = signal<string | null>(null);

  readonly lastEvent = signal<AccessEvent | null>(null);

  readonly recentEvents =
    signal<readonly AccessEvent[]>([]);

  readonly scanForm =
    this.formBuilder.nonNullable.group({
      eventType:
        this.formBuilder.nonNullable.control<
          AccessEventType
        >(
          'ENTRY',
          {
            validators: [
              Validators.required
            ]
          }
        ),
      deviceName: [
        'Recepción web',
        [
          Validators.maxLength(100)
        ]
      ],
      notes: [
        '',
        [
          Validators.maxLength(500)
        ]
      ]
    });

  readonly usbForm =
    this.formBuilder.nonNullable.group({
      qrToken: [
        '',
        [
          Validators.required,
          Validators.maxLength(100)
        ]
      ]
    });

  readonly unlockForm =
    this.formBuilder.nonNullable.group({
      password: [
        '',
        [
          Validators.required
        ]
      ]
    });

  constructor() {
    const configuration =
      this.scanModeService.configuration();

    if (!configuration) {
      return;
    }

    this.scanForm.controls.eventType.setValue(
      configuration.eventType
    );

    this.activeCaptureMethod.set(
      this.toCaptureMethod(
        configuration.captureMethod
      )
    );
  }

  ngAfterViewInit(): void {
    if (!this.secureModeActive()) {
      return;
    }

    setTimeout(() => {
      if (
        this.activeCaptureMethod() === 'QR_CAMERA'
      ) {
        void this.startCamera(true);
        return;
      }

      this.focusUsbInput();
    });
  }

  selectCaptureMethod(
    captureMethod: CaptureMethod
  ): void {
    if (this.secureModeActive()) {
      return;
    }

    if (
      captureMethod ===
      this.activeCaptureMethod()
    ) {
      if (captureMethod === 'QR_USB') {
        this.focusUsbInput();
      }

      return;
    }

    if (captureMethod === 'QR_USB') {
      this.stopCamera();
    }

    this.activeCaptureMethod.set(captureMethod);

    this.usbForm.reset({
      qrToken: ''
    });

    this.clearMessages();

    if (captureMethod === 'QR_USB') {
      this.focusUsbInput();
    }
  }

  activateSecureMode(): void {
    if (
      this.processing() ||
      this.startingCamera()
    ) {
      return;
    }

    if (this.scanForm.invalid) {
      this.scanForm.markAllAsTouched();

      this.errorMessage.set(
        'Revisa los datos antes de iniciar el modo de registro.'
      );
      return;
    }

    const formValue =
      this.scanForm.getRawValue();

    this.scanModeService.activate(
      formValue.eventType,
      this.toScanModeCaptureMethod(
        this.activeCaptureMethod()
      )
    );

    this.unlockRequested.set(false);
    this.unlockErrorMessage.set(null);

    this.unlockForm.reset({
      password: ''
    });

    this.usbForm.reset({
      qrToken: ''
    });

    this.clearMessages();

    void this.enterFullscreen();

    setTimeout(() => {
      if (
        this.activeCaptureMethod() === 'QR_CAMERA'
      ) {
        void this.startCamera(true);
        return;
      }

      this.focusUsbInput();
    });
  }

  requestUnlock(): void {
    if (!this.secureModeActive()) {
      return;
    }

    this.stopCamera();

    this.unlockRequested.set(true);
    this.unlockErrorMessage.set(null);

    this.unlockForm.reset({
      password: ''
    });

    this.focusUnlockPassword();
  }

  cancelUnlock(): void {
    this.unlockRequested.set(false);
    this.unlockErrorMessage.set(null);

    this.unlockForm.reset({
      password: ''
    });

    setTimeout(() => {
      if (
        this.activeCaptureMethod() === 'QR_CAMERA'
      ) {
        void this.startCamera(true);
        return;
      }

      this.focusUsbInput();
    });
  }

  unlockSecureMode(): void {
    if (
      this.unlocking() ||
      !this.secureModeActive()
    ) {
      return;
    }

    if (this.unlockForm.invalid) {
      this.unlockForm.markAllAsTouched();

      this.unlockErrorMessage.set(
        'Escribe tu contraseña para desbloquear.'
      );

      this.focusUnlockPassword();
      return;
    }

    const currentUser =
      this.authService.currentUser();

    if (!currentUser) {
      this.unlockErrorMessage.set(
        'No fue posible identificar al usuario actual.'
      );
      return;
    }

    const password =
      this.unlockForm.controls.password.value;

    this.unlocking.set(true);
    this.unlockErrorMessage.set(null);

    this.authService
      .login(
        currentUser.email,
        password
      )
      .pipe(
        finalize(() => {
          this.unlocking.set(false);
        })
      )
      .subscribe({
        next: () => {
          this.stopCamera();
          this.scanModeService.deactivate();

          this.unlockRequested.set(false);
          this.unlockErrorMessage.set(null);

          this.unlockForm.reset({
            password: ''
          });

          this.usbForm.reset({
            qrToken: ''
          });

          this.clearMessages();

          void this.exitFullscreen();
        },
        error: (error: HttpErrorResponse) => {
          this.unlockErrorMessage.set(
            this.resolveUnlockError(error)
          );

          this.unlockForm.controls.password.setValue(
            ''
          );

          this.focusUnlockPassword();
        }
      });
  }

  async startCamera(
    preserveMessages = false
  ): Promise<void> {
    if (this.unlockRequested()) {
      return;
    }

    this.activeCaptureMethod.set('QR_CAMERA');

    if (!preserveMessages) {
      this.clearMessages();
    }

    this.usbForm.reset({
      qrToken: ''
    });

    if (
      !navigator.mediaDevices ||
      !navigator.mediaDevices.getUserMedia
    ) {
      this.errorMessage.set(
        'Este navegador no permite acceder a la cámara.'
      );
      return;
    }

    const videoElement =
      this.scannerVideo?.nativeElement;

    if (!videoElement) {
      this.errorMessage.set(
        'No fue posible preparar el lector de cámara.'
      );
      return;
    }

    this.stopCamera();

    this.cameraCaptureLocked = false;
    this.startingCamera.set(true);

    try {
      const controls =
        await this.qrReader.decodeFromConstraints(
          {
            audio: false,
            video: {
              facingMode: {
                ideal: 'environment'
              }
            }
          },
          videoElement,
          (
            result,
            _error,
            currentControls
          ) => {
            if (
              !result ||
              this.cameraCaptureLocked ||
              this.processing() ||
              this.unlockRequested()
            ) {
              return;
            }

            this.cameraCaptureLocked = true;

            currentControls.stop();
            this.scannerControls = undefined;

            this.releaseVideoStream();
            this.cameraActive.set(false);

            this.submitToken(
              result.getText(),
              'QR_CAMERA'
            );
          }
        );

      if (this.cameraCaptureLocked) {
        controls.stop();
        return;
      }

      this.scannerControls = controls;
      this.cameraActive.set(true);
    } catch (error: unknown) {
      this.stopCamera();

      this.errorMessage.set(
        this.resolveCameraError(error)
      );
    } finally {
      this.startingCamera.set(false);
    }
  }

  stopCamera(): void {
    this.clearCameraRestartTimer();
    this.cameraCaptureLocked = true;

    try {
      this.scannerControls?.stop();
    } finally {
      this.scannerControls = undefined;
      this.releaseVideoStream();

      this.cameraActive.set(false);
      this.startingCamera.set(false);
    }
  }

  submitUsbToken(): void {
    const rawValue =
      this.usbForm.controls.qrToken.value;

    /*
     * Algunos lectores envían un segundo Enter después
     * de haber limpiado el campo. Esa entrada vacía se
     * ignora y no reemplaza el mensaje de éxito.
     */
    if (!rawValue.trim()) {
      this.usbForm.reset({
        qrToken: ''
      });

      this.focusUsbInput();
      return;
    }

    this.clearMessages();

    const normalizedToken =
      this.normalizeUsbScannerValue(rawValue);

    this.usbForm.controls.qrToken.setValue(
      normalizedToken
    );

    if (
      !normalizedToken ||
      normalizedToken.length > 100 ||
      this.usbForm.invalid
    ) {
      this.usbForm.markAllAsTouched();

      this.errorMessage.set(
        'Escanea una credencial QR válida.'
      );

      this.focusUsbInput();
      return;
    }

    this.submitToken(
      normalizedToken,
      'QR_USB'
    );
  }

  eventTypeLabel(
    eventType: AccessEventType
  ): string {
    return eventType === 'ENTRY'
      ? 'Entrada'
      : 'Salida';
  }

  captureMethodLabel(
    captureMethod: CaptureMethod
  ): string {
    return captureMethod === 'QR_CAMERA'
      ? 'Cámara'
      : 'Lector USB';
  }

  ngOnDestroy(): void {
    this.stopCamera();
    this.clearCameraRestartTimer();

    this.lastSuccessfulToken = null;
    this.lastSuccessfulEventType = null;
    this.lastSuccessfulAt = 0;
  }

  private submitToken(
    qrToken: string,
    captureMethod: CaptureMethod
  ): void {
    if (
      this.processing() ||
      this.unlockRequested()
    ) {
      return;
    }

    const normalizedToken = qrToken.trim();

    if (
      !normalizedToken ||
      normalizedToken.length > 100
    ) {
      this.errorMessage.set(
        'El código QR no contiene un token válido.'
      );

      if (captureMethod === 'QR_CAMERA') {
        this.scheduleSecureCameraRestart();
      }

      return;
    }

    if (this.scanForm.invalid) {
      this.scanForm.markAllAsTouched();

      this.errorMessage.set(
        'Revisa los datos del registro de acceso.'
      );

      if (captureMethod === 'QR_CAMERA') {
        this.scheduleSecureCameraRestart();
      }

      return;
    }

    const formValue =
      this.scanForm.getRawValue();

    const eventType =
      this.secureModeConfiguration()?.eventType ??
      formValue.eventType;

    this.clearMessages();

    if (
      this.isRecentDuplicate(
        normalizedToken,
        eventType
      )
    ) {
      this.usbForm.reset({
        qrToken: ''
      });

      this.successMessage.set(
        'Lectura repetida ignorada para evitar duplicar el mismo movimiento.'
      );

      if (captureMethod === 'QR_USB') {
        this.focusUsbInput();
      } else {
        this.scheduleSecureCameraRestart();
      }

      return;
    }

    const request: ScanAccessEventRequest = {
      qrToken: normalizedToken,
      eventType,
      captureMethod,
      deviceName: this.normalizeOptionalText(
        formValue.deviceName
      ),
      notes: this.normalizeOptionalText(
        formValue.notes
      )
    };

    this.processing.set(true);

    if (captureMethod === 'QR_USB') {
      this.usbForm.reset({
        qrToken: ''
      });
    }

    this.accessEventService
      .scan(request)
      .pipe(
        finalize(() => {
          this.processing.set(false);

          if (captureMethod === 'QR_USB') {
            this.focusUsbInput();
            return;
          }

          this.scheduleSecureCameraRestart();
        })
      )
      .subscribe({
        next: (accessEvent) => {
          this.lastSuccessfulToken =
            normalizedToken;

          this.lastSuccessfulEventType =
            accessEvent.eventType;

          this.lastSuccessfulAt = Date.now();

          this.usbForm.reset({
            qrToken: ''
          });

          this.lastEvent.set(accessEvent);

          this.recentEvents.update((events) =>
            [
              accessEvent,
              ...events.filter(
                (event) =>
                  event.id !== accessEvent.id
              )
            ].slice(0, 10)
          );

          const eventLabel =
            this.eventTypeLabel(
              accessEvent.eventType
            ).toLowerCase();

          const notificationMessage =
            accessEvent.notificationsQueued === 1
              ? ' Se encoló 1 notificación.'
              : accessEvent.notificationsQueued > 1
                ? ` Se encolaron ${accessEvent.notificationsQueued} notificaciones.`
                : '';

          this.successMessage.set(
            `${accessEvent.studentName}: ${eventLabel} registrada correctamente.${notificationMessage}`
          );
        },
        error: (error: HttpErrorResponse) => {
          this.errorMessage.set(
            this.resolveScanError(error)
          );
        }
      });
  }

  private normalizeUsbScannerValue(
    value: string
  ): string {
    /*
     * El lector queda configurado como English (US).
     *
     * Cuando Windows utiliza teclado Español
     * Latinoamérica, sus teclas correspondientes a
     * guion y guion bajo pueden recibirse como
     * apóstrofo y signo de interrogación.
     *
     * Los tokens son Base64 URL y nunca contienen
     * apóstrofos ni signos de interrogación, por lo
     * que esta conversión es inequívoca.
     */
    const keyboardNormalizedValue = value
      .replace(/'/g, '-')
      .replace(/\?/g, '_');

    /*
     * Elimina caracteres de control, prefijos o
     * sufijos que no pertenecen al formato Base64 URL.
     */
    const compactValue =
      keyboardNormalizedValue.replace(
        /[^A-Za-z0-9_-]/g,
        ''
      );

    /*
     * Algunos lectores configurados en modo continuo
     * pueden escribir el mismo token varias veces
     * antes de enviar Enter. También se contempla que
     * maxlength corte la última repetición.
     */
    const maximumCandidateLength = Math.min(
      100,
      Math.floor(compactValue.length / 2)
    );

    for (
      let candidateLength = 32;
      candidateLength <= maximumCandidateLength;
      candidateLength += 1
    ) {
      const candidate =
        compactValue.slice(0, candidateLength);

      let repeatedValue = true;

      for (
        let index = candidateLength;
        index < compactValue.length;
        index += 1
      ) {
        if (
          compactValue[index] !==
          candidate[index % candidateLength]
        ) {
          repeatedValue = false;
          break;
        }
      }

      if (repeatedValue) {
        return candidate;
      }
    }

    return compactValue;
  }

  private isRecentDuplicate(
    qrToken: string,
    eventType: AccessEventType
  ): boolean {
    if (
      this.lastSuccessfulToken !== qrToken ||
      this.lastSuccessfulEventType !== eventType
    ) {
      return false;
    }

    return (
      Date.now() - this.lastSuccessfulAt <
      this.duplicateScanWindowMs
    );
  }

  private scheduleSecureCameraRestart(): void {
    this.clearCameraRestartTimer();

    if (
      !this.secureModeActive() ||
      this.activeCaptureMethod() !== 'QR_CAMERA' ||
      this.unlockRequested()
    ) {
      return;
    }

    this.cameraRestartTimer = setTimeout(() => {
      this.cameraRestartTimer = undefined;

      if (
        !this.secureModeActive() ||
        this.activeCaptureMethod() !== 'QR_CAMERA' ||
        this.unlockRequested()
      ) {
        return;
      }

      void this.startCamera(true);
    }, this.cameraRestartDelayMs);
  }

  private clearCameraRestartTimer(): void {
    if (!this.cameraRestartTimer) {
      return;
    }

    clearTimeout(this.cameraRestartTimer);
    this.cameraRestartTimer = undefined;
  }

  private normalizeOptionalText(
    value: string
  ): string | null {
    const normalizedValue = value.trim();

    return normalizedValue
      ? normalizedValue
      : null;
  }

  private clearMessages(): void {
    this.successMessage.set(null);
    this.errorMessage.set(null);
  }

  private focusUsbInput(): void {
    if (
      this.unlockRequested() ||
      this.activeCaptureMethod() !== 'QR_USB'
    ) {
      return;
    }

    setTimeout(() => {
      this.usbTokenInput?.nativeElement.focus();
    });
  }

  private focusUnlockPassword(): void {
    setTimeout(() => {
      this.unlockPasswordInput?.nativeElement.focus();
    });
  }

  private releaseVideoStream(): void {
    const videoElement =
      this.scannerVideo?.nativeElement;

    const stream =
      videoElement?.srcObject instanceof MediaStream
        ? videoElement.srcObject
        : null;

    stream?.getTracks().forEach((track) => {
      track.stop();
    });

    if (videoElement) {
      videoElement.srcObject = null;
    }
  }

  private toScanModeCaptureMethod(
    captureMethod: CaptureMethod
  ): ScanModeCaptureMethod {
    return captureMethod === 'QR_CAMERA'
      ? 'CAMERA'
      : 'USB';
  }

  private toCaptureMethod(
    captureMethod: ScanModeCaptureMethod
  ): CaptureMethod {
    return captureMethod === 'CAMERA'
      ? 'QR_CAMERA'
      : 'QR_USB';
  }

  private async enterFullscreen(): Promise<void> {
    if (
      typeof document === 'undefined' ||
      document.fullscreenElement ||
      !document.documentElement.requestFullscreen
    ) {
      return;
    }

    try {
      await document.documentElement.requestFullscreen();
    } catch {
      /*
       * El modo seguro permanece activo mediante la
       * interfaz aunque el navegador rechace fullscreen.
       */
    }
  }

  private async exitFullscreen(): Promise<void> {
    if (
      typeof document === 'undefined' ||
      !document.fullscreenElement ||
      !document.exitFullscreen
    ) {
      return;
    }

    try {
      await document.exitFullscreen();
    } catch {
      // La pantalla ya se encuentra desbloqueada.
    }
  }

  private resolveUnlockError(
    error: HttpErrorResponse
  ): string {
    if (error.status === 401) {
      return 'La contraseña es incorrecta.';
    }

    if (error.status === 0) {
      return 'No fue posible comunicarse con el servidor.';
    }

    return 'No fue posible validar la contraseña. Intenta nuevamente.';
  }

  private resolveCameraError(
    error: unknown
  ): string {
    if (error instanceof DOMException) {
      switch (error.name) {
        case 'NotAllowedError':
        case 'SecurityError':
          return 'El navegador no tiene permiso para usar la cámara. Habilítalo e intenta nuevamente.';

        case 'NotFoundError':
        case 'OverconstrainedError':
          return 'No se encontró una cámara disponible en este dispositivo.';

        case 'NotReadableError':
          return 'La cámara está siendo utilizada por otra aplicación.';

        default:
          break;
      }
    }

    return 'No fue posible iniciar la cámara. Revisa los permisos del navegador.';
  }

  private resolveScanError(
    error: HttpErrorResponse
  ): string {
    switch (error.status) {
      case 0:
        return 'No fue posible comunicarse con el servidor.';

      case 400:
        return 'El código QR o los datos del registro no son válidos.';

      case 401:
        return 'Tu sesión expiró. Inicia sesión nuevamente.';

      case 403:
        return 'No tienes permiso para utilizar esta credencial.';

      case 404:
        return 'La credencial no existe, está desactivada o fue reemplazada.';

      case 409:
        return 'No se puede registrar el acceso porque la credencial expiró o el alumno está inactivo.';

      default:
        return 'Ocurrió un error al registrar el acceso. Intenta nuevamente.';
    }
  }
}