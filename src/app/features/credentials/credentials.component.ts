import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  Component,
  computed,
  inject,
  OnInit,
  signal
} from '@angular/core';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import {
  ButtonDirective,
  CardBodyComponent,
  CardComponent,
  CardHeaderComponent,
  ColComponent,
  FormDirective,
  RowComponent
} from '@coreui/angular';
import QRCode from 'qrcode';
import { finalize, firstValueFrom } from 'rxjs';
import {
  AuthService
} from '../../core/auth/auth.service';
import {
  Student
} from '../students/student.models';
import {
  StudentService
} from '../students/student.service';
import {
  BulkCredential,
  Credential
} from './credential.models';
import {
  CredentialService
} from './credential.service';
import {
  createZipBlob,
  dataUrlToBytes,
  ZipFileEntry
} from './zip-download.util';

@Component({
  selector: 'app-credentials',
  templateUrl: './credentials.component.html',
  imports: [
    DatePipe,
    ReactiveFormsModule,
    RowComponent,
    ColComponent,
    CardComponent,
    CardHeaderComponent,
    CardBodyComponent,
    FormDirective,
    ButtonDirective
  ]
})
export class CredentialsComponent implements OnInit {

  private readonly formBuilder = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly studentService = inject(StudentService);
  private readonly credentialService =
    inject(CredentialService);

  readonly students = signal<Student[]>([]);
  readonly selectedStudent =
    signal<Student | null>(null);
  readonly credential =
    signal<Credential | null>(null);
  readonly qrDataUrl = signal<string | null>(null);

  readonly loadingStudents = signal(true);
  readonly loadingCredential = signal(false);
  readonly processing = signal(false);
  readonly bulkProcessing = signal(false);

  readonly errorMessage = signal<string | null>(null);
  readonly successMessage =
    signal<string | null>(null);

  readonly schoolName = computed(
    () =>
      this.authService.currentUser()?.schoolName ??
      'Tu escuela'
  );

  readonly activeStudentCount = computed(
    () => this.students().filter(student => student.active).length
  );

  readonly credentialForm = this.formBuilder.group({
    studentId: [
      null as number | null,
      [
        Validators.required
      ]
    ]
  });

  ngOnInit(): void {
    this.loadStudents();
  }

  loadStudents(): void {
    const schoolId =
      this.authService.currentUser()?.schoolId;

    if (schoolId === null || schoolId === undefined) {
      this.loadingStudents.set(false);
      this.errorMessage.set(
        'Tu usuario no tiene una escuela asignada.'
      );
      return;
    }

    this.loadingStudents.set(true);
    this.errorMessage.set(null);

    this.studentService
      .findAllBySchool(schoolId)
      .pipe(
        finalize(
          () => this.loadingStudents.set(false)
        )
      )
      .subscribe({
        next: students => {
          this.students.set(students);
        },
        error: (error: HttpErrorResponse) => {
          this.errorMessage.set(
            this.resolveErrorMessage(error)
          );
        }
      });
  }

  loadActiveCredential(): void {
    const studentId =
      this.credentialForm.controls.studentId.value;

    this.credential.set(null);
    this.qrDataUrl.set(null);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    const student = this.students().find(
      item => item.id === studentId
    );

    this.selectedStudent.set(student ?? null);

    if (studentId === null) {
      return;
    }

    this.loadingCredential.set(true);

    this.credentialService
      .findActive(studentId)
      .pipe(
        finalize(
          () => this.loadingCredential.set(false)
        )
      )
      .subscribe({
        next: credential => {
          if (
            this.credentialForm.controls.studentId.value ===
            studentId
          ) {
            this.showCredential(credential);
          }
        },
        error: (error: HttpErrorResponse) => {
          if (error.status === 404) {
            this.credential.set(null);
            this.qrDataUrl.set(null);
            return;
          }

          this.errorMessage.set(
            this.resolveErrorMessage(error)
          );
        }
      });
  }

  createCredential(): void {
    const studentId =
      this.credentialForm.controls.studentId.value;

    if (studentId === null) {
      this.credentialForm.markAllAsTouched();
      return;
    }

    this.processing.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    this.credentialService
      .create(studentId)
      .pipe(
        finalize(() => this.processing.set(false))
      )
      .subscribe({
        next: credential => {
          this.showCredential(credential);
          this.successMessage.set(
            'La credencial QR fue generada correctamente.'
          );
        },
        error: (error: HttpErrorResponse) => {
          this.errorMessage.set(
            this.resolveErrorMessage(error)
          );
        }
      });
  }

