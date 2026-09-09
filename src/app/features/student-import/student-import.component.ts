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
  OnInit,
  signal,
  ViewChild
} from '@angular/core';
import {
  FormControl,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
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
  AcademicCycle
} from '../academic-cycles/academic-cycle.models';
import {
  AcademicCycleService
} from '../academic-cycles/academic-cycle.service';
import {
  StudentImportResult,
  StudentImportValidation
} from './student-import.models';
import { StudentImportService } from './student-import.service';

@Component({
  selector: 'app-student-import',
  templateUrl: './student-import.component.html',
  imports: [
    ReactiveFormsModule,
    RowComponent,
    ColComponent,
    CardComponent,
    CardHeaderComponent,
    CardBodyComponent,
    FormControlDirective,
    ButtonDirective
  ]
})
export class StudentImportComponent implements OnInit {

  @ViewChild('fileInput')
  private fileInput?: ElementRef<HTMLInputElement>;

  private readonly document = inject(DOCUMENT);
  private readonly authService = inject(AuthService);
  private readonly academicCycleService =
    inject(AcademicCycleService);
  private readonly studentImportService =
    inject(StudentImportService);

  readonly academicCycles = signal<AcademicCycle[]>([]);
  readonly selectedFile = signal<File | null>(null);
  readonly validation = signal<StudentImportValidation | null>(null);

  readonly loadingCycles = signal(true);
  readonly downloading = signal(false);
  readonly validating = signal(false);
  readonly importing = signal(false);

  readonly errorMessage = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);

  readonly academicCycleId = new FormControl(
    0,
    {
      nonNullable: true,
      validators: [
        Validators.required,
        Validators.min(1)
      ]
    }
  );

  readonly schoolName = computed(
    () =>
      this.authService.currentUser()?.schoolName ??
      'Tu escuela'
  );

  readonly busy = computed(
    () =>
      this.loadingCycles() ||
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

  ngOnInit(): void {
    this.loadAcademicCycles();
  }

  loadAcademicCycles(): void {
    const schoolId =
      this.authService.currentUser()?.schoolId;

    if (schoolId === null || schoolId === undefined) {
      this.loadingCycles.set(false);
      this.errorMessage.set(
        'Tu usuario no tiene una escuela asignada.'
      );
      return;
    }

    this.loadingCycles.set(true);
    this.errorMessage.set(null);

    this.academicCycleService
      .findAllBySchool(schoolId)
      .pipe(
        finalize(() => this.loadingCycles.set(false))
      )
      .subscribe({
        next: cycles => {
          const activeCycles = cycles.filter(
            cycle => cycle.active
          );
          this.academicCycles.set(activeCycles);
          this.academicCycleId.setValue(
            activeCycles[0]?.id ?? 0
          );
        },
        error: (error: HttpErrorResponse) => {
          this.errorMessage.set(
            this.resolveErrorMessage(error)
          );
        }
      });
  }

  onCycleChange(): void {
    this.clearSelectedFile();
    this.errorMessage.set(null);
    this.successMessage.set(null);
  }

  downloadTemplate(): void {
    if (this.academicCycleId.invalid) {
      this.academicCycleId.markAsTouched();
      return;
    }

    this.downloading.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    this.studentImportService
      .downloadTemplate(this.academicCycleId.value)
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
    const file = this.selectedFile();

    if (this.academicCycleId.invalid || file === null) {
      this.errorMessage.set(
        'Selecciona el ciclo escolar y el archivo que deseas validar.'
      );
      return;
    }

    this.validating.set(true);
    this.validation.set(null);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    this.studentImportService
      .validate(this.academicCycleId.value, file)
      .pipe(
        finalize(() => this.validating.set(false))
      )
      .subscribe({
        next: validation => {
          this.validation.set(validation);
        },
        error: (error: HttpErrorResponse) => {
          this.errorMessage.set(
            this.resolveErrorMessage(error)
          );
        }
      });
  }

  importStudents(): void {
    const file = this.selectedFile();
    const validation = this.validation();

    if (file === null || validation?.canImport !== true) {
      return;
    }

    this.importing.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    this.studentImportService
      .importStudents(this.academicCycleId.value, file)
      .pipe(
        finalize(() => this.importing.set(false))
      )
      .subscribe({
        next: result => this.handleImportSuccess(result),
        error: (error: HttpErrorResponse) => {
          const result = error.error as StudentImportResult | null;

          if (result?.validation) {
            this.validation.set(result.validation);
            this.errorMessage.set(
              'El archivo cambió o los datos ya no son válidos. Revisa los errores.'
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
    result: StudentImportResult
  ): void {
    this.successMessage.set(
      `${result.importedRows} alumnos fueron registrados correctamente.`
    );
    this.clearSelectedFile();
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

    return 'carga-inicial-alumnos.xlsx';
  }

  private resolveErrorMessage(
    error: HttpErrorResponse
  ): string {
    if (error.status === 409) {
      return 'El ciclo escolar no está activo o todavía no tiene grupos activos.';
    }

    if (error.status === 404) {
      return 'No fue posible encontrar el ciclo escolar seleccionado.';
    }

    if (error.status === 403) {
      return 'No tienes permiso para realizar la carga inicial.';
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
