import {
  computed,
  Injectable,
  signal
} from '@angular/core';

export type ScanModeEventType =
  | 'ENTRY'
  | 'EXIT';

export type ScanModeCaptureMethod =
  | 'USB'
  | 'CAMERA';

export interface ScanModeConfiguration {
  eventType: ScanModeEventType;
  captureMethod: ScanModeCaptureMethod;
  activatedAt: string;
}

const STORAGE_KEY =
  'control-escolar.secure-scan-mode';

@Injectable({
  providedIn: 'root'
})
export class ScanModeService {

  private readonly configurationState =
    signal<ScanModeConfiguration | null>(
      this.readStoredConfiguration()
    );

  readonly configuration =
    this.configurationState.asReadonly();

  readonly active = computed(
    () => this.configurationState() !== null
  );

  activate(
    eventType: ScanModeEventType,
    captureMethod: ScanModeCaptureMethod
  ): void {
    const configuration: ScanModeConfiguration = {
      eventType,
      captureMethod,
      activatedAt: new Date().toISOString()
    };

    this.configurationState.set(configuration);
    this.storeConfiguration(configuration);
  }

  deactivate(): void {
    this.configurationState.set(null);
    this.removeStoredConfiguration();
  }

  private readStoredConfiguration():
    ScanModeConfiguration | null {
    const storage = this.getStorage();

    if (!storage) {
      return null;
    }

    try {
      const storedValue = storage.getItem(STORAGE_KEY);

      if (!storedValue) {
        return null;
      }

      const configuration =
        JSON.parse(storedValue) as Partial<ScanModeConfiguration>;

      if (!this.isValidConfiguration(configuration)) {
        storage.removeItem(STORAGE_KEY);
        return null;
      }

      return configuration;
    } catch {
      storage.removeItem(STORAGE_KEY);
      return null;
    }
  }

  private storeConfiguration(
    configuration: ScanModeConfiguration
  ): void {
    const storage = this.getStorage();

    if (!storage) {
      return;
    }

    try {
      storage.setItem(
        STORAGE_KEY,
        JSON.stringify(configuration)
      );
    } catch {
      // El modo continúa activo aunque el navegador
      // no permita utilizar almacenamiento local.
    }
  }

  private removeStoredConfiguration(): void {
    const storage = this.getStorage();

    if (!storage) {
      return;
    }

    try {
      storage.removeItem(STORAGE_KEY);
    } catch {
      // No se requiere una acción adicional.
    }
  }

  private isValidConfiguration(
    value: Partial<ScanModeConfiguration>
  ): value is ScanModeConfiguration {
    const validEventType =
      value.eventType === 'ENTRY' ||
      value.eventType === 'EXIT';

    const validCaptureMethod =
      value.captureMethod === 'USB' ||
      value.captureMethod === 'CAMERA';

    return (
      validEventType &&
      validCaptureMethod &&
      typeof value.activatedAt === 'string'
    );
  }

  private getStorage(): Storage | null {
    if (typeof window === 'undefined') {
      return null;
    }

    try {
      return window.localStorage;
    } catch {
      return null;
    }
  }
}