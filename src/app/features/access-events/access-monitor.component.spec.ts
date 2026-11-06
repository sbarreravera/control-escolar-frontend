import { signal } from '@angular/core';
import { TestBed, ComponentFixture } from '@angular/core/testing';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { AuthService } from '../../core/auth/auth.service';
import { AccessMonitorPage } from './access-monitor.models';
import { AccessMonitorService } from './access-monitor.service';
import { AccessMonitorComponent } from './access-monitor.component';

describe('AccessMonitorComponent', () => {
  let component: AccessMonitorComponent;
  let fixture: ComponentFixture<AccessMonitorComponent>;

  const currentUser = signal({
    id: 2,
    schoolId: 44,
    schoolName: 'Escuela 44',
    fullName: 'Administrador',
    email: 'admin@example.test',
    role: 'ADMIN' as const,
    moduleKeys: ['ACCESS_MONITOR']
  });

  const page: AccessMonitorPage = {
    date: '2026-11-06',
    content: [{
      id: 88,
      studentId: 18,
      studentName: 'Ana Pérez',
      enrollmentNumber: '261018',
      academicCycleName: '2026-2027',
      gradeName: '1',
      groupName: 'A',
      eventType: 'ENTRY',
      captureMethod: 'QR_USB',
      occurredAt: '2026-11-06T07:35:00-06:00',
      deviceName: 'Entrada principal'
    }],
    page: 0,
    size: 25,
    totalElements: 1,
    totalPages: 1,
    first: true,
    last: true
  };

  const service = {
    findPage: vi.fn(() => of(page)),
    findFilters: vi.fn(() => of({
      cycles: [
        { id: 20, name: '2026-2027', active: true },
        { id: 19, name: '2025-2026', active: false }
      ],
      groups: [
        { id: 31, academicCycleId: 20, gradeName: '1', groupName: 'A', active: true },
        { id: 32, academicCycleId: 20, gradeName: '1', groupName: 'B', active: true },
        { id: 22, academicCycleId: 19, gradeName: '2', groupName: 'C', active: false }
      ]
    }))
  };

  beforeEach(async () => {
    service.findPage.mockClear();
    service.findFilters.mockClear();

    await TestBed.configureTestingModule({
      imports: [AccessMonitorComponent],
      providers: [
        { provide: AuthService, useValue: { currentUser: currentUser.asReadonly() } },
        { provide: AccessMonitorService, useValue: service }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(AccessMonitorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('starts with the current school day and limits all calls to its school', () => {
    expect(component.filterForm.controls.date.value).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(service.findPage).toHaveBeenCalledWith(
      expect.objectContaining({ schoolId: 44, page: 0, size: 25 })
    );
    expect(service.findFilters).toHaveBeenCalledWith(44);
    expect(component.items()[0].studentName).toBe('Ana Pérez');
    expect(component.formatTime('2026-11-06T07:35:00-06:00'))
      .toContain('07:35');
  });

  it('filters by school cycle, dependent grade/group, date and movement', () => {
    component.filterForm.controls.academicCycleId.setValue(20);
    component.onCycleChange();
    expect(component.availableGroups().map(group => group.id)).toEqual([31, 32]);

    component.filterForm.controls.schoolGroupId.setValue(32);
    component.onFilterChange();
    component.filterForm.controls.eventType.setValue('EXIT');
    component.onFilterChange();
    component.filterForm.controls.date.setValue('2026-11-05');
    component.onDateChange();

    expect(service.findPage).toHaveBeenLastCalledWith(
      expect.objectContaining({
        date: '2026-11-05',
        academicCycleId: 20,
        schoolGroupId: 32,
        eventType: 'EXIT',
        page: 0
      })
    );

    component.filterForm.controls.academicCycleId.setValue(19);
    component.onCycleChange();
    expect(component.filterForm.controls.schoolGroupId.value).toBe(0);
    expect(component.availableGroups().map(group => group.id)).toEqual([22]);
  });

  it('resets filters without creating a new access event', () => {
    component.filterForm.controls.eventType.setValue('ENTRY');
    component.onFilterChange();
    expect(component.hasFilters()).toBe(true);
    component.clearFilters();
    expect(component.hasFilters()).toBe(false);
    expect(component.filterForm.controls.eventType.value).toBe('all');
    expect(component.items()).toHaveLength(1);
    expect(component.eventLabel('ENTRY')).toBe('Entrada');
    expect(component.eventLabel('EXIT')).toBe('Salida');
  });
});