  async downloadAllQr(): Promise<void> {
    const schoolId = this.authService.currentUser()?.schoolId;

    if (schoolId === null || schoolId === undefined) {
      this.errorMessage.set(
        'Tu usuario no tiene una escuela asignada.'
      );
      return;
    }

    if (this.activeStudentCount() === 0) {
      this.errorMessage.set(
        'No hay alumnos activos para generar credenciales QR.'
      );
      return;
    }

    this.bulkProcessing.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    try {
      const credentials = await firstValueFrom(
        this.credentialService.ensureActiveForSchool(schoolId)
      );

      if (credentials.length === 0) {
        this.errorMessage.set(
          'No hay alumnos activos para generar credenciales QR.'
        );
        return;
      }

      const entries: ZipFileEntry[] = [];

      for (const credential of credentials) {
        const dataUrl = await this.generateQrDataUrl(
          credential.qrToken
        );
        entries.push({
          name: this.bulkQrFileName(credential),
          data: dataUrlToBytes(dataUrl)
        });
      }

      const zip = createZipBlob(entries);
      const zipName =
        `credenciales-qr-${this.safeFilePart(this.schoolName())}.zip`;
      this.downloadBlob(zip, zipName);

      const createdCount = credentials.filter(
        credential => credential.created
      ).length;

      this.successMessage.set(
        createdCount > 0
          ? `Se prepararon ${credentials.length} códigos QR y se crearon ${createdCount} credenciales nuevas. La descarga ZIP comenzó automáticamente.`
          : `Se prepararon ${credentials.length} códigos QR usando las credenciales activas existentes. La descarga ZIP comenzó automáticamente.`
      );
    } catch (error: unknown) {
      if (error instanceof HttpErrorResponse) {
        this.errorMessage.set(this.resolveErrorMessage(error));
      } else {
        this.errorMessage.set(
          'No fue posible generar el archivo ZIP de credenciales QR.'
        );
      }
    } finally {
      this.bulkProcessing.set(false);
    }
  }

  regenerateCredential(): void {
    const studentId =
      this.credentialForm.controls.studentId.value;

    if (studentId === null) {
      return;
    }

    const confirmed = window.confirm(
      'La credencial actual dejará de funcionar. ¿Deseas generar una nueva?'
    );

    if (!confirmed) {
      return;
    }

    this.processing.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    this.credentialService
      .regenerate(studentId)
      .pipe(
        finalize(() => this.processing.set(false))
      )
      .subscribe({
        next: credential => {
          this.showCredential(credential);
          this.successMessage.set(
            'La credencial QR fue regenerada correctamente.'
          );
        },
        error: (error: HttpErrorResponse) => {
          this.errorMessage.set(
            this.resolveErrorMessage(error)
          );
        }
      });
  }

  deactivateCredential(): void {
    const currentCredential = this.credential();

    if (!currentCredential) {
      return;
    }

    const confirmed = window.confirm(
      'El código QR dejará de funcionar. ¿Deseas desactivar esta credencial?'
    );

    if (!confirmed) {
      return;
    }

    this.processing.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    this.credentialService
      .deactivate(currentCredential.id)
      .pipe(
        finalize(() => this.processing.set(false))
      )
      .subscribe({
        next: () => {
          this.credential.set(null);
          this.qrDataUrl.set(null);
          this.successMessage.set(
            'La credencial fue desactivada correctamente.'
          );
        },
        error: (error: HttpErrorResponse) => {
          this.errorMessage.set(
            this.resolveErrorMessage(error)
          );
        }
      });
  }

  downloadQr(): void {
    const qrImage = this.qrDataUrl();
    const student = this.selectedStudent();

    if (!qrImage || !student) {
      return;
    }

    const safeEnrollment =
      student.enrollmentNumber.replace(
        /[^A-Za-z0-9_-]/g,
        '_'
      );

    const link = document.createElement('a');

    link.href = qrImage;
    link.download = `qr-${safeEnrollment}.png`;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  private showCredential(
    credential: Credential
  ): void {
    this.credential.set(credential);
    this.qrDataUrl.set(null);

    void this.generateQrDataUrl(credential.qrToken)
      .then(dataUrl => {
        if (
          this.credential()?.id === credential.id
        ) {
          this.qrDataUrl.set(dataUrl);
        }
      })
      .catch(() => {
        this.qrDataUrl.set(null);
        this.errorMessage.set(
          'La credencial fue guardada, pero no fue posible generar su imagen QR.'
        );
      });
  }

  private generateQrDataUrl(qrToken: string): Promise<string> {
    return QRCode.toDataURL(
      qrToken,
      {
        errorCorrectionLevel: 'H',
        width: 512,
        margin: 4,
        color: {
          dark: '#000000ff',
          light: '#ffffffff'
        }
      }
    );
  }

  private bulkQrFileName(credential: BulkCredential): string {
    return [
      credential.enrollmentNumber,
      this.firstWord(credential.firstName),
      this.firstWord(credential.lastName)
    ]
      .map(value => this.safeFilePart(value))
      .join('_') + '.png';
  }

  private firstWord(value: string): string {
    return value.trim().split(/\s+/)[0] ?? '';
  }

  private safeFilePart(value: string): string {
    const safeValue = value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^A-Za-z0-9_-]+/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_+|_+$/g, '');

    return safeValue || 'sin-dato';
  }

  private downloadBlob(blob: Blob, fileName: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  private resolveErrorMessage(
    error: HttpErrorResponse
  ): string {
    if (error.status === 409) {
      return 'El alumno ya tiene una credencial activa. Puedes regenerarla si necesitas reemplazarla.';
    }

    if (error.status === 403) {
      return 'No tienes permiso para administrar las credenciales solicitadas.';
    }

    if (error.status === 404) {
      return 'No se encontró el alumno solicitado.';
    }

    if (error.status === 0) {
      return 'No fue posible conectarse con el servidor.';
    }

    return 'Ocurrió un error al procesar la solicitud.';
  }
}
