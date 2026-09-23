import { INavData } from '@coreui/angular';
import { AppUserRole } from '../../core/auth/auth.models';

export function buildNavItems(
  role: AppUserRole,
  hasSchoolContext = false
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

  if (role === 'SUPER_ADMIN' && !hasSchoolContext) {
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

  const schoolAdministrator =
    role === 'ADMIN' || role === 'SUPER_ADMIN';

  const studentChildren: INavData[] = [
    {
      name: 'Listado de alumnos',
      url: '/students'
    },
    ...(schoolAdministrator
      ? [
          {
            name: 'Carga masiva',
            url: '/student-import'
          }
        ]
      : []),
    {
      name: 'Credenciales QR',
      url: '/credentials'
    }
  ];

  const guardianChildren: INavData[] = [
    {
      name: 'Listado de tutores',
      url: '/guardians'
    },
    ...(schoolAdministrator
      ? [
          {
            name: 'Carga masiva',
            url: '/guardian-import'
          },
          {
            name: 'Accesos al portal',
            url: '/guardian-activation'
          },
          {
            name: 'Autoregistro',
            url: '/guardian-registration-settings'
          }
        ]
      : [])
  ];

  const navigation: INavData[] = [
    ...items,
    ...(role === 'SUPER_ADMIN'
      ? [
          {
            title: true,
            name: 'Plataforma'
          },
          {
            name: 'Cambiar escuela',
            url: '/schools',
            iconComponent: {
              name: 'cil-home'
            }
          }
        ]
      : []),
    {
      title: true,
      name: 'Operación'
    },
    {
      name: 'Registrar entrada/salida',
      url: '/access-scanner',
      iconComponent: {
        name: 'cil-check'
      }
    }
  ];

  if (schoolAdministrator) {
    navigation.push({
      name: 'Avisos y comunicaciones',
      url: '/communications',
      iconComponent: {
        name: 'cil-bell'
      }
    });
  }

  navigation.push(
    {
      title: true,
      name: 'Gestión escolar'
    },
    {
      name: 'Alumnos',
      iconComponent: {
        name: 'cil-people'
      },
      children: studentChildren
    },
    {
      name: 'Tutores',
      iconComponent: {
        name: 'cil-user'
      },
      children: guardianChildren
    }
  );

  if (schoolAdministrator) {
    navigation.push({
      name: 'Administración escolar',
      iconComponent: {
        name: 'cil-settings'
      },
      children: [
        {
          name: 'Ciclos escolares',
          url: '/academic-cycles'
        },
        {
          name: 'Grados y grupos',
          url: '/school-groups'
        }
      ]
    });
  }

  return navigation;
}
