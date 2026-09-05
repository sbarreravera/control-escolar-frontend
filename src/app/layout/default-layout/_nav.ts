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

  return [
    ...items,
    {
      title: true,
      name: 'Control escolar'
    },
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