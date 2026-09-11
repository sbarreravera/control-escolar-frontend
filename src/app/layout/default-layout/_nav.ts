import { INavData } from '@coreui/angular';
import {
  AppUserRole
} from '../../core/auth/auth.models';

export function buildNavItems(
  role: AppUserRole
): INavData[] {
  const items: INavData[] = [
    {
      name: 'Inicio',
      url: '/dashboard',
      iconComponent: {
        name: 'cil-speedometer'
      }
    }
  ];

  if (role === 'SUPER_ADMIN') {
    return [
      ...items,
      {
        title: true,
        name: 'Administración'
      },
      {
        name: 'Escuelas',
        url: '/schools',
        iconComponent: {
          name: 'cil-home'
        }
      }
    ];
  }

  const academicItems: INavData[] =
    role === 'ADMIN'
      ? [
          {
            name: 'Ciclos escolares',
            url: '/academic-cycles',
            iconComponent: {
              name: 'cil-calendar'
            }
          },
          {
            name: 'Grados y grupos',
            url: '/school-groups',
            iconComponent: {
              name: 'cil-list'
            }
          },
          {
            name: 'Carga inicial',
            url: '/student-import',
            iconComponent: {
              name: 'cil-spreadsheet'
            }
          },
          {
            name: 'Carga de tutores',
            url: '/guardian-import',
            iconComponent: {
              name: 'cil-user-follow'
            }
          },
          {
            name: 'Activación de tutores',
            url: '/guardian-activation',
            iconComponent: {
              name: 'cil-lock-locked'
            }
          },
          {
            name: 'Avisos y comunicaciones',
            url: '/communications',
            iconComponent: {
              name: 'cil-bell'
            }
          }
        ]
      : [];

  return [
    ...items,
    {
      title: true,
      name: 'Control escolar'
    },
    ...academicItems,
    {
      name: 'Alumnos',
      url: '/students',
      iconComponent: {
        name: 'cil-people'
      }
    },
    {
      name: 'Tutores',
      url: '/guardians',
      iconComponent: {
        name: 'cil-user'
      }
    },
    {
      name: 'Credenciales QR',
      url: '/credentials',
      iconComponent: {
        name: 'cil-credit-card'
      }
    },
    {
      name: 'Registrar acceso',
      url: '/access-scanner',
      iconComponent: {
        name: 'cil-check'
      }
    }
  ];
}
