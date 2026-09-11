import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { AcademicCycle } from '../academic-cycles/academic-cycle.models';
import { AcademicCycleService } from '../academic-cycles/academic-cycle.service';
import { SchoolGroup } from '../school-groups/school-group.models';
import { SchoolGroupService } from '../school-groups/school-group.service';
import { Student } from '../students/student.models';
import { StudentService } from '../students/student.service';
import {
  Communication,
  CommunicationAudiencePreview,
  CommunicationAudienceRequest,
  CommunicationAudienceType,
  CommunicationCategory,
  CommunicationPriority,
  CommunicationRecipient,
  CommunicationRecipientPushStatus,
  CommunicationStatus,
  CommunicationType,
  CreateCommunicationRequest,
  UpdateScheduledCommunicationRequest
} from './communication.models';
import { CommunicationService } from './communication.service';

interface CommunicationTemplate {
  label: string;
  category: CommunicationCategory;
  priority: CommunicationPriority;
  title: string;
  message: string;
}

@Component({
  selector: 'app-communications',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './communications.component.html',
  styleUrl: './communications.component.scss'
})
export class CommunicationsComponent implements OnInit {

  private readonly authService = inject(AuthService);
  private readonly communicationService = inject(CommunicationService);
  private readonly cycleService = inject(AcademicCycleService);
  private readonly groupService = inject(SchoolGroupService);
  private readonly studentService = inject(StudentService);

  readonly templates: CommunicationTemplate[] = [
    {
      label: 'Cambio de horario',
      category: 'SCHEDULE',
      priority: 'IMPORTANT',
      title: 'Cambio de horario',
      message: 'Les informamos que el horario escolar tendrá un ajuste. Por favor revisen la información indicada por la escuela.'
    },
    {
      label: 'Suspensión de clases',
      category: 'ACADEMIC',
      priority: 'URGENT',
      title: 'Suspensión de clases',
      message: 'Les informamos que las actividades escolares serán suspendidas. Favor de mantenerse atentos a las indicaciones de la escuela.'
    },
    {
      label: 'Junta de padres',
      category: 'REMINDER',
      priority: 'IMPORTANT',
      title: 'Junta de padres de familia',
      message: 'Les recordamos la próxima junta de padres de familia. Agradecemos su puntual asistencia.'
    },
    {
      label: 'Aviso climatológico',
      category: 'WEATHER',
      priority: 'URGENT',
      title: 'Aviso importante por condiciones climáticas',
      message: 'Debido a las condiciones climáticas, les pedimos mantenerse atentos a las indicaciones y cambios informados por la escuela.'
    },
    {
      label: 'Evento escolar',
      category: 'EVENT',
      priority: 'NORMAL',
      title: 'Próximo evento escolar',
      message: 'Les compartimos información importante sobre el próximo evento escolar. Esperamos contar con su participación.'
    }
  ];

  activeView: 'COMPOSE' | 'HISTORY' = 'COMPOSE';

  cycles: AcademicCycle[] = [];
  groups: SchoolGroup[] = [];
  students: Student[] = [];
  history: Communication[] = [];
  detailRecipients: CommunicationRecipient[] = [];
  selectedDetail: Communication | null = null;

  type: CommunicationType = 'GENERAL_NOTICE';
  category: CommunicationCategory = 'GENERAL';
  priority: CommunicationPriority = 'NORMAL';
  title = '';
  message = '';
  requiresAcknowledgement = false;

  audienceType: CommunicationAudienceType = 'ALL_SCHOOL';
  academicCycleId: number | null = null;
  selectedGrades = new Set<string>();
  selectedGroupIds = new Set<number>();
  selectedStudentIds = new Set<number>();
  studentSearch = '';

  deliveryMode: 'NOW' | 'SCHEDULED' = 'NOW';
  scheduledAt = '';
  preview: CommunicationAudiencePreview | null = null;

  loadingInitial = true;
  loadingGroups = false;
  loadingPreview = false;
  saving = false;
  loadingHistory = false;
  loadingDetail = false;

  editingScheduledId: number | null = null;
  editingAudienceSummary = '';

  successMessage: string | null = null;
  errorMessage: string | null = null;

  get schoolId(): number | null {
    return this.authService.currentUser()?.schoolId ?? null;
  }

  get schoolName(): string {
    return this.authService.currentUser()?.schoolName ?? 'tu escuela';
  }

  get availableGrades(): string[] {
    return Array.from(
      new Set(this.groups.map(group => group.gradeName))
    ).sort((a, b) => a.localeCompare(b, 'es'));
  }

  get visibleStudents(): Student[] {
    const search = this.studentSearch.trim().toLocaleLowerCase('es-MX');
    if (!search) {
      return this.students;
    }
    return this.students.filter(student =>
      `${student.firstName} ${student.lastName} ${student.enrollmentNumber}`
        .toLocaleLowerCase('es-MX')
        .includes(search)
    );
  }

