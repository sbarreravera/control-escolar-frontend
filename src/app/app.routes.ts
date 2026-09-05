import { Routes } from '@angular/router';
import { authGuard } from './core/auth/auth.guard';
import { roleGuard } from './core/auth/role.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full'
  },
  {
    path: '',
    loadComponent: () =>
      import('./layout')
        .then(module => module.DefaultLayoutComponent),
    canActivate: [
      authGuard
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