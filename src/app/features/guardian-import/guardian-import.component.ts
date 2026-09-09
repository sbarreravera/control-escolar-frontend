import { DOCUMENT } from '@angular/common';
import {
  HttpErrorResponse,
  HttpResponse
} from '@angular/common/http';
import {
  Component,
  computed,
  ElementRef,
  inject,
  signal,
  ViewChild
} from '@angular/core';
import {
  ButtonDirective,
  CardBodyComponent,
  CardComponent,
  CardHeaderComponent,
  ColComponent,
  FormControlDirective,
  RowComponent
} from '@coreui/angular';
import { finalize } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import {
  GuardianImportResult,
  GuardianImportValidation
} from './guardian-import.models';
import { GuardianImportService } from './guardian-import.service';

@Component({
  selector: 'app-guardian-import',
  templateUrl: './guardian-import.component.html',
  imports: [
    RowComponent,
    ColComponent,
    CardComponent,
    CardHeaderComponent,
    CardBodyComponent,
    FormControlDirective,
    ButtonDirective
  ]
})
export class GuardianImportComponent {

  @ViewChild('fileInput')
  private fileInput?: ElementRef<HTMLInputElement>;

  private readonly document = inject(DOCUMENT);
  private readonly authService = inject(AuthService);
  private readonly guardianImportService =
    inject(GuardianImportService);

  readonly selectedFile = signal<File | null>(null);
  readonly validation =
    signal<GuardianImportValidation | null>(null);

  readonly downloading = signal(false);
  readonly validating = signal(false);
  readonly importing = signal(false);

  readonly errorMessage = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);

  readonly schoolName = computed(
    () =>
      this.authService.currentUser()?.schoolName ??
      'Tu escuela'
  );

  readonly busy = computed(
    () =>
      this.downloading() ||
      this.validating() ||
      this.importing()
  );

  readonly canImport = computed(
    () =>
      this.validation()?.canImport === true &&
      this.selectedFile() !== null &&
      !this.importing()
  );

  downloadTemplate(): void {
    const schoolId = this.schoolId();
    if (schoolId === null) {
      return;
    }

    this.downloading.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    this.guardianImportService
      .downloadTemplate(schoolId)
      .pipe(
        finalize(() => this.downloading.set(false))
      )
      .subscribe({
        next: response => this.saveTemplate(response),
        error: (error: HttpErrorResponse) => {
          this.errorMessage.set(
            this.resolveErrorMessage(error)
          );
        }
      });
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.item(0) ?? null;

    this.validation.set(null);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    if (file === null) {
      this.selectedFile.set(null);
      return;
    }

    if (!file.name.toLowerCase().endsWith('.xlsx')) {
      this.selectedFile.set(null);
      input.value = '';
      this.errorMessage.set(
        'Selecciona el archivo .xlsx descargado desde el sistema.'
      );
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      this.selectedFile.set(null);
      input.value = '';
      this.errorMessage.set(
        'El archivo no puede superar 5 MB.'
      );
      return;
    }

    this.selectedFile.set(file);
  }

  validateFile(): void {
    const schoolId = this.schoolId();
    const file = this.selectedFile();
    if (schoolId === null || file === null) {
      return;
    }

    this.validating.set(true);
    this.validation.set(null);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    this.guardianImportService
      .validate(schoolId, file)
      .pipe(
        finalize(() => this.validating.set(false))
      )
      .subscribe({
        next: validation => this.validation.set(validation),
        error: (error: HttpErrorResponse) => {
          this.errorMessage.set(
            this.resolveErrorMessage(error)
          );
        }
      });
  }

  importGuardians(): void {
    const schoolId = this.schoolId();
    const file = this.selectedFile();
    const validation = this.validation();

    if (
      schoolId === null ||
      file === null ||
      validation?.canImport !== true
    ) {
      return;
    }

    this.importing.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    this.guardianImportService
      .importGuardians(schoolId, file)
      .pipe(
        finalize(() => this.importing.set(false))
      )
      .subscribe({
        next: result => this.handleImportSuccess(result),
        error: (error: HttpErrorResponse) => {
          const result = error.error as GuardianImportResult | null;
          if (result?.validation) {
            this.validation.set(result.validation);
            this.errorMessage.set(
              'Los datos cambiaron desde la validación. Revisa los errores antes de intentar nuevamente.'
            );
            return;
          }

          this.errorMessage.set(
            this.resolveErrorMessage(error)
          );
        }
      });
  }

  private handleImportSuccess(
    result: GuardianImportResult
  ): void {
    this.successMessage.set(
      `Tutores creados: ${result.guardiansCreated}. ` +
      `Tutores reutilizados: ${result.guardiansReused}. ` +
      `Relaciones registradas: ${result.relationshipsCreated}.`
    );
    this.clearSelectedFile();
  }

  private schoolId(): number | null {
    const schoolId = this.authService.currentUser()?.schoolId;
    if (schoolId === null || schoolId === undefined) {
      this.errorMessage.set(
        'Tu usuario no tiene una escuela asignada.'
      );
      return null;
    }
    return schoolId;
  }

  private clearSelectedFile(): void {
    this.selectedFile.set(null);
    this.validation.set(null);
    if (this.fileInput) {
      this.fileInput.nativeElement.value = '';
    }
  }

  private saveTemplate(response: HttpResponse<Blob>): void {
    if (response.body === null) {
      this.errorMessage.set(
        'El servidor no devolvió el formato de carga.'
      );
      return;
    }

    const fileName = this.resolveFileName(
      response.headers.get('content-disposition')
    );
    const url = URL.createObjectURL(response.body);
    const link = this.document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
  }

  private resolveFileName(
    contentDisposition: string | null
  ): string {
    if (contentDisposition) {
      const encodedMatch = /filename\*=UTF-8''([^;]+)/i
        .exec(contentDisposition);
      if (encodedMatch?.[1]) {
        return decodeURIComponent(encodedMatch[1]);
      }

      const plainMatch = /filename="?([^";]+)"?/i
        .exec(contentDisposition);
      if (plainMatch?.[1]) {
        return plainMatch[1];
      }
    }
    return 'carga-tutores-relaciones.xlsx';
  }

  private resolveErrorMessage(
    error: HttpErrorResponse
  ): string {
    if (error.status === 409) {
      return 'Primero registra al menos un alumno activo en la escuela.';
    }
    if (error.status === 404) {
      return 'No fue posible encontrar la escuela asignada.';
    }
    if (error.status === 403) {
      return 'No tienes permiso para realizar esta carga.';
    }
    if (error.status === 413) {
      return 'El archivo supera el tamaño permitido.';
    }
    if (error.status === 0) {
      return 'No fue posible conectarse con el servidor.';
    }
    return 'Ocurrió un error al procesar el archivo.';
  }
}