  get publishedCount(): number {
    return this.history.filter(item => item.status === 'PUBLISHED').length;
  }

  get scheduledCount(): number {
    return this.history.filter(item => item.status === 'SCHEDULED').length;
  }

  get sentThisMonthCount(): number {
    const now = new Date();
    return this.history.filter(item => {
      if (!item.publishedAt) {
        return false;
      }
      const date = new Date(item.publishedAt);
      return date.getFullYear() === now.getFullYear()
        && date.getMonth() === now.getMonth();
    }).length;
  }

  ngOnInit(): void {
    const schoolId = this.schoolId;
    if (schoolId === null) {
      this.loadingInitial = false;
      this.errorMessage = 'Tu usuario no tiene una escuela asignada.';
      return;
    }

    forkJoin({
      cycles: this.cycleService.findAllBySchool(schoolId),
      students: this.studentService.findAllBySchool(schoolId),
      history: this.communicationService.findHistory(schoolId)
    }).subscribe({
      next: result => {
        this.cycles = result.cycles;
        this.students = result.students.filter(student => student.active);
        this.history = result.history;
        this.academicCycleId =
          this.cycles.find(cycle => cycle.active)?.id
          ?? this.cycles[0]?.id
          ?? null;
        if (this.academicCycleId !== null) {
          this.loadGroups(this.academicCycleId);
        }
        this.loadingInitial = false;
      },
      error: error => {
        this.loadingInitial = false;
        this.errorMessage = this.resolveError(error);
      }
    });
  }

  setView(view: 'COMPOSE' | 'HISTORY'): void {
    this.activeView = view;
    this.successMessage = null;
    this.errorMessage = null;
    if (view === 'HISTORY') {
      this.refreshHistory();
    }
  }

  onTypeChange(): void {
    if (this.type === 'EXPRESS_ALERT') {
      this.priority = 'URGENT';
      this.deliveryMode = 'NOW';
      this.scheduledAt = '';
    }
  }

  applyTemplate(template: CommunicationTemplate): void {
    this.category = template.category;
    this.priority = template.priority;
    this.title = template.title;
    this.message = template.message;
  }

  onAudienceTypeChange(): void {
    this.selectedGrades.clear();
    this.selectedGroupIds.clear();
    this.selectedStudentIds.clear();
    this.invalidatePreview();
    if (
      this.audienceType !== 'ALL_SCHOOL'
      && this.audienceType !== 'STUDENTS'
      && this.academicCycleId !== null
    ) {
      this.loadGroups(this.academicCycleId);
    }
  }

  onCycleChange(): void {
    this.selectedGrades.clear();
    this.selectedGroupIds.clear();
    this.invalidatePreview();
    if (this.academicCycleId !== null) {
      this.loadGroups(this.academicCycleId);
    } else {
      this.groups = [];
    }
  }

  toggleGrade(grade: string, checked: boolean): void {
    checked
      ? this.selectedGrades.add(grade)
      : this.selectedGrades.delete(grade);
    this.invalidatePreview();
  }

  toggleGroup(groupId: number, checked: boolean): void {
    checked
      ? this.selectedGroupIds.add(groupId)
      : this.selectedGroupIds.delete(groupId);
    this.invalidatePreview();
  }

  toggleStudent(studentId: number, checked: boolean): void {
    checked
      ? this.selectedStudentIds.add(studentId)
      : this.selectedStudentIds.delete(studentId);
    this.invalidatePreview();
  }

  previewAudience(): void {
    const audience = this.buildAudience();
    if (!audience) {
      return;
    }

    this.loadingPreview = true;
    this.errorMessage = null;
    this.communicationService.preview(audience).subscribe({
      next: preview => {
        this.preview = preview;
        this.loadingPreview = false;
      },
      error: error => {
        this.loadingPreview = false;
        this.preview = null;
        this.errorMessage = this.resolveError(error);
      }
    });
  }

