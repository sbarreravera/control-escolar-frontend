import { INavData } from '@coreui/angular';
import { AppUserRole } from '../../core/auth/auth.models';

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

  const studentChildren: INavData[] = [
    {
      name: 'Listado de alumnos',
      url: '/students'
    },
    ...(role === 'ADMIN'
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
    ...(role === 'ADMIN'
      ? [
          {
            name: 'Carga masiva',
            url: '/guardian-import'
          },
          {
            name: 'Accesos al portal',
            url: '/guardian-activation'
          }
        ]
      : [])
  ];

  const navigation: INavData[] = [
    ...items,
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

  if (role === 'ADMIN') {
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

  if (role === 'ADMIN') {
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
