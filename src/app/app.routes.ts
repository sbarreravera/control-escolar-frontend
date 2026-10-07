import { Routes } from '@angular/router';
import { authGuard } from './core/auth/auth.guard';
import { moduleGuard } from './core/auth/module.guard';
import { roleGuard } from './core/auth/role.guard';
import {
  scanModeGuard
} from './core/scan-mode/scan-mode.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full'
  },
  {
    path: 'activate-notifications',
    loadComponent: () =>
      import(
        './features/guardian-device-enrollment/guardian-device-enrollment.component'
      ).then(
        module =>
          module.GuardianDeviceEnrollmentComponent
      ),
    data: {
      title: 'Activar notificaciones'
    }
  },
  {
    path: 'guardian/activate',
    loadComponent: () =>
      import(
        './features/guardian-device-enrollment/guardian-device-enrollment.component'
      ).then(
        module => module.GuardianDeviceEnrollmentComponent
      ),
    data: {
      title: 'Activar acceso del tutor'
    }
  },
  {
    path: 'guardian/reset-password',
    loadComponent: () =>
      import(
        './features/guardian-device-enrollment/guardian-device-enrollment.component'
      ).then(
        module => module.GuardianDeviceEnrollmentComponent
      ),
    data: {
      title: 'Restablecer contraseña de tutor'
    }
  },
  {
    path: 'guardian/recover-password',
    loadComponent: () =>
      import(
        './features/guardian-login/guardian-password-recovery.component'
      ).then(
        module => module.GuardianPasswordRecoveryComponent
      ),
    data: {
      title: 'Recuperar contraseña de tutor'
    }
  },
  {
    path: 'guardian/login',
    loadComponent: () =>
      import(
        './features/guardian-login/guardian-login.component'
      ).then(module => module.GuardianLoginComponent),
    data: {
      title: 'Iniciar sesión como tutor'
    }
  },
  {
    path: 'guardian/register',
    loadComponent: () =>
      import(
        './features/guardian-registration/guardian-registration.component'
      ).then(module => module.GuardianRegistrationComponent),
    data: {
      title: 'Registro de tutor'
    }
  },
  {
    path: 'guardian/communications',
    loadComponent: () =>
      import(
        './features/guardian-communications/guardian-communications.component'
      ).then(module => module.GuardianCommunicationsComponent),
    data: {
      title: 'Avisos de la escuela'
    }
  },
  {
    path: 'guardian',
    loadComponent: () =>
      import(
        './features/guardian-home/guardian-home.component'
      ).then(module => module.GuardianHomeComponent),
    data: {
      title: 'Acceso del tutor'
    }
  },
  {
    path: '',
    loadComponent: () =>
      import('./layout')
        .then(module => module.DefaultLayoutComponent),
    canActivate: [
      authGuard
    ],
    canActivateChild: [
      scanModeGuard
    ],
    data: {
      title: 'Inicio'
    },
    children: [
      {
        path: 'dashboard',
        loadChildren: () =>
          import('./views/dashboard/routes')
            .then(module => module.routes),
        canActivate: [
          moduleGuard
        ],
        data: {
          title: 'Inicio',
          moduleKey: 'DASHBOARD'
        }
      },
      {
        path: 'schools',
        loadComponent: () =>
          import('./features/schools/schools.component')
            .then(module => module.SchoolsComponent),
        canActivate: [
          roleGuard
        ],
        data: {
          title: 'Escuelas',
          roles: [
            'SUPER_ADMIN'
          ]
        }
      },
      {
        path: 'academic-cycles',
        loadComponent: () =>
          import(
            './features/academic-cycles/academic-cycles.component'
          ).then(
            module => module.AcademicCyclesComponent
          ),
        canActivate: [
          moduleGuard
        ],
        data: {
          title: 'Ciclos escolares',
          moduleKey: 'ACADEMIC_STRUCTURE'
        }
      },
      {
        path: 'school-groups',
        loadComponent: () =>
          import(
            './features/school-groups/school-groups.component'
          ).then(
            module => module.SchoolGroupsComponent
          ),
        canActivate: [
          moduleGuard
        ],
        data: {
          title: 'Grados y grupos',
          moduleKey: 'ACADEMIC_STRUCTURE'
        }
      },
      {
        path: 'students',
        loadComponent: () =>
          import('./features/students/students.component')
            .then(module => module.StudentsComponent),
        canActivate: [
          moduleGuard
        ],
        data: {
          title: 'Alumnos',
          moduleKey: 'STUDENTS'
        }
      },
      {
        path: 'student-import',
        loadComponent: () =>
          import(
            './features/student-import/student-import.component'
          ).then(
            module => module.StudentImportComponent
          ),
        canActivate: [
          moduleGuard
        ],
        data: {
          title: 'Carga inicial',
          moduleKey: 'STUDENTS'
        }
      },
      {
        path: 'guardians',
        loadComponent: () =>
          import('./features/guardians/guardians.component')
            .then(module => module.GuardiansComponent),
        canActivate: [
          moduleGuard
        ],
        data: {
          title: 'Tutores',
          moduleKey: 'GUARDIANS'
        }
      },
      {
        path: 'guardian-import',
        loadComponent: () =>
          import(
            './features/guardian-import/guardian-import.component'
          ).then(
            module => module.GuardianImportComponent
          ),
        canActivate: [
          moduleGuard
        ],
        data: {
          title: 'Carga de tutores',
          moduleKey: 'GUARDIANS'
        }
      },
      {
        path: 'guardian-activation',
        loadComponent: () =>
          import(
            './features/guardian-activation/guardian-activation.component'
          ).then(
            module => module.GuardianActivationComponent
          ),
        canActivate: [
          moduleGuard
        ],
        data: {
          title: 'Activación de tutores',
          moduleKey: 'GUARDIAN_ACCESS'
        }
      },
      {
        path: 'guardian-registration-settings',
        loadComponent: () =>
          import(
            './features/guardian-registration/guardian-registration-settings.component'
          ).then(
            module => module.GuardianRegistrationSettingsComponent
          ),
        canActivate: [
          moduleGuard
        ],
        data: {
          title: 'Autoregistro de tutores',
          moduleKey: 'GUARDIAN_REGISTRATION'
        }
      },
      {
        path: 'communications',
        loadComponent: () =>
          import(
            './features/communications/communications.component'
          ).then(module => module.CommunicationsComponent),
        canActivate: [
          moduleGuard
        ],
        data: {
          title: 'Avisos y comunicaciones',
          moduleKey: 'COMMUNICATIONS'
        }
      },
      {
        path: 'credentials',
        loadComponent: () =>
          import('./features/credentials/credentials.component')
            .then(module => module.CredentialsComponent),
        canActivate: [
          moduleGuard
        ],
        data: {
          title: 'Credenciales QR',
          moduleKey: 'CREDENTIALS'
        }
      },
 Routes } from '@angular/router';
import { authGuard } from './core/auth/auth.guard';
import { moduleGuard } from './core/auth/module.guard';
import { roleGuard } from './core/auth/role.guard';
import {
  scanModeGuard
} from './core/scan-mode/scan-mode.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full'
  },
  {
    path: 'activate-notifications',
    loadComponent: () =>
      import(
        './features/guardian-device-enrollment/guardian-device-enrollment.component'
      ).then(
        module =>
          module.GuardianDeviceEnrollmentComponent
      ),
    data: {
      title: 'Activar notificaciones'
    }
  },
  {
    path: 'guardian/activate',
    loadComponent: () =>
      import(
        './features/guardian-device-enrollment/guardian-device-enrollment.component'
      ).then(
        module => module.GuardianDeviceEnrollmentComponent
      ),
    data: {
      title: 'Activar acceso del tutor'
    }
  },
  {
    path: 'guardian/reset-password',
    loadComponent: () =>
      import(
        './features/guardian-device-enrollment/guardian-device-enrollment.component'
      ).then(
        module => module.GuardianDeviceEnrollmentComponent
      ),
    data: {
      title: 'Restablecer contraseña de tutor'
    }
  },
  {
    path: 'guardian/recover-password',
    loadComponent: () =>
      import(
        './features/guardian-login/guardian-password-recovery.component'
      ).then(
        module => module.GuardianPasswordRecoveryComponent
      ),
    data: {
      title: 'Recuperar contraseña de tutor'
    }
  },
  {
    path: 'guardian/login',
    loadComponent: () =>
      import(
        './features/guardian-login/guardian-login.component'
      ).then(module => module.GuardianLoginComponent),
    data: {
      title: 'Iniciar sesión como tutor'
    }
  },
  {
    path: 'guardian/register',
    loadComponent: () =>
      import(
        './features/guardian-registration/guardian-registration.component'
      ).then(module => module.GuardianRegistrationComponent),
    data: {
      title: 'Registro de tutor'
    }
  },
  {
    path: 'guardian/communications',
    loadComponent: () =>
      import(
        './features/guardian-communications/guardian-communications.component'
      ).then(module => module.GuardianCommunicationsComponent),
    data: {
      title: 'Avisos de la escuela'
    }
  },
  {
    path: 'guardian',
    loadComponent: () =>
      import(
        './features/guardian-home/guardian-home.component'
      ).then(module => module.GuardianHomeComponent),
    data: {
      title: 'Acceso del tutor'
    }
  },
  {
    path: '',
    loadComponent: () =>
      import('./layout')
        .then(module => module.DefaultLayoutComponent),
    canActivate: [
      authGuard
    ],
    canActivateChild: [
      scanModeGuard
    ],
    data: {
      title: 'Inicio'
    },
    children: [
      {
        path: 'dashboard',
        loadChildren: () =>
          import('./views/dashboard/routes')
            .then(module => module.routes),
        canActivate: [
          moduleGuard
        ],
        data: {
          title: 'Inicio',
          moduleKey: 'DASHBOARD'
        }
      },
      {
        path: 'schools',
        loadComponent: () =>
          import('./features/schools/schools.component')
            .then(module => module.SchoolsComponent),
        canActivate: [
          roleGuard
        ],
        data: {
          title: 'Escuelas',
          roles: [
            'SUPER_ADMIN'
          ]
        }
      },
      {
        path: 'academic-cycles',
        loadComponent: () =>
          import(
            './features/academic-cycles/academic-cycles.component'
          ).then(
            module => module.AcademicCyclesComponent
          ),
        canActivate: [
          moduleGuard
        ],
        data: {
          title: 'Ciclos escolares',
          moduleKey: 'ACADEMIC_STRUCTURE'
        }
      },
      {
        path: 'school-groups',
        loadComponent: () =>
          import(
            './features/school-groups/school-groups.component'
          ).then(
            module => module.SchoolGroupsComponent
          ),
        canActivate: [
          moduleGuard
        ],
        data: {
          title: 'Grados y grupos',
          moduleKey: 'ACADEMIC_STRUCTURE'
        }
      },
      {
        path: 'students',
        loadComponent: () =>
          import('./features/students/students.component')
            .then(module => module.StudentsComponent),
        canActivate: [
          moduleGuard
        ],
        data: {
          title: 'Alumnos',
          moduleKey: 'STUDENTS'
        }
      },
      {
        path: 'student-import',
        loadComponent: () =>
          import(
            './features/student-import/student-import.component'
          ).then(
            module => module.StudentImportComponent
          ),
        canActivate: [
          moduleGuard
        ],
        data: {
          title: 'Carga inicial',
          moduleKey: 'STUDENTS'
        }
      },
      {
        path: 'guardians',
        loadComponent: () =>
          import('./features/guardians/guardians.component')
            .then(module => module.GuardiansComponent),
        canActivate: [
          moduleGuard
        ],
        data: {
          title: 'Tutores',
          moduleKey: 'GUARDIANS'
        }
      },
      {
        path: 'guardian-import',
        loadComponent: () =>
          import(
            './features/guardian-import/guardian-import.component'
          ).then(
            module => module.GuardianImportComponent
          ),
        canActivate: [
          moduleGuard
        ],
        data: {
          title: 'Carga de tutores',
          moduleKey: 'GUARDIANS'
        }
      },
      {
        path: 'guardian-activation',
        loadComponent: () =>
          import(
            './features/guardian-activation/guardian-activation.component'
          ).then(
            module => module.GuardianActivationComponent
          ),
        canActivate: [
          moduleGuard
        ],
        data: {
          title: 'Activación de tutores',
          moduleKey: 'GUARDIAN_ACCESS'
        }
      },
      {
        path: 'guardian-registration-settings',
        loadComponent: () =>
          import(
            './features/guardian-registration/guardian-registration-settings.component'
          ).then(
            module => module.GuardianRegistrationSettingsComponent
          ),
        canActivate: [
          moduleGuard
        ],
        data: {
          title: 'Autoregistro de tutores',
          moduleKey: 'GUARDIAN_REGISTRATION'
        }
      },
      {
        path: 'communications',
        loadComponent: () =>
          import(
            './features/communications/communications.component'
          ).then(module => module.CommunicationsComponent),
        canActivate: [
          moduleGuard
        ],
        data: {
          title: 'Avisos y comunicaciones',
          moduleKey: 'COMMUNICATIONS'
        }
      },
      {
        path: 'credentials',
        loadComponent: () =>
          import('./features/credentials/credentials.component')
            .then(module => module.CredentialsComponent),
        canActivate: [
          moduleGuard
        ],
        data: {
          title: 'Credenciales QR',
          moduleKey: 'CREDENTIALS'
        }
      },
      {
        path: 'access-scanner',
        loadComponent: () =>
          import(
            './features/access-events/access-scanner.component'
          ).then(
            module => module.AccessScannerComponent
          ),
        canActivate: [
          roleGuard
        ],
        data: {
          title: 'Registrar acceso',
          roles: [
            'ADMIN',
            'OPERATOR'
          ]
        }
      },
      {
        path: 'school-users',
        loadComponent: () =>
          import(
            './features/school-users/school-users.component'
          ).then(
            module => module.SchoolUsersComponent
          ),
        canActivate: [
          roleGuard
        ],
        data: {
          title: 'Usuarios del sistema',
          roles: [
            'ADMIN',
            'SUPER_ADMIN'
          ]
        }
      },
      {
        path: 'no-access',
        loadComponent: () =>
          import(
            './features/no-access/no-access.component'
          ).then(
            module => module.NoAccessComponent
          ),
        data: {
          title: 'Sin accesos asignados'
        }
      }
    ]
  },
  {
    path: '404',
    loadComponent: () =>
      import('./views/pages/page404/page404.component')
        .then(module => module.Page404Component),
    data: {
      title: 'Página no encontrada'
    }
  },
  {
    path: '500',
    loadComponent: () =>
      import('./views/pages/page500/page500.component')
        .then(module => module.Page500Component),
    data: {
      title: 'Error'
    }
  },
  {
    path: 'login',
    loadComponent: () =>
      import('./views/pages/login/login.component')
        .then(module => module.LoginComponent),
    data: {
      title: 'Iniciar sesión'
    }
  },
  {
    path: '**',
    redirectTo: 'dashboard'
  }
];