  save(): void {
    this.successMessage = null;
    this.errorMessage = null;

    if (!this.title.trim() || !this.message.trim()) {
      this.errorMessage = 'Escribe el título y el mensaje del aviso.';
      return;
    }

    if (this.editingScheduledId !== null) {
      this.updateScheduled();
      return;
    }

    const audience = this.buildAudience();
    if (!audience || this.preview === null) {
      this.errorMessage = 'Revisa primero el alcance de destinatarios.';
      return;
    }
    if (this.preview.guardians === 0) {
      this.errorMessage = 'La selección no contiene tutores destinatarios.';
      return;
    }

    const scheduledAt = this.deliveryMode === 'SCHEDULED'
      ? this.toIsoDate(this.scheduledAt)
      : null;
    if (this.deliveryMode === 'SCHEDULED' && scheduledAt === null) {
      this.errorMessage = 'Selecciona una fecha y hora futura.';
      return;
    }

    const action = this.deliveryMode === 'NOW'
      ? 'enviar ahora'
      : 'programar';
    if (!window.confirm(
      `Se va a ${action} este aviso para ${this.preview.guardians} tutor(es). ¿Deseas continuar?`
    )) {
      return;
    }

    const request: CreateCommunicationRequest = {
      type: this.type,
      category: this.category,
      priority: this.priority,
      title: this.title.trim(),
      message: this.message.trim(),
      requiresAcknowledgement: this.requiresAcknowledgement,
      audience,
      scheduledAt
    };

    this.saving = true;
    this.communicationService.create(request).subscribe({
      next: result => {
        this.saving = false;
        this.successMessage = result.status === 'PUBLISHED'
          ? `Aviso publicado para ${result.recipientCount} tutor(es).`
          : 'Aviso programado correctamente.';
        this.resetForm(false);
        this.refreshHistory();
      },
      error: error => {
        this.saving = false;
        this.errorMessage = this.resolveError(error);
      }
    });
  }

