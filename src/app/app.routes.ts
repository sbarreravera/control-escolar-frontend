import { Routes } from '@angular/router';
import { authGuard } from './core/auth/auth.guard';
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
            .then(module => module.routes)
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
          roleGuard
        ],
        data: {
          title: 'Ciclos escolares',
          roles: [
            'ADMIN'
          ]
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
          roleGuard
        ],
        data: {
          title: 'Grados y grupos',
          roles: [
            'ADMIN'
          ]
        }
      },
      {
        path: 'students',
        loadComponent: () =>
          import('./features/students/students.component')
            .then(module => module.StudentsComponent),
        canActivate: [
          roleGuard
        ],
        data: {
          title: 'Alumnos',
          roles: [
            'ADMIN',
            'OPERATOR'
          ]
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
          roleGuard
        ],
        data: {
          title: 'Carga inicial',
          roles: [
            'ADMIN'
          ]
        }
      },
      {
        path: 'guardians',
        loadComponent: () =>
          import('./features/guardians/guardians.component')
            .then(module => module.GuardiansComponent),
        canActivate: [
          roleGuard
        ],
        data: {
          title: 'Tutores',
          roles: [
            'ADMIN',
            'OPERATOR'
          ]
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
          roleGuard
        ],
        data: {
          title: 'Carga de tutores',
          roles: [
            'ADMIN'
          ]
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
          roleGuard
        ],
        data: {
          title: 'Activación de tutores',
          roles: [
            'ADMIN'
          ]
        }
      },
      {
        path: 'credentials',
        loadComponent: () =>
          import('./features/credentials/credentials.component')
            .then(module => module.CredentialsComponent),
        canActivate: [
          roleGuard
        ],
        data: {
          title: 'Credenciales QR',
          roles: [
            'ADMIN',
            'OPERATOR'
          ]
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
