import { INavData } from '@coreui/angular';
import { AppUserRole } from '../../core/auth/auth.models';

export function buildNavItems(
  role: AppUserRole,
  hasSchoolContext = false,
  moduleKeys: string[] = []
): INavData[] {
  if (role === 'SUPER_ADMIN' && !hasSchoolContext) {
    return [
      {
        name: 'Inicio',
        url: '/dashboard',
        iconComponent: {
          name: 'cil-speedometer'
        }
      },
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

  const canAccess = (moduleKey: string) =>
    schoolAdministrator ||
    moduleKeys.includes(moduleKey);

  const navigation: INavData[] = [];

  if (canAccess('DASHBOARD')) {
    navigation.push({
      name: 'Inicio',
      url: '/dashboard',
      iconComponent: {
        name: 'cil-speedometer'
      }
    });
  }

  if (role === 'SUPER_ADMIN') {
    navigation.push(
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
    );
  }

  const operationItems: INavData[] = [];

  if (canAccess('ACCESS_SCANNER')) {
    operationItems.push({
      name: 'Registrar entrada/salida',
      url: '/access-scanner',
      iconComponent: {
        name: 'cil-check'
      }
    });
  }

  if (canAccess('COMMUNICATIONS')) {
    operationItems.push({
      name: 'Avisos y comunicaciones',
      url: '/communications',
      iconComponent: {
        name: 'cil-bell'
      }
    });
  }

  if (operationItems.length > 0) {
    navigation.push(
      {
        title: true,
        name: 'Operación'
      },
      ...operationItems
    );
  }

  const studentChildren: INavData[] = [];

  if (canAccess('STUDENTS')) {
    studentChildren.push(
      {
        name: 'Listado de alumnos',
        url: '/students'
      },
      {
        name: 'Carga masiva',
        url: '/student-import'
      }
    );
  }

  if (canAccess('CREDENTIALS')) {
    studentChildren.push({
      name: 'Credenciales QR',
      url: '/credentials'
    });
  }

  const guardianChildren: INavData[] = [];

  if (canAccess('GUARDIANS')) {
    guardianChildren.push(
      {
        name: 'Listado de tutores',
        url: '/guardians'
      },
      {
        name: 'Carga masiva',
        url: '/guardian-import'
      }
    );
  }

  if (canAccess('GUARDIAN_ACCESS')) {
    guardianChildren.push({
      name: 'Accesos al portal',
      url: '/guardian-activation'
    });
  }

  if (canAccess('GUARDIAN_REGISTRATION')) {
    guardianChildren.push({
      name: 'Autoregistro',
      url: '/guardian-registration-settings'
    });
  }

  if (
    studentChildren.length > 0 ||
    guardianChildren.length > 0
  ) {
    navigation.push({
      title: true,
      name: 'Gestión escolar'
    });

    if (studentChildren.length > 0) {
      navigation.push({
        name: 'Alumnos',
        iconComponent: {
          name: 'cil-people'
        },
        children: studentChildren
      });
    }

    if (guardianChildren.length > 0) {
      navigation.push({
        name: 'Tutores',
        iconComponent: {
          name: 'cil-user'
        },
        children: guardianChildren
      });
    }
  }

  const administrationChildren: INavData[] = [];

  if (canAccess('ACADEMIC_STRUCTURE')) {
    administrationChildren.push(
      {
        name: 'Ciclos escolares',
        url: '/academic-cycles'
      },
      {
        name: 'Grados y grupos',
        url: '/school-groups'
      }
    );
  }

  if (schoolAdministrator) {
    administrationChildren.push({
      name: 'Usuarios del sistema',
      url: '/school-users'
    });
  }

  if (administrationChildren.length > 0) {
    navigation.push({
      name: 'Administración escolar',
      iconComponent: {
        name: 'cil-settings'
      },
      children: administrationChildren
    });
  }

  return navigation;
}