  editScheduled(item: Communication): void {
    if (item.status !== 'SCHEDULED') {
      return;
    }
    this.activeView = 'COMPOSE';
    this.editingScheduledId = item.id;
    this.editingAudienceSummary = item.audienceSummary;
    this.type = item.type;
    this.category = item.category;
    this.priority = item.priority;
    this.title = item.title;
    this.message = item.message;
    this.requiresAcknowledgement = item.requiresAcknowledgement;
    this.deliveryMode = 'SCHEDULED';
    this.scheduledAt = item.scheduledAt
      ? this.toDateTimeLocal(item.scheduledAt)
      : '';
    this.preview = {
      students: item.studentCount,
      guardians: item.recipientCount,
      guardiansWithPush: item.pushRecipientCount,
      guardiansWithoutPush:
        item.recipientCount - item.pushRecipientCount,
      audienceSummary: item.audienceSummary
    };
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  cancelEditing(): void {
    this.resetForm(false);
  }

  duplicate(item: Communication): void {
    this.activeView = 'COMPOSE';
    this.resetForm(false);
    this.type = item.type;
    this.category = item.category;
    this.priority = item.priority;
    this.title = item.title.startsWith('COPIA - ')
      ? item.title
      : `COPIA - ${item.title}`;
    this.message = item.message;
    this.requiresAcknowledgement = item.requiresAcknowledgement;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  cancelScheduled(item: Communication): void {
    if (item.status !== 'SCHEDULED') {
      return;
    }
    if (!window.confirm(
      `¿Cancelar el aviso programado “${item.title}”?`
    )) {
      return;
    }
    this.communicationService.cancel(item.id).subscribe({
      next: () => {
        this.successMessage = 'El aviso programado fue cancelado.';
        this.refreshHistory();
      },
      error: error => this.errorMessage = this.resolveError(error)
    });
  }

  openDetail(item: Communication): void {
    this.selectedDetail = item;
    this.detailRecipients = [];
    this.loadingDetail = true;
    this.communicationService.findRecipients(item.id).subscribe({
      next: recipients => {
        this.detailRecipients = recipients;
        this.loadingDetail = false;
      },
      error: error => {
        this.loadingDetail = false;
        this.errorMessage = this.resolveError(error);
      }
    });
  }

  closeDetail(): void {
    this.selectedDetail = null;
    this.detailRecipients = [];
  }

  refreshHistory(): void {
    const schoolId = this.schoolId;
    if (schoolId === null || this.loadingHistory) {
      return;
    }
    this.loadingHistory = true;
    this.communicationService.findHistory(schoolId).subscribe({
      next: history => {
        this.history = history;
        this.loadingHistory = false;
        if (this.selectedDetail) {
          this.selectedDetail = history.find(
            item => item.id === this.selectedDetail?.id
          ) ?? null;
        }
      },
      error: error => {
        this.loadingHistory = false;
        this.errorMessage = this.resolveError(error);
      }
    });
  }

  statusLabel(status: CommunicationStatus): string {
    return {
      PUBLISHED: 'Publicado',
      SCHEDULED: 'Programado',
      CANCELLED: 'Cancelado'
    }[status];
  }

  typeLabel(type: CommunicationType): string {
    return type === 'GENERAL_NOTICE'
      ? 'Aviso general'
      : 'Alerta express';
  }

  priorityLabel(priority: CommunicationPriority): string {
    return {
      NORMAL: 'Normal',
      IMPORTANT: 'Importante',
      URGENT: 'Urgente'
    }[priority];
  }

  pushStatusLabel(status: CommunicationRecipientPushStatus): string {
    return {
      NOT_ENABLED: 'Sin push',
      PENDING: 'Pendiente',
      SENT: 'Enviado',
      FAILED: 'Falló'
    }[status];
  }

  formatDate(value: string | null): string {
    if (!value) {
      return '—';
    }
    return new Intl.DateTimeFormat('es-MX', {
      dateStyle: 'medium',
      timeStyle: 'short'
    }).format(new Date(value));
  }

  private updateScheduled(): void {
    const communicationId = this.editingScheduledId;
    const scheduledAt = this.toIsoDate(this.scheduledAt);
    if (communicationId === null || scheduledAt === null) {
      this.errorMessage = 'Selecciona una fecha y hora futura.';
      return;
    }

    const request: UpdateScheduledCommunicationRequest = {
      type: this.type,
      category: this.category,
      priority: this.priority,
      title: this.title.trim(),
      message: this.message.trim(),
      requiresAcknowledgement: this.requiresAcknowledgement,
      scheduledAt
    };

    this.saving = true;
    this.communicationService.updateScheduled(
      communicationId,
      request
    ).subscribe({
      next: () => {
        this.saving = false;
        this.successMessage = 'Aviso programado actualizado.';
        this.resetForm(false);
        this.refreshHistory();
      },
      error: error => {
        this.saving = false;
        this.errorMessage = this.resolveError(error);
      }
    });
  }

  private loadGroups(cycleId: number): void {
    this.loadingGroups = true;
    this.groupService.findAllByAcademicCycle(cycleId).subscribe({
      next: groups => {
        this.groups = groups.filter(group => group.active);
        this.loadingGroups = false;
      },
      error: error => {
        this.groups = [];
        this.loadingGroups = false;
        this.errorMessage = this.resolveError(error);
      }
    });
  }

  private buildAudience(): CommunicationAudienceRequest | null {
    const schoolId = this.schoolId;
    if (schoolId === null) {
      this.errorMessage = 'Tu usuario no tiene una escuela asignada.';
      return null;
    }

    if (
      ['CYCLE', 'GRADES', 'GROUPS'].includes(this.audienceType)
      && this.academicCycleId === null
    ) {
      this.errorMessage = 'Selecciona un ciclo escolar.';
      return null;
    }
    if (this.audienceType === 'GRADES' && this.selectedGrades.size === 0) {
      this.errorMessage = 'Selecciona al menos un grado.';
      return null;
    }
    if (this.audienceType === 'GROUPS' && this.selectedGroupIds.size === 0) {
      this.errorMessage = 'Selecciona al menos un grupo.';
      return null;
    }
    if (this.audienceType === 'STUDENTS' && this.selectedStudentIds.size === 0) {
      this.errorMessage = 'Selecciona al menos un alumno.';
      return null;
    }

    return {
      schoolId,
      audienceType: this.audienceType,
      academicCycleId: this.academicCycleId,
      gradeNames: Array.from(this.selectedGrades),
      schoolGroupIds: Array.from(this.selectedGroupIds),
      studentIds: Array.from(this.selectedStudentIds)
    };
  }

  private invalidatePreview(): void {
    this.preview = null;
    this.successMessage = null;
  }

  private resetForm(clearMessages = true): void {
    this.editingScheduledId = null;
    this.editingAudienceSummary = '';
    this.type = 'GENERAL_NOTICE';
    this.category = 'GENERAL';
    this.priority = 'NORMAL';
    this.title = '';
    this.message = '';
    this.requiresAcknowledgement = false;
    this.audienceType = 'ALL_SCHOOL';
    this.selectedGrades.clear();
    this.selectedGroupIds.clear();
    this.selectedStudentIds.clear();
    this.studentSearch = '';
    this.deliveryMode = 'NOW';
    this.scheduledAt = '';
    this.preview = null;
    if (clearMessages) {
      this.successMessage = null;
      this.errorMessage = null;
    }
  }

  private toIsoDate(value: string): string | null {
    if (!value) {
      return null;
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime()) || date.getTime() <= Date.now()) {
      return null;
    }
    return date.toISOString();
  }

  private toDateTimeLocal(value: string): string {
    const date = new Date(value);
    const offset = date.getTimezoneOffset() * 60_000;
    return new Date(date.getTime() - offset)
      .toISOString()
      .slice(0, 16);
  }

  private resolveError(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      const message = error.error?.message
        ?? error.error?.detail
        ?? error.error?.error;
      if (typeof message === 'string' && message.trim()) {
        return message;
      }
      if (error.status === 0) {
        return 'No fue posible conectarse con el servidor.';
      }
    }
    return 'No fue posible completar la operación.';
  }
}
